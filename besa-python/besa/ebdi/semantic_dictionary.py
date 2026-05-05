from __future__ import annotations

from typing import ClassVar


class SemanticDictionary:
    _instance: ClassVar[SemanticDictionary | None] = None
    _values: dict[str, float] = {}

    def __init__(self):
        self._values = {}

    @classmethod
    def get_instance(cls) -> SemanticDictionary:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def set(self, key: str, value: float) -> None:
        self._values[key] = value

    def get(self, key: str, default: float = 0.0) -> float:
        return self._values.get(key, default)

    def get_all(self) -> dict[str, float]:
        return dict(self._values)
