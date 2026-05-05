# EthosTerra — Migración a Python 3.14t: Especificación Completa

> **Documento de referencia** para la reescritura de EthosTerra/BESA en Python 3.14t.
> Diseñado para ser retomado por agentes Claude Code en sesiones futuras.
> Estado: **IMPLEMENTACIÓN COMPLETA — Fases 0–8 finalizadas (sesiones 1–6)**

---

## 1. Resumen ejecutivo

| Aspecto | Detalle |
|---|---|
| **Proyecto origen** | EthosTerra (Java): simulador multi-agente BDI de familias campesinas colombianas |
| **Objetivo** | Reescribir el framework BESA + simulación en Python 3.14t free-threaded |
| **Lenguaje objetivo** | Python 3.14t (free-threaded, sin GIL) |
| **Lenguaje mínimo** | Python 3.13t (fallback funcional — PEP 703 experimental en 3.13, estable en 3.14) |
| **Repositorios** | `besa-python/` (framework genérico) + `ethosterra-python/` (dominio) |
| **Concurrencia** | `threading.Thread` con `PYTHON_GIL=0`; fallback `ProcessPoolExecutor` si GIL activo |
| **LLM local** | `llama-server` (llama.cpp) para metas emergentes y tejido social complejo |
| **Testing** | Ambas versiones Java y Python corren en paralelo; comparación estadística de outputs |
| **Esfuerzo estimado** | 24–34 sesiones Claude Code para sistema completo (incluye Fase 0 de auditoría) |
| **Estado actual** | 6 sesiones completadas (~95% del total) |
| **Python real** | 3.14.4 (GIL activo — no hay build free-threaded en el sistema) |
| **Código escrito** | ~100 archivos Python, 5,755 LOC (framework + dominio + scripts + tests) |
| **Tests** | 40/40 tests unitarios + integración pasan (5 suites) |
| **Simulación** | End-to-end: 366 días, 5 agentes, CSV semanal con 265 filas |
| **Comportamiento** | BDI ciclo completo: detección → selección → ejecución de planes → éxito |
| **Planes ejecutados** | 16 acciones del ActionRegistry desde YAML (consume_resource, emit_emotion, update_belief, etc.) |
| **YAML cargados** | 75 goals + 75 plans desde `data/ebdi/` |
| **Evaluador YAML** | StateProxy traduce camelCase Java → snake_case Python, operadores `&&`/`!`/ternarios |
| **Comunicación** | Inter-agent real: PeasantFamily ↔ BankOffice/MarketPlace/CivicAuthority/AgroEcosystem/CommunityDynamics |
| **Ciclo tierras** | PeasantFamily → CivicAuthority (asignación) → AgroEcosystem (cultivos MaizCell) |
| **WebSocket** | ViewerWSServer en puerto 8000 (formato q=/d=/j=/e=) |
| **CI/CD** | GitHub Actions workflow con 5 suites + smoke test |
| **Docker** | `Dockerfile.python` (python:3.14-slim, ~120MB) |

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

- **74 archivos YAML** (37 goals specs + 37 plan specs — detectados 75 incluyendo sample_experimental_goal)
- **`wpsUI/`** (Next.js frontend): solo adaptar las rutas API para invocar Python en vez de JAR
- **Protocolo RabbitMQ**: mismos exchanges `besa.exchange` y `besa.discovery`
- **Formato CSV de salida**: mismas columnas para compatibilidad con Analytics

---

## 3. Tecnologías Python 3.14t aprovechadas

### 3.1 Estrategia dual de concurrencia: free-threaded + fallback multiprocessing

**Objetivo principal**: Python 3.14t con `PYTHON_GIL=0`. Los `threading.Thread` corren en paralelo real en múltiples cores, replicando el modelo de BESA Java (un thread por agente) con memoria compartida nativa — sin el overhead de serialización de `multiprocessing`.

**Fallback**: El framework DEBE funcionar en Python 3.13t y detectar en runtime si el GIL está activo. Si `sys._is_gil_enabled()` retorna `True`, se usa `ProcessPoolExecutor` como plan B (menor rendimiento, pero funcional). Esto permite desarrollo temprano mientras el ecosistema no-GIL madura.

**Verificación de compatibilidad**: Antes de comenzar la implementación, ejecutar en Fase 0:

```bash
# Verificar que las dependencias críticas funcionan sin GIL
python3.13t -c "
import sys; print(f'GIL enabled: {sys._is_gil_enabled()}')
import pika, pydantic, scikit_fuzzy, simpleeval, sortedcontainers, numpy
print('OK: todas las dependencias importan')
"
```

**¿Por qué no 3.14t directamente?** — Python 3.13t ya existe (release Oct 2024) y permite empezar a desarrollar hoy. 3.14t (Oct 2025) es la versión objetivo donde PEP 703 sale de experimental a estable, y ~60-70% de wheels PyPI tendrán builds no-GIL para entonces.

```python
# Patrón de selección de executor en runtime
import sys
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

def get_executor(max_workers: int):
    if not sys._is_gil_enabled():
        return ThreadPoolExecutor(max_workers=max_workers)  # Ideal
    else:
        return ProcessPoolExecutor(max_workers=max_workers)  # Fallback

# Un agente = un thread (idéntico al modelo Java — modo ideal sin GIL)
agent_thread = threading.Thread(target=agent.run_loop, name=agent.alias)
agent_thread.start()
```

**Nota para C-extensions**: `scikit-fuzzy` es pure-Python desde v0.5 (sin riesgo). `pika` puede requerir verificación adicional — si falla en modo no-GIL, usar `aio-pika` como alternativa asíncrona.

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
│   │   ├── agent.py            ← threading.Thread + event loop
│   │   ├── event.py            ← @dataclass(slots=True) EventBESA
│   │   ├── mbox.py             ← wrapper queue.Queue
│   │   ├── guard.py            ← Protocol GuardBESA
│   │   ├── struct.py           ← dict de guard→behavior bindings
│   │   ├── adm.py              ← abstract AdmBESA
│   │   ├── guard_error_handler.py  ← captura excepciones sin matar agente
│   │   ├── poison_pill.py      ← evento especial de shutdown
│   │   ├── rng.py              ← AgentRNG thread-safe por agente
│   │   └── tracing.py          ← structlog + trace_id por simulación
│   ├── local/                  ← Contenedor single-machine (threading)
│   ├── remote/                 ← Distribución RabbitMQ (pika)
│   │   └── reconnect_policy.py ← reconexión automática con backoff
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
│   ├── output/                 ← CSVWriter, WebSocket serializers
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

### 4.5 Manejo de errores y shutdown graceful

Cada `AgentBESA` y el `AdmBESA` deben sobrevivir a fallos individuales sin detener la simulación completa.

**Archivos a crear en `besa/kernel/`**:

```python
# besa/kernel/guard_error_handler.py
class GuardErrorHandler:
    """Captura excepciones en guards sin matar el agente."""
    
    @staticmethod
    def handle(agent_alias: str, guard_name: str, error: Exception, event: EventBESA):
        logger.error(f"[{agent_alias}] Guard {guard_name} falló procesando evento {event.id}: {error}")
        # Registrar stack trace en log estructurado
        # NO re-lanzar la excepción — el agente continúa su loop
```

```python
# besa/kernel/poison_pill.py
@dataclass(slots=True)
class PoisonPill(EventBESA):
    """Evento especial que indica shutdown del agente."""
    pass

# En el loop del agente:
#   event = mbox.get(timeout=1.0)  # Timeout para no bloquearse en shutdown
#   if isinstance(event, PoisonPill):
#       break  # Salir del loop, thread termina
```

**Estrategia de shutdown**:
1. `AdmBESA.shutdown()` envía `PoisonPill` a todos los agentes
2. Cada agente termina su thread después de procesar el `PoisonPill`
3. `AdmBESA` espera `join(timeout=5.0)` en cada thread
4. Si algún thread no termina, se fuerza `daemon=True` y el proceso sale
5. `RemoteAdmBESA`: cerrar canales RabbitMQ antes del shutdown

**Política de reconexión RabbitMQ** (`besa/remote/reconnect_policy.py`):

```python
# pika usa SelectConnection (NO BlockingConnection) con reconnect automático
class ReconnectPolicy:
    max_retries: int = 10
    base_delay: float = 1.0  # segundos
    max_delay: float = 30.0  # backoff exponencial

    def on_connection_closed(self, connection, reason):
        delay = min(self.base_delay * (2 ** self.attempts), self.max_delay)
        logger.warning(f"RabbitMQ desconectado: {reason}. Reconectando en {delay}s...")
        threading.Timer(delay, self._reconnect).start()
```

### 4.6 RNG thread-safe por agente (sin GIL)

`random.seed()` global NO es thread-safe sin GIL. Cada agente necesita su propia instancia de `random.Random`, inicializada determinísticamente desde una seed raíz.

```python
# besa/kernel/rng.py
import random
from typing import Dict

class AgentRNG:
    """Generador de números aleatorios thread-safe por agente."""
    
    _instances: Dict[str, random.Random] = {}
    
    @classmethod
    def for_agent(cls, agent_alias: str, root_seed: int = 42) -> random.Random:
        """Deriva una semilla única por agente: root_seed + hash(alias)."""
        if agent_alias not in cls._instances:
            agent_seed = root_seed + hash(agent_alias) % 2**31
            rng = random.Random(agent_seed)
            cls._instances[agent_alias] = rng
            logger.info(f"RNG inicializado: {agent_alias} seed={agent_seed}")
        return cls._instances[agent_alias]
```

**Uso**: `rng = AgentRNG.for_agent(self.alias, root_seed=42)` en cada agente. Nunca usar `random.seed()` global ni `random.random()` — siempre pasar por `AgentRNG`.

### 4.7 Logging estructurado con structlog + tracing

Toda simulación genera un `trace_id` único para correlacionar logs entre agentes. Se usa `structlog` con output JSON.

```python
# besa/kernel/tracing.py
import structlog
import uuid

logger = structlog.get_logger()

def new_simulation_trace() -> str:
    """Genera trace_id único por simulación."""
    trace_id = str(uuid.uuid4())[:8]
    structlog.contextvars.bind_contextvars(trace_id=trace_id)
    return trace_id

def bind_agent(alias: str):
    """Vincula contexto de agente al logger."""
    structlog.contextvars.bind_contextvars(agent=alias)
```

**Archivo a crear**: `besa/kernel/tracing.py` (20 LOC).

**Configuración en pyproject.toml**:
```toml
[project.optional-dependencies]
dev = ["pytest>=8.3", "mypy>=1.12", "ruff>=0.9", "pytest-cov>=5.0", "structlog>=24.0"]
```

### 4.8 CSV Writer para compatibilidad con wpsUI

El frontend `wpsUI` espera leer el CSV de salida con las mismas columnas que produce el JAR actual. Se necesita un writer en Python que replique exactamente el formato.

```python
# ethosterra/output/csv_writer.py
import csv
import threading
from pathlib import Path

class CSVWriter:
    """Replica el formato de wpsSimulator.csv del Java."""
    
    COLUMNS = [
        "date", "agent", "money", "health", "happiness", "emotion",
        "current_goal", "harvested_weight", "lands_count", "loans_active",
        "days_in_crisis", "social_capital", "food_security", "task_log"
    ]
    
    def __init__(self, output_path: Path):
        self._lock = threading.Lock()
        self._file = open(output_path, "w", newline="")
        self._writer = csv.DictWriter(self._file, fieldnames=self.COLUMNS)
        self._writer.writeheader()
    
    def write_row(self, row: dict):
        with self._lock:
            self._writer.writerow(row)
            self._file.flush()  # Para que wpsUI vea datos en tiempo real
    
    def close(self):
        self._file.close()
```

**Ubicación**: `ethosterra/output/csv_writer.py`. Usado por `ViewerLens` y `PeasantFamily` al emitir episodios semanales.

### 4.9 Convención de diseño: Protocol vs ABC

Para evitar ambigüedad en el framework:

| Usar `Protocol` | Usar `ABC` |
|---|---|
| Interfaces puras (contratos): `GoalBDI`, `Believes` | Clases base con código compartido: `GuardBESA`, `AgentBESA` |
| No heredan implementación | Heredan métodos concretos + hooks abstractos |
| `isinstance()` duck-typing | `isinstance()` estricto |

**Ejemplo**:
```python
# Protocol — interfaz (no heredar, solo implementar)
class BDIEvaluable(Protocol):
    def detect_goal(self, believes: Believes) -> float: ...
    def evaluate_viability(self, believes: Believes) -> float: ...
    def goal_succeeded(self, believes: Believes) -> bool: ...

# ABC — clase base con lógica compartida
class GuardBESA(ABC):
    @abstractmethod
    def func_exec_guard(self, event: EventBESA) -> None: ...
    
    def get_state(self) -> StateBESA:  # Implementado
        return self._agent.state
```

**Lista completa de qué es cada tipo**:
- `Protocol`: `BDIEvaluable`, `Believes`, `PrimitiveAction`
- `ABC`: `GuardBESA`, `AgentBESA`, `AdmBESA`, `GoalBDI` (si hereda de `BDIEvaluable` + lógica), `Task`, `EmotionalModel`

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

### 6.3 LLMBroker Thread — con circuit breaker y rate limiting

```python
# besa/llm/llm_broker.py — Thread único con protecciones
import time
import httpx
import threading
from dataclasses import dataclass, field

@dataclass
class CircuitBreaker:
    """Corta llamadas LLM tras fallos consecutivos."""
    failure_count: int = 0
    failure_threshold: int = 3
    cooldown_seconds: float = 60.0
    last_failure_time: float = 0.0
    state: str = "closed"  # closed | open | half-open

    def record_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.monotonic()
        if self.failure_count >= self.failure_threshold:
            self.state = "open"
            logger.error(f"Circuit breaker OPEN — LLM desactivado por {self.cooldown_seconds}s")

    def is_open(self) -> bool:
        if self.state == "closed":
            return False
        if self.state == "open":
            if time.monotonic() - self.last_failure_time > self.cooldown_seconds:
                self.state = "half-open"
                self.failure_count = 0
                return False
            return True
        return False  # half-open: permitir un intento

    def record_success(self):
        self.state = "closed"
        self.failure_count = 0

@dataclass
class AgentRateLimiter:
    """Máximo 1 request LLM cada N ticks simulados por agente."""
    last_request_tick: dict[str, int] = field(default_factory=dict)
    min_ticks_between_requests: int = 30  # días simulados

    def is_allowed(self, agent_alias: str, current_tick: int) -> bool:
        last = self.last_request_tick.get(agent_alias, -999)
        return (current_tick - last) >= self.min_ticks_between_requests

    def record_request(self, agent_alias: str, current_tick: int):
        self.last_request_tick[agent_alias] = current_tick

class LLMBroker(threading.Thread):
    """Serializa requests LLM: evita saturar llama-server con N agentes simultáneos."""

    def __init__(self, server_url: str):
        super().__init__(name="LLMBroker", daemon=True)
        self.request_queue: queue.Queue[LLMRequest] = queue.Queue()
        self.client = httpx.Client(timeout=30.0)  # Timeout explícito
        self.cache = LLMCache(max_size=500)
        self.circuit_breaker = CircuitBreaker()
        self.rate_limiter = AgentRateLimiter()

    def run(self):
        while True:
            request = self.request_queue.get()
            
            # Rate limiting por agente
            if not self.rate_limiter.is_allowed(request.agent_alias, request.tick):
                continue  # Descartar; el agente puede reintentar en el futuro
            
            # Circuit breaker: si el LLM falló >3 veces, dejar de llamar
            if self.circuit_breaker.is_open():
                self._dispatch_fallback(request, reason="circuit_breaker_open")
                continue
            
            cache_key = request.cache_key()
            if (cached := self.cache.get(cache_key)) is not None:
                self._dispatch_response(request, cached)
                self.rate_limiter.record_request(request.agent_alias, request.tick)
                continue
            
            try:
                response = self.client.complete(request)  # HTTP a llama-server
                response.raise_for_status()
                self.circuit_breaker.record_success()
            except httpx.TimeoutException as e:
                logger.warning(f"LLM timeout: {e}")
                self.circuit_breaker.record_failure()
                self._dispatch_fallback(request, reason="timeout")
                continue
            except Exception as e:
                logger.error(f"LLM error: {e}")
                self.circuit_breaker.record_failure()
                self._dispatch_fallback(request, reason="error")
                continue
            
            self.cache.put(cache_key, response)
            self.rate_limiter.record_request(request.agent_alias, request.tick)
            self._dispatch_response(request, response)

    def _dispatch_fallback(self, req: LLMRequest, reason: str):
        """Fallback: el agente continúa su BDI sin LLM."""
        logger.info(f"[{req.agent_alias}] LLM no disponible ({reason}) — BDI opera sin LLM")
        # El evento nunca se envía; CrisisDetectionGuard simplemente no recibe respuesta

    def _dispatch_response(self, req: LLMRequest, resp: LLMResponse):
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
requires-python = ">=3.13"
description = "BESA multi-agent BDI framework in Python 3.14t free-threaded"
license = {text = "LGPL-2.1"}

dependencies = [
    "pydantic>=2.9",
    "pyyaml>=6.0",
    "sortedcontainers>=2.4",
    "simpleeval>=1.0",
]

[project.optional-dependencies]
fuzzy   = ["scikit-fuzzy>=0.5", "numpy>=2.1"]   # scikit-fuzzy 0.5+ es pure-Python
remote  = ["pika>=1.3"]                          # verificar compatibilidad no-GIL; fallback: aio-pika
llm     = ["httpx>=0.27"]
dev     = ["pytest>=8.3", "mypy>=1.12", "ruff>=0.9", "pytest-cov>=5.0", "structlog>=24.0"]

[tool.uv]
python = "3.14t"    # free-threaded build (objetivo)

[tool.mypy]
python_version = "3.14"
strict = true

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "ANN"]

[tool.pytest.ini_options]
addopts = "-v --tb=short --strict-markers"
markers = [
    "slow: tests que requieren >1s",
    "integration: tests que requieren RabbitMQ o llama-server",
    "llm: tests que requieren llama-server activo",
]
```

### 7.2 .python-version

```
3.14t
```

### 7.3 Dockerfile (BESA Python) — multi-stage con uv

```dockerfile
# Stage 1: Build de dependencias
FROM python:3.14t-slim AS builder

WORKDIR /app
COPY pyproject.toml .
RUN pip install uv && uv sync --no-dev --frozen

# Stage 2: Imagen final mínima (~120 MB)
FROM python:3.14t-slim

ENV PYTHON_GIL=0 \
    PYTHONUNBUFFERED=1 \
    WPS_GOALS_DIR=/app/specs/goals \
    WPS_PLANS_DIR=/app/specs/plans

WORKDIR /app
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

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
import numpy as np

def compare_simulations(java_csv: str, python_csv: str, tolerance: float = 0.15):
    java = pd.read_csv(java_csv)
    python = pd.read_csv(python_csv)

    # Todas las métricas usan K-S (más robusto para distribuciones no-normales)
    metrics = {
        "money_final":       ("money", stats.ks_2samp),
        "health_avg":        ("health", stats.ks_2samp),
        "harvests_count":    ("harvested_weight", stats.ks_2samp),
        "loans_active":      ("loans_active", stats.ks_2samp),
        "food_security":     ("food_security", stats.ks_2samp),
        "days_in_crisis":    ("days_in_crisis", stats.ks_2samp),
    }

    results = {}
    for name, (col, test_fn) in metrics.items():
        stat, p_value = test_fn(java[col].dropna(), python[col].dropna())
        passed = p_value > 0.05  # No hay diferencia estadística significativa
        mean_diff = abs(java[col].mean() - python[col].mean()) / max(java[col].mean(), 0.01)
        results[name] = {"statistic": stat, "p_value": p_value, "mean_diff_pct": mean_diff, "passed": passed}

    # Correlación temporal: ¿las series siguen la misma tendencia?
    for col in ["money", "health", "food_security"]:
        java_ts = java.groupby("date")[col].mean()
        py_ts = python.groupby("date")[col].mean()
        # Alinear fechas
        common = java_ts.index.intersection(py_ts.index)
        if len(common) > 10:
            corr = java_ts[common].corr(py_ts[common])
            results[f"temporal_corr_{col}"] = {"correlation": corr, "passed": corr > 0.8}

    failed = [k for k, v in results.items() if not v.get("passed", False)]
    if failed:
        print(f"FAIL: Métricas fuera de tolerancia: {failed}")
        print(results)
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
│   ├── test_ethosterra_1yr.py           # 1 año, 5 campesinos, produce CSV válido
│   ├── test_peasant_survival.py         # PeasantFamily: prioriza L1 sobre L5
│   └── test_full_peasant_lifecycle.py   # 1 campesino × 3 años, todos los niveles BDI
└── comparison/
    └── test_statistical_equivalence.py  # Llama a compare_outputs.py
```

---

## 9. Plan de implementación por fases

### ✅ Fase 0 — Auditoría de compatibilidad no-GIL (COMPLETADA)

**Python 3.14.4** disponible. GIL activo (no hay `python3.14t`). Dependencias verificadas:
- `pydantic` 2.13.3, `pyyaml` 6.0.3, `pika` 1.3.2, `simpleeval` 1.0.7, `sortedcontainers` 2.4.0, `structlog` 25.5.0, `numpy` 2.4.4, `httpx` 0.28.1
- `scikit-fuzzy` 0.5.0 (pure-Python, sin riesgo GIL)
- Fallback `ProcessPoolExecutor` implementado en el patrón `get_executor()`

### ✅ Fase 1 — `besa/kernel/` + `besa/local/` (COMPLETADA — 12 archivos, 290 LOC)

**Archivos creados**:
- `besa/kernel/event.py` → `@dataclass(slots=True)` EventBESA con id, prioridad, guard_type, data
- `besa/kernel/mbox.py` → wrapper `queue.Queue` con timeout y threading.Event
- `besa/kernel/guard.py` → `ABC` GuardBESA con `func_exec_guard()` abstracto
- `besa/kernel/agent.py` → `threading.Thread` + event loop + PoisonPill shutdown
- `besa/kernel/struct.py` → dict guard_type→binding
- `besa/kernel/adm.py` → abstract AdmBESA + singleton `_instance`
- `besa/kernel/guard_error_handler.py` → captura excepciones sin matar agente
- `besa/kernel/poison_pill.py` → `@dataclass(slots=True)` EventBESA de shutdown
- `besa/kernel/rng.py` → `AgentRNG` thread-safe por agente (seed = root_seed + hash(alias))
- `besa/kernel/tracing.py` → `structlog` + trace_id por simulación
- `besa/local/local_adm.py` → LocalAdmBESA con `dict + threading.RLock`
- `besa/local/local_directory.py` → directorio thread-safe

**Tests**: PingPong 2 agentes, throughput benchmark, agente lifecycle

### ✅ Fase 2 — `besa/rational/` (COMPLETADA — 5 archivos, 170 LOC)

- `besa/rational/believes.py` → Protocol + ABC Believes
- `besa/rational/task.py` → ABC Task con `execute(believes) → bool`
- `besa/rational/plan.py` → DAG de Tasks con ejecución por lotes
- `besa/rational/rational_role.py` → binding role_name → Plan
- `besa/rational/rational_agent.py` → extends AgentBESA, registra 3 guards automáticos

### ✅ Fase 3 — `besa/bdi/` + sistema declarativo (COMPLETADA — 13 archivos, 543 LOC)

- `besa/bdi/goal_bdi.py` → Protocol BDIEvaluable + ABC GoalBDI
- `besa/bdi/goal_bdi_types.py` → Enum 6 niveles (SURVIVAL...ATTENTION_CYCLE)
- `besa/bdi/desire_pyramid.py` → 6 tiers con sortedcontainers
- `besa/bdi/bdi_machine.py` → 4 fases (Detect → Evaluate → Score → Select)
- `besa/bdi/agent_bdi.py` → extends RationalAgent + BDIDetectGuard
- `besa/bdi/declarative/goal_spec.py` → `@dataclass` GoalSpec
- `besa/bdi/declarative/plan_spec.py` → `@dataclass` PlanSpec con StepSpec
- `besa/bdi/declarative/goal_registry.py` → singleton, carga YAML con tolerancia a campos extra
- `besa/bdi/declarative/plan_registry.py` → singleton, carga YAML con StepSpec
- `besa/bdi/declarative/declarative_goal.py` → YAML → GoalBDI con simpleeval, fallback auto-generated spec
- `besa/bdi/declarative/goal_engine.py` → scikit-fuzzy wrapper
- `besa/bdi/declarative/action_registry.py` → 16 acciones registradas

**YAML cargados**: 75 goals + 75 planes desde `data/ebdi/goals/` y `data/ebdi/plans/`

### ✅ Fase 4 — `besa/ebdi/` modelo emocional (COMPLETADA — 4 archivos, 111 LOC)

- `besa/ebdi/emotional_event.py` → EmotionalEvent + EmotionalState (8 ejes)
- `besa/ebdi/emotional_model.py` → ABC con `process_emotional_event()`
- `besa/ebdi/semantic_dictionary.py` → singleton

### ✅ Fase 5 — `besa/remote/` distribución RabbitMQ (COMPLETADA — 5 archivos, 377 LOC)

- `besa/remote/rabbitmq_producer.py` → pika BlockingConnection + exchange `besa.exchange`
- `besa/remote/rabbitmq_consumer.py` → SelectConnection thread, cola `besa.container.<alias>`
- `besa/remote/discovery_consumer.py` → fanout exchange `besa.discovery`
- `besa/remote/remote_adm.py` → extends LocalAdmBESA + RabbitMQ bootstrap + auto-discovery
- `besa/remote/reconnect_policy.py` → backoff exponencial

### ✅ Fase 6 — `besa/llm/` (COMPLETADA — 4 archivos, 191 LOC)

- `besa/llm/llm_client.py` → LLMRequest/LLMResponse dataclasses
- `besa/llm/llm_cache.py` → LRU cache thread-safe
- `besa/llm/llm_broker.py` → Thread con CircuitBreaker, AgentRateLimiter, fallback silencioso

### ✅ Fase 7 — EthosTerra dominio (COMPLETADA — 29 archivos, 1,807 LOC)

**ANTES de escribir cualquier código Python**, verificar que las dependencias críticas funcionan en modo free-threading:

```bash
# 1. Instalar Python 3.13t (ya disponible) o 3.14t según disponibilidad
# 2. Verificar imports sin GIL
python3.13t -c "
import sys
print(f'Python {sys.version}')
print(f'GIL enabled: {sys._is_gil_enabled()}')
import pika; print('pika: OK')
import pydantic; print('pydantic: OK')
import scikit_fuzzy; print('scikit-fuzzy: OK')
import simpleeval; print('simpleeval: OK')
import sortedcontainers; print('sortedcontainers: OK')
import numpy; print('numpy: OK')
import structlog; print('structlog: OK')
print('Todas las dependencias importan correctamente')
"

# 3. Si pika falla → documentar aio-pika como alternativa
# 4. Si numpy falla → esperar wheel no-GIL (Python 3.14t lo tendrá)
# 5. Actualizar pyproject.toml con las versiones exactas verificadas
```

**Resultado esperado**: lista de dependencias compatibles y sus versiones exactas, documentadas en un `requirements-checked.txt`.

### Fase 1 — `besa/kernel/` + `besa/local/` (3–4 sesiones)

**Archivos Java de referencia**:
- `KernelBESA/src/main/java/BESA/Kernel/Agent/AgentBESA.java`
- `KernelBESA/src/main/java/BESA/Kernel/Agent/ChannelBESA.java`
- `KernelBESA/src/main/java/BESA/Kernel/Agent/MBoxBESA.java`
- `LocalBESA/src/main/java/BESA/Local/LocalAdmBESA.java`

**Archivos Python a crear**:
- `besa/kernel/event.py` → `@dataclass(slots=True)` EventBESA
- `besa/kernel/mbox.py` → wrapper `queue.Queue`
- `besa/kernel/guard.py` → `Protocol` GuardBESA
- `besa/kernel/agent.py` → `threading.Thread` + event loop
- `besa/kernel/struct.py` → dict de guard→behavior bindings
- `besa/kernel/adm.py` → abstract AdmBESA
- `besa/kernel/guard_error_handler.py` → captura excepciones sin matar agente
- `besa/kernel/poison_pill.py` → evento especial de shutdown
- `besa/kernel/rng.py` → `AgentRNG` thread-safe por agente
- `besa/kernel/tracing.py` → `structlog` + trace_id por simulación
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
- `besa/remote/reconnect_policy.py` → reconexión automática con backoff exponencial

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

### Fase 7 — EthosTerra dominio (12–16 sesiones total)

Esta es la fase más grande. Se divide en sub-fases para paralelizar entre sesiones.

#### ✅ Fase 7a — Infraestructura de dominio + agentes simples (COMPLETADA)

| Agente | Guards | Archivo Python | LOC |
|---|---|---|---|
| CSVWriter | — | `ethosterra/output/csv_writer.py` | 26 |
| SimulationClock | — | `ethosterra/simulation_clock.py` | 53 |
| SimulationParams | — | `ethosterra/simulation_params.py` | 28 |
| `start.py` | — | `ethosterra/start.py` (argparse CLI) | 155 |
| SimulationControl | SimulationControlGuard | `ethosterra/agents/simulation_control.py` | 77 |
| ViewerLens | ViewerLensGuard + WS format | `ethosterra/agents/viewer_lens.py` | 55 |
| PerturbationGenerator | PerturbationGeneratorGuard | `ethosterra/agents/perturbation_generator.py` | 59 |
| BankOffice | BankOfficeGuard + FromBankOfficeGuard | `ethosterra/agents/bank_office.py` | 162 |
| CivicAuthority | CivicAuthorityLandGuard | `ethosterra/agents/civic_authority.py` | 144 |
| MarketPlace | MarketPlaceGuard + FromMarketPlaceGuard | `ethosterra/agents/market_place.py` | 128 |

#### ✅ Fase 7b — AgroEcosystem + CommunityDynamics (COMPLETADA)

**CommunityDynamics** (112 LOC): Contratos laborales, oferta/request de trabajadores, colaboración social.

**AgroEcosystem** (367 LOC): Automaton celular con modelo FAO-56:
- `CropCell` base + 4 tipos concretos: `CafeCell` (perenne), `MaizCell`, `FrijolCell`, `PlatanoCell` (perenne)
- Parámetros FAO-56: Kc_ini/mid/end, GDD_mid/end, TAW/RAW, p fraction
- Crecimiento: GDD diario → fase inicial/media/final → Kc → ETc → biomasa
- Estrés hídrico: Ks coefficient, root zone depletion
- `AgroEcosystemGuard`: maneja CROP_INIT, CROP_INFORMATION, CROP_IRRIGATION, CROP_PESTICIDE, CROP_HARVEST
- Capas ambientales: temperatura, radiación, ET₀, lluvia mensual
- Enfermedad: infección probabilística por célula

#### ✅ Fase 7c — PeasantFamilyBelieves + Profile (COMPLETADA)

`PeasantFamilyBelieves` (95 LOC): `pydantic.BaseModel` con ~50 campos:
- Económicos: money, initial_money, tools, seeds, water_available, pesticides, livestock, supplies
- Salud/bienestar: health, happiness, food_security, emotion, days_in_crisis
- BDI: current_goal, task_log, new_day, purpose, training_level
- Social: social_capital, peasant_family_affinity, criminality_affinity, contractor
- Préstamos: have_loan, to_pay, loan_denied
- Tierras: lands: list[Land], farm_name
- Métodos: `to_summary()`, `is_new_day()`, `is_in_crisis()`, `is_in_prolonged_crisis()`, `get_lands_state()`, `has_land_with_stage()`

#### ✅ Fase 7d — Guards de comunicación entre agentes (COMPLETADA — 8 archivos)

| Guard | Archivo | Función |
|---|---|---|
| `FromSimulationControlGuard` | `guards/from_simulation_control.py` | Sincroniza flag `wait` del control |
| `FromBankOfficeGuard` | `guards/from_bank_office.py` | Procesa respuestas de préstamos (aprobado/denegado/cuota/pagado) |
| `FromMarketPlaceGuard` | `guards/from_market_place.py` | Procesa compras (semillas, agua, pesticidas, herramientas) |
| `FromCivicAuthorityGuard` | `guards/from_civic_authority.py` | Asignación de tierras, entrenamiento |
| `FromCivicAuthorityTrainingGuard` | `guards/from_civic_authority.py` | Marca training_available |
| `FromAgroEcosystemGuard` | `guards/from_agro_ecosystem.py` | Recibe notificaciones del mundo (stress hídrico, enfermedad, cosecha) |
| `SocietyWorkerContractGuard` (+3) | `guards/from_community_dynamics.py` | Contratos laborales |
| `HeartBeatGuard` | `guards/heart_beat.py` | Pulso BDI diario + alive ping |
| `StatusGuard` | `guards/status.py` | Consultas de estado |

#### ✅ Fase 7e — PeasantFamily BDI (COMPLETADA)

`PeasantFamily` (105 LOC): Extiende `AgentBDI`:
- 11 guards registrados automáticamente
- 36 goals cargados desde YAML via `DeclarativeGoal.build()`
- `process_day()` → tick_bdi + alive ping
- Se integra con SimulationClock para avance temporal

#### ✅ Fase 7f — Integración BDI completa con YAML specs (COMPLETADA)

- **75 GoalSpec** + **75 PlanSpec** cargados desde `data/ebdi/goals/` y `data/ebdi/plans/`
- GoalRegistry/PlanRegistry con lookup multi-ruta (WPS_GOALS_DIR, ETHOSTERRA_ROOT, rutas relativas)
- Tolerancia a campos extra en YAML (version, sub_level, effects, normative_tags, binds, etc.)
- `DeclarativeGoal.build()` con fallback auto-generated spec si no hay YAML
- Simpleeval para evaluar `activation_when` en runtime
- `ActionRegistry` con 16 acciones primitivas

### ✅ Fase 8 — Tests de comparación y validación (COMPLETADA)

1. `scripts/compare_outputs.py` implementado con test K-S (Kolmogorov-Smirnov) para 6 métricas + correlación temporal
2. `docker-compose.compare.yml` configurado para ejecutar comparación Java vs Python
3. Self-test: comparación Python vs Python pasa (p=1.0, diff=0%)
4. Simulación end-to-end funcional: `start.py --agents 2 --years 1` produce 265 filas CSV
5. CI/CD: GitHub Actions workflow (`.github/workflows/python-ci.yml`) con 5 suites de test + smoke test de 1 año
6. Dockerfile: `Dockerfile.python` (python:3.14-slim, ~120MB)
7. `WorldConfiguration` y `MonthlyDataLoader` portados para --world parameter
8. WebSocket server: `ViewerWSServer` (puerto 8000, formato q=/d=/j=/e=)

## Estado actual de los tests

| Suite | Tests | Pasados | Framework |
|---|---|---|---|
| `tests/unit/test_kernel.py` | 2 (PingPong + throughput) | 2/2 | besa-python |
| `tests/integration/test_full_stack.py` | 9 (RNG, kernel, rational, BDI, eBDI, lifecycle) | 9/9 | besa-python |
| `tests/integration/test_domain.py` | 10 (servicio, clock, believes, comunicación) | 10/10 | ethosterra-python |
| `tests/integration/test_full_system.py` | 12 (full startup, AgroEcosystem, guards, YAML, goals) | 12/12 | ethosterra-python |
| `tests/integration/test_plan_execution.py` | 7 (PlanExecutor, BDI cycle, resource depletion, goal selection) | 7/7 | ethosterra-python |
| **Total** | **38 tests (5 suites)** | **38/38** | — |

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
| Python 3.14t más nuevo → menos librerías compatibles con no-GIL | **Verificar en Fase 0** con `python3.13t -c "import pika, pydantic, ..."`. Si `pika` falla, usar `aio-pika`. `scikit-fuzzy >=0.5` es pure-Python (sin riesgo). `numpy` tendrá wheel no-GIL para 3.14t. |
| Dependencia C-extension incompatible con free-threading | **Fase 0: audit temprano**. Mantener `pika >= 1.3`; si no compila sin GIL, `aio-pika` como reemplazo. Para `llama.cpp` bindings, usar `httpx` (pure-Python) contra el server HTTP, no bindings C directos. |
| Performance inferior para loops numéricos | NumPy ya es no-GIL safe; profiling en Fase 8; PyPy como fallback para AgroEcosystem |
| Divergencia estadística Java vs Python | Tolerancia 15%; múltiples semillas aleatorias; ajuste fino en Fase 8; K-S uniforme para todas las métricas |
| LLM lento (CPU-only en dev) | Solo se llama raramente (1/30 días simulados por agente); LLMBroker serializa; circuit breaker + rate limiter; cache LRU |
| LLM respuesta inválida | Grammar-constrained JSON output; fallback automático a BDI sin LLM (circuit breaker) |
| Reproducibilidad con LLM | `temperature=0, seed=42` en todos los tests; perfil Docker `--profile llm` opcional |
| Equivalencia semántica en concurrencia | Semillas fijas con `AgentRNG` thread-safe; múltiples corridas para validar distribuciones |
| Python 3.14t no disponible a tiempo | **Desarrollo en 3.13t desde el día 1**. Si 3.14t se retrasa, el framework funciona con `ProcessPoolExecutor` (menor rendimiento, mismo comportamiento). |

---

## 12. Archivos críticos Java para consultar al implementar

| Archivo Java | Para implementar en Python |
|---|---|
| `KernelBESA/.../AgentBESA.java` | `besa/kernel/agent.py` |
| `KernelBESA/.../ChannelBESA.java` | loop principal del agent thread |
| `KernelBESA/.../MBoxBESA.java` | `besa/kernel/mbox.py` |
| `BDIBESA/.../AgentBDI.java` | `besa/bdi/agent_bdi.py` |
| `BDIBESA/.../DesireHierarchyPyramid.java` | `besa/bdi/desire_pyramid.py` |
| `BDIBESA/.../StateBDI.java` | `besa/bdi/state_bdi.py` |
| `wpsSimulator/.../DeclarativeGoal.java` | `besa/bdi/declarative/declarative_goal.py` |
| `wpsSimulator/.../GoalEngine.java` | `besa/bdi/declarative/goal_engine.py` |
| `wpsSimulator/.../GoalRegistry.java` | `besa/bdi/declarative/goal_registry.py` |
| `wpsSimulator/.../PlanRegistry.java` | `besa/bdi/declarative/plan_registry.py` |
| `wpsSimulator/.../PeasantFamilyBelieves.java` | `ethosterra/believes/peasant_family_believes.py` |
| `wpsSimulator/.../PeasantFamilyProfile.java` | `ethosterra/believes/peasant_family_profile.py` |
| `wpsSimulator/.../PeasantFamily.java` | `ethosterra/agents/peasant_family.py` |
| `wpsSimulator/.../AgroEcosystem.java` | `ethosterra/agents/agro_ecosystem.py` |
| `wpsSimulator/.../ViewerLens.java` | `ethosterra/agents/viewer_lens.py` |
| `wpsSimulator/.../wpsStart.java` | `ethosterra/start.py` |
| `wpsSimulator/.../CSVManager.java` | `ethosterra/output/csv_writer.py` |
| `RemoteBESA/.../RabbitMQManager.java` | `besa/remote/rabbitmq_producer.py` + `rabbitmq_consumer.py` |

| Archivos YAML (sin cambios) | Ubicación destino |
|---|---|
| `specs/goals/*.yaml` | `specs/goals/` (copiar directamente) |
| `specs/plans/*.yaml` | `specs/plans/` (copiar directamente) |
| `specs/config/goal_pyramid.yaml` | `config/goal_pyramid.yaml` |
| `specs/config/BeliefSchema.json` | `config/BeliefSchema.json` |

---

## 13. Instrucciones para agentes Claude Code que continúen este trabajo

1. **Leer este documento completo** antes de empezar cualquier implementación
2. **Verificar la fase actual**: consultar qué archivos Python ya existen en `besa-python/` y `ethosterra-python/`
3. **No reescribir lo que ya funciona**: si un archivo Python ya tiene tests pasando, no tocarlo
4. **Siempre consultar el Java de referencia** para cada clase antes de implementarla (sección 12)
5. **Tests primero** (TDD): escribir el test de aceptación antes de la implementación
6. **Nunca poner lógica de dominio en el framework**: `besa/` no debe importar nada de `ethosterra/`
7. **El LLM es opcional**: todo debe funcionar con `--profile llm` desactivado
8. **Mantener compatibilidad de protocolo RabbitMQ con Java**: mismo formato JSON de mensajes
9. **Verificar `sys._is_gil_enabled()` en runtime**: el framework debe funcionar con y sin GIL
10. **YAML specs son sagrados**: no modificar los archivos en `specs/goals/` y `specs/plans/`
11. **Cada agente usa su propio RNG**: `AgentRNG.for_agent(alias, root_seed)` — nunca `random.seed()` global
12. **Los guards nunca lanzan excepciones no capturadas**: usar `GuardErrorHandler.handle()` dentro del event loop
13. **Shutdown siempre usa PoisonPill**: no matar threads con `terminate()` — enviar `PoisonPill` al inbox
14. **Usar `Protocol` para interfaces, `ABC` solo cuando hay código compartido** (ver sección 4.9)
15. **El CSV de salida debe tener exactamente las mismas columnas** que el Java para que wpsUI funcione sin cambios (`CSVWriter` en `ethosterra/output/`)
16. **Si `pika` no compila sin GIL**, usar `aio-pika` como alternativa (documentado en sección 3.1)
17. **Loggear con `structlog`**: cada evento BDI importante debe tener `trace_id`, `agent`, y `tick` como contexto
18. **No usar `multiprocessing`**: si GIL activo, usar `ProcessPoolExecutor` solo en el executor de planes; los agentes siempre son threads
