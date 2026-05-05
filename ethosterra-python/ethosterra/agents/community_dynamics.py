from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA


@dataclass
class LaborContract:
    worker_alias: str
    contractor_alias: str
    days_remaining: int = 0
    daily_wage: float = 50000
    total_days: int = 0


@dataclass
class CommunityDynamicsState:
    available_workers: dict[str, list[str]] = field(default_factory=dict)
    active_contracts: list[LaborContract] = field(default_factory=list)
    collaboration_offers: list[str] = field(default_factory=list)

    def offer_help(self, worker_alias: str) -> None:
        if worker_alias not in self.collaboration_offers:
            self.collaboration_offers.append(worker_alias)

    def request_worker(self, contractor_alias: str) -> str | None:
        if self.collaboration_offers:
            return self.collaboration_offers.pop(0)
        return None

    def create_contract(
        self,
        worker_alias: str,
        contractor_alias: str,
        days: int,
        wage: float = 50000,
    ) -> LaborContract:
        contract = LaborContract(
            worker_alias=worker_alias,
            contractor_alias=contractor_alias,
            days_remaining=days,
            daily_wage=wage,
            total_days=days,
        )
        self.active_contracts.append(contract)
        return contract


class FromCommunityDynamicsMessageType:
    WORKER_FOUND = "WORKER_FOUND"
    NO_WORKER = "NO_WORKER"
    CONTRACT_OFFERED = "CONTRACT_OFFERED"
    CONTRACT_ACCEPTED = "CONTRACT_ACCEPTED"
    CONTRACT_FINISHED = "CONTRACT_FINISHED"


class CommunityDynamicsMessage:
    def __init__(
        self,
        message_type: str = "",
        worker_alias: str = "",
        contractor_alias: str = "",
        days: int = 0,
        wage: float = 50000,
    ):
        self.message_type = message_type
        self.worker_alias = worker_alias
        self.contractor_alias = contractor_alias
        self.days = days
        self.wage = wage


class CommunityDynamicsGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, CommunityDynamicsMessage):
            return
        state: CommunityDynamicsState = self.get_state()

        if msg.message_type == "OFFER_HELP":
            state.offer_help(msg.worker_alias)

        elif msg.message_type == "REQUEST_WORKER":
            worker = state.request_worker(msg.contractor_alias)
            if worker:
                contract = state.create_contract(worker, msg.contractor_alias, msg.days, msg.wage)
                self._agent.send(
                    worker,
                    EventBESA(
                        guard_type=FromCommunityDynamicsGuard,
                        data=CommunityDynamicsMessage(
                            FromCommunityDynamicsMessageType.CONTRACT_OFFERED,
                            contractor_alias=msg.contractor_alias,
                            days=msg.days, wage=msg.wage,
                        ),
                    ),
                )
                self._agent.send(
                    msg.contractor_alias,
                    EventBESA(
                        guard_type=FromCommunityDynamicsGuard,
                        data=CommunityDynamicsMessage(
                            FromCommunityDynamicsMessageType.WORKER_FOUND,
                            worker_alias=worker,
                        ),
                    ),
                )

        elif msg.message_type == "FINISH_CONTRACT":
            state.active_contracts = [
                c for c in state.active_contracts
                if not (c.worker_alias == msg.worker_alias and c.contractor_alias == msg.contractor_alias)
            ]


class FromCommunityDynamicsGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        pass


class CommunityDynamicsAgent(AgentBESA):
    def __init__(self, alias: str):
        super().__init__(alias, CommunityDynamicsState())
        self.register_guard(CommunityDynamicsGuard)
