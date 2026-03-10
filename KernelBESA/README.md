# KernelBESA

Breve descripción
------------------
KernelBESA es la implementación del núcleo (kernel) del framework de agentes BESA. Provee la administración local/ remota de agentes, registro/consulta de servicios (páginas blancas/amarillas), mecanismos de checkpoint y utilidades de logging.

Estado y metadatos
-------------------
- Version: 3.5.1
- Empaquetado: jar  
- Java requerido: 21
- Coordenadas Maven: `io.github.iscoutb:kernel-besa:3.5.1`

Contenido y arquitectura (resumen)
----------------------------------
- Paquetes principales (en `src/main/java`):
  - `BESA.Config` – Configuración del sistema (`ConfigBESA`, `XMLConfig`, etc.).
  - `BESA.Kernel` – Núcleo: agentes, administrador (`AdmBESA`), handlers y directorio.
  - `BESA.Log` – Sistema de logging y reportes.
  - `BESA.Util` – Utilidades varias (carga de archivos, conversión, timeouts).

El corazón del sistema es el administrador local/centralizado representado por la clase abstracta `BESA.Kernel.System.AdmBESA`. Entre sus responsabilidades están:
- Mantener un singleton del administrador.
- Crear y obtener la instancia del administrador según el tipo de entorno (local, remoto, mobile, interop, CE) a través de `SystemFactoryBESA` y `ConfigBESA`.
- Registro, eliminación y movimiento de agentes; generación de IDs de agente.
- Directorio de servicios (páginas amarillas) y búsqueda por alias/servicio.
- Activación/ejecución de checkpoints.

Compilar y empaquetar
---------------------
Requisitos: Java 21 y Maven.

En PowerShell (desde la raíz del proyecto):

```powershell
mvn -f .\pom.xml clean package
```

El artefacto resultante se ubicará en `target/`.

Uso básico (puntos clave)
-------------------------
- Para inicializar el administrador del kernel desde código Java usar:

```java
// obtener singleton (usa ConfigBESA por defecto o ruta a archivo de config)
AdmBESA adm = AdmBESA.getInstance();
```

- Algunas operaciones disponibles en `AdmBESA`:
  - `registerAgent(...)`, `unregisterAgent(...)`, `killAgent(...)`
  - `searchAidByAlias(alias)`, `searchAidByService(servId)`
  - `addService(servId)`, `bindService(agentId, servId)`, `unbindService(...)`
  - `activateCheckpoint()`, `executeCheckpoint()`, `deactivateCheckpoint()`

Archivos y puntos de interés
-----------------------------
- `pom.xml` — configuración Maven, Java 21.
- `src/main/java/BESA/Kernel/System/AdmBESA.java` — administrador abstracto del kernel (singleton).
- `src/main/java/BESA/Config/ConfigBESA.java` — configuración (enviroment case, paths).
