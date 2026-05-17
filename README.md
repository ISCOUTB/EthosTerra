# EthosTerra — Simulador Social Multi-Agente BDI para Familias Campesinas

[![CI](https://github.com/ISCOUTB/EthosTerra/actions/workflows/python-ci.yml/badge.svg)](https://github.com/ISCOUTB/EthosTerra/actions/workflows/python-ci.yml)
[![Python](https://img.shields.io/badge/python-3.14+-blue.svg)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://www.docker.com/)

EthosTerra es un simulador multi-agente en Python 3.14 con razonamiento BDI (Belief-Desire-Intention) y componentes emocionales, que modela el comportamiento de familias campesinas colombianas: decisiones agrícolas, económicas y de bienestar a lo largo del tiempo.

Desarrollado por los grupos **SIDRePUJ / ISCOUTB** (Universidad Tecnológica de Bolívar y Pontificia Universidad Javeriana).

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────────┐
│                        Docker Compose                            │
│  ┌──────────────┐    WS :8000    ┌──────────────────────────┐   │
│  │  Next.js 14  │◄──────────────│   Python Simulator        │   │
│  │  (UI :3002)  │──────────────►│   ethosterra-python       │   │
│  │              │  POST :8001   │   BDI + FAO-56 crops      │   │
│  └──────────────┘               │   besa-python framework   │   │
│                                  └─────────────┬────────────┘   │
│                                                │                │
│                    ┌───────────────────────────┼──────────────┐ │
│                    │  Redis  │ Postgres │ Rabbit│  Ollama      │ │
│                    │ (belief │ (episode │ (dist │  :11434      │ │
│                    │  store) │  store)  │  mode)│  gemma3:4b   │ │
│                    └─────────┴──────────┴───────┴──────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

- **Python simulator**: threading.Thread per agent, event-driven, YAML-specified goals
- **WebSocket (8000)**: `q=` (agent count), `d=` (date), `j=` (agent JSON), `p=` (progress), `e=` (end)
- **Control API (8001)**: `GET /status`, `POST /start`, `POST /stop`, `POST /report/generate`
- **UI (3002)**: Next.js 14 standalone, config form + real-time dashboard + experiment launcher + report viewer
- **Ollama**: LLM local para generación de informes ReAct (perfil `ollama`)

---

## Quick Start

### Prerequisites

- Docker Desktop 27+ with Compose 5+ (or Podman equivalent)
- 4 GB RAM available for containers

### Docker Compose Profiles

`docker-compose.python.yml` define **8 servicios** en **6 perfiles**. El simulador siempre está disponible; los demás son opcionales.

| Perfil | Servicios incluidos | Uso |
|--------|--------------------|----|
| *(ninguno)* | `simulator` | Mínimo: WebSocket + Control API |
| `ui` | + `ui` | Dashboard Next.js en puerto 3002 |
| `redis` | + `redis` | Persistencia de creencias |
| `postgres` | + `postgres` | Almacenamiento de episodios |
| `distributed` | + `rabbitmq` | Simulación multi-nodo |
| `ollama` | + `ollama` + `ollama-init` | LLM local para informes ReAct |
| `dev` | `simulator-dev` | Hot-reload con volúmenes montados |
| `full` | Todos los servicios anteriores | Stack completo |

### Quick Commands

```bash
# Simulador + UI + Ollama (recomendado para experimentos)
docker compose -f docker-compose.python.yml --profile ui --profile ollama up --build

# Solo simulador (WebSocket :8000, Control API :8001)
docker compose -f docker-compose.python.yml up simulator --build

# Stack completo (Redis + Postgres + RabbitMQ + UI + Ollama)
docker compose -f docker-compose.python.yml --profile full --profile ui --profile ollama up --build
```

Abrir **http://localhost:3002** — configurar parámetros, hacer clic en **Iniciar**, ver datos en tiempo real.

> **Primera vez con Ollama**: `ollama-init` descarga `gemma3:4b` (~3.3 GB) al volumen persistente. Las siguientes ejecuciones usan el modelo ya descargado.

### Usage Flow

1. **Browser opens UI** → simulator waits (`--wait` mode), WebSocket active
2. **Configure parameters** — families, years, money, tools, seeds, water, speed
3. **Click "Iniciar"** → UI sends `POST :8001/start` with JSON config
4. **Real-time data** flows via `ws://localhost:8000/wpsViewer` → agent cards update
5. **Click "Detener"** → UI sends `POST :8001/stop`
6. **Analytics** → `/analytics` page reads CSV and displays interactive charts

---

## Experimentos

EthosTerra incluye dos modos de experimentación: **lotes de tratamientos** (Taguchi L27) y **generación de informes ReAct** con análisis de explicabilidad via LLM.

### 1 · Lanzador de experimentos (desde la UI)

El panel **Experimentos** en la UI ejecuta automáticamente N tratamientos en secuencia, cada uno con parámetros distintos (dinero inicial, tierra, emociones), recolecta métricas y las muestra en tabla.

**Desde la UI:**
1. Abrir **http://localhost:3002**
2. En la sección **Experimentos** elegir una plantilla:
   - *Experimento 4 (Coherencia)*: 18 tratamientos, 5 años, 5 agentes
   - *Rápido (3×2×2)*: 12 tratamientos, 1 año, 3 agentes
   - *Mini Test*: 1 tratamiento para verificar
3. Hacer clic en **Iniciar experimento**
4. Ver progreso y tabla de resultados en tiempo real

**Desde la CLI (Docker):**
```bash
# Lanzar experimento directamente en el contenedor
curl -X POST http://localhost:8001/experiment/start \
  -H "Content-Type: application/json" \
  -d '{
    "agents": 5,
    "years": 5,
    "money_levels": [750000, 1500000, 3000000],
    "land_levels": [2, 6, 12],
    "emotion_levels": [1, 0]
  }'

# Consultar estado
curl http://localhost:8001/experiment/status

# Detener
curl -X POST http://localhost:8001/experiment/stop
```

**Desde Python (sin Docker):**
```bash
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
  python experiments/experimento5.py
```

Los resultados de cada tratamiento se guardan en `data/experiments/E5/<ID>/wpsSimulator.csv`.

---

### 2 · Generación de informe ReAct (desde la UI)

Una vez terminados los experimentos, el motor de análisis ReAct procesa los CSVs usando un LLM local (Ollama) y genera un informe HTML + LaTeX con:
- Análisis estadístico por tratamiento (productividad, bienestar, tasa de crisis)
- Efectos Taguchi y comparativa cruzada
- Narrativas de episodios con detección de alucinaciones

**Prerrequisito:** levantar el perfil `ollama` (ver Quick Commands arriba). El modelo `gemma3:4b` se descarga automáticamente al iniciar por primera vez.

**Desde la UI:**
1. En la barra superior hacer clic en **Generar Informe**
2. Ajustar configuración en el panel emergente:

   | Campo | Valor por defecto | Descripción |
   |-------|------------------|-------------|
   | Modelo LLM | `gemma3:4b` | Modelo Ollama instalado |
   | URL Ollama | `http://ollama:11434` | Servicio Docker (o `http://localhost:11434` local) |
   | Episodios máx | `5` | Por tratamiento; `0` = todos |
   | Tratamiento | Todos (E401–E427) | O elegir uno específico |

3. Hacer clic en **Generar** — el proceso tarda entre 2 y 30 minutos según el modelo y número de episodios
4. Durante la generación aparece **"Generando informe…"** con enlace **ver log ↗** para seguir el progreso
5. Al terminar aparece **Ver Informe →** que abre el HTML completo en el navegador

**Desde la CLI:**
```bash
# Generar informe para todos los tratamientos (5 episodios c/u)
curl -X POST http://localhost:8001/report/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma3:4b","ollama_url":"http://ollama:11434","max_episodes":5}'

# Solo un tratamiento
curl -X POST http://localhost:8001/report/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma3:4b","ollama_url":"http://ollama:11434","max_episodes":10,"treatment":"E401"}'

# Consultar estado
curl http://localhost:8001/report/status

# Ver log del proceso
curl http://localhost:3002/api/report/log
```

**Desde Python (sin Docker):**
```bash
# Todos los tratamientos
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. \
  .venv/bin/python experiments/analysis/orchestrator.py \
  --all --max-episodes 5 --model gemma3:4b --ollama-url http://localhost:11434

# Un solo tratamiento
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. \
  .venv/bin/python experiments/analysis/orchestrator.py \
  --treatment E401 --max-episodes 10
```

Los informes se generan en:
- `reports/analysis/html/analysis_<fecha>.html` — informe interactivo
- `reports/analysis/latex/analysis_<fecha>.tex` — versión LaTeX
- `reports/analysis/charts/` — gráficas PNG por tratamiento

---

### 3 · Flujo completo de experimento

```
1. Levantar servicios
   docker compose -f docker-compose.python.yml \
     --profile ui --profile ollama up --build -d

2. Abrir UI → http://localhost:3002

3. [Opcional] Correr simulación exploratoria
   Configurar → Iniciar → observar agentes en tiempo real → Detener

4. Lanzar experimento por lotes
   UI → panel Experimentos → elegir plantilla → Iniciar experimento
   (o usar curl /experiment/start)

5. Esperar resultados
   Los CSVs se acumulan en data/experiments/E5/<ID>/

6. Generar informe
   UI → Generar Informe → configurar → Generar
   (o usar curl /report/generate)

7. Ver informe
   UI → Ver Informe →   (o abrir reports/analysis/html/analysis_*.html)
```

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
| `OLLAMA_URL` | `http://localhost:11434` | Ollama endpoint for report generation |
| `REDIS_HOST` | `localhost` | Redis host (optional belief persistence) |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host (optional episode storage) |
| `RABBITMQ_HOST` | `localhost` | RabbitMQ host (distributed mode) |

---

## License

LGPL-2.1 — [LICENSE](LICENSE)
