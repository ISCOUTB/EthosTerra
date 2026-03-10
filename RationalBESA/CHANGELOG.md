# Changelog - RationalBESA

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
- **Estructura de dependencias**: Uso de KernelBESA 3.5.1
- **Sistema de build**: Migración completa de Ant a Maven 3.6+
- **Target Java**: Actualizado a Java 21 LTS
- **Organización**: Repositorio transferido a organización ISCOUTB

### Eliminado
- **build.xml**: Archivo de configuración de Ant removido
- **RationalBESA.iml**: Archivo de proyecto IntelliJ legacy removido
- **nbproject/**: Directorio completo de NetBeans removido
- **Dependencias Ant**: Todas las referencias al sistema de build Ant

### Características Técnicas
- **Maven Profiles**: 
  - `local-dev`: Para desarrollo usando JARs locales del sistema
  - `github-packages`: Para usar dependencias desde GitHub Packages
- **Dependencias**:
  - KernelBESA 3.5.1 (framework base)
- **Plugins Maven**:
  - Compiler Plugin 3.11.0 (Java 21)
  - Source Plugin 3.3.0 (generación de sources JAR)
  - Javadoc Plugin 3.5.0 (documentación API)
- **GitHub Actions**: Build y deploy automático con autenticación GITHUB_TOKEN
- **Artefactos generados**:
  - `rational-besa-3.5.jar` (binario principal)
  - `rational-besa-3.5-sources.jar` (código fuente)
  - `rational-besa-3.5-javadoc.jar` (documentación)

### Componentes Principales
- **RationalAgent**: Clase base para agentes racionales cognitivos
- **RationalState**: Estado cognitivo que mantiene creencias y roles
- **RationalRole**: Definición de roles con comportamientos racionales
- **Mapping System**: Believes, Plans, Tasks para gestión cognitiva
- **Guards Especializados**: InformationFlowGuard, PlanExecutionGuard, etc.
- **Asynchronous Services**: Servicios asíncronos y activación de servicios

### Notas de Compatibilidad
- Compatible con KernelBESA 3.5.1+
- Requiere Java 21 LTS o superior
- Maven 3.6+ requerido para build
- GitHub Packages requiere autenticación para acceso

### Próximas Versiones
- Mejoras en documentación Javadoc
- Optimización de algoritmos de planificación
- Soporte para reasoning distribuido
- Integración con machine learning
- Métricas de rendimiento cognitivo
