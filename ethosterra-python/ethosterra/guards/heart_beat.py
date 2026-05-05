from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves
from ethosterra.simulation_clock import SimulationClock


class HeartBeatGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        pass
