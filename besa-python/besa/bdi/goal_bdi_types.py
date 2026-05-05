from __future__ import annotations

from enum import IntEnum, auto


class GoalLevel(IntEnum):
    SURVIVAL = 0
    DUTY = 1
    OPPORTUNITY = 2
    REQUIREMENT = 3
    NEED = 4
    ATTENTION_CYCLE = 5
