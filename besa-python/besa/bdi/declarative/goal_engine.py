from __future__ import annotations

from typing import Any


class GoalEngine:
    _instance: GoalEngine | None = None

    def __init__(self):
        self._fuzzy_available = False
        self._init_fuzzy()

    def _init_fuzzy(self) -> None:
        try:
            import skfuzzy
            self._fuzzy_available = True
        except ImportError:
            self._fuzzy_available = False

    @classmethod
    def get_instance(cls) -> GoalEngine:
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def evaluate_fuzzy(self, rules: Any, believes: Any) -> float:
        if not self._fuzzy_available or rules is None:
            return 0.5
        return 0.5
