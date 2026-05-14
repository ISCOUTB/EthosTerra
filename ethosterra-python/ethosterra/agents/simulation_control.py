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


@dataclass
class SimulationControlState:
    agent_map: dict[str, AgentInfo] = field(default_factory=dict)
    dead_agent_map: dict[str, bool] = field(default_factory=dict)
    total_agents: int = 0
    years: int = 1
    started: bool = False
    days_to_check: int = 7

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

    def check_agents_status(self, agent_alias: str, current_day: int) -> bool:
        if not self.agent_map:
            return False
        min_day = min((a.current_day for a in self.agent_map.values()), default=current_day)
        return current_day - min_day >= self.days_to_check

    def all_dead(self) -> bool:
        return len(self.agent_map) == 0 and len(self.dead_agent_map) >= self.total_agents


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
        clock = SimulationClock.get_instance()

        alias = msg.agent_alias
        state.modify_agent(alias, msg.current_day)

        if state.check_agents_status(alias, msg.current_day):
            self._send_pause(alias)

        if clock.is_after(msg.current_date):
            clock.set_current_date(msg.current_date)
            if clock.is_first_day_of_week(msg.current_date):
                self._print_progress(msg.current_date, state.years)

    def _send_pause(self, alias: str) -> None:
        from ethosterra.guards.from_simulation_control import FromSimulationControlGuard
        agent = self._agent
        agent.send(
            alias,
            EventBESA(
                guard_type=FromSimulationControlGuard,
                data=ControlMessage(wait=True, alias=alias),
            ),
        )

    def _send_unpause(self, alias: str) -> None:
        from ethosterra.guards.from_simulation_control import FromSimulationControlGuard
        agent = self._agent
        agent.send(
            alias,
            EventBESA(
                guard_type=FromSimulationControlGuard,
                data=ControlMessage(wait=False, alias=alias),
            ),
        )

    def _print_progress(self, current_date_str: str, years: int) -> None:
        clock = SimulationClock.get_instance()
        current = datetime.strptime(current_date_str, "%d/%m/%Y")
        start = datetime(current.year, 1, 1)
        end = datetime(current.year + years, 1, 1)
        total = (end - start).days
        elapsed = (current - start).days
        pct = (100.0 * elapsed) / total if total > 0 else 0
        print(f"UPDATE: Progress {current_date_str}: {pct:.2f}%")


class DeadAgentGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, ControlMessage):
            return
        state: SimulationControlState = self.get_state()
        alias = msg.agent_alias
        state.remove_agent(alias)
        if state.all_dead():
            print("SIMULATION: All agents dead. Stopping simulation.")


class SimulationControlAgent(AgentBESA):
    def __init__(self, alias: str, total_agents: int = 1, years: int = 1):
        state = SimulationControlState(total_agents=total_agents, years=years)
        super().__init__(alias, state)
        self.register_guard(AliveAgentGuard)
        self.register_guard(SimulationControlGuard)
        self.register_guard(DeadAgentGuard)

    def _send_alive_register(self, agent_alias: str) -> None:
        self.send(
            self.alias,
            EventBESA(
                guard_type=AliveAgentGuard,
                data=ControlMessage(alias=agent_alias, current_day=0),
            ),
        )
