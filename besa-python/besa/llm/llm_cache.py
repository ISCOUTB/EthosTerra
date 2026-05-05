from __future__ import annotations

import threading
from typing import Any


class LLMCache:
    def __init__(self, max_size: int = 500):
        self._max_size = max_size
        self._cache: dict[str, Any] = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            return self._cache.get(key)

    def put(self, key: str, value: Any) -> None:
        with self._lock:
            if len(self._cache) >= self._max_size:
                self._cache.pop(next(iter(self._cache)))
            self._cache[key] = value

    def clear(self) -> None:
        with self._lock:
            self._cache.clear()
