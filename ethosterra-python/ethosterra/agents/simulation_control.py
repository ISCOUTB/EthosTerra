from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA

from ethosterra.agents.agent_info import AgentInfo
from ethosterra.agents.simulation_control_messages import ControlMessage
from ethosterra.simulation_clock import SimulationClock
from ethosterra.simulation_params import SimulationParams

_SIM_START_YEAR = 2024


@dataclass
class SimulationControlState:
    agent_map: dict[str, AgentInfo] = field(default_factory=dict)
    dead_agent_map: dict[str, bool] = field(default_factory=dict)
    total_agents: int = 0
    years: int = 1
    start_year: int = _SIM_START_YEAR
    started: bool = False

    def add_agent(self, agent_name: str, current_day: int) -> None:
        self.agent_map[agent_name] = AgentInfo(state=False, current_day=current_day)
        if len(self.agent_map) == self.total_agents:
            self.started = True

    def remove_agent(self, agent_name: str) -> None:
        self.agent_map.pop(agent_name, None)
        self.dead_agent_map[agent_name] = True

    def is_known_agent(self, agent_name: str) -> bool:
        return agent_name in self.agent_map or agent_name in self.dead_agent_map

    def modify_agent(self, agent_name: str, current_day: int) -> None:
        if agent_name not in self.agent_map:
            return
        info = self.agent_map[agent_name]
        info.state = True
        info.current_day = current_day

    def all_dead(self) -> bool:
        return (
            self.total_agents > 0
            and len(self.agent_map) == 0
            and len(self.dead_agent_map) >= self.total_agents
        )


class AliveAgentGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, ControlMessage):
            return
        state: SimulationControlState = self.get_state()
        state.add_agent(msg.agent_alias, msg.current_day)


class SimulationControlGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, ControlMessage):
            return
        state: SimulationControlState = self.get_state()
        if not state.is_known_agent(msg.agent_alias):
            return
        clock = SimulationClock.get_instance()

        state.modify_agent(msg.agent_alias, msg.current_day)

        if clock.is_after(msg.current_date):
            clock.set_current_date(msg.current_date)
            if clock.is_first_day_of_week(msg.current_date):
                self._print_progress(msg.current_date, state.years, state.start_year)

    def _print_progress(self, current_date_str: str, years: int, start_year: int) -> None:
        current = datetime.strptime(current_date_str, "%d/%m/%Y")
        start = datetime(start_year, 1, 1)
        end = datetime(start_year + years, 1, 1)
        total = (end - start).days
        elapsed = (current - start).days
        pct = max(0.0, min(100.0, (100.0 * elapsed) / total)) if total > 0 else 0.0
        print(f"UPDATE: Progress {current_date_str}: {pct:.2f}%")
        try:
            from ethosterra.agents.viewer_lens import get_ws_server
            import json
            ws = get_ws_server()
            if ws:
                ws.broadcast(f"p={json.dumps({'date': current_date_str, 'pct': round(pct, 2)})}")
                if pct >= 100.0:
                    ws.broadcast("e=end")
        except Exception:
            pass


class DeadAgentGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, ControlMessage):
            return
        state: SimulationControlState = self.get_state()
        alias = msg.agent_alias

        # Ignore death notifications from agents not registered in this simulation
        if alias not in state.agent_map:
            return

        state.remove_agent(alias)
        remaining = len(state.agent_map)
        print(f"SIMULATION: Agent '{alias}' finished. {remaining} remaining.")

        if state.all_dead():
            print("SIMULATION: All agents finished. Ending simulation.")
            try:
                from ethosterra.agents.viewer_lens import get_ws_server
                ws = get_ws_server()
                if ws:
                    ws.broadcast("e=end")
            except Exception:
                pass


class SimulationControlAgent(AgentBESA):
    def __init__(self, alias: str, total_agents: int = 1, years: int = 1,
                 start_year: int = _SIM_START_YEAR):
        state = SimulationControlState(
            total_agents=total_agents,
            years=years,
            start_year=start_year,
        )
        super().__init__(alias, state)
        self.register_guard(AliveAgentGuard)
        self.register_guard(SimulationControlGuard)
        self.register_guard(DeadAgentGuard)
