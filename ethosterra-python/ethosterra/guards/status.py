from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA


class StatusGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves
        believes: PeasantFamilyBelieves = self.get_state()
        if believes and hasattr(event, 'sender') and event.sender:
            summary = believes.to_summary()
            self._agent.send(event.sender, EventBESA(guard_type=StatusGuard, data=summary))
