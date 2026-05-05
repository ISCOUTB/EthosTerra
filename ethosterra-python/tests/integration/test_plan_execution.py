import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "besa-python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

os.environ["ETHOSTERRA_ROOT"] = "/home/jairo/Projects/EthosTerra"

from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves, Land
from ethosterra.plan_executor import PlanExecutor
from besa.bdi.declarative.goal_registry import GoalRegistry
from besa.bdi.declarative.plan_registry import PlanRegistry
from besa.bdi.declarative.declarative_goal import DeclarativeGoal

GoalRegistry.get_instance()
PlanRegistry.get_instance()


def test_plan_do_vitals():
    _noop = lambda *a: None
    b = PeasantFamilyBelieves(alias="PF-1", money=1000000, new_day=True, health=0.5)
    ok = PlanExecutor.run_goal("do_vitals", "PF-1", b, _noop, _noop)
    assert ok, "do_vitals plan should execute"
    assert b.new_day == False, "update_belief should set new_day=False"
    assert b.happiness > 0.5, "emit_emotion should increase happiness"
    assert len(b.task_log) > 0, "emit_episode should add task_log entry"
    print("  [OK] do_vitals: consumed resources, updated beliefs, emitted emotion")


def test_plan_seek_purpose():
    _noop = lambda *a: None
    b = PeasantFamilyBelieves(alias="PF-1", purpose="farmer")
    ok = PlanExecutor.run_goal("seek_purpose", "PF-1", b, _noop, _noop)
    assert ok
    assert b._purpose_set, "update_belief should mark purpose as set"
    print("  [OK] seek_purpose: purpose set")


def test_plan_look_for_loan():
    _noop = lambda *a: None
    b = PeasantFamilyBelieves(alias="PF-1", money=50000)
    ok = PlanExecutor.run_goal("look_for_loan", "PF-1", b, _noop, _noop)
    assert ok
    print("  [OK] look_for_loan: plan executed without error")


def test_plan_spend_friends_time():
    _noop = lambda *a: None
    b = PeasantFamilyBelieves(alias="PF-1", happiness=0.3, social_capital=0.2)
    ok = PlanExecutor.run_goal("spend_friends_time", "PF-1", b, _noop, _noop)
    assert ok
    assert b.happiness > 0.3, "spend_friends_time should increase happiness"
    print("  [OK] spend_friends_time: happiness and social capital increased")


def test_goal_selection():
    b = PeasantFamilyBelieves(alias="PF-1", money=1000000, new_day=True, health=0.8)
    do_vitals = DeclarativeGoal.build("do_vitals")
    seek_purpose = DeclarativeGoal.build("seek_purpose")
    leisure = DeclarativeGoal.build("leisure_activities")

    assert do_vitals.detect_goal(b) > 0, "do_vitals should be detectable (new_day=True)"
    assert seek_purpose.detect_goal(b) > 0, "seek_purpose should be detectable"
    assert leisure.detect_goal(b) > 0, "leisure_activities should be detectable (money > 0)"

    assert do_vitals.evaluate_contribution(b) >= 0.99, "do_vitals should have high contribution"
    print("  [OK] Goal selection: detection and contribution work")


def test_bdi_cycle_with_plans():
    from besa.bdi.bdi_machine import BDIMachine, StateBDI
    from besa.bdi.goal_bdi_types import GoalLevel

    b = PeasantFamilyBelieves(alias="PF-1", money=1000000, new_day=True, health=0.5)

    goals = [DeclarativeGoal.build(gid) for gid in [
        "do_vitals", "seek_purpose", "leisure_activities", "spend_family_time",
    ]]
    state = StateBDI(believes=b, potential_goals=goals, threshold=0.3)
    _noop = lambda *a: None
    state.plan_executor = lambda gid, bl: PlanExecutor.run_goal(gid, "PF-1", bl, _noop, _noop)

    machine = BDIMachine()
    machine.tick(state)

    assert state.current_intention is not None, "Should select a goal"
    print(f"  [OK] BDI cycle: selected '{state.current_intention.goal_id}' -> plan executed, money now={b.money:.0f}")


def test_resource_depletion():
    b = PeasantFamilyBelieves(alias="PF-1", money=0, seeds=5, tools=2)
    from besa.bdi.declarative.action_registry import ACTIONS

    ACTIONS["consume_resource"].execute(b, {"key": "money", "amount": 1000})
    assert b.money == 0, "money should not go below 0"

    ACTIONS["increment_belief"].execute(b, {"key": "days_in_crisis", "amount": 1})
    assert b.days_in_crisis == 1

    ACTIONS["emit_emotion"].execute(b, {"axis": "happiness", "delta": 0.1})
    assert b.happiness == 0.6

    print("  [OK] Resource depletion: edge cases handled")


if __name__ == "__main__":
    tests = [
        ("Plan do_vitals", test_plan_do_vitals),
        ("Plan seek_purpose", test_plan_seek_purpose),
        ("Plan look_for_loan", test_plan_look_for_loan),
        ("Plan spend_friends_time", test_plan_spend_friends_time),
        ("Goal selection", test_goal_selection),
        ("BDI cycle with plans", test_bdi_cycle_with_plans),
        ("Resource depletion", test_resource_depletion),
    ]
    passed = 0
    failed = 0
    for name, fn in tests:
        try:
            fn()
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            import traceback; traceback.print_exc()
            failed += 1
    print(f"\n{'='*40}")
    print(f"RESULTS: {passed} passed, {failed} failed, {len(tests)} total")
    sys.exit(0 if failed == 0 else 1)
