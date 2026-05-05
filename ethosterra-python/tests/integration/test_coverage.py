import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "besa-python"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ETHOSTERRA_ROOT", "/home/jairo/Projects/EthosTerra")

from besa.bdi.yaml_evaluator import evaluate_activation, _build_namespace, _StateProxy
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves, Land
from ethosterra.world_config import WorldConfiguration, MonthlyDataLoader, MonthData
from ethosterra.simulation_clock import SimulationClock
from ethosterra.simulation_params import SimulationParams
from ethosterra.radiation import ExtraterrestrialRadiation, Hemisphere
from ethosterra.layer_module import WorldLayer, GenericWorldLayer, LayerExecutor
from ethosterra.plan_executor import PlanExecutor
from ethosterra.belief_repository import BeliefRepository, create_belief_repository
from ethosterra.episode_store import EpisodeStore, Episode, EpisodeFilter, create_episode_store


def test_yaml_evaluator_basic():
    b = PeasantFamilyBelieves(alias="PF-1", money=500000, new_day=True, seeds=0, training_level=0.4)
    assert evaluate_activation(b, "true") == 1.0
    assert evaluate_activation(b, "false") == 0.0
    assert evaluate_activation(b, "llm") == 0.5
    assert evaluate_activation(b, "") == 0.0
    print("  [OK] yaml_evaluator: literals")

def test_yaml_evaluator_state_methods():
    b = PeasantFamilyBelieves(alias="PF-1", money=500000, new_day=True, seeds=0, training_level=0.4)
    assert evaluate_activation(b, "state.isNewDay()") == 1.0
    assert evaluate_activation(b, "state.hasMoneyBelow(1000000)") == 1.0
    assert evaluate_activation(b, "state.needsSeeds()") == 1.0
    assert evaluate_activation(b, "!state.hasPurpose()") == 1.0
    assert evaluate_activation(b, "state.trainingLevel < 1") == 1.0
    print("  [OK] yaml_evaluator: Java methods + camelCase")

def test_yaml_evaluator_operators():
    b = PeasantFamilyBelieves(alias="PF-1", money=500000, new_day=True)
    assert evaluate_activation(b, "state.money > 100000 && state.isNewDay()") == 1.0
    assert evaluate_activation(b, "state.money > 100000 && false") == 0.0
    assert evaluate_activation(b, "state.money > 1000 || state.money < 100") == 1.0
    assert evaluate_activation(b, "!(state.money > 1000000)") == 1.0
    print("  [OK] yaml_evaluator: boolean operators &&, !")

def test_yaml_evaluator_belief_get():
    b = PeasantFamilyBelieves(alias="PF-1", money=500000, have_loan=False)
    assert evaluate_activation(b, "belief.get('money') > 0") == 1.0
    assert evaluate_activation(b, "belief.get('have_loan') == false") == 1.0
    print("  [OK] yaml_evaluator: belief.get() syntax")

def test_state_proxy_camel_case():
    b = PeasantFamilyBelieves(alias="PF-1", training_level=0.4, new_day=True)
    p = _StateProxy(b)
    assert p.trainingLevel == 0.4
    assert p.training_level == 0.4
    assert p.newDay is True
    assert p.isNewDay() is True
    print("  [OK] yaml_evaluator: StateProxy camelCase→snake_case")

def test_yaml_evaluator_ternario():
    b = PeasantFamilyBelieves(alias="PF-1", money=500000)
    r = evaluate_activation(b, "state.money > 100000")
    assert r == 1.0
    r2 = evaluate_activation(b, "state.money > 2000000")
    assert r2 == 0.0
    print("  [OK] yaml_evaluator: comparison expressions")

def test_world_config():
    wc = WorldConfiguration.get_instance()
    data = wc.load("mediumworld.json")
    assert isinstance(data, dict)
    assert len(data) > 0
    print(f"  [OK] world_config: WorldConfiguration loaded {len(data)} entries")

def test_monthly_data_loader():
    ml = MonthlyDataLoader.get_instance()
    md = ml.get_month(3)
    assert md.tmax == 29
    assert md.tmin == 19
    assert md.rainfall == 120
    md2 = ml.get_month(1)
    assert md2.tmax == 28
    print("  [OK] world_config: MonthlyDataLoader 12 months")

def test_radiation_table():
    ra = ExtraterrestrialRadiation.get_ra(4.0, 3, Hemisphere.NORTHERN)
    assert 15.0 < ra < 16.0
    ra2 = ExtraterrestrialRadiation.get_ra(4.0, 9, Hemisphere.SOUTHERN)
    assert ra2 > 0
    print(f"  [OK] radiation: Ra table lookup (lat=4, month=3) = {ra}")

def test_layer_module():
    wl = GenericWorldLayer()
    wl2 = GenericWorldLayer()
    wl.bind_layer("dep", wl2)
    assert wl.get_layer("dep") is wl2

    ex = LayerExecutor()
    ex.add_layer(GenericWorldLayer(), GenericWorldLayer())
    ex.execute_layers()
    print("  [OK] layer_module: WorldLayer + LayerExecutor")

def test_belief_repository():
    repo = create_belief_repository("PF-1")
    repo.set("money", 1000)
    assert repo.get("money") == 1000
    repo.set("new_day", True)
    assert repo.get("new_day") is True
    assert repo.get("nonexistent", 42) == 42

    called = []
    repo.subscribe("money", lambda k, o, n: called.append(n))
    repo.set("money", 2000)
    assert len(called) == 1
    assert called[0] == 2000

    repo.delete("money")
    assert repo.get("money") is None
    print("  [OK] belief_repository: CRUD + subscribers")

def test_episode_store():
    store = create_episode_store()
    store.store(Episode("PF-1", "vitals", {"text": "test"}))
    store.store(Episode("PF-2", "harvest", {"kg": 100}))
    assert store.count() == 2

    episodes = store.query(EpisodeFilter(agent_alias="PF-1"))
    assert len(episodes) == 1
    assert episodes[0].episode_type == "vitals"
    print("  [OK] episode_store: store + query + filter")

def test_simulation_clock():
    clock = SimulationClock.get_instance()
    clock.set_current_date("01/01/2024")
    assert clock.get_current_date() == "01/01/2024"
    assert clock.is_first_day_of_week("01/01/2024")  # Monday
    assert clock.is_first_day_of_month("01/02/2024")
    assert clock.is_after("02/01/2024")
    assert clock.is_before("31/12/2023")  # 31/12/2023 IS before 01/01/2024
    assert clock.days_between("05/01/2024") == 4

    clock.advance_one_day()
    assert clock.get_current_date() == "02/01/2024"
    clock.advance_days(5)
    assert clock.get_current_date() == "07/01/2024"
    print("  [OK] simulation_clock: date handling")

def test_simulation_params():
    p = SimulationParams()
    assert p.agents == 5
    assert p.money == 1500000
    assert p.years == 1
    p2 = SimulationParams(agents=20, money=500000, years=3)
    assert p2.agents == 20
    assert p2.money == 500000
    assert p2.years == 3
    print("  [OK] simulation_params: default + custom values")

def test_plan_executor_run_goal():
    b = PeasantFamilyBelieves(alias="PF-1", money=500000, new_day=True)
    ok = PlanExecutor.run_goal("do_vitals", "PF-1", b, lambda *a: None, lambda *a: None)
    assert ok is True
    assert b.new_day is False  # plan updated this
    print("  [OK] plan_executor: run_goal do_vitals")


if __name__ == "__main__":
    tests = [
        test_yaml_evaluator_basic, test_yaml_evaluator_state_methods,
        test_yaml_evaluator_operators, test_yaml_evaluator_belief_get,
        test_state_proxy_camel_case, test_yaml_evaluator_ternario,
        test_world_config, test_monthly_data_loader, test_radiation_table,
        test_layer_module, test_belief_repository, test_episode_store,
        test_simulation_clock, test_simulation_params, test_plan_executor_run_goal,
    ]
    passed = failed = 0
    for fn in tests:
        try: fn(); passed += 1
        except Exception as e:
            print(f"  [FAIL] {fn.__name__}: {e}")
            failed += 1
    print(f"\nRESULTS: {passed} passed, {failed} failed, {len(tests)} total")
    sys.exit(0 if failed == 0 else 1)
