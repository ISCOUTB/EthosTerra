# Guía de Desarrollo — EthosTerra / WellProdSim

## Índice

1. [Prerrequisitos](#1-prerrequisitos)
2. [Clonar y Configurar el Repositorio](#2-clonar-y-configurar-el-repositorio)
3. [Estructura del Repositorio](#3-estructura-del-repositorio)
4. [Desarrollo del Backend (Java / BESA)](#4-desarrollo-del-backend-java--besa)
   - 4.1 [Compilar los módulos BESA localmente](#41-compilar-los-módulos-besa-localmente)
   - 4.2 [Compilar y ejecutar wpsSimulator](#42-compilar-y-ejecutar-wpssimulator)
   - 4.3 [Añadir un nuevo agente](#43-añadir-un-nuevo-agente)
   - 4.4 [Añadir una nueva meta (Goal BDI)](#44-añadir-una-nueva-meta-goal-bdi)
   - 4.5 [Depuración del backend](#45-depuración-del-backend)
5. [Desarrollo del Frontend (Next.js / Electron)](#5-desarrollo-del-frontend-nextjs--electron)
   - 5.1 [Instalar dependencias](#51-instalar-dependencias)
   - 5.2 [Modo web (Next.js standalone)](#52-modo-web-nextjs-standalone)
   - 5.3 [Modo desktop (Electron + Next.js)](#53-modo-desktop-electron--nextjs)
   - 5.4 [Añadir un nuevo componente](#54-añadir-un-nuevo-componente)
   - 5.5 [Añadir una nueva página](#55-añadir-una-nueva-página)
   - 5.6 [Añadir una nueva API route](#56-añadir-una-nueva-api-route)
   - 5.7 [Tema y estilos](#57-tema-y-estilos)
6. [Desarrollo con Docker (Full Stack)](#6-desarrollo-con-docker-full-stack)
7. [Testing](#7-testing)
   - 7.1 [Tests de integración del backend](#71-tests-de-integración-del-backend)
   - 7.2 [Checklist de pruebas manuales](#72-checklist-de-pruebas-manuales)
8. [Ejecutar Experimentos](#8-ejecutar-experimentos)
   - 8.1 [Experimento individual desde la UI](#81-experimento-individual-desde-la-ui)
   - 8.2 [Automatización con PowerShell (Windows)](#82-automatización-con-powershell-windows)
   - 8.3 [Barrido de parámetros con Bash (Linux/macOS)](#83-barrido-de-parámetros-con-bash-linuxmacos)
   - 8.4 [Ejecución remota multi-nodo (SSH)](#84-ejecución-remota-multi-nodo-ssh)
   - 8.5 [Interpretar resultados](#85-interpretar-resultados)
9. [Despliegue en Producción](#9-despliegue-en-producción)
   - 9.1 [Despliegue automático (GitHub Actions)](#91-despliegue-automático-github-actions)
   - 9.2 [Despliegue manual en VPS](#92-despliegue-manual-en-vps)
   - 9.3 [Distribución multi-servidor](#93-distribución-multi-servidor)
   - 9.4 [Recolección de logs remotos](#94-recolección-de-logs-remotos)
   - 9.5 [Monitoreo y salud del servicio](#95-monitoreo-y-salud-del-servicio)
10. [Convenciones de Código y Contribución](#10-convenciones-de-código-y-contribución)
    - 10.1 [Convenciones Java / BESA](#101-convenciones-java--besa)
    - 10.2 [Convenciones TypeScript / React](#102-convenciones-typescript--react)
    - 10.3 [Checklist de seguridad](#103-checklist-de-seguridad)
    - 10.4 [Flujo de contribución](#104-flujo-de-contribución)

---

## 1. Prerrequisitos

Instala las siguientes herramientas antes de comenzar. Se indican las versiones mínimas recomendadas.

| Herramienta | Versión mínima | Instalación |
|------------|---------------|-------------|
| **Java (Eclipse Temurin)** | 21 LTS | [adoptium.net](https://adoptium.net) |
| **Apache Maven** | 3.8 | `winget install Apache.Maven` / `brew install maven` |
| **Node.js** | 20 LTS | [nodejs.org](https://nodejs.org) |
| **npm** | 10 | Incluido con Node.js |
| **Docker Desktop** | 27 | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) |
| **Docker Compose** | 2.x | Incluido en Docker Desktop |
| **Git** | 2.40 | [git-scm.com](https://git-scm.com) |

**IDEs recomendados:**

- **Backend Java:** IntelliJ IDEA Community/Ultimate (soporte nativo Maven y depurador JVM)
- **Frontend TypeScript:** Visual Studio Code con extensiones ESLint, Tailwind CSS IntelliSense y TypeScript

**Verificar instalación:**

```bash
java --version       # debe mostrar "openjdk 21..."
mvn --version        # debe mostrar "Apache Maven 3.8..."
node --version       # debe mostrar "v20..."
docker --version     # debe mostrar "Docker version 27..."
```

---

## 2. Clonar y Configurar el Repositorio

```bash
git clone https://github.com/iscoutb/EthosTerra.git
cd EthosTerra
```

### Crear el archivo `.env`

El archivo `.env` no está en el repositorio (excluido por `.gitignore`). Créalo a partir de la plantilla incluida:

```bash
# Linux / macOS
cp .env .env.local   # la plantilla ya está en .env (ver contenido real)

# Windows PowerShell
Copy-Item .env .env.backup
```

Edita `.env` con los valores de tu entorno:

```env
WPS_JAR_PATH=/app/wps-simulator.jar   # ruta dentro del contenedor Docker
WPS_LOGS_PATH=/app/src/wps/logs       # directorio de salida CSV
NODE_ENV=production

# Ajustar según RAM del servidor:
# VPS 4 GB  → -Xmx1g  -Xms256m
# VPS 8 GB  → -Xmx2g  -Xms512m   (defecto)
# VPS 16 GB → -Xmx4g  -Xms1g
JAVA_TOOL_OPTIONS=-Xmx2g -Xms512m
```

> Para desarrollo local (sin Docker), `WPS_JAR_PATH` puede apuntar a una ruta absoluta del sistema, por ejemplo:  
> `WPS_JAR_PATH=C:/Users/tu-usuario/Projects/EthosTerra/wpsSimulator/target/wps-simulator-3.6.0.jar`

---

## 3. Estructura del Repositorio

```
EthosTerra/
├── KernelBESA/        ← Módulo 1: núcleo del framework BESA
├── LocalBESA/         ← Módulo 2: agentes en nodo local
├── RemoteBESA/        ← Módulo 3: agentes distribuidos vía socket
├── RationalBESA/      ← Módulo 4: agentes con creencias y planes
├── BDIBESA/           ← Módulo 5: arquitectura BDI (Goals/Desires/Intentions)
├── eBDIBESA/          ← Módulo 6: extensiones emocionales BDI
├── wpsSimulator/      ← Aplicación principal: motor de simulación (fat JAR)
├── wpsUI/             ← Frontend: Next.js 14 + Electron
├── data/
│   ├── test-backend.mjs         ← Suite de tests de integración (Node.js)
│   ├── run_experiments.ps1      ← Automatización de experimentos (Windows)
│   ├── experiment_results.json  ← Acumulador de resultados
│   └── logs/                   ← CSV de salida (persistido por Docker)
├── Dockerfile                   ← Build multi-etapa
├── docker-compose.yml           ← Orquestación de contenedores
├── .env                         ← Variables de entorno (no comitear valores reales)
├── ARCHITECTURE.md              ← Referencia técnica de arquitectura
└── INFORME.md                   ← Contexto académico del proyecto
```

Para una descripción detallada de cada módulo, consulta [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 4. Desarrollo del Backend (Java / BESA)

### 4.1 Compilar los Módulos BESA Localmente

Los módulos BESA son dependencias del simulador. Deben compilarse **en orden de dependencia** e instalarse en el repositorio Maven local (`~/.m2`) antes de compilar `wpsSimulator`.

```bash
# Desde la raíz del repositorio
cd KernelBESA   && mvn install -DskipTests && cd ..
cd LocalBESA    && mvn install -DskipTests && cd ..
cd RemoteBESA   && mvn install -DskipTests && cd ..
cd RationalBESA && mvn install -DskipTests && cd ..
cd BDIBESA      && mvn install -DskipTests && cd ..
cd eBDIBESA     && mvn install -DskipTests && cd ..
```

El perfil activo por defecto es `local-dev`, que usa `scope=system` con rutas relativas para resolver las JAR de los módulos hermanos. Esto permite desarrollar sin publicar en GHCR.

**Script de conveniencia (PowerShell, Windows):**

```powershell
@("KernelBESA","LocalBESA","RemoteBESA","RationalBESA","BDIBESA","eBDIBESA") | ForEach-Object {
    Push-Location $_
    mvn install -DskipTests -q
    Pop-Location
    Write-Host "✓ $_ instalado"
}
```

---

### 4.2 Compilar y Ejecutar wpsSimulator

```bash
cd wpsSimulator
mvn package -DskipTests        # compila y genera el fat JAR
```

El JAR se genera en `wpsSimulator/target/wps-simulator-3.6.0.jar`.

**Ejecutar la simulación:**

```bash
java -jar target/wps-simulator-3.6.0.jar \
  -env local \
  -mode single \
  -agents 10 \
  -money 1500000 \
  -land 6 \
  -personality 0.3 \
  -tools 10 \
  -seeds 10 \
  -water 10 \
  -irrigation 1 \
  -emotions 1 \
  -training 1 \
  -world mediumworld.json \
  -years 1
```

Para **compilar con el perfil `docker`** (necesario si pretendes construir la imagen del contenedor manualmente):

```bash
cd wpsSimulator
mvn package -DskipTests -P docker
```

---

### 4.3 Añadir un Nuevo Agente

1. **Crea la clase del agente** en `wpsSimulator/src/main/java/org/wpsim/<NombreAgente>/`:

```java
package org.wpsim.MiAgente;

import BESA.Kernel.Agent.AgentBESA;
import BESA.Kernel.Agent.StateBESA;

public class MiAgente extends AgentBESA {

    public static MiAgente createAgent(String alias, MiAgenteState state) throws Exception {
        return new MiAgente(alias, state, 0.91);
    }

    private MiAgente(String alias, StateBESA state, double passwd) throws Exception {
        super(alias, state, passwd);
    }
}
```

2. **Crea el estado** `MiAgenteState extends StateBESA` con los datos que el agente necesita.

3. **Crea al menos un Guard** `MiAgenteGuard extends GuardBESA`:

```java
public class MiAgenteGuard extends GuardBESA {
    @Override
    public void funcExecGuard(EventBESA event) {
        MiAgenteData data = (MiAgenteData) event.getData();
        MiAgenteState state = (MiAgenteState) this.agent.getState();
        // lógica de negocio
    }
}
```

4. **Crea la clase de datos** `MiAgenteData extends DataBESA`.

5. **Registra el agente** en `wpsStart.java` junto al resto de agentes en el método de inicialización.

6. **Registra los guards** en el constructor de `MiAgente` usando `this.addBehavior(new MiAgenteGuard())`.

---

### 4.4 Añadir una Nueva Meta (Goal BDI)

Solo aplica a agentes que extiendan `AgentBDI` (principalmente `PeasantFamily`).

1. **Crea la clase de la meta** en el paquete correspondiente:

```java
public class MiNuevaGoal extends GoalBDI {

    @Override
    public double evaluateViability(AgentBDI agent) {
        // retorna 0.0–1.0: probabilidad de éxito
        PeasantFamilyState state = (PeasantFamilyState) agent.getState();
        return state.getMoney() > 500000 ? 1.0 : 0.0;
    }

    @Override
    public double evaluateContribution(AgentBDI agent) {
        // retorna 0.0–1.0: contribución al objetivo de bienestar
        return 0.7;
    }

    @Override
    public boolean goalSucceeded(AgentBDI agent) {
        // condición de cumplimiento de la meta
        return ((PeasantFamilyState) agent.getState()).isMiNuevaMetaCompletada();
    }
}
```

2. **Añade la meta a la pirámide de deseos** del agente en el constructor o en el `BDIAgentBuilder`:

```java
builder.addGoal(new MiNuevaGoal(), GoalLevel.LEVEL_3); // ajustar nivel (1–6)
```

3. **Añade el guard asociado** que ejecuta la acción cuando la meta se convierte en intención.

---

### 4.5 Depuración del Backend

**Configurar niveau de log:**

Edita `wpsSimulator/src/main/resources/logback.xml` (o crea uno si no existe) para ajustar la verbosidad:

```xml
<configuration>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n</pattern>
        </encoder>
    </appender>
    <root level="DEBUG">
        <appender-ref ref="CONSOLE"/>
    </root>
</configuration>
```

**Depuración remota con IntelliJ IDEA:**

```bash
# Arrancar el JAR en modo debug (puerto 5005)
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005 \
     -jar target/wps-simulator-3.6.0.jar -agents 5 -money 1500000
```

Luego en IntelliJ: **Run → Attach to Process** → seleccionar puerto 5005.

**Logs de salida:**

Los resultados CSV se escriben en `logs/wpsSimulator.csv` (relativo al directorio de ejecución). La primera fila es el encabezado de columnas.

---

## 5. Desarrollo del Frontend (Next.js / Electron)

### 5.1 Instalar Dependencias

```bash
cd wpsUI
npm install --ignore-scripts   # --ignore-scripts evita postinstall de Electron en entornos sin cabecera de pantalla
```

> Si desarrollas en Windows y tienes Electron configurado, puedes omitir `--ignore-scripts`:
> ```powershell
> cd wpsUI
> npm install
> ```

---

### 5.2 Modo Web (Next.js Standalone)

Ideal para desarrollo sin tener Electron instalado, o para el flujo Docker:

```bash
cd wpsUI
npm run start         # sirve en http://localhost:3000
```

Para desarrollo con recarga automática:

```bash
npm run dev -- --port 3000    # Next.js en modo dev (no inicia Electron)
```

Nota: En modo web, `ElectronPolyfill.tsx` redirige automáticamente las llamadas a `window.electronAPI` a las API routes HTTP (`/api/simulator/*`).

---

### 5.3 Modo Desktop (Electron + Next.js)

```bash
cd wpsUI
npm run dev     # inicia Next.js + Electron en paralelo (concurrently)
```

Esto abre la ventana de Electron con splash screen y luego carga `http://localhost:3000`.

**Build de distribución:**

```bash
npm run build      # compila Next.js + empaqueta con electron-builder
npm run dist       # equivalente con export
```

El instalador se genera en `wpsUI/dist/`.

---

### 5.4 Añadir un Nuevo Componente

1. Crea el archivo en `wpsUI/src/components/<categoria>/MiComponente.tsx`:

```tsx
'use client';

import { cn } from '@/lib/utils';

interface MiComponenteProps {
  title: string;
  className?: string;
}

export function MiComponente({ title, className }: MiComponenteProps) {
  return (
    <div className={cn('rounded-lg bg-card p-4', className)}>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    </div>
  );
}
```

2. Usa el alias `@/` para importar desde `src/`:

```tsx
import { MiComponente } from '@/components/mi-categoria/MiComponente';
```

**Convenciones de estilo:**

- Usa clases de Tailwind directamente; evita CSS en línea o módulos CSS para componentes nuevos.
- Para colores consistentes con el tema oscuro del proyecto, usa las variables CSS del tema:
  - Fondo de tarjeta: `bg-card` (`#171c1f`)
  - Fondo general: `bg-background` (`#0f1417`)
  - Azul primario: `text-primary` o `bg-primary` (`#3b82f6`)
- Para componentes interactivos (botones, diálogos, selects), utiliza los primitivos de **Radix UI** ya incluidos en `src/components/ui/`.

---

### 5.5 Añadir una Nueva Página

1. Crea el directorio y el archivo de la página en `wpsUI/src/app/pages/<nombre>/page.tsx`:

```tsx
// wpsUI/src/app/pages/mi-pagina/page.tsx
import { MiComponentePrincipal } from '@/components/mi-categoria/MiComponentePrincipal';

export default function MiPaginaPage() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <MiComponentePrincipal />
    </main>
  );
}
```

2. Añade un enlace de navegación en `wpsUI/src/components/Sidebar/sidebar.tsx`.

---

### 5.6 Añadir una Nueva API Route

1. Crea el archivo en `wpsUI/src/app/api/<nombre>/route.ts`:

```typescript
// wpsUI/src/app/api/mi-recurso/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // lógica del endpoint
  return NextResponse.json({ data: '...' });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  // validar con Zod antes de procesar
  return NextResponse.json({ success: true });
}
```

2. **Checklist de seguridad obligatorio para API routes que ejecutan procesos o acceden a archivos:**

- [ ] Validar la presencia y tipo de cada parámetro de entrada.
- [ ] Si se construyen argumentos de línea de comandos, usar la lista blanca de flags permitidos.
- [ ] Aplicar la regex de valores seguros (`/^[\w./_-]+$/`) a cada valor de argumento.
- [ ] Si se accede al sistema de archivos, llamar a `isPathSafe(path)` antes de leer o borrar.
- [ ] Nunca concatenar entrada del usuario directamente en comandos de shell.

Véase `wpsUI/src/app/api/simulator/route.ts` como referencia de implementación segura.

---

### 5.7 Tema y Estilos

El tema oscuro está configurado en `wpsUI/tailwind.config.ts` con la estrategia `class`:

```typescript
// wpsUI/tailwind.config.ts (fragmento)
darkMode: ["class"],
theme: {
  extend: {
    colors: {
      background: "#0f1417",
      card: "#171c1f",
      primary: "#3b82f6",
      // ... ver el archivo completo para todas las variables
    }
  }
}
```

El toggle de tema está en el `Sidebar`. Para forzar el tema oscuro en desarrollo:

```html
<!-- en layout.tsx o en el elemento raíz -->
<html lang="es" class="dark">
```

---

## 6. Desarrollo con Docker (Full Stack)

Docker es el método recomendado para verificar que el stack completo (backend Java + frontend Next.js) funciona antes de hacer merge o desplegar.

**Primera construcción (tarda ~10 min por la compilación Maven):**

```bash
docker compose up --build
```

**Ejecuciones posteriores (sin reconstruir):**

```bash
docker compose up -d
```

**Ver logs en tiempo real:**

```bash
docker compose logs -f
docker compose logs -f wellprodsim   # solo el contenedor principal
```

**Reconstruir solo si cambió el código fuente:**

```bash
docker compose up --build -d
```

**Parar y eliminar contenedores (los datos de logs persisten en `./data/logs/`):**

```bash
docker compose down
```

**Acceder a la aplicación:**

| Servicio | URL |
|---------|-----|
| Interfaz web | http://localhost:3000 |
| WebSocket ViewerLens | ws://localhost:8000/wpsViewer |
| Healthcheck | http://localhost:3000/api/simulator/app-path |

**Ajustar recursos para desarrollo local:**

Si el host tiene poca RAM, edita `docker-compose.yml` temporalmente:

```yaml
deploy:
  resources:
    limits:
      memory: 2g    # reducir de 4g
      cpus: "1.0"   # reducir de 2.0
```

Y en `.env`:

```env
JAVA_TOOL_OPTIONS=-Xmx1g -Xms256m
```

---

## 7. Testing

### 7.1 Tests de Integración del Backend

El archivo `data/test-backend.mjs` contiene 20 tests de integración que verifican:

- Estado de la API del simulador (GET, POST, DELETE)
- Sanitización de argumentos (inyección con `;`, `|`, `$`)
- Validación de flags desconocidos
- Prevención de path traversal en endpoints de archivo
- Endpoints auxiliares (`/api/simulator/app-path`, ruta raíz)

**Requisito:** La aplicación debe estar corriendo (Docker o `npm start` en `wpsUI/`).

```bash
# Ejecutar contra localhost:3000 (defecto)
node data/test-backend.mjs

# Ejecutar contra una URL personalizada
BASE_URL=http://mi-servidor:3000 node data/test-backend.mjs
```

**Salida esperada:**

```
Test 1 PASSED: GET /api/simulator returns status
Test 2 PASSED: POST /api/simulator starts simulation
...
=== Results: 20/20 passed ===
```

---

### 7.2 Checklist de Pruebas Manuales

Antes de hacer merge de cambios que afecten el flujo principal, verifica manualmente:

**Simulación:**
- [ ] La pantalla de configuración carga sin errores y todos los sliders responden.
- [ ] Pulsar "Iniciar simulación" lanza el proceso Java y aparece un toast de confirmación.
- [ ] El mapa muestra parcelas actualizándose en tiempo real (WebSocket activo).
- [ ] La barra de progreso refleja el avance temporal de la simulación.
- [ ] Al finalizar la simulación, aparece el toast de "Simulación completada".

**Analytics:**
- [ ] Entrar a `/pages/analytics` muestra los datos del último CSV.
- [ ] Los selectores de variable funcionan y los gráficos se actualizan.
- [ ] El botón de descarga de CSV genera un archivo descargable.

**Infraestructura:**
- [ ] `GET /api/simulator/app-path` devuelve 200 (healthcheck).
- [ ] `DELETE /api/simulator` termina el proceso Java correctamente.
- [ ] `DELETE /api/simulator/csv` borra el archivo CSV.

---

## 8. Ejecutar Experimentos

### 8.1 Experimento Individual desde la UI

1. Abre http://localhost:3000.
2. Navega a **Configuración** (icono de engranaje en la barra lateral).
3. Ajusta los parámetros deseados (agentes, capital, personalidad, emociones, etc.).
4. Pulsa **Iniciar Simulación**.
5. Cuando termine, ve a **Analytics** para visualizar los resultados.
6. Descarga el CSV desde la sección de descarga.

---

### 8.2 Automatización con PowerShell (Windows)

El script `data/run_experiments.ps1` ejecuta experimentos secuenciales y acumula resultados en `data/experiment_results.json`:

```powershell
# Desde la raíz del repositorio, con la app corriendo en localhost:3000
.\data\run_experiments.ps1
```

**Flujo del script:**

1. Para cada experimento definido en el script:
   - Verifica que no haya una simulación en curso.
   - Borra el CSV anterior del experimento.
   - Envía `POST /api/simulator` con los argumentos del experimento.
   - Hace polling cada 20 segundos hasta que el proceso Java termina.
   - Parsea el CSV de resultados (capital promedio, biomasa).
   - Añade la entrada al JSON de resultados.

**Añadir un nuevo experimento al script:**

```powershell
# Dentro de run_experiments.ps1, añadir al array de experimentos:
@{
    label    = "E3_R1_M3000K_EmNo"
    args     = @("-agents","5","-money","3000000","-land","6","-personality","0",
                 "-tools","10","-seeds","10","-water","10","-irrigation","1",
                 "-emotions","0","-training","1","-world","mediumworld.json","-years","1")
}
```

---

### 8.3 Barrido de Parámetros con Bash (Linux/macOS)

Los scripts `wpsSimulator/run_exp.sh` y `run_exp2.sh` ejecutan 27 experimentos predefinidos directamente con el JAR:

```bash
cd wpsSimulator
chmod +x run_exp.sh
./run_exp.sh
```

Cada experimento varía combinaciones de:

| Parámetro | Valores explorados |
|-----------|-------------------|
| Capital inicial | 500K, 750K, 1.5M, 3M, 6M COP |
| Parcelas de tierra | 2, 6, 12 |
| Varianza de personalidad | -0.5, 0.0, 0.5 |
| Herramientas/semillas/agua | 0, 10, 50, 999999 |

Los logs de cada experimento se guardan en directorios `E401/`, `E402/`, …, `E427/`.

---

### 8.4 Ejecución Remota Multi-nodo (SSH)

Para experimentos de larga duración en servidores distribuidos, usar `wpsSimulator/run.py` (requiere `paramiko`):

```bash
pip install paramiko
python wpsSimulator/run.py
```

El script:
- Distribuye el JAR vía rsync a los nodos `wpsmain`, `wps01`, `wps02`, `wps03`.
- Lanza experimentos en paralelo con desfase de 2 segundos entre nodos.
- Timeout de 3 horas por experimento.
- Guarda resultados en `/home/sistemas/experiments/<nombre>/` en cada nodo.

Para recolectar los resultados después:

```bash
bash wpsSimulator/get_logs.sh
```

---

### 8.5 Interpretar Resultados

**Formato del JSON de resultados** (`data/experiment_results.json`):

```json
{
  "E1_R1_M1500K_Pers0": {
    "label": "5 agentes, 1.5M, sin varianza personalidad",
    "args": ["-agents", "5", "-money", "1500000", ...],
    "agents": 5,
    "avgMoney": 14700000,
    "minMoney": 12300000,
    "maxMoney": 17100000,
    "avgBiomasa": 8.4,
    "minBiomasa": 6.1,
    "maxBiomasa": 11.3
  }
}
```

**Columnas clave del CSV de salida:**

| Índice (0-based) | Columna | Descripción |
|-----------------|---------|-------------|
| 4 | `money` | Capital acumulado de la familia (COP) |
| 28 | `totalHarvestedWeight` | Biomasa cosechada total (kg) |
| 31 | `Agent` | Alias del agente (`PeasantFamily_N`) |

**Hallazgo de referencia** (ver [data/experimentos_resultados.md](data/experimentos_resultados.md)):

> Con más de 12 parcelas por 5 agentes, el overhead de gestión supera los rendimientos → colapso del capital. El punto óptimo encontrado experimentalmente es 6 parcelas por agente con 1.5M de capital inicial.

---

## 9. Despliegue en Producción

### 9.1 Despliegue Automático (GitHub Actions)

El pipeline en [.github/workflows/deploy.yml](.github/workflows/deploy.yml) se ejecuta automáticamente al hacer push a `main` o `master`.

**Pasos del pipeline:**

1. **Build & Push:** Construye la imagen Docker multi-etapa y la sube a GHCR con etiquetas `latest` y `{commit-sha}`.
2. **Deploy:** Se conecta por SSH al VPS y ejecuta `docker compose pull && docker compose up -d`.

**Configurar los secretos en el repositorio** (Settings → Secrets → Actions):

| Secret | Valor |
|--------|-------|
| `SERVER_HOST` | IP o hostname del VPS |
| `SERVER_USER` | Usuario SSH (ej: `ubuntu`, `sistemas`) |
| `SERVER_SSH_KEY` | Contenido de la clave privada SSH (ED25519 recomendada) |

El `GITHUB_TOKEN` ya está disponible automáticamente para push a GHCR.

**Generar y registrar la clave SSH:**

```bash
# En tu máquina local
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/deploy_key

# Copiar la clave pública al VPS
ssh-copy-id -i ~/.ssh/deploy_key.pub usuario@ip-del-vps

# Copiar la clave PRIVADA como secreto SERVER_SSH_KEY en GitHub
cat ~/.ssh/deploy_key
```

---

### 9.2 Despliegue Manual en VPS

```bash
# En el VPS (asegúrate de estar en el directorio con docker-compose.yml)
cd ~/simulacion
docker compose pull
docker compose up -d
docker image prune -f   # limpiar imágenes antiguas
```

**Ver estado del servicio:**

```bash
docker compose ps
docker compose logs -f --tail=100
```

---

### 9.3 Distribución Multi-servidor

Para distribuir el código fuente a los 4 nodos del clúster:

```bash
bash wpsSimulator/deploy_copy.sh
```

`deploy_copy.sh` usa `rsync` para sincronizar el directorio `wpsSimulator/` a:
- `sistemas@wpsmain:/home/sistemas/wpsim`
- `sistemas@wps01:/home/sistemas/wpsim`
- `sistemas@wps02:/home/sistemas/wpsim`
- `sistemas@wps03:/home/sistemas/wpsim`

Requiere acceso SSH configurado para el usuario `sistemas` en los 4 nodos.

---

### 9.4 Recolección de Logs Remotos

```bash
bash wpsSimulator/get_logs.sh
```

Descarga todos los resultados de experimentos desde `/home/sistemas/experiments/` en cada nodo hacia:
- `~/logs/wpsmain/`
- `~/logs/wps01/`
- `~/logs/wps02/`
- `~/logs/wps03/`

---

### 9.5 Monitoreo y Salud del Servicio

**Endpoint de healthcheck:**

```bash
curl -s http://localhost:3000/api/simulator/app-path
# Respuesta esperada: {"path": "/app"}
```

Docker Compose verifica automáticamente este endpoint cada 30 segundos (`restart: unless-stopped` garantiza la recuperación ante caída).

**Métricas de uso de recursos:**

```bash
docker stats wellprodsim
```

Si el contenedor alcanza el límite de 4 GB de memoria y la simulación colapsa:
1. Reducir el número de agentes (`-agents`).
2. Aumentar el límite en `docker-compose.yml` y `JAVA_TOOL_OPTIONS`.

---

## 10. Convenciones de Código y Contribución

### 10.1 Convenciones Java / BESA

**Nombre de clases:**

| Tipo | Patrón de nombre | Ejemplo |
|------|-----------------|---------|
| Agente | `NombreAgente` | `PeasantFamily`, `BankOffice` |
| Estado del agente | `NombreAgenteState` | `PeasantFamilyState` |
| Guard | `De<Origen>Guard` o `AccionGuard` | `FromBankOfficeGuard`, `HeartBeatGuard` |
| Datos de evento | `NombreAgenteData` | `BankOfficeData`, `MarketData` |
| Meta BDI | `AccionGoal` | `PayDebtsGoal`, `HarvestCropsGoal` |
| Estado BDI | `NombreAgenteBDIState extends StateBDI` | `PeasantFamilyBDIState` |

**Reglas arquitectónicas:**

- Un guard **nunca** debe llamar directamente a métodos de otro agente; siempre comunica vía `AdmBESA.getInstance().getHandlerByAlias(...).sendEvent(...)`.
- El estado del agente (`StateBESA`) es el **único** lugar donde se almacenan datos persistentes del agente.
- Los guards deben ser **lo más atómicos posible**: una responsabilidad por guard.
- Documenta las condiciones de activación y postcondiciones de cada `GoalBDI`.

**Logging:**

```java
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

private static final Logger log = LoggerFactory.getLogger(MiClase.class);
log.info("PeasantFamily {} tomó préstamo por {} COP", alias, monto);
log.debug("Estado BDI: creencias={}", state.getBelievesAsString());
```

---

### 10.2 Convenciones TypeScript / React

**Estructura de componente:**

```tsx
'use client';                         // solo si necesita hooks o eventos del cliente

import { useState } from 'react';
import { cn } from '@/lib/utils';     // usar alias @/ siempre

// Props siempre tipadas con interfaz o type
interface ComponenteProps {
  dato: string;
  opcional?: number;
  onAccion: () => void;
}

// Named export (no default, facilita tree-shaking)
export function MiComponente({ dato, opcional = 0, onAccion }: ComponenteProps) {
  const [estado, setEstado] = useState(false);

  return (
    <div className={cn('base-classes', estado && 'estado-activo')}>
      {dato}
    </div>
  );
}
```

**Reglas:**

- Usar `'use client'` solo cuando sea estrictamente necesario (interactividad, hooks de estado/efecto). Los componentes del servidor son preferibles.
- Importar siempre con rutas absolutas usando `@/`.
- Tipar todas las props e interfaces; evitar `any`.
- Los API routes deben validar la entrada antes de procesarla.

---

### 10.3 Checklist de Seguridad

Antes de hacer merge de cualquier cambio, verifica:

**API routes nuevas:**
- [ ] Los valores de entrada son validados (Zod o validación manual con regex).
- [ ] Si se ejecutan procesos externos, se usa lista blanca de argumentos permitidos.
- [ ] El acceso a archivos usa `isPathSafe()` para prevenir path traversal.
- [ ] Ningún valor de usuario se concatena directamente en comandos de shell.

**Componentes nuevos:**
- [ ] No se exponen datos sensibles (rutas absolutas, PID de procesos) al cliente.
- [ ] Las llamadas a `window.electronAPI` tienen fallback en `ElectronPolyfill`.

**Dependencias nuevas:**
- [ ] Verificar que la dependencia tiene mantenimiento activo (última publicación < 1 año).
- [ ] Ejecutar `npm audit` después de instalar y revisar vulnerabilidades críticas.

---

### 10.4 Flujo de Contribución

1. **Fork** del repositorio o **crear rama** desde `main`:
   ```bash
   git checkout -b feature/nombre-descriptivo
   ```

2. **Desarrollar** seguiendo las convenciones de código descritas arriba.

3. **Validar localmente:**
   ```bash
   # Backend: compilar y pasar tests de integración
   cd wpsSimulator && mvn package -DskipTests
   node data/test-backend.mjs  # (con la app corriendo)

   # Frontend: linting (usa next build como lint)
   cd wpsUI && npm run lint
   ```

4. **Commit** con mensaje descriptivo en español o inglés:
   ```bash
   git commit -m "feat(PeasantFamily): añadir meta de diversificación de ingresos"
   git commit -m "fix(API): prevenir path traversal en endpoint /file"
   ```

5. **Abrir Pull Request** a `main` con:
   - Descripción del cambio y motivación.
   - Referencia al issue relacionado (si aplica).
   - Captura de pantalla o log si es un cambio visual o de comportamiento.

6. El Pipeline de CI (GitHub Actions) ejecutará el build Docker automáticamente como validación.

---

> Para cualquier duda sobre la arquitectura del sistema, consulta [ARCHITECTURE.md](ARCHITECTURE.md).  
> Para el contexto académico e hipótesis de investigación del proyecto, consulta [INFORME.md](INFORME.md).
