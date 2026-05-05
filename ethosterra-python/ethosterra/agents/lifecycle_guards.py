from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.agents.simulation_control_messages import ControlMessage


class AliveAgentGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if isinstance(msg, ControlMessage):
            pass


class DeadAgentGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        pass


class DeadContainerGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        pass
