from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.agents.simulation_control_messages import ControlMessage


class AliveAgentGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        believes = self.get_state()
        if believes and hasattr(believes, "task_log"):
            believes.task_log.append("Agente registrado como ACTIVO en el sistema")


class DeadAgentGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        believes = self.get_state()
        if believes and hasattr(believes, "task_log"):
            believes.task_log.append("Iniciando proceso de finalización del agente")


class DeadContainerGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        believes = self.get_state()
        if believes and hasattr(believes, "task_log"):
            believes.task_log.append("Contenedor de simulación detenido")
