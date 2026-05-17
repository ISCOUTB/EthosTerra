# Generación de Informes en EthosTerra — Documentación Técnica

> **Audiencia:** Desarrolladores y técnicos que necesiten entender, mantener o extender el pipeline de análisis automático de EthosTerra.

---

## 1. Visión general

El módulo de generación de informes convierte los archivos CSV que produce el simulador (datos brutos de las familias campesinas) en un informe HTML narrado por un modelo de lenguaje (LLM). El proceso corre como un subproceso independiente disparado desde la UI o desde la línea de comandos, y puede operar en dos modos:

| Modo | Descripción | Llamadas LLM por tratamiento |
|------|-------------|------------------------------|
| **episodes** | Detecta eventos clave (crisis, cosecha, préstamo…) y analiza cada uno en una ventana temporal de ±10 semanas | 3 llamadas × N episodios detectados |
| **monthly** | Agrega los datos semana a semana en tablas mensuales y entrega toda la trayectoria al LLM en una sola llamada | 1 llamada |

Todos los archivos relevantes viven en `experiments/analysis/`.

```
experiments/analysis/
├── orchestrator.py          ← punto de entrada CLI
├── react_loop.py            ← Plan + Tasks (el "cerebro" del pipeline)
├── state.py                 ← objetos de estado compartido
├── agents/
│   ├── analysis_agent.py    ← fachada coordinadora
│   ├── executive_agent.py   ← resumen ejecutivo global
│   ├── comparison_agent.py  ← análisis Taguchi cruzado
│   └── technical_agent.py   ← ensamble de secciones HTML por episodio
├── tools/
│   ├── data_tool.py         ← lectura CSV, detección de episodios, agregación mensual
│   ├── stats_tool.py        ← métricas normalizadas, Taguchi, estadísticas de scores
│   ├── validation_tool.py   ← extracción de cifras del texto LLM + validación
│   └── chart_tool.py        ← gráficas PNG con matplotlib
├── prompts/
│   ├── step_observe.md      ← prompt: descripción de situación
│   ├── step_hypothesize.md  ← prompt: hipótesis causal
│   ├── step_recommend.md    ← prompt: recomendación al técnico de campo
│   ├── step_monthly.md      ← prompt: análisis mensual completo
│   └── executive_summary.md ← prompt: resumen ejecutivo global
└── report/
    ├── assembler.py         ← genera HTML y LaTeX finales
    └── templates/
        └── report.html.j2   ← plantilla Jinja2 del informe de episodios
```

---

## 2. ¿Qué es un episodio?

Un **episodio** es un momento específico en la vida simulada de una familia campesina que el sistema identifica como significativo según los datos del CSV. No es un concepto de IA — es una regla programática aplicada fila a fila.

### 2.1 Tipos de episodio detectados

El detector está en `data_tool.detect_episodes_in_csv()` y clasifica cada fila según estas condiciones (evaluadas en orden):

| Tipo | Condición |
|------|-----------|
| `LEISURE` | Capital < $500.000 COP **y** la meta activa es una actividad de ocio (`leisure_activities`, `spare_time`…). Paradoja: familia en crisis pero sin trabajar. |
| `CRISIS` | Capital < $500.000 COP (umbral de subsistencia). La familia está al límite de no poder alimentarse. |
| `ALTERNATIVE_WORK` | La meta activa contiene `alternative_work` — la familia salió a buscar trabajo fuera de la parcela. |
| `LOAN_REQUEST` | El contador `loans_active` aumentó respecto a la fila anterior del mismo agente — la familia pidió un préstamo. |
| `EMOTIONAL_SHIFT` | La emoción dominante pasó de un estado neutral/positivo a uno negativo (`negative`, `sad`, `angry`, `fear`, `disgust`). |
| `HARVEST` | `harvested_weight` subió más de 100 kg respecto a la fila anterior — ocurrió una cosecha significativa. |

### 2.2 Ventana temporal

Cuando se detecta un episodio en la fila `i`, el sistema extrae una **ventana** de `i−10` a `i+10` filas (±10 semanas de datos), de modo que el LLM recibe contexto de qué pasó antes y después del evento, no solo el momento puntual.

```python
# data_tool.py
def get_window(rows, trigger_idx, half=10):
    start = max(0, trigger_idx - half)
    end = min(len(rows), trigger_idx + half + 1)
    return rows[start:end]
```

### 2.3 Deduplicación

Para no analizar el mismo evento dos veces (por ejemplo, varias filas consecutivas en crisis), el detector mantiene un conjunto `seen` de tuplas `(agente, fecha, tipo)`. Solo se registra el primer trigger de cada combinación.

### 2.4 Límite de episodios

El parámetro `--max-episodes` controla cuántos episodios se analizan por tratamiento (por defecto 5). Valor `0` procesa todos. Esto se pasa desde la UI hasta el subproceso.

---

## 3. ¿Qué es el modo mensual?

El modo `--mode monthly` es una alternativa al análisis episódico que resuelve dos problemas:

1. **Cobertura total:** En modo episodios, si el capital se mantiene siempre por encima de $500K (familias con buen capital inicial), no se detectan episodios de crisis — el informe queda vacío para esos tratamientos.
2. **Velocidad:** En lugar de N llamadas LLM por tratamiento, hace exactamente 1.

### 3.1 Agregación mensual

`data_tool.aggregate_monthly(rows)` agrupa todas las filas del CSV por año y mes, y por cada grupo calcula:

| Campo | Cálculo |
|-------|---------|
| `money_avg` | Promedio del capital de todas las filas del mes |
| `money_min` | Mínimo del capital — detecta el peor momento del mes |
| `health_avg` | Promedio de salud (0=muerte, 1=plena salud) |
| `happiness_avg` | Promedio del eje emocional (−1 a +1) |
| `food_security_avg` | Promedio de seguridad alimentaria (0–1) |
| `harvest_total` | Suma de kilogramos cosechados en el mes |
| `loans_avg` | Promedio de préstamos activos |
| `crisis_weeks` | Semanas del mes con capital < $500.000 |
| `dom_emotion` | Emoción más frecuente del mes (`Counter.most_common`) |
| `dom_goal` | Meta más frecuente del mes |

El resultado es una lista de ~12 filas por año de simulación. Para una simulación de 5 años, el LLM recibe una tabla de ~60 filas en lugar de cientos de filas individuales.

### 3.2 Formato de la tabla para el LLM

`render_monthly_table_md()` produce una tabla Markdown que el LLM puede leer linealmente:

```
| Año | Mes | $ Prom     | $ Mín      | Salud | Felicidad | Seg.Alim | Cosecha kg | Sem.Crisis | Préstamos |
|-----|-----|-----------|-----------|-------|-----------|----------|-----------|------------|-----------|
| 2025 | 01 | $1,200,000 | $800,000  | 0.85  | +0.30     | 0.75     | 0         | 0          | 0.0       |
| 2025 | 02 | $420,000   | $310,000  | 0.60  | -0.20     | 0.40     | 0         | 3          | 1.5       |
...
```

---

## 4. Arquitectura ReAct: Plan + Task DAG

El pipeline sigue el patrón **ReAct** (Reasoning + Acting): cada paso del análisis es una `Task` que razona sobre el estado y actúa (llama al LLM, genera gráficas, valida datos). Las tareas se encadenan en un `Plan` con un grafo de dependencias acíclico dirigido (DAG).

### 4.1 La clase `Task` (BESA)

```python
# besa/rational/task.py
class Task(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def execute(self, believes: Believes, **kwargs) -> bool:
        """Retorna True si la tarea completó correctamente."""
```

Cada tarea recibe el objeto de estado compartido (`AnalysisState`, que hereda de `Believes`) y puede leerlo y modificarlo libremente. Es sincrónica — no hay threads.

### 4.2 La clase `Plan` (BESA)

```python
# besa/rational/plan.py
class Plan:
    def execute(self, believes):
        executed = set()
        remaining = {t.name for t in self._tasks}
        while remaining:
            # batch = todas las tareas cuyas dependencias ya completaron
            batch = [t for t in self._tasks
                     if t.name in remaining
                     and self._dependencies[t.name].issubset(executed)]
            for task in batch:
                task.execute(believes)
                executed.add(task.name)
                remaining.discard(task.name)
```

El `Plan` ejecuta en **batches topológicos**: primero todas las tareas sin dependencias, luego las que dependen de ellas, y así sucesivamente. Las tareas dentro de un mismo batch se ejecutan secuencialmente (no en paralelo), pero el orden dentro del batch no está garantizado.

### 4.3 DAG del modo `episodes`

```
ObserveData
    ├── GenerateTimelineCharts ──┐
    └── ComputeMetrics           │
                                 ▼
                         LLMObserve
                                 │
                         LLMHypothesize
                                 │
                         ValidateNumbers
                                 │
                         LLMCorrect
                                 │
                         LLMRecommend
                                 │
                         GenerateDistributionChart
```

### 4.4 DAG del modo `monthly`

```
MonthlyAnalysis   (carga CSV, agrega, llama al LLM una vez)
        │
ComputeMetrics    (normaliza productividad/bienestar/crisis_rate)
```

---

## 5. Las Tasks del modo `episodes` — en detalle

### 5.1 `ObserveDataTask` — Observación

Carga el CSV del tratamiento (`data_tool.load_treatment_csv`) y ejecuta `detect_episodes_in_csv`. Por cada episodio detectado, crea un `EpisodeResult` con:
- `episode_data`: metadatos del episodio (tipo, agente, fecha, fila trigger)
- `window_rows`: ±10 filas alrededor del trigger
- `center_in_window`: índice del trigger dentro de la ventana

Almacena la lista en `state.current_treatment.episode_results`.

### 5.2 `GenerateTimelineChartsTask` — Acción visual

Para cada episodio, llama a `chart_tool.timeline_chart()` que genera un PNG con matplotlib mostrando la evolución del capital en la ventana temporal. El trigger está marcado con una línea vertical roja. La ruta del PNG se guarda en `er.timeline_chart_path`.

### 5.3 `ComputeMetricsTask` — Métricas normalizadas

Llama a `stats_tool.compute_treatment_metrics(state.treatments)` pasando **todos los IDs de tratamiento** (no solo el actual). Esto permite normalización min-max real: si se pasa un solo tratamiento, `normalize()` siempre devuelve 0.5 para todos los valores.

Las métricas calculadas son:
- **Productividad**: función de cosecha total / área de tierra
- **Bienestar**: función de salud promedio + capital promedio
- **Crisis rate**: proporción de filas con capital < $500K

### 5.4 `LLMObserveTask` — Primera llamada LLM

Usa el prompt `step_observe.md`. Antes de llamar al LLM, `data_tool.extract_episode_facts()` extrae del trigger row y la ventana:
- Capital actual formateado
- Salud, emoción, meta activa
- Tendencia del capital (comparando con 3 filas antes)
- Días con capital bajo el umbral

Estos hechos se inyectan en el prompt como variables `{capital_fmt}`, `{salud_fmt}`, etc. El LLM recibe solo hechos verificados — no los datos crudos del CSV. La respuesta se extrae después del marcador `"Descripción:"`.

### 5.5 `LLMHypothesizeTask` — Segunda llamada LLM

Usa `step_hypothesize.md`. El prompt incluye la descripción del paso anterior más parámetros del tratamiento (capital inicial, tierra, personalidad). El LLM debe explicar **por qué** la familia tomó esa decisión, causalmente. La respuesta se extrae después de `"Hipótesis:"`.

### 5.6 `ValidateNumbersTask` — Validación programática (sin LLM)

Este es el **hook de control de calidad**. Extrae todas las cifras monetarias del texto de hipótesis usando regex:

```python
_MONEY_RE = re.compile(
    r'\$\s*([\d]{1,3}(?:[,.][\d]{3})+(?:[,.]\d+)?|\d{4,})',
    re.IGNORECASE,
)
```

El patrón captura:
- Números CON separadores de miles: `$1,200,000` o `$1.200.000`
- Números de 4+ dígitos SIN separador: `$442000`
- Excluye `$500` (3 dígitos solos — no relevante en COP)

Para cada cifra extraída compara con el `trigger_row["money"]` real. Si la diferencia supera el 10%, se marca como **alucinación**. Para evitar falsos positivos, se mantiene una lista de `context_values` (umbral de subsistencia $500K, capital inicial del tratamiento) que el LLM puede citar correctamente sin que sea alucinación.

### 5.7 `LLMCorrectTask` — Corrección automática

Si `ValidateNumbersTask` detectó alucinaciones, `LLMCorrectTask` construye una nota de corrección:

```
CORRECCIÓN IMPORTANTE: El capital real de esta familia es $442,000 COP.
Usa este valor exacto en tu respuesta.

Revisa y corrige la siguiente hipótesis...
```

El LLM recibe su propia hipótesis + la corrección y la reescribe. Si la reescritura tiene más de 50 chars, se reemplaza la hipótesis original y se marca `er.corrected = True`.

El log de alucinaciones (`state.hallucination_log`) **solo se llena aquí**, después de la corrección, para que el campo `corrected` refleje el estado final.

### 5.8 `LLMRecommendTask` — Tercera llamada LLM

Usa `step_recommend.md`. Recibe descripción + hipótesis (ya corregida si aplica) y genera 1 párrafo de recomendación práctica para el técnico de campo. Si hubo corrección, la nota de corrección se prepende al prompt para que el LLM no vuelva a inventar cifras.

### 5.9 `GenerateDistributionChartTask` — Acción visual 2

Cuenta la distribución de tipos de episodio (`episode_type_distribution`) y genera un gráfico de barras PNG del mix de eventos del tratamiento.

---

## 6. La Task del modo `monthly` — en detalle

### `MonthlyAnalysisTask`

```python
class MonthlyAnalysisTask(Task):
    def execute(self, state, **_):
        tr = state.current_treatment
        rows = data_tool.load_treatment_csv(tr.treatment_id)
        monthly = data_tool.aggregate_monthly(rows)
        tr.monthly_data = monthly

        params_text = "\n".join(f"- **{k}**: {v}" for k, v in tr.params.items())
        monthly_table = data_tool.render_monthly_table_md(monthly)
        prompt = self._template.format(params=params_text, monthly_table=monthly_table)
        text = self.broker.call(prompt, max_retries=3)
        tr.monthly_narrative = _extract_after(text, "Análisis:") or text
```

Una sola llamada LLM con el prompt `step_monthly.md` que pide un análisis narrativo de 4–6 párrafos cubriendo trayectoria, momentos de quiebre, ciclos agrícolas y resiliencia. No hay validación numérica en este modo porque la tabla es el único "hecho" y el LLM la tiene enfrente.

---

## 7. Los Agentes especializados (modo `episodes`)

Además del `ReActLoop`, tres agentes de análisis corren **después** de que todos los tratamientos han sido procesados individualmente:

### 7.1 `AnalysisAgent`

Fachada simple que mantiene el `AnalysisState` y delega cada tratamiento al `ReActLoop`. No tiene lógica propia — su rol es orquestar el loop externo sobre los tratamientos.

```python
class AnalysisAgent:
    def run_treatment(self, treatment_id, params, loop):
        return loop.run_treatment(self.state, treatment_id, params)
```

### 7.2 `TaguchComparisonTask`

Aplica análisis de **efectos principales Taguchi** cruzando todos los tratamientos. Para cada factor experimental (capital inicial, tierra, personalidad, herramientas, semillas, agua) calcula el promedio de productividad y bienestar por nivel del factor:

```
factor: money
  nivel 500000:  productividad=0.312, bienestar=0.289
  nivel 1500000: productividad=0.687, bienestar=0.721
  nivel 3000000: productividad=0.891, bienestar=0.903
  → rango = 0.891 - 0.312 = 0.579  (el capital inicial es el factor más influyente)
```

Genera gráficas de efectos principales (una por métrica) con matplotlib.

### 7.3 `ExecutiveReportTask`

Una sola llamada LLM con el prompt `executive_summary.md`. Recibe la tabla de métricas de todos los tratamientos + el factor más influyente (identificado por `identify_top_factor` según el mayor rango Taguchi) y produce exactamente 3 oraciones en español formal dirigidas a directivos del sector agrícola.

### 7.4 `TechnicalSectionTask`

No llama al LLM. Construye el `section_dict` de cada episodio con todo el HTML necesario para el reporte: tabla de datos crudos, tabla de hechos extraídos, badge de validación (✅ / ⚠ / ❌), texto de descripción, hipótesis y recomendación. Este dict es consumido directamente por la plantilla Jinja2.

---

## 8. El broker LLM: infraestructura de resiliencia

El `OllamaLLMBroker` (en `experiments/explainability/ollama_broker.py`) hereda del `LLMBroker` base de BESA y añade tres capas de resiliencia:

### 8.1 CircuitBreaker

Patrón clásico de circuit breaker para proteger el sistema si Ollama no responde:

```
Estado CLOSED (normal) → si falla 3 veces → Estado OPEN (bloquea peticiones)
Estado OPEN → después de 60s sin fallos → Estado HALF-OPEN (prueba una)
Estado HALF-OPEN → si tiene éxito → Estado CLOSED
```

En el pipeline de análisis el circuit breaker es relevante porque una llamada que tarda 5 minutos en timeout bloquearía todo el informe.

### 8.2 AgentRateLimiter

Limita cuántas veces por tick de simulación puede pedir al LLM un agente específico. En el pipeline de análisis se desactiva (`min_ticks_between_requests = 0`) porque cada llamada es sincrónica y secuencial, no hay riesgo de spam.

### 8.3 LLMCache (LRU)

Cache en memoria de hasta 500 entradas. La clave es `hash(prompt + modelo)`. Esto significa que si el mismo prompt se ejecuta dos veces (ej. corriendo el orchestrator dos veces con los mismos datos), la segunda vez no hace petición HTTP. Útil en desarrollo.

### 8.4 Modo síncrono del pipeline

El `LLMBroker` base funciona en modo asíncrono (cola + thread + callback hacia el event loop BESA). Para el pipeline de análisis esto sería innecesariamente complejo, así que `OllamaLLMBroker` añade:

```python
def call_sync(self, prompt: str, max_retries: int = 2) -> str:
    req = LLMRequest(template=prompt, context={}, callback_agent="", callback_guard=None)
    for _ in range(max_retries + 1):
        resp = self._call_ollama(req)
        if resp and len(resp.text.strip()) > 50:
            return resp.text.strip()
    return ""
```

Llama directamente a `_call_ollama()` sin encolado, bloqueando el hilo actual hasta obtener respuesta. El `AnalysisBroker` en `react_loop.py` es un wrapper delgado sobre este método.

---

## 9. Los prompts — diseño y convenciones

Todos los prompts están en `experiments/analysis/prompts/*.md` y usan Python `str.format()` con `{variables}`. El `.dockerignore` tiene una excepción explícita `!experiments/analysis/prompts/*.md` para que estén disponibles dentro del contenedor Docker.

### Convenciones de diseño compartidas en todos los prompts

1. **Rol explícito:** Cada prompt abre con "Eres un técnico de extensión rural…" — esto establece el frame sin jerga técnica.
2. **Marcador de extracción:** El texto esperado siempre viene después de un marcador (`"Descripción:"`, `"Hipótesis:"`, etc.) que `_extract_after()` localiza con `text.find()`.
3. **Prohibición de jerga:** Todos los prompts incluyen "No uses términos como 'agente', 'BDI', 'simulación' ni jerga técnica de computación." para que el informe sea legible por no técnicos.
4. **Datos pre-inyectados:** Los datos reales ya están formateados en el prompt como variables Python. El LLM no "hace cálculos" — se le dan las cifras y se le pide que las interprete.

### Prompt `step_observe.md`
- **Input:** 7 hechos del episodio (capital, salud, emoción, meta, tendencia, días bajo umbral, préstamos)
- **Output:** 2 párrafos — situación actual + tendencia
- **Estrategia:** Descripción puramente empírica, sin causas

### Prompt `step_hypothesize.md`
- **Input:** Descripción anterior + tipo de episodio + parámetros del tratamiento
- **Output:** 2 párrafos causales — ¿por qué tomó esa decisión? + ¿qué papel jugaron las condiciones iniciales?
- **Estrategia:** Razonamiento causal sobre decisiones de la familia

### Prompt `step_recommend.md`
- **Input:** Descripción + hipótesis (+ nota de corrección si aplica)
- **Output:** 1 párrafo de recomendación práctica para el técnico de campo
- **Estrategia:** Prescriptivo, accionable, sin inventar cifras

### Prompt `step_monthly.md`
- **Input:** Parámetros del tratamiento + tabla mensual Markdown de ~12–60 filas
- **Output:** 4–6 párrafos cubriendo trayectoria general, momentos de quiebre, ciclos agrícolas y conclusión de resiliencia
- **Estrategia:** Análisis de la trayectoria completa, no un evento puntual

### Prompt `executive_summary.md`
- **Input:** Tabla de métricas de todos los tratamientos + factor más influyente
- **Output:** Exactamente 3 oraciones en español formal
- **Estrategia:** Para directivos — resultado, factor, recomendación de política

---

## 10. El `AnalysisState` — objeto de estado compartido

`AnalysisState` es la "pizarra" compartida entre todas las Tasks. Hereda de `BelievesBase` de BESA (que a su vez hereda de `pydantic.BaseModel`), por lo que es mutable y soporta atributos arbitrarios.

```python
@dataclass
class AnalysisState(BelievesBase):
    treatments: list[str]               # IDs de todos los tratamientos a procesar
    current_treatment: TreatmentResult  # el tratamiento que está en proceso ahora
    all_results: list[TreatmentResult]  # acumulado de todos los tratamientos ya listos
    taguchi_effects: dict               # efectos principales por factor
    taguchi_chart_paths: dict           # rutas de PNG Taguchi
    score_stats: dict                   # estadísticas de scores de explicabilidad
    hallucination_log: list[dict]       # registro de todas las alucinaciones detectadas
    executive_summary_text: str         # resumen ejecutivo global
    ollama_url: str
    model: str
    output_dir: Path
```

El objeto fluye sin copia entre Tasks — todas modifican el mismo estado en memoria.

### `TreatmentResult`

Estado por tratamiento:

```python
@dataclass
class TreatmentResult:
    treatment_id: str
    params: dict                  # money, land, personality, tools, seeds, water
    episode_results: list[EpisodeResult]
    productividad: float          # normalizada 0–1 entre todos los tratamientos
    bienestar: float              # normalizada 0–1
    crisis_rate: float            # proporción de filas en crisis
    monthly_narrative: str        # solo en modo monthly
    monthly_data: list[dict]      # solo en modo monthly
```

### `EpisodeResult`

Estado por episodio individual:

```python
@dataclass
class EpisodeResult:
    episode_data: EpisodeData     # tipo, agente, fecha, trigger_row
    window_rows: list[dict]       # ±10 filas alrededor del trigger
    center_in_window: int
    episode_facts: dict           # hechos pre-extraídos (capital_fmt, emocion…)
    description_text: str         # output de LLMObserveTask
    hypothesis_text: str          # output de LLMHypothesizeTask (puede ser corregida)
    recommendation_text: str      # output de LLMRecommendTask
    timeline_chart_path: str      # ruta PNG de la gráfica de capital
    validation_result: dict       # resultado del validador numérico
    hallucinations_flagged: list  # lista de discrepancias detectadas
    corrected: bool               # True si LLMCorrectTask la reescribió
    section_dict: dict            # HTML pre-renderizado para el template
```

---

## 11. El ensamblador de reportes

### Modo `episodes` — `assemble_html_report()`

Usa **Jinja2** con la plantilla `report.html.j2`. Embebe todas las imágenes PNG como base64 directamente en el HTML (un solo archivo, sin dependencias externas). La plantilla recibe:
- `treatments`: lista de dicts con episodios y sus `section_dict`
- `metrics_table`: tabla HTML de productividad/bienestar/crisis
- `executive_summary`: texto del resumen ejecutivo
- Gráficas Taguchi embebidas como base64
- `hallucination_rows`: tabla HTML del log de alucinaciones

El archivo resultante se nombra `analysis_YYYYMMDD_HHmm.html` y pesa típicamente 200–400 KB para 15 tratamientos.

### Modo `monthly` — `assemble_monthly_html_report()`

No usa Jinja2 — el HTML se construye por f-strings en Python. Por cada tratamiento genera:
- Chips de parámetros del tratamiento
- 4 cajas de métricas (productividad, bienestar, crisis rate, meses analizados)
- Tabla HTML mensual coloreada (semanas en crisis en rojo si > 2)
- Texto narrativo del LLM con `<p>` separados

El archivo resultante se nombra `analysis_monthly_YYYYMMDD_HHmm.html`.

### LaTeX — `assemble_latex_report()`

Genera únicamente tablas LaTeX (sin narrativas): métricas por tratamiento, scores de calidad y tabla de alucinaciones. Orientado a inclusión en papers académicos.

---

## 12. Flujo completo de invocación desde la UI

```
Usuario (browser)
    │ clic en "Generar"
    ▼
ReportConfigPanel (page.tsx)
    │ POST /api/report/generate  { mode, model, ollama_url, max_episodes, treatment }
    ▼
/api/report/generate/route.ts  (Next.js API Route)
    │ proxy → POST http://simulator:8001/report
    ▼
ControlHandler._generate_report()  (start.py, puerto 8001)
    │ construye cmd:
    │   python orchestrator.py --mode monthly --all --ollama-url http://ollama:11434
    │ abre reports/analysis/orchestrator.log para stdout+stderr
    │ subprocess.Popen(cmd)
    │ responde { started: true, pid: 12345 }
    ▼
orchestrator.py  (subproceso)
    │ parse_args() → mode=monthly, all=True
    │ select_treatments() → [(E401, {...}), ..., (E427, {...})]
    │ MonthlyReActLoop.run_monthly_treatment() × 27 tratamientos
    │ assemble_monthly_html_report()
    ▼
reports/analysis/html/analysis_monthly_YYYYMMDD_HHmm.html
```

Mientras el subproceso corre:
- La UI llama a `GET /api/report/status` cada 6 segundos → `ControlHandler` verifica si `report_proc.poll() is None`
- El usuario puede ver el log en tiempo real: `GET /api/report/log` → últimos 8 KB de `orchestrator.log`
- Al terminar, `GET /api/report` devuelve el nombre del archivo y `GET /api/report/file` lo sirve como descarga

---

## 13. Infraestructura Docker

```yaml
# docker-compose.python.yml (extracto relevante)

ollama:
  image: ollama/ollama:latest
  volumes:
    - ollama-data:/root/.ollama    # modelo persiste entre reinicios
  environment:
    OLLAMA_KEEP_ALIVE: 24h         # no descarga el modelo de RAM entre llamadas
  healthcheck:
    test: ["CMD-SHELL", "/bin/ollama list >/dev/null 2>&1"]

ollama-init:
  image: ollama/ollama:latest
  entrypoint: ["/bin/sh", "-c"]
  command:
    - "until /bin/ollama list >/dev/null 2>&1; do sleep 3; done && \
       (/bin/ollama list | grep -q gemma3 || /bin/ollama pull gemma3:4b) && \
       echo 'Model ready.'"
  environment:
    OLLAMA_HOST: http://ollama:11434
  restart: "no"                    # solo corre una vez al iniciar el compose

simulator:
  environment:
    OLLAMA_URL: http://ollama:11434  # el subproceso usa esta var de entorno
```

El `simulator` alcanza a Ollama por la red interna Docker (`http://ollama:11434`), sin exponer ningún puerto al host. Si se quiere usar Ollama local en lugar del del compose, basta con cambiar `ollama_url` en el panel de configuración de la UI.

---

## 14. Validación de alucinaciones — lógica detallada

El validador (`validation_tool.py`) es un "hook de post-procesamiento" que corre después de cada llamada LLM de hipótesis y antes de la recomendación.

### Flujo completo de validación

```
texto LLM (hipótesis)
    │
    ▼
extract_monetary_values(texto)
    │ regex captura todos los montos monetarios mencionados
    │ ejemplo: ["$442,000", "$1,200,000", "$500,000"]
    │           → [442000.0, 1200000.0, 500000.0]
    │
    ▼
para cada valor extraído:
    ├── ¿está en context_values con ±5% de tolerancia?
    │       Sí → ignorar (es cita correcta del contexto)
    │       No → comparar con trigger_row["money"]
    │               diferencia > 10% → marcar alucinación
    │
    ▼
si hay alucinaciones:
    er.hallucinations_flagged = ["money: extraído=1200000 real=442000 (171.5%)"]
    │
    ▼
LLMCorrectTask construye nota + llama al LLM de nuevo
    │
    ▼
log_hallucination() → state.hallucination_log (con corrected=True/False)
```

### Por qué `context_values`

Sin esta lista, el validador marcaría como alucinación cuando el LLM escribe:
- `"está por debajo del umbral de $500,000 COP"` — el umbral está en el prompt, el LLM lo cita correctamente
- `"con un capital inicial de $1,500,000 COP"` — el capital inicial del tratamiento está en el prompt

Ambos son citas legítimas de contexto, no valores inventados. Los `context_values` los excluyen de la comparación.

---

## 15. Cómo extender el pipeline

### Agregar un nuevo tipo de episodio

En `data_tool.detect_episodes_in_csv()`, agregar una condición nueva al `if/elif` que detecta `ep_type`. El resto del pipeline (ventana, LLM, validación) funciona automáticamente.

### Agregar un nuevo paso LLM

1. Crear un archivo `.md` en `experiments/analysis/prompts/` con el prompt y el marcador de extracción.
2. Crear una subclase de `Task` en `react_loop.py` que cargue el prompt y llame a `self.broker.call()`.
3. Agregar la tarea al `Plan` en `ReActLoop.build_plan()` con sus dependencias.
4. Agregar el campo correspondiente a `EpisodeResult` en `state.py`.

### Cambiar el modelo LLM

El modelo se pasa como `--model` al orchestrator (o desde el panel de la UI). Cualquier modelo disponible en Ollama puede usarse — el `OllamaLLMBroker` no asume ningún modelo específico. Para modelos más pequeños se recomienda reducir `num_predict` (tokens de respuesta) para evitar timeouts.

### Agregar un nuevo modo de análisis

1. Crear las Tasks en `react_loop.py`.
2. Crear un `XxxReActLoop` con `build_xxx_plan()` y `run_xxx_treatment()`.
3. Agregar `--mode xxx` al `argparse` en `orchestrator.py`.
4. Crear `assemble_xxx_html_report()` en `assembler.py`.
5. Agregar la opción al `<select>` de `ReportConfigPanel` en `page.tsx`.
