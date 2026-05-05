from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from besa.kernel.event import EventBESA


@dataclass(slots=True)
class PoisonPill(EventBESA):
    data: Any = None
    guard_type: type = None

    def __init__(self):
        super().__init__(guard_type=type(None))
