from __future__ import annotations

import os
from pathlib import Path
from typing import ClassVar

import yaml

from besa.bdi.declarative.goal_spec import GoalSpec, ContributionRules


class GoalRegistry:
    _instance: ClassVar[GoalRegistry | None] = None
    _goals: dict[str, GoalSpec] = {}

    def __init__(self):
        self._goals = {}

    @classmethod
    def get_instance(cls) -> GoalRegistry:
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load_all()
        return cls._instance

    def _load_all(self) -> None:
        candidates = [
            Path(os.getenv("ETHOSTERRA_GOALS_DIR", "")),
            Path("specs/goals"),
            Path("data/ebdi/goals"),
            Path("../data/ebdi/goals"),
            Path(os.getenv("ETHOSTERRA_ROOT", "")) / "data/ebdi/goals" if os.getenv("ETHOSTERRA_ROOT") else None,
        ]
        goals_dir = None
        for c in candidates:
            if c and c.exists():
                goals_dir = c
                break
        if goals_dir is None:
            return
        for yaml_file in sorted(goals_dir.rglob("*.yaml")):
            spec_dict = yaml.safe_load(yaml_file.read_text())
            if spec_dict is None:
                continue
            cr = spec_dict.get("contribution_rules")
            if cr:
                spec_dict["contribution_rules"] = ContributionRules(
                    fixed_value=cr.get("fixed_value") if isinstance(cr, dict) else None,
                )
            filtered = {k: v for k, v in spec_dict.items() if k in GoalSpec.__dataclass_fields__}
            if "id" not in filtered:
                continue
            if "display_name" not in filtered:
                filtered["display_name"] = filtered["id"]
            if "description" not in filtered:
                filtered["description"] = ""
            if "pyramid_level" not in filtered:
                filtered["pyramid_level"] = "SURVIVAL"
            if "activation_when" not in filtered:
                filtered["activation_when"] = "true"
            if "plan_ref" not in filtered:
                filtered["plan_ref"] = f"{filtered['id']}_plan"
            spec = GoalSpec(**filtered)
            self._goals[spec.id] = spec

    def get(self, goal_id: str) -> GoalSpec | None:
        return self._goals.get(goal_id)

    def get_all(self) -> list[GoalSpec]:
        return list(self._goals.values())

    def size(self) -> int:
        return len(self._goals)
