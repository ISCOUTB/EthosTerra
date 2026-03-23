# EthosTerra — Simulador Social de Productividad y Bienestar para Familias Campesinas

EthosTerra (anteriormente WellProdSim) es una plataforma de simulación multi-agente desarrollada por el grupo **SIDRePUJ / ISCOUTB (UTB)**. Modela el comportamiento de familias campesinas colombianas mediante agentes BDI (Belief-Desire-Intention) con componentes emocionales, simulando decisiones agrícolas, económicas y de bienestar a lo largo del tiempo.

---

## Arquitectura general

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

El frontend web se comunica con el motor Java mediante API Routes de Next.js que reemplazan el sistema IPC de Electron original.

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

| Repositorio            | Descripción                                     |
| ---------------------- | ----------------------------------------------- |
| `ISCOUTB/KernelBESA`   | Núcleo del framework de agentes BESA            |
| `ISCOUTB/LocalBESA`    | Implementación local del administrador BESA     |
| `ISCOUTB/RemoteBESA`   | Implementación distribuida BESA                 |
| `ISCOUTB/RationalBESA` | Agentes racionales BESA                         |
| `ISCOUTB/BDIBESA`      | Agentes BDI sobre BESA                          |
| `ISCOUTB/eBDIBESA`     | Agentes BDI con componente emocional            |
| `ISCOUTB/wpsSimulator` | Motor principal del simulador (fat JAR)         |
| `ISCOUTB/wpsUI`        | Interfaz web (Next.js 14 + Tailwind + Recharts) |

---

## Prerrequisitos

Solo necesitas **Docker Desktop** instalado y en ejecución.

- [Descargar Docker Desktop](https://www.docker.com/products/docker-desktop/)
- Versión mínima probada: Docker 29.x + Compose 5.x

No se requiere instalar Java, Node.js, Maven ni ninguna dependencia adicional en el equipo host.

---

## Instalación y ejecución (primera vez)

### 1. Clonar los repositorios

```bash
git clone https://github.com/ISCOUTB/KernelBESA.git
git clone https://github.com/ISCOUTB/LocalBESA.git
git clone https://github.com/ISCOUTB/RemoteBESA.git
git clone https://github.com/ISCOUTB/RationalBESA.git
git clone https://github.com/ISCOUTB/BDIBESA.git
git clone https://github.com/ISCOUTB/eBDIBESA.git
git clone https://github.com/ISCOUTB/wpsSimulator.git
git clone https://github.com/ISCOUTB/wpsUI.git
```

> Todos los repositorios deben quedar al **mismo nivel** de directorio (requerido por las rutas relativas `systemPath` del `pom.xml` de `wpsSimulator`).

### 2. Construir la imagen

```bash
docker compose build
```

Este proceso tarda aproximadamente **7-8 minutos** la primera vez. Realiza:

1. Compilación de los 6 módulos BESA con Maven (Java 21)
2. Compilación de `wpsSimulator` generando el fat JAR
3. Instalación de dependencias Node.js y compilación de Next.js

Las siguientes ejecuciones usan caché de Docker y tardan solo **3-4 minutos**.

### 3. Iniciar la aplicación

```bash
docker compose up -d
```

### 4. Abrir en el navegador

```
http://localhost:3000
```

---

## Uso

### Flujo de una simulación

1. **Settings** (`/pages/settings`) — Configura los parámetros de la simulación:
   - Número de agentes campesinos (1–1000)
   - Capital inicial en pesos
   - Hectáreas de terreno
   - Personalidad, herramientas, semillas, agua, riego, emociones
   - Años a simular

2. **Ejecuta la simulación** — Pulsa el botón de inicio. El motor Java corre en segundo plano; el estado se actualiza en tiempo real via polling cada 2 segundos.

3. **Simulador** (`/pages/simulador`) — Visualiza el progreso mientras la simulación corre.

4. **Analytics** (`/pages/analytics`) — Analiza los resultados con gráficas de series de tiempo una vez que la simulación finaliza.

5. **Data Export** (`/pages/dataExport`) — Descarga los resultados en CSV.

---

## Comandos útiles

```bash
# Ver logs en tiempo real
docker compose logs -f

# Detener el contenedor
docker compose down

# Reiniciar sin rebuild
docker compose up -d

# Rebuild completo (tras cambios en el código)
docker compose up --build -d

# Ver estado del simulador desde terminal
curl http://localhost:3000/api/simulator

# Abrir una shell dentro del contenedor
docker exec -it simulacion-wellprodsim-1 sh
```

---

## API interna (para desarrollo)

| Endpoint                  | Método   | Descripción                                    |
| ------------------------- | -------- | ---------------------------------------------- |
| `/api/simulator`          | `GET`    | Estado del proceso Java `{"running": bool}`    |
| `/api/simulator`          | `POST`   | Lanzar simulación con `{"args": [...]}`        |
| `/api/simulator`          | `DELETE` | Matar el proceso Java en curso                 |
| `/api/simulator/csv`      | `GET`    | Leer el CSV de resultados                      |
| `/api/simulator/csv`      | `DELETE` | Vaciar el CSV                                  |
| `/api/simulator/file`     | `GET`    | Verificar existencia de archivo `?path=<ruta>` |
| `/api/simulator/file`     | `DELETE` | Eliminar un archivo `?path=<ruta>`             |
| `/api/simulator/app-path` | `GET`    | Ruta base de la aplicación                     |

---

## Estructura del workspace

```
simulacion/
├── KernelBESA/          ← Framework BESA — núcleo
├── LocalBESA/           ← Framework BESA — local
├── RemoteBESA/          ← Framework BESA — distribuido
├── RationalBESA/        ← Framework BESA — agentes racionales
├── BDIBESA/             ← Framework BESA — BDI
├── eBDIBESA/            ← Framework BESA — BDI emocional
├── wpsSimulator/        ← Motor Java del simulador
├── wpsUI/               ← Interfaz web Next.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/simulator/     ← API Routes (reemplazan IPC de Electron)
│   │   │   └── pages/             ← Rutas de la UI
│   │   ├── components/
│   │   │   └── ElectronPolyfill.tsx  ← Adaptador IPC→HTTP
│   │   └── lib/
│   │       └── javaProcessState.ts  ← Estado del proceso Java (singleton)
│   └── next.config.mjs
├── Dockerfile
├── docker-compose.yml
└── .dockerignore
```
