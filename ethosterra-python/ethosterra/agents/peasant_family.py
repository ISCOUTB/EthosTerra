from __future__ import annotations

from typing import Any
from besa.bdi.agent_bdi import AgentBDI
from besa.bdi.declarative.declarative_goal import DeclarativeGoal
from besa.bdi.declarative.goal_registry import GoalRegistry
from besa.kernel.event import EventBESA

from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves
from ethosterra.plan_executor import PlanExecutor
from ethosterra.simulation_params import SimulationParams
from ethosterra.agents.simulation_control_messages import ControlMessage
from ethosterra.agents.simulation_control import SimulationControlGuard


class PeasantFamily(AgentBDI):
    def __init__(self, alias: str, params: SimulationParams):
        believes = PeasantFamilyBelieves(
            alias=alias,
            money=float(params.money),
            initial_money=float(params.money),
            tools=params.tools,
            seeds=params.seeds,
            water_available=params.water,
            irrigation=params.irrigation == 1,
            emotions_enabled=params.emotions == 1,
            training_enabled=params.training == 1,
            personality=params.personality,
        )
        super().__init__(alias, state=believes)
        self._guard_map: dict[str, type] = {}
        self._register_all_guards()
        self._load_goals()
        self._bdi_state.plan_executor = self._run_goal_plan

    def _register_all_guards(self) -> None:
        from ethosterra.guards.from_simulation_control import FromSimulationControlGuard
        from ethosterra.guards.from_bank_office import FromBankOfficeGuard
        from ethosterra.guards.from_market_place import FromMarketPlaceGuard
        from ethosterra.guards.from_civic_authority import FromCivicAuthorityGuard
        from ethosterra.guards.from_civic_authority import FromCivicAuthorityTrainingGuard
        from ethosterra.guards.from_agro_ecosystem import FromAgroEcosystemGuard
        from ethosterra.guards.from_community_dynamics import (
            SocietyWorkerContractGuard,
            SocietyWorkerContractorGuard,
            PeasantWorkerContractFinishedGuard,
            SocietyWorkerDateSyncGuard,
        )
        from ethosterra.guards.heart_beat import HeartBeatGuard
        from ethosterra.guards.status import StatusGuard

        guards = [
            HeartBeatGuard,
            FromSimulationControlGuard,
            FromBankOfficeGuard,
            FromMarketPlaceGuard,
            FromCivicAuthorityGuard,
            FromCivicAuthorityTrainingGuard,
            FromAgroEcosystemGuard,
            SocietyWorkerContractGuard,
            SocietyWorkerContractorGuard,
            PeasantWorkerContractFinishedGuard,
            SocietyWorkerDateSyncGuard,
            StatusGuard,
        ]
        for guard in guards:
            self.register_guard(guard)

    def _load_goals(self) -> None:
        goal_ids = [
            "do_void", "do_vitals", "seek_purpose", "do_healthcare", "self_evaluation",
            "look_for_loan", "pay_debts",
            "attend_religious_events", "check_crops", "harvest_crops", "manage_pests",
            "plant_crop", "prepare_land", "deforest_land", "sell_crop",
            "search_for_help", "work_for_other",
            "get_price_list", "obtain_a_land", "obtain_seeds", "obtain_tools",
            "alternative_work", "obtain_pesticides", "obtain_supplies", "obtain_livestock",
            "get_training", "irrigate_crops", "obtain_water",
            "communicate", "look_for_collaboration", "provide_collaboration",
            "spend_family_time", "spend_friends_time", "leisure_activities",
            "waste_time_and_resources", "find_news",
        ]
        for gid in goal_ids:
            goal = DeclarativeGoal.build(gid)
            self.add_potential_goal(goal)

    def _run_goal_plan(self, goal_id: str, believes: Any) -> bool:
        return PlanExecutor.run_goal(
            goal_id,
            self.alias,
            believes,
            self.send,
            self._send_guard_event,
        )

    def _send_guard_event(self, target: str, msg_type: str, data: Any) -> None:
        from besa.kernel.adm import AdmBESA
        from besa.kernel.event import EventBESA
        if target in self._guard_map:
            guard_type = self._guard_map[target]
        else:
            guard_type = self._resolve_guard_for_target(target)
        if guard_type:
            adm = AdmBESA.get_instance()
            if adm:
                target_agent = adm.lookup(target)
                if target_agent:
                    target_agent.send_to(EventBESA(guard_type=guard_type, data=data, sender=self.alias))

    @staticmethod
    def _resolve_guard_for_target(target: str) -> type | None:
        from ethosterra.agents.bank_office import BankOfficeGuard
        from ethosterra.agents.market_place import MarketPlaceGuard
        from ethosterra.agents.civic_authority import CivicAuthorityLandGuard
        from ethosterra.agents.community_dynamics import CommunityDynamicsGuard
        from ethosterra.agents.agro_ecosystem import AgroEcosystemGuard
        from ethosterra.agents.simulation_control import SimulationControlGuard
        _m = {
            "BankOffice": BankOfficeGuard,
            "MarketPlace": MarketPlaceGuard,
            "CivicAuthority": CivicAuthorityLandGuard,
            "CommunityDynamics": CommunityDynamicsGuard,
            "AgroEcosystem": AgroEcosystemGuard,
            "SimulationControl": SimulationControlGuard,
        }
        return _m.get(target)

    def process_day(self) -> None:
        believes: PeasantFamilyBelieves = self.state
        if believes.is_new_day():
            self.tick_bdi()
            self._send_alive_ping()

    def _send_alive_ping(self) -> None:
        believes: PeasantFamilyBelieves = self.state
        self.send(
            f"{self.alias.rsplit('PeasantFamily', 1)[0]}SimulationControl",
            EventBESA(
                guard_type=SimulationControlGuard,
                data=ControlMessage(
                    peasant_family_alias=self.alias,
                    current_date=believes.current_date,
                    current_day=believes.current_day,
                ),
            ),
        )
