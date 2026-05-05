from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ControlMessage:
    peasant_family_alias: str
    wait: bool = False
    current_date: str = ""
    current_day: int = 0
