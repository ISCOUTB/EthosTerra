# Diagnóstico GitHub Actions - RationalBESA

## Problema Identificado

❌ **Error 401 Unauthorized** al intentar descargar KernelBESA desde GitHub Packages

```
Could not transfer artifact io.github.iscoutb:kernel-besa:pom:3.5.1 
from/to github-kernelbesa (https://maven.pkg.github.com/ISCOUTB/KernelBESA): 
status code: 401, reason phrase: Unauthorized (401)
```

## Posibles Causas

### 1. KernelBESA No Publicado (Más Probable)
- KernelBESA versión 3.5.1 no está disponible en GitHub Packages
- El repositorio `https://maven.pkg.github.com/ISCOUTB/KernelBESA` no existe o está vacío
- GitHub Actions de KernelBESA no han ejecutado exitosamente

### 2. Problemas de Autenticación
- Token de GitHub no tiene permisos correctos
- Configuración de maven-settings.xml incorrecta
- Variables de entorno no configuradas

### 3. Problemas de Configuración
- URL del repositorio incorrecta
- ID de servidor no coincide entre pom.xml y settings.xml

## Verificaciones Necesarias

### ✅ Verificar KernelBESA en GitHub Packages

1. **Ir a**: https://github.com/ISCOUTB/KernelBESA/packages
2. **Buscar**: Package `kernel-besa` versión `3.5.1`
3. **Verificar**: Que el package esté públicamente visible

### ✅ Verificar GitHub Actions de KernelBESA

1. **Ir a**: https://github.com/ISCOUTB/KernelBESA/actions
2. **Verificar**: Que el último workflow haya ejecutado exitosamente
3. **Revisar logs**: Si hay errores en el deploy

### ✅ Verificar Permisos del Repositorio

1. **Settings** → **Actions** → **General**
2. **Workflow permissions**: Debe ser "Read and write permissions"
3. **Allow GitHub Actions to create and approve pull requests**: Habilitado

## Soluciones

### Solución 1: Publicar KernelBESA Primero

```bash
# En el repositorio KernelBESA
cd KernelBESA
git add .
git commit -m "Prepare for GitHub Packages deployment"
git push origin main

# Esperar a que GitHub Actions ejecute y publique el package
```

### Solución 2: Usar Build Local Temporal

Modificar el workflow para usar dependencias locales mientras se publica KernelBESA:

```yaml
- name: Build with Local Dependencies (temporary)
  run: |
    # Clone KernelBESA if needed
    if [ ! -d "../KernelBESA" ]; then
      git clone https://github.com/ISCOUTB/KernelBESA.git ../KernelBESA
    fi
    
    # Build KernelBESA
    cd ../KernelBESA
    mvn clean install -B
    
    # Return to RationalBESA and build
    cd ../RationalBESA
    mvn clean compile package -P local-dev -B
```

### Solución 3: Configurar Fallback Inteligente

```yaml
- name: Smart Build Strategy
  run: |
    echo "Attempting GitHub Packages build..."
    if mvn dependency:resolve -P github-packages -B -q; then
      echo "✅ Dependencies available, building with github-packages"
      mvn clean compile package -P github-packages -B
    else
      echo "⚠️ Dependencies not available, switching to local build"
      # Clone and build KernelBESA
      git clone https://github.com/ISCOUTB/KernelBESA.git ../KernelBESA
      cd ../KernelBESA && mvn clean install -B
      cd ../RationalBESA
      mvn clean compile package -P local-dev -B
    fi
```

## Recomendación Inmediata

**Opción A - Verificar KernelBESA:**
1. Revisar si KernelBESA está publicado en GitHub Packages
2. Si no está publicado, ejecutar el workflow de KernelBESA primero

**Opción B - Usar Workaround Temporal:**
1. Modificar el workflow de RationalBESA para clonar y buildear KernelBESA automáticamente
2. Esto permite que RationalBESA funcione independientemente

## Comando de Verificación

```bash
# Verificar si KernelBESA está disponible públicamente
curl -H "Accept: application/vnd.github.v3+json" \
     https://api.github.com/repos/ISCOUTB/KernelBESA/packages
```

---

**Estado actual**: ❌ GitHub Actions fallando por dependencia faltante
**Siguiente paso**: Verificar/publicar KernelBESA en GitHub Packages
