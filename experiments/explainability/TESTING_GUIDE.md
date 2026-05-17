# Guía de Pruebas — Experimento de Explicabilidad Natural
## EthosTerra / 20CCC · Pipeline Multi-Agente BESA + Ollama

---

## Estado del Sistema (validado 2026-05-16)

| Componente | Estado |
|-----------|--------|
| Venv Python 3.14 | ✅ `.venv/` en raíz del proyecto |
| Ollama | ✅ corriendo en `localhost:11434` |
| Modelo `gemma3:4b` | ✅ descargado |
| 27 tratamientos E5 | ✅ CSVs en `data/experiments/E5/` |
| Pipeline completo | ✅ smoke test pasando |

---

## 0. Prerequisitos

### 0.1 Activar el entorno virtual
```bash
# Desde la raíz del proyecto
cd /home/lasthunter/programacion8.0/EthosTerra

# Verificar venv
.venv/bin/python --version    # debe mostrar Python 3.14.x
```

### 0.2 Verificar Ollama y el modelo
```bash
# Ollama corriendo
curl -s http://localhost:11434/api/tags | python -c \
  "import json,sys; print([m['name'] for m in json.load(sys.stdin)['models']])"
# Esperado: ['gemma3:4b']

# Si Ollama no está corriendo:
ollama serve &

# Si el modelo no está descargado:
ollama pull gemma3:4b
```

### 0.3 Verificar datos del E5
```bash
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. \
  .venv/bin/python -c "
from experiments.explainability.taguchi_l27 import get_available_treatments
t = get_available_treatments()
print(f'Tratamientos disponibles: {len(t)}/27')
"
# Esperado: Tratamientos disponibles: 27/27
```

### 0.4 Alias de conveniencia (opcional)
```bash
# Agrega a tu shell para no repetir el prefijo
alias pyexp='PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. .venv/bin/python'
```

---

## 1. Prueba de Humo — 1 Tratamiento, 2 Episodios

El test más rápido para verificar que todo el pipeline funciona.
**Tiempo estimado: ~3-5 minutos** (2 episodios × 2 llamadas LLM × ~30-60s/llamada)

```bash
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. \
  .venv/bin/python experiments/explainability/orchestrator.py \
  --treatment E401 \
  --max-episodes 2

# Salida esperada:
# [EpisodeExtractor] E401: 2 episodios detectados
# [ReportAggregator] E401: 2 narrativas → reportes generados
# ✅ Pipeline completo: 2 narrativas generadas
```

**Verificar salidas:**
```bash
# Narrativas en Markdown
cat reports/explainability/markdown/explainability_E401.md

# JSON con scores de calidad
python -c "
import json
d = json.load(open('reports/explainability/json/explainability_all.json'))
for e in d['entries']:
    print(f\"{e['episode_type']} | {e['agent']}\")
    print(f\"  Narrative: {e['narrative'][:120]}...\")
    print(f\"  Scores: {e['scores']}\")
"

# Tabla LaTeX
cat reports/explainability/latex/table_E401.tex

# Formulario para expertos
cat reports/explainability/expert/expert_validation_form.md
```

**Criterios de éxito del smoke test:**
- [ ] El pipeline termina sin errores (`✅ Pipeline completo`)
- [ ] Las narrativas están en español (no inglés, no errores de modelo)
- [ ] Los scores de calidad son > 0 (la llamada de validación funcionó)
- [ ] Los 4 archivos de salida existen (JSON, Markdown, LaTeX, formulario experto)

---

## 2. Prueba de Cobertura — Múltiples Tipos de Episodio

Verifica que el extractor detecta tipos de episodio variados. Usa tratamientos con capital bajo (E401-E409) donde ocurren más eventos críticos.

```bash
# Ver distribución de episodios sin llamar al LLM
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. \
  .venv/bin/python -c "
from experiments.explainability.taguchi_l27 import get_available_treatments
from experiments.explainability.agents.episode_extractor import EpisodeExtractorAgent
from collections import Counter

e = EpisodeExtractorAgent.__new__(EpisodeExtractorAgent)
for tid in ['E401', 'E404', 'E407', 'E410', 'E413']:
    t = next(x for x in get_available_treatments() if x['id'] == tid)
    eps = e.extract_episodes(t['id'], t['csv_path'], max_episodes=0)
    c = Counter(ep.episode_type for ep in eps)
    print(f'{tid} (money=\${t[\"money\"]:,}): {len(eps)} eps → {dict(c)}')
"
```

**Nota sobre el E5:** Los 27 tratamientos del E5 tienen 0% producción agrícola (bug de prioridad BDI documentado en `INFORME_COMPARACION.md`). Por eso el 100% de los episodios detectados son de tipo `CRISIS`. Esto es un hallazgo válido para el artículo: el pipeline explica por qué los agentes eligen ocio durante crisis económicas.

---

## 3. Prueba de Escala Reducida — 5 Episodios × 15 Tratamientos

Para el artículo 20CCC, usar 5 episodios por tratamiento es suficiente para demostrar la capa de explicabilidad.
**Tiempo estimado: ~3.5 horas** (15 tratamientos × 5 episodios × 2 llamadas × ~60s)

```bash
# RECOMENDADO: ejecutar en tmux/screen porque tarda ~3-4 horas
tmux new -s explicabilidad

PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. \
  .venv/bin/python experiments/explainability/orchestrator.py \
  --all \
  --max-episodes 5

# Monitorear desde otra terminal:
watch -n 30 'ls reports/explainability/markdown/ | wc -l'
```

**Verificar al final:**
```bash
# Resumen de todos los reportes generados
ls reports/explainability/markdown/
ls reports/explainability/json/

# Total de narrativas
python -c "
import json
d = json.load(open('reports/explainability/json/explainability_all.json'))
print(f'Total narrativas: {d[\"total_narratives\"]}')
s = d['summary']
for ep_type, m in s.items():
    avg = (m['avg_variable_id'] + m['avg_comprehensibility'] + m['avg_faithfulness']) / 3
    print(f'  {ep_type}: {m[\"count\"]} episodios, score promedio = {avg:.2f}')
"
```

---

## 4. Prueba Completa — 27 Tratamientos Sin Límite de Episodios

⚠️ **NO RECOMENDADO para el artículo** — los 27 tratamientos del E5 generan ~4,952 episodios totales (todos CRISIS). Con ~60s por episodio serían ~82 horas de procesamiento.

Si se desea ejecutar una muestra representativa:
```bash
# 3 tratamientos representativos: capital bajo, medio, alto
for TID in E401 E410 E419; do
  PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. \
    .venv/bin/python experiments/explainability/orchestrator.py \
    --treatment $TID \
    --max-episodes 10
done
```

---

## 5. Validación por Expertos

Requiere que el pipeline haya generado al menos 5 narrativas en `reports/explainability/json/explainability_all.json`.

```bash
# Experto 1
PYTHONPATH=. .venv/bin/python \
  experiments/explainability/validation/expert_cli.py \
  --report reports/explainability/json/explainability_all.json \
  --evaluator "Carlos Perez"

# Experto 2 (en otra sesión/computador)
PYTHONPATH=. .venv/bin/python \
  experiments/explainability/validation/expert_cli.py \
  --report reports/explainability/json/explainability_all.json \
  --evaluator "Maria Rodriguez"

# Continuar desde donde se quedó
PYTHONPATH=. .venv/bin/python \
  experiments/explainability/validation/expert_cli.py \
  --report reports/explainability/json/explainability_all.json \
  --evaluator "Carlos Perez" \
  --start-at 6
```

**Perfil recomendado del evaluador:** técnico de extensión rural o investigador en desarrollo rural colombiano con ≥3 años de trabajo con comunidades campesinas.

**Instrucciones para el evaluador:**
- Escala 1-5 (1 = muy deficiente, 5 = excelente)
- `variable_id`: ¿la narrativa menciona las cifras reales que causaron la decisión?
- `comprehensibility`: ¿un técnico sin conocimientos de IA entendería el texto?
- `faithfulness`: ¿la narrativa describe lo que realmente pasó con el agente?
- Comentarios libres en el campo de texto libre

---

## 6. Métricas de Acuerdo Inter-Evaluadores

Requiere ≥2 archivos `evaluator_*.json` en `reports/explainability/expert/`.

```bash
PYTHONPATH=. .venv/bin/python \
  experiments/explainability/validation/inter_rater.py \
  --reports-dir reports/explainability/expert/

# Leer el informe
cat reports/explainability/expert/inter_rater_analysis.md
```

**Interpretación del Fleiss' Kappa (κ):**

| κ | Interpretación |
|---|---------------|
| < 0.20 | Leve (revisar criterios de evaluación) |
| 0.20 – 0.40 | Moderado (aceptable para estudio exploratorio) |
| 0.40 – 0.60 | Sustancial (meta mínima para artículo 20CCC) |
| 0.60 – 0.80 | Considerable (resultado sólido) |
| > 0.80 | Casi perfecto |

**Meta del artículo:** κ ≥ 0.40 en los tres criterios.

---

## 7. Diagnóstico de Errores Frecuentes

### El pipeline se queda esperando (timeout)
```bash
# Verificar que Ollama responde
curl -s --max-time 5 http://localhost:11434/api/tags
# Si falla: ollama serve &

# Verificar que el modelo existe
ollama list
# Si falta: ollama pull gemma3:4b
```

### Ollama responde pero las narrativas están vacías
```bash
# Test directo al modelo
curl -s http://localhost:11434/api/generate \
  -d '{"model":"gemma3:4b","prompt":"Hola, ¿cómo estás?","stream":false}' | \
  python -c "import json,sys; print(json.load(sys.stdin)['response'][:200])"
```

### No se detectan episodios en un tratamiento
```bash
# Verificar contenido del CSV
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. \
  .venv/bin/python -c "
import csv
from collections import Counter
with open('data/experiments/E5/E419/wpsSimulator.csv', newline='', encoding='utf-8-sig') as f:
    r = csv.DictReader(f)
    rows = [row for row in r if row.get('date','').strip()]
    money = [float(row['money']) for row in rows if row.get('money')]
    print(f'Filas con fecha: {len(rows)}')
    print(f'Money min: \${min(money):,.0f} | max: \${max(money):,.0f}')
    print(f'Money < 500k: {sum(1 for m in money if m < 500000)}')
"
# Si money > 500k en todas las filas, el tratamiento no tiene episodios CRISIS (normal para capital alto)
```

### Error de importación `ModuleNotFoundError: No module named 'experiments'`
```bash
# Asegurarse de incluir '.' en PYTHONPATH
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. .venv/bin/python ...
#                                       ↑ este punto es crucial
```

### GuardError o traceback en los logs
Los errores en guards son capturados por `GuardErrorHandler` y no detienen el pipeline. Revisar el log completo y verificar que el pipeline termina con `✅ Pipeline completo`.

---

## 8. Secuencia Completa Recomendada para el Artículo 20CCC

```bash
# Paso 1: Smoke test (5 minutos)
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. \
  .venv/bin/python experiments/explainability/orchestrator.py \
  --treatment E401 --max-episodes 2

# Paso 2: Generación completa con muestra representativa (3-4 horas)
PYTHONPATH=besa-python:ethosterra-python:. ETHOSTERRA_ROOT=. \
  .venv/bin/python experiments/explainability/orchestrator.py \
  --all --max-episodes 5

# Paso 3: Validación Experto 1
PYTHONPATH=. .venv/bin/python \
  experiments/explainability/validation/expert_cli.py \
  --report reports/explainability/json/explainability_all.json \
  --evaluator "Experto1"

# Paso 4: Validación Experto 2
PYTHONPATH=. .venv/bin/python \
  experiments/explainability/validation/expert_cli.py \
  --report reports/explainability/json/explainability_all.json \
  --evaluator "Experto2"

# Paso 5: Análisis inter-evaluadores (para la tabla del artículo)
PYTHONPATH=. .venv/bin/python \
  experiments/explainability/validation/inter_rater.py \
  --reports-dir reports/explainability/expert/

# Paso 6: Compilar tablas LaTeX
cat reports/explainability/latex/table_E4*.tex > reports/tabla_explicabilidad.tex
```

---

## Análisis para Futuras Mejoras

### F1 — Variedad de Episodios (CRÍTICO)

**Problema:** El 100% de los episodios detectados son de tipo `CRISIS`. Los tipos `ALTERNATIVE_WORK`, `LOAN_REQUEST`, `EMOTIONAL_SHIFT` y `HARVEST` no se activan en el E5 porque:
- Los agentes ejecutan 93.5% `leisure_activities` y 6.5% `waste_time_and_resources` (bug de prioridad BDI)
- Las emociones permanecen neutrales en todos los tratamientos
- No hay producción agrícola, por tanto no hay cosechas ni préstamos activos

**Mejoras propuestas:**
```
A. Corregir la prioridad BDI (fix documentado en AVANCE_COHERENCIA.md) y
   re-ejecutar los 27 tratamientos para obtener episodios HARVEST y ALTERNATIVE_WORK.

B. Añadir detección de LEISURE como tipo de episodio propio:
   - Episodio LEISURE: agente en crisis Y meta activa es leisure_activities
   - Esto explica el hallazgo principal del E5: "¿Por qué la familia elige ocio durante crisis?"
   - Es el episodio más relevante para el artículo (revela el bug BDI como fenómeno explicable)

C. Ajustar threshold de CRISIS de 500k a 700k para capturar más variedad
   en tratamientos con capital inicial de 750k (E401-E409).
```

### F2 — Volumen de Episodios (CRÍTICO para escalabilidad)

**Problema:** Los 27 tratamientos generan 4,952 episodios totales. Con 2 llamadas LLM × 60s = ~82 horas de procesamiento. Inmanejable.

**Mejoras propuestas:**
```python
# Opción A: Muestreo estratificado por agente (implementar en episode_extractor.py)
# Máx 1 episodio de cada tipo por agente por tratamiento
MAX_PER_AGENT_PER_TYPE = 1

# Opción B: Flag --max-episodes-per-treatment (ya existe --max-episodes global)
# Sugerido para el artículo: 5 episodios × 27 tratamientos = 135 total (~2.25 horas)

# Opción C: Procesamiento asíncrono con asyncio + httpx.AsyncClient
# Permitiría N episodios en paralelo → velocidad N× mayor
```

### F3 — Llamadas LLM Asíncronas (mejora de rendimiento)

**Problema:** El `OllamaLLMBroker` procesa requests de forma secuencial (un hilo, una cola). Con 135 episodios × 2 LLM calls × 60s = 4.5 horas en total.

**Mejora:** Reemplazar el broker por `httpx.AsyncClient` con `asyncio.gather()`:
```python
# En ollama_broker.py — versión async
async def generate_narratives_async(contexts: list[ContextData]) -> list[str]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        tasks = [_call_ollama_async(client, ctx) for ctx in contexts]
        return await asyncio.gather(*tasks)
# Con concurrency=5, 135 episodios tardarían ~27 minutos en lugar de 4.5 horas
```

### F4 — Persistencia de Resultados Intermedios (robustez)

**Problema:** Si el pipeline falla a mitad (crash de Ollama, red, etc.), se pierden todas las narrativas generadas.

**Mejora:** Checkpoint por episodio:
```python
# En report_aggregator.py: guardar cada narrativa validada inmediatamente
def _save_checkpoint(self, vnd: ValidatedNarrativeData) -> None:
    tid = vnd.narrative_data.context.episode.treatment_id
    ep_idx = vnd.narrative_data.context.episode.episode_index
    path = REPORTS_DIR / "checkpoints" / f"{tid}_{ep_idx:04d}.json"
    path.write_text(json.dumps(_vnd_to_dict(vnd), ensure_ascii=False))

# En orchestrator.py: al iniciar, cargar checkpoints y saltar episodios ya procesados
already_done = set(f.stem for f in (REPORTS_DIR / "checkpoints").glob("*.json"))
```

### F5 — Mejora del Prompt de Calidad (precisión de scores)

**Problema:** El LLM generador y el LLM validador son el mismo modelo (`gemma3:4b`). El validador tiende a ser condescendiente con sus propias generaciones.

**Mejoras:**
```
A. Usar un modelo diferente para validación:
   --quality-model llama3.2:3b   (separar roles)

B. Añadir "cadena de pensamiento" al prompt de calidad:
   "Antes de dar el puntaje, lista las variables mencionadas en la narrativa
    vs. las variables reales del episodio. Luego evalúa."

C. Validación por referencia: comparar contra una narrativa gold standard
   escrita manualmente por un experto para 3-5 episodios tipo.
```

### F6 — Traducción de `activation_when` (completitud)

**Problema:** El traductor en `context_builder.py` no cubre todas las expresiones YAML del corpus. Algunos `activation_when_human` muestran la expresión Java sin traducir.

**Mejora:** Ampliar el diccionario de reglas:
```python
# Casos que faltan en el corpus actual (detectados con grep en data/ebdi/goals/):
(r"state\.peasantProfile\.loanAmountToPay\s*>\s*0", "hay deuda pendiente de préstamo"),
(r"belief\.get\('have_loan'\)\s*==\s*true", "tiene un préstamo activo"),
(r"belief\.get\('loan_denied'\)\s*==\s*true", "el banco rechazó el préstamo anterior"),
(r"belief\.get\('time_left_on_day'\)\s*>=\s*(\d+)",
 lambda m: f"quedan ≥ {int(m.group(1))//60}h en el día"),
(r"state\.getCurrentWeek\(\)\s*%\s*4\s*==\s*0", "es fin de mes (semana 4)"),
```

### F7 — Interfaz Web para Validación de Expertos

**Problema:** La validación CLI (`expert_cli.py`) es funcional pero poco amigable. Los expertos rurales pueden no estar cómodos con la terminal.

**Mejora:** Integrar el formulario en `ethosterra-ui/`:
```
Nueva ruta: /api/explainability/narratives → GET lista de narrativas
Nueva página: /explainability/validate → formulario React con:
  - Tarjeta con la narrativa
  - Sliders 1-5 para cada criterio
  - Campo de comentario
  - Botón "Siguiente narrativa"
Guardar en: reports/explainability/expert/evaluator_{session}.json
```

### F8 — Métricas Adicionales para el Artículo

**Para fortalecer la sección de resultados del 20CCC:**

| Métrica | Descripción | Cómo calcular |
|---------|-------------|--------------|
| BLEU vs gold-standard | Similitud lexicográfica con narrativas expertas | `nltk.bleu_score` |
| Longitud de narrativa | Verificar que no sean demasiado cortas/largas | `len(text.split())` |
| Coverage de variables | % de variables del episodio mencionadas | regex sobre el texto |
| Consistencia inter-episodios | Narrativas similares para episodios similares | cosine similarity embeddings |
| Tiempo de generación | Latencia por episodio (SLA para producción) | `time.perf_counter()` |

```python
# Añadir a ValidatedNarrativeData:
generation_time_s: float    # tiempo llamada narrativa
quality_time_s: float       # tiempo llamada validación
word_count: int             # longitud narrativa
```

### F9 — Soberanía de Datos y Privacidad

**Ollama local garantiza que los datos nunca salen del servidor.** Para fortalecer esto en el artículo:
- Documentar el hash SHA256 del modelo descargado: `ollama show gemma3:4b --modelfile | grep sha`
- Registrar que todos los experimentos corren sin conexión a internet (modo offline)
- Añadir flag `--offline` que verifique que `OLLAMA_HOST` no apunta a un servidor externo

### F10 — Nuevo Tipo de Episodio: BYSTANDER

**Idea nueva para el artículo:** Detectar episodios donde un agente vecino fue afectado por una perturbación (robo, sequía, enfermedad de cultivo) y el agente focal tuvo que adaptar su comportamiento. Estos episodios tienen mayor riqueza narrativa porque involucran la red social.

```python
# En episode_extractor.py — nuevo tipo:
elif social_capital < prev_social.get(agent, 0.5) - 0.05:
    ep_type = "SOCIAL_SHOCK"   # pérdida súbita de capital social
```

---

## Resumen de Prioridades para el 20CCC

| # | Mejora | Impacto en artículo | Esfuerzo |
|---|--------|--------------------|----|
| F1-B | Añadir tipo LEISURE (explicar el bug BDI) | Alto — es el hallazgo principal | Bajo |
| F2-B | Flag `--max-episodes 5` (ya existe) | Alto — hace el experimento manejable | Ninguno |
| F5-B | Cadena de pensamiento en prompt calidad | Medio — mejora scores | Bajo |
| F6 | Ampliar traductor activation_when | Medio — mejora comprensibilidad | Bajo |
| F3 | Async LLM calls | Alto para producción | Medio |
| F4 | Checkpoints intermedios | Alto para robustez | Medio |
| F8 | Métricas adicionales (BLEU, coverage) | Alto para sección resultados | Medio |
| F7 | Interfaz web validación | Bajo para artículo, alto para demos | Alto |
