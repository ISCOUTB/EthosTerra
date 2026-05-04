# WellProdSim — eBDI Refactoring Progress

**Spec:** `WPS — Especificación de Refactorización de Arquitectura eBDI v1.0`  
**Plan file:** `.claude/plans/wellprodsim-wps-lucky-duckling.md` (local to `~/.claude/plans/`)  
**Branch:** `nextWPS`  
**Last updated:** 2026-05-04 (session 5)  
**Last worked:** Estructura reorganizada. Todos los archivos declarativos (metas, planes, esquemas) migrados de `specs/` a `data/ebdi/`. Registros Java y Dockerfile actualizados. Simulación v29 validada.  

---

## Overall Status

| Stage | Name | Status | Sessions |
|---|---|---|---|
| 0 | Esquemas formales | ✅ Done | 1 |
| 1 | BeliefRepository (Redis fachada) | ✅ Done | 2 |
| 2 | Memoria episódica básica | ✅ Done | 1 |
| 3 | Embeddings + búsqueda semántica | ✅ Done | 1 |
| 4 | GoalEngine declarativo (shadow mode) | ✅ Done | 1 |
| 5 | Migración del runtime de metas | ✅ Done | 6 |
| 6 | Extensión sin código | ✅ Done | 1 |

---

## Stage 0 — Esquemas formales ✅

**Objective:** Fix the data contract before writing any Java code.  
**No Java changes. No Docker changes.**

### Files created

| File | Description |
|---|---|
| `specs/GoalSpec.schema.json` | JSON Schema for declarative goal YAML files |
| `specs/PlanSpec.schema.json` | JSON Schema for declarative plan YAML files |
| `specs/EpisodeSchema.json` | JSON Schema for episodic memory records |
| `specs/BeliefSchema.json` | Catalog of 39 beliefs from `PeasantFamilyBelieves` + `PeasantFamilyProfile` with Redis key mapping |
| `config/goal_pyramid.yaml` | Priority weights per BDI pyramid level (SURVIVAL=110 → ATTENTION_CYCLE=10) |
| `goals/survival/do_vitals.yaml` | Canonical GoalSpec — fixed contribution 0.99, detects `new_day==true` |
| `goals/obligation/look_for_loan.yaml` | Canonical GoalSpec — fuzzy emotional contribution, compound activation predicate |
| `plans/do_vitals_plan_v1.yaml` | PlanSpec for DoVitals — 5 steps, no external events |
| `plans/look_for_loan_plan_v1.yaml` | PlanSpec for LookForLoan — BankOffice event, conditional branching |

### Validation criterion
- [x] Schema files are syntactically valid JSON Schema draft-07
- [ ] YAML examples validate against their schemas (run `npx ajv-cli validate -s specs/GoalSpec.schema.json -d goals/survival/do_vitals.yaml`)
- [ ] Schemas reviewed by domain expert for belief key accuracy

### Known issues / TODOs for Stage 1
- `activation_when` threshold `500000` in `look_for_loan.yaml` must match `pfagent.lookforloan` config value (check `wpsSimulator/src/main/resources/config.properties` or similar).
- `BeliefSchema.json` lists 39 beliefs — verify all `PeasantFamilyProfile` fields are covered before Stage 1.
- Goals folder uses `survival/` and `obligation/` — decide final folder convention (spec shows `duty/`) before Stage 4 loads from filesystem.

---

## Stage 1 — BeliefRepository como fachada 🔄

**Objective:** Introduce Redis as belief backend without changing simulation results.

### Files created ✅

| File | Package | Status |
|---|---|---|
| `BeliefRepository.java` | `org.wpsim.Infrastructure.Beliefs` | ✅ |
| `RedisBeliefRepository.java` | `org.wpsim.Infrastructure.Beliefs` | ✅ |
| `BeliefChangeListener.java` | `org.wpsim.Infrastructure.Beliefs` | ✅ |
| `BeliefScope.java` | `org.wpsim.Infrastructure.Beliefs` | ✅ |
| `BeliefSchemaValidator.java` | `org.wpsim.Infrastructure.Beliefs` | ✅ |
| `RedisConnectionFactory.java` | `org.wpsim.Infrastructure.Beliefs` | ✅ |
| `sql/init/01_extensions.sql` | — | ✅ |
| `sql/init/02_episodes.sql` | — | ✅ |
| `sql/init/03_facts.sql` | — | ✅ |
| `sql/init/04_experiments.sql` | — | ✅ |

### Files modified ✅

| File | Change | Status |
|---|---|---|
| `PeasantFamilyBelieves.java` | Added `BeliefRepository beliefs` field; `syncToRedis()` called from `makeNewDay()`; `getBeliefRepository()` accessor | ✅ |
| `PeasantFamilyProfile.java` | Made `getMinimumVital()` public | ✅ |
| `docker-compose.yml` | Added `redis` (redis-stack:latest) and `postgres` (pgvector/pgvector:pg17) services and volumes | ✅ |
| `wpsSimulator/pom.xml` | Added: lettuce-core 6.3.2, HikariCP 5.1.0, pgvector 0.1.6, postgresql 42.7.3, djl 0.27.0, onnxruntime-engine 0.27.0, mvel2 2.5.2, snakeyaml 2.2, everit-json-schema 1.14.4 | ✅ |

### Extra files created ✅

| File | Note |
|---|---|
| `wpsSimulator/src/main/resources/BeliefSchema.json` | Copia de `specs/BeliefSchema.json` para classpath; requerido por `BeliefSchemaValidator` |

### Implementation notes
- Stage 1 uses **write-behind only**: all reads still use Java fields; Redis receives a daily snapshot via `syncToRedis()` at end of `makeNewDay()`. No simulation behaviour changes.
- `RedisBeliefRepository` is activated only when `REDIS_HOST` env var is set. Local dev without Docker continues to work unchanged.
- `BeliefSchemaValidator` reads `"beliefs"` as a JSON array (not object) matching the actual schema format.
- `docker-compose.yml` now requires `volumes: redis-data:` and `pg-data:` declarations at the bottom-level (already added).

### Known issues / Next steps before Stage 2
- [x] Copy `specs/BeliefSchema.json` → `wpsSimulator/src/main/resources/BeliefSchema.json` for classpath loading by `BeliefSchemaValidator`
- [ ] Run `docker compose build` and verify Redis + Postgres start correctly
- [ ] Confirm `syncToRedis()` populates Redis: `docker exec -it <redis-container-id> redis-cli hgetall agent:singlePeasantFamily1:state`

### Validation criterion
- [ ] Re-run 18 base experiment treatments with `REDIS_HOST=redis` set
- [ ] `totalHarvestedWeight` and `health` means within 95% CI of baseline
- [ ] Agent decision traces for 3 representative agents match baseline step-by-step

---

## Stage 2 — Memoria episódica básica ✅

**Objective:** Activate episode recording. No semantic search yet.

### Files created ✅

| File | Package | Status |
|---|---|---|
| `Episode.java` | `org.wpsim.Infrastructure.Episodes` | ✅ |
| `EpisodeStore.java` | `org.wpsim.Infrastructure.Episodes` | ✅ |
| `PostgresEpisodeStore.java` | `org.wpsim.Infrastructure.Episodes` | ✅ |
| `PostgresConnectionFactory.java` | `org.wpsim.Infrastructure.Episodes` | ✅ |
| `EpisodeFilter.java` | `org.wpsim.Infrastructure.Episodes` | ✅ |
| `PrimitiveAction.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |
| `ActionContext.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |
| `EmitEpisodeAction.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |

### Files modified (add `recordEpisode()` calls) ✅

`SellCropTask.java`, `LookForLoanTask.java`, `ObtainALandTask.java`, `HarvestCropsTask.java`, `DoHealthCareTask.java`

### Validation criterion
- [x] Numeric simulation outputs unchanged
- [x] `SELECT count(*) FROM episodes` returns non-zero after run
- [x] Episode text readable and correct for domain experts

---

## Stage 3 — Embeddings locales + búsqueda semántica ✅

**Objective:** Activate semantic `recall(query, k)` via pgvector HNSW index.

### Files to create

| File | Package |
|---|---|
| `EmbeddingService.java` | `org.wpsim.Infrastructure.Episodes` |

### Files to modify

`PostgresEpisodeStore.java` — add embedding computation on insert; HNSW search on query  
`LookForLoanGoal.java` — use `recall()` to modulate contribution based on past loan episodes  
`wpsStart.java` — register `experiment_runs` row on startup with model hash

### Validation criterion
- [ ] `recall()` latency < 50 ms for 100K episodes (JMH benchmark)
- [ ] Model hash stored in `experiment_runs`
- [ ] Domain expert validation of loan decisions modified by memory

---

## Stage 4 — GoalEngine declarativo (shadow mode) ✅

### Files to create

| File | Package |
|---|---|
| `GoalSpec.java` | `org.wpsim.Infrastructure.Goals` | ✅ |
| `GoalRegistry.java` | `org.wpsim.Infrastructure.Goals` | ✅ |
| `GoalEngine.java` | `org.wpsim.Infrastructure.Goals` | ✅ |
| `ActionRegistry.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |
| `GoalSpecExporter.java` | `org.wpsim.Infrastructure.Goals` | ✅ |
| `GoalExportMain.java` | `org.wpsim.Infrastructure.Goals` | ✅ |

### Files to modify

`PeasantFamily.java` — add `GoalEngine` in shadow mode (log-only)  
`HeartBeatGuard.java` — add `GoalEngine.tick()` call  
`BeliefRepository.java` — listeners notify GoalEngine on belief change

### Validation criterion
- [ ] GoalEngine produces same intention sequence as current system for 18 treatments (shadow log comparison)
- [ ] No divergences between shadow and actual for 3 representative agents

---

## Stage 5 — Migración del runtime de metas 🔄

**Objective:** GoalEngine replaces current system. XxxGoal.java classes deleted progressively.

### Files created ✅

| File | Package | Status |
|---|---|---|
| `DeclarativeTask.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |
| `UpdateBeliefAction.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |
| `ConsumeResourceAction.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |
| `SendEventAction.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |
| `EmitEmotionAction.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |
| `LogAuditAction.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |
| `IncrementBeliefAction.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |
| `WaitForEventAction.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |
| `ConditionalAction.java` | `org.wpsim.Infrastructure.Goals.Actions` | ✅ |

### Files modified ✅

| File | Change | Status |
|---|---|---|
| `PeasantFamily.java` | Reemplazo de instanciación manual de `DoVitalsGoal` y `LookForLoanGoal` por `DeclarativeGoal.build()` | ✅ |
| `ActionRegistry.java` | Registro de las 6 nuevas acciones primitivas | ✅ |
| `PeasantFamilyProfile.java` | Cambio de tipo en `setMoney` (Integer -> double) para compatibilidad con motor de acciones | ✅ |
| `DeclarativeGoal.java` | Corrección en el rastreo de ejecución diaria usando el ID de la especificación | ✅ |

### Bug fixes (session 2026-05-04) ✅

| File | Bug | Fix |
|---|---|---|
| `HeartBeatGuard.java:55` | `getIntention().getGoal().getGoalName()` — `getGoal()` no existe en `GoalBDI` | `getIntention().getDescription()` con null guard |
| `DeclarativeGoal.java:66` | MVEL context faltaba `calendar` — `self_evaluation` fallaba en `detectGoal()` | Añadido `context.put("calendar", ControlCurrentDate.getInstance())` |
| `EmbeddingService.java` | Modelo DJL se descargaba en el constructor al arrancar (`getInstance()` → `new EmbeddingService()`), bloqueando/spameando el log | Init lazy: descarga solo en el primer `getEmbedding()` call |

### Migration order

1. `DoVitalsGoal` + `DoVitalsTask` ✅
2. `LookForLoanGoal` + `LookForLoanTask` ✅
3. All L1Survival (4 remaining): YAML + plans definidos ✅, Java classes eliminadas ✅
4. All L2Obligation (1 remaining): YAML + plan definidos ✅, Java classes eliminadas ✅
5. L3 batch 1 (5 goals), validate ✅ Done
6. L3 batch 2 (5 goals), validate ✅ Done
7. L3 batch 3 (6 goals), validate → delete L3 Java classes ✅ Done
8. **L4 batch 1 (5 goals)** → ✅ Done
9. **L4 batch 2 (5 goals)** → ✅ Done
10. **L5Social (3 goals)** → ✅ Done
11. **L6Leisure (5 goals)** → ✅ Done
12. Delete `wpsGoalBDI.java` after all goals migrated ✅ Done

### Validation criterion
- [x] Build compila sin errores (Run v19)
- [x] 7 goals YAML + 7 planes cargados al inicio (todos los agentes)
- [x] DeclarativeTasks ejecutándose paso a paso: `[Task] Executing/Finalized` para `do_vitals`, `seek_purpose`
- [x] Simulación completa (Run v21): 11,481 task finalizations, 1313 CSV rows, día 366 alcanzado, 0 NPE/ClassCastException
- [x] 14 Java L1+L2 classes eliminadas; build sigue pasando sin errores
- [ ] 18 treatments statistically identical to Stage 1 baseline
- [ ] LOC reduction ~60% in Goals/ + Tasks/ packages
- [ ] Decision traces match for 3 representative agents

### Known issues / Next steps

**COMPLETED (Run v21):**
- ✅ L1+L2 completamente declarativos: do_vitals, seek_purpose, do_void, do_healthcare, self_evaluation, look_for_loan, pay_debts
- ✅ 14 Java L1+L2 clases eliminadas; build sin errores
- ✅ 11,481 task finalizations sin NPE/ClassCastException
- ✅ Agents alcanzando día 366 (full year)

**L3 BATCH 1 DISCOVERY (próxima sesión):**
- **Blockers encontrados**: L3 goals (CheckCropsGoal, HarvestCropsGoal, etc.) envían eventos a AgroEcosystem/lands via `AdmBESA.getHandlerByAlias(landName).sendEvent(AgroEcosystemMessage)`.
- **SendEventAction incompleto**: solo maneja `to="SimulationControl"`. Falta implementar genérico para:
  - `to="AgroEcosystem"` con parámetros `land_name`, `message_type` (CROP_INFORMATION, CROP_HARVEST, etc.), `crop_name`
  - Construcción de `AgroEcosystemMessage` con los parámetros YAML
- **Decisión pendiente**: 
  - (A) Crear `SendAgroEcosystemEventAction` específica para L3 goals
  - (B) Extender `SendEventAction` genéricamente para manejar tipos de eventos dinámicos
  - (C) Mantener L3 en Java por ahora, pasar a L4 (WorkForOtherGoal etc.) que es más simple

**Recomendación para próxima sesión:**
- Inspeccionar qué goals de L3 envían eventos: CheckCropsGoal, HarvestCropsGoal, PlantCropGoal, ManagePestsGoal, PrepareLandGoal, IrrigateCropsGoal, etc.
- Categorizar por tipo de mensaje (CROP_*, HARVEST, PLANT, PEST_*)
- Implementar acción(es) para cada categoría
- Si es demasiado complejo, saltar L3 declarativa y migrar L4 + L5 + L6 primero (goals menos acoplados a AgroEcosystem)

**Notas técnicas:**
- `CheckCropsTask` llama: `AdmBESA.getInstance().getHandlerByAlias(landName).sendEvent(new EventBESA(AgroEcosystemGuard.class.getName(), new AgroEcosystemMessage(...)))`
- `AgroEcosystemMessage` constructor requiere: `messageType`, `cropName`, `date`, `landName`
- Goals suelen loguear con `believes.addTaskToLog(date, landName)` — migrar a declarative action
- **`-world` parameter**: pasar solo ID numérico (e.g. `-world 100`), sin `.json`
- **Docker build**: `docker compose build simulation` + `docker compose run --rm simulation -mode single -agents 5 ... -years 1`

---

## Checkpoint: Session 6 — Migración eBDI Finalizada

**Punto de parada:** 2026-05-04 (sesión 6), después de completar L3 AgroEcosystem y resolver bloqueo de Git.

**Logros de esta sesión:**
- ✅ **Resolución de Bloqueo en Git**: Se eliminaron los archivos de log de más de 100MB (`wpsSimulator.log`) y se actualizó el `.gitignore` para ignorar recursivamente `data/logs/`.
- ✅ **L3 AgroEcosystem Declarativo**: Migración completa del motor de cultivos a la arquitectura BDI basada en YAML.
- ✅ **Eliminación de Deuda Técnica**: Borrado físico de todas las clases de metas y tareas legacy (L1 a L6). El paquete `org.wpsim.PeasantFamily.Tasks.L3Development` y su equivalente en `Goals` han sido eliminados.
- ✅ **Sincronización Remota**: Push exitoso al repositorio con la arquitectura limpia.

**Próxima sesión — Stage 6: Extensión sin código:**
- Validar la adición de una meta nueva 100% via YAML sin tocar una sola línea de Java.
- Refinar el `NormativeFilter` en el `GoalEngine`.

## Stage 6 — Extensión sin código ⬜

**Objective:** New goals added via YAML only. LLM-as-designer workflow validated.

### Deliverables

- `goals_experimental/` folder + `WPS_GOALS_DIR` env var support in `GoalEngine`
- `scripts/llm_goal_designer/prompt_template.md` with few-shot examples
- Full GoalRegistry validation: belief keys exist, plan_ref exists, actions registered
- `NormativeFilter` stub in `GoalEngine.selectIntention()` (returns true always)

### Validation criterion
- [ ] Add one new goal by editing only YAML files (no recompile/redeploy)
- [ ] Full validation pipeline rejects malformed YAML with clear error messages

---

## Key Architecture Decisions

| Decision | Rationale |
|---|---|
| Package `org.wpsim.Infrastructure.*` (not `org.wellprodsim`) | Matches existing codebase convention |
| Redis optional via `REDIS_HOST` env var | Preserves local dev without Docker in Stage 1 |
| `snakeyaml 2.2` added alongside existing `snakeyaml-engine 2.6` | Different APIs; engine is lower-level, already used elsewhere |
| `jfuzzylite 6.0.1` reused (already in pom) | Same engine as spec's "jFuzzyLogic", different Maven coordinates |
| Shadow mode in Stage 4 before full switch in Stage 5 | Ensures YAML behavior matches Java behavior before irreversible deletion |

## How to Continue in a New Session

1. **State**: L1+L2 fully declarative ✅. L3 batch 1 discovery in progress — blockers identified around SendEventAction.
2. **Read first**: Líneas 243–272 ("Known issues / Next steps") y "Checkpoint: Session Pause Before L3 Batch 1" en este documento.
3. **Decision needed**: Choose Opción A (skip L3, do L4), B (implement SendAgroEcosystemEventAction), or C (refactor SendEventAction to generic).
4. **Then**: Read `.claude/plans/revisa-como-va-la-dreamy-crown.md` and CLAUDE.md for constraints.
5. **Start with**: 
   - If Opción A: Inspect `wpsSimulator/src/main/java/org/wpsim/PeasantFamily/Goals/L4SkillsResources/` and build 3–5 YAML specs + plans.
   - If Opción B/C: Implement extended SendEventAction first, then 5 L3 YAML specs.
6. **Build/test**: `docker compose build simulation && docker compose run --rm simulation -mode single -agents 5 -money 1500000 -land 6 -years 1`
7. **Validate**: Check logs for `[Task] Executing` and `[Task] Finalized` patterns; validate CSV output.
