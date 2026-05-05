from __future__ import annotations

from besa.rational.plan import Plan


class RationalRole:
    def __init__(self, role_name: str):
        self.role_name = role_name
        self._plans: dict[str, Plan] = {}

    def add_plan(self, plan_id: str, plan: Plan) -> None:
        self._plans[plan_id] = plan

    def get_plan(self, plan_id: str) -> Plan | None:
        return self._plans.get(plan_id)

    def get_plans(self) -> list[Plan]:
        return list(self._plans.values())

    def __repr__(self) -> str:
        return f"RationalRole({self.role_name}, plans={len(self._plans)})"
