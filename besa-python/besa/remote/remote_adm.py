from __future__ import annotations

import json
import threading
import time
from typing import Any

from besa.kernel.event import EventBESA
from besa.local.local_adm import LocalAdmBESA
from besa.remote.rabbitmq_producer import RabbitMQProducer
from besa.remote.rabbitmq_consumer import RabbitMQConsumer
from besa.remote.discovery_consumer import RabbitMQDiscoveryConsumer
from besa.remote.reconnect_policy import ReconnectPolicy

CONTAINER_ANNOUNCEMENT = "ContainerAnnouncementBESA"
REMOTE_MESSAGE = "RemoteMessageBESA"


class RemoteAdmBESA(LocalAdmBESA):
    def __init__(
        self,
        alias: str,
        host: str = "localhost",
        port: int = 5672,
        username: str = "guest",
        password: str = "guest",
        virtual_host: str = "/",
    ):
        super().__init__(alias)
        self._host = host
        self._port = port
        self._username = username
        self._password = password
        self._virtual_host = virtual_host
        self._remote_containers: dict[str, Any] = {}

        self._producer = RabbitMQProducer(
            host=host, port=port,
            username=username, password=password,
            virtual_host=virtual_host,
        )
        self._producer.connect()

        self._consumer = RabbitMQConsumer(
            container_alias=alias,
            on_message=self._on_remote_message,
            host=host, port=port,
            username=username, password=password,
            virtual_host=virtual_host,
        )

        self._discovery_consumer = RabbitMQDiscoveryConsumer(
            container_alias=alias,
            on_announcement=self._on_container_announcement,
            host=host, port=port,
            username=username, password=password,
            virtual_host=virtual_host,
        )

        self._announce_timer: threading.Timer | None = None

    def start(self) -> None:
        self._consumer.start()
        self._discovery_consumer.start()
        self._announce_presence()
        self._start_announce_timer()

    def _announce_presence(self) -> None:
        announcement = {
            "type": CONTAINER_ANNOUNCEMENT,
            "alias": self.alias,
            "timestamp": time.time(),
        }
        try:
            import pika
            params = pika.ConnectionParameters(
                host=self._host, port=self._port,
                virtual_host=self._virtual_host,
                credentials=pika.PlainCredentials(self._username, self._password),
            )
            conn = pika.BlockingConnection(params)
            channel = conn.channel()
            channel.exchange_declare(
                exchange="besa.discovery",
                exchange_type="fanout",
                durable=False,
            )
            channel.basic_publish(
                exchange="besa.discovery",
                routing_key="",
                body=json.dumps(announcement, default=str),
            )
            conn.close()
        except Exception:
            pass

    def _start_announce_timer(self) -> None:
        self._announce_timer = threading.Timer(30.0, self._announce_presence)
        self._announce_timer.daemon = True
        self._announce_timer.start()

    def _on_remote_message(self, message: dict[str, Any]) -> None:
        if message.get("type") != REMOTE_MESSAGE:
            return
        target_alias = message.get("target_agent")
        if target_alias is None:
            return
        event = EventBESA(
            guard_type=self._resolve_guard_type(message.get("guard_class", "")),
            data=message.get("data"),
            sender=message.get("sender_id"),
            target=target_alias,
            priority=message.get("priority", 5),
        )
        self.send(event)

    def _on_container_announcement(self, message: dict[str, Any]) -> None:
        if message.get("type") != CONTAINER_ANNOUNCEMENT:
            return
        alias = message.get("alias")
        if alias and alias != self.alias:
            self._remote_containers[alias] = message

    def send(self, event: EventBESA) -> None:
        if event.target and self._directory.lookup(event.target):
            super().send(event)
        else:
            remote_msg = {
                "type": REMOTE_MESSAGE,
                "sender_id": f"{self.alias}/{event.sender}",
                "target_agent": event.target,
                "guard_class": event.guard_type.__name__,
                "data": event.data,
                "priority": event.priority,
                "timestamp": time.time(),
            }
            self._producer.publish(
                routing_key=f"besa.container.{event.target}",
                message=remote_msg,
            )

    def _resolve_guard_type(self, guard_class_str: str) -> type:
        from besa.kernel.guard import GuardBESA
        return GuardBESA

    def get_remote_containers(self) -> dict[str, Any]:
        return dict(self._remote_containers)

    def shutdown(self, timeout: float = 5.0) -> None:
        if self._announce_timer:
            self._announce_timer.cancel()
        self._consumer.stop()
        self._discovery_consumer.stop()
        self._producer.close()
        super().shutdown(timeout)
