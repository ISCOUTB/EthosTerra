from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves


class FromCivicAuthorityGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        from ethosterra.agents.civic_authority import CivicAuthorityMessage, FromCivicAuthorityMessageType
        if not isinstance(msg, CivicAuthorityMessage):
            return
        believes: PeasantFamilyBelieves = self.get_state()

        if msg.message_type == FromCivicAuthorityMessageType.LAND_APPROVED:
            from ethosterra.believes.peasant_family_believes import Land
            land = Land(
                id=msg.land_id, area=msg.area, stage="NONE", crop_type="land",
                x=getattr(msg, 'x', 0.0), y=getattr(msg, 'y', 0.0),
                kind=getattr(msg, 'kind', 'land'),
                neighbors=getattr(msg, 'neighbors', []),
            )
            believes.lands.append(land)
            believes.farm_name = True
            believes.task_log.append(f"Recibí tierra {msg.land_id} ({msg.area} ha) - lista para preparar")

        if msg.message_type == FromCivicAuthorityMessageType.LAND_DENIED:
            believes.task_log.append("No hay tierras disponibles")


class FromCivicAuthorityTrainingGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        believes: PeasantFamilyBelieves = self.get_state()
        believes.training_available = True
