from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA


_ws_instance: Any = None


def set_ws_server(server: Any) -> None:
    global _ws_instance
    _ws_instance = server


@dataclass
class ViewerLensState:
    active_agents: int = 0
    current_date: str = ""
    simulation_running: bool = True
    agent_states: dict[str, dict[str, Any]] = field(default_factory=dict)

    def update_agent_state(self, agent_name: str, state_data: dict[str, Any]) -> None:
        self.agent_states[agent_name] = state_data

    def to_websocket_setup(self) -> str:
        return f"q={self.active_agents}"

    def to_websocket_date(self) -> str:
        return f"d={self.current_date}"

    def to_websocket_end(self) -> str:
        return "e=end"


class ViewerLensGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        state: ViewerLensState = self.get_state()

        if isinstance(msg, dict):
            if "end" in msg and _ws_instance:
                _ws_instance.broadcast("e=end")
                return
            if "current_date" in msg:
                state.current_date = msg["current_date"]
                if _ws_instance:
                    _ws_instance.broadcast(f"d={state.current_date}")
            if "active_agents" in msg:
                state.active_agents = msg["active_agents"]
                if _ws_instance:
                    _ws_instance.broadcast(f"q={state.active_agents}")
            if "agent_name" in msg:
                state.update_agent_state(msg["agent_name"], msg)
                if _ws_instance:
                    import json
                    ws_msg = json.dumps({
                        "name": msg["agent_name"],
                        "state": msg.get("state", "{}"),
                        "taskLog": msg.get("task_log", []),
                    })
                    _ws_instance.broadcast(f"j={ws_msg}")


class ViewerLensAgent(AgentBESA):
    def __init__(self, alias: str):
        super().__init__(alias, ViewerLensState())
        self.register_guard(ViewerLensGuard)
