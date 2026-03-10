# Informe técnico — Proyecto EthosTerra

**Fecha de última actualización:** 10 de marzo de 2026  
**Proyecto:** EthosTerra (WellProdSim) — UTB / ISCOUTB  
**Alcance:** Clonado, análisis, adaptación, contenerización y corrección integral del ecosistema

---

## 1. Qué se hizo

### 1.1 Clonado de repositorios

Se clonaron los 8 repositorios de la organización en la misma carpeta raíz del workspace:

```
KernelBESA / LocalBESA / RemoteBESA / RationalBESA / BDIBESA / eBDIBESA
wpsSimulator / wpsUI
```

### 1.2 Análisis del código fuente

Se inspeccionaron en detalle:

- `wpsSimulator/pom.xml`: perfil `local-dev` con `scope=system` apuntando a JARs de los 6 repos BESA mediante rutas relativas. **Root cause principal:** tanto `maven-shade-plugin` como `maven-assembly-plugin` ignoran por diseño las dependencias con `scope=system`, por lo que nunca se incluían en el fat JAR.
- `wpsUI/main/main.js`: proceso principal Electron. Ejecuta el simulador como subproceso y gestiona el ciclo de vida del proceso Java.
- `wpsUI/main/preload/preload.mjs`: expone `window.electronAPI` al renderer mediante `contextBridge`.
- Todos los componentes que consumen `window.electronAPI`.

Se identificaron **6 métodos IPC de Electron** que no existen en navegador estándar:

| Método IPC original      | Acción                                |
| ------------------------ | ------------------------------------- |
| `executeExe(path, args)` | Ejecuta el JAR Java como subproceso   |
| `killJavaProcess()`      | Mata el proceso Java                  |
| `checkJavaProcess()`     | Consulta si el proceso está corriendo |
| `readCsv()`              | Lee el CSV de resultados del disco    |
| `clearCsv()`             | Vacía el CSV                          |
| `deleteFile(path)`       | Elimina un archivo                    |
| `fileExists(path)`       | Verifica si un archivo existe         |
| `getAppPath()`           | Devuelve la ruta base de la app       |

### 1.3 Arquitectura de la solución Docker

Se eligió un **único contenedor** con dos tecnologías coexistentes (JRE 21 + Node.js 20) para simplificar el despliegue y eliminar la necesidad de volúmenes compartidos entre contenedores.

**Dockerfile multi-stage:**

| Stage        | Base                           | Contenido                                                                                   |
| ------------ | ------------------------------ | ------------------------------------------------------------------------------------------- |
| `java-build` | `eclipse-temurin:21-jdk-jammy` | Maven + 6 módulos BESA instalados en `~/.m2` + wpsSimulator con perfil `docker` → shade JAR |
| `webapp`     | `eclipse-temurin:21-jre-jammy` | Node.js 20 LTS + Next.js 14 compilado + shade JAR copiado + symlink logs                    |

El fat JAR final (`wps-simulator-3.6.0.jar`, producido por `maven-shade-plugin`) queda en `/app/wps-simulator.jar` dentro del contenedor con **Main-Class** y **todas las clases BESA incluidas**.

**Puertos expuestos:**

| Puerto | Servicio                                               |
| ------ | ------------------------------------------------------ |
| 3000   | Next.js (UI + API Routes)                              |
| 8000   | WebSocket Java (`/wpsViewer`) para mapa en tiempo real |

### 1.4 Solución al problema de dependencias `scope=system`

**Diagnóstico:** El perfil `local-dev` (activo por defecto) declara los 6 módulos BESA con `scope=system` y `systemPath` a rutas relativas. Ambos plugins (`shade` y `assembly`) ignoran por diseño estas dependencias → el fat JAR no contenía las clases BESA → error `NoClassDefFoundError: BESA/ExceptionBESA` en runtime.

**Solución:** Se agregó un nuevo perfil Maven `docker` en `wpsSimulator/pom.xml` que declara las mismas 6 dependencias con `scope=compile` (sin `systemPath`). El Dockerfile:

1. Ejecuta `mvn install` en cada módulo BESA (en orden de dependencias), publicándolos en `~/.m2`.
2. Compila `wpsSimulator` con `-P docker`, de modo que `maven-shade-plugin` las resuelve desde `~/.m2` y las incluye en el uber-JAR.

**Orden de instalación BESA:**

```
KernelBESA → RationalBESA → LocalBESA → RemoteBESA → BDIBESA → eBDIBESA
```

**Verificación automática en build:**

```
JAR contiene 194 clases BESA/
Main-Class: org.wpsim.WellProdSim.wpsStart ✓
```

### 1.5 Corrección de la ruta del CSV (symlink)

El simulador Java escribe el CSV en `logs/wpsSimulator.csv` relativo a su CWD (`/app`), resultando en `/app/logs/wpsSimulator.csv`. La API Route `csv/route.ts` lee desde `WPS_LOGS_PATH=/app/src/wps/logs/wpsSimulator.csv`.

**Solución:** Symlink creado en el Dockerfile:

```dockerfile
RUN ln -s /app/src/wps/logs /app/logs
```

### 1.6 Capa de adaptación IPC → HTTP

#### API Routes (`wpsUI/src/app/api/simulator/`)

| Archivo             | Endpoints implementados                                                               |
| ------------------- | ------------------------------------------------------------------------------------- |
| `route.ts`          | `GET` estado del proceso, `POST` lanzar JAR (fire-and-forget), `DELETE` matar proceso |
| `csv/route.ts`      | `GET` leer CSV completo como JSON                                                     |
| `file/route.ts`     | `GET ?action=fileExists` / `DELETE ?action=deleteFile`                                |
| `app-path/route.ts` | `GET` ruta base de la app (`/app`)                                                    |

#### Módulo de estado (`wpsUI/src/lib/javaProcessState.ts`)

Singleton Node.js que mantiene la referencia al `ChildProcess` del JAR entre peticiones HTTP sucesivas (equivalente a `let javaProcess` en `main.js` de Electron).

#### Polyfill (`wpsUI/src/components/ElectronPolyfill.tsx`)

Script inyectado en el `<body>` que, si `window.electronAPI` no existe (entorno Docker/web), lo define redirigiendo cada llamada a los endpoints HTTP. Incluye **polling cada 2 segundos** para simular el evento push `simulation-ended` que Electron enviaba por IPC.

### 1.7 Correcciones sobre el código original

| #   | Problema encontrado                                                                              | Corrección aplicada                                                              |
| --- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| 1   | `.eslintrc.js` con `module.exports` en proyecto `"type":"module"` → error ESM/CJS                | Renombrado a `.eslintrc.cjs`, eliminado `.eslintrc.json` duplicado               |
| 2   | `next.config.mjs` con `output: 'export'` incompatible con API Routes                             | Eliminada la línea `output: 'export'`                                            |
| 3   | `next.config.mjs` con `trailingSlash: true` causando 308 en peticiones `POST`/`DELETE`           | Eliminada la propiedad `trailingSlash`                                           |
| 4   | `POST /api/simulator` era bloqueante (esperaba a que Java terminara)                             | Convertido a fire-and-forget; responde `{started:true, pid:N}` inmediatamente    |
| 5   | `/api/simulator/app-path` pre-renderizado como `○ Static`                                        | Añadido `export const dynamic = 'force-dynamic'`                                 |
| 6   | `scope=system` en perfil `local-dev` → clases BESA excluidas del fat JAR                         | Nuevo perfil Maven `docker` con `scope=compile`, BESA instalado en `~/.m2`       |
| 7   | Dockerfile usaba `maven-assembly-plugin` JAR (sin `Main-Class`) → `no main manifest attribute`   | Cambiado a `maven-shade-plugin` JAR (`wps-simulator-3.6.0.jar`)                  |
| 8   | Node.js 18 (EOL) en el contenedor                                                                | Actualizado a Node.js 20 LTS                                                     |
| 9   | `viewer.webui = false` en `wpsConfig.properties` → WebSocket server Java nunca iniciaba          | Cambiado a `viewer.webui = true`                                                 |
| 10  | `buildArgs()` en `settings.tsx` no incluía `-world` → Java buscaba `world.null.json` → 0 granjas | Añadido `world: 400` en `buildArgs()`                                            |
| 11  | Nombre de agente en `containerMap.tsx`: `MAS_500PeasantFamily${i}` (sin `_`)                     | Corregido a `MAS_500_PeasantFamily${i}` para coincidir con el alias real de Java |
| 12  | Puerto 8000 no expuesto en `docker-compose.yml` → WebSocket bloqueado desde el browser           | Añadido `"8000:8000"` en el `ports` del servicio                                 |
| 13  | Ruta CSV: Java escribe en `/app/logs/`, API lee de `/app/src/wps/logs/`                          | Symlink `ln -s /app/src/wps/logs /app/logs` en el Dockerfile                     |

---

## 2. Qué funciona (verificado al 2 de marzo de 2026)

| Funcionalidad                                                   | Estado | Detalle                                                                                               |
| --------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| Build Docker completo (6 módulos BESA + wpsSimulator + Next.js) | ✅     | ~8-10 min primera vez, caché en rebuilds                                                              |
| JAR verificado en build                                         | ✅     | 194 clases BESA, `Main-Class: org.wpsim.WellProdSim.wpsStart`                                         |
| Contenedor único JRE 21 + Node.js 20                            | ✅     |                                                                                                       |
| Next.js listo en `http://localhost:3000`                        | ✅     | Ready in ~280ms                                                                                       |
| `GET /api/simulator` — estado del proceso                       | ✅     | `{"running":false}` / `{"running":true}`                                                              |
| `POST /api/simulator` — lanzar simulación                       | ✅     | `{"success":true,"started":true,"pid":N}`                                                             |
| `DELETE /api/simulator` — matar proceso Java                    | ✅     | SIGTERM al grupo de procesos (Linux)                                                                  |
| `GET /api/simulator/csv` — leer resultados                      | ✅     | ~76 KB con métricas semanales del agente campesino                                                    |
| `GET /api/simulator/file?action=fileExists`                     | ✅     | `{"exists":true}`                                                                                     |
| `GET /api/simulator/app-path`                                   | ✅     | `{"path":"/app"}`                                                                                     |
| Simulación E2E completa (1 agente × 1 año)                      | ✅     | 137 granjas, 274 tierras asignadas, completa en ~183 segundos                                         |
| CSV generado con métricas del campesino                         | ✅     | Timestamp, HappinessSadness, money, health, currentSeason…                                            |
| WebSocket Java en puerto 8000 (`/wpsViewer`)                    | ✅     | Se inicia automáticamente al arrancar la simulación                                                   |
| Mapa Google Maps con 400 polígonos de tierras                   | ✅     | Carga `mediumworld.json` desde `/public`                                                              |
| Mapa dinámico — colores por estación en tiempo real             | ✅     | Actualizado vía WebSocket, mensajes prefijo `j=`                                                      |
| Healthcheck Docker                                              | ✅     | Pasa en `http://localhost:3000/api/simulator/app-path`                                                |
| Polyfill `window.electronAPI` en el browser                     | ✅     | Transparente para todos los componentes React existentes                                              |
| Todas las páginas Next.js compiladas                            | ✅     | `/`, `/pages/settings`, `/pages/simulador`, `/pages/analytics`, `/pages/contact`, `/pages/dataExport` |

---

## 3. Posibles limitaciones conocidas

| Ítem                                                     | Detalle                                                                                                                                                            |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`UnsupportedOperationException` en `getAdmAliasList`** | `LocalAdmBESA.getAdmAliasList()` no está implementado. `wpsStart.showRunningAgents()` lo llama pero el error es capturado y la simulación continúa con normalidad. |
| **`BindException` en puerto 8000**                       | Solo ocurre si se ejecutan dos instancias del JAR simultáneamente. En uso normal (una sola simulación activa) no se presenta.                                      |
| **`ExceptionBESA`: Agent `single_wpsViewer` not found**  | Mensaje informativo al inicio; el viewer no está creado todavía en ese instante. No afecta la ejecución.                                                           |
| **27 vulnerabilidades npm**                              | Todas en `devDependencies` de Electron/electron-builder. Sin impacto en el bundle de producción web.                                                               |
| **`<img>` nativo en `heroSection.tsx`**                  | ESLint reporta uso de `<img>` HTML en lugar de `<Image>` de Next.js. Solo afecta al LCP (rendimiento), no a funcionalidad.                                         |

---

## 4. Archivos creados/modificados

### Archivos nuevos

| Archivo                                         | Descripción                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Dockerfile`                                    | Build multi-stage: `java-build` (Maven + BESA + shade JAR) → `webapp` (JRE + Node 20 + Next.js) |
| `docker-compose.yml`                            | Servicio `wellprodsim`, puertos 3000 y 8000, healthcheck, variables de entorno                  |
| `.dockerignore`                                 | Excluye `node_modules`, `target`, JRE Windows, `.next`, `.github`, scripts                      |
| `wpsUI/src/lib/javaProcessState.ts`             | Singleton del `ChildProcess` Java para API Routes                                               |
| `wpsUI/src/app/api/simulator/route.ts`          | GET estado / POST lanzar / DELETE matar simulador                                               |
| `wpsUI/src/app/api/simulator/csv/route.ts`      | GET leer CSV de resultados                                                                      |
| `wpsUI/src/app/api/simulator/file/route.ts`     | GET fileExists / DELETE deleteFile                                                              |
| `wpsUI/src/app/api/simulator/app-path/route.ts` | GET ruta base de la app                                                                         |
| `wpsUI/src/components/ElectronPolyfill.tsx`     | Polyfill `window.electronAPI` → fetch HTTP con polling de fin de simulación                     |

### Archivos modificados

| Archivo                                                | Cambio                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| `wpsUI/next.config.mjs`                                | Eliminados `output: 'export'` y `trailingSlash: true`                   |
| `wpsUI/src/app/layout.tsx`                             | Añadido `<ElectronPolyfill />` en el root layout                        |
| `wpsUI/src/app/api/getCsv/route.ts`                    | Añadido `export const dynamic = 'force-dynamic'`                        |
| `wpsSimulator/pom.xml`                                 | Nuevo perfil `docker` con 6 deps BESA a `scope=compile`, versión 3.6.0  |
| `wpsSimulator/src/main/resources/wpsConfig.properties` | `viewer.webui = false` → `viewer.webui = true`                          |
| `wpsUI/src/components/settings/settings.tsx`           | `buildArgs()` incluye ahora `-world 400`                                |
| `wpsUI/src/components/simulation/containerMap.tsx`     | Nombre agente: `MAS_500PeasantFamily${i}` → `MAS_500_PeasantFamily${i}` |
| `docker-compose.yml`                                   | Puerto `8000:8000` agregado para WebSocket Java                         |

### Archivos renombrados/eliminados

| Acción     | Archivo                          |
| ---------- | -------------------------------- |
| Renombrado | `.eslintrc.js` → `.eslintrc.cjs` |
| Eliminado  | `.eslintrc.json` (duplicado)     |

---

## 5. Flujo de datos completo

```
Browser (http://localhost:3000)
│
├── HTTP GET/POST/DELETE → Next.js API Routes (:3000)
│       └── POST /api/simulator → spawn java -jar /app/wps-simulator.jar [args]
│               └── Java escribe CSV:  /app/logs/wpsSimulator.csv
│                                              ↕ symlink
│                                    /app/src/wps/logs/wpsSimulator.csv
│       └── GET /api/simulator/csv  → lee el CSV → JSON (~76 KB)
│
└── WebSocket ws://localhost:8000/wpsViewer ← Undertow (Java)
        └── Mensajes prefijo "j=" → {name, state{assignedLands, currentSeason}}
                └── containerMap.tsx actualiza colores de polígonos en tiempo real
```

**Colores del mapa por estación agrícola:**

| Estación      | Color             |
| ------------- | ----------------- |
| `PREPARATION` | Dorado `#FFD700`  |
| `PLANTING`    | Naranja `#FFA500` |
| `GROWTH`      | Rojo `#FF4500`    |
| `HARVEST`     | Verde `#00FF00`   |
| Sin actividad | Trigo `#F5DEB3`   |

---

## 6. Comandos de referencia

```bash
# Primera ejecución completa (~8-10 min)
docker compose build
docker compose up -d

# Ciclo normal
docker compose up -d       # iniciar
docker compose down        # detener
docker compose logs -f     # ver logs en tiempo real

# Rebuild tras modificar fuentes Java o Next.js
docker compose down
docker compose build
docker compose up -d

# Lanzar simulación de prueba (1 agente, 1 año)
curl -X POST http://localhost:3000/api/simulator \
  -H "Content-Type: application/json" \
  -d '{"args":["-env","local","-mode","single","-agents","1","-money","750000","-land","2","-personality","0.0","-tools","20","-seeds","50","-water","0","-irrigation","0","-emotions","1","-years","1","-world","400"]}'

# Verificar estado
curl http://localhost:3000/api/simulator

# Leer CSV generado
curl http://localhost:3000/api/simulator/csv
```

**Acceso a la UI:** [http://localhost:3000](http://localhost:3000)

---

## 7. Resultados de validación final

```
Docker build:            ✅  JAR: 194 clases BESA, Main-Class correcta
Contenedor inicia:       ✅  Next.js ready en ~280ms
Simulación E2E:          ✅  1 agente × 1 año, completa en 183 segundos
Granjas creadas:         137  (con -world 400)
Tierras asignadas:       274
CSV generado:            ✅  ~76 KB con métricas por semana simulada
WebSocket Java (8000):   ✅  Puerto accesible desde el browser
Mapa dinámico:           ✅  Colores actualizados en tiempo real por estación
GET /api/simulator:      ✅
POST /api/simulator:     ✅
DELETE /api/simulator:   ✅
GET /api/simulator/csv:  ✅  76 KB de datos
```
