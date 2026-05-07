from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ControlMessage:
    alias: str = ""
    peasant_family_alias: str = ""
    wait: bool = False
    current_date: str = ""
    current_day: int = 0
    dead: bool = False

    @property
    def agent_alias(self) -> str:
        return self.alias or self.peasant_family_alias
