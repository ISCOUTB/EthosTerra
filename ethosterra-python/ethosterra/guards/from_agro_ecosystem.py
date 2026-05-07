from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves
import ast
import math

_STAGE_MAP = {
    "CROP_INIT": "GROWING",
    "CROP_INFORMATION_NOTIFICATION": None,
    "CROP_IRRIGATION": "IRRIGATED",
    "CROP_PESTICIDE": "TREATED",
    "CROP_HARVEST": "HARVESTED",
    "NOTIFY_CROP_WATER_STRESS": None,
    "NOTIFY_CROP_DISEASE": None,
    "NOTIFY_CROP_READY_HARVEST": None,
}


def _find_land_by_stage(lands: list, stage: str):
    for i, land in enumerate(lands):
        if land.stage == stage:
            return i, land
    return None, None


def _extract_biomass(payload: str) -> float:
    try:
        data = ast.literal_eval(payload)
        if isinstance(data, dict):
            return float(data.get("biomass", 0))
    except (ValueError, SyntaxError, TypeError):
        pass
    return 0.0


class FromAgroEcosystemGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        from ethosterra.agents.agro_ecosystem import FromAgroEcosystemMessage, FromAgroEcosystemMessageType
        if not isinstance(msg, FromAgroEcosystemMessage):
            return
        believes: PeasantFamilyBelieves = self.get_state()

        mtype = msg.message_type

        if mtype == FromAgroEcosystemMessageType.NOTIFY_CROP_READY_HARVEST:
            _, land = _find_land_by_stage(believes.lands, "GROWING")
            if land:
                land.stage = "HARVEST_READY"
                believes.task_log.append("Cultivo listo para cosechar")
            return

        if mtype == FromAgroEcosystemMessageType.NOTIFY_CROP_WATER_STRESS:
            believes.task_log.append("Cultivo con estrés hídrico")
            return

        if mtype == FromAgroEcosystemMessageType.NOTIFY_CROP_DISEASE:
            believes.task_log.append("Cultivo con enfermedad detectada")
            return

        if mtype == FromAgroEcosystemMessageType.CROP_HARVEST:
            biomass = _extract_biomass(msg.payload)
            training = getattr(believes, 'training_level', 0.1)
            harvested = math.ceil(biomass * training) if biomass > 0 else 0

            _, land = _find_land_by_stage(believes.lands, "HARVEST_READY")
            if land:
                crop = land.crop_type
                believes.harvested_weight += float(harvested)
                believes.total_harvested_weight += float(harvested)
                believes.last_crop_type = crop
                land.stage = "FALLOW"
                land.crop_type = "land"
                believes.task_log.append(f"Cosecha completada: {harvested:.0f} de {crop}, tierra en barbecho")
            else:
                _, land = _find_land_by_stage(believes.lands, "GROWING")
                if land:
                    crop = land.crop_type
                    believes.harvested_weight += float(harvested)
                    believes.total_harvested_weight += float(harvested)
                    believes.last_crop_type = crop
                    land.stage = "FALLOW"
                    land.crop_type = "land"
                    believes.task_log.append(f"Cosecha forzada completada: {harvested:.0f} de {crop}")
            return

        new_stage = _STAGE_MAP.get(mtype.name if hasattr(mtype, 'name') else str(mtype))
        if new_stage and believes.lands:
            stage_targets = {
                "CROP_INIT": ("PLANTING",),
                "CROP_IRRIGATION": ("IRRIGATED", "GROWING"),
                "CROP_PESTICIDE": ("TREATED", "GROWING"),
            }
            current_stages = stage_targets.get(mtype.name if hasattr(mtype, 'name') else str(mtype), ())
            target_land = None
            for cs in current_stages:
                _, target_land = _find_land_by_stage(believes.lands, cs)
                if target_land:
                    break
            if target_land:
                target_land.stage = new_stage
                believes.task_log.append(f"Tierra actualizada: {new_stage}")
