# AGENTS.md

Guidance for OpenCode sessions in this repository. Only repo-specific, non-obvious facts.

## Project

EthosTerra is a multi-agent BDI social simulator in Python 3.14. Two packages: `besa-python/` (framework) + `ethosterra-python/` (domain). Formerly ported from Java — all Java sources have been removed.

## Essential commands

```bash
# Must set BOTH PYTHONPATH env vars and ETHOSTERRA_ROOT for every command
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. <command>

# Run simulation locally (5 agents, 1 year)
python ethosterra-python/ethosterra/start.py --agents 5 --years 1 --speed 0.001

# Run simulation in wait mode (API-controlled, used in Docker)
python ethosterra-python/ethosterra/start.py --wait

# Run all tests (standalone scripts, NOT pytest)
python besa-python/tests/unit/test_kernel.py
python besa-python/tests/integration/test_full_stack.py
python ethosterra-python/tests/integration/test_domain.py
python ethosterra-python/tests/integration/test_full_system.py
python ethosterra-python/tests/integration/test_plan_execution.py

# Docker (note: file is docker-compose.python.yml, not docker-compose.yml)
docker compose -f docker-compose.python.yml up simulator       # simulator only
docker compose -f docker-compose.python.yml --profile ui up    # simulator + UI
docker compose -f docker-compose.python.yml --profile full up  # + Redis + Postgres + RabbitMQ
```

## Architecture quirks

- **Guard routing by class name, not class identity.** `StructBESA.get_guard(event)` matches on `guard_type.__name__`. Two classes with the same `__name__` in different modules (e.g., `FromCivicAuthorityGuard` in `agents/civic_authority.py` vs `guards/from_civic_authority.py`) route correctly despite being different classes.

- **YAML expression evaluator.** `besa/bdi/yaml_evaluator.py` translates Java-style expressions to Python: `state.isNewDay()` → calls method on `_StateProxy` (auto camelCase→snake_case), `belief.get('key')` → `state.key`, `&&` → `and`, `!` → `not`, ternary `(cond) ? a : b` → `a if cond else b`. The `_StateProxy` wraps believes and resolves both `training_level` and `trainingLevel`.

- **Multi-goal BDI tick.** `BDIMachine.tick()` processes ALL viable goals per tick (SURVIVAL→ATTENTION_CYCLE), not just one. Each goal executes, if `goal_succeeded()` returns True it's removed and the loop continues.

- **`goal_succeeded()` fallback.** Goals without YAML `effects.on_success` use `_goal_selected_today` tracker — if a goal was the current intention, it succeeds by default.

- **`time_left_on_day` is in minutes (0–1440), not a fraction.** The `ConsumeResourceAction` and runner both use minutes. The default value on `PeasantFamilyBelieves` is 1440.0.

- **Inter-agent communication uses `send_guard_event_fn`** injected into actions via PlanExecutor. Targets are resolved by agent alias (e.g., "BankOffice", "MarketPlace") and guard type via `_resolve_guard_for_target()`.

- **Crop cycle is driven by the runner, not by goals.** The `SimulationRunner` manages land stages (NONE→GROWING→HARVEST_READY→FALLOW) and connects to `AgroEcosystem` automaton. The AgroEcosystem uses FAO-56 model: `CropCell.grow()` computes GDD, biomass, water stress. Harvests use `cell.state.above_ground_biomass * 0.4`.

- **Pydantic model mutation quirk.** `PeasantFamilyBelieves` is a `pydantic.BaseModel`. Modifying mutable fields like `lands.append(...)` works in-place, but `task_log` is also a `list[str]` and works the same way. Setting new attributes like `b._purpose_set = True` works because `arbitrary_types_allowed = True`.

## Environment variables

Always needed: `ETHOSTERRA_ROOT` (project root). YAML paths default to `data/ebdi/goals` and `data/ebdi/plans` relative to root.

| Var | Default | Purpose |
|-----|---------|---------|
| `ETHOSTERRA_ROOT` | `.` | Project root for YAML lookup |
| `ETHOSTERRA_GOALS_DIR` | `data/ebdi/goals` | YAML goal specs |
| `ETHOSTERRA_PLANS_DIR` | `data/ebdi/plans` | YAML plan specs |
| `ETHOSTERRA_LOGS_PATH` | `data/logs/wpsSimulator.csv` | CSV output |
| `REDIS_HOST/PORT` | `localhost:6379` | Optional belief persistence |
| `POSTGRES_HOST/PORT/DB/USER/PASSWORD` | — | Optional episode storage |

## WebSocket & Control API

- WebSocket on port **8000**: `ws://localhost:8000/wpsViewer`. Protocol: `q=` (agent count), `d=` (date), `j=` (JSON agent state), `e=` (end).
- Control HTTP API on port **8001**: `GET /status` → `{"running": bool}`, `POST /start` + JSON config → starts simulation, `POST /stop` → stops it.
- In Docker, the simulator runs with `--wait` flag. The UI sends `POST /start` to trigger simulation.

## Testing notes

- Tests are standalone Python scripts, **not pytest**. Run each with `python <file>`.
- All test files are self-contained — no conftest, no fixtures, no shared state.
- The `test_full_system.py` requires `ETHOSTERRA_ROOT` for YAML loading.
- `test_plan_execution.py` depends on YAML specs being loaded, needs root set.

## File ownership

| Dir | Owner | Notes |
|-----|-------|-------|
| `besa-python/` | Framework | Generic BESA, no domain dependencies |
| `ethosterra-python/` | Domain | Depends on besa-python via PYTHONPATH |
| `ethosterra-ui/` | Frontend | Next.js 14, standalone, connects via WS + HTTP |
| `data/ebdi/` | Shared | YAML specs, loaded by both Python and reference impl |
| `data/worlds/` | Shared | World JSON configs |
| `data/logs/` | Output | CSV results, volume-mounted in Docker |
| `wpsUI/` | Legacy | Original frontend, not part of Python stack |
