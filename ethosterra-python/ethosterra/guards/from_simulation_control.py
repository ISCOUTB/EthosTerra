from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves
from ethosterra.agents.simulation_control_messages import ControlMessage


class FromSimulationControlGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, ControlMessage):
            return
        believes: PeasantFamilyBelieves = self.get_state()
        believes.wait = msg.wait
