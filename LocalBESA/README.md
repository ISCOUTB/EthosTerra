# LocalBESA

## Descripción
LocalBESA es una implementación del administrador local BESA que extiende el framework KernelBESA. Proporciona funcionalidades específicas para la gestión local de agentes en el ecosistema BESA.

## Metadatos del Proyecto
- **Versión**: 3.5
- **Empaquetado**: jar
- **Java requerido**: 21
- **Coordenadas Maven**: `io.github.iscoutb:local-besa:3.5`

## Dependencias
Este proyecto depende de:
- **KernelBESA**: `io.github.iscoutb:kernel-besa:3.5.1` (desde GitHub Packages)

## Estructura del Proyecto
```
src/
└── BESA/
    └── Local/
        ├── LocalAdmBESA.java          # Administrador local principal
        └── Directory/                 # Directorio local
            ├── AgLocalHandlerBESA.java
            ├── LocalAdmHandlerBESA.java
            └── LocalDirectoryBESA.java
```

## Compilación y Empaquetado

### Requisitos
- Java 21
- Maven 3.6+
- Acceso a GitHub Packages para descargar KernelBESA

### Comandos de Build

```bash
# Compilar el proyecto
mvn clean compile

# Empaquetar
mvn clean package

# Ejecutar tests (si los hay)
mvn test
```

### Configuración de Acceso a GitHub Packages

Para que Maven pueda descargar la dependencia KernelBESA desde GitHub Packages, necesitas configurar tu `~/.m2/settings.xml`:

```xml
<settings>
  <servers>
    <server>
      <id>github-iscoutb</id>
      <username>TU_USUARIO_GITHUB</username>
      <password>TU_PERSONAL_ACCESS_TOKEN</password>
    </server>
  </servers>
</settings>
```

El Personal Access Token debe tener permisos de `read:packages`.

## Uso como Dependencia

Para usar LocalBESA en otro proyecto Maven:

```xml
<dependency>
    <groupId>io.github.iscoutb</groupId>
    <artifactId>local-besa-simple</artifactId>
    <version>3.5</version>
</dependency>
```

También necesitas agregar el repositorio de GitHub Packages:

```xml
<repositories>
    <repository>
        <id>github-iscoutb</id>
        <url>https://maven.pkg.github.com/ISCOUTB/LocalBESA</url>
    </repository>
</repositories>
```

## Despliegue Automático

El proyecto está configurado con GitHub Actions para:
- ✅ Compilar automáticamente en cada push/PR
- ✅ Publicar en GitHub Packages cuando se hace push a `main`
- ✅ Cache de dependencias Maven para builds más rápidos

## Migración desde Ant

El proyecto fue migrado desde un build.xml de Ant a Maven. Los cambios principales:
- **Estructura de directorios**: `src/` se mantiene como `sourceDirectory`
- **Dependencias**: Referencia local a KernelBESA → Dependencia Maven desde GitHub Packages
- **Build**: `build.xml` → `pom.xml` con plugins de Maven
- **Archivos eliminados**: `build.xml`, `manifest.mf`, `LocalBESA.iml`, `nbproject/` (NetBeans)
- **Versión actualizada**: De 1.0.0 → 3.5 (consistente con KernelBESA)

## Desarrollo

### Estructura de Clases Principales
- `LocalAdmBESA`: Extiende `AdmBESA` del KernelBESA
- `LocalDirectoryBESA`: Implementa directorio local de agentes
- `AgLocalHandlerBESA`: Manejador local de agentes
- `LocalAdmHandlerBESA`: Manejador del administrador local

### Ejemplo de Uso Básico

```java
import BESA.Local.LocalAdmBESA;
import BESA.Config.ConfigBESA;

// Obtener instancia del administrador local
LocalAdmBESA localAdm = (LocalAdmBESA) AdmBESA.getInstance();

// Registrar un agente
// ... código de ejemplo
```

## Licencia y Copyright
Basado en el código original con headers de Pontificia Universidad Javeriana, SIDRe y Takina.

## Contacto
Para issues y contribuciones, usar el repositorio GitHub: [ISCOUTB/LocalBESA](https://github.com/ISCOUTB/LocalBESA)
