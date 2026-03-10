# Configuración de Autenticación para LocalBESA v3.5

## Para Desarrollo Local

### Opción 1: Usar settings.xml global
Crear o editar `~/.m2/settings.xml`:

```xml
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0">
  <servers>
    <server>
      <id>github-iscoutb</id>
      <username>TU_USUARIO_GITHUB</username>
      <password>TU_PERSONAL_ACCESS_TOKEN</password>
    </server>
  </servers>
</settings>
```

### Opción 2: Variables de entorno (temporal)
```bash
export GITHUB_TOKEN=tu_personal_access_token
export GITHUB_ACTOR=tu_usuario

# Luego ejecutar Maven con el settings del proyecto
mvn clean compile -s .github/maven-settings.xml
```

### Opción 3: PowerShell (Windows)
```powershell
$env:GITHUB_TOKEN = "tu_personal_access_token"
$env:GITHUB_ACTOR = "tu_usuario"
mvn clean compile -s .github/maven-settings.xml
```

## Para CI/CD (GitHub Actions)
La configuración ya está lista en `.github/workflows/build.yml`. GitHub Actions automáticamente:
- Provee `GITHUB_TOKEN` con permisos necesarios
- Usa `.github/maven-settings.xml` para autenticación
- Descarga KernelBESA y publica LocalBESA

## Permisos Necesarios del Personal Access Token
- `read:packages` - Para descargar dependencias
- `write:packages` - Para publicar paquetes (solo si vas a hacer deploy)
- `repo` - Si el repositorio es privado
