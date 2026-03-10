# GitHub Actions para RationalBESA

## Configuración Actualizada

### Características del Workflow Optimizado

1. **Cache de Maven**: Acelera los builds reutilizando dependencias descargadas
2. **Fallback Strategy**: Maneja situaciones donde KernelBESA aún no está publicado
3. **Validación de Configuración**: Verifica la configuración de Maven antes del build
4. **Tests Opcionales**: Ejecuta tests si están disponibles (con continue-on-error)
5. **Deploy Condicional**: Solo despliega en push a main branch

### Estrategia de Dependencias

El proyecto utiliza dos perfiles de Maven:

- **`local-dev`** (activo por defecto): Usa dependencias del sistema local
- **`github-packages`**: Usa dependencias de GitHub Packages

### Configuración de Repositorios

El perfil `github-packages` está configurado para:

1. Buscar `KernelBESA` en `https://maven.pkg.github.com/ISCOUTB/KernelBESA`
2. Buscar otras dependencias BESA en `https://maven.pkg.github.com/ISCOUTB/*`
3. Usar Maven Central como fallback

### Autenticación

El archivo `.github/maven-settings.xml` configura la autenticación para:

- `github-kernelbesa`: Repositorio específico de KernelBESA
- `github-all`: Repositorio general para todos los paquetes ISCOUTB
- `github`: Repositorio para publicación

### Orden de Despliegue Recomendado

Para que las GitHub Actions funcionen correctamente, se debe seguir este orden:

1. **KernelBESA** (primero - es la dependencia base)
2. **LocalBESA** (depende de KernelBESA)
3. **RationalBESA** (depende de KernelBESA)
4. **BDIBESA** (depende de KernelBESA y RationalBESA)
5. **eBDIBESA** (depende de KernelBESA)
6. **RemoteBESA** (depende de KernelBESA y LocalBESA)

### Manejo de Errores

El workflow actual está diseñado para:

- Continuar ejecutándose aunque falten dependencias en GitHub Packages
- Mostrar mensajes informativos sobre el estado esperado
- No fallar el build si las dependencias no están disponibles aún

### Próximos Pasos

1. Publicar KernelBESA primero
2. Verificar que RationalBESA puede resolver la dependencia
3. Continuar con el resto de proyectos siguiendo el orden de dependencias

### Variables de Entorno Requeridas

- `GITHUB_TOKEN`: Proporcionado automáticamente por GitHub Actions
- `GITHUB_ACTOR`: Proporcionado automáticamente por GitHub Actions

### Estructura de Archivos

```
.github/
├── workflows/
│   └── build.yml          # Workflow principal
└── maven-settings.xml     # Configuración de Maven para GitHub Actions
```

## Resolución de Problemas

### Si el build falla por dependencias faltantes

Es normal durante la fase inicial. El workflow mostrará mensajes informativos y continuará.

### Si el deploy falla

Verificar que:
1. Se está haciendo push a la rama `main`
2. El token tiene permisos de `packages:write`
3. KernelBESA está disponible en GitHub Packages

### Para desarrollo local

Usar el perfil `local-dev` (activo por defecto):

```bash
mvn clean compile package
```

### Para simular GitHub Actions localmente

```bash
mvn clean compile package -P github-packages
```
