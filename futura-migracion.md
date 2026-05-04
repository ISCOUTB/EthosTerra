# EthosTerra — Migración a Python 3.14: Especificación Completa

> **Documento de referencia** para la reescritura de EthosTerra/BESA en Python 3.14.
> Diseñado para ser retomado por agentes Claude Code en sesiones futuras.
> Estado: PLANIFICACIÓN — no hay código Python escrito aún.

---

## 1. Resumen ejecutivo

| Aspecto | Detalle |
|---|---|
| **Proyecto origen** | EthosTerra (Java): simulador multi-agente BDI de familias campesinas colombianas |
| **Objetivo** | Reescribir el framework BESA + simulación en Python 3.14 free-threaded |
| **Lenguaje** | Python 3.14t (free-threaded, sin GIL) |
| **Repositorios** | `besa-python/` (framework genérico) + `ethosterra/` (dominio) o monorepo |
| **Concurrencia** | `threading.Thread` (no multiprocessing) — GIL desactivado con `PYTHON_GIL=0` |
| **LLM local** | `llama-server` (llama.cpp) para metas emergentes y tejido social complejo |
| **Testing** | Ambas versiones Java y Python corren en paralelo; comparación estadística de outputs |
| **Esfuerzo estimado** | 23–32 sesiones Claude Code para sistema completo |

---

## 2. Alcance: sistema Java actual a portar

### 2.1 Módulos del framework BESA

| Módulo | Archivos .java | LOC aprox. | Descripción |
|---|---|---|---|
| `KernelBESA/` | 89 | ~10,200 | Threading, event queues, lifecycle de agentes |
| `LocalBESA/` | 4 | ~830 | Contenedor local (single-JVM → single-process) |
| `RemoteBESA/` | 30 | ~4,400 | Distribución via RabbitMQ (conservar mismo protocolo) |
| `RationalBESA/` | 15 | ~1,180 | Roles, planes, creencias (Believes) |
| `BDIBESA/` | 17 | ~1,560 | Ciclo BDI, jerarquía de 6 niveles |
| `eBDIBESA/` | 10 | ~800 | Modelo emocional (ejes, valencia, semántica) |

### 2.2 Simulación EthosTerra (dominio)

| Componente | Archivos .java | LOC aprox. | Nota |
|---|---|---|---|
| `wpsSimulator/` (total) | 199 | ~35,000 | 92 archivos importan BESA.* |
| Agentes de servicio (8) | ~80 | ~12,000 | AgroEcosystem, MarketPlace, BankOffice, etc. |
| PeasantFamily (agente BDI) | ~50 | ~10,000 | 30 Guards + ciclo BDI completo |
| Infraestructura declarativa | 40 | ~5,000 | GoalRegistry, PlanRegistry, ActionRegistry |
| YAML specs goals/plans | 71 archivos | — | **100% portátiles sin cambios** |
| `wpsUI/` (Next.js) | ~70 TS | — | Cambiar solo las llamadas `/api/simulator` |

### 2.3 Lo que NO cambia

- **71 archivos YAML** (36 goals specs + 35 plan specs + config/goal_pyramid.yaml + BeliefSchema.json)
- **`wpsUI/`** (Next.js frontend): solo adaptar las rutas API para invocar Python en vez de JAR
- **Protocolo RabbitMQ**: mismos exchanges `besa.exchange` y `besa.discovery`
- **Formato CSV de salida**: mismas columnas para compatibilidad con Analytics

---

## 3. Tecnologías Python 3.14 aprovechadas

### 3.1 Free-threaded (PEP 703, más estable en 3.14)

Con `PYTHON_GIL=0`, los `threading.Thread` corren en paralelo real en múltiples cores. Esto replica el modelo de BESA Java (un thread por agente) con memoria compartida nativa — sin el overhead de serialización de `multiprocessing`.

```python
# Un agente = un thread (idéntico al modelo Java)
agent_thread = threading.Thread(target=agent.run_loop, name=agent.alias)
agent_thread.start()
```

### 3.2 T-strings (PEP 750, nuevo en 3.14) — para prompts LLM

```python
# En besa/llm/ — sin Jinja2, con t-strings nativas
belief_summary = believes.to_summary_dict()
agent_alias = believes.alias

prompt = t"Agente {agent_alias} con estado: {belief_summary}. ¿Qué nueva meta emergería dada esta situación crítica?"

# El objeto TemplateString permite inspección antes de enviar al LLM
final_str = render_prompt(prompt, escape_fn=json_safe)
```

### 3.3 Anotaciones diferidas (PEP 749, nuevo en 3.14)

Forward references en el framework sin `from __future__ import annotations`:

```python
class AgentBDI:
    def get_goal_engine(self) -> GoalEngine:  # GoalEngine definido después — OK en 3.14
        ...
```

### 3.4 `copy.replace()` (PEP 782, nuevo en 3.14) — snapshots de creencias

```python
# Checkpoint rápido del estado de un agente para comparación Java/Python
snapshot = copy.replace(believes, current_date=sim_date)
```

### 3.5 `@dataclass(slots=True)` — rendimiento para objetos masivos

Todos los `@dataclass` del framework usarán `slots=True` para reducir uso de memoria en simulaciones con 50+ agentes.

---

## 4. Arquitectura del nuevo BESA Python

### 4.1 Estructura de repositorios

```
besa-python/                    ← Framework genérico (publicable en PyPI)
├── besa/
│   ├── kernel/                 ← Core: agentes, eventos, guards, behaviors
│   ├── local/                  ← Contenedor single-machine (threading)
│   ├── remote/                 ← Distribución RabbitMQ (pika)
│   ├── rational/               ← Roles, planes, creencias
│   ├── bdi/                    ← Ciclo BDI + sistema declarativo YAML
│   │   └── declarative/        ← GoalRegistry, PlanRegistry, DeclarativeGoal
│   ├── ebdi/                   ← Modelo emocional
│   └── llm/                    ← Integración llama.cpp (eventos raros)
├── tests/
│   ├── unit/
│   └── integration/
├── pyproject.toml
└── .python-version             ← "3.14t"

ethosterra-python/              ← Dominio (usa besa-python como dependencia)
├── ethosterra/
│   ├── agents/                 ← PeasantFamily, AgroEcosystem, etc.
│   ├── guards/                 ← 30 Guards de PeasantFamily + guards de servicio
│   ├── believes/               ← PeasantFamilyBelieves, PeasantFamilyProfile
│   └── start.py                ← Equivalente a wpsStart.java
├── specs/goals/                ← Copiados del Java (sin cambios)
├── specs/plans/                ← Copiados del Java (sin cambios)
├── config/
└── pyproject.toml
```

### 4.2 Árbol de clases del framework

```
threading.Thread
└── AgentBESA (kernel/agent.py)
    ├── loop: recv(mbox) → match_guard(event) → exec_guard(event)
    ├── register(struct: StructBESA)
    └── send(target_alias, event)
    │
    └── RationalAgent (rational/rational_agent.py)
        ├── auto-registra: PlanExecutionGuard, ChangeRationalRoleGuard, PlanCancellationGuard
        └── AgentBDI (bdi/agent_bdi.py)
            ├── auto-registra: BDIMachine (4 fases del ciclo BDI)
            └── PeasantFamily (ethosterra/agents/peasant_family.py)
                ├── 30 guards de dominio registrados en StructBESA
                └── 36 goals cargados desde YAML por GoalRegistry

queue.Queue
└── MBoxBESA (kernel/mbox.py)
    └── inbox de cada AgentBESA

dict + threading.RLock
└── LocalDirectory (local/local_directory.py)
    └── {alias: AgentBESA} — directorio compartido entre todos los threads

GoalBDI (bdi/goal_bdi.py) — Protocol/ABC
├── detect_goal(believes) → float
├── evaluate_viability(believes) → float
├── evaluate_plausibility(believes) → float
├── evaluate_contribution(state) → float
└── goal_succeeded(believes) → bool
    │
    └── DeclarativeGoal (bdi/declarative/declarative_goal.py)
        ├── load from GoalSpec (YAML)
        ├── activation_when → simpleeval (o "llm" → LLMGoalAdvisor)
        └── contribution → scikit-fuzzy o fixed_value
```

### 4.3 Ciclo BDI (4 fases)

```python
# besa/bdi/bdi_machine.py — equivalente a los 4 guards Java de AgentBDI
class BDIMachine:
    def tick(self, state: StateBDI):
        # Fase 1: Detect — filtrar goals activables
        detectable = [g for g in state.potential_goals
                      if g.detect_goal(state.believes) > state.threshold]

        # Fase 2: Evaluate plausibility + viability
        viable = [g for g in detectable
                  if g.evaluate_plausibility(state.believes) > 0
                  and g.evaluate_viability(state.believes) > 0]

        # Fase 3: Score contribution → jerarquía de 6 niveles
        for goal in viable:
            score = goal.evaluate_contribution(state)
            state.pyramid.insert(goal, score)

        # Fase 4: Select top goal → ejecutar plan
        intention = state.pyramid.get_current_intention()
        if intention:
            self.execute_plan(intention, state.believes)
            if intention.goal_succeeded(state.believes):
                state.pyramid.remove(intention)
```

### 4.4 Modelo de concurrencia (Python 3.14t)

```
Container (LocalAdmBESA)
  ├── Main thread: registry dict + lifecycle
  ├── AgentThread-PeasantFamily-1: queue.Queue inbox + BDI loop
  ├── AgentThread-PeasantFamily-2
  ├── ... AgentThread-PeasantFamily-N
  ├── AgentThread-AgroEcosystem
  ├── AgentThread-MarketPlace
  ├── AgentThread-BankOffice
  ├── AgentThread-CivicAuthority
  ├── AgentThread-CommunityDynamics
  ├── AgentThread-SimulationControl
  ├── AgentThread-PerturbationGenerator
  ├── AgentThread-ViewerLens
  └── LLMBroker-Thread (si --profile llm activo)

RemoteContainer (RemoteAdmBESA)  ← container adicional distribuido
  ├── Todos los threads anteriores
  └── RabbitMQ Consumer Thread (pika)
```

**Sincronización**:
- `queue.Queue` por agente → inbox thread-safe, sin locks adicionales
- `threading.RLock` en `LocalDirectory` → solo para registro/lookup de agentes
- `threading.Lock` en `PeasantFamilyBelieves` → protege modificaciones desde guards externos
- Sin locks en el loop BDI interno de cada agente (acceso single-threaded al propio estado)

---

## 5. Sistema declarativo YAML (sin cambios desde Java)

Los archivos YAML existentes se cargan directamente. Solo cambia la implementación del loader en Python.

### 5.1 GoalRegistry (Python)

```python
# besa/bdi/declarative/goal_registry.py
import os
from pathlib import Path
import yaml
from functools import cache

class GoalRegistry:
    _instance: GoalRegistry | None = None
    _goals: dict[str, GoalSpec] = {}

    @classmethod
    def get_instance(cls) -> GoalRegistry:
        if cls._instance is None:
            cls._instance = cls()
            cls._instance._load_all()
        return cls._instance

    def _load_all(self):
        goals_dir = Path(os.getenv("WPS_GOALS_DIR", "specs/goals"))
        for yaml_file in goals_dir.rglob("*.yaml"):
            spec_dict = yaml.safe_load(yaml_file.read_text())
            spec = GoalSpec(**spec_dict)
            self._goals[spec.id] = spec
            print(f"EBDI: Loaded goal: {spec.id}")

    def get(self, goal_id: str) -> GoalSpec | None:
        return self._goals.get(goal_id)
```

### 5.2 DeclarativeGoal (Python)

```python
# besa/bdi/declarative/declarative_goal.py
from simpleeval import EvalWithCompoundTypes

class DeclarativeGoal(GoalBDI):
    def __init__(self, spec: GoalSpec, plan: Plan):
        self.spec = spec
        self.plan = plan

    @classmethod
    def build(cls, goal_id: str) -> DeclarativeGoal:
        spec = GoalRegistry.get_instance().get(goal_id)
        if spec is None:
            raise RuntimeError(f"Goal spec not found: {goal_id}")
        plan = PlanRegistry.get_instance().get_plan(spec.plan_ref) or Plan()
        return cls(spec, plan)

    def detect_goal(self, believes: Believes) -> float:
        if believes.is_task_executed_today(self.spec.id):
            return 0.0
        if self.spec.activation_when == "llm":
            return LLMGoalAdvisor.detect(self.spec, believes)  # async, raramente llamado
        ctx = {"state": believes, "lands": believes.get_lands_state(), "belief": believes.belief_repository}
        result = EvalWithCompoundTypes(names=ctx).eval(self.spec.activation_when)
        return 1.0 if result else 0.0

    def evaluate_contribution(self, state: StateBDI) -> float:
        rules = self.spec.contribution_rules
        if rules.fixed_value is not None:
            return rules.fixed_value
        return GoalEngine.get_instance().evaluate_fuzzy(rules, state.believes)
```

### 5.3 ActionRegistry (Python)

```python
# besa/bdi/declarative/action_registry.py
# Las 15+ acciones registradas (equivalentes a las Java)
ACTIONS: dict[str, PrimitiveAction] = {
    "emit_episode":            EmitEpisodeAction(),
    "update_belief":           UpdateBeliefAction(),
    "consume_resource":        ConsumeResourceAction(),
    "send_event":              SendEventAction(),
    "send_marketplace_event":  SendMarketPlaceEventAction(),
    "send_civic_land_request": SendCivicAuthorityLandRequestAction(),
    "emit_emotion":            EmitEmotionAction(),
    "increase_health":         IncreaseHealthAction(),
    "sync_clock":              SyncClockAction(),
    "log_audit":               LogAuditAction(),
    "increment_belief":        IncrementBeliefAction(),
    "wait_for_event":          WaitForEventAction(),
    "conditional":             ConditionalAction(),
    "send_society_collaboration": SendSocietyCollaborationAction(),
    "spend_friends_time":      SpendFriendsTimeAction(),
    "agro_ecosystem_operation": AgroEcosystemAction(),
}
```

---

## 6. Módulo LLM (`besa/llm/`) — eventos raros y metas emergentes

### 6.1 Principio fundamental

**El LLM NO participa en el loop BDI caliente.** El ciclo detect→select→execute corre miles de veces por día simulado. El LLM se activa solo para:

| Trigger | Frecuencia | Qué genera |
|---|---|---|
| Agente en crisis sostenida (>90 días) | ~1/agente/simulación | Nueva `GoalSpec` emergente |
| Evento social complejo (conflicto tierras, cooperativa) | Raro | Narrativa + goals comunitarios |
| Perturbación extrema (sequía, desastre) | Configurable | Goals de respuesta comunitaria |
| Decisión de vida del campesino (migrar, cambiar cultivo) | ~1/agente/año simulado | Plan de largo plazo |

### 6.2 Arquitectura: no-blocking con callback guard

```python
# Guard que detecta crisis y solicita LLM asincrónicamente
class CrisisDetectionGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA):
        believes = self.get_state()
        if believes.is_in_prolonged_crisis():
            # Enviar request al LLMBroker Thread — NO bloqueante
            llm_request = LLMRequest(
                template="emergent_goal",
                context=believes.to_summary(),
                callback_agent=believes.alias,
                callback_guard=LLMResponseGuard,
            )
            self.send_to_llm_broker(llm_request)
            # El agente continúa su ciclo BDI normal mientras el LLM procesa

# Guard que recibe la respuesta del LLM cuando está lista
class LLMResponseGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA):
        response: LLMResponse = event.data
        if response.new_goal_spec:
            # Inyectar nueva meta en el ciclo BDI del agente
            new_goal = DeclarativeGoal.build_from_spec(response.new_goal_spec)
            self.get_state().add_potential_goal(new_goal)
```

### 6.3 LLMBroker Thread

```python
# besa/llm/llm_broker.py — proceso dedicado (Thread único)
class LLMBroker(threading.Thread):
    """Serializa requests LLM: evita saturar llama-server con N agentes simultáneos."""

    def __init__(self, server_url: str):
        super().__init__(name="LLMBroker", daemon=True)
        self.request_queue: queue.Queue[LLMRequest] = queue.Queue()
        self.client = LLMClient(server_url)
        self.cache = LLMCache(max_size=500)

    def run(self):
        while True:
            request = self.request_queue.get()
            cache_key = request.cache_key()
            if (cached := self.cache.get(cache_key)) is not None:
                self._dispatch_response(request, cached)
                continue
            response = self.client.complete(request)   # HTTP a llama-server
            self.cache.put(cache_key, response)
            self._dispatch_response(request, response)

    def _dispatch_response(self, req: LLMRequest, resp: LLMResponse):
        # Enviar evento de vuelta al agente solicitante
        LocalAdmBESA.get_instance().send_event(
            target=req.callback_agent,
            event=EventBESA(guard=req.callback_guard, data=resp)
        )
```

### 6.4 Prompt templates con t-strings (Python 3.14)

```python
# besa/llm/prompt_templates.py
def emergent_goal_prompt(alias: str, summary: dict, crisis_days: int) -> str:
    template = t"""Eres un experto en sociología rural colombiana.
Un agricultor llamado {alias} lleva {crisis_days} días en crisis:
Estado: {summary}

Genera una nueva meta de vida coherente con su contexto cultural.
Responde SOLO en JSON con este esquema exacto:
{{"id": "string", "display_name": "string", "activation_when": "true",
  "pyramid_level": "OPORTUNITY", "contribution_rules": {{"fixed_value": 0.8}}}}"""
    return render_template(template)
```

### 6.5 Docker service llama-server

```yaml
# docker-compose.yml (perfil opcional)
services:
  llama-server:
    image: ghcr.io/ggerganov/llama.cpp:server
    volumes:
      - ./models:/models
    command: >
      -m /models/llama-3.1-8b-instruct.Q4_K_M.gguf
      -c 8192 --host 0.0.0.0 --port 8080
      --n-gpu-layers 0      # CPU: dev/CI; -1: GPU en producción
      --parallel 2          # bajo — llamadas son raras
      --cont-batching
      --temp 0.0 --seed 42  # determinista para tests
    profiles: ["llm"]       # docker compose --profile llm up
```

**Modelos recomendados**:

| Uso | Modelo | RAM CPU |
|---|---|---|
| Desarrollo/CI | `llama-3.2-3b-instruct.Q4_K_M.gguf` | ~2 GB |
| Producción | `llama-3.1-8b-instruct.Q4_K_M.gguf` | ~5 GB |
| GPU disponible | `llama-3.1-8b-instruct.Q6_K.gguf` | ~7 GB VRAM |

---

## 7. Configuración del proyecto

### 7.1 pyproject.toml

```toml
[project]
name = "besa-python"
version = "3.7.0"
requires-python = ">=3.14"
description = "BESA multi-agent BDI framework in Python 3.14 free-threaded"
license = {text = "LGPL-2.1"}

dependencies = [
    "pydantic>=2.9",
    "pyyaml>=6.0",
    "sortedcontainers>=2.4",
    "simpleeval>=1.0",
]

[project.optional-dependencies]
fuzzy  = ["scikit-fuzzy>=0.4", "numpy>=2.1"]
remote = ["pika>=1.3"]
llm    = ["httpx>=0.27"]
dev    = ["pytest>=8.3", "mypy>=1.12", "ruff>=0.9", "pytest-cov>=5.0"]

[tool.uv]
python = "3.14t"    # free-threaded build

[tool.mypy]
python_version = "3.14"
strict = true

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "ANN"]
```

### 7.2 .python-version

```
3.14t
```

### 7.3 Dockerfile (BESA Python)

```dockerfile
FROM python:3.14t-slim

ENV PYTHON_GIL=0 \
    PYTHONUNBUFFERED=1 \
    WPS_GOALS_DIR=/app/specs/goals \
    WPS_PLANS_DIR=/app/specs/plans

WORKDIR /app
COPY pyproject.toml .
RUN pip install uv && uv sync --no-dev

COPY besa/ ./besa/
COPY ethosterra/ ./ethosterra/
COPY specs/ ./specs/
COPY config/ ./config/

ENTRYPOINT ["python", "-m", "ethosterra.start"]
```

---

## 8. Estrategia de testing: Java vs Python en paralelo

### 8.1 docker-compose.compare.yml

```yaml
services:
  rabbitmq:
    image: rabbitmq:3-management

  wps-java:
    image: ethosterra-java:latest
    command: ["-mode", "single", "-agents", "5", "-years", "1"]
    environment:
      - WPS_SEED=42
    volumes:
      - java-logs:/app/data/logs

  wps-python:
    image: ethosterra-python:latest
    command: ["--mode", "single", "--agents", "5", "--years", "1"]
    environment:
      - WPS_SEED=42
      - PYTHON_GIL=0
    volumes:
      - python-logs:/app/data/logs

  comparator:
    image: python:3.14-slim
    depends_on:
      wps-java: {condition: service_completed_successfully}
      wps-python: {condition: service_completed_successfully}
    volumes:
      - java-logs:/data/java
      - python-logs:/data/python
    command: ["python", "/scripts/compare_outputs.py", "--tolerance", "0.15"]

volumes:
  java-logs:
  python-logs:
```

### 8.2 compare_outputs.py

```python
# scripts/compare_outputs.py
from scipy import stats
import pandas as pd

def compare_simulations(java_csv: str, python_csv: str, tolerance: float = 0.15):
    java = pd.read_csv(java_csv)
    python = pd.read_csv(python_csv)

    metrics = {
        "money_final":       ("money", stats.ks_2samp),
        "harvests_count":    ("harvests", stats.ttest_ind),
        "health_avg":        ("health", stats.ttest_ind),
        "loans_taken":       ("loans", stats.mannwhitneyu),
    }

    results = {}
    for name, (col, test_fn) in metrics.items():
        stat, p_value = test_fn(java[col].dropna(), python[col].dropna())
        passed = p_value > 0.05  # no hay diferencia estadística significativa
        mean_diff = abs(java[col].mean() - python[col].mean()) / java[col].mean()
        results[name] = {"p_value": p_value, "mean_diff_pct": mean_diff, "passed": passed}

    failed = [k for k, v in results.items() if not v["passed"] or v["mean_diff_pct"] > tolerance]
    if failed:
        print(f"FAIL: Métricas fuera de tolerancia: {failed}")
        exit(1)
    print("PASS: Python produce distribuciones estadísticamente equivalentes a Java")
```

### 8.3 Tests unitarios del framework

```
besa-python/tests/
├── unit/
│   ├── test_kernel/
│   │   ├── test_event_besa.py           # EventBESA serialización y prioridad
│   │   ├── test_mbox.py                 # MBoxBESA blocking recv, timeout
│   │   ├── test_agent_lifecycle.py      # start → running → shutdown
│   │   └── test_guard_routing.py        # EventBESA llega al guard correcto
│   ├── test_bdi/
│   │   ├── test_desire_pyramid.py       # 6 niveles, selección correcta
│   │   ├── test_bdi_machine.py          # ciclo completo detect→execute→succeed
│   │   ├── test_goal_registry.py        # carga YAML, goal_id encontrado
│   │   └── test_declarative_goal.py     # activation_when evalúa correctamente
│   ├── test_llm/
│   │   ├── test_llm_broker.py           # serializa requests, no bloquea agente
│   │   ├── test_llm_cache.py            # hit/miss en cache
│   │   └── test_llm_fallback.py         # si servidor caído, BDI sigue operando
│   └── test_ebdi/
│       └── test_emotional_model.py      # valencia positiva/negativa correcta
├── integration/
│   ├── test_local_container.py          # PingPong 2 agentes, medir throughput
│   ├── test_remote_container.py         # 2 containers Python via RabbitMQ
│   ├── test_java_to_python_remote.py    # Container Java → Container Python
│   └── test_ethosterra_1yr.py           # 1 año, 5 campesinos, produce CSV válido
└── comparison/
    └── test_statistical_equivalence.py  # Llama a compare_outputs.py
```

---

## 9. Plan de implementación por fases

### Fase 1 — `besa/kernel/` + `besa/local/` (3–4 sesiones)

**Archivos Java de referencia**:
- `KernelBESA/src/main/java/BESA/Kernel/Agent/AgentBESA.java`
- `KernelBESA/src/main/java/BESA/Kernel/Agent/ChannelBESA.java`
- `KernelBESA/src/main/java/BESA/Kernel/Agent/MBoxBESA.java`
- `LocalBESA/src/main/java/BESA/Local/LocalAdmBESA.java`

**Archivos Python a crear**:
- `besa/kernel/event.py` → `@dataclass(slots=True)` EventBESA
- `besa/kernel/mbox.py` → wrapper `queue.Queue`
- `besa/kernel/guard.py` → ABC GuardBESA
- `besa/kernel/agent.py` → `threading.Thread` + event loop
- `besa/kernel/struct.py` → dict de guard→behavior bindings
- `besa/kernel/adm.py` → abstract AdmBESA
- `besa/local/local_adm.py` → `dict + threading.RLock` como directorio
- `besa/local/local_directory.py`

**Test de aceptación**: `test_local_container.py`
```python
def test_pingpong_two_agents():
    # Agent A envía 100 eventos a Agent B, B responde a A
    # Verificar: ambos threads corren en paralelo (perf_counter)
    # Verificar: todos los eventos llegan (no se pierden)
    # Benchmark: throughput > 1000 eventos/segundo
```

### Fase 2 — `besa/rational/` (2–3 sesiones)

**Archivos Java de referencia**:
- `RationalBESA/src/main/java/rational/RationalAgent.java`
- `RationalBESA/src/main/java/rational/mapping/Plan.java`
- `RationalBESA/src/main/java/rational/mapping/Task.java`

**Archivos Python a crear**:
- `besa/rational/believes.py` → Protocol/ABC Believes
- `besa/rational/task.py` → ABC Task con `execute(believes) → bool`
- `besa/rational/plan.py` → DAG con `concurrent.futures.ThreadPoolExecutor`
- `besa/rational/rational_role.py` → binding role_name → Plan
- `besa/rational/rational_agent.py` → extends AgentBESA, registra 3 guards

**Test de aceptación**: agente ejecuta Plan con 3 Tasks, 2 paralelas (sin dependencia entre sí).

### Fase 3 — `besa/bdi/` + sistema declarativo (4–5 sesiones)

**Archivos Java de referencia**:
- `BDIBESA/src/main/java/BESA/BDI/AgentStructuralModel/AgentBDI.java`
- `BDIBESA/src/main/java/BESA/BDI/AgentStructuralModel/DesireHierarchyPyramid.java`
- `wpsSimulator/src/main/java/org/wpsim/Infrastructure/Goals/DeclarativeGoal.java`
- `wpsSimulator/src/main/java/org/wpsim/Infrastructure/Goals/GoalEngine.java`
- `wpsSimulator/src/main/java/org/wpsim/Infrastructure/Goals/GoalRegistry.java`

**Archivos Python a crear**:
- `besa/bdi/goal_bdi.py` → Protocol BDIEvaluable
- `besa/bdi/goal_bdi_types.py` → Enum (SURVIVAL, DUTY, OPORTUNITY, REQUIREMENT, NEED, ATTENTION_CYCLE)
- `besa/bdi/desire_pyramid.py` → 6 tiers con `sortedcontainers.SortedList`
- `besa/bdi/bdi_machine.py` → 4 fases del ciclo
- `besa/bdi/agent_bdi.py` → extends RationalAgent
- `besa/bdi/declarative/goal_spec.py` → `@dataclass` GoalSpec
- `besa/bdi/declarative/plan_spec.py` → `@dataclass` PlanSpec
- `besa/bdi/declarative/goal_registry.py` → singleton, carga YAML
- `besa/bdi/declarative/plan_registry.py` → singleton, carga YAML
- `besa/bdi/declarative/declarative_goal.py` → YAML → GoalBDI con simpleeval
- `besa/bdi/declarative/goal_engine.py` → scikit-fuzzy
- `besa/bdi/declarative/action_registry.py` → 16 acciones registradas

**Test de aceptación**: `test_bdi_machine.py`
```python
def test_goal_selection_from_yaml():
    # Cargar specs/goals/ del proyecto real
    # Crear AgentBDI con 36 goals
    # Simular estado de creencias: money=5000, lands=[GROWING]
    # Verificar: check_crops detectado y seleccionado (contribution alta)
```

### Fase 4 — `besa/ebdi/` modelo emocional (1–2 sesiones)

**Archivos Java de referencia**:
- `eBDIBESA/src/main/java/BESA/Emotional/EmotionalModel.java`
- `eBDIBESA/src/main/java/BESA/Emotional/EmotionalEvent.java`
- `eBDIBESA/src/main/java/BESA/Emotional/EmotionalState.java`

**Archivos Python a crear**:
- `besa/ebdi/emotional_event.py` → `@dataclass(slots=True)` (person, event, object)
- `besa/ebdi/emotional_state.py` → ejes emocionales + getMostActivatedEmotion
- `besa/ebdi/emotional_model.py` → ABC con `process_emotional_event()`
- `besa/ebdi/semantic_dictionary.py` → singleton de valores semánticos

### Fase 5 — `besa/remote/` distribución RabbitMQ (2–3 sesiones)

**Archivos Java de referencia**:
- `RemoteBESA/src/main/java/BESA/Remote/RabbitMQManager.java`
- `RemoteBESA/src/main/java/BESA/Remote/RabbitMQMessageConsumer.java`
- `RemoteBESA/src/main/java/BESA/Remote/RemoteAdmBESA.java`

**Archivos Python a crear**:
- `besa/remote/rabbitmq_producer.py` → `pika` + exchange `besa.exchange`
- `besa/remote/rabbitmq_consumer.py` → consumer thread, deserializa JSON
- `besa/remote/discovery_consumer.py` → fanout `besa.discovery`
- `besa/remote/remote_adm.py` → extends LocalAdmBESA + RabbitMQ bootstrap

**Protocolo de mensajes** (JSON, compatible con Java):
```json
{
  "sender_id": "container-alias/agent-alias",
  "target_agent": "alias",
  "guard_class": "org.wpsim.PeasantFamily.Guards.FromMarketPlace.FromMarketPlaceGuard",
  "data": { },
  "priority": 5,
  "timestamp": 1730000000000
}
```

**Test de aceptación**: `test_java_to_python_remote.py` — Container Java envía evento a agente en Container Python, el guard Python lo procesa correctamente.

### Fase 6 — `besa/llm/` (2–3 sesiones)

**Archivos Python a crear**:
- `besa/llm/llm_client.py` → `httpx` client para llama-server
- `besa/llm/llm_broker.py` → Thread dedicado con `queue.Queue` interno
- `besa/llm/llm_cache.py` → LRU cache `dict` + `threading.Lock`
- `besa/llm/llm_goal_factory.py` → genera `GoalSpec` desde respuesta JSON del LLM
- `besa/llm/llm_social_reasoner.py` → para CommunityDynamics
- `besa/llm/prompt_templates.py` → t-strings Python 3.14 para cada caso de uso

**Test de aceptación**: `test_llm_fallback.py` — si llama-server no responde, el agente continúa su ciclo BDI sin LLM.

### Fase 7 — EthosTerra dominio (6–8 sesiones)

Portar los 9 agentes de dominio, en este orden (de menor a mayor complejidad):

| Orden | Agente | Guards | Complejidad |
|---|---|---|---|
| 1 | ViewerLens | 2 + WebSocket (`websockets` lib) | Baja |
| 2 | PerturbationGenerator | 2 | Baja |
| 3 | BankOffice | 3 | Media |
| 4 | CivicAuthority | 3 | Media |
| 5 | MarketPlace | 4 | Media |
| 6 | SimulationControl | 3 + reloj | Media |
| 7 | CommunityDynamics | 6 | Alta |
| 8 | AgroEcosystem | 5 + cellular automaton | Muy Alta |
| 9 | PeasantFamily | 30 guards + BDI completo | Muy Alta |

**PeasantFamilyBelieves**:
```python
# ethosterra/believes/peasant_family_believes.py
from pydantic import BaseModel, Field
import threading

class PeasantFamilyBelieves(BaseModel):
    # ~90 campos — equivalente a la clase Java de 800 LOC
    alias: str
    money: float = Field(ge=0)
    health: float = Field(ge=0, le=1)
    time_left_on_day: float = 1.0
    harvested_weight: float = 0.0
    days_to_work_for_other: int = 0
    # ... resto de campos

    _lock: threading.Lock = threading.Lock()  # protege acceso desde guards externos

    class Config:
        arbitrary_types_allowed = True
```

### Fase 8 — Tests de comparación y validación (3–4 sesiones)

1. Ejecutar `docker-compose.compare.yml` con semilla fija 42
2. Correr `compare_outputs.py` con tolerancia 15%
3. Ajustar parámetros hasta que K-S test pase
4. Configurar CI/CD: GitHub Actions ejecuta comparación en cada PR
5. Añadir profiling si throughput Python < 50% del Java

---

## 10. Ventajas de la migración

| # | Ventaja |
|---|---|
| 1 | **Python 3.14t sin GIL**: threads paralelos reales — mismo modelo que Java, sin overhead de procesos |
| 2 | **Memoria compartida entre agentes**: un agente puede leer el estado de otro directamente con lock |
| 3 | **T-strings Python 3.14**: prompts LLM type-safe sin Jinja2 — nativo del lenguaje |
| 4 | **YAML specs 100% reutilizables**: 71 archivos no cambian (mayor activo portable del proyecto) |
| 5 | **Framework genérico PyPI**: BESA Python reutilizable en cualquier dominio académico |
| 6 | **LLM on-premise**: llama.cpp sin costo de API, sin internet, reproducible con seed |
| 7 | **Metas emergentes**: el LLM crea GoalSpecs nuevas en runtime ante situaciones inéditas |
| 8 | **Testing riguroso**: dos versiones en paralelo → regresiones detectadas estadísticamente |
| 9 | **scikit-fuzzy** más madura que jFuzzylite para el GoalEngine |
| 10 | **Jupyter nativo**: análisis exploratorio de CSVs sin infraestructura extra |
| 11 | **Hot reload**: editar un guard = editar un `.py`, sin compilación |
| 12 | **Docker ~120 MB** vs JVM + Maven (~400 MB) |
| 13 | **`uv`**: gestor de paquetes 10–100x más rápido que pip |

---

## 11. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Python 3.14t más nuevo → menos librerías compatibles con no-GIL | Verificar `pika`, `pydantic`, `scikit-fuzzy`; usar versiones puras-Python si C extensions dan problemas |
| Performance inferior para loops numéricos | NumPy ya es no-GIL safe; profiling en Fase 8; PyPy como fallback para AgroEcosystem |
| Divergencia estadística Java vs Python | Tolerancia 15%; múltiples semillas aleatorias; ajuste fino en Fase 8 |
| LLM lento (CPU-only en dev) | Solo se llama raramente (1/30 días simulados por agente); LLMBroker serializa; cache LRU |
| LLM respuesta inválida | Grammar-constrained JSON output; fallback automático a BDI sin LLM |
| Reproducibilidad con LLM | `temperature=0, seed=42` en todos los tests; perfil Docker `--profile llm` opcional |
| Equivalencia semántica en concurrencia | Semillas fijas en todos los tests; múltiples corridas para validar distribuciones |

---

## 12. Archivos críticos Java para consultar al implementar

| Archivo | Para implementar |
|---|---|
| `KernelBESA/.../AgentBESA.java` | `besa/kernel/agent.py` |
| `KernelBESA/.../ChannelBESA.java` | loop principal del agent thread |
| `KernelBESA/.../MBoxBESA.java` | `besa/kernel/mbox.py` |
| `BDIBESA/.../AgentBDI.java` | `besa/bdi/agent_bdi.py` |
| `BDIBESA/.../DesireHierarchyPyramid.java` | `besa/bdi/desire_pyramid.py` |
| `wpsSimulator/.../DeclarativeGoal.java` | `besa/bdi/declarative/declarative_goal.py` |
| `wpsSimulator/.../GoalEngine.java` | `besa/bdi/declarative/goal_engine.py` |
| `wpsSimulator/.../PeasantFamilyBelieves.java` | `ethosterra/believes/peasant_family_believes.py` |
| `wpsSimulator/.../PeasantFamilyProfile.java` | `ethosterra/believes/peasant_family_profile.py` |
| `wpsSimulator/.../wpsStart.java` | `ethosterra/start.py` |
| `specs/goals/*.yaml` | Copiar directamente, sin cambios |
| `specs/plans/*.yaml` | Copiar directamente, sin cambios |

---

## 13. Instrucciones para agentes Claude Code que continúen este trabajo

1. **Leer este documento completo** antes de empezar cualquier implementación
2. **Verificar la fase actual**: consultar qué archivos Python ya existen en `besa-python/` y `ethosterra-python/`
3. **No reescribir lo que ya funciona**: si un archivo Python ya tiene tests pasando, no tocarlo
4. **Siempre consultar el Java de referencia** para cada clase antes de implementarla
5. **Tests primero** (TDD): escribir el test de aceptación antes de la implementación
6. **Nunca poner lógica de dominio en el framework**: `besa/` no debe importar nada de `ethosterra/`
7. **El LLM es opcional**: todo debe funcionar con `--profile llm` desactivado
8. **Mantener compatibilidad de protocolo RabbitMQ con Java**: mismo formato JSON de mensajes
9. **Python 3.14t**: verificar que no se use `multiprocessing` — solo `threading`
10. **YAML specs son sagrados**: no modificar los archivos en `specs/goals/` y `specs/plans/`
