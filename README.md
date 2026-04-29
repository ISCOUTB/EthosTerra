# EthosTerra — Simulador Social BDI Híbrido (TEMSCON-LATAM 2026)

**EthosTerra** (anteriormente WellProdSim) es una plataforma de simulación multi-agente desarrollada por el grupo **SIDRePUJ / ISCOUTB (UTB)**. Esta versión integra el framework **TEMSCON-LATAM 2026**, incorporando un motor cognitivo híbrido que combina la eficiencia del motor numérico eBDI con la capacidad de razonamiento semántico de un LLM (Gemma 4B).

---

## Arquitectura WPSnext

```mermaid
graph TB
    subgraph Docker["Docker Container"]
        subgraph UI["Next.js 14 — Puerto 3000"]
            API["/api/simulator/* (API Routes)"]
            WEB["Páginas Web (React)"]
        end
        subgraph SIM["wps-simulator.jar — Java 21"]
            ENGINE["Motor de Simulación"]
            VIEWER["ViewerLens (WebSocket :8000)"]
        end
        LOGS["/app/logs/ — CSV de resultados"]
    end
    subgraph MQ["RabbitMQ — Puerto 5672"]
        EX["besa.exchange (Direct)"]
    end

    BROWSER["🌐 Navegador"] -->|HTTP :3000| WEB
    BROWSER -->|WebSocket :8000| VIEWER
    WEB --> API
    API -->|spawn / kill| ENGINE
    ENGINE --> LOGS
    ENGINE -->|AMQP publish| EX
    EX -->|AMQP consume| ENGINE
    ENGINE -->|broadcast| VIEWER

    style Docker fill:#14181c,stroke:#272d34,color:#fff
    style UI fill:#0d1117,stroke:#38bdf8,color:#38bdf8
    style SIM fill:#0d1117,stroke:#22c55e,color:#22c55e
    style MQ fill:#0d1117,stroke:#f59e0b,color:#f59e0b
```

- **wellprodsim**: El motor de simulación original en Java que gestiona los agentes eBDI.
- **wpsllm-sidecar**: Un intermediario en Python que implementa la lógica híbrida (decide si usar LLM o motor numérico).
- **llama-cpp**: Servidor de inferencia local optimizado para GPUs con 8GB VRAM (como la RTX 4060).

---

### Cadena de dependencias BESA (Maven)

```mermaid
graph LR
    K["KernelBESA"] --> L["LocalBESA"]
    L --> R["RemoteBESA"]
    R --> RA["RationalBESA"]
    RA --> B["BDIBESA"]
    B --> E["eBDIBESA"]
    E --> W["wpsSimulator (Uber-JAR)"]

    style K fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style L fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style R fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style RA fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style B fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style E fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style W fill:#064e3b,stroke:#22c55e,color:#fff
```

Cada módulo se compila e instala en `~/.m2` estrictamente en este orden dentro del `Dockerfile` multi-stage.

---

### Pipeline Docker (Multi-stage Build)

```mermaid
flowchart LR
    A["Stage 1: Cache Maven\npom.xml + go-offline"] --> B["Stage 2: Compilación BESA\n6 módulos secuenciales"]
    B --> C["Stage 3: Uber-JAR\nmaven-shade-plugin -P docker"]
    C --> D["Stage 4: Runtime\neclipse-temurin:21-jre + Node.js"]

    style A fill:#1c1917,stroke:#78716c,color:#fbbf24
    style B fill:#1c1917,stroke:#78716c,color:#fbbf24
    style C fill:#1c1917,stroke:#78716c,color:#22c55e
    style D fill:#1c1917,stroke:#78716c,color:#38bdf8
```

---

### Flujo de datos en tiempo real (WebSocket ViewerLens)

```mermaid
sequenceDiagram
    participant SIM as wpsSimulator (Java)
    participant VL as ViewerLens Agent
    participant WS as WebSocket :8000
    participant UI as Navegador (Next.js)

    SIM->>VL: wpsReport.ws(state, alias)
    VL->>WS: broadcastMessage("j=" + JSON)
    WS->>UI: j={"name":"Fam_1","state":"{...}"}
    Note over UI: Actualiza estado del agente

    SIM->>VL: wpsReport.interaction(from, to, action, detail)
    VL->>WS: broadcastMessage("i=" + JSON)
    WS->>UI: i={"from":"Fam_1","to":"MarketPlace","action":"SELL_CROP"}
    Note over UI: Anima partícula de mensaje en el mapa de red
```

---

### Topología de agentes en la simulación

```mermaid
graph TD
    MP["🛒 MarketPlace"]
    BO["🏦 BankOffice"]
    CA["⚖ CivicAuthority"]
    CD["👥 CommunityDynamics"]

    F1["🚜 Familia 1"]
    F2["🚜 Familia 2"]
    F3["🚜 Familia 3"]
    FN["🚜 Familia N"]

    F1 <-->|EventBESA| MP
    F1 <-->|EventBESA| BO
    F2 <-->|EventBESA| CA
    F2 <-->|EventBESA| CD
    F3 <-->|EventBESA| MP
    F3 <-->|EventBESA| BO
    FN <-->|EventBESA| CA
    FN <-->|EventBESA| CD

    MP <-->|Inter-hub| BO
    CA <-->|Inter-hub| CD

    style MP fill:#78350f,stroke:#f59e0b,color:#fff
    style BO fill:#064e3b,stroke:#22c55e,color:#fff
    style CA fill:#3b0764,stroke:#a855f7,color:#fff
    style CD fill:#500724,stroke:#ec4899,color:#fff
```

---

### Flujo de simulación (usuario)

```mermaid
flowchart LR
    S["⚙ Settings\nConfigurar parámetros"] --> R["▶ Ejecutar\nIniciar simulación"]
    R --> M["🗺 Simulador\nVisualizar en tiempo real"]
    R --> N["📡 Red BESA\nMonitor de agentes"]
    M --> A["📊 Analytics\nGráficas de resultados"]
    A --> D["📥 Data Export\nDescargar CSV"]

    style S fill:#1e3a5f,stroke:#38bdf8,color:#fff
    style R fill:#064e3b,stroke:#22c55e,color:#fff
    style M fill:#1c1917,stroke:#f59e0b,color:#fff
    style N fill:#172554,stroke:#60a5fa,color:#fff
    style A fill:#3b0764,stroke:#a855f7,color:#fff
    style D fill:#500724,stroke:#ec4899,color:#fff
```

---

## Repositorios incluidos

- **Motor Cognitivo Híbrido**: El LLM solo se activa en ciclos de alta significancia (crisis de salud, deudas, cambios de temporada), optimizando el rendimiento.
- **Doble Registro (Metrics Recorder)**: Cada decisión se registra comparando el motor numérico vs. el LLM para análisis de divergencia estadística.
- **Optimización de Ritmo**: Configurado para manejar 20 agentes concurrentes con una latencia media de ~18-25s por día simulado.
- **Persistencia Robusta**: Logs estructurados en formato `.jsonl` en `output/metrics/` para procesamiento posterior en Python/R.

---

## Prerrequisitos

- **Docker y Docker Compose v2+**
- **NVIDIA GPU** con soporte `nvidia-container-toolkit` (recomendado: 8GB VRAM+)
- **Modelo GGUF**: Requiere `gemma-4-E4B-it-Q4_K_M.gguf` en el directorio `models/`.

---

## Ejecución Rápida

Utilice el `Makefile` incluido para gestionar la simulación:

```bash
# 1. Descargar el modelo (si no existe)
make download

# 2. Levantar toda la infraestructura
make up

# 3. Ver logs de ejecución
make logs

# 4. Detener servicios
make down
```

---

## Herramientas de Investigación

El sidecar expone utilitarios para validar la configuración del experimento:

| Comando | Descripción |
| :--- | :--- |
| `make benchmark` | Ejecuta 10 pulses sintéticos para medir latencia TTFT y Total. |
| `make metrics` | Genera un reporte agregado de la divergencia LLM vs. Numérico. |
| `make clean` | Elimina los logs de métricas y limpia volúmenes de Docker. |

---

## Configuración del Motor Híbrido

Los umbrales de activación se configuran en `wpsllm-sidecar/config.py` o vía variables de entorno en el `docker-compose.yml`:

- `HYBRID_MONEY_THRESHOLD`: $500,000 COP
- `HYBRID_HEALTH_THRESHOLD`: 30/100
- `LLM_TIMEOUT`: 25.0s (con reintento inmediato en caso de congestión).

---

## Estructura del Proyecto

- `wpsSimulator/`: Código fuente del motor Java y DTOs de comunicación.
- `wpsllm-sidecar/`: Lógica de prompt engineering, métricas y API FastAPI.
- `models/`: Almacenamiento local del modelo Gemma (excluido de Git).
- `output/metrics/`: Resultados de las sesiones de simulación.

---

**Cita y Referencia:**
Este trabajo forma parte del framework *TEMSCON-LATAM 2026: Hybrid Social Simulation for Rural Prosperity*.
