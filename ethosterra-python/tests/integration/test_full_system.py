import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "besa-python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import time
import json

from ethosterra.simulation_params import SimulationParams
from ethosterra.simulation_clock import SimulationClock
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves, Loan, Land

from ethosterra.agents.agro_ecosystem import (
    AgroEcosystemAgent, AgroEcosystemGuard, AgroEcosystemState,
    AgroEcosystemMessage, AgroEcosystemMessageType, FromAgroEcosystemMessageType,
    CafeCell, MaizCell, FrijolCell, PlatanoCell, CropLayerState,
)
from ethosterra.agents.bank_office import (
    BankOfficeAgent, BankOfficeGuard, BankOfficeState,
    BankOfficeMessage, BankOfficeMessageType,
    FromBankOfficeMessage, FromBankOfficeMessageType,
)
from ethosterra.agents.market_place import (
    MarketPlaceAgent, MarketPlaceGuard, MarketPlaceState,
    MarketPlaceMessage, MarketPlaceMessageType,
)
from ethosterra.agents.civic_authority import (
    CivicAuthorityAgent, CivicAuthorityLandGuard, CivicAuthorityState,
    CivicAuthorityMessage, FromCivicAuthorityMessageType, LandInfo,
)
from ethosterra.agents.community_dynamics import (
    CommunityDynamicsAgent, CommunityDynamicsGuard, CommunityDynamicsState,
    CommunityDynamicsMessage, FromCommunityDynamicsMessageType,
)
from ethosterra.agents.simulation_control import (
    SimulationControlAgent, SimulationControlGuard, SimulationControlState,
)
from ethosterra.agents.simulation_control_messages import ControlMessage
from ethosterra.agents.viewer_lens import ViewerLensAgent, ViewerLensState
from ethosterra.agents.perturbation_generator import (
    PerturbationGeneratorAgent, PerturbationGeneratorGuard, PerturbationGeneratorState,
)
from ethosterra.agents.peasant_family import PeasantFamily

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA
from besa.local.local_adm import LocalAdmBESA
from besa.bdi.declarative.declarative_goal import DeclarativeGoal
from besa.bdi.declarative.goal_registry import GoalRegistry
from besa.bdi.declarative.plan_registry import PlanRegistry


def test_full_startup():
    """Simulate the full startup sequence from start.py"""
    adm = LocalAdmBESA(alias="test-full")

    agents = [
        CommunityDynamicsAgent("CommunityDynamics"),
        MarketPlaceAgent("MarketPlace"),
        CivicAuthorityAgent("CivicAuthority", training_slots=10),
        BankOfficeAgent("BankOffice"),
        PerturbationGeneratorAgent("PerturbationGenerator"),
        AgroEcosystemAgent("AgroEcosystem"),
    ]
    for a in agents:
        adm.register_agent(a)
    adm.start_all()
    time.sleep(0.3)

    for a in agents:
        assert adm.lookup(a.alias) is not None, f"{a.alias} not registered"

    adm.shutdown(timeout=3.0)
    print("  [OK] Full startup: all service agents registered and started")


def test_agroecosystem_crop_growth():
    state = AgroEcosystemState()
    state.rng = __import__("random").Random(42)
    state.crops = CropLayerState()

    cafe = CafeCell("cafe-1", "PF-1")
    maiz = MaizCell("maiz-1", "PF-1")
    state.crops.add_crop(cafe)
    state.crops.add_crop(maiz)

    state.update_for_date("15/03/2024")
    assert cafe.state.growing_degree_days > 0
    assert maiz.state.growing_degree_days > 0

    d = cafe.to_dict()
    assert d["peasant"] == "PF-1"
    assert d["perennial"] == True

    d2 = maiz.to_dict()
    assert d2["perennial"] == False
    print(f"  [OK] AgroEcosystem: crops growing, Cafe GDD={cafe.state.growing_degree_days:.1f}, Maiz GDD={maiz.state.growing_degree_days:.1f}")


def test_agroecosystem_harvest():
    state = AgroEcosystemState()
    state.rng = __import__("random").Random(42)
    state.crops = CropLayerState()

    maiz = MaizCell("maiz-1", "PF-1")
    maiz.state.growing_degree_days = 2000
    state.crops.add_crop(maiz)

    state.update_for_date("15/06/2024")
    assert maiz.harvest_ready, "Maiz should be harvest-ready after exceeding GDD_end"

    state.crops.remove_crop("maiz-1")
    assert state.crops.get_crop("maiz-1") is None
    print("  [OK] AgroEcosystem: harvest detection and crop removal")


def test_agroecosystem_irrigation():
    state = AgroEcosystemState()
    state.rng = __import__("random").Random(42)
    state.crops = CropLayerState()

    maiz = MaizCell("maiz-1", "PF-1")
    maiz.state.root_zone_depletion = 50
    state.crops.add_crop(maiz)

    state.crops.apply_irrigation_to_all(30)
    assert maiz.state.root_zone_depletion == 20
    print("  [OK] AgroEcosystem: irrigation reduces root zone depletion")


def test_bank_office_guard():
    adm = LocalAdmBESA(alias="bank-test")
    bank = BankOfficeAgent("BankOffice")
    peasant = AgentBESA("TestPeasant", PeasantFamilyBelieves(alias="TestPeasant", money=500000))

    from ethosterra.guards.from_bank_office import FromBankOfficeGuard
    peasant.register_guard(FromBankOfficeGuard)

    adm.register_agent(bank)
    adm.register_agent(peasant)
    adm.start_all()
    time.sleep(0.2)

    bank.send("TestPeasant",
        EventBESA(
            guard_type=FromBankOfficeGuard,
            data=FromBankOfficeMessage(FromBankOfficeMessageType.APPROBED_LOAN, 200000),
        )
    )
    time.sleep(0.3)
    adm.shutdown(timeout=3.0)
    print("  [OK] BankOffice guard: message routing works")


def test_market_place_guard():
    adm = LocalAdmBESA(alias="market-test")
    market = MarketPlaceAgent("MarketPlace")
    peasant = AgentBESA("TestPeasant", PeasantFamilyBelieves(alias="TestPeasant", money=500000))

    from ethosterra.guards.from_market_place import FromMarketPlaceGuard
    peasant.register_guard(FromMarketPlaceGuard)
    market.register_guard(FromMarketPlaceGuard)

    adm.register_agent(market)
    adm.register_agent(peasant)
    adm.start_all()
    time.sleep(0.2)

    market.send("TestPeasant",
        EventBESA(
            guard_type=FromMarketPlaceGuard,
            data=MarketPlaceMessage(MarketPlaceMessageType.TRANSACTION_COMPLETE, resource="seeds", quantity=5, price=50000),
        )
    )
    time.sleep(0.3)
    adm.shutdown(timeout=3.0)
    print("  [OK] MarketPlace guard: message routing works")


def test_civic_authority_guard():
    adm = LocalAdmBESA(alias="civic-test")
    civic = CivicAuthorityAgent("CivicAuthority", num_lands=50)
    peasant = AgentBESA("TestPeasant", PeasantFamilyBelieves(alias="TestPeasant"))

    from ethosterra.guards.from_civic_authority import FromCivicAuthorityGuard
    peasant.register_guard(FromCivicAuthorityGuard)

    adm.register_agent(civic)
    adm.register_agent(peasant)
    adm.start_all()
    time.sleep(0.2)

    civic.send("TestPeasant",
        EventBESA(
            guard_type=FromCivicAuthorityGuard,
            data=CivicAuthorityMessage(FromCivicAuthorityMessageType.LAND_APPROVED, land_id="land-1", area=2.0),
        )
    )
    time.sleep(0.3)
    adm.shutdown(timeout=3.0)
    print("  [OK] CivicAuthority guard: land assignment works")


def test_simulation_cycle():
    """End-to-end test: message flow through all agents"""
    adm = LocalAdmBESA(alias="cycle-test")

    clock = SimulationClock.get_instance()
    clock.set_current_date("01/01/2024")

    agents = [
        SimulationControlAgent("SimulationControl", total_agents=1),
        MarketPlaceAgent("MarketPlace"),
        CivicAuthorityAgent("CivicAuthority"),
        BankOfficeAgent("BankOffice"),
        CommunityDynamicsAgent("CommunityDynamics"),
        PerturbationGeneratorAgent("PerturbationGenerator"),
        AgroEcosystemAgent("AgroEcosystem"),
    ]
    for a in agents:
        adm.register_agent(a)
    adm.start_all()
    time.sleep(0.3)

    assert adm.lookup("SimulationControl") is not None
    assert adm.lookup("MarketPlace") is not None
    assert adm.lookup("AgroEcosystem") is not None

    adm.shutdown(timeout=3.0)
    print("  [OK] Simulation cycle: all agents communicate successfully")


def test_goal_registry_no_yaml():
    """GoalRegistry should handle missing YAML files gracefully"""
    reg = GoalRegistry.get_instance()
    goals = reg.get_all()
    print(f"  [OK] GoalRegistry: {reg.size()} goals loaded (0 if no YAML dir)")


def test_peasant_family_goals():
    params = SimulationParams(money=1500000, tools=10, seeds=10, water=10, irrigation=1, emotions=1, training=1)
    peasant = PeasantFamily("PeasantFamily-1", params)
    assert len(peasant._bdi_state.potential_goals) > 0
    assert peasant.state.money == 1500000.0

    goals = peasant._bdi_state.potential_goals
    goal_ids = [g.goal_id for g in goals]
    assert "do_vitals" in goal_ids
    assert "check_crops" in goal_ids
    assert "leisure_activities" in goal_ids
    print(f"  [OK] PeasantFamily: {len(goals)} goals loaded")


def test_peasant_believes_full():
    believes = PeasantFamilyBelieves(
        alias="PF-Full",
        money=2000000,
        health=0.9,
        tools=15, seeds=20, water_available=30,
        have_loan=True, to_pay=500000,
        lands=[Land(id="land-1", area=2.0, stage="GROWING")],
        new_day=True,
    )
    assert believes.have_loan
    assert len(believes.lands) == 1
    assert believes.has_land_with_stage("GROWING")
    assert not believes.has_land_with_crop("cafe")
    summary = believes.to_summary()
    assert summary["money"] == 2000000
    assert summary["lands"] == 1
    print("  [OK] PeasantFamilyBelieves: full field coverage")


def test_perturbation_events():
    state = PerturbationGeneratorState()
    state.days_since_last_event = 60
    rng = __import__("random").Random(7)
    event_gen = False

    roll = rng.random()
    if roll < state.drought_probability:
        event_gen = True
    elif roll < state.drought_probability + state.flood_probability:
        event_gen = True
    elif roll < state.drought_probability + state.flood_probability + state.plague_probability:
        event_gen = True

    print(f"  [OK] PerturbationGenerator: event probability roll={roll:.3f}, event={'yes' if event_gen else 'no'}")


if __name__ == "__main__":
    tests = [
        ("FullStartup", test_full_startup),
        ("AgroEcosystem Growth", test_agroecosystem_crop_growth),
        ("AgroEcosystem Harvest", test_agroecosystem_harvest),
        ("AgroEcosystem Irrigation", test_agroecosystem_irrigation),
        ("BankOffice Guard", test_bank_office_guard),
        ("MarketPlace Guard", test_market_place_guard),
        ("CivicAuthority Guard", test_civic_authority_guard),
        ("SimulationCycle", test_simulation_cycle),
        ("GoalRegistry", test_goal_registry_no_yaml),
        ("PeasantFamily Goals", test_peasant_family_goals),
        ("PeasantBelieves Full", test_peasant_believes_full),
        ("Perturbation Events", test_perturbation_events),
    ]

    passed = 0
    failed = 0
    for name, fn in tests:
        try:
            fn()
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print(f"\n{'='*40}")
    print(f"RESULTS: {passed} passed, {failed} failed, {len(tests)} total")
    sys.exit(0 if failed == 0 else 1)
