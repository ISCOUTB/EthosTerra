# Changelog - BDIBESA

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
- **Estructura de dependencias**: Uso de KernelBESA 3.5.1 y RationalBESA 3.5
- **Sistema de build**: Migración completa de Ant a Maven 3.6+
- **Target Java**: Actualizado a Java 21 LTS
- **Organización**: Repositorio transferido a organización ISCOUTB

### Eliminado
- **build.xml**: Archivo de configuración de Ant removido
- **BDIBESA.iml**: Archivo de proyecto IntelliJ legacy removido
- **nbproject/**: Directorio completo de NetBeans removido
- **Dependencias Ant**: Todas las referencias al sistema de build Ant

### Características Técnicas
- **Maven Profiles**: 
  - `local-dev`: Para desarrollo usando JARs locales del sistema
  - `github-packages`: Para usar dependencias desde GitHub Packages
- **Dependencias**:
  - KernelBESA 3.5.1 (framework base)
  - RationalBESA 3.5 (arquitectura racional base)
- **Plugins Maven**:
  - Compiler Plugin 3.11.0 (Java 21)
  - Source Plugin 3.3.0 (generación de sources JAR)
  - Javadoc Plugin 3.5.0 (documentación API)
- **GitHub Actions**: Build y deploy automático con autenticación GITHUB_TOKEN
- **Artefactos generados**:
  - `bdi-besa-3.5.jar` (binario principal)
  - `bdi-besa-3.5-sources.jar` (código fuente)
  - `bdi-besa-3.5-javadoc.jar` (documentación)

### Arquitectura BDI
- **AgentBDI**: Implementación completa de agente BDI
- **StateBDI**: Estado que extiende RationalState con capacidades BDI
- **GoalBDI**: Definición de objetivos con tipos y estructuras
- **DesireHierarchyPyramid**: Estructura jerárquica de deseos
- **DBIDecisionMachine**: Máquina de decisión BDI avanzada
- **Builder Pattern**: BDIAgentBuilder y BDIBuilderDirector

### Componentes BDI
- **Beliefs**: Sistema de creencias integrado
- **Desires**: Gestión de deseos y objetivos
- **Intentions**: Conversión de deseos a intenciones ejecutables
- **Decision Machine**: Máquina de decisión cognitiva
- **Garbage Collection**: Gestión automática de memoria BDI
- **Evaluation System**: Sistema de evaluación de componentes BDI

### Notas de Compatibilidad
- Compatible con KernelBESA 3.5.1+
- Compatible con RationalBESA 3.5+
- Requiere Java 21 LTS o superior
- Maven 3.6+ requerido para build
- GitHub Packages requiere autenticación para acceso

### Próximas Versiones
- Mejoras en la máquina de decisión BDI
- Optimización de jerarquías de deseos
- Soporte para BDI distribuido
- Integración con sistemas de aprendizaje
- Métricas avanzadas de comportamiento BDI
