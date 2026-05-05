from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, ClassVar

from besa.kernel.event import EventBESA


class AdmBESA(ABC):
    _instance: ClassVar[AdmBESA | None] = None

    def __init__(self, alias: str = "adm"):
        self.alias = alias
        AdmBESA._instance = self

    @classmethod
    def get_instance(cls) -> AdmBESA | None:
        return cls._instance

    @abstractmethod
    def register_agent(self, agent: Any) -> None: ...

    @abstractmethod
    def unregister_agent(self, agent_alias: str) -> None: ...

    @abstractmethod
    def send(self, event: EventBESA) -> None: ...

    @abstractmethod
    def lookup(self, alias: str) -> Any | None: ...

    @abstractmethod
    def shutdown(self) -> None: ...

    @abstractmethod
    def get_agents(self) -> list[Any]: ...
