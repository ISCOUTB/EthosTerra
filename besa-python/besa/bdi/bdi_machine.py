from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from besa.bdi.goal_bdi import GoalBDI
from besa.bdi.goal_bdi_types import GoalLevel
from besa.bdi.desire_pyramid import DesireHierarchyPyramid


@dataclass
class StateBDI:
    believes: Any = None
    potential_goals: list[GoalBDI] = field(default_factory=list)
    pyramid: DesireHierarchyPyramid = field(default_factory=DesireHierarchyPyramid)
    threshold: float = 0.3
    current_intention: GoalBDI | None = None
    plan_executor: Callable[[str, Any], bool] | None = None


_LEVEL_MAP = {
    "SURVIVAL": GoalLevel.SURVIVAL,
    "DUTY": GoalLevel.DUTY,
    "OPORTUNITY": GoalLevel.OPPORTUNITY,
    "OPORTUNIDAD": GoalLevel.OPPORTUNITY,
    "REQUIREMENT": GoalLevel.REQUIREMENT,
    "NEED": GoalLevel.NEED,
    "SOCIAL": GoalLevel.NEED,
    "ATTENTION_CYCLE": GoalLevel.ATTENTION_CYCLE,
    "LEISURE": GoalLevel.ATTENTION_CYCLE,
}


class BDIMachine:
    def __init__(self):
        self._plan_stack: list[GoalBDI] = []

    def tick(self, state: StateBDI) -> None:
        detectable = [
            g
            for g in state.potential_goals
            if g.detect_goal(state.believes) > state.threshold
        ]

        viable = [
            g
            for g in detectable
            if g.evaluate_plausibility(state.believes) > state.threshold
            and g.evaluate_viability(state.believes) > state.threshold
        ]

        for goal in viable:
            emotions_enabled = getattr(state.believes, 'emotions_enabled', False)
            if emotions_enabled and hasattr(goal, 'evaluate_emotional_contribution'):
                score = goal.evaluate_emotional_contribution(state)
            else:
                score = goal.evaluate_contribution(state)
            level = self._infer_level(goal)
            state.pyramid.insert(goal, score, level)
            pass

        if hasattr(state.believes, '_goal_selected_today'):
            del state.believes._goal_selected_today

        last_goal = None
        while True:
            intention = state.pyramid.get_current_intention()
            if not intention:
                break
            state.current_intention = intention
            state.believes._goal_selected_today = intention.goal_id
            self.execute_plan(intention, state)
            if intention.goal_succeeded(state.believes):
                state.pyramid.remove(intention)
                last_goal = intention.goal_id
            else:
                state.pyramid.remove(intention)
        if last_goal:
            state.believes.current_goal = last_goal

    def execute_plan(self, goal: GoalBDI, state: StateBDI) -> None:
        if state.plan_executor:
            try:
                state.plan_executor(goal.goal_id, state.believes)
            except Exception:
                pass

    def _infer_level(self, goal: GoalBDI) -> GoalLevel:
        if hasattr(goal, "spec") and hasattr(goal.spec, "pyramid_level"):
            return _LEVEL_MAP.get(goal.spec.pyramid_level.upper(), GoalLevel.SURVIVAL)
        return GoalLevel.SURVIVAL

    def reset(self) -> None:
        self._plan_stack.clear()
