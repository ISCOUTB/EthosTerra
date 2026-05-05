from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class EventBESA:
    guard_type: type
    data: Any = None
    id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    priority: int = 5
    sender: str | None = None
    target: str | None = None

    def __repr__(self) -> str:
        return f"EventBESA(id={self.id}, guard={self.guard_type.__name__}, priority={self.priority})"
