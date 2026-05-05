from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA


@dataclass
class LandInfo:
    id: str = ""
    area: float = 1.0
    owner: str = ""
    is_available: bool = True


@dataclass
class CivicAuthorityState:
    available_lands: list[LandInfo] = field(default_factory=list)
    training_slots: int = 10
    training_slots_per_year: int = 10
    total_lands_assigned: int = 0

    def assign_land(self, peasant_alias: str) -> LandInfo | None:
        for land in self.available_lands:
            if land.is_available:
                land.is_available = False
                land.owner = peasant_alias
                self.total_lands_assigned += 1
                return land
        return None

    def release_land(self, land_id: str) -> None:
        for land in self.available_lands:
            if land.id == land_id:
                land.is_available = True
                land.owner = ""
                break

    def request_training(self) -> bool:
        if self.training_slots > 0:
            self.training_slots -= 1
            return True
        return False

    def reset_training_slots(self) -> None:
        self.training_slots = self.training_slots_per_year


class FromCivicAuthorityMessageType:
    LAND_APPROVED = "LAND_APPROVED"
    LAND_DENIED = "LAND_DENIED"
    TRAINING_APPROVED = "TRAINING_APPROVED"
    TRAINING_DENIED = "TRAINING_DENIED"
    LAND_RELEASED = "LAND_RELEASED"


class CivicAuthorityMessage:
    def __init__(
        self,
        message_type: str = "",
        peasant_alias: str = "",
        land_id: str = "",
        area: float = 0.0,
    ):
        self.message_type = message_type
        self.peasant_alias = peasant_alias
        self.land_id = land_id
        self.area = area


class CivicAuthorityLandGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, CivicAuthorityMessage):
            return
        state: CivicAuthorityState = self.get_state()

        if msg.message_type == "REQUEST_LAND":
            pass
            land = state.assign_land(msg.peasant_alias)
            if land:
                self._agent.send(
                    msg.peasant_alias,
                    EventBESA(
                        guard_type=FromCivicAuthorityGuard,
                        data=CivicAuthorityMessage(
                            FromCivicAuthorityMessageType.LAND_APPROVED,
                            land_id=land.id, area=land.area,
                        ),
                    ),
                )
            else:
                self._agent.send(
                    msg.peasant_alias,
                    EventBESA(
                        guard_type=FromCivicAuthorityGuard,
                        data=CivicAuthorityMessage(
                            FromCivicAuthorityMessageType.LAND_DENIED,
                        ),
                    ),
                )

        elif msg.message_type == "RELEASE_LAND":
            state.release_land(msg.land_id)

        elif msg.message_type == "REQUEST_TRAINING":
            if state.request_training():
                self._agent.send(
                    msg.peasant_alias,
                    EventBESA(
                        guard_type=FromCivicAuthorityGuard,
                        data=CivicAuthorityMessage(
                            FromCivicAuthorityMessageType.TRAINING_APPROVED,
                        ),
                    ),
                )
            else:
                self._agent.send(
                    msg.peasant_alias,
                    EventBESA(
                        guard_type=FromCivicAuthorityGuard,
                        data=CivicAuthorityMessage(
                            FromCivicAuthorityMessageType.TRAINING_DENIED,
                        ),
                    ),
                )


class FromCivicAuthorityGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        pass


class CivicAuthorityAgent(AgentBESA):
    def __init__(self, alias: str, num_lands: int = 100, training_slots: int = 10):
        state = CivicAuthorityState(
            available_lands=[LandInfo(id=f"land-{i}") for i in range(num_lands)],
            training_slots=training_slots,
            training_slots_per_year=training_slots,
        )
        super().__init__(alias, state)
        self.register_guard(CivicAuthorityLandGuard)
