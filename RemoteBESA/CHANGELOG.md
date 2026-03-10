# Changelog - RemoteBESA

Todos los cambios notables de este proyecto serán documentados en este archivo.

## [3.5] - 2025-09-09

### Agregado
- **Migración completa de Ant a Maven**: Configuración moderna de build con Maven
- **Perfiles de desarrollo**: Configuración dual para desarrollo local y GitHub Packages
- **GitHub Actions**: CI/CD automático con despliegue a GitHub Packages
- **Documentación completa**: README.md con instalación y uso
- **Guía de autenticación**: SETUP_AUTH.md para configurar GitHub Packages
- **Javadoc mejorado**: Documentación de API con configuración permisiva
- **Distribución de artefactos**: JAR principal, sources y javadoc

### Cambiado
- **Versión actualizada**: De 1.0.0 a 3.5 para alineación con KernelBESA
- **Estructura de dependencias**: Uso de KernelBESA 3.5.1 y LocalBESA 3.5
- **Sistema de build**: Migración completa de Ant a Maven 3.6+
- **Target Java**: Actualizado a Java 21 LTS
- **Organización**: Repositorio transferido a organización ISCOUTB

### Eliminado
- **build.xml**: Archivo de configuración de Ant removido
- **manifest.mf**: Manifesto de Ant removido
- **RemoteBESA.iml**: Archivo de proyecto IntelliJ legacy removido
- **nbproject/**: Directorio completo de NetBeans removido
- **Dependencias Ant**: Todas las referencias al sistema de build Ant

### Características Técnicas
- **Maven Profiles**: 
  - `local-dev`: Para desarrollo usando JARs locales del sistema
  - `github-packages`: Para usar dependencias desde GitHub Packages
- **Dependencias**:
  - KernelBESA 3.5.1 (framework base)
  - LocalBESA 3.5 (extensión local)
- **Plugins Maven**:
  - Compiler Plugin 3.11.0 (Java 21)
  - Source Plugin 3.3.0 (generación de sources JAR)
  - Javadoc Plugin 3.5.0 (documentación API)
- **GitHub Actions**: Build y deploy automático con autenticación GITHUB_TOKEN
- **Artefactos generados**:
  - `remote-besa-3.5.jar` (binario principal)
  - `remote-besa-3.5-sources.jar` (código fuente)
  - `remote-besa-3.5-javadoc.jar` (documentación)

### Notas de Compatibilidad
- Compatible con KernelBESA 3.5.1+
- Compatible con LocalBESA 3.5+
- Requiere Java 21 LTS o superior
- Maven 3.6+ requerido para build
- GitHub Packages requiere autenticación para acceso

### Próximas Versiones
- Mejoras en documentación Javadoc
- Optimización de protocolos de red
- Soporte para contenedores Docker
- Integración con Kubernetes
- Métricas y monitoreo distribuido
