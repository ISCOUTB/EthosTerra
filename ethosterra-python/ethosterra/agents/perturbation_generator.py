from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from besa.kernel.event import EventBESA
from besa.kernel.periodic_guard import PeriodicGuardBESA
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


class PerturbationGeneratorGuard(PeriodicGuardBESA):
    def __init__(self, agent=None, period_ms: int = 40):
        super().__init__(agent=agent, period_ms=period_ms)

    def func_exec_guard(self, event: EventBESA) -> None:
        pass

    def func_periodic_exec_guard(self) -> None:
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
            elif roll < state.drought_probability + state.flood_probability + state.plague_probability + state.earthquake_probability:
                event_generated = PerturbationEvent("earthquake", 0.4 + rng.random() * 0.3, duration_days=1 + int(rng.random() * 3))

            if event_generated:
                state.current_events.append(event_generated)
                state.days_since_last_event = 0
                self._broadcast_event(event_generated)

        self._price_perturbation_tick(rng)

    def _price_perturbation_tick(self, rng) -> None:
        if rng.random() < 0.01:
            types = [
                "INCREASE_TOOLS_PRICE", "DECREASE_TOOLS_PRICE",
                "INCREASE_SEEDS_PRICE", "DECREASE_SEEDS_PRICE",
                "INCREASE_CROP_PRICE", "DECREASE_CROP_PRICE",
            ]
            idx = int(rng.random() * len(types))
            msg_type = types[idx]
            impact = 5 + int(rng.random() * 32) * 5
            from besa.kernel.event import EventBESA
            from ethosterra.agents.market_place import MarketPlaceMessage, MarketPlaceGuard
            self._agent.send(
                "MarketPlace",
                EventBESA(
                    guard_type=MarketPlaceGuard,
                    data=MarketPlaceMessage(
                        message_type=msg_type,
                        price=float(impact),
                    ),
                ),
            )

    def _broadcast_event(self, event: PerturbationEvent) -> None:
        from besa.kernel.adm import AdmBESA
        adm = AdmBESA.get_instance()
        if adm is None:
            return
        from ethosterra.guards.natural_phenomena import NaturalPhenomena
        for agent in adm.get_agents():
            alias = getattr(agent, 'alias', '')
            if 'PeasantFamily' in alias or 'peasant' in alias.lower():
                self._agent.send(
                    alias,
                    EventBESA(guard_type=NaturalPhenomena, data=event),
                )


class PerturbationGeneratorAgent(AgentBESA):
    def __init__(self, alias: str):
        super().__init__(alias, PerturbationGeneratorState())
        guard = PerturbationGeneratorGuard(agent=self, period_ms=40)
        self._guard_instances[PerturbationGeneratorGuard.__name__] = guard
        self._struct.add_guard(PerturbationGeneratorGuard)
        guard.start_periodic()
