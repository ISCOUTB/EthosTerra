from __future__ import annotations

import threading
from typing import Any

from besa.kernel.adm import AdmBESA
from besa.kernel.agent import AgentBESA
from besa.kernel.event import EventBESA
from besa.local.local_directory import LocalDirectory


class LocalAdmBESA(AdmBESA):
    def __init__(self, alias: str = "local"):
        super().__init__(alias)
        self._directory = LocalDirectory()
        self._running = False
        self._lock = threading.RLock()

    def register_agent(self, agent: AgentBESA) -> None:
        self._directory.register(agent.alias, agent)

    def unregister_agent(self, agent_alias: str) -> None:
        self._directory.unregister(agent_alias)

    def send(self, event: EventBESA) -> None:
        if event.target is None:
            return
        target = self._directory.lookup(event.target)
        if target is not None:
            target.send_to(event)

    def lookup(self, alias: str) -> AgentBESA | None:
        return self._directory.lookup(alias)

    def get_agents(self) -> list[AgentBESA]:
        return self._directory.get_all()

    def start_all(self) -> None:
        self._running = True
        for agent in self._directory.get_all():
            agent.start()

    def shutdown(self, timeout: float = 5.0) -> None:
        self._running = False
        agents = self._directory.get_all()
        for agent in agents:
            agent.shutdown()
        for agent in agents:
            agent.join(timeout=timeout)
