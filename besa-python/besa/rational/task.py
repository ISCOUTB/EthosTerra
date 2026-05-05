from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from besa.rational.believes import Believes


class Task(ABC):
    def __init__(self, name: str = ""):
        self.name = name

    @abstractmethod
    def execute(self, believes: Believes, **kwargs: Any) -> bool:
        ...

    def __repr__(self) -> str:
        return f"Task({self.name or self.__class__.__name__})"
