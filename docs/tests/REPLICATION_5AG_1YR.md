# Prueba de Replicación: 5 Agentes, 1 Año

Esta prueba permite validar la estabilidad del sistema y comparar el desempeño del motor de metas actual frente al nuevo motor declarativo (eBDI) en modo sombra.

## Parámetros de la Simulación
- **Agentes**: 5 (singlePeasantFamily1 a singlePeasantFamily5)
- **Duración**: 1 año (365-366 días)
- **Modo**: Single (Centralizado)
- **Entorno**: Local (Headless vía Docker)

## Cómo Ejecutar la Prueba

1.  **Asegurarse de que Docker está en ejecución**.
2.  **Construir la imagen de simulación**:
    ```powershell
    docker compose build simulation
    ```
3.  **Iniciar infraestructura (Redis, Postgres, RabbitMQ)**:
    ```powershell
    docker compose up -d redis postgres rabbitmq
    ```
4.  **Ejecutar la simulación**:
    ```powershell
    docker compose run simulation
    ```

## Resultados Esperados
La simulación debe completar el año sin errores críticos. Los resultados se guardarán en:
- `data/logs/manual/wpsSimulator.csv`: Métricas de los agentes (salud, dinero, felicidad).
- `data/logs/manual/wpsSimulator.log`: Logs detallados, incluyendo las decisiones en modo sombra `[Shadow]`.

## Comparación de Resultados
Para comparar los resultados entre ejecuciones:
1.  Verificar que el archivo `wpsSimulator.csv` contenga 366 entradas por agente (aproximadamente).
2.  Comparar los promedios de `money` y `health` al final de la simulación.
3.  Revisar el log para asegurar que las decisiones de `[Shadow]` coinciden con las intenciones reales del agente.

## Automatización
Se ha proporcionado un script en `scripts/replicate_5ag_1yr.ps1` para automatizar este proceso.
