from __future__ import annotations

import queue
import threading
from typing import Any


class MBoxBESA:
    def __init__(self, timeout: float = 1.0):
        self._queue: queue.Queue[Any] = queue.Queue()
        self._timeout = timeout
        self._event = threading.Event()

    def send(self, message: Any) -> None:
        self._queue.put_nowait(message)
        self._event.set()

    def receive(self, timeout: float | None = None) -> Any | None:
        t = timeout if timeout is not None else self._timeout
        try:
            return self._queue.get(timeout=t)
        except queue.Empty:
            return None

    def receive_nowait(self) -> Any | None:
        try:
            return self._queue.get_nowait()
        except queue.Empty:
            return None

    def qsize(self) -> int:
        return self._queue.qsize()

    def wait_for_message(self, timeout: float | None = None) -> bool:
        return self._event.wait(timeout=timeout if timeout is not None else self._timeout)

    def clear(self) -> None:
        self._event.clear()

    def close(self) -> None:
        while not self._queue.empty():
            try:
                self._queue.get_nowait()
            except queue.Empty:
                break
