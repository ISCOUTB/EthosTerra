from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves
from ethosterra.agents.civic_authority import CivicAuthorityMessage


class CivicAuthorityHelpGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, CivicAuthorityMessage):
            return
        believes: PeasantFamilyBelieves = self.get_state()
        if msg.message_type == "HELP_REQUEST":
            believes.money += 50000
            believes.task_log.append("Recibí ayuda de la autoridad civil")


class CivicAuthorityReleaseLandGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if isinstance(msg, CivicAuthorityMessage) and msg.message_type == "RELEASE_LAND":
            believes: PeasantFamilyBelieves = self.get_state()
            believes.lands = [l for l in believes.lands if l.id != msg.land_id]


class TrainingOfferGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if isinstance(msg, CivicAuthorityMessage) and msg.message_type == "TRAINING_OFFERED":
            believes: PeasantFamilyBelieves = self.get_state()
            believes.training_available = True
            believes.task_log.append("Oferta de capacitación disponible")
