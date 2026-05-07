from __future__ import annotations

import threading
import time
from abc import abstractmethod

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA


class PeriodicGuardBESA(GuardBESA):
    def __init__(self, agent, period_ms: int = 40):
        super().__init__(agent=agent)
        self._period = period_ms / 1000.0
        self._timer: threading.Timer | None = None
        self._running = False
        self._lock = threading.Lock()

    def start_periodic(self) -> None:
        with self._lock:
            if self._running:
                return
            self._running = True
        self._schedule_next()

    def stop_periodic(self) -> None:
        with self._lock:
            self._running = False
            if self._timer is not None:
                self._timer.cancel()
                self._timer = None

    def _schedule_next(self) -> None:
        with self._lock:
            if not self._running:
                return
            self._timer = threading.Timer(self._period, self._on_tick)
            self._timer.daemon = True
            self._timer.start()

    def _on_tick(self) -> None:
        with self._lock:
            if not self._running:
                return
        try:
            self.func_periodic_exec_guard()
        except Exception:
            pass
        self._schedule_next()

    @abstractmethod
    def func_periodic_exec_guard(self) -> None:
        ...
