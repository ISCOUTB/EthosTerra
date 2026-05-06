from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.agents.perturbation_generator import PerturbationEvent


class NaturalPhenomena(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if isinstance(msg, PerturbationEvent):
            from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves
            believes: PeasantFamilyBelieves = self.get_state()
            if not believes:
                return
            
            if msg.event_type == "drought":
                believes.water_available = max(0, believes.water_available - 5)
                believes.food_security = max(0.0, believes.food_security - 0.1 * msg.severity)
                believes.task_log.append(f"Fenómeno: Sequía (severidad {msg.severity:.2f})")
            elif msg.event_type == "flood":
                if believes.lands:
                    believes.lands[0].stage = "FALLOW"
                believes.tools = max(0, believes.tools - 1)
                believes.task_log.append(f"Fenómeno: Inundación (severidad {msg.severity:.2f})")
            elif msg.event_type == "plague":
                believes.crop_health = max(0.0, believes.crop_health - 0.2 * msg.severity)
                if believes.lands:
                    believes.lands[0].pest_pressure = min(1.0, believes.lands[0].pest_pressure + 0.3 * msg.severity)
                believes.task_log.append(f"Fenómeno: Plaga (severidad {msg.severity:.2f})")
