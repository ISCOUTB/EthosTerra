from __future__ import annotations

from typing import Type

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA


class StructBESA:
    def __init__(self):
        self._bindings: dict[str, type[GuardBESA]] = {}

    def add_guard(self, guard_type: type[GuardBESA]) -> None:
        self._bindings[guard_type.__name__] = guard_type

    def get_guard(self, event: EventBESA) -> type[GuardBESA] | None:
        guard_name = event.guard_type.__name__
        return self._bindings.get(guard_name)

    def has_guard(self, guard_type: type[GuardBESA]) -> bool:
        return guard_type.__name__ in self._bindings

    def guard_names(self) -> list[str]:
        return list(self._bindings.keys())
