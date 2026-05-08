from __future__ import annotations

import csv
import os
import random
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from besa.kernel.event import EventBESA
from besa.kernel.periodic_guard import PeriodicGuardBESA
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves
from ethosterra.emotional_evaluator import apply_forget_factor


@dataclass
class HeartBeatData:
    current_date: str
    current_day: int
    elapsed: int


EMOTION_FORGET_FACTORS = {
    "happiness": 0.4,
    "hopeful": 0.1,
    "secure": 0.1,
}

CSV_COLUMNS = [
    "date", "agent", "money", "health", "happiness", "emotion",
    "current_goal", "harvested_weight", "total_harvested_weight", "lands_count", "loans_active",
    "days_in_crisis", "social_capital", "food_security", "task_log",
]

_csv_lock = threading.Lock()
_csv_path: str | None = None
_csv_writer = None
_csv_file = None


def init_csv_writer(path: str) -> None:
    global _csv_path, _csv_file, _csv_writer
    _csv_path = path
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    _csv_file = open(path, "w", newline="")
    _csv_writer = csv.DictWriter(_csv_file, fieldnames=CSV_COLUMNS)
    _csv_writer.writeheader()


def _is_first_day_of_week(date_str: str) -> bool:
    try:
        dt = datetime.strptime(date_str, "%d/%m/%Y")
        return dt.weekday() == 0
    except (ValueError, Exception):
        return False


class HeartBeatGuard(PeriodicGuardBESA):
    def __init__(self, agent=None, period_ms: int = 40):
        super().__init__(agent=agent, period_ms=period_ms)

    def func_exec_guard(self, event: EventBESA) -> None:
        b: PeasantFamilyBelieves = self.get_state()
        if not hasattr(b, 'current_date') or not b.current_date:
            b.current_date = "01/01/2024"
            b.current_day = 0
        self._process_daily_cycle(b)
        self._send_progress_to_control(b)
        if self._check_dead(b):
            self.stop_periodic()
            self._notify_death(b)

    def func_periodic_exec_guard(self) -> None:
        b: PeasantFamilyBelieves = self.get_state()
        if b.wait:
            return
        if not b.current_date:
            b.current_date = "01/01/2024"
            b.current_day = 0
        self._process_daily_cycle(b)
        self._send_progress_to_control(b)
        self._maybe_write_csv(b)
        if self._check_dead(b):
            self.stop_periodic()
            self._notify_death(b)

    def _process_daily_cycle(self, b: PeasantFamilyBelieves) -> None:
        if not hasattr(b, '_last_processed_day'):
            b._last_processed_day = getattr(b, 'current_day', -1)

        b.current_day += 1
        if b.current_date:
            try:
                dt = datetime.strptime(b.current_date, "%d/%m/%Y")
                dt = dt + timedelta(days=1)
                b.current_date = dt.strftime("%d/%m/%Y")
            except ValueError:
                pass

        b.new_day = True
        b.time_left_on_day = 1440.0

        b.money = max(0.0, b.money - b.minimum_vital)
        b.food_security = max(0, b.food_security - 0.005)

        time_delta = 40.0
        for axis, forget_factor in EMOTION_FORGET_FACTORS.items():
            current = getattr(b, axis, 0.0)
            base = 0.0
            new_val = apply_forget_factor(current, base, forget_factor, time_delta)
            setattr(b, axis, max(-1.0, min(1.0, new_val)))

        if b.money <= 0:
            b.health = max(0, b.health - 0.05)
            b.days_in_crisis += 1
        else:
            b.days_in_crisis = max(0, b.days_in_crisis - 1)

        if b.money <= 0 and b.seeds > 0:
            b.money += b.seeds * 2000
            b.seeds = 0
            b.task_log.append("Vendí semillas para sobrevivir")

        if b.money <= 0 and b.tools > 0:
            b.money += b.tools * 5000
            b.tools = 0
            b.task_log.append("Vendí herramientas para sobrevivir")

        agent = self._agent
        if hasattr(agent, 'tick_bdi'):
            agent.tick_bdi()

        b.money = max(0.0, b.money)

    def _maybe_write_csv(self, b: PeasantFamilyBelieves) -> None:
        if not _is_first_day_of_week(b.current_date):
            return
        with _csv_lock:
            if _csv_writer is not None:
                _csv_writer.writerow({
                    "date": b.current_date,
                    "agent": b.alias,
                    "money": str(int(b.money)),
                    "health": f"{b.health:.2f}",
                    "happiness": f"{b.happiness:.2f}",
                    "emotion": b.emotion,
                    "current_goal": b.current_goal or "",
                    "harvested_weight": f"{b.harvested_weight:.2f}",
                    "total_harvested_weight": f"{b.total_harvested_weight:.2f}",
                    "lands_count": str(len(b.lands)),
                    "loans_active": "1" if b.have_loan else "0",
                    "days_in_crisis": str(b.days_in_crisis),
                    "social_capital": f"{b.social_capital:.2f}",
                    "food_security": f"{b.food_security:.2f}",
                    "task_log": ";".join(b.task_log[-10:]),
                })
                try:
                    _csv_file.flush()
                except Exception:
                    pass

    def _send_progress_to_control(self, b: PeasantFamilyBelieves) -> None:
        agent = self._agent
        try:
            control_alias = f"{agent.alias.rsplit('PeasantFamily', 1)[0]}_SimulationControl"
            from ethosterra.agents.simulation_control_messages import ControlMessage
            from ethosterra.agents.simulation_control import SimulationControlGuard
            agent.send(
                control_alias,
                EventBESA(
                    guard_type=SimulationControlGuard,
                    data=ControlMessage(
                        alias=agent.alias,
                        current_date=b.current_date,
                        current_day=b.current_day,
                    ),
                ),
            )
        except Exception:
            pass

    def _check_dead(self, b: PeasantFamilyBelieves) -> bool:
        return b.health <= 0.0

    def _notify_death(self, b: PeasantFamilyBelieves) -> None:
        agent = self._agent
        try:
            control_alias = f"{agent.alias.rsplit('PeasantFamily', 1)[0]}_SimulationControl"
            from ethosterra.agents.simulation_control_messages import ControlMessage
            from ethosterra.agents.simulation_control import DeadAgentGuard
            agent.send(
                control_alias,
                EventBESA(
                    guard_type=DeadAgentGuard,
                    data=ControlMessage(
                        alias=agent.alias,
                        current_date=b.current_date,
                        current_day=b.current_day,
                        dead=True,
                    ),
                ),
            )
        except Exception:
            pass
        if hasattr(agent, 'shutdown'):
            agent.shutdown()
