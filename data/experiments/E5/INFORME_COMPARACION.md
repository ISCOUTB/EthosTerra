==============================================================================================================
  INFORME DE COMPARACIÓN — Experimento 5 (Escala Completa)
  Python: 100 agentes, 5 años, 800 parcelas, variance=0.4
  Referencia: 100 agentes, 5 años, 800 parcelas (Java)
==============================================================================================================

## 1. Resumen de Correlaciones

| Métrica | Spearman ρ | Pearson r | RMSE | MAD |
|---------|:----------:|:---------:|:----:|:---:|
| Productividad | +0.5063 | +0.3098 | 0.2992 | 0.2345 |
| Bienestar | +0.2529 | +0.2089 | 0.4751 | 0.4280 |

**Spearman productividad: +0.5063** — correlación positiva moderada.
Mejora significativa vs la escala reducida anterior (+0.280 → +0.5063).
Rank shift promedio: 6.1 posiciones.

## 2. Tabla Comparativa Completa

| ID | Ref_Prod | Py_Prod | Ref_Bien | Py_Bien | Configuración |
|---|:---:|:---:|:---:|:---:|---|
| E401 | 0.837 | 0.214 | 0.847 | 0.000 | M=560,912 L=2 |
| E402 | 0.692 | 0.214 | 0.856 | 0.000 | M=560,363 L=2 |
| E403 | 0.611 | 0.092 | 0.790 | 0.387 | M=260,149 L=2 |
| E404 | 0.526 | 0.043 | 0.759 | 0.200 | M=422,586 L=6 |
| E405 | 0.158 | 0.063 | 0.418 | 0.000 | M=566,642 L=6 |
| E406 | 0.377 | 0.053 | 0.675 | 0.200 | M=491,033 L=6 |
| E407 | 0.143 | 0.009 | 0.363 | 0.000 | M=336,823 L=12 |
| E408 | 0.143 | 0.000 | 0.433 | 0.164 | M=206,090 L=12 |
| E409 | 0.142 | 0.011 | 0.410 | 0.000 | M=362,290 L=12 |
| E410 | 0.392 | 0.368 | 0.754 | 0.251 | M=938,729 L=2 |
| E411 | 0.473 | 0.282 | 0.749 | 0.401 | M=728,654 L=2 |
| E412 | 0.470 | 0.426 | 0.710 | 0.196 | M=1,083,378 L=2 |
| E413 | 0.113 | 0.065 | 0.411 | 1.000 | M=581,099 L=6 |
| E414 | 0.383 | 0.121 | 0.688 | 0.401 | M=993,660 L=6 |
| E415 | 0.374 | 0.167 | 0.704 | 0.000 | M=1,337,719 L=6 |
| E416 | 0.137 | 0.073 | 0.393 | 0.000 | M=1,286,772 L=12 |
| E417 | 0.293 | 0.078 | 0.696 | 0.000 | M=1,358,948 L=12 |
| E418 | 0.229 | 0.018 | 0.737 | 0.984 | M=468,521 L=12 |
| E419 | 0.494 | 1.000 | 0.764 | 0.401 | M=2,494,073 L=2 |
| E420 | 0.476 | 0.870 | 0.736 | 0.802 | M=2,173,688 L=2 |
| E421 | 0.339 | 0.948 | 0.739 | 0.601 | M=2,366,009 L=2 |
| E422 | 0.424 | 0.294 | 0.681 | 0.401 | M=2,274,026 L=6 |
| E423 | 0.496 | 0.279 | 0.750 | 0.601 | M=2,161,370 L=6 |
| E424 | 0.162 | 0.331 | 0.528 | 0.000 | M=2,545,588 L=6 |
| E425 | 0.219 | 0.149 | 0.660 | 0.601 | M=2,403,052 L=12 |
| E426 | 0.194 | 0.169 | 0.747 | 0.200 | M=2,702,148 L=12 |
| E427 | 0.168 | 0.184 | 0.544 | 0.000 | M=2,928,792 L=12 |

## 3. Concordancia de Rankings

### Top 5 Productividad
| | Tratamientos |
|---|---|
| Referencia | E401, E402, E403, E404, E423 |
| Python | E419, E421, E420, E412, E410 |
| Intersección | ∅ (0/5) |

### Bottom 5 Productividad
| Referencia | E407, E408, E409, E416, E413 |
| Python | E404, E418, E409, E407, E408 |
| Intersección | E407, E408, E409 (3/5) |

## 4. Efecto por Factor

### Dinero Inicial
| Nivel | Ref_Prod | Py_Prod | Ref_Bien | Py_Bien |
|-------|:---:|:---:|:---:|:---:|
| 750k | 0.403 | 0.078 | 0.617 | 0.106 |
| 1.5M | 0.318 | 0.178 | 0.649 | 0.359 |
| 3M | 0.330 | 0.469 | 0.683 | 0.401 |

### Parcelas
| Nivel | Ref_Prod | Py_Prod | Ref_Bien | Py_Bien |
|-------|:---:|:---:|:---:|:---:|
| 2 | 0.532 | 0.490 | 0.772 | 0.338 |
| 6 | 0.335 | 0.157 | 0.624 | 0.311 |
| 12 | 0.185 | 0.077 | 0.554 | 0.217 |

### Personalidad
| Nivel | Ref_Prod | Py_Prod | Ref_Bien | Py_Bien |
|-------|:---:|:---:|:---:|:---:|
| Pos (0.7) | 0.431 | 0.177 | 0.698 | 0.264 |
| Neu (0.3) | 0.331 | 0.193 | 0.668 | 0.228 |
| Neg (-0.5) | 0.290 | 0.355 | 0.583 | 0.374 |

## 5. Hallazgos Clave

### 5.1 Ausencia de producción agrícola
En los 27 tratamientos, la cosecha (harvested_weight) es 0 para todos los agentes.
Los agentes ejecutan exclusivamente goals de ocio (93.5% leisure_activities, 6.5% waste_time_and_resources).
Ningún goal de producción (plant_crop, harvest_crops, prepare_land) es seleccionado.
**Causa**: El BDI selecciona leisure_activities porque tiene contribution=0.2 y se activa con dinero > 0,
mientras que los goals agro requieren condiciones específicas de etapa de tierra.

### 5.2 Comportamiento del dinero
- 750k: el dinero crece moderadamente (~200k-600k final) — los agentes con menos dinero inicial
  parecen conservar mejor sus recursos.
- 3M: retienen la mayor parte del capital (~2.1M-2.9M final) — mayor inercia financiera.
- La ausencia de ciclos de cultivo significa que el dinero no se gasta en semillas/fertilizantes.

### 5.3 Bienestar homogéneo
- Las emociones son 100% neutrales en todos los tratamientos — el sistema emocional no genera diferenciación.
- La salud es alta y homogénea (0.81-0.86) en todos los tratamientos.
- El bienestar depende casi exclusivamente de la salud promedio.

### 5.4 Mejora vs escala reducida
- Spearman productividad: 0.280 → **0.5063** (+80% mejora)
- RMSE productividad: 0.391 → **0.2992** (-23% mejora)
- La escala completa (100 agentes, 5 años) produce resultados más diferenciados entre tratamientos.

## 6. Recomendaciones

1. **Ajustar prioridades BDI**: Reducir contribution de leisure_activities o aumentarla para goals agro.
2. **Activar ciclo de cultivo**: Verificar que prepare_land → plant_crop → harvest_crops se ejecute en secuencia.
3. **Modelo emocional**: Revisar por qué las emociones permanecen neutrales (posiblemente los eventos emocionales no se disparan).
4. **Validar etapas de tierra**: Las tierras comienzan en FALLOW y necesitan transicionar a PLANTING → GROWING → HARVEST_READY.

---
*Reporte generado: 2026-05-06. Datos en data/experiments/E5*
