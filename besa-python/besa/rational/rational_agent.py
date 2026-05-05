from __future__ import annotations

from abc import ABC
from typing import Any

from besa.kernel.agent import AgentBESA
from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.rational.plan import Plan
from besa.rational.rational_role import RationalRole


class PlanExecutionGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        agent = self._agent
        if not isinstance(agent, RationalAgent):
            return
        plan_id = event.data.get("plan_id") if isinstance(event.data, dict) else None
        if plan_id and agent._current_role:
            plan = agent._current_role.get_plan(plan_id)
            if plan:
                plan.execute(agent.state)


class ChangeRationalRoleGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        agent = self._agent
        if not isinstance(agent, RationalAgent):
            return
        role_name = event.data.get("role_name") if isinstance(event.data, dict) else None
        if role_name:
            role = agent._roles.get(role_name)
            if role:
                agent._current_role = role


class PlanCancellationGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        pass


class RationalAgent(AgentBESA, ABC):
    def __init__(self, alias: str, state: Any = None, root_seed: int = 42):
        super().__init__(alias, state, root_seed)
        self._roles: dict[str, RationalRole] = {}
        self._current_role: RationalRole | None = None

        self.register_guard(PlanExecutionGuard)
        self.register_guard(ChangeRationalRoleGuard)
        self.register_guard(PlanCancellationGuard)

    def add_role(self, role: RationalRole) -> None:
        self._roles[role.role_name] = role
        if self._current_role is None:
            self._current_role = role

    def get_current_role(self) -> RationalRole | None:
        return self._current_role

    def execute_plan(self, plan: Plan) -> bool:
        return plan.execute(self.state)
