from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentInfo:
    state: bool = False
    current_day: int = 0
