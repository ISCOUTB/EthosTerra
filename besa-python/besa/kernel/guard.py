from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

from besa.kernel.event import EventBESA

if TYPE_CHECKING:
    from besa.kernel.agent import AgentBESA


class GuardBESA(ABC):
    def __init__(self, agent: AgentBESA | None = None):
        self._agent: AgentBESA | None = agent

    @abstractmethod
    def func_exec_guard(self, event: EventBESA) -> None: ...

    def get_state(self):
        if self._agent is None:
            return None
        return self._agent.state

    def set_agent(self, agent: AgentBESA) -> None:
        self._agent = agent
