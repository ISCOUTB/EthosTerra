# BDIBESA

BDIBESA es una extensión del framework BESA que implementa la arquitectura BDI (Belief-Desire-Intention) para agentes cognitivos, proporcionando capacidades avanzadas de razonamiento y toma de decisiones.

## Características

- **Arquitectura BDI**: Implementación completa de Beliefs, Desires, e Intentions
- **Máquina de Decisión**: Sistema avanzado de toma de decisiones DBIDecisionMachine
- **Jerarquía de Deseos**: Gestión estructurada de objetivos mediante pirámides de deseos
- **Evaluación BDI**: Sistema de evaluación de estados y objetivos
- **Recolección de Basura**: Gestión automática de memoria para estructuras BDI
- **Builder Pattern**: Construcción flexible de agentes BDI

## Arquitectura

BDIBESA extiende RationalBESA y KernelBESA con:

- **AgentBDI**: Agente especializado con arquitectura BDI
- **StateBDI**: Estado cognitivo BDI específico
- **GoalBDI**: Definición y gestión de objetivos
- **DesireHierarchyPyramid**: Estructura jerárquica de deseos
- **DBIDecisionMachine**: Máquina de decisión BDI
- **BDIBuilder**: Constructor de agentes BDI

## Requisitos

- Java 21 o superior
- Maven 3.6 o superior
- KernelBESA 3.5.1
- RationalBESA 3.5

## Instalación

### Desde GitHub Packages (Recomendado)

```xml
<dependency>
    <groupId>io.github.iscoutb</groupId>
    <artifactId>bdi-besa</artifactId>
    <version>3.5</version>
</dependency>
```

### Configuración del repositorio

```xml
<repositories>
    <repository>
        <id>github</id>
        <url>https://maven.pkg.github.com/ISCOUTB/*</url>
    </repository>
</repositories>
```

## Uso básico

```java
import BESA.BDI.AgentStructuralModel.Agent.AgentBDI;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.BDI.AgentStructuralModel.GoalBDI;

// Crear agente BDI
public class MyBDIAgent extends AgentBDI {
    
    public MyBDIAgent(String alias, StateBDI state, 
                      DesireHierarchyPyramid pyramid, double evaluationRatio) 
            throws KernelAgentExceptionBESA {
        super(alias, state, pyramid, evaluationRatio);
    }
    
    @Override
    public void setupAgent() {
        // Configuración específica del agente BDI
    }
}
```

## Componentes Principales

### Modelo Estructural del Agente
- **AgentBDI**: Implementación completa de agente BDI
- **StateBDI**: Estado que extiende RationalState con capacidades BDI
- **GoalBDI**: Definición de objetivos con tipos y estructuras
- **BDIMachineParams**: Parámetros de configuración de la máquina BDI

### Máquina de Decisión BDI
- **DesireToIntentionInstantiationGuard**: Conversión de deseos a intenciones
- **IntermediateBehaviorToDesiresMachineGuard**: Comportamientos intermedios
- **EndedTheDesiresMachineGuard**: Finalización de máquina de deseos
- **GarbageCollectionGuard**: Recolección de basura

### Builder Pattern
- **BDIAgentBuilder**: Constructor flexible de agentes BDI
- **BDIBuilderDirector**: Director del patrón builder

### Evaluación y Jerarquías
- **BDIEvaluable**: Interfaz para evaluación de componentes BDI
- **DesireHierarchyPyramid**: Estructura jerárquica de deseos
- **PotencialGoalStructure**: Estructura de objetivos potenciales

## Compilación local

```bash
# Clonar el repositorio
git clone https://github.com/ISCOUTB/BDIBESA.git
cd BDIBESA

# Compilar (requiere RationalBESA compilado)
mvn clean compile package -P local-dev
```

## Licencia

Este proyecto está licenciado bajo la Licencia Apache 2.0.

## Autores

- **ISCOUTB** - Universidad Tecnológica de Bolívar
- **SIDRe** - Pontificia Universidad Javeriana

## Soporte

Para soporte técnico:
- Crea un [issue](https://github.com/ISCOUTB/BDIBESA/issues)
