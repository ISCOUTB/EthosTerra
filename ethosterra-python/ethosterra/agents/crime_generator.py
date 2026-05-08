from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.periodic_guard import PeriodicGuardBESA
from besa.kernel.agent import AgentBESA


@dataclass
class CrimeEvent:
    victim_alias: str = ""
    victim_land: str = ""
    severity: float = 0.0
    money_lost: float = 0.0
    harvest_lost: float = 0.0
    date: str = ""


class CrimeGeneratorState:
    def __init__(
        self,
        base_rate: float = 0.002,
        money_loss_pct: float = 0.15,
        harvest_loss_pct: float = 0.30,
        direct_secure_impact: float = 1.0,
        neighbor_secure_impact: float = 0.5,
        neighbor_2hop_impact: float = 0.2,
    ):
        self.base_rate = base_rate
        self.money_loss_pct = money_loss_pct
        self.harvest_loss_pct = harvest_loss_pct
        self.direct_secure_impact = direct_secure_impact
        self.neighbor_secure_impact = neighbor_secure_impact
        self.neighbor_2hop_impact = neighbor_2hop_impact
        self.total_crimes = 0
        self._last_crime_day = -999


class CrimeGeneratorGuard(PeriodicGuardBESA):
    def __init__(self, agent=None, period_ms: int = 1000):
        super().__init__(agent=agent, period_ms=period_ms)

    def func_exec_guard(self, event: EventBESA) -> None:
        pass

    def func_periodic_exec_guard(self) -> None:
        try:
            state: CrimeGeneratorState = self.get_state()
            agent: CrimeGeneratorAgent = self._agent

            from ethosterra.simulation_clock import SimulationClock
            clock = SimulationClock.get_instance()
            date_str = clock.get_current_date()

            from datetime import datetime
            try:
                start = datetime.strptime("01/01/2024", "%d/%m/%Y")
                current = datetime.strptime(date_str, "%d/%m/%Y")
                current_day = (current - start).days
            except Exception:
                current_day = agent._current_day

            agent._current_day = current_day

            if current_day == state._last_crime_day:
                return

            import random
            r = random.random()
            if r > state.base_rate:
                state._last_crime_day = current_day
                return

            state._last_crime_day = current_day

            targets = agent._get_victim_targets()
            if not targets:
                return

            target = random.choice(targets)
            victim_alias = target["alias"]
            victim_land = target["land_ids"][0] if target["land_ids"] else ""

            money_lost = target.get("money", 0) * state.money_loss_pct
            harvest_lost = target.get("harvested_weight", 0) * state.harvest_loss_pct

            event = CrimeEvent(
                victim_alias=victim_alias,
                victim_land=victim_land,
                severity=random.uniform(0.3, 0.9),
                money_lost=money_lost,
                harvest_lost=harvest_lost,
                date=date_str,
            )

            agent._apply_crime(event)
            agent._propagate_insecurity(event)
            state.total_crimes += 1
        except Exception:
            pass


class CrimeGeneratorAgent(AgentBESA):
    def __init__(
        self,
        alias: str = "CrimeGenerator",
        base_rate: float = 0.002,
        period_ms: int = 1000,
    ):
        state = CrimeGeneratorState(base_rate=base_rate)
        super().__init__(alias, state)
        self._victims: dict[str, Any] = {}
        self._neighbor_map: dict[str, list[str]] = {}
        self._current_day = 0
        self._period_ms = period_ms
        self._guard = None
        self._struct.add_guard(CrimeGeneratorGuard)

    def start(self) -> None:
        super().start()
        self._guard = CrimeGeneratorGuard(agent=self, period_ms=self._period_ms)
        self._guard_instances[CrimeGeneratorGuard.__name__] = self._guard
        self._guard.start_periodic()

    def register_victim(
        self,
        alias: str,
        land_ids: list[str],
        money: float = 0,
        harvested_weight: float = 0,
        neighbor_aliases: dict[str, list[str]] | None = None,
    ) -> None:
        self._victims[alias] = {
            "alias": alias,
            "land_ids": land_ids,
            "money": money,
            "harvested_weight": harvested_weight,
        }
        if neighbor_aliases:
            self._neighbor_map[alias] = neighbor_aliases.get(alias, [])

    def update_victim(
        self,
        alias: str,
        money: float = 0,
        harvested_weight: float = 0,
    ) -> None:
        if alias in self._victims:
            self._victims[alias]["money"] = money
            self._victims[alias]["harvested_weight"] = harvested_weight

    def _get_victim_targets(self) -> list[dict]:
        targets = []
        for alias, info in self._victims.items():
            if info["land_ids"]:
                targets.append(info)
        return targets

    def _apply_crime(self, event: CrimeEvent) -> None:
        from ethosterra.guards.from_community_dynamics import CrimeAlertGuard
        from ethosterra.agents.community_dynamics import (
            CommunityDynamicsMessage,
            FromCommunityDynamicsMessageType,
        )

        msg = CommunityDynamicsMessage(
            message_type=FromCommunityDynamicsMessageType.CRIME_ALERT,
            victim_alias=event.victim_alias,
            victim_land=event.victim_land,
            severity=event.severity,
            money_lost=event.money_lost,
            harvest_lost=event.harvest_lost,
            date=event.date,
        )
        self.send(event.victim_alias, EventBESA(guard_type=CrimeAlertGuard, data=msg))

    def _propagate_insecurity(self, event: CrimeEvent) -> None:
        from ethosterra.guards.from_community_dynamics import CrimeAlertGuard
        from ethosterra.agents.community_dynamics import (
            CommunityDynamicsMessage,
            FromCommunityDynamicsMessageType,
        )

        visited = {event.victim_alias}

        for nb_alias in self._neighbor_map.get(event.victim_alias, []):
            if nb_alias in visited:
                continue
            visited.add(nb_alias)

            msg = CommunityDynamicsMessage(
                message_type=FromCommunityDynamicsMessageType.CRIME_NEARBY,
                victim_alias=event.victim_alias,
                victim_land=event.victim_land,
                severity=event.severity * 0.5,
                money_lost=0,
                harvest_lost=0,
                date=event.date,
                distance=1,
            )
            self.send(nb_alias, EventBESA(guard_type=CrimeAlertGuard, data=msg))

            for nb2 in self._neighbor_map.get(nb_alias, []):
                if nb2 in visited:
                    continue
                visited.add(nb2)

                msg2 = CommunityDynamicsMessage(
                    message_type=FromCommunityDynamicsMessageType.CRIME_NEARBY,
                    victim_alias=event.victim_alias,
                    victim_land=event.victim_land,
                    severity=event.severity * 0.2,
                    money_lost=0,
                    harvest_lost=0,
                    date=event.date,
                    distance=2,
                )
                self.send(nb2, EventBESA(guard_type=CrimeAlertGuard, data=msg2))
