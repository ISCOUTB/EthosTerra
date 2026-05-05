from __future__ import annotations

import json
import threading
from typing import Any, Callable

import pika


class RabbitMQDiscoveryConsumer(threading.Thread):
    EXCHANGE = "besa.discovery"
    EXCHANGE_TYPE = "fanout"

    def __init__(
        self,
        container_alias: str,
        on_announcement: Callable[[dict[str, Any]], None],
        host: str = "localhost",
        port: int = 5672,
        **kwargs: Any,
    ):
        super().__init__(
            name=f"RabbitMQDiscovery-{container_alias}", daemon=True
        )
        self._container_alias = container_alias
        self._on_announcement = on_announcement
        self._host = host
        self._port = port
        self._credentials = pika.PlainCredentials(
            kwargs.get("username", "guest"),
            kwargs.get("password", "guest"),
        )
        self._virtual_host = kwargs.get("virtual_host", "/")
        self._connection: pika.SelectConnection | None = None
        self._channel = None
        self._running = False

    def run(self) -> None:
        self._running = True
        params = pika.ConnectionParameters(
            host=self._host,
            port=self._port,
            virtual_host=self._virtual_host,
            credentials=self._credentials,
        )
        self._connection = pika.SelectConnection(
            params,
            on_open_callback=self._on_connection_open,
        )
        self._connection.ioloop.start()

    def _on_connection_open(self, connection: pika.SelectConnection) -> None:
        connection.channel(on_open_callback=self._on_channel_open)

    def _on_channel_open(self, channel: pika.channel.Channel) -> None:
        self._channel = channel
        channel.exchange_declare(
            exchange=self.EXCHANGE,
            exchange_type=self.EXCHANGE_TYPE,
            durable=False,
            callback=lambda _: self._bind_queue(),
        )

    def _bind_queue(self) -> None:
        result = self._channel.queue_declare(
            queue="", exclusive=True,
            callback=lambda frame: self._on_queue_declared(frame),
        )

    def _on_queue_declared(self, frame: Any) -> None:
        queue_name = frame.method.queue
        self._channel.queue_bind(
            queue=queue_name,
            exchange=self.EXCHANGE,
            callback=lambda _: self._consume(queue_name),
        )

    def _consume(self, queue_name: str) -> None:
        self._channel.basic_consume(
            queue=queue_name,
            on_message_callback=self._on_message,
            auto_ack=True,
        )

    def _on_message(
        self,
        _channel: pika.channel.Channel,
        _method: Any,
        _properties: Any,
        body: bytes,
    ) -> None:
        try:
            message = json.loads(body)
            self._on_announcement(message)
        except json.JSONDecodeError:
            pass

    def stop(self) -> None:
        self._running = False
        if self._connection and self._connection.is_open:
            self._connection.close()
