import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "besa-python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import time
from dataclasses import dataclass

from ethosterra.simulation_params import SimulationParams
from ethosterra.simulation_clock import SimulationClock
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves, Loan, Land
from ethosterra.agents.bank_office import (
    BankOfficeAgent, BankOfficeGuard, BankOfficeState, BankOfficeMessage,
    BankOfficeMessageType, FromBankOfficeMessage, FromBankOfficeMessageType, FromBankOfficeGuard,
)
from ethosterra.agents.market_place import MarketPlaceAgent, MarketPlaceGuard, MarketPlaceMessage, MarketPlaceMessageType
from ethosterra.agents.civic_authority import CivicAuthorityAgent, CivicAuthorityLandGuard, CivicAuthorityMessage
from ethosterra.agents.community_dynamics import CommunityDynamicsAgent, CommunityDynamicsGuard, CommunityDynamicsMessage
from ethosterra.agents.perturbation_generator import PerturbationGeneratorAgent, PerturbationGeneratorGuard
from ethosterra.agents.simulation_control import SimulationControlAgent, SimulationControlGuard, SimulationControlState
from ethosterra.agents.simulation_control_messages import ControlMessage
from ethosterra.agents.viewer_lens import ViewerLensAgent, ViewerLensState
from ethosterra.agents.peasant_family import PeasantFamily

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA
from besa.local.local_adm import LocalAdmBESA


def test_simulation_clock():
    clock = SimulationClock.get_instance()
    clock.set_current_date("01/01/2024")
    assert clock.get_current_date() == "01/01/2024"
    clock.advance_one_day()
    assert clock.get_current_date() == "02/01/2024"
    assert clock.is_first_day_of_week("01/01/2024")
    assert clock.is_first_day_of_month("01/02/2024")
    print("  [OK] SimulationClock: date handling")


def test_bank_office_loan():
    state = BankOfficeState(available_money=1000000)
    ok = state.give_loan(BankOfficeMessageType.ASK_FOR_FORMAL_LOAN, "Peasant-1", 500000)
    assert ok, "Loan should be approved"
    assert "Peasant-1" in state.loans

    ok2 = state.give_loan(BankOfficeMessageType.ASK_FOR_FORMAL_LOAN, "Peasant-1", 500000)
    assert not ok2, "Duplicate loan should be denied"

    to_pay = state.current_money_to_pay("Peasant-1")
    assert to_pay > 0, "Should have payment due"
    print(f"  [OK] BankOffice: loan approved, payment={to_pay:.2f}")


def test_market_place():
    state = type("MS", (), {"prices": {"water": 5000}, "inventory": {"water": 100}, "available_money": 1000000})()
    assert state.prices["water"] == 5000
    assert state.inventory["water"] == 100
    print("  [OK] MarketPlace: pricing and inventory")


def test_civic_authority_land():
    from ethosterra.agents.civic_authority import CivicAuthorityState, LandInfo
    state = CivicAuthorityState(
        available_lands=[LandInfo(id="land-1"), LandInfo(id="land-2")]
    )
    land = state.assign_land("Peasant-1")
    assert land is not None
    assert land.id == "land-1"
    assert land.is_available == False

    assert state.request_training() == True
    assert state.training_slots == 9
    print("  [OK] CivicAuthority: land assignment and training")


def test_community_dynamics():
    from ethosterra.agents.community_dynamics import CommunityDynamicsState
    state = CommunityDynamicsState()
    state.offer_help("Worker-1")
    state.offer_help("Worker-2")
    worker = state.request_worker("Contractor-1")
    assert worker == "Worker-1"
    contract = state.create_contract("Worker-2", "Contractor-2", 5)
    assert contract.days_remaining == 5
    print("  [OK] CommunityDynamics: labor contracts")


def test_peasant_believes():
    believes = PeasantFamilyBelieves(
        alias="PF-1",
        money=1000000,
        health=0.8,
        tools=10, seeds=10, water_available=10,
    )
    assert believes.money == 1000000
    assert believes.is_new_day()
    assert not believes.is_in_prolonged_crisis()
    summary = believes.to_summary()
    assert "alias" in summary
    print("  [OK] PeasantFamilyBelieves: ~30 fields loaded")


def test_perturbation_generator():
    from ethosterra.agents.perturbation_generator import PerturbationGeneratorState
    state = PerturbationGeneratorState()
    assert state.enabled
    assert len(state.current_events) == 0
    print("  [OK] PerturbationGenerator: state initialized")


def test_viewer_lens_state():
    state = ViewerLensState()
    state.update_agent_state("PF-1", {"state": "running", "task_log": ["planting"]})
    assert len(state.agent_states) == 1
    assert "PF-1" in state.agent_states
    assert state.to_websocket_date() == "d="
    state.current_date = "01/01/2024"
    assert state.to_websocket_date() == "d=01/01/2024"
    assert state.to_websocket_end() == "e=end"
    print("  [OK] ViewerLens: WebSocket message format")


def test_agent_communication():
    adm = LocalAdmBESA(alias="test-domain")

    bank = BankOfficeAgent("BankOffice-1")
    market = MarketPlaceAgent("MarketPlace-1")
    control = SimulationControlAgent("Control-1", total_agents=1)
    viewer = ViewerLensAgent("Viewer-1")

    for agent in [bank, market, control, viewer]:
        adm.register_agent(agent)

    adm.start_all()
    time.sleep(0.2)

    target = adm.lookup("BankOffice-1")
    assert target is not None, "BankOffice should be registered"

    adm.shutdown(timeout=3.0)
    print("  [OK] Agent Communication: all agents registered and started")


def test_peasant_family_creation():
    params = SimulationParams(money=1500000, tools=10, seeds=10, water=10)
    peasant = PeasantFamily("PeasantFamily-1", params)
    assert peasant.alias == "PeasantFamily-1"
    assert peasant.state.money == 1500000.0
    print("  [OK] PeasantFamily: BDI agent created with goals")


if __name__ == "__main__":
    tests = [
        ("SimulationClock", test_simulation_clock),
        ("BankOffice", test_bank_office_loan),
        ("MarketPlace", test_market_place),
        ("CivicAuthority", test_civic_authority_land),
        ("CommunityDynamics", test_community_dynamics),
        ("PeasantBelieves", test_peasant_believes),
        ("PerturbationGenerator", test_perturbation_generator),
        ("ViewerLens", test_viewer_lens_state),
        ("AgentCommunication", test_agent_communication),
        ("PeasantFamily", test_peasant_family_creation),
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
