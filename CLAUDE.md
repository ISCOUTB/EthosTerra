# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

EthosTerra is a multi-agent social simulator in Python 3.14 modeling Colombian peasant families using BDI (Belief-Desire-Intention) agents with emotional components. It simulates agricultural, economic, and welfare decisions over time.

## Repository Structure

```
EthosTerra/
├── besa-python/           # BESA framework Python port
│   ├── besa/kernel/       # AgentBESA (threading), EventBESA, GuardBESA, MBoxBESA
│   ├── besa/local/        # LocalAdmBESA container
│   ├── besa/rational/     # RationalAgent, Plan (DAG), Task
│   ├── besa/bdi/          # AgentBDI, DesireHierarchyPyramid, BDIMachine
│   │   └── declarative/   # GoalRegistry, PlanRegistry, ActionRegistry
│   ├── besa/ebdi/         # Emotional model
│   ├── besa/remote/       # RabbitMQ distribution
│   └── besa/llm/          # LLM integration
├── ethosterra-python/     # Domain simulation
│   ├── ethosterra/agents/  # PeasantFamily, AgroEcosystem, BankOffice, etc.
│   ├── ethosterra/guards/  # PeasantFamily guards (30+)
│   ├── ethosterra/believes/ # PeasantFamilyBelieves (pydantic)
│   └── ethosterra/output/  # CSVWriter, WebSocket server
├── data/ebdi/             # YAML specs (37 goals + 37 plans)
├── data/worlds/           # World configuration files
├── data/logs/             # CSV simulation output
├── wpsUI/                 # Frontend (Next.js 14 + Electron)
├── Dockerfile.python      # Docker build
├── docker-compose.python.yml  # Docker compose
└── requirements.txt       # Python dependencies
```

## Build & Run

```bash
# Local run (no Docker)
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
  python ethosterra-python/ethosterra/start.py --agents 5 --years 1 --speed 0.001

# Docker
docker compose -f docker-compose.python.yml up simulator

# Full stack with Redis + Postgres + RabbitMQ
docker compose -f docker-compose.python.yml --profile full up

# Development (hot reload)
docker compose -f docker-compose.python.yml --profile dev up

# Run all tests
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
  python besa-python/tests/integration/test_full_stack.py
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
  python ethosterra-python/tests/integration/test_full_system.py
```

## CLI Arguments

```
--agents N       Number of peasant families (default: 5)
--years N        Simulation years (default: 1)
--speed N        Seconds per sim day (default: 0.001)
--money N        Initial money per agent (default: 1500000)
--tools N        Initial tools (default: 10)
--seeds N        Initial seeds (default: 10)
--water N        Initial water (default: 10)
--irrigation 0/1 Irrigation enabled (default: 1)
--emotions 0/1   Emotions enabled (default: 1)
--training 0/1   Training enabled (default: 1)
--world FILE     World configuration file
--perturbation T Perturbation type
```

## Architecture

### Agent Model (Python threading)

Each agent runs in its own `threading.Thread` with a `queue.Queue` inbox:
- **AgentBESA** → base class with event loop
- **RationalAgent** → adds plans, roles
- **AgentBDI** → adds BDI cycle (6-level pyramid)
- **PeasantFamily** → domain-specific BDI agent

### Inter-agent Communication

Messages are routed via `AdmBESA` singleton with `LocalDirectory`:
- `agent.send(target_alias, EventBESA(guard_type=..., data=...))` 
- Guard routing by `guard_type.__name__` (class name matching)
- Service agents (BankOffice, MarketPlace, etc.) process events asynchronously

### YAML-Driven BDI

Goals and plans are defined in YAML (under `data/ebdi/`):
- 37 goal specs with activation conditions (Java-style expressions)
- 37 plan specs with action steps
- `yaml_evaluator.py` translates Java syntax (`state.isNewDay()`, `&&`, `!`) to Python
- 16 primitive actions in ActionRegistry

## WebSocket

ViewerLens agent serves WebSocket on port 8000:
- `ws://localhost:8000/wpsViewer`
- Messages: `q=` (agent count), `d=` (date), `j=` (agent JSON), `e=` (end)

## Environment Variables

```
ETHOSTERRA_ROOT          Project root (default: .)
ETHOSTERRA_GOALS_DIR     YAML goals path (default: data/ebdi/goals)
ETHOSTERRA_PLANS_DIR     YAML plans path (default: data/ebdi/plans)
ETHOSTERRA_LOGS_PATH     CSV output path (default: data/logs/wpsSimulator.csv)
REDIS_HOST               Redis host (optional, for belief persistence)
POSTGRES_HOST            PostgreSQL host (optional, for episode storage)
RABBITMQ_HOST            RabbitMQ host (optional, for distributed mode)
```
