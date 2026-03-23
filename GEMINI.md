# Documentación de Arquitectura de EthosTerra (wpsSimulator) y BESA

Este documento proporciona una visión general y actualizada de la arquitectura del ecosistema **EthosTerra** (basado en `wpsSimulator`), y su integración subyacente con los módulos del framrework de agentes **BESA**. Está optimizado para servir como contexto arquitectónico para futuros desarrollos.

## 1. Topología del Ecosistema

El proyecto es un simulador social distribuido (`wpsSimulator`), orientado a eventos discretos, alta concurrencia y razonamiento BDI (Belief-Desire-Intention). Todo el ciclo de vida, ejecución y despliegue del proyecto y la interfaz web (`wpsUI`) está fuertemente acoplado a la contenerización mediante **Docker** y orquestación con **Docker Compose**.

### Módulos Principales
- **wpsSimulator**: Controlador principal de la simulación. Define familias campesinas, mercado, autoridades y guardas. Instancia el contenedor `AdmBESA`.
- **KernelBESA**: Núcleo del framework. Maneja el multithreading concurrente, estados internos, colas de eventos locales e inicializa configuraciones (`ConfigBESA`).
- **RemoteBESA**: Capa de abstracción encargada de la distribución del sistema y la intercomunicación de agentes geográficamente separados (entre contenedores Docker).

## 2. Abstracción de Red: RabbitMQ (AMQP)

El componente `RemoteBESA` fue reestructurado enteramente para abandonar el esquema síncrono *Punto-a-Punto* heredado de **Java RMI**. Ahora utiliza de forma nativa Message Brokering vía **RabbitMQ**.

### Características de la Integración (AMQP)
- **Topología en Estrella**: Todos los contenedores de simulación publican y escuchan a través de un único Exchange Directo en RabbitMQ llamado `besa.exchange`.
- **Enrutamiento Inteligente**: Las "Routing Keys" siguen el formato `besa.container.<AliasDelContenedor>` garantizando que los eventos (ej. `sendEvent`) y migraciones (ej. `moveAgent`) aterricen exactamente en la cola asíncrona dedicada de su destinatario.
- **Inyección por Entorno**: El archivo base de `KernelBESA` (`ConfigBESA.java`) fue abstraído de sus configuraciones locales y acoge variables de SO directamente. En producción, el simulador se provee con:
  - `RABBITMQ_HOST` (Fijado a `rabbitmq` en Docker)
  - `RABBITMQ_PORT`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`.

### Patrones de Productor y Consumidor
- **El Productor (`RabbitMQAdmRemoteProxy`)**: Substituye un *RMI Stub*. Cuando un Agente emite un llamado a un contenedor ajeno, el Proxy serializa los argumentos mediante un DTO (`RemoteMessageBESA`) y realiza un *Fire-and-Forget* sobre el Broker AMQP. El hilo de ejecución principal queda instantáneamente libre de trabajo bloqueante en red.
- **El Consumidor (`RabbitMQMessageConsumer`)**: Es un oyente exclusivo (`DefaultConsumer` en Java) anclado a la cola nominal del contenedor en RabbitMQ. Los eventos que extrae son deserializados asíncronamente e invocados localmente sobre `AdmRemoteImpBESA` devolviendo el control al Framework `KernelBESA` como si fueran locales.

## 3. Pruebas Automatizadas y Escalabilidad

En la base del proyecto se provee un subconjunto de orquestación de pruebas en el archivo `docker-compose.test.yml`. Este levanta RabbitMQ simultáneamente junto a tres nodos de simulación (A, B y C), los cuales verifican íntegramente:

1. **Mensajería Estresada**: El framework aguanta ráfagas rápidas de iteraciones mediante *Ping-Pong* entre *Contenedor A* y *Contenedor B*.
2. **Ciclo de vida (Creación/Destrucción)**: Inicialización robusta de agentes de prueba programáticamente (sin XML intrusivo).
3. **Movilidad Asíncrona (Agent Mobility)**: Los agentes pueden serializarse orgánicamente y "saltar" desde un contenedor en un servidor físico / Docker Node hacia otro, rehidratando su estado BDI completo (ej. desde *Contenedor A* hacia *Contenedor C*) utilizando la tubería segura de RabbitMQ.

## 4. Proceso de Construcción y Compilación (Dockerfile)

La infraestructura local asume que todo debe desplegarse en contenedores para respetar las variables de red (RabbitMQ) y el aislamiento de puertos. Para ello, el proyecto utiliza un *Multi-stage Build* altamente optimizado en su `Dockerfile`:

1. **Capa de Caché Maven**: Se copian primero únicamente todos los `pom.xml` y se ejecutan instalaciones superficiales (`mvn install -N`) para resolver el árbol de dependencias local (KernelBESA -> LocalBESA -> RemoteBESA...) y bajar librerías externas de internet vía `go-offline`. Esto ahorra minutos valiosos si no hay cambios en las dependencias.
2. **Compilación Secuencial Estricta**: Al ser un monolito segmentado, `Maven` compila e instala en la caché local `~/.m2` cada submódulo estrictamente en este orden (usando saltos de tests `-DskipTests` y excluyendo Javadocs para velocidad):
   - `KernelBESA` -> `LocalBESA` -> `RemoteBESA` -> `RationalBESA` -> `BDIBESA` -> `eBDIBESA`.
3. **Construcción del Uber-JAR**: El módulo `wpsSimulator` se compila bajo el perfil especial de maven `-P docker`, el cual emplea el `maven-shade-plugin` para integrar a todos los componentes de BESA dentro del target final `wps-simulator-3.6.0.jar`.
4. **Capa de Distribución Pura**: El contenedor de producción transfiere dicho Uber-JAR hacia un stack muy ligero basado en `eclipse-temurin:21-jre-jammy` que también aloja el backend/frontend en Node.js de la interfaz web (wpsUI).

## 5. Directrices como Asistente IA (Puntos a Recordar)

- **Priorizar el entorno Docker**: Las pruebas unitarias/integración en BESA distribuido y asíncrono deben preferir el ecosistema `docker-compose.test.yml`, ya que arrancar JVMs dispersas en Windows localmente carece de orquestación de red directa (por ejemplo enlazar el alias "rabbitmq").
- **PROHIBIDO COMPILAR LOCALMENTE (REGLA ESTRICTA)**: NO ES OPCIONAL compilar fuera de los contenedores Docker. Toda depuración de código, análisis de dependencias (archivos pom.xml) y compilación (`mvn package`) DEBE hacerse obligatoriamente a través de los builds de Docker mediante `docker compose build` o dentro del entorno linux del contenedor.
- **Agentes y Reglas dentro del Simulator**: Siempre que se escriba un nuevo agente de pruebas, lógica asíncrona o comportamiento BDI, es mandatorio instanciarlo primero en el classpath de `wpsSimulator/src/main/java/` (por ejemplo en `org.wpsim.BesaTesting`) para que el `Dockerfile` lo agrupe automáticamente en el `Uber-JAR` sin necesidad de repensar empaques externos en el maven compiler.
- **Limpieza de RMI y Configuración Programática**: BESA está oficialmente modernizado y desacoplado para AMQP. Bajo ninguna circunstancia se debe sugerir el uso de `UnicastRemoteObject`, o la reinstauración de tags `<remote>` o `<server_*.xml>`. Todo uso exterior debe asumir fire-and-forget de *RabbitMQ* y configuración dinámica (*12-Factor App*) mediada por Variables de Entorno en los constructores Builder `ConfigBESA.builder()`.
