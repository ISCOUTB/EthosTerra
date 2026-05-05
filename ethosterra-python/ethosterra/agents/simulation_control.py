from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA

from ethosterra.agents.agent_info import AgentInfo
from ethosterra.simulation_clock import SimulationClock
from ethosterra.simulation_params import SimulationParams


@dataclass
class SimulationControlState:
    agent_map: dict[str, AgentInfo] = field(default_factory=dict)
    dead_agent_map: dict[str, bool] = field(default_factory=dict)
    total_agents: int = 0
    years: int = 1
    started: bool = False

    def add_agent(self, agent_name: str, current_day: int) -> None:
        self.agent_map[agent_name] = AgentInfo(state=False, current_day=current_day)
        if len(self.agent_map) == self.total_agents:
            self.started = True

    def remove_agent(self, agent_name: str) -> None:
        self.agent_map.pop(agent_name, None)
        self.dead_agent_map[agent_name] = True

    def modify_agent(self, agent_name: str, current_day: int) -> None:
        info = self.agent_map.get(agent_name, AgentInfo(state=False, current_day=current_day))
        info.state = True
        info.current_day = current_day
        self.agent_map[agent_name] = info

    def check_agents_status(self, peasant_alias: str, current_day: int, days_to_check: int = 7) -> bool:
        min_day = min((a.current_day for a in self.agent_map.values()), default=current_day)
        if current_day - min_day >= days_to_check:
            return True
        return False


class SimulationControlGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        from ethosterra.agents.simulation_control_messages import ControlMessage
        msg = event.data
        if not isinstance(msg, ControlMessage):
            return
        state: SimulationControlState = self.get_state()
        clock = SimulationClock.get_instance()

        state.modify_agent(msg.peasant_family_alias, msg.current_day)

        if clock.is_after(msg.current_date):
            clock.set_current_date(msg.current_date)
            if clock.is_first_day_of_week(msg.current_date):
                self._print_progress(msg.current_date)

    def _print_progress(self, current_date_str: str) -> None:
        from datetime import datetime
        clock = SimulationClock.get_instance()
        start = datetime.strptime("01/01/" + str(datetime.now().year), "%d/%m/%Y")
        end = datetime.strptime("01/01/" + str(datetime.now().year + 1), "%d/%m/%Y")
        current = datetime.strptime(current_date_str, "%d/%m/%Y")
        total = (end - start).days
        elapsed = (current - start).days
        pct = (100.0 * elapsed) / total if total > 0 else 0
        print(f"UPDATE: Progress {current_date_str}: {pct:.2f}%")


class SimulationControlAgent(AgentBESA):
    def __init__(self, alias: str, total_agents: int = 1, years: int = 1):
        state = SimulationControlState(total_agents=total_agents, years=years)
        super().__init__(alias, state)
        self.register_guard(SimulationControlGuard)
