from __future__ import annotations

import os
from pathlib import Path
from typing import ClassVar

import yaml

from besa.bdi.declarative.plan_spec import PlanSpec, ActionSpec, StepSpec


class PlanRegistry:
    _instance: ClassVar[PlanRegistry | None] = None
    _plans: dict[str, PlanSpec] = {}

    def __init__(self):
        self._plans = {}

    @classmethod
    def get_instance(cls) -> PlanRegistry:
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load_all()
        return cls._instance

    def _load_all(self) -> None:
        candidates = [
            Path(os.getenv("ETHOSTERRA_PLANS_DIR", "")),
            Path("specs/plans"),
            Path("data/ebdi/plans"),
            Path("../data/ebdi/plans"),
            Path(os.getenv("ETHOSTERRA_ROOT", "")) / "data/ebdi/plans" if os.getenv("ETHOSTERRA_ROOT") else None,
        ]
        plans_dir = None
        for c in candidates:
            if c and c.exists():
                plans_dir = c
                break
        if plans_dir is None:
            return
        for yaml_file in sorted(plans_dir.rglob("*.yaml")):
            spec_dict = yaml.safe_load(yaml_file.read_text())
            if spec_dict is None:
                continue
            if "actions" in spec_dict and spec_dict["actions"]:
                spec_dict["actions"] = [
                    ActionSpec(**a) if isinstance(a, dict) else a
                    for a in spec_dict["actions"]
                ]
            filtered = {k: v for k, v in spec_dict.items() if k in PlanSpec.__dataclass_fields__}
            if "id" not in filtered:
                continue
            if "steps" in spec_dict and isinstance(spec_dict["steps"], list):
                step_fields = {"id", "action", "args", "params"}
                filtered["steps"] = []
                for s in spec_dict["steps"]:
                    if isinstance(s, dict):
                        sf = {k: v for k, v in s.items() if k in step_fields}
                        filtered["steps"].append(StepSpec(**sf))
                    else:
                        filtered["steps"].append(StepSpec(action=str(s)))
            spec = PlanSpec(**filtered)
            self._plans[spec.id] = spec

    def get_plan(self, plan_id: str) -> PlanSpec | None:
        return self._plans.get(plan_id)

    def get_all(self) -> list[PlanSpec]:
        return list(self._plans.values())

    def size(self) -> int:
        return len(self._plans)
