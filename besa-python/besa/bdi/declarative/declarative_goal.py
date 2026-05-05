from __future__ import annotations

from typing import Any

from besa.bdi.goal_bdi import GoalBDI
from besa.bdi.declarative.goal_spec import GoalSpec
from besa.bdi.declarative.goal_registry import GoalRegistry
from besa.bdi.declarative.plan_registry import PlanRegistry
from besa.bdi.yaml_evaluator import evaluate_activation
from besa.rational.plan import Plan


class DeclarativeGoal(GoalBDI):
    def __init__(self, spec: GoalSpec, plan: Plan | None = None):
        super().__init__(goal_id=spec.id)
        self.spec = spec
        self.plan = plan

    @classmethod
    def build(cls, goal_id: str) -> DeclarativeGoal:
        spec = GoalRegistry.get_instance().get(goal_id)
        if spec is None:
            spec = GoalSpec(
                id=goal_id,
                display_name=goal_id,
                description=f"Auto-generated for {goal_id}",
                pyramid_level="SURVIVAL",
                activation_when="true",
                plan_ref=f"{goal_id}_plan",
            )
        plan_spec = PlanRegistry.get_instance().get_plan(spec.plan_ref)
        plan = Plan(plan_id=spec.plan_ref) if plan_spec else Plan()
        return cls(spec, plan)

    def detect_goal(self, believes: Any) -> float:
        if self.goal_id == "attend_religious_events":
            if hasattr(believes, 'is_sunday') and not believes.is_sunday():
                return 0.0
        if self.goal_id in ("obtain_livestock",):
            if getattr(believes, 'money', 0) < 200000:
                return 0.0
            last = getattr(believes, '_last_livestock_day', -999)
            if believes.current_day - last < 60:
                return 0.0
        if self.goal_id == "waste_time_and_resources":
            if getattr(believes, 'money', 0) < 200000:
                return 0.0
            last = getattr(believes, '_last_waste_day', -999)
            if believes.current_day - last < 14:
                return 0.0
        return evaluate_activation(believes, self.spec.activation_when)

    def evaluate_viability(self, believes: Any) -> float:
        return 1.0

    def evaluate_plausibility(self, believes: Any) -> float:
        return 1.0

    def evaluate_contribution(self, state: Any) -> float:
        rules = self.spec.contribution_rules
        if rules and rules.fixed_value is not None:
            return rules.fixed_value
        return 0.5

    def _check_effects(self, believes: Any) -> bool:
        effects = getattr(self.spec, "effects", None)
        if not effects:
            return False
        on_success = effects.get("on_success")
        if not on_success:
            return False
        belief_effects = on_success.get("beliefs", [])
        if not belief_effects:
            return False
        for b in belief_effects:
            key = b.get("key", "")
            op = b.get("op", "")
            value = b.get("value")
            if op == "set":
                actual = getattr(believes, key, None)
                expected = value
                if expected == "True":
                    expected = True
                elif expected == "False":
                    expected = False
                if actual != expected:
                    return False
            elif op == "increment":
                flag = f"_{key}_incremented"
                if not getattr(believes, flag, False):
                    return False
        return True

    def _acquisition_succeeded(self, believes: Any, resource: str) -> bool:
        return getattr(believes, resource, 0) > 0 or getattr(believes, f'_{resource}_set', False)

    def goal_succeeded(self, believes: Any) -> bool:
        if self.goal_id == "seek_purpose":
            return getattr(believes, '_purpose_set', False)
        if self.goal_id == "do_void":
            return not getattr(believes, 'wait', True)
        if self.goal_id == "prepare_land":
            return any(l.stage != "NONE" for l in getattr(believes, 'lands', []))
        if self.goal_id == "plant_crop":
            return any(l.stage == "GROWING" for l in getattr(believes, 'lands', []))
        if self.goal_id == "harvest_crops":
            return any(l.stage == "HARVEST_READY" for l in getattr(believes, 'lands', []))
        if self.goal_id == "check_crops":
            return any(l.stage in ("GROWING", "HARVEST_READY") for l in getattr(believes, 'lands', []))
        if self.goal_id == "obtain_livestock":
            setattr(believes, '_last_livestock_day', getattr(believes, 'current_day', 0))
            return True
        if self.goal_id == "waste_time_and_resources":
            setattr(believes, '_last_waste_day', getattr(believes, 'current_day', 0))
            return True
        for prefix, resource in [("obtain_", ""), ("buy_", "")]:
            suffix = self.goal_id[len(prefix):] if self.goal_id.startswith(prefix) else ""
            if suffix and hasattr(believes, suffix):
                return self._acquisition_succeeded(believes, suffix)
        if self.spec.effects and self._check_effects(believes):
            return True
        if getattr(believes, '_goal_selected_today', None) == self.goal_id:
            return True
        return False

    def __repr__(self) -> str:
        return f"DeclarativeGoal({self.goal_id}, level={self.spec.pyramid_level})"
