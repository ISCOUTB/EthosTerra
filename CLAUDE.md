# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EthosTerra** (repo: `wpsllm`) is a multi-agent social simulation platform for estimating productivity and well-being of rural Colombian peasant families. It uses a BDI (Beliefs-Desires-Intentions) cognitive agent framework with an optional LLM (Gemma 4B) reasoning layer for hybrid decision-making. Research project by SIDRePUJ / ISCOUTB (UTB).

The project language is primarily **Spanish** in documentation, comments, and commit messages, with code identifiers in English.

## Build Commands

### Full stack (Docker)

```bash
make download   # Download Gemma 4B GGUF model (~4GB) to models/
make build      # Build all Docker images
make up         # Start all services (wellprodsim, wpsllm-sidecar, llama-cpp)
make down       # Stop all services
make logs       # Tail simulator + sidecar logs
make benchmark  # Run latency benchmark (10 synthetic pulses)
make metrics    # Get aggregated LLM vs. numeric divergence report
make clean      # Remove metric logs and Docker volumes
```

### Java backend (local)

BESA modules must be built in order due to inter-dependencies:

```bash
for mod in KernelBESA LocalBESA RemoteBESA RationalBESA BDIBESA eBDIBESA; do
  cd $mod && mvn install -DskipTests && cd ..
done
cd wpsSimulator && mvn package -DskipTests
```

The `local-dev` Maven profile (default) uses `scope=system` with relative JAR paths. The `docker` profile creates a fat JAR with `maven-shade-plugin`.

### Run simulator standalone

```bash
java -jar wpsSimulator/target/wps-simulator-3.6.0.jar \
  -env local -mode single -agents 20 -money 2000000 \
  -land 2 -emotions 1 -years 1 -world mediumworld
```

### Frontend (wpsUI)

```bash
cd wpsUI && npm install --ignore-scripts && npm run dev    # dev mode (Next.js + Electron)
cd wpsUI && npm run build                                  # production build
```

### Sidecar (wpsllm-sidecar)

```bash
cd wpsllm-sidecar && pip install -r requirements.txt
uvicorn main:app --port 8001
```

### Integration tests

```bash
node data/test-backend.mjs   # 20 integration tests (requires running app)
```

No unit test framework is configured for Java. Maven is run with `-DskipTests` everywhere.

## Architecture

Three services orchestrated by Docker Compose:

```
Browser/Electron → wpsUI (Next.js :3000)
                     ↓ execFile / HTTP
              wpsSimulator (Java 21 JAR)
              ├── PeasantFamily agents (eBDI × N)
              ├── ViewerLens (WebSocket :8000)
              └── HTTP pulse requests → wpsllm-sidecar (FastAPI :8001)
                                           └── llama.cpp (Gemma 4B :8080)
```

### BESA Framework (Java modules, build order matters)

| Module         | Role                                                           |
| -------------- | -------------------------------------------------------------- |
| `KernelBESA`   | Agent kernel: `AdmBESA`, `AgentBESA`, `GuardBESA`, `StateBESA` |
| `LocalBESA`    | Single-JVM agent administration                                |
| `RemoteBESA`   | Multi-node distribution via TCP                                |
| `RationalBESA` | Rational agent layer (beliefs, plans, tasks)                   |
| `BDIBESA`      | BDI architecture (goals, desires, intentions, deliberation)    |
| `eBDIBESA`     | Emotional BDI extension (Ekman emotions, Big Five personality) |

### wpsSimulator agents

- **PeasantFamily**: Core eBDI agent with 6 goal levels (L1 Survival → L6 Leisure, ~40 goals total)
- **BankOffice, MarketPlace, CivicAuthority, CommunityDynamics**: Institutional agents
- **AgroEcosystem**: Cellular automaton for crops, rainfall, disease
- **PerturbationGenerator**: Injects crisis events
- **SimulationControl**: Orchestrates simulation clock and agent creation
- **ViewerLens**: Streams real-time state via Undertow WebSocket on port 8000

### BESA naming conventions

- Agents: `AgentName` extends `AgentBDI` / `AgentBESA`
- State: `AgentNameState` extends `StateBESA`
- Guards: `ActionGuard` extends `GuardBESA` (event handlers)
- Data: `AgentNameData` extends `DataBESA` (message payloads)
- Goals: `ActionGoal` extends `GoalBDI` (in `PeasantFamily/Goals/` hierarchy)
- Agents communicate via `AdmBESA.getInstance().getHandlerByAlias(...).sendEvent(...)`

### wpsllm-sidecar (Python)

4-layer architecture in `wpsllm-sidecar/layers/`:

- `l1_llm_client.py`: HTTP client to llama.cpp (OpenAI-compatible API)
- `l4_prompt_engine.py`: Prompt construction and response parsing
- `metrics/recorder.py`: JSONL double-registration (LLM vs. numeric)
- `metrics/aggregator.py`: Multi-session metric aggregation

Hybrid mode: LLM activates only when agent state meets critical thresholds (health < 30, money < threshold, has loan, planting/harvesting season). Config in `config.py` or env vars.

### wpsUI (Next.js 14 + Electron)

- App Router with `@/` import alias
- Pages in `src/app/pages/` (analytics, contact, dataExport, settings, simulador)
- API routes in `src/app/api/simulator/` (app-path, csv, file, main route)
- Electron wrapper in `main/main.js`
- Tailwind CSS + Radix UI components
- Two dummy npm deps (`wellprodsim`, `WellProdSim`) removed during Docker build

## Key Configuration

| File                                                   | Purpose                                              |
| ------------------------------------------------------ | ---------------------------------------------------- |
| `docker-compose.yml`                                   | 3-service orchestration                              |
| `Dockerfile`                                           | Multi-stage (java-build → headless → webapp)         |
| `wpsSimulator/src/main/resources/wpsConfig.properties` | Simulation parameters                                |
| `wpsllm-sidecar/config.py`                             | Hybrid thresholds, LLM URL, metrics path             |
| `wpsUI/next.config.mjs`                                | Next.js config                                       |
| `.env.example`                                         | Environment variable template (`.env` is gitignored) |
| `models/`                                              | GGUF model file (gitignored, ~5GB)                   |

## Important Details

- The `wpsUI/package.json` has two dummy dependencies (`wellprodsim: "file:"` and `WellProdSim: "file:"`) that are removed during Docker build via `npm pkg delete`
- Docker Compose currently targets the `headless` stage (Java-only, no frontend)
- JVM heap is limited to 2GB (`-Xmx2g`) in docker-compose to prevent OOM with >150 agents
- The sidecar's `os.umask(0)` is intentional for host/container file permission interoperability
- Commit messages and documentation are in Spanish
