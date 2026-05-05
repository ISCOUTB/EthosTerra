from __future__ import annotations

import json
import time
from typing import Any

import pika


class RabbitMQProducer:
    EXCHANGE = "besa.exchange"
    EXCHANGE_TYPE = "direct"

    def __init__(self, host: str = "localhost", port: int = 5672, **kwargs: Any):
        self._host = host
        self._port = port
        self._credentials = pika.PlainCredentials(
            kwargs.get("username", "guest"),
            kwargs.get("password", "guest"),
        )
        self._virtual_host = kwargs.get("virtual_host", "/")
        self._connection: pika.BlockingConnection | None = None
        self._channel: pika.adapters.blocking_connection.BlockingChannel | None = None

    def connect(self) -> None:
        params = pika.ConnectionParameters(
            host=self._host,
            port=self._port,
            virtual_host=self._virtual_host,
            credentials=self._credentials,
        )
        self._connection = pika.BlockingConnection(params)
        self._channel = self._connection.channel()
        self._channel.exchange_declare(
            exchange=self.EXCHANGE,
            exchange_type=self.EXCHANGE_TYPE,
            durable=True,
        )

    def publish(self, routing_key: str, message: dict[str, Any]) -> None:
        if self._channel is None or self._connection is None or self._connection.is_closed:
            self.connect()
        self._channel.basic_publish(
            exchange=self.EXCHANGE,
            routing_key=routing_key,
            body=json.dumps(message, default=str),
            properties=pika.BasicProperties(
                delivery_mode=pika.DeliveryMode.Persistent,
                content_type="application/json",
            ),
        )

    def close(self) -> None:
        if self._channel and self._channel.is_open:
            self._channel.close()
        if self._connection and self._connection.is_open:
            self._connection.close()
