from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves

_STAGE_MAP = {
    "CROP_INIT": "GROWING",
    "CROP_INFORMATION_NOTIFICATION": None,
    "CROP_IRRIGATION": "IRRIGATED",
    "CROP_PESTICIDE": "TREATED",
    "CROP_HARVEST": "HARVESTED",
    "NOTIFY_CROP_WATER_STRESS": "STRESS",
    "NOTIFY_CROP_DISEASE": "DISEASED",
    "NOTIFY_CROP_READY_HARVEST": "HARVEST_READY",
}


class FromAgroEcosystemGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        from ethosterra.agents.agro_ecosystem import FromAgroEcosystemMessage, FromAgroEcosystemMessageType
        if not isinstance(msg, FromAgroEcosystemMessage):
            return
        believes: PeasantFamilyBelieves = self.get_state()

        new_stage = _STAGE_MAP.get(msg.message_type.name if hasattr(msg.message_type, 'name') else str(msg.message_type))
        if new_stage and believes.lands:
            believes.lands[0].stage = new_stage
            believes.task_log.append(f"Tierra actualizada: {new_stage}")

        if msg.message_type == FromAgroEcosystemMessageType.NOTIFY_CROP_READY_HARVEST:
            if believes.lands:
                believes.lands[0].stage = "HARVEST_READY"
                believes.task_log.append("Cultivo listo para cosechar")

        if msg.message_type == FromAgroEcosystemMessageType.NOTIFY_CROP_WATER_STRESS:
            if believes.lands:
                believes.lands[0].stage = "STRESS"
                believes.task_log.append("Cultivo con estrés hídrico")

        if msg.message_type == FromAgroEcosystemMessageType.NOTIFY_CROP_DISEASE:
            if believes.lands:
                believes.lands[0].stage = "DISEASED"
                believes.task_log.append("Cultivo con enfermedad detectada")

        if msg.message_type == FromAgroEcosystemMessageType.CROP_HARVEST:
            believes.harvested_weight += 100.0
            if believes.lands:
                believes.lands[0].stage = "FALLOW"
                believes.task_log.append("Cosecha completada, tierra en barbecho")
