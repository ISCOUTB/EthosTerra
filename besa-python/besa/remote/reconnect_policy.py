from __future__ import annotations

import json
import time
import threading
from typing import Any

import pika


class ReconnectPolicy:
    def __init__(
        self,
        max_retries: int = 10,
        base_delay: float = 1.0,
        max_delay: float = 30.0,
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.attempts = 0

    def get_delay(self) -> float:
        delay = min(self.base_delay * (2**self.attempts), self.max_delay)
        self.attempts += 1
        return delay

    def reset(self) -> None:
        self.attempts = 0

    def should_retry(self) -> bool:
        return self.attempts < self.max_retries
