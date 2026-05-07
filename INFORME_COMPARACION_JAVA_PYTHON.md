# Informe de Verificación: Ecuaciones, Funcionalidades y Coherencia

## EthosTerra/ethosterra-python (Python) vs EthosJava/wpsSimulator (Java)

**Fecha:** Mayo 2026  
**Alcance:** Comparación sistemática de 8 áreas críticas del simulador  
**Metodología:** Lectura y comparación lado a lado de todos los archivos fuente relevantes

---

## RESUMEN EJECUTIVO

| Área | Veredicto |
|------|-----------|
| 1. Arquitectura de Agentes y Ciclo BDI | **MAJOR_DISCREPANCIES** |
| 2. Modelo de Cultivos FAO-56 | **MAJOR_DISCREPANCIES** |
| 3. Modelo Emocional (eBDI) | **MAJOR_DISCREPANCIES** |
| 4. Modelo Económico/Recursos | **MAJOR_DISCREPANCIES** |
| 5. Eventos de Perturbación | **MAJOR_DISCREPANCIES** |
| 6. Control de Simulación | **MAJOR_DISCREPANCIES** |
| 7. Datos y Configuración (YAML, clima, mundo, acciones) | **COHERENTE** |
| 8. Salidas y Métricas (CSV, experimentos) | **MAJOR_DISCREPANCIES** |

**Conclusión:** De las 8 áreas evaluadas, **6 presentan discrepancias mayores**, 1 es coherente (archivos YAML/JSON), y 1 tiene formato incompatible (CSV). El puerto Python **NO es un reemplazo funcionalmente equivalente** del simulador Java. Las diferencias no son de calibración fina — representan modelos conceptuales distintos.

---

## 1. ARQUITECTURA DE AGENTES Y CICLO BDI — MAJOR_DISCREPANCIES

### 1.1 Arquitectura del Ciclo

| Aspecto | Java | Python |
|---------|------|--------|
| Arquitectura | Event-driven, multi-guard (4 guards: gate → detect → process → cleanup) | Síncrono, monolítico (`BDIMachine.tick()`) |
| Disparo | Guard `DesireToIntentionInstantiationGuard` activado por eventos | Llamada directa `tick()` desde `HeartBeatGuard` |
| Serialización | Flags `isEndedTheDesiresMachine` / `isInQueue` previenen concurrencia | Sin serialización (asume single-thread) |
| Garbage collection | Timer 1s → `GarbageCollectorTimerTask` → elimina goals no viables | No existe (solo elimina goals que triunfan) |
| Goals potenciales | `PotencialGoalStructure` con 6 `SortedSet` tipados | Lista plana `list[GoalBDI]` |

### 1.2 Umbrales de Viabilidad — DISCREPANCIA CRÍTICA

**Java** (`DesireToIntentionInstantiationGuard.java:46-133`): Usa **el mismo umbral por tipo** para las 3 fases:
```java
goal.getDetectionValue() > paramsBDI.get[TYPE]Threshold()      // detection
goal.getPlausibilityLevel() > paramsBDI.get[TYPE]Threshold()   // plausibility
goal.getViabilityValue() > paramsBDI.get[TYPE]Threshold()      // viability
```

**Python** (`bdi_machine.py:42, 48-49`):
```python
g.detect_goal(state.believes) > state.threshold               # usa threshold (0.3 default)
g.evaluate_plausibility(state.believes) > 0                    # literal 0 — INCORRECTO
g.evaluate_viability(state.believes) > 0                       # literal 0 — INCORRECTO
```

**Impacto:** En Python, cualquier goal con plausibilidad/viabilidad > 0 pasa el filtro, sin importar cuán bajo sea el umbral configurado. Esto genera **muchos más goals viables** que en Java.

### 1.3 Checks Post-Selección Ausentes

| Check | Java | Python |
|-------|------|--------|
| `evaluateMappingViability` (re-chequeo de viabilidad post-selección) | Sí | **NO** |
| `predictResultUnlegality` (predicción de legalidad) | Sí | **NO** |

### 1.4 Diferencias de Ejecución

| Aspecto | Java | Python |
|---------|------|--------|
| Intenciones por ciclo | **1** (con despacho por roles) | **Todas** las viables (bucle interno) |
| Orden de procesamiento | Por tipo: DUTY→NEED→OPORTUNITY→REQUIREMENT→SURVIVAL→ATTENTION_CYCLE | Orden de inserción (sin garantía) |

### 1.5 Referencias de Issues en Código

| File | Line | Issue |
|------|------|-------|
| `besa-python/besa/bdi/bdi_machine.py` | 48 | `> 0` debería ser `> state.threshold` para plausibilidad |
| `besa-python/besa/bdi/bdi_machine.py` | 49 | `> 0` debería ser `> state.threshold` para viabilidad |
| `besa-python/besa/bdi/bdi_machine.py` | — | Falta `evaluateMappingViability` post-selección |
| `besa-python/besa/bdi/bdi_machine.py` | — | Falta `predictResultUnlegality` |
| `besa-python/besa/bdi/bdi_machine.py` | — | Falta garbage collection de goals |
| `besa-python/besa/bdi/bdi_machine.py` | 39 | Lista plana de goals sin clasificación por tipo |

---

## 2. MODELO DE CULTIVOS FAO-56 — MAJOR_DISCREPANCIES

### 2.1 BUG CRÍTICO: Propiedades de Suelo Invertidas

**Python** (`agro_ecosystem.py:36-39`):
| Suelo | FC | WP | FC-WP | TAW |
|-------|----|----|-------|-----|
| SAND  | 0.05 | 0.25 | **-0.20** | **NEGATIVO** |
| LOAM  | 0.11 | 0.30 | **-0.19** | **NEGATIVO** |
| CLAY  | 0.40 | 0.55 | **-0.15** | **NEGATIVO** |
| SILT  | 0.15 | 0.35 | **-0.20** | **NEGATIVO** |

**Java** (`Soil.java:12-52`):
| Suelo | FC | WP | FC-WP |
|-------|----|----|-------|
| SAND  | 0.17 | 0.07 | **+0.10** |
| LOAM  | 0.30 | 0.17 | **+0.13** |
| CLAY  | 0.40 | 0.24 | **+0.16** |
| SILT  | 0.36 | 0.22 | **+0.14** |

**Consecuencia:** FC < WP en Python → TAW negativo → RAW negativo → el estrés hídrico **nunca se activa** (Dr nunca puede exceder RAW negativo). Las plantas nunca sufren sequía.

### 2.2 ET₀ — Métodos Fundamentalmente Diferentes

| Aspecto | Java | Python |
|---------|------|--------|
| Método | Carga datos pre-calculados de JSON (muestra Gaussiana) | Calcula Hargreaves desde primeros principios |
| Ecuación | `ET₀ = Gaussian(avg_mes, stddev_mes)` | `et0 = 0.0023 * Rs * (Tavg+17.8) * sqrt(Tavg-Tmin)` |
| Problema | — | Usa `Rs` en vez de `Ra`; `sqrt(Tavg-Tmin)` en vez de `sqrt(Tmax-Tmin)` |

**Nunca producirán los mismos valores de ET₀.**

### 2.3 GDD (Grados Día de Crecimiento)

**Java** (`CropLayer.java:80`): `gdd += temperature` (acumula temperatura bruta, sin restar Tbase)

**Python** (`agro_ecosystem.py:139`): `gdd += max(0, temp - 10)` (resta Tbase=10°C, aplica floor=0)

**Impacto:** La velocidad de desarrollo de cultivos será **sustancialmente diferente** entre implementaciones.

### 2.4 Acumulación de Biomasa

| Aspecto | Java | Python |
|---------|------|--------|
| Coeficiente | `ε_max * k_conv = 3.024` | `WUE = 5.0` |
| Decaimiento | Ninguno | `AGB *= 1 - p_adj * 0.1` |

### 2.5 Balance Hídrico del Suelo

**Python** (`agro_ecosystem.py:158-160`): `Dr_end = max(0, Dr_start + ETc - Rain)`

**Java** (`CropLayer.java:183-184`): `Dr_end = (Rain > Dr_start) ? RAW : Dr_start - Rain - Irr + ETc_adj`

Diferente manejo en el límite de agotamiento. Java incluye irrigación en el balance; Python no.

### 2.6 Coeficiente Ks (Estrés Hídrico)

- Python usa `p` (fracción base) en el denominador (correcto según FAO-56)
- Java usa `p_adj` (fracción ajustada) en el denominador (incorrecto)
- Python aplica `max(0, Ks)`; Java no limita Ks inferiormente

### 2.7 Radiación Extraterrestre

| Lat | Python (MJ/m²/día) | Java (MJ/m²/día) |
|-----|---------------------|-------------------|
| 0°  | 11.5–12.5           | 30.1–45.3        |
| 10° | 11.5–13.5           | 28.0–44.2        |

Magnitudes completamente diferentes entre las tablas.

---

## 3. MODELO EMOCIONAL (eBDI) — MAJOR_DISCREPANCIES

### 3.1 Fórmula de Intensidad OCC — Ausente en Python

**Java** (`EmotionalModel.java:64-81`): Computa intensidad como suma ponderada de valores semánticos Persona/Evento/Objeto con estimación de valencia.

**Python** (`emotional_evaluator.py:94-102`): Omite completamente la fórmula OCC. Usa un delta plano desde una tabla de influencias predefinidas multiplicado por `0.05 * p_mod`.

### 3.2 Pesos Persona/Evento/Objeto

**Java** (`Utils.java:17-19`): `PersonWeight=0.3`, `EventWeight=0.4`, `ObjectWeight=0.3`

**Python**: No existen. El `SemanticDictionary` de Python es un diccionario plano sin distinción de tipos.

### 3.3 Factor de Olvido (Decaimiento Emocional)

**Java** (`EmotionAxis.java:144-163`): Decaimiento lineal temporal por eje con `forgetFactor` propio:
- `HappinessSadness=0.4`, `HopefulUncertainty=0.1`, `SecureInsecure=0.1`

**Python** (`heart_beat.py:32`): Solo `happiness -= 0.003` por tick. Sin base value, sin forget factor, sin decaimiento para otros ejes.

### 3.4 Integración Emocional en Decisiones — Ausente

Java integra emociones en 4+ puntos del agente:
- Escala de trabajo (`wpsLandTask`: `ceil(workDone * emotionalFactor)`)
- Recuperación de salud (`IncreaseHealthAction`)
- Consumo de tiempo (`PeasantFamilyBelieves.useTime()`)
- Selección de goals (`wpsGoalBDI.evaluateEmotionalContribution()` — blend 50/50 con fuzzy)

**Python no tiene ninguna de estas integraciones.** Los componentes emocionales existen pero no están conectados a la lógica de decisión.

### 3.5 Reglas Fuzzy

| Aspecto | Java | Python |
|---------|------|--------|
| Membresía | **IDÉNTICA** (todas las funciones) | **IDÉNTICA** |
| Reglas | Carga externa (hasta 243 combinaciones) | 5 reglas hardcodeadas |
| Defuzzificación | Centroide (Centroid) + Maximum | Centroide (idéntico) |

### 3.6 Factor Emocional — COHERENTE

Ambos implementan idénticamente:
```
>= 0.7 → 1.4;  > 0.5 → 1.2;  > 0.3 → 1.0;  else → 0.9
```

---

## 4. MODELO ECONÓMICO/RECURSOS — MAJOR_DISCREPANCIES

### 4.1 Costo Diario

| Aspecto | Java | Python |
|---------|------|--------|
| Fórmula | `money -= minimalVital` (12000 fijo) | `daily_cost = 5000 + food_security * 3000` (variable 5000-8000) |
| Estado | Posiblemente código muerto en EBDI | Activo cada heartbeat |

### 4.2 Seguridad Alimentaria

**Java**: No existe el concepto de `food_security`.

**Python**: Mecánica central — afecta costo diario, crisis, salud. Degrada `-0.005/día`.

### 4.3 Salud

| Aspecto | Java | Python |
|---------|------|--------|
| Escala | Entero 0-100 | Float 0.0-1.0 |
| Degradación | `health -= 5` cuando `money <= 0` | `health -= 0.002` cuando `food_security < 0.3 OR money < 50000` |
| Mejora | Aleatorio: `+ (random*21)*factor` | Determinista: `+ 0.001/día` si condiciones buenas |

### 4.4 Detección de Crisis

Python tiene sistema completo (`is_in_crisis`, `is_in_prolonged_crisis`, `days_in_crisis`). Java no tiene equivalente.

### 4.5 Préstamos

| Aspecto | Java | Python |
|---------|------|--------|
| Plazo máximo | 12 meses | 12 meses |
| Interés | **0%** | **2%** por plazo |
| Pago mensual | `amount / maxTerm` | `(amount / maxTerm) * 1.02` |

### 4.6 Precios de Mercado

| Recurso | Java | Python | Factor |
|---------|------|--------|--------|
| Agua | 3 | 5,000 | **1667x** |
| Semillas | 50,000 | 15,000 | 0.3x |
| Pesticidas | 9,300 | 20,000 | 2.2x |
| Herramientas | 50,000 | 50,000 | **1x** |
| Ganado | 2,400 | 200,000 | 83x |

| Cultivo | Java | Python | Factor |
|---------|------|--------|--------|
| Maíz | 700 | 2,000 | 2.9x |
| Fríjol | 2,200 | 4,000 | 1.8x |
| Café | 2,800 | 8,000 | 2.9x |
| Plátano | 900 | 3,000 | 3.3x |
| Arroz | 1,100 | 3,000 | 2.7x |
| Raíces | 1,000 | 2,500 | 2.5x |

### 4.7 Otros Parámetros Divergentes

| Parámetro | Java | Python |
|-----------|------|--------|
| Dinero inicial | 3,000,000 | 1,500,000 |
| Mínimo vital | 12,000 | 50,000 |
| Salud inicial | 100 (int) | 0.8 (float) |
| Agua inicial | 9,999,999 | 10 |
| Semillas iniciales | 0 | 10 |
| Personalidad | 0.0 | 0.3 |
| Dinero banco | 1,000,000,000 | 100,000,000 |
| Varianza default | 0.4 | -1.0 (sin varianza) |
| Capacitación | 0.1 (con training) | 0.4 siempre |
| Cupos capacitación | 50 | 10 |
| Venta emergencia | No existe | Sí (semillas a 2000, herramientas a 5000) |

---

## 5. EVENTOS DE PERTURBACIÓN — MAJOR_DISCREPANCIES

### 5.1 Concepto Completamente Diferente

| Aspecto | Java | Python |
|---------|------|--------|
| **Qué hace** | Perturbación de **precios** de mercado | **Desastres naturales** (sequía, inundación, plaga) |
| **Target** | MarketPlace (ajusta ±precios) | PeasantFamily (afecta recursos/cultivos) |

### 5.2 Posible Bug: Eventos Generados Pero Nunca Enviados

**Python** (`perturbation_generator.py:51-53`): El `PerturbationGeneratorGuard` genera eventos y los almacena en `state.current_events` pero **nunca los envía** a los campesinos. No existe llamada `send_to()` o broadcast.

El guard `NaturalPhenomena` en `PeasantFamily` está registrado pero nunca recibirá eventos.

### 5.3 Tipos de Eventos en Python

| Evento | Probabilidad | Severidad | Duración |
|--------|-------------|-----------|----------|
| Sequía | 5% | [0.3, 0.7] | [15, 44] días |
| Inundación | 3% | [0.2, 0.5] | [5, 14] días |
| Plaga | 4% | [0.3, 0.8] | [20, 59] días |
| Terremoto | 1% (definido pero **sin código** que lo genere) | — | — |

### 5.4 Java: Perturbación de Precios

- Probabilidad: 1% por tick
- Tipos: `INCREASE/DECREASE_TOOLS_PRICE`, `INCREASE/DECREASE_SEEDS_PRICE`, `INCREASE/DECREASE_CROP_PRICE`
- Impacto: `5 + random(0..31) * 5` (rango 5-160%)
- Python no tiene equivalente

---

## 6. CONTROL DE SIMULACIÓN — MAJOR_DISCREPANCIES

### 6.1 Arquitectura: Descentralizada vs Centralizada

| Aspecto | Java | Python |
|---------|------|--------|
| Avance de reloj | Cada agente avanza autónomamente (PeriodicGuard) | `SimulationRunner` central avanza para todos |
| Sincronización | `checkAgentsStatus()` pausa agentes rápidos si se alejan > N días del más lento | Sin rate-limiting entre agentes |
| Muerte de agente | `shutdownAgentBDI()` → `DeadAgentGuard` → `killAgent()` | Sin detección de muerte |

### 6.2 Guards de Ciclo de Vida Ausentes en Python

| Guard | Java | Python |
|-------|------|--------|
| `AliveAgentGuard` | Sí (registro de agente vivo) | **NO** |
| `DeadAgentGuard` | Sí (notificación de muerte) | **NO** |
| `FromSimulationControlGuard` | Sí (pause/unpause de agente) | **NO** |
| `DeadContainerGuard` | Sí (contenedor vacío) | **NO** |

### 6.3 Parámetros de Simulación

| Parámetro | Java | Python |
|-----------|------|--------|
| Velocidad | `steptime` (int, ms, frecuencia de guard periódico) | `speed` (float, segundos, sleep del thread central) |
| `steptime` en Python | — | Campo existe pero **no se usa** |
| Fecha inicial | De archivo de configuración | **Hardcodeada** `"01/01/2024"` |
| Progreso | `(100.0 * elapsed) / total` | Runner: `(elapsed/total)*100`; Guard: ignora `years`, siempre 1 año |

### 6.4 Secuencia de Inicio

**Python añade pero Java no tiene:**
- Servidor WebSocket (puerto 8000)
- API HTTP de control (puerto 8001)
- `SimulationRunner` como thread

**Java tiene pero Python no:**
- Pausa de 2000ms tras crear servicios
- Registro de experimento en PostgreSQL

---

## 7. DATOS Y CONFIGURACIÓN — COHERENTE

### 7.1 Archivos YAML de Goals y Planes

| Categoría | Goals | Planes |
|-----------|-------|--------|
| survival | 5 | 5 |
| agro | 9 | 9 |
| obligation | 3 | 3 |
| skills | 10 | 10 |
| social | 5 | 5 |
| leisure | 5 | 4 |
| **Total** | **37** | **36** |

**Resultado:** Todos los archivos YAML son **byte-por-byte idénticos** entre proyectos. Campos `activation_when`, `contribution_rules`, `plan_ref`, `effects` — todos coinciden perfectamente.

### 7.2 Goal Pyramid (`config/goal_pyramid.yaml`)

**Idéntico** en ambos proyectos (94 líneas). Mismos 6 niveles, pesos, sub-niveles y asignaciones de goals.

### 7.3 Archivos de Mundo (`data/worlds/`)

13 archivos JSON idénticos en ambos proyectos. Verificados con `md5sum`.

### 7.4 Registro de Acciones Primitivas

| Acción | Java | Python |
|--------|------|--------|
| emit_episode | ✓ | ✓ |
| update_belief | ✓ | ✓ |
| consume_resource | ✓ | ✓ (difiere: Python aplica eficiencia por personalidad) |
| send_event | ✓ | ✓ |
| send_marketplace_event | ✓ | ✓ |
| send_civic_land_request | ✓ | ✓ |
| emit_emotion | ✓ | ✓ |
| increase_health | ✓ | ✓ |
| sync_clock | ✓ | ✓ |
| log_audit | ✓ | ✓ |
| increment_belief | ✓ | ✓ |
| wait_for_event | ✓ | ✓ |
| conditional | ✓ | ✓ |
| send_society_collaboration | ✓ | ✓ |
| spend_friends_time | ✓ | ✓ |
| agro_ecosystem_operation | ✓ | ✓ |
| set_land_crop_type | **NO** | ✓ (solo Python) |

---

## 8. SALIDAS Y MÉTRICAS — MAJOR_DISCREPANCIES

### 8.1 Formato CSV

| Aspecto | Java | Python |
|---------|------|--------|
| Columnas | ~31 (posicionales) | 14 (nombradas con header) |
| Header | No | Sí |
| Métricas clave | season, affinity, leisureType, resourceNeededType, tools, seeds, water, pesticides, contractor | happiness, social_capital, food_security, task_log, days_in_crisis, current_goal, loans_active |
| Thread-safe | No evidente | Sí (`threading.Lock`) |

**Formatos incompatibles.** Las columnas no tienen correspondencia 1:1.

### 8.2 Métricas de Experimentos (solo Python)

- **Productividad:** `(final_money_avg + total_harvested) / avg_parcels` (normalizado min-max)
- **Bienestar:** `(positive_emotion_count - negative_emotion_count) + health_avg` (normalizado min-max)
- **Comparación estadística:** Spearman, Pearson, RMSE, MAD, K-S test

No existe equivalente en Java.

---

## RECOMENDACIONES PRIORIZADAS

### Críticas (impiden equivalencia funcional)

| # | Issue | Archivo | Línea |
|---|-------|---------|-------|
| 1 | **Suelos: FC y WP invertidos** → TAW negativo, sin estrés hídrico | `agro_ecosystem.py` | 36-39 |
| 2 | **Umbrales de plausibilidad/viabilidad** usan literal `> 0` en vez de `> state.threshold` | `bdi_machine.py` | 48-49 |
| 3 | **Faltan checks post-selección** (`evaluateMappingViability`, `predictResultUnlegality`) | `bdi_machine.py` | — |
| 4 | **Eventos de perturbación generados pero nunca enviados** a agentes | `perturbation_generator.py` | 51-53 |
| 5 | **Perturbación de precios de mercado ausente** (Java la tiene, Python no) | `perturbation_generator.py` | — |

### Altas (desvían resultados significativamente)

| # | Issue | Archivo | Línea |
|---|-------|---------|-------|
| 6 | **Precios de mercado divergen** (agua 1667x, ganado 83x, cultivos 2-3x) | `market_place.py` | 38-43 |
| 7 | **Préstamos: Java 0% interés, Python 2%** | `bank_office.py` | 63-66 |
| 8 | **ET₀: Hargreaves vs datos Gaussianos** → nunca coincidirán | `agro_ecosystem.py` | 361 |
| 9 | **GDD: Java no resta Tbase** (acumula temp bruta vs temp-10) | `agro_ecosystem.py` | 139 |
| 10 | **Biomasa: WUE=5.0 vs ε_max*k_conv=3.024** + decaimiento extra en Python | `agro_ecosystem.py` | 172-175 |
| 11 | **Mínimo vital: 12,000 vs 50,000** (crisis se dispara a diferente nivel) | `peasant_family_believes.py` | 78 |
| 12 | **Agua inicial: 9,999,999 vs 10** (escasez artificial en Python) | `peasant_family_believes.py` | — |

### Medias (simplificaciones que cambian comportamiento)

| # | Issue |
|---|-------|
| 13 | Sin garbage collection de goals → acumulación ilimitada de goals no viables |
| 14 | Sin guards de ciclo de vida (`AliveAgentGuard`, `DeadAgentGuard`, `FromSimulationControlGuard`) |
| 15 | Sin rate-limiting entre agentes rápidos/lentos |
| 16 | Modelo emocional OCC reemplazado por modelo de deltas planos |
| 17 | Sin integración emocional en decisiones (trabajo, salud, tiempo, goals) |
| 18 | Sin decaimiento emocional por eje (solo felicidad decrece constante) |
| 19 | `food_security` no existe en Java (mecánica nueva en Python) |
| 20 | Salud en escala diferente (0-100 entero vs 0-1 float) |
| 21 | Fecha inicial hardcodeada `"01/01/2024"` en vez de config-driven |
| 22 | `set_land_crop_type` action solo en Python |
| 23 | CSV incompatible (14 columnas con header vs ~31 posicionales) |

### Áreas Coherentes (no requieren cambios)

- Archivos YAML de goals/planes (37 goals, 36 planes) — byte-por-byte idénticos
- Goal pyramid (`config/goal_pyramid.yaml`) — idéntico
- Archivos de mundo (`data/worlds/*.json`) — idénticos
- 16/17 acciones primitivas — equivalentes
- Parámetros de cultivo (Kc, GDD, profundidad, fracción p) para 8 cultivos — idénticos
- Membresía fuzzy del evaluador emocional — idéntica
- Factor emocional y umbrales — idénticos
- Pirámide de deseos (6 niveles, orden de prioridad) — idéntica
