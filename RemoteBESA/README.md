# RemoteBESA

RemoteBESA es la extensión distribuida del framework BESA (Behavioral Smart Agent) que proporciona capacidades para la creación y gestión de sistemas multi-agente distribuidos.

## Características

- **Comunicación distribuida**: Soporte para agentes distribuidos a través de la red
- **Balanceador de carga**: Sistema de balanceamiento para distribución óptima de agentes
- **Directorio remoto**: Gestión de agentes distribuidos en múltiples contenedores
- **Protocolo de red**: Implementación robusta para comunicación entre nodos
- **Tolerancia a fallos**: Mecanismos de recuperación y detección de fallos

## Arquitectura

RemoteBESA extiende las capacidades de LocalBESA añadiendo:

- **RemoteAdmBESA**: Administrador de agentes distribuidos
- **DistributedInitBESA**: Inicialización de sistemas distribuidos
- **SocketServer/SocketServerThread**: Manejo de conexiones de red
- **Balancer**: Sistema de balanceamiento de carga
- **Directory remoto**: Gestión de directorios distribuidos

## Requisitos

- Java 21 o superior
- Maven 3.6 o superior
- KernelBESA 3.5.1
- LocalBESA 3.5

## Instalación

### Desde GitHub Packages (Recomendado)

```xml
<dependency>
    <groupId>io.github.iscoutb</groupId>
    <artifactId>remote-besa</artifactId>
    <version>3.5</version>
</dependency>
```

### Configuración del repositorio

Agrega el repositorio de GitHub Packages a tu `pom.xml`:

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
import BESA.Remote.DistributedInitBESA;
import BESA.Remote.RemoteAdmBESA;

// Inicializar sistema distribuido
DistributedInitBESA.initDistributedBESA();

// Crear administrador remoto
RemoteAdmBESA remoteAdm = new RemoteAdmBESA();
```

## Compilación local

```bash
# Clonar el repositorio
git clone https://github.com/ISCOUTB/RemoteBESA.git
cd RemoteBESA

# Compilar (requiere KernelBESA y LocalBESA compilados localmente)
mvn clean compile package

# Compilar usando GitHub Packages
mvn clean compile package -P github-packages
```

## Documentación

La documentación completa está disponible en:
- [JavaDoc](docs/javadoc/)
- [Wiki del proyecto](https://github.com/ISCOUTB/RemoteBESA/wiki)

## Dependencias

RemoteBESA depende de:

- **KernelBESA**: Framework base de agentes
- **LocalBESA**: Extensión local de BESA
- **Java RMI**: Para comunicación remota
- **Java Sockets**: Para comunicación de red

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crea un Pull Request

## Licencia

Este proyecto está licenciado bajo la Licencia Apache 2.0 - ver el archivo [LICENSE](LICENSE) para más detalles.

## Autores

- **ISCOUTB** - Universidad Tecnológica de Bolívar

## Soporte

Para soporte técnico o preguntas:
- Crea un [issue](https://github.com/ISCOUTB/RemoteBESA/issues)
- Contacta al equipo de desarrollo

## Roadmap

- [ ] Mejora en el sistema de balanceamiento
- [ ] Optimización de protocolos de red
- [ ] Soporte para contenedores Docker
- [ ] Integración con Kubernetes
- [ ] Métricas y monitoreo distribuido
