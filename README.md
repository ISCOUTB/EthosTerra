# EthosTerra — Simulador Social Multi-Agente BDI para Familias Campesinas

[![CI](https://github.com/ISCOUTB/EthosTerra/actions/workflows/python-ci.yml/badge.svg)](https://github.com/ISCOUTB/EthosTerra/actions/workflows/python-ci.yml)
[![Python](https://img.shields.io/badge/python-3.14+-blue.svg)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)

EthosTerra es un simulador multi-agente en Python 3.14 con razonamiento BDI (Belief-Desire-Intention) y componentes emocionales, que modela el comportamiento de familias campesinas colombianas: decisiones agrícolas, económicas y de bienestar a lo largo del tiempo.

Desarrollado por los grupos **SIDRePUJ / ISCOUTB** (Universidad Tecnológica de Bolívar y Pontificia Universidad Javeriana).

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     Docker Container                        │
│  ┌──────────────┐    WS :8000    ┌────────────────────────┐ │
│  │  Next.js 14  │◄──────────────│  Python Simulator       │ │
│  │  (UI :3000)  │──────────────►│  ethosterra-python      │ │
│  │              │  POST :8001   │  BDI + FAO-56 crops     │ │
│  └──────────────┘               │  besa-python framework  │ │
│                                  └────────┬───────────────┘ │
│                                           │                 │
│                            ┌──────────────┼──────────────┐  │
│                            │  Redis  │ Postgres │ Rabbit │  │
│                            │ (belief │ (episode │  (dist │  │
│                            │  store) │  store)  │  mode) │  │
│                            └─────────┴──────────┴────────┘  │
└─────────────────────────────────────────────────────────────┘
```

- **Python simulator**: threading.Thread per agent, event-driven, YAML-specified goals
- **WebSocket (8000)**: `q=` (agent count), `d=` (date), `j=` (agent JSON), `e=` (end)
- **Control API (8001)**: `GET /status`, `POST /start`, `POST /stop`
- **UI (3000)**: Next.js 14 standalone, configuration form + real-time dashboard

---

## Quick Start

### Prerequisites

- Docker Desktop 27+ with Compose 5+ (or Podman equivalent)
- 4 GB RAM available for containers

### Docker Compose Profiles

The `docker-compose.python.yml` defines **6 services** across **5 profiles**. The simulator always runs; all other services are optional.

| Command | Services Started | Use Case |
|---------|-----------------|----------|
| `up simulator` | Simulator | Minimal: WebSocket + Control API on 8000/8001 |
| `up simulator --profile ui` | Simulator + UI | Full local: add Next.js dashboard on port 3000 |
| `up simulator --profile redis` | Simulator + Redis | Belief persistence via Redis |
| `up simulator --profile postgres` | Simulator + PostgreSQL | Episode storage via PostgreSQL |
| `up simulator --profile distributed` | Simulator + RabbitMQ | Multi-node simulation (distributed mode) |
| `up simulator --profile dev` | Simulator (dev mode) | Hot-reload development with mounted volumes |
| `up simulator --profile full --profile ui` | All services | Complete stack: Redis + Postgres + RabbitMQ + UI |

**Profile breakdown:**

| Profile | Services |
|---------|----------|
| *(none)* | `simulator` only |
| `ui` | `simulator` + `ui` |
| `redis` | `simulator` + `redis` |
| `postgres` | `simulator` + `postgres` |
| `distributed` | `simulator` + `rabbitmq` |
| `dev` | `simulator-dev` (hot-reload, binds source dirs) |
| `full` | `simulator` + `redis` + `postgres` + `rabbitmq` |

### Quick Commands

```bash
# Simulator only (WebSocket :8000, Control API :8001)
docker compose -f docker-compose.python.yml up simulator --build

# Simulator + UI (Next.js :3000)
docker compose -f docker-compose.python.yml --profile ui up --build

# Full stack: Redis + Postgres + RabbitMQ + UI
docker compose -f docker-compose.python.yml --profile full --profile ui up --build
```

Open **http://localhost:3000** — configure simulation parameters, click **Iniciar**, watch real-time agent data.

### Usage Flow

1. **Browser opens UI** → simulator is in `--wait` mode (agents created, WebSocket active, simulation NOT running)
2. **Configure parameters** — families, years, money, tools, seeds, water, speed
3. **Click "Iniciar"** → UI sends `POST :8001/start` with JSON config
4. **Real-time data** flows via `ws://localhost:8000/wpsViewer` → agent cards update
5. **Click "Detener"** → UI sends `POST :8001/stop`
6. **Analytics** → `/analytics` page reads CSV and displays charts

### Local (no Docker)

```bash
# Install dependencies
pip install -r requirements.txt

# Run simulation (5 agents, 1 year)
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
  python ethosterra-python/ethosterra/start.py --agents 5 --years 1 --speed 0.001

# Run in wait mode (API-controlled, like Docker)
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
  python ethosterra-python/ethosterra/start.py --wait
```

---

## CLI Arguments

| Flag | Default | Description |
|------|---------|-------------|
| `--agents N` | 5 | Number of peasant families |
| `--years N` | 1 | Simulation years |
| `--speed N` | 0.001 | Seconds per simulation day |
| `--money N` | 1500000 | Initial money per family (COP) |
| `--tools N` | 10 | Initial tools |
| `--seeds N` | 10 | Initial seeds |
| `--water N` | 10 | Initial water units |
| `--irrigation 0/1` | 1 | Irrigation enabled |
| `--emotions 0/1` | 1 | Emotional module enabled |
| `--training 0/1` | 1 | Training programs enabled |
| `--world FILE` | `mediumworld.json` | World config file |
| `--wait` | — | Wait mode (API-controlled, used in Docker) |

---

## Agents

| Agent | Role |
|-------|------|
| **PeasantFamily** | BDI actor: money, land, health, crop cycle (37 YAML goals, 6-level pyramid) |
| **AgroEcosystem** | Cellular automaton: FAO-56 model, 7 crop types, GDD growth, water stress |
| **BankOffice** | Credit: formal/informal loans, payment tables |
| **MarketPlace** | Buy/sell: seeds, water, tools, pesticides, livestock |
| **CivicAuthority** | Land assignment, training slots |
| **CommunityDynamics** | Labor contracts, social collaboration |
| **SimulationControl** | Clock, agent lifecycle |
| **ViewerLens** | WebSocket server (real-time state broadcast) |
| **PerturbationGenerator** | Random events: drought, flood, plague |

---

## Repository Structure

```
EthosTerra/
├── besa-python/              # Generic BESA framework (49 files, ~2,000 LOC)
│   ├── besa/kernel/          # AgentBESA (threading), EventBESA, GuardBESA, MBoxBESA
│   ├── besa/local/           # LocalAdmBESA container (dict + RLock)
│   ├── besa/rational/        # RationalAgent, Plan (DAG), Task
│   ├── besa/bdi/             # AgentBDI, BDIMachine, DesireHierarchyPyramid (6 levels)
│   │   └── declarative/      # GoalRegistry, PlanRegistry, ActionRegistry (16 actions)
│   ├── besa/ebdi/            # EmotionalModel (8 axes), SemanticDictionary
│   ├── besa/remote/          # RabbitMQProducer/Consumer, RemoteAdmBESA
│   └── besa/llm/             # LLMBroker, CircuitBreaker, RateLimiter
├── ethosterra-python/        # Domain simulation (37 files, ~2,500 LOC)
│   ├── ethosterra/agents/    # 9 service agents + PeasantFamily BDI
│   ├── ethosterra/guards/    # 12 PeasantFamily guards
│   ├── ethosterra/believes/  # PeasantFamilyBelieves (~50 fields, pydantic)
│   ├── ethosterra/output/    # CSVWriter, ViewerWSServer
│   └── ethosterra/start.py   # CLI entry point + Control API
├── ethosterra-ui/            # Next.js 14 visualizer (standalone)
│   ├── src/app/page.tsx      # Main dashboard with config form
│   ├── src/hooks/            # useWebSocket hook (q=/d=/j=/e= protocol)
│   └── src/app/api/          # /api/simulator, /api/csv
├── data/ebdi/                # YAML specs: 37 goals + 37 plans
├── data/worlds/              # World configuration JSON files
├── data/logs/                # CSV output (volume-mounted in Docker)
├── scripts/                  # compare_outputs.py (K-S test)
├── Dockerfile.python         # Multi-stage Docker build (~120 MB)
├── docker-compose.python.yml  # Simulator + Redis + Postgres + RabbitMQ + UI
└── requirements.txt          # Python dependencies
```

---

## Development

### Run tests

```bash
# All 6 suites (need PYTHONPATH + ETHOSTERRA_ROOT)
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
  python besa-python/tests/unit/test_kernel.py
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
  python besa-python/tests/integration/test_full_stack.py
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
  python ethosterra-python/tests/integration/test_domain.py
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
  python ethosterra-python/tests/integration/test_full_system.py
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
  python ethosterra-python/tests/integration/test_plan_execution.py
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
  python ethosterra-python/tests/integration/test_coverage.py

# With pytest + coverage (XML for SonarQube)
pytest --cov=besa --cov=ethosterra --cov-report=xml besa-python/tests ethosterra-python/tests
```

### CI/CD

GitHub Actions workflow (`.github/workflows/python-ci.yml`) runs all 5 suites on Python 3.13 and 3.14 on every push to main/develop.

### Build UI locally

```bash
cd ethosterra-ui
npm install
npm run dev      # dev mode on port 3000
npm run build    # production build (standalone output)
```

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `ETHOSTERRA_ROOT` | `.` | Project root for YAML path resolution |
| `ETHOSTERRA_GOALS_DIR` | `data/ebdi/goals` | YAML goal specs directory |
| `ETHOSTERRA_PLANS_DIR` | `data/ebdi/plans` | YAML plan specs directory |
| `ETHOSTERRA_LOGS_PATH` | `data/logs/wpsSimulator.csv` | CSV output path |
| `REDIS_HOST` | `localhost` | Redis host (optional belief persistence) |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host (optional episode storage) |

---

## License

LGPL-2.1 — [LICENSE](LICENSE)
