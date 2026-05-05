import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import time
from dataclasses import dataclass, field
from typing import Any

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA
from besa.kernel.rng import AgentRNG
from besa.local.local_adm import LocalAdmBESA

from besa.rational.believes import BelievesBase
from besa.rational.task import Task
from besa.rational.plan import Plan
from besa.rational.rational_role import RationalRole
from besa.rational.rational_agent import RationalAgent

from besa.bdi.goal_bdi import GoalBDI
from besa.bdi.goal_bdi_types import GoalLevel
from besa.bdi.desire_pyramid import DesireHierarchyPyramid
from besa.bdi.bdi_machine import BDIMachine, StateBDI
from besa.bdi.agent_bdi import AgentBDI

from besa.ebdi.emotional_event import EmotionalEvent, EmotionalState
from besa.ebdi.emotional_model import EmotionalModel
from besa.ebdi.semantic_dictionary import SemanticDictionary


class TestEmitEpisodeTask(Task):
    def __init__(self):
        super().__init__(name="test_emit_episode")

    def execute(self, believes, **kwargs):
        return True


class TestGuard(GuardBESA):
    def func_exec_guard(self, event):
        state = self.get_state()
        if hasattr(state, "triggered"):
            state.triggered.append(event.data)


@dataclass
class TestState:
    value: int = 0
    triggered: list = field(default_factory=list)


class TestSurvivalGoal(GoalBDI):
    def __init__(self):
        super().__init__(goal_id="test_survival")
        self.priority = 1.0

    def detect_goal(self, believes):
        return 1.0 if getattr(believes, "value", 0) < 50 else 0.0

    def evaluate_viability(self, believes):
        return 1.0

    def evaluate_plausibility(self, believes):
        return 1.0

    def evaluate_contribution(self, state):
        return 0.9

    def goal_succeeded(self, believes):
        return getattr(believes, "value", 0) >= 50


class TestLeisureGoal(GoalBDI):
    def __init__(self):
        super().__init__(goal_id="test_leisure")
        self.priority = 0.3

    def detect_goal(self, believes):
        return 1.0 if getattr(believes, "value", 0) >= 50 else 0.0

    def evaluate_viability(self, believes):
        return 1.0

    def evaluate_plausibility(self, believes):
        return 1.0

    def evaluate_contribution(self, state):
        return 0.3

    def goal_succeeded(self, believes):
        return True


def test_agent_rng():
    rng1 = AgentRNG.for_agent("agent-a", root_seed=42)
    rng2 = AgentRNG.for_agent("agent-b", root_seed=42)
    rng1_copy = AgentRNG.for_agent("agent-a", root_seed=42)

    assert rng1 is rng1_copy, "Same agent should return same RNG instance"
    assert rng1 is not rng2, "Different agents should have different RNG instances"

    vals_a = [rng1.random() for _ in range(5)]
    vals_b = [rng2.random() for _ in range(5)]
    assert vals_a != vals_b, "Different agents should produce different sequences"
    print("  [OK] AgentRNG: deterministic per-agent RNG")


def test_kernel_pingpong():
    adm = LocalAdmBESA(alias="test-pingpong")

    ping = AgentBESA(alias="ping-1", state=TestState())
    pong = AgentBESA(alias="pong-1", state=TestState())

    ping.register_guard(type("PingG", (GuardBESA,), {
        "func_exec_guard": lambda self, ev: (
            setattr(self.get_state(), "value", self.get_state().value + 1)
        )
    }))
    pong.register_guard(type("PongG", (GuardBESA,), {
        "func_exec_guard": lambda self, ev: (
            setattr(self.get_state(), "value", self.get_state().value + 1)
        )
    }))

    adm.register_agent(ping)
    adm.register_agent(pong)
    adm.start_all()

    for _ in range(10):
        ping.send("pong-1", EventBESA(guard_type=type("PongG", (GuardBESA,), {})))
        time.sleep(0.01)

    time.sleep(0.3)
    adm.shutdown(timeout=3.0)

    assert pong.state.value == 10, f"Expected 10, got {pong.state.value}"
    print("  [OK] Kernel PingPong: messages exchanged correctly")


def test_rational_plan():
    plan = Plan(plan_id="test-plan")
    task = TestEmitEpisodeTask()
    plan.add_task(task)

    state = TestState()
    result = plan.execute(state)
    assert result, "Plan should execute successfully"
    print("  [OK] Rational Plan: task execution")


def test_bdi_pyramid():
    pyramid = DesireHierarchyPyramid()

    g1 = TestSurvivalGoal()
    g2 = TestLeisureGoal()

    pyramid.insert(g1, 0.9, GoalLevel.SURVIVAL)
    pyramid.insert(g2, 0.3, GoalLevel.ATTENTION_CYCLE)

    intention = pyramid.get_current_intention()
    assert intention is g1, "Survival goal should be selected over leisure"
    print("  [OK] BDI Pyramid: survival prioritized over leisure")


def test_bdi_machine():
    state = TestState(value=0)
    bdi_state = StateBDI(believes=state)
    bdi_state.potential_goals = [TestSurvivalGoal(), TestLeisureGoal()]

    machine = BDIMachine()

    for _ in range(5):
        machine.tick(bdi_state)
        state.value += 20

    print("  [OK] BDI Machine: cycle runs without errors")


def test_ebdi_emotional_model():
    em = EmotionalModel(alias="test-agent")
    em.state.joy = 0.8
    em.state.fear = 0.2

    dominant = em.get_dominant_emotion()
    assert dominant == "joy", f"Expected joy, got {dominant}"

    em.state.normalize()
    assert abs(em.state.joy + em.state.fear - 1.0) < 0.001

    dic = SemanticDictionary.get_instance()
    dic.set("land_value", 0.7)
    assert dic.get("land_value") == 0.7
    print("  [OK] eBDI: Emotional model and semantic dictionary")


def test_goal_levels():
    assert GoalLevel.SURVIVAL.value < GoalLevel.DUTY.value
    assert GoalLevel.DUTY.value < GoalLevel.OPPORTUNITY.value
    assert GoalLevel.OPPORTUNITY.value < GoalLevel.REQUIREMENT.value
    assert GoalLevel.REQUIREMENT.value < GoalLevel.NEED.value
    assert GoalLevel.NEED.value < GoalLevel.ATTENTION_CYCLE.value
    print("  [OK] GoalLevel: correct hierarchy ordering")


def test_agent_lifecycle():
    adm = LocalAdmBESA(alias="test-lifecycle")
    agent = AgentBESA(alias="lifecycle-agent", state=TestState())
    adm.register_agent(agent)
    adm.start_all()
    time.sleep(0.1)

    assert agent.is_alive(), "Agent should be alive after start"
    assert agent.name == "lifecycle-agent"

    adm.shutdown(timeout=3.0)
    agent.join(timeout=2.0)
    assert not agent.is_alive(), "Agent should not be alive after shutdown"
    print("  [OK] Agent lifecycle: start, running, shutdown")


def test_adm_singleton():
    adm1 = LocalAdmBESA(alias="singleton-1")
    from besa.kernel.adm import AdmBESA
    instance = AdmBESA.get_instance()
    assert instance is adm1, "Singleton should return latest instance"
    print("  [OK] AdmBESA singleton: get_instance() works")


if __name__ == "__main__":
    tests = [
        ("AgentRNG", test_agent_rng),
        ("Kernel PingPong", test_kernel_pingpong),
        ("Rational Plan", test_rational_plan),
        ("BDI Pyramid", test_bdi_pyramid),
        ("BDI Machine", test_bdi_machine),
        ("eBDI Emotional Model", test_ebdi_emotional_model),
        ("GoalLevel Hierarchy", test_goal_levels),
        ("Agent Lifecycle", test_agent_lifecycle),
        ("AdmBESA Singleton", test_adm_singleton),
    ]

    passed = 0
    failed = 0

    for name, test_fn in tests:
        try:
            test_fn()
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print(f"\n{'='*40}")
    print(f"RESULTS: {passed} passed, {failed} failed, {len(tests)} total")
    sys.exit(0 if failed == 0 else 1)
