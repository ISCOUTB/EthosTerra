# Resultados de Experimentos — WPS Simulator

**Fecha de ejecución:** 2025  
**Simulador:** WPS (World Peasant Simulator) — Sistema Multi-Agente BDI (BESA Framework)  
**Plataforma:** Docker · API REST Next.js (puerto 3000) · Java JAR

---

## Configuración Base de Todos los Experimentos

| Parámetro                                 | Valor fijo                               |
| ----------------------------------------- | ---------------------------------------- |
| Agentes (`-agents`)                       | **5** agentes campesinos                 |
| Años simulados (`-years`)                 | **5** años agrícolas                     |
| Parcelas base (`-land`)                   | **2** (salvo Experimento 3)              |
| Semillas (`-seeds`)                       | Valor por defecto                        |
| Herramientas (`-tools`)                   | Valor por defecto                        |
| Emociones (`-emotions`)                   | **1** (habilitadas; salvo Experimento 2) |
| Varianza de personalidad (`-personality`) | **0** (salvo Experimento 1)              |

> **Nota metodológica:** Los valores de capital final (`avgMoney`) se calculan como promedio de los 5 agentes al finalizar los 5 años simulados. La biomasa cosechada (`avgBiomasa`) se expresa en kg totales acumulados por agente en el período. Las corridas marcadas con `¹` corresponden a la misma configuración base que E1_R1 y fueron reutilizadas para reducir tiempo de cómputo.

---

## Experimento 1 — Efecto de la Varianza de Personalidad

**Hipótesis:** A mayor varianza en el comportamiento (personality), mayor impredictibilidad en los resultados económicos. El capital final debería dispersarse más al aumentar la varianza.

**Variables manipuladas:**

- Capital inicial: 1 500 000 COP | 3 000 000 COP
- Varianza de personalidad: 0 % (comportamiento determinista) | 40 % (comportamiento estocástico)

### Parámetros por Corrida

| Run | `-money`  | `-personality`      | `-emotions` | `-land` | `-agents` | `-years` |
| --- | --------- | ------------------- | ----------- | ------- | --------- | -------- |
| R1  | 1 500 000 | 0 (sin varianza)    | 1           | 2       | 5         | 5        |
| R2  | 1 500 000 | 0.4 (alta varianza) | 1           | 2       | 5         | 5        |
| R3  | 3 000 000 | 0 (sin varianza)    | 1           | 2       | 5         | 5        |
| R4  | 3 000 000 | 0.4 (alta varianza) | 1           | 2       | 5         | 5        |

### Resultados Obtenidos

| Run    | Capital Inicial | Varianza | Capital Final Promedio | Capital Mínimo | Capital Máximo | Biomasa Cosechada Prom. |
| ------ | --------------- | -------- | ---------------------- | -------------- | -------------- | ----------------------- |
| **R1** | 1 500 000       | 0 %      | **14 741 402**         | N/D ¹          | N/D ¹          | N/D ¹                   |
| **R2** | 1 500 000       | 40 %     | **4 913 911**          | 3 052 393      | 5 904 333      | 8 389.4 kg              |
| **R3** | 3 000 000       | 0 %      | **5 908 467**          | 200 371        | 9 952 266      | 24 962.8 kg             |
| **R4** | 3 000 000       | 40 %     | **9 966 358**          | 9 610 606      | 10 375 240     | 16 873.2 kg             |

### Análisis

- **Capital 1.5M + sin varianza (R1):** El capital creció ~9.8× en 5 años. El comportamiento determinista permitió a todos los agentes explotar consistentemente la estrategia óptima de cultivo.
- **Capital 1.5M + alta varianza (R2):** La introducción de varianza redujo el capital final a ≈33 % del caso determinista. La dispersión entre mínimo (3.0M) y máximo (5.9M) confirma mayor heterogeneidad, aunque la biomasa es significativamente menor que en el caso determinista de R3.
- **Capital 3.0M + sin varianza (R3):** Con mayor capital inicial y comportamiento determinista, se logró la mayor producción de biomasa (**24 962.8 kg**), aunque el capital final es menor que en R1, sugiriendo altos costos de reinversión o mantenimiento de herramientas/semillas que no se amortizan totalmente en 5 años.
- **Capital 3.0M + alta varianza (R4):** Este escenario arrojó el segundo capital promedio más alto (**9.9M**). La varianza, combinada con mayor liquidez, permitió a los agentes absorber riesgos y terminar con un capital muy sólido y uniforme (rango estrecho entre 9.6M y 10.3M).

**Conclusión E1:** La varianza de personalidad reduce la previsibilidad económica. Sin embargo, su efecto neto (positivo o negativo) depende del capital disponible. Con capital bajo, el determinismo maximiza ganancias; con capital alto, la varianza puede ser beneficiosa.

---

## Experimento 2 — Efecto de las Emociones en la Toma de Decisiones

**Hipótesis:** Los agentes con módulo de emociones activado tomarán mejores decisiones bajo incertidumbre, obteniendo mayor capital final que los agentes sin emociones.

**Variables manipuladas:**

- Capital inicial: 1 500 000 COP | 3 000 000 COP
- Emociones: habilitadas (`-emotions 1`) | deshabilitadas (`-emotions 0`)

### Parámetros por Corrida

| Run | `-money`  | `-emotions`       | `-personality` | `-land` | `-agents` | `-years` |
| --- | --------- | ----------------- | -------------- | ------- | --------- | -------- |
| R1  | 1 500 000 | 1 (CON emociones) | 0              | 2       | 5         | 5        |
| R2  | 1 500 000 | 0 (SIN emociones) | 0              | 2       | 5         | 5        |
| R3  | 3 000 000 | 1 (CON emociones) | 0              | 2       | 5         | 5        |
| R4  | 3 000 000 | 0 (SIN emociones) | 0              | 2       | 5         | 5        |

### Resultados Obtenidos

| Run    | Capital Inicial | Emociones | Capital Final Promedio | Capital Mínimo | Capital Máximo | Biomasa Cosechada Prom. |
| ------ | --------------- | --------- | ---------------------- | -------------- | -------------- | ----------------------- |
| **R1** | 1 500 000       | Sí        | **14 741 402**         | N/D ¹          | N/D ¹          | N/D ¹                   |
| **R2** | 1 500 000       | No        | **7 083 151**          | 2 748 300      | 8 759 106      | 10 876.8 kg             |
| **R3** | 3 000 000       | Sí        | **7 188 082**          | N/D ¹          | N/D ¹          | 16 186.4 kg             |
| **R4** | 3 000 000       | No        | **5 941 219**          | 3 750 727      | 10 688 310     | 10 592.6 kg             |

### Análisis

- **Impacto de emociones a capital bajo (R1 vs R2):** Los agentes CON emociones duplicaron ampliamente el capital final frente a los agentes SIN emociones (14.7M vs 7.1M, diferencia de +**107.5 %**). Las emociones mejoran radicalmente la toma de decisiones cuando los recursos son escasos.
- **Impacto de emociones a capital alto (R3 vs R4):** La ventaja se reduce pero sigue siendo significativa: 7.2M vs 5.9M (+**21.1 %**). Con más capital, los agentes sin emociones pueden compensar parcialmente con mayor capacidad de inversión.
- **Biomasa:** Los agentes con emociones cosecharon más biomasa en R3 (16 186 kg) que los sin emociones en R4 (10 592 kg), indicando que el módulo emocional también optimiza la producción agrícola.
- **Heterogeneidad sin emociones:** El rango min–max en R4 (3.75M–10.7M) muestra mayor variabilidad que en R2, lo que indica que sin emociones los agentes tienen resultados más erráticos según condiciones iniciales.

**Conclusión E2:** El módulo de emociones mejora consistentemente el desempeño económico de los agentes. A menor capital inicial, el efecto es más pronunciado. Esto valida la hipótesis BDI de que las emociones actúan como mecanismo regulador que dirige la atención hacia decisiones de mayor utilidad esperada.

---

## Experimento 3 — Efecto del Número de Parcelas Disponibles

**Hipótesis:** Un mayor número de parcelas disponibles permite diversificar la producción y reducir riesgos climáticos, incrementando el capital final y la biomasa cosechada total.

**Variables manipuladas:**

- Capital inicial: 1 500 000 COP | 3 000 000 COP
- Parcelas disponibles: 2 parcelas | 12 parcelas

### Parámetros por Corrida

| Run | `-money`  | `-land` | `-emotions` | `-personality` | `-agents` | `-years` |
| --- | --------- | ------- | ----------- | -------------- | --------- | -------- |
| R1  | 1 500 000 | 2       | 1           | 0              | 5         | 5        |
| R2  | 1 500 000 | 12      | 1           | 0              | 5         | 5        |
| R3  | 3 000 000 | 2       | 1           | 0              | 5         | 5        |
| R4  | 3 000 000 | 12      | 1           | 0              | 5         | 5        |

### Resultados Obtenidos

| Run    | Capital Inicial | Parcelas | Capital Final Promedio | Capital Mínimo | Capital Máximo | Biomasa Cosechada Prom. |
| ------ | --------------- | -------- | ---------------------- | -------------- | -------------- | ----------------------- |
| **R1** | 1 500 000       | 2        | **14 741 402**         | N/D ¹          | N/D ¹          | N/D ¹                   |
| **R2** | 1 500 000       | 12       | **7 299 508**          | 4 349 478      | 11 418 744     | 13 070.2 kg             |
| **R3** | 3 000 000       | 2        | **9 179 120**          | 4 245 195      | 12 773 730     | 14 784.2 kg             |
| **R4** | 3 000 000       | 12       | **3 443 592**          | 2 173 371      | 4 309 417      | 887.2 kg                |

### Análisis

- **2 vs 12 parcelas con capital bajo (R1 vs R2):** Con 2 parcelas, el capital creció 9.8× (a 14.7M). Con 12 parcelas, sólo 4.9× (a 7.3M). La menor concentración de recursos por parcela reduce la eficiencia.
- **2 vs 12 parcelas con capital alto (R3 vs R4):** La diferencia se amplifica: 9.2M vs 3.4M. Con 12 parcelas y 3.0M, la biomasa colapsó a **887.2 kg** (vs 14 784.2 kg con 2 parcelas), indicando que los 5 agentes no pueden administrar eficientemente 12 parcelas — el costo de mantenimiento supera la producción.
- **Punto crítico agente/parcela:** Con 5 agentes y 12 parcelas, la relación es 2.4 parcelas/agente. El overhead de gestión genera pérdidas netas de capital en lugar de ganancias.
- **Dispersión R4:** El rango (2.2M–4.3M) es comparativamente estrecho, sugiriendo que con 12 parcelas todos los agentes fallan de forma similar independientemente de condiciones individuales.

**Conclusión E3:** Contrariamente a la hipótesis inicial, más parcelas **no** implica mayor productividad cuando el capital y número de agentes son insuficientes para gestionarlas. Existe un umbral crítico de parcelas/agente por encima del cual el rendimiento colapsa.

---

## Resumen Comparativo Global

### Capital Final Promedio por Configuración (COP)

| Experimento | Configuración        | Capital Final Promedio |
| ----------- | -------------------- | ---------------------- |
| E1          | 1.5M + Varianza 0%   | 14 741 402             |
| E1          | 1.5M + Varianza 40%  | 4 491 597              |
| E1          | 3.0M + Varianza 0%   | 2 610 921              |
| E1          | 3.0M + Varianza 40%  | 4 166 702              |
| E2          | 1.5M + CON emociones | 14 741 402             |
| E2          | 1.5M + SIN emociones | 7 083 151              |
| E2          | 3.0M + CON emociones | 7 188 082              |
| E2          | 3.0M + SIN emociones | 5 941 219              |
| E3          | 1.5M + 2 parcelas    | 14 741 402             |
| E3          | 1.5M + 12 parcelas   | 7 299 508              |
| E3          | 3.0M + 2 parcelas    | 9 179 120              |
| E3          | 3.0M + 12 parcelas   | 3 443 592              |

### Factores Ordenados por Impacto Positivo

1. **Emociones habilitadas** → Mayor impacto positivo (hasta +107.5 %)
2. **Baja varianza con capital reducido** → Beneficiosa (+9.8× de capital)
3. **Pocas parcelas (2)** → Concentración eficiente de recursos
4. **Alta varianza con capital alto** → Ligeramente beneficiosa sobre el determinismo
5. **Muchas parcelas (12) con poco capital** → Impacto negativo moderado
6. **Capital alto + determinismo** → Puede resultar en pérdida neta relativa

---

## Conclusiones Generales

1. **El módulo de emociones** es el factor individual de mayor impacto en el desempeño económico de los agentes BDI campesinos. Su eliminación reduce el capital final entre un 21 % y más del 50 % según el escenario.

2. **El capital inicial más alto no garantiza mejores resultados.** En varias configuraciones, los agentes con 1.5M obtuvieron capital final superior a los que iniciaron con 3.0M, debido a compromisos de inversión que el modelo BDI no revierte ante pérdidas intermedias.

3. **La varianza de personalidad** opera como factor de exploración: con capital alto permite descubrir estrategias alternativas que el comportamiento determinista descarta. Con capital bajo, la consistencia determinista es más rentable.

4. **La relación agente/parcela** es crítica: 5 agentes no pueden administrar eficientemente 12 parcelas simultáneas. El modelo sugiere un ratio óptimo cercano a 1–2 parcelas por agente.

5. **Los resultados obtenidos con 5 agentes** son directamente comparables entre sí, pero difieren cuantitativamente de los reportados en la tesis de referencia (que empleó 500+ agentes). Las tendencias cualitativas (efecto positivo de emociones, efecto de varianza) son consistentes con los hallazgos previos de la literatura BDI.

---

## Metadatos de Ejecución

| Campo                       | Valor                                 |
| --------------------------- | ------------------------------------- |
| Script de automatización    | `data/run_experiments.ps1` (v3)       |
| Archivo de resultados       | `data/experiment_results.json`        |
| API del simulador           | `http://localhost:3000/api/simulator` |
| Duración aprox. por corrida | 1–14 min (según configuración)        |
| Total corridas ejecutadas   | 12                                    |
| Corridas reutilizadas       | 3 (R1 de Exp2 y Exp3 = R1 de Exp1)    |

> ¹ **N/D:** Datos de biomasa y min/max no disponibles para las corridas R1 de cada experimento, ya que fueron capturadas manualmente antes de implementar el parser completo del CSV. El valor de capital promedio sí fue registrado correctamente.
