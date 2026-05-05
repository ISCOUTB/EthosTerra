from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Protocol


class Believes(Protocol):
    def to_summary(self) -> dict[str, Any]: ...


class BelievesBase(ABC):
    @abstractmethod
    def to_summary(self) -> dict[str, Any]: ...
