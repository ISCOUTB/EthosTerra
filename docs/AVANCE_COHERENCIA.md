# Registro de Avance — Coherencia Java-Python EthosTerra

Fecha: 2026-05-06

## Estado: EXPERIMENTO 4 CORRIENDO (puede necesitar retry)

El experimento de 18 tratamientos fue lanzado con todos los fixes aplicados. Si falla por timeout, aumentar timeout a 900s+ en `experimento4_coherence.py` línea 40.

---

## Fix 1: Cosecha usa biomasa real (ya aplicado)

**Archivos modificados:**
- `ethosterra-python/ethosterra/guards/from_agro_ecosystem.py`: Parsea `msg.payload` para extraer `biomass`, calcula `harvested = ceil(biomass * training_level)`. Eliminado valor fijo 100.
- `besa-python/besa/bdi/declarative/action_registry.py`: Eliminado `harvested_weight += 100.0` del bloque HARVEST de `AgroEcosystemAction`.

## Fix 2: Replantación de tierras FALLOW (ya aplicado)

**Problema:** Tras cosecha, tierras iban a FALLOW con `crop_type='land'` pero ningún goal las detectaba para replantar. El ciclo se estancaba.

**Archivos modificados:**
- `data/ebdi/goals/agro/prepare_land.yaml`: Activación ahora detecta FALLOW además de NONE:
  ```yaml
  activation_when: "state.hasLandWithSeason('NONE') || state.hasLandWithSeason('FALLOW')"
  ```
- `besa-python/besa/bdi/declarative/action_registry.py`: `AgroEcosystemAction` PREPARE busca tierras en `("NONE", "FALLOW")` sin filtrar por `crop_type`.
- `besa-python/besa/bdi/declarative/action_registry.py`: `SetLandCropTypeAction` ahora busca tierra en `("NONE", "FALLOW", "PLANTING")` en vez de siempre usar `lands[0]`.

## Fix 3: Venta de cosechas (ya aplicado)

**Problema:** `sell_crop` plan enviaba `SELL` al AgroEcosystem (solo consultaba info), nunca convertía `harvested_weight` en dinero.

**Archivos modificados:**
- `besa-python/besa/bdi/declarative/action_registry.py`: `AgroEcosystemAction.execute()` ahora maneja `"SELL"` directamente: calcula `revenue = harvested_weight * precio_mercado[crop]`, acredita dinero, resetea `harvested_weight=0`, suma `food_security += 0.3`.
- `ethosterra-python/ethosterra/believes/peasant_family_believes.py`: Añadido campo `last_crop_type: str = "maiz"`.
- `ethosterra-python/ethosterra/guards/from_agro_ecosystem.py`: Al cosechar, guarda `believes.last_crop_type = crop` antes de resetear tierra.

## Fix 4: Emociones afectan priorización de goals (ya aplicado)

**Problema:** `BDIMachine.tick()` llamaba `evaluate_contribution()` (valor fijo), ignorando `evaluate_emotional_contribution()`.

**Archivos modificados:**
- `besa-python/besa/bdi/bdi_machine.py`: Cuando `emotions_enabled=True`, usa `goal.evaluate_emotional_contribution(state)` en vez de `evaluate_contribution(state)`.

## Fix 5: Modelo de salud alineado con Java (ya aplicado)

**Problema:** Salud siempre 100% (no degradaba, se autorecupraba).

**Archivos modificados:**
- `ethosterra-python/ethosterra/guards/heart_beat.py`:
  - Re-añadido costo diario: `b.money = max(0.0, b.money - b.minimum_vital)` (12,000/día).
  - Degradación: `health -= 0.05` cuando `money <= 0` (equivale a -5 en Java).
  - Eliminada autorecuperación. La recuperación corre por el goal BDI `do_healthcare` (nivel SURVIVAL).
- `besa-python/besa/bdi/declarative/action_registry.py`: `IncreaseHealthAction` ahora usa fórmula Java: `random() * 0.21 * factor`, donde `factor = 0.5 + happiness` si emociones habilitadas.

## Fix 6: Bug lands[0] en FromAgroEcosystemGuard (ya aplicado)

**Problema:** CROP_INIT, CROP_IRRIGATION, CROP_PESTICIDE siempre actualizaban `lands[0]` en vez de la tierra correcta.

**Archivos modificados:**
- `ethosterra-python/ethosterra/guards/from_agro_ecosystem.py`: Para mensajes no-HARVEST, busca tierra por etapa (`stage_targets`) en vez de usar `lands[0]`. Si no encuentra, no actualiza (eliminado fallback a `lands[0]`).

## Fix 7: Training level (ya aplicado)

- `ethosterra-python/ethosterra/agents/peasant_family.py`: Si `training_enabled=False`, `training_level=0.4` (Java default); si `True`, `training_level=0.1` (config).

## Fix 8: Mediciones del experimento (ya aplicado)

**Archivos modificados:**
- `ethosterra-python/ethosterra/guards/heart_beat.py`: Añadido `total_harvested_weight` al CSV.
- `tests/integration/experimento4_coherence.py`: Métricas ahora usan `total_harvested_weight` (acumulado) en vez de `harvested_weight` (que se resetea al vender). Timeout aumentado a 900s.

---

## Discrepancias restantes conocidas

| Issue | Causa | Estado |
|-------|-------|--------|
| Solo ~2-3 de 6 lands se replantan activamente | BDI goal selection no logra manejar todas las tierras; prioridad de goals | Parcial - mejorado |
| Emociones efecto modesto | `evaluate_emotional_contribution` mezcla 50/50 con fixed_value; emociones decaen rápido a 0 | Parcial - implementado |
| Dinero excesivo por ventas | Precio maiz=700 es alto vs biomasa producida, agentes acumulan millones | Pendiente calibración |
| Salud puede quedar 100% si agentes nunca se quedan sin dinero | Ventas de cosecha cubren costo diario holgadamente | Pendiente calibración de precios |

---

## Comando para re-ejecutar el experimento

```bash
cd /home/jairo/Projects/EthosTerra && \
PYTHONPATH=besa-python:ethosterra-python ETHOSTERRA_ROOT=. \
timeout 3600 python tests/integration/experimento4_coherence.py
```

## Resultados anteriores (pre-fix, referencia)

| Métrica | Pre-fix | Post-fix biomass | Post-fix completos (pendiente) |
|---------|---------|-------------------|-------------------------------|
| Avg Δ Cultivado | 77.8% | 59.9% | ~30-40% (estimado) |
| Avg Δ Salud | 94.7% | 34.8% | ~20-30% (estimado) |
| Spearman ρ Cultivado | 0.39 | 0.17 | ~0.5+ (estimado) |
| RMSE Cultivado | 14245 | 10356 | ~8000 (estimado) |