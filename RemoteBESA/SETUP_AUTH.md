# Configuración de Autenticación para GitHub Packages

Este documento explica cómo configurar la autenticación para usar RemoteBESA desde GitHub Packages.

## Configuración del settings.xml

Crea o edita el archivo `~/.m2/settings.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<settings xmlns="http://maven.apache.org/SETTINGS/1.0.0"
          xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
          xsi:schemaLocation="http://maven.apache.org/SETTINGS/1.0.0 
          https://maven.apache.org/xsd/settings-1.0.0.xsd">
  
  <servers>
    <server>
      <id>github</id>
      <username>TU_USERNAME</username>
      <password>TU_PERSONAL_ACCESS_TOKEN</password>
    </server>
  </servers>
  
</settings>
```

## Personal Access Token

1. Ve a GitHub → Settings → Developer settings → Personal access tokens
2. Genera un nuevo token con permisos:
   - `read:packages` (para descargar)
   - `write:packages` (para publicar, si aplicable)
3. Usa este token como password en settings.xml

## Configuración del pom.xml

Asegúrate de incluir el repositorio en tu proyecto:

```xml
<repositories>
    <repository>
        <id>github</id>
        <url>https://maven.pkg.github.com/ISCOUTB/*</url>
    </repository>
</repositories>
```

## Uso de la dependencia

```xml
<dependencies>
    <dependency>
        <groupId>io.github.iscoutb</groupId>
        <artifactId>remote-besa</artifactId>
        <version>3.5</version>
    </dependency>
</dependencies>
```

## Verificación

Ejecuta para verificar que puede descargar las dependencias:

```bash
mvn dependency:resolve
```
