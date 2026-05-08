from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves
from ethosterra.agents.community_dynamics import CommunityDynamicsMessage, FromCommunityDynamicsMessageType


class SocietyWorkerContractGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, CommunityDynamicsMessage):
            return
        believes: PeasantFamilyBelieves = self.get_state()

        if msg.message_type == FromCommunityDynamicsMessageType.CONTRACT_OFFERED:
            believes.contractor = msg.contractor_alias
            believes.days_to_work_for_other = msg.days
            believes.task_log.append(f"Contrato ofrecido por {msg.contractor_alias} por {msg.days} días")


class SocietyWorkerContractorGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, CommunityDynamicsMessage):
            return
        believes: PeasantFamilyBelieves = self.get_state()

        if msg.message_type == FromCommunityDynamicsMessageType.WORKER_FOUND:
            believes.peasant_family_helper = msg.worker_alias
            believes.task_log.append(f"Trabajador encontrado: {msg.worker_alias}")


class PeasantWorkerContractFinishedGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, CommunityDynamicsMessage):
            return
        believes: PeasantFamilyBelieves = self.get_state()

        if msg.message_type == FromCommunityDynamicsMessageType.CONTRACT_FINISHED:
            believes.days_to_work_for_other = 0
            believes.peasant_family_helper = ""
            believes.task_log.append("Contrato finalizado")


class SocietyWorkerDateSyncGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if isinstance(msg, dict) and "current_date" in msg:
            believes: PeasantFamilyBelieves = self.get_state()
            if believes:
                believes.current_date = msg["current_date"]


class CrimeAlertGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, CommunityDynamicsMessage):
            return
        believes: PeasantFamilyBelieves = self.get_state()

        if msg.message_type == FromCommunityDynamicsMessageType.CRIME_ALERT:
            believes.money = max(0, believes.money - msg.money_lost)
            believes.harvested_weight = max(0, believes.harvested_weight - msg.harvest_lost)
            believes.total_harvested_weight = max(0, believes.total_harvested_weight - msg.harvest_lost)
            believes.secure = max(-1.0, believes.secure - 1.0)
            believes.robbery_account = getattr(believes, 'robbery_account', 0) + 1
            believes.task_log.append(
                f"¡Me robaron! Perdí ${msg.money_lost:.0f} y {msg.harvest_lost:.0f} kg de cosecha"
            )

        elif msg.message_type == FromCommunityDynamicsMessageType.CRIME_NEARBY:
            impact = msg.severity * (0.5 if msg.distance == 1 else 0.2)
            believes.secure = max(-1.0, believes.secure - impact)
            dist_label = "vecino" if msg.distance == 1 else "zona cercana"
            believes.task_log.append(
                f"Robaron a un {dist_label} (inseguridad +{impact:.2f})"
            )
