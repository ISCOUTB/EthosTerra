from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ContributionRules:
    fixed_value: float | None = None
    fuzzy_variable: str | None = None
    fuzzy_rules: list[dict[str, Any]] | None = None


@dataclass
class GoalSpec:
    id: str = ""
    display_name: str = ""
    description: str = ""
    pyramid_level: str = ""
    activation_when: str = ""
    plan_ref: str = ""
    contribution_rules: ContributionRules | None = None
    context_switch_probability: float = 0.0
    emotion_tag: str = "neutral"
    effects: dict[str, Any] | None = None
