from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.agents.perturbation_generator import PerturbationEvent


class NaturalPhenomena(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if isinstance(msg, PerturbationEvent):
            pass
