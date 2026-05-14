#!/usr/bin/env python3
"""Minimal treatment runner - runs a single simulation treatment and exits.
   No HTTP/WS servers, no wait mode. Used by experiment runner."""
import sys, os, time, csv

_script_dir = os.path.dirname(os.path.abspath(__file__))
ROOT = os.environ.get("ETHOSTERRA_ROOT") or os.path.dirname(os.path.dirname(_script_dir))
sys.path.insert(0, os.path.join(ROOT, "besa-python"))
sys.path.insert(0, os.path.join(ROOT, "ethosterra-python"))
os.environ.setdefault("ETHOSTERRA_ROOT", ROOT)
os.environ.setdefault("ETHOSTERRA_STEPTIME", "1")

def main():
    agents = int(os.environ.get("EXP_AGENTS", "5"))
    years = int(os.environ.get("EXP_YEARS", "5"))
    money = int(os.environ.get("EXP_MONEY", "750000"))
    land = int(os.environ.get("EXP_LAND", "2"))
    emotions = int(os.environ.get("EXP_EMOTIONS", "1"))
    csv_path = os.environ.get("EXP_CSV", "/tmp/treatment.csv")

    from besa.local.local_adm import LocalAdmBESA
    from besa.bdi.declarative.goal_registry import GoalRegistry
    from besa.bdi.declarative.plan_registry import PlanRegistry
    from ethosterra.simulation_clock import SimulationClock
    from ethosterra.simulation_params import SimulationParams
    from ethosterra.agents.peasant_family import PeasantFamily
    from ethosterra.agents.simulation_control import SimulationControlAgent
    from ethosterra.agents.civic_authority import CivicAuthorityAgent
    from ethosterra.agents.agro_ecosystem import AgroEcosystemAgent
    from ethosterra.agents.bank_office import BankOfficeAgent
    from ethosterra.agents.market_place import MarketPlaceAgent
    from ethosterra.agents.community_dynamics import CommunityDynamicsAgent
    from ethosterra.agents.perturbation_generator import PerturbationGeneratorAgent
    from ethosterra.guards.heart_beat import init_csv_writer

    GoalRegistry.get_instance()
    PlanRegistry.get_instance()
    SimulationClock.get_instance().set_current_date("01/01/2024")
    init_csv_writer(csv_path)

    mode = os.environ.get("EXP_TID", "UNK")
    adm = LocalAdmBESA(alias=mode)

    services = [
        CommunityDynamicsAgent("CommunityDynamics"),
        MarketPlaceAgent("MarketPlace"),
        CivicAuthorityAgent("CivicAuthority", num_lands=400, training_slots=10),
        BankOfficeAgent("BankOffice"),
        PerturbationGeneratorAgent("PerturbationGenerator"),
        AgroEcosystemAgent("AgroEcosystem"),
    ]
    for svc in services:
        adm.register_agent(svc)
        svc.start()

    control = SimulationControlAgent(f"{mode}_SimulationControl", total_agents=agents, years=years)
    adm.register_agent(control)
    control.start()

    peasants = []
    for i in range(agents):
        p = SimulationParams()
        p.money = money; p.land = land; p.variance = 0.4
        p.tools = 20; p.seeds = 50; p.water = 10
        p.emotions = emotions; p.training = 1; p.irrigation = 1; p.personality = 0.0
        peasant = PeasantFamily(f"{mode}PeasantFamily{i + 1}", p)
        adm.register_agent(peasant)
        peasant.start()
        peasant.start_periodic()
        peasants.append(peasant)

    target = years * 365
    deadline = time.time() + 300
    while True:
        time.sleep(0.5)
        if all(getattr(p.state, "current_day", 0) >= target for p in peasants):
            break
        if time.time() > deadline:
            break

    results = {}
    for p in peasants:
        b = p.state
        results[p.alias] = {
            "harvested": b.total_harvested_weight,
            "health": b.health,
        }

    adm.shutdown(timeout=2)

    total = sum(d["harvested"] for d in results.values())
    avg_h = sum(d["health"] for d in results.values()) / max(len(results), 1)
    if avg_h <= 1.0:
        avg_h *= 100.0

    print(f"TREATMENT_RESULT: cultivado={total:.2f} salud={avg_h:.2f}")
    sys.exit(0)

if __name__ == "__main__":
    main()
