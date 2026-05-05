from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class LLMRequest:
    template: str
    context: dict[str, Any]
    callback_agent: str
    callback_guard: type
    tick: int = 0
    agent_alias: str = ""

    def cache_key(self) -> str:
        return f"{self.template}:{hash(str(self.context))}"


@dataclass
class LLMResponse:
    text: str
    new_goal_spec: dict[str, Any] | None = None
    narrative: str | None = None
