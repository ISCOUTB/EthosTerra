from __future__ import annotations

from typing import TYPE_CHECKING

from besa.bdi.goal_bdi_types import GoalLevel

if TYPE_CHECKING:
    from besa.bdi.goal_bdi import GoalBDI


class DesireHierarchyPyramid:
    def __init__(self):
        self._tiers: dict[GoalLevel, list[tuple[GoalBDI, float]]] = {
            level: [] for level in GoalLevel
        }

    def insert(self, goal: GoalBDI, score: float, level: GoalLevel) -> None:
        self._tiers[level].append((goal, score))
        self._tiers[level].sort(key=lambda x: x[1], reverse=True)

    def get_current_intention(self) -> GoalBDI | None:
        for level in sorted(GoalLevel):
            if self._tiers[level]:
                return self._tiers[level][0][0]
        return None

    def remove(self, goal: GoalBDI) -> None:
        for level in GoalLevel:
            self._tiers[level] = [(g, s) for g, s in self._tiers[level] if g is not goal]

    def get_top_goal(self, level: GoalLevel) -> GoalBDI | None:
        if self._tiers[level]:
            return self._tiers[level][0][0]
        return None

    def get_goals_at_level(self, level: GoalLevel) -> list[GoalBDI]:
        return [g for g, _ in self._tiers[level]]

    def clear(self) -> None:
        for level in GoalLevel:
            self._tiers[level].clear()

    def __repr__(self) -> str:
        counts = {level.name: len(goals) for level, goals in self._tiers.items()}
        return f"DesireHierarchyPyramid({counts})"
