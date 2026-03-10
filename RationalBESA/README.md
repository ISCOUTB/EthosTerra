# RationalBESA

RationalBESA es una extensión del framework BESA que proporciona arquitecturas de agentes racionales cognitivos, implementando modelos de planificación, creencias y comportamientos racionales.

## Características

- **Agentes Racionales**: Implementación de arquitecturas de agentes cognitivos
- **Sistema de Creencias**: Gestión de modelos de creencias (Believes)
- **Planificación**: Sistema de planes y tareas con ejecución racional
- **Roles Racionales**: Definición de roles y estados racionales para agentes
- **Servicios Asíncronos**: Soporte para servicios asíncronos y guards especializados

## Arquitectura

RationalBESA extiende KernelBESA con:

- **RationalAgent**: Clase base para agentes racionales
- **RationalState**: Estado cognitivo de agentes racionales
- **RationalRole**: Definición de roles con comportamientos racionales
- **Mapping**: Sistema de mapeo para creencias, planes y tareas
- **Guards**: Guards especializados para flujo de información y ejecución de planes
- **Services**: Servicios asíncronos y activación de servicios

## Requisitos

- Java 21 o superior
- Maven 3.6 o superior
- KernelBESA 3.5.1

## Instalación

### Desde GitHub Packages (Recomendado)

```xml
<dependency>
    <groupId>io.github.iscoutb</groupId>
    <artifactId>rational-besa</artifactId>
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
import rational.RationalAgent;
import rational.RationalState;
import rational.mapping.Believes;

// Crear agente racional
public class MyRationalAgent extends RationalAgent {
    
    public MyRationalAgent(String alias, RationalState state, Believes believes) 
            throws KernelAgentExceptionBESA {
        super(alias, state, believes);
    }
    
    @Override
    public void setupAgent() {
        // Configuración específica del agente
    }
}
```

## Componentes Principales

### RationalAgent
Clase base abstracta que extiende AgentBESA para implementar comportamientos racionales.

### RationalState  
Estado cognitivo que mantiene la información de creencias y roles del agente.

### Mapping System
- **Believes**: Sistema de creencias del agente
- **Plan**: Definición de planes de acción
- **Task**: Tareas específicas ejecutables

### Guards Especializados
- **InformationFlowGuard**: Manejo de flujo de información
- **PlanExecutionGuard**: Ejecución de planes
- **PlanCancelationGuard**: Cancelación de planes
- **ChangeRationalRoleGuard**: Cambio de roles

## Compilación local

```bash
# Clonar el repositorio
git clone https://github.com/ISCOUTB/RationalBESA.git
cd RationalBESA

# Compilar
mvn clean compile package -P local-dev
```

## GitHub Actions y CI/CD

Este proyecto incluye configuración automatizada para GitHub Actions que:

- ✅ **Build automatizado**: Compila el proyecto en cada push/PR
- ✅ **Cache de Maven**: Acelera los builds
- ✅ **Deploy automático**: Publica en GitHub Packages en la rama main
- ✅ **Tests**: Ejecuta tests si están disponibles
- ✅ **Manejo de dependencias**: Estrategia de fallback para dependencias no disponibles

### Configuración de Perfiles

- **`local-dev`** (por defecto): Usa dependencias del sistema local
- **`github-packages`**: Usa dependencias de GitHub Packages

### Scripts de Validación

Ejecuta el script de validación para verificar la configuración:

```powershell
# Windows PowerShell
.\validate-build.ps1

# Bash (Linux/Mac)
./validate-build.sh
```

Para más detalles sobre GitHub Actions, consulta: [README-GITHUB-ACTIONS.md](README-GITHUB-ACTIONS.md)

## Licencia

Este proyecto está licenciado bajo la Licencia Apache 2.0.

## Autores

- **ISCOUTB** - Universidad Tecnológica de Bolívar

## Soporte

Para soporte técnico:
- Crea un [issue](https://github.com/ISCOUTB/RationalBESA/issues)
