# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EthosTerra (formerly WellProdSim) is a multi-agent social simulator modeling Colombian peasant families using BDI (Belief-Desire-Intention) agents with emotional components. It simulates agricultural, economic, and welfare decisions over time.

## Critical Rules

- **NEVER compile outside Docker.** All Java compilation (`mvn package`) and distributed integration testing MUST go through `docker compose build` or inside a running container. Local `mvn` builds of `wpsSimulator` are only valid for isolated local runs (no distributed AMQP features).
- **Never use RMI.** Inter-container communication is exclusively via RabbitMQ/AMQP. Do not suggest `UnicastRemoteObject`, `Naming.rebind/lookup`, or `<remote>` XML tags.
- **All new agents and BDI logic belong in `wpsSimulator/src/main/java/`** so the Dockerfile's Uber-JAR build picks them up automatically.

## Repository Structure

```
EthosTerra/
├── KernelBESA/           # BESA framework core — threading, event queues, ConfigBESA
├── LocalBESA/            # Local BESA container implementation
├── RemoteBESA/           # Distributed BESA via RabbitMQ (replaces Java RMI)
├── RationalBESA/         # Rational agents with beliefs and plans
├── BDIBESA/              # BDI architecture (Goals/Desires/Intentions)
├── eBDIBESA/             # Emotional extensions for BDI agents
├── wpsSimulator/         # Main simulation engine (produces fat JAR)
├── wpsUI/                # Frontend: Next.js 14 + Electron
├── data/logs/            # CSV output from simulations (Docker volume)
├── Dockerfile            # Multi-stage prod build (Java + Next.js standalone)
├── Dockerfile.dev        # Dev build: Java JAR + Next.js dev server (no next build)
├── docker-compose.yml    # Prod orchestration (includes RabbitMQ)
└── docker-compose.dev.yml # Dev orchestration (hot reload, remote debug port 5005)
```

## Build & Run Commands

### Desarrollo con hot reload (recomendado para UI/frontend)

```bash
# Primera vez: compila Java (~7 min). Después el stage Java queda cacheado.
docker compose -f docker-compose.dev.yml build

# Iniciar
docker compose -f docker-compose.dev.yml up -d

# Ver logs en tiempo real
docker compose -f docker-compose.dev.yml logs -f wellprodsim-dev

# Parar
docker compose -f docker-compose.dev.yml down
```

Con este modo, cualquier cambio en `wpsUI/src/**` se refleja en el navegador automáticamente sin rebuild. Para cambios en Java (wpsSimulator/src/**):

```bash
docker compose -f docker-compose.dev.yml build wellprodsim-dev
docker compose -f docker-compose.dev.yml up -d wellprodsim-dev
```

Puertos expuestos en modo dev:
- `http://localhost:3000` — Next.js dev server (UI)
- `ws://localhost:8000/wpsViewer` — WebSocket ViewerLens
- `localhost:5005` — Java remote debug (attach IntelliJ / VSCode "Remote JVM Debug")
- `http://localhost:15672` — RabbitMQ management UI (guest/guest)

### Full Stack (Docker producción)

```bash
# Build everything (first time: ~7-8 min; cached: ~3-4 min)
docker compose build

# Start
docker compose up -d

# Rebuild after code changes
docker compose up --build -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

Access at `http://localhost:3000`. RabbitMQ management UI at `http://localhost:15672` (guest/guest).

### Backend — Local Development (no Docker)

Compile BESA modules **strictly in this order** before building `wpsSimulator`:

```bash
cd KernelBESA   && mvn install -DskipTests && cd ..
cd LocalBESA    && mvn install -DskipTests && cd ..
cd RemoteBESA   && mvn install -DskipTests && cd ..
cd RationalBESA && mvn install -DskipTests && cd ..
cd BDIBESA      && mvn install -DskipTests && cd ..
cd eBDIBESA     && mvn install -DskipTests && cd ..

cd wpsSimulator && mvn package -DskipTests   # generates target/wps-simulator-3.6.0.jar
```

The default Maven profile (`local-dev`) resolves BESA JARs via `scope=system` using relative paths (`../KernelBESA/target/...`). All modules must be at the same directory level.

Run the simulator directly:

```bash
# Single container (LOCAL mode — no RabbitMQ required)
java -jar wpsSimulator/target/wps-simulator-3.6.0.jar \
  -mode single -agents 10 -money 1500000 -land 6 \
  -personality 0.3 -tools 10 -seeds 10 -water 10 \
  -irrigation 1 -emotions 1 -training 1 -world mediumworld.json -years 1

# Multi-container — primary node (creates services + peasants; needs RabbitMQ)
java -jar wpsSimulator/target/wps-simulator-3.6.0.jar \
  -mode wps01 -agents 5 -money 1500000

# Multi-container — worker node (creates only peasants; needs RabbitMQ)
java -jar wpsSimulator/target/wps-simulator-3.6.0.jar \
  -mode wps02 -role worker -agents 5 -money 1500000
```

Remote debug (IntelliJ attach on port 5005):

```bash
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005 \
     -jar wpsSimulator/target/wps-simulator-3.6.0.jar -agents 5 -money 1500000
```

### Frontend — Local Development

```bash
cd wpsUI
npm install          # Windows with Electron
# or
npm install --ignore-scripts   # Linux/CI without display

npm run dev          # Next.js + Electron together (desktop mode)
npm run start        # Next.js only (web mode, http://localhost:3000)
```

Build desktop distributable:
```bash
npm run build        # compiles Next.js + packages with electron-builder → wpsUI/dist/
```

Lint (runs next build):
```bash
npm run lint
```

### Integration Tests (Distributed AMQP)

```bash
docker compose -f docker-compose.test.yml up --build
```

This starts RabbitMQ + three simulation containers (A, B, C) and validates inter-container messaging, agent lifecycle, and agent mobility.

## Architecture

### BESA Agent Framework (Java)

All agents follow the **Guard-Behavior-State** pattern:
- **`AgentBESA`** — base agent class; holds state and registers guard behaviors
- **`StateBESA`** — serializable agent state (data)
- **`GuardBESA`** — event handler; `funcExecGuard(EventBESA)` contains business logic
- **`DataBESA`** — payload carried by events between agents

BDI agents (`PeasantFamily`) extend `AgentBDI` and add:
- **`GoalBDI`** — implements `evaluateViability()`, `evaluateContribution()`, `goalSucceeded()`
- Goals are organized in 6 levels (L1 Survival → L6 Leisure) in a `DesireHierarchyPyramid`
- Each goal has a corresponding Task in `Tasks/` and Guard in `Guards/`

### Simulation Agents (wpsSimulator)

| Agent | Role |
|-------|------|
| `PeasantFamily` | Main BDI agent (N instances); models a farming household |
| `AgroEcosystem` | Cellular automaton for crops, weather, soil layers |
| `SimulationControl` | Orchestrates simulation lifecycle and time steps |
| `ViewerLens` | WebSocket server (port 8000, Undertow) for real-time visualization |
| `BankOffice` | Credit/loan services |
| `MarketPlace` | Crop prices and resource purchasing |
| `CivicAuthority` | Land allocation and training offers |
| `CommunityDynamics` | Labor contracts between peasant families |
| `PerturbationGenerator` | Injects random environmental events |

Entry point: `wpsStart.java` — instantiates `AdmBESA` container, creates all agents, starts simulation.

### Container Configuration Model

`-mode` sets the **container alias** (also the AMQP routing key suffix). `-role` controls what agents are created:

| `-mode`      | `-role` (default) | `EnvironmentCase` | Creates |
|--------------|-------------------|-------------------|---------|
| `single`     | `primary`         | LOCAL (no AMQP)   | Services + peasants |
| `web`        | `primary`         | LOCAL (no AMQP)   | Services + peasants |
| `wps01`      | `primary`         | REMOTE            | Services + peasants |
| `wps02`…`wpsN` | `worker`        | REMOTE            | Peasants only |
| any alias    | explicitly set    | REMOTE            | Per role |

`EnvironmentCase.LOCAL` skips RabbitMQ entirely (uses `LocalAdmBESA`). `REMOTE` uses `RemoteAdmBESA` which requires a running RabbitMQ broker.

### RemoteBESA / RabbitMQ

Inter-container communication uses two exchanges:

| Exchange | Type | Purpose |
|----------|------|---------|
| `besa.exchange` | `direct` | Point-to-point agent/admin messages |
| `besa.discovery` | `fanout` | Zero-config container auto-discovery |

Each container declares queue `besa.container.<alias>` (e.g. `besa.container.wps01`) on startup. Routing keys equal the queue name, so containers address each other by **alias** (deterministic, no UUIDs).

**Auto-discovery flow**: on startup each container publishes a `ContainerAnnouncementBESA` (`alias`, `admId`) to `besa.discovery`. All running containers receive it and register the new peer in their `remoteDirectory`. A daemon timer republishes the announcement every 30 s so late-joining containers learn about earlier ones within one heartbeat cycle.

Key components:
- **`RabbitMQAdmRemoteProxy`** — producer; routes to `besa.container.<targetAlias>`
- **`RabbitMQMessageConsumer`** — deserializes `RemoteMessageBESA` and dispatches to `AdmRemoteImpBESA`
- **`RabbitMQDiscoveryConsumer`** — handles `ContainerAnnouncementBESA` fanout messages
- **`DistributedInitBESA`** — wires all of the above on container startup

Configuration via environment variables: `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`, `RABBITMQ_VIRTUAL_HOST`.

### Frontend (wpsUI)

Next.js 14 App Router with two runtime modes:
- **Web/Docker**: `ElectronPolyfill.tsx` intercepts `window.electronAPI` calls and redirects them to `/api/simulator/*` HTTP routes
- **Desktop**: Electron `contextBridge` exposes IPC in `main/preload/preload.mjs`

The Java process state (running/stopped) is managed as a Node.js singleton in `wpsUI/src/lib/javaProcessState.ts`. The UI polls `GET /api/simulator` every 2 seconds to track simulation progress.

Pages live under `wpsUI/src/app/pages/`: `settings`, `simulador`, `analytics`, `dataExport`.

UI components use Radix UI primitives (`src/components/ui/`) styled with Tailwind CSS. Dark theme variables: `bg-card` (`#171c1f`), `bg-background` (`#0f1417`), `bg-primary` (`#3b82f6`).

### WebSocket (ViewerLens)

`ViewerLensGuard` emite mensajes por WebSocket (`ws://localhost:8000/wpsViewer`) usando prefijos de 2 caracteres:

| Prefijo | Dirección | Contenido |
|---------|-----------|-----------|
| `q=`    | servidor → cliente | Número de agentes activos (al conectar con `"setup"`) |
| `d=`    | servidor → cliente | Fecha actual de simulación |
| `j=`    | servidor → cliente | JSON con estado del agente: `{ name, state, taskLog }` — emitido cada lunes de simulación |
| `e=`    | servidor → cliente | `"end"` cuando termina la simulación |
| `"setup"` | cliente → servidor | Solicita `q=` y `d=` iniciales |
| `"stop"`  | cliente → servidor | Detiene la simulación |

**Nombre de los agentes**: El nombre tiene el formato `{mode}PeasantFamily{N}` donde `mode` es el valor de `-mode` al iniciar el JAR (ej. `singlePeasantFamily1` con `-mode single`). Los componentes del frontend deben usar upsert por nombre — **nunca asumir nombres hardcodeados**.

## Environment Variables

Create `.env` at the repo root (see `.env.example`):

```env
WPS_JAR_PATH=/app/wps-simulator.jar     # path inside Docker container
WPS_LOGS_PATH=/app/src/wps/logs         # CSV output directory
NODE_ENV=production
JAVA_TOOL_OPTIONS=-Xmx2g -Xms512m       # JVM heap (tune to available RAM)
```

For local runs (no Docker), set `WPS_JAR_PATH` to the absolute path of the compiled JAR.

## Adding New Agents or Goals

**New agent** — create under `wpsSimulator/src/main/java/org/wpsim/<AgentName>/`:
1. `AgentName.java` extends `AgentBESA` (or `AgentBDI` for BDI agents)
2. `AgentNameState.java` extends `StateBESA`
3. `AgentNameGuard.java` extends `GuardBESA` — implement `funcExecGuard`
4. `AgentNameData.java` extends `DataBESA`
5. Register the agent in `wpsStart.java`

**New BDI goal** (for `PeasantFamily`):
1. Create `MyGoal.java` extending `GoalBDI` in the appropriate `Goals/L<N>/` package
2. Implement `evaluateViability()`, `evaluateContribution()`, `goalSucceeded()`
3. Add to the desire pyramid with `builder.addGoal(new MyGoal(), GoalLevel.LEVEL_N)`
4. Create the associated Task and Guard

## Simulation Output

CSV results are written to `data/logs/wpsSimulator.csv` (persisted as a Docker volume). The file is created/appended during simulation and consumed by the Analytics page via `GET /api/simulator/csv`.
