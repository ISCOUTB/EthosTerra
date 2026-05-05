from __future__ import annotations

import threading
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from besa.kernel.agent import AgentBESA


class LocalDirectory:
    def __init__(self):
        self._agents: dict[str, AgentBESA] = {}
        self._lock = threading.RLock()

    def register(self, alias: str, agent: AgentBESA) -> None:
        with self._lock:
            self._agents[alias] = agent

    def unregister(self, alias: str) -> None:
        with self._lock:
            self._agents.pop(alias, None)

    def lookup(self, alias: str) -> AgentBESA | None:
        with self._lock:
            return self._agents.get(alias)

    def get_all(self) -> list[AgentBESA]:
        with self._lock:
            return list(self._agents.values())

    def aliases(self) -> list[str]:
        with self._lock:
            return list(self._agents.keys())

    def size(self) -> int:
        with self._lock:
            return len(self._agents)
