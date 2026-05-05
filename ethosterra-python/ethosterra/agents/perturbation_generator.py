from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA


@dataclass
class PerturbationEvent:
    event_type: str = ""
    severity: float = 1.0
    affected_region: str = "all"
    duration_days: int = 0


@dataclass
class PerturbationGeneratorState:
    enabled: bool = True
    drought_probability: float = 0.05
    flood_probability: float = 0.03
    plague_probability: float = 0.04
    earthquake_probability: float = 0.01
    current_events: list[PerturbationEvent] = field(default_factory=list)
    days_since_last_event: int = 0


from ethosterra.simulation_params import SimulationParams


class PerturbationGeneratorGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if isinstance(msg, dict) and msg.get("action") == "tick":
            state: PerturbationGeneratorState = self.get_state()
            state.days_since_last_event += 1
            rng = self._agent.rng
            event_generated = None

            if state.days_since_last_event > 30:
                roll = rng.random()
                if roll < state.drought_probability:
                    event_generated = PerturbationEvent("drought", 0.3 + rng.random() * 0.4, duration_days=15 + int(rng.random() * 30))
                elif roll < state.drought_probability + state.flood_probability:
                    event_generated = PerturbationEvent("flood", 0.2 + rng.random() * 0.3, duration_days=5 + int(rng.random() * 10))
                elif roll < state.drought_probability + state.flood_probability + state.plague_probability:
                    event_generated = PerturbationEvent("plague", 0.3 + rng.random() * 0.5, duration_days=20 + int(rng.random() * 40))

                if event_generated:
                    state.current_events.append(event_generated)
                    state.days_since_last_event = 0


class PerturbationGeneratorAgent(AgentBESA):
    def __init__(self, alias: str):
        super().__init__(alias, PerturbationGeneratorState())
        self.register_guard(PerturbationGeneratorGuard)
