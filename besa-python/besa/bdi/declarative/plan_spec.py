from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ActionSpec:
    type: str = ""
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class StepSpec:
    id: str = ""
    action: str = ""
    args: dict[str, Any] = field(default_factory=dict)
    params: dict[str, Any] = field(default_factory=dict)


@dataclass
class PlanSpec:
    id: str = ""
    display_name: str = ""
    description: str = ""
    goal_id: str = ""
    actions: list[ActionSpec] = field(default_factory=list)
    steps: list[StepSpec] = field(default_factory=list)
