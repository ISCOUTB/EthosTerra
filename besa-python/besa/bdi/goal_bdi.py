from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Protocol


class BDIEvaluable(Protocol):
    def detect_goal(self, believes: Any) -> float: ...

    def evaluate_viability(self, believes: Any) -> float: ...

    def evaluate_plausibility(self, believes: Any) -> float: ...

    def evaluate_contribution(self, state: Any) -> float: ...

    def goal_succeeded(self, believes: Any) -> bool: ...


class GoalBDI(ABC):
    def __init__(self, goal_id: str = ""):
        self.goal_id = goal_id
        self.priority: float = 0.0

    @abstractmethod
    def detect_goal(self, believes: Any) -> float: ...

    @abstractmethod
    def evaluate_viability(self, believes: Any) -> float: ...

    @abstractmethod
    def evaluate_plausibility(self, believes: Any) -> float: ...

    @abstractmethod
    def evaluate_contribution(self, state: Any) -> float: ...

    @abstractmethod
    def goal_succeeded(self, believes: Any) -> bool: ...

    def __repr__(self) -> str:
        return f"GoalBDI({self.goal_id})"
