from __future__ import annotations

import csv
import os
import time
import threading
from datetime import datetime, timedelta
from pathlib import Path

from besa.local.local_adm import LocalAdmBESA
from besa.kernel.event import EventBESA
from ethosterra.agents.peasant_family import PeasantFamily
from ethosterra.agents.simulation_control import SimulationControlGuard
from ethosterra.agents.viewer_lens import ViewerLensGuard
from ethosterra.agents.simulation_control_messages import ControlMessage
from ethosterra.simulation_clock import SimulationClock


CSV_COLUMNS = [
    "date", "agent", "money", "health", "happiness", "emotion",
    "current_goal", "harvested_weight", "lands_count", "loans_active",
    "days_in_crisis", "social_capital", "food_security", "task_log",
]


class SimulationRunner(threading.Thread):
    def __init__(
        self,
        adm: LocalAdmBESA,
        years: int,
        agents_count: int,
        tick_seconds: float = 0.01,
        csv_path: str | None = None,
    ):
        super().__init__(name="SimulationRunner", daemon=True)
        self.adm = adm
        self.years = years
        self.agents_count = agents_count
        self.tick_seconds = tick_seconds
        self._running = False
        self._csv_path = csv_path
        self._csv_file = None
        self._csv_writer = None

    def _init_csv(self) -> None:
        if self._csv_path:
            path = Path(self._csv_path)
            path.parent.mkdir(parents=True, exist_ok=True)
            self._csv_file = open(path, "w", newline="")
            self._csv_writer = csv.DictWriter(self._csv_file, fieldnames=CSV_COLUMNS)
            self._csv_writer.writeheader()

    def _write_csv(self, peasant: PeasantFamily) -> None:
        if not self._csv_writer:
            return
        b = peasant.state
        self._csv_writer.writerow({
            "date": b.current_date,
            "agent": b.alias,
            "money": str(int(b.money)),
            "health": f"{b.health:.2f}",
            "happiness": f"{b.happiness:.2f}",
            "emotion": b.emotion,
            "current_goal": b.current_goal or "",
            "harvested_weight": f"{b.harvested_weight:.2f}",
            "lands_count": str(len(b.lands)),
            "loans_active": "1" if b.have_loan else "0",
            "days_in_crisis": str(b.days_in_crisis),
            "social_capital": f"{b.social_capital:.2f}",
            "food_security": f"{b.food_security:.2f}",
            "task_log": ";".join(b.task_log[-10:]),
        })
        self._csv_file.flush()

    def run(self) -> None:
        self._running = True
        self._init_csv()
        clock = SimulationClock.get_instance()
        start = datetime.strptime("01/01/2024", "%d/%m/%Y")
        end = start.replace(year=start.year + self.years)
        total_days = (end - start).days

        all_agents = self.adm.get_agents()
        peasants = [a for a in all_agents if isinstance(a, PeasantFamily)]
        agro = next((a for a in all_agents if hasattr(a, 'rng') and 'AgroEcosystem' in a.alias), None)
        viewer = next((a for a in all_agents if 'ViewerLens' in a.alias), None)

        while self._running:
            current = clock.current_date
            elapsed = (current - start).days
            if elapsed >= total_days:
                print(f"Simulation finished after {elapsed} days")
                if viewer:
                    viewer.send_to(EventBESA(guard_type=ViewerLensGuard, data={"end": True}))
                break

            if viewer and elapsed % 7 == 0:
                import json as _json
                viewer.send_to(EventBESA(guard_type=ViewerLensGuard, data={"current_date": current, "active_agents": len(peasants)}))

            if agro and hasattr(agro.state, 'update_for_date'):
                agro.state.update_for_date(clock.get_current_date())

            for p in peasants:
                b = p.state
                if not b:
                    continue

                b.new_day = True
                b.current_date = clock.get_current_date()
                b.current_day = elapsed + 1
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

                if b.lands and agro:
                    stage = b.lands[0].stage
                    crop_id = f"{b.alias}_crop"

                    if stage == "NONE":
                        from ethosterra.agents.agro_ecosystem import MaizCell
                        if not agro.state.crops.get_crop(crop_id):
                            agro.state.crops.add_crop(MaizCell(crop_id, b.alias))
                        b.lands[0].stage = "GROWING"
                        b.task_log.append("Iniciando cultivo de maíz (FAO-56)")

                    elif stage == "GROWING":
                        cell = agro.state.crops.get_crop(crop_id)
                        if cell:
                            if cell.harvest_ready:
                                b.lands[0].stage = "HARVEST_READY"
                                b.task_log.append("Cultivo listo para cosechar (GDD completo)")
                            elif cell.state.water_stress and b.current_day % 3 == 0:
                                agro.state.crops.apply_irrigation_to_all(10.0)
                                b.task_log.append("Aplicando riego al cultivo")
                            elif cell.infected and b.current_day % 3 == 0:
                                b.lands[0].stage = "DISEASED"
                                b.task_log.append("Aplicando pesticida al cultivo")
                                cell.infected = False
                                b.lands[0].stage = "GROWING"

                    elif stage == "HARVEST_READY" and b.current_day % 2 == 0:
                        cell = agro.state.crops.get_crop(crop_id)
                        if cell:
                            harvest = cell.state.above_ground_biomass * 0.4
                            b.harvested_weight += harvest
                            income = harvest * 3000
                            b.money += income
                            b.task_log.append(f"Coseché {harvest:.0f} kg (biomasa: {cell.state.above_ground_biomass:.0f}), gané ${income:.0f}")
                            if cell.is_perennial():
                                cell.reset_harvest_cycle()
                                b.lands[0].stage = "GROWING"
                            else:
                                agro.state.crops.remove_crop(crop_id)
                                b.lands[0].stage = "FALLOW"

                    elif stage == "FALLOW" and b.current_day % 7 == 0:
                        b.lands[0].stage = "NONE"

                p.tick_bdi()

                if viewer and elapsed % 2 == 0:
                    import json as _json
                    b_data = {
                        'agent_name': b.alias,
                        'state': _json.dumps(b.to_summary()),
                        'task_log': b.task_log[-5:],
                    }
                    viewer.send_to(EventBESA(guard_type=ViewerLensGuard, data=b_data))

                b.money = max(0.0, b.money)

                if clock.is_first_day_of_week(clock.get_current_date()):
                    self._send_control_ping(p)
                    self._write_csv(p)

            clock.advance_one_day()

            if clock.is_first_day_of_week(clock.get_current_date()):
                progress = (elapsed / total_days) * 100
                print(f"UPDATE: {clock.get_current_date()} — {progress:.1f}%")

            time.sleep(self.tick_seconds)

        print(f"Simulation ended at {clock.get_current_date()}")
        if self._csv_file:
            self._csv_file.close()
        self._running = False

    def _send_control_ping(self, peasant: PeasantFamily) -> None:
        b = peasant.state
        control_name = f"{peasant.alias.rsplit('PeasantFamily', 1)[0]}SimulationControl"
        control = self.adm.lookup(control_name)
        if control:
            control.send_to(
                EventBESA(
                    guard_type=SimulationControlGuard,
                    data=ControlMessage(
                        peasant_family_alias=peasant.alias,
                        current_date=b.current_date,
                        current_day=b.current_day,
                    ),
                )
            )

    def stop(self) -> None:
        self._running = False

