# Informe técnico — Dockerización de WellProdSim

**Fecha:** 1 de marzo de 2026  
**Proyecto:** WellProdSim — UTB / ISCOUTB  
**Alcance:** Clonado, análisis, adaptación y contenerización del ecosistema completo

---

## 1. Qué se hizo

### 1.1 Clonado de repositorios

Se clonaron los 8 repositorios de la organización ISCOUTB en la misma carpeta raíz del workspace, respetando el requisito de rutas relativas `../RepoXXX/target/` del `pom.xml` del simulador:

```
KernelBESA / LocalBESA / RemoteBESA / RationalBESA / BDIBESA / eBDIBESA
wpsSimulator / wpsUI
```

### 1.2 Análisis del código fuente

Se inspeccionaron en detalle:

- `wpsSimulator/pom.xml`: perfil `local-dev` con `scope=system` apuntando a JARs de los 6 repos BESA mediante rutas relativas.
- `wpsUI/main/main.js`: proceso principal de Electron. Ejecuta el simulador como subproceso `execFile` y gestiona el ciclo de vida del proceso Java.
- `wpsUI/main/preload/preload.mjs`: expone `window.electronAPI` al renderer mediante `contextBridge`.
- `wpsUI/src/lib/csvUtils.ts` y todos los componentes que consumen `window.electronAPI`.

Se identificó que la UI usa **6 métodos IPC de Electron** que no existen en un navegador estándar:

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

Se eligió un **único contenedor** con dos tecnologías coexistentes (JRE 21 + Node.js 18) para simplificar el despliegue y eliminar la necesidad de volúmenes compartidos entre contenedores.

**Dockerfile multi-stage:**

| Stage        | Base                           | Contenido                                                  |
| ------------ | ------------------------------ | ---------------------------------------------------------- |
| `java-build` | `eclipse-temurin:21-jdk-jammy` | Maven + 6 repos BESA + wpsSimulator → fat JAR              |
| `webapp`     | `eclipse-temurin:21-jre-jammy` | Node.js 18 instalado encima + Next.js 14 + fat JAR copiado |

El fat JAR final (`wps-simulator-3.6.0-jar-with-dependencies.jar`) queda en `/app/wps-simulator.jar` dentro del contenedor.

### 1.4 Capa de adaptación IPC → HTTP

Se crearon los siguientes archivos nuevos en `wpsUI/src/`:

#### API Routes (`src/app/api/simulator/`)

| Archivo             | Endpoints implementados                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `route.ts`          | `GET` estado, `POST` lanzar JAR (no bloqueante), `DELETE` matar proceso |
| `csv/route.ts`      | `GET` leer CSV, `DELETE` vaciar CSV                                     |
| `file/route.ts`     | `GET` file-exists, `DELETE` delete-file                                 |
| `app-path/route.ts` | `GET` ruta base (`/app`)                                                |

#### Módulo de estado (`src/lib/javaProcessState.ts`)

Singleton Node.js que mantiene la referencia al `ChildProcess` del JAR entre peticiones HTTP sucesivas (equivalente al `let javaProcess` del `main.js` de Electron).

#### Polyfill (`src/components/ElectronPolyfill.tsx`)

Script inyectado en el `<body>` antes de que ejecute el código de los componentes. Detecta si `window.electronAPI` ya existe (caso Electron) y si no, lo define como un objeto que redirige cada llamada a los endpoints HTTP correspondientes. Incluye un mecanismo de **polling** cada 2 segundos para simular los eventos `simulation-ended` que Electron enviaba por IPC push.

#### Modificación al layout raíz (`src/app/layout.tsx`)

Se agregó `<ElectronPolyfill />` como primer hijo del `<body>` con `strategy="afterInteractive"` para garantizar que el polyfill esté disponible antes de que cualquier componente intente llamar a `window.electronAPI`.

### 1.5 Correcciones sobre el código original

| #   | Problema encontrado                                                                                      | Corrección aplicada                                                               |
| --- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | `.eslintrc.js` con `module.exports` en proyecto `"type":"module"` causa error ESM/CJS                    | Renombrado a `.eslintrc.cjs`, eliminado `.eslintrc.json` duplicado                |
| 2   | `next.config.mjs` tenía `output: 'export'` (genera sitio estático) incompatible con API Routes           | Eliminada la línea `output: 'export'`                                             |
| 3   | `next.config.mjs` tenía `trailingSlash: true` causando 308 en llamadas `POST`/`DELETE` desde el polyfill | Eliminada la propiedad `trailingSlash`                                            |
| 4   | `POST /api/simulator` era bloqueante (esperaba hasta que Java terminara)                                 | Convertido a fire-and-forget; responde con `{started:true, pid:N}` inmediatamente |
| 5   | `/api/simulator/app-path` pre-renderizado como `○ Static`                                                | Añadido `export const dynamic = 'force-dynamic'`                                  |
| 6   | `/api/getCsv` (ruta original del repo) ejecutaba `fs.access()` en build time causando error              | Añadido `export const dynamic = 'force-dynamic'`                                  |
| 7   | `package.json` tiene dependencias `"wellprodsim": "file:"` y `"WellProdSim": "file:"` vacías             | Eliminadas con `npm pkg delete` en el Dockerfile antes de `npm install`           |

---

## 2. Qué funciona

| Funcionalidad                                             | Estado                                                                                                   |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Build Docker completo (BESA + wpsSimulator + Next.js)     | ✅ Funcional                                                                                             |
| Contenedor único con JRE 21 + Node.js 18 + Next.js        | ✅ Funcional                                                                                             |
| Servicio disponible en `http://localhost:3000`            | ✅ Funcional                                                                                             |
| `GET /api/simulator` — estado del proceso                 | ✅ Probado, responde `{"running":false}`                                                                 |
| `GET /api/simulator/app-path` — ruta base                 | ✅ Probado, responde `{"path":"/app"}`                                                                   |
| `GET /api/simulator/file?path=<ruta>` — file-exists       | ✅ Probado, el JAR existe en `/app/wps-simulator.jar`                                                    |
| `GET /api/simulator/csv` — leer resultados                | ✅ Responde `404` cuando no hay CSV (correcto)                                                           |
| `POST /api/simulator` — lanzar simulación (no bloqueante) | ✅ Implementado, responde inmediatamente                                                                 |
| `DELETE /api/simulator` — matar proceso Java              | ✅ Implementado                                                                                          |
| Linting ESLint en build                                   | ✅ Funcional tras renombrar `.eslintrc.cjs`                                                              |
| Polyfill `window.electronAPI` inyectado en el navegador   | ✅ Funcional                                                                                             |
| Polling de `simulation-ended` en el polyfill              | ✅ Implementado (intervalo 2s)                                                                           |
| Todas las páginas Next.js compiladas                      | ✅ `/`, `/pages/settings`, `/pages/simulador`, `/pages/analytics`, `/pages/contact`, `/pages/dataExport` |
| Healthcheck Docker                                        | ✅ Pasa correctamente                                                                                    |

---

## 3. Qué no fue verificado / posibles limitaciones

| Ítem                                              | Detalle                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ejecución real del simulador E2E**              | El JAR existe en el contenedor y Java 21 está disponible; sin embargo, no se ejecutó una simulación completa end-to-end para verificar que el JAR produce el CSV correctamente con los argumentos enviados desde la UI. Requiere prueba manual.                                                                                                   |
| **Visualización de resultados en Analytics**      | Depende del CSV generado por el JAR. No fue posible validar sin correr una simulación completa.                                                                                                                                                                                                                                                   |
| **`/api/getCsv` (ruta original)**                 | Esta ruta preexistente en el repositorio espera el CSV durante 5 segundos. Puede entrar en conflicto con `/api/simulator/csv` (la nueva). Se añadió `force-dynamic` pero no se analizó si algún componente la consume directamente.                                                                                                               |
| **Warning `<img>` en `heroSection.tsx`**          | ESLint reporta un `<img>` HTML nativo en lugar de `<Image>` de Next.js. No afecta el funcionamiento pero puede impactar el LCP (Largest Contentful Paint).                                                                                                                                                                                        |
| **`npm warn EBADENGINE` de `minimatch`**          | La dependencia `minimatch@10.0.1` requiere Node 20+; el contenedor usa Node 18. Solo es un warning de compatibilidad, no produce fallos en runtime.                                                                                                                                                                                               |
| **27 vulnerabilidades de npm**                    | Todas provienen de dependencias de Electron/electron-builder que están en `devDependencies` y no forman parte del bundle de producción web. Sin impacto en el entorno Docker.                                                                                                                                                                     |
| **`taskkill` en `kill-java-process`**             | El código original de `main.js` usa `taskkill` (Windows) para matar el proceso. La API Route `/api/simulator` (DELETE) fue adaptada para usar `process.kill()` en Linux (contenedor). Sin embargo, si el JAR lanza procesos hijos adicionales, `SIGTERM` al proceso padre puede no ser suficiente; en ese caso habría que usar `kill -9 -<pgid>`. |
| **Modo de simulación `env: "local"` hardcodeado** | La UI envía `-env local` como argumento fijo. Si el JAR requiere configuración adicional de paths para el modo local en Docker (archivos de datos, recursos), podría fallar.                                                                                                                                                                      |

---

## 4. Archivos creados/modificados

### Archivos nuevos

| Archivo                                         | Descripción                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------ |
| `Dockerfile`                                    | Build multi-stage: java-build → webapp                                   |
| `docker-compose.yml`                            | Servicio `wellprodsim` en puerto 3000 con healthcheck                    |
| `.dockerignore`                                 | Excluye `node_modules`, `target`, JRE Windows, `.next` del build context |
| `wpsUI/src/lib/javaProcessState.ts`             | Singleton del proceso Java para API Routes                               |
| `wpsUI/src/app/api/simulator/route.ts`          | API: estado / lanzar / matar simulador                                   |
| `wpsUI/src/app/api/simulator/csv/route.ts`      | API: leer / vaciar CSV                                                   |
| `wpsUI/src/app/api/simulator/file/route.ts`     | API: file-exists / delete-file                                           |
| `wpsUI/src/app/api/simulator/app-path/route.ts` | API: ruta base de la app                                                 |
| `wpsUI/src/components/ElectronPolyfill.tsx`     | Polyfill `window.electronAPI` → fetch HTTP                               |

### Archivos modificados

| Archivo                             | Cambio                                                |
| ----------------------------------- | ----------------------------------------------------- |
| `wpsUI/next.config.mjs`             | Eliminados `output: 'export'` y `trailingSlash: true` |
| `wpsUI/src/app/layout.tsx`          | Añadido `<ElectronPolyfill />` al root layout         |
| `wpsUI/src/app/api/getCsv/route.ts` | Añadido `export const dynamic = 'force-dynamic'`      |

### Archivos renombrados/eliminados

| Acción     | Archivo                          |
| ---------- | -------------------------------- |
| Renombrado | `.eslintrc.js` → `.eslintrc.cjs` |
| Eliminado  | `.eslintrc.json` (duplicado)     |

---

## 5. Comandos finales de referencia

```bash
# Primera ejecución completa (~8 min)
docker compose build
docker compose up -d

# Ciclo normal (sin rebuild)
docker compose up -d       # iniciar
docker compose down        # detener
docker compose logs -f     # ver logs

# Rebuild si se modifican archivos fuente
docker compose up --build -d
```

**Acceso:** [http://localhost:3000](http://localhost:3000)
