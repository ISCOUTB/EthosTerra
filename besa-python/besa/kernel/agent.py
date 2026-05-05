from __future__ import annotations

import threading
from abc import ABC, abstractmethod
from typing import Any

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.mbox import MBoxBESA
from besa.kernel.poison_pill import PoisonPill
from besa.kernel.struct import StructBESA
from besa.kernel.rng import AgentRNG


class AgentBESA(threading.Thread, ABC):
    def __init__(
        self,
        alias: str,
        state: Any = None,
        root_seed: int = 42,
        daemon: bool = True,
    ):
        threading.Thread.__init__(self, name=alias, daemon=daemon)
        self.alias: str = alias
        self.state: Any = state
        self._mbox: MBoxBESA = MBoxBESA()
        self._struct: StructBESA = StructBESA()
        self._running: bool = False
        self._rng = AgentRNG.for_agent(alias, root_seed)
        self._guard_instances: dict[str, GuardBESA] = {}

    @property
    def rng(self):
        return self._rng

    def register_guard(self, guard_type: type[GuardBESA]) -> None:
        self._struct.add_guard(guard_type)
        guard_instance = guard_type(agent=self)
        self._guard_instances[guard_type.__name__] = guard_instance

    def send(self, target_alias: str, event: EventBESA) -> None:
        event.sender = self.alias
        event.target = target_alias
        from besa.kernel.adm import AdmBESA

        adm = AdmBESA.get_instance()
        if adm is not None:
            adm.send(event)

    def send_to(self, event: EventBESA) -> None:
        self._mbox.send(event)

    def receive(self, timeout: float | None = None) -> EventBESA | None:
        msg = self._mbox.receive(timeout=timeout)
        if isinstance(msg, EventBESA):
            return msg
        return None

    def run(self) -> None:
        self._running = True
        while self._running:
            event = self._mbox.receive()
            if event is None:
                continue
            if isinstance(event, PoisonPill):
                break
            self._route_event(event)
        self._on_shutdown()

    def _route_event(self, event: EventBESA) -> None:
        from besa.kernel.guard_error_handler import GuardErrorHandler

        guard_type = self._struct.get_guard(event)
        if guard_type is None:
            return
        guard = self._guard_instances.get(guard_type.__name__)
        if guard is None:
            guard = guard_type(agent=self)
            self._guard_instances[guard_type.__name__] = guard
        try:
            guard.func_exec_guard(event)
        except Exception as e:
            GuardErrorHandler.handle(self.alias, guard_type.__name__, e, event)

    def shutdown(self) -> None:
        self._running = False
        self._mbox.send(PoisonPill())

    def _on_shutdown(self) -> None:
        self._mbox.close()

    @property
    def mbox(self) -> MBoxBESA:
        return self._mbox
