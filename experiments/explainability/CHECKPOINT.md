# Checkpoint — Experimento Explicabilidad Natural (20CCC)

> Fecha: 2026-05-17  
> Estado: **Pipeline completo ejecutado. 75 narrativas generadas en 15 tratamientos. Listo para validación con expertos.**

---

## ¿Qué está terminado?

### Pipeline multi-agente (100% implementado y funcionando)

```
experiments/explainability/
├── orchestrator.py          ✅ Punto de entrada principal
├── taguchi_l27.py           ✅ 27 tratamientos E5 con rutas CSV
├── ollama_broker.py         ✅ Cliente Ollama (gemma3:4b, sin rate limiting)
├── agents/
│   ├── episode_extractor.py ✅ Detecta 6 tipos de episodio (ver abajo)
│   ├── context_builder.py   ✅ Lee YAML GoalRegistry + traduce activation_when
│   ├── narrative_agent.py   ✅ Genera narrativas via Gemma 3 4B
│   ├── quality_guard.py     ✅ Evalúa narrativas (scores 0-1)
│   └── report_aggregator.py ✅ Genera JSON + Markdown + LaTeX por tratamiento
├── events/                  ✅ EpisodeData, ContextData, NarrativeData, ValidatedNarrativeData
├── prompts/
│   ├── explainability_v1.md ✅ Prompt en español con {episode_context} adaptativo
│   └── quality_check_v1.md  ✅ Prompt de evaluación → JSON de scores
└── validation/
    ├── expert_cli.py        ✅ CLI interactiva para 3 evaluadores
    └── inter_rater.py       ✅ Fleiss' Kappa + Cronbach's Alpha
```

### Tipos de episodio detectados (por prioridad)

| Tipo | Condición | % en E401 |
|------|-----------|-----------|
| `LEISURE` | money < 500k **Y** meta = leisure_activities | 96% (207/215) |
| `CRISIS` | money < 500k (cualquier otra meta) | 4% (8/215) |
| `ALTERNATIVE_WORK` | meta contiene "alternative_work" | 0% en E5 |
| `LOAN_REQUEST` | loans_active aumenta | 0% en E5 |
| `EMOTIONAL_SHIFT` | emotion → negative/sad | 0% en E5 |
| `HARVEST` | harvested_weight +100 kg | 0% en E5 |

**Hallazgo clave del E5:** 96% de episodios son LEISURE — familia en crisis económica eligiendo descanso. Este es el argumento central del artículo 20CCC: explicar *por qué* el BDI prioriza el bienestar sobre la producción durante crisis.

### Pipeline completo ejecutado (2026-05-17)

```
Total narrativas:  75
Tratamientos:      15 de 27 (12 tienen capital alto → 0 episodios)
Tipos:             LEISURE=68 (91%) | CRISIS=7 (9%)

Scores globales:
  Variables      — media: 0.789  min: 0.50  max: 0.90
  Comprensibilidad — media: 0.853  min: 0.50  max: 0.90
  Fidelidad      — media: 0.874  min: 0.50  max: 0.95

Por tipo:
  LEISURE  n=68  V=0.79  C=0.85  F=0.88
  CRISIS   n= 7  V=0.79  C=0.86  F=0.80

Salidas:
  reports/explainability/json/explainability_all.json  (235K, 75 entradas)
  reports/explainability/markdown/explainability_E4*.md  (27 archivos)
  reports/explainability/latex/table_E4*.tex  (27 archivos)
  reports/tabla_explicabilidad.tex  (compilado, 357 líneas)
```

---

## ¿Qué falta? (en orden de prioridad)

### 1. ~~Ejecutar pipeline completo~~ ✅ COMPLETADO (2026-05-17, 75 narrativas)

```bash
# Recomendado: escala reducida para el artículo (en tmux)
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. .venv/bin/python \
  experiments/explainability/orchestrator.py --all --max-episodes 5

# Tiempo estimado: ~1.25 horas (5 eps × 15 tratamientos × ~60s/ep)
# Nota: 12 de los 27 tratamientos tienen 0 episodios (capital alto, no hay crisis)
```

Tratamientos con datos (15 de 27):
`E401 E402 E403 E404 E405 E407 E410 E413 E416 E419 E422 E423 E424 E425 E426`

### 2. Validación con expertos 🔴 (siguiente paso inmediato)

```bash
# Ejecutar con cada evaluador (mínimo 2 para Fleiss' Kappa)
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. .venv/bin/python \
  experiments/explainability/validation/expert_cli.py \
  --report reports/explainability/json/explainability_all.json \
  --evaluator "NombreExperto"

# Los archivos se guardan en:
# reports/explainability/expert/evaluator_NombreExperto.json
```

### 3. Métricas inter-evaluadores 🟡 (requiere ≥ 2 evaluadores)

```bash
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. .venv/bin/python \
  experiments/explainability/validation/inter_rater.py \
  --reports-dir reports/explainability/expert/
```

### 4. Compilar tablas LaTeX para el artículo 🟢

```bash
# Después del pipeline completo:
cat reports/explainability/latex/table_E4*.tex > reports/tabla_explicabilidad.tex
```

---

## Entorno de desarrollo

```bash
# Comando base (SIEMPRE necesario)
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. .venv/bin/python <script>

# Verificar Ollama activo
curl http://localhost:11434/api/tags

# Modelo disponible: gemma3:4b
```

- **venv:** `.venv/` en la raíz del proyecto
- **Ollama:** instalado en el sistema, corre en `localhost:11434`
- **Datos E5:** `data/experiments/E5/E4{NN}/wpsSimulator.csv` (27 CSVs, CRLF, utf-8-sig)

---

## Bugs conocidos y sus fixes (ya aplicados)

| Bug | Fix aplicado |
|-----|-------------|
| AgentRateLimiter bloqueaba todas las requests después de la primera | `self.rate_limiter.min_ticks_between_requests = 0` en `ollama_broker.py` |
| `_pending_context` se sobreescribía con requests concurrentes | `queue.Queue` FIFO en `narrative_agent.py` y `quality_guard.py` |
| ExtractionDoneEvent llegaba antes que las narrativas | `expected_counts` vs `received_counts` en `report_aggregator.py` |
| CSVs con BOM y CRLF daban filas vacías | `encoding='utf-8-sig'` + filtro de fecha vacía en `episode_extractor.py` |
| `experiments.*` no encontrado | `sys.path.insert(0, str(PROJECT_ROOT))` + `PYTHONPATH=..:.` con punto final |

---

## Archivos de salida generados

```
reports/explainability/
├── json/
│   └── explainability_all.json      # Todas las narrativas con scores
├── markdown/
│   └── explainability_E4{NN}.md     # Informe legible por tratamiento
├── latex/
│   └── table_E4{NN}.tex             # Tabla para el artículo
└── expert/
    ├── expert_validation_form.md    # Formulario para evaluadores
    └── evaluator_{nombre}.json      # Respuestas de cada experto
```

---

## Contexto del artículo 20CCC

**Título tentativo:** "Explicabilidad natural de agentes eBDI en simulaciones de familias campesinas colombianas usando MicroLLM local"

**Argumento central:** Gemma 3 4B (4B parámetros, corriendo localmente) puede traducir el razonamiento formal BDI en narrativas comprensibles para técnicos de extensión rural, sin exponer datos a servicios externos, con scores de fidelidad ≥ 0.70.

**Hallazgo principal del E5:** El bug de priorización BDI genera un comportamiento paradójico (ocio durante crisis) que el pipeline explica coherentemente — este "fallo" se convierte en un caso de estudio sobre la explicabilidad de comportamientos emergentes no intencionados.
