from dataclasses import dataclass
from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.adm import AdmBESA
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves


@dataclass
class HeartBeatData:
    current_date: str
    current_day: int
    elapsed: int


class HeartBeatGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        if not isinstance(event.data, HeartBeatData):
            return

        data: HeartBeatData = event.data
        agent = self._agent
        b: PeasantFamilyBelieves = self.get_state()

        b.new_day = True
        b.current_date = data.current_date
        b.current_day = data.current_day
        b.time_left_on_day = 1440.0

        daily_cost = 5000 + int(b.food_security * 3000)
        b.money = max(0.0, b.money - daily_cost)
        b.food_security = max(0, b.food_security - 0.005)
        b.happiness = max(0, b.happiness - 0.003)
        if b.food_security < 0.3 or b.money < b.minimum_vital:
            b.health = max(0, b.health - 0.002)
            b.days_in_crisis += 1
        elif b.food_security > 0.7 and b.money > b.minimum_vital * 2:
            b.health = min(1, b.health + 0.001)
            b.days_in_crisis = max(0, b.days_in_crisis - 1)

        if b.money <= 0 and b.seeds > 0:
            b.money += b.seeds * 2000
            b.seeds = 0
            b.task_log.append("Vendí semillas para sobrevivir")

        if b.money <= 0 and b.tools > 0:
            b.money += b.tools * 5000
            b.tools = 0
            b.task_log.append("Vendí herramientas para sobrevivir")

        # Lógica de agricultura delegada a las intenciones BDI (AgroEcosystemAction)

        # Ejecución sincrónica BDI dentro del propio hilo del agente
        if hasattr(agent, 'tick_bdi'):
            agent.tick_bdi()

        b.money = max(0.0, b.money)
