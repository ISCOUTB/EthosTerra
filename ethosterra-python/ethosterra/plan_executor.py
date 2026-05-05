from __future__ import annotations

import re
from typing import Any, Callable

from besa.bdi.declarative.action_registry import ACTIONS
from besa.bdi.declarative.plan_spec import PlanSpec
from besa.bdi.declarative.plan_registry import PlanRegistry
from besa.bdi.declarative.goal_registry import GoalRegistry
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves


_TEMPLATE_RE = re.compile(r'\{(\w+)\}')


def _resolve_template(text: str, ctx: dict[str, Any]) -> str:
    def repl(m: re.Match) -> str:
        return str(ctx.get(m.group(1), m.group(0)))
    return _TEMPLATE_RE.sub(repl, text)


def _resolve_args(args: dict[str, Any], ctx: dict[str, Any]) -> dict[str, Any]:
    resolved = {}
    for k, v in args.items():
        if isinstance(v, str):
            resolved[k] = _resolve_template(v, ctx)
        elif isinstance(v, list):
            resolved[k] = [_resolve_template(str(x), ctx) if isinstance(x, str) else x for x in v]
        elif isinstance(v, dict):
            resolved[k] = _resolve_args(v, ctx)
        else:
            resolved[k] = v
    return resolved


class PlanExecutor:
    def __init__(
        self,
        agent_alias: str,
        believes: PeasantFamilyBelieves,
        send_event_fn: Callable,
        send_guard_event_fn: Callable,
    ):
        self.agent_alias = agent_alias
        self.believes = believes
        self.send_event_fn = send_event_fn
        self.send_guard_event_fn = send_guard_event_fn

    def execute_plan(self, plan_spec: PlanSpec) -> bool:
        context = {
            "agent_id": self.agent_alias,
            "sim_time": self.believes.current_date,
            "money": str(self.believes.money),
        }

        for step in plan_spec.steps:
            raw_args = step.args or {}
            resolved = _resolve_args(raw_args, context)
            resolved["_send_event"] = self.send_event_fn
            resolved["_send_guard_event"] = self.send_guard_event_fn
            resolved["_agent_alias"] = self.agent_alias

            action = ACTIONS.get(step.action)
            if action is None:
                continue
            ok = action.execute(self.believes, resolved)
            if not ok:
                return False

        pass
        return True

    @classmethod
    def run_goal(
        cls,
        goal_id: str,
        agent_alias: str,
        believes: PeasantFamilyBelieves,
        send_event_fn: Callable,
        send_guard_event_fn: Callable,
    ) -> bool:
        gspec = GoalRegistry.get_instance().get(goal_id)
        if gspec is None:
            gspec = type("GS", (), {"plan_ref": f"{goal_id}_plan"})()
        plan_spec = PlanRegistry.get_instance().get_plan(
            getattr(gspec, "plan_ref", f"{goal_id}_plan")
        )
        if plan_spec is None:
            return False
        executor = cls(agent_alias, believes, send_event_fn, send_guard_event_fn)
        return executor.execute_plan(plan_spec)
