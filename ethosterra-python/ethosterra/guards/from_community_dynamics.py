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
                # b.task_log.append(f"Fecha sincronizada: {msg['current_date']}")
