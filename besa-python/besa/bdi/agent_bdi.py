from __future__ import annotations

from abc import ABC
from typing import Any

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.rational.rational_agent import RationalAgent
from besa.bdi.bdi_machine import BDIMachine, StateBDI


class BDIDetectGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        agent = self._agent
        if isinstance(agent, AgentBDI):
            agent._bdi_machine.tick(agent._bdi_state)


class AgentBDI(RationalAgent, ABC):
    def __init__(self, alias: str, state: Any = None, root_seed: int = 42):
        super().__init__(alias, state, root_seed)
        self._bdi_machine = BDIMachine()
        self._bdi_state = StateBDI(believes=state)

        self.register_guard(BDIDetectGuard)

    def add_potential_goal(self, goal) -> None:
        self._bdi_state.potential_goals.append(goal)

    def set_potential_goals(self, goals: list[Any]) -> None:
        self._bdi_state.potential_goals = goals

    def tick_bdi(self) -> None:
        self._bdi_machine.tick(self._bdi_state)

    def get_current_intention(self):
        return self._bdi_state.current_intention
