from __future__ import annotations

import json
import threading
from typing import Any, Callable

import pika


class RabbitMQConsumer(threading.Thread):
    EXCHANGE = "besa.exchange"
    EXCHANGE_TYPE = "direct"

    def __init__(
        self,
        container_alias: str,
        on_message: Callable[[dict[str, Any]], None],
        host: str = "localhost",
        port: int = 5672,
        **kwargs: Any,
    ):
        super().__init__(name=f"RabbitMQConsumer-{container_alias}", daemon=True)
        self._container_alias = container_alias
        self._on_message = on_message
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
        self._connect()

    def _connect(self) -> None:
        params = pika.ConnectionParameters(
            host=self._host,
            port=self._port,
            virtual_host=self._virtual_host,
            credentials=self._credentials,
        )
        self._connection = pika.SelectConnection(
            params,
            on_open_callback=self._on_connection_open,
            on_open_error_callback=self._on_connection_error,
            on_close_callback=self._on_connection_closed,
        )
        self._connection.ioloop.start()

    def _on_connection_open(self, connection: pika.SelectConnection) -> None:
        connection.channel(on_open_callback=self._on_channel_open)

    def _on_channel_open(self, channel: pika.channel.Channel) -> None:
        self._channel = channel
        channel.exchange_declare(
            exchange=self.EXCHANGE,
            exchange_type=self.EXCHANGE_TYPE,
            durable=True,
            callback=self._on_exchange_declared,
        )

    def _on_exchange_declared(self, _frame: Any) -> None:
        queue_name = f"besa.container.{self._container_alias}"
        self._channel.queue_declare(
            queue=queue_name,
            durable=True,
            callback=self._on_queue_declared,
        )

    def _on_queue_declared(self, _frame: Any) -> None:
        queue_name = f"besa.container.{self._container_alias}"
        self._channel.queue_bind(
            queue=queue_name,
            exchange=self.EXCHANGE,
            routing_key=queue_name,
            callback=self._on_queue_bound,
        )

    def _on_queue_bound(self, _frame: Any) -> None:
        queue_name = f"besa.container.{self._container_alias}"
        self._channel.basic_consume(
            queue=queue_name,
            on_message_callback=self._on_message_callback,
            auto_ack=True,
        )

    def _on_message_callback(
        self,
        _channel: pika.channel.Channel,
        _method: Any,
        _properties: Any,
        body: bytes,
    ) -> None:
        try:
            message = json.loads(body)
            self._on_message(message)
        except json.JSONDecodeError:
            pass

    def _on_connection_error(self, _connection: Any, _error: Any) -> None:
        pass

    def _on_connection_closed(self, _connection: Any, _reason: Any) -> None:
        if self._running:
            pass

    def stop(self) -> None:
        self._running = False
        if self._connection:
            self._connection.ioloop.stop()
            if self._connection.is_open:
                self._connection.close()
