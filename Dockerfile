# ============================================================
# Stage 1: Compilar todos los JARs Java (BESA + wpsSimulator)
#           Un solo stage para compartir el repositorio Maven local (~/.m2)
# ============================================================
FROM eclipse-temurin:21-jdk-jammy AS java-build

RUN apt-get update && apt-get install -y --no-install-recommends maven && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# ---- CAPA DE CACHÉ MAVEN: copiar sólo los pom.xml primero ----
# Si el código fuente cambia pero no las dependencias, Docker reutiliza
# esta capa y se ahorran ~3-5 min de descarga de artefactos por rebuild.
COPY KernelBESA/pom.xml    ./KernelBESA/pom.xml
COPY LocalBESA/pom.xml     ./LocalBESA/pom.xml
COPY RemoteBESA/pom.xml    ./RemoteBESA/pom.xml
COPY RationalBESA/pom.xml  ./RationalBESA/pom.xml
COPY BDIBESA/pom.xml       ./BDIBESA/pom.xml
COPY eBDIBESA/pom.xml      ./eBDIBESA/pom.xml
COPY wpsSimulator/pom.xml  ./wpsSimulator/pom.xml

# Instalar sólo los POMs en ~/.m2 (establece cadena de deps locales)
# y pre-descargar todas las deps externas del simulador final.
RUN cd KernelBESA   && mvn install -N -q -DskipTests \
    && cd ../LocalBESA    && mvn install -N -q -DskipTests \
    && cd ../RemoteBESA   && mvn install -N -q -DskipTests \
    && cd ../RationalBESA && mvn install -N -q -DskipTests \
    && cd ../BDIBESA      && mvn install -N -q -DskipTests \
    && cd ../eBDIBESA     && mvn install -N -q -DskipTests \
    && cd ../wpsSimulator && mvn dependency:go-offline -q -P docker \
    && find /root/.m2/repository/io/github/iscoutb -name "*.jar" -delete 2>/dev/null || true

# ---- Copiar fuentes completas de todos los repos ----
COPY KernelBESA/    ./KernelBESA/
COPY LocalBESA/     ./LocalBESA/
COPY RemoteBESA/    ./RemoteBESA/
COPY RationalBESA/  ./RationalBESA/
COPY BDIBESA/       ./BDIBESA/
COPY eBDIBESA/      ./eBDIBESA/
COPY wpsSimulator/  ./wpsSimulator/

# ---- Compilar e instalar cada módulo BESA en ~/.m2 (orden de dependencias) ----
RUN cd KernelBESA   && mvn install -q -DskipTests -Dmaven.javadoc.skip=true -Dmaven.source.skip=true
RUN cd LocalBESA    && mvn install -q -DskipTests -Dmaven.javadoc.skip=true -Dmaven.source.skip=true
RUN cd RemoteBESA   && mvn install -DskipTests -Dmaven.javadoc.skip=true -Dmaven.source.skip=true
RUN cd RationalBESA && mvn install -q -DskipTests -Dmaven.javadoc.skip=true -Dmaven.source.skip=true
RUN cd BDIBESA      && mvn install -q -DskipTests -Dmaven.javadoc.skip=true -Dmaven.source.skip=true
RUN cd eBDIBESA     && mvn install -q -DskipTests -Dmaven.javadoc.skip=true -Dmaven.source.skip=true

# ---- Compilar wpsSimulator con perfil "docker" ----
# El perfil "docker" usa deps BESA con scope=compile (no system)
# para que maven-shade-plugin las incluya en el uber-JAR
RUN cd wpsSimulator && mvn package -q -DskipTests \
    -Dmaven.javadoc.skip=true -Dmaven.source.skip=true \
    -P docker

# Verificar que el JAR tiene manifest correcto y contiene clases BESA
RUN jar tf /build/wpsSimulator/target/wps-simulator-3.6.0.jar | head -5 && \
    jar xf /build/wpsSimulator/target/wps-simulator-3.6.0.jar META-INF/MANIFEST.MF && \
    cat META-INF/MANIFEST.MF && \
    jar tf /build/wpsSimulator/target/wps-simulator-3.6.0.jar | grep -c "BESA/" && \
    echo "=== JAR verification passed ==="

# ============================================================
# Stage 2: Aplicación web (Next.js + JRE 21)
#           Base: eclipse-temurin ya incluye JRE 21 → instalamos Node.js encima
# ============================================================
FROM eclipse-temurin:21-jre-jammy AS webapp

# Instalar wget (para healthcheck) y limpiar cache apt
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*

# Instalar Node.js 20 desde imagen oficial (más seguro que curl | bash)
COPY --from=node:20-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:20-slim /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
    && node --version && npm --version && npx --version

# Crear usuario no-root para eliminar privilegios de root en producción
RUN groupadd -r wpsuser && useradd -r -g wpsuser -d /app -s /sbin/nologin wpsuser

WORKDIR /app

# ---- Copiar el uber-JAR generado por maven-shade-plugin ----
# Este JAR incluye: Main-Class en manifest + todas las deps BESA + deps externas
COPY --from=java-build \
    /build/wpsSimulator/target/wps-simulator-3.6.0.jar \
    /app/wps-simulator.jar

# ---- Copiar fuentes wpsUI ----
COPY wpsUI/package.json wpsUI/tsconfig.json wpsUI/next.config.mjs wpsUI/tailwind.config.ts wpsUI/postcss.config.mjs ./
COPY wpsUI/src/ ./src/
COPY wpsUI/public/ ./public/

# Crear directorio de logs del simulador
RUN mkdir -p /app/src/wps/logs

# Symlink: Java escribe a "logs/" (relativo a CWD=/app) → /app/logs → /app/src/wps/logs
# Así el CSV queda en /app/src/wps/logs/wpsSimulator.csv donde la API lo espera
RUN ln -s /app/src/wps/logs /app/logs

# Eliminar dependencias dummy "file:" que causan error en npm install
RUN npm pkg delete dependencies.wellprodsim dependencies.WellProdSim 2>/dev/null; true

# Instalar dependencias de producción (--ignore-scripts evita postinstall de electron)
RUN npm install --ignore-scripts --no-optional

# Compilar Next.js (output: 'standalone' configurado en next.config.mjs)
RUN npx next build

# Copiar archivos estáticos al directorio standalone (requerido por Next.js)
RUN cp -r /app/public /app/.next/standalone/public && \
    cp -r /app/.next/static /app/.next/standalone/.next/static

# Copiar el JAR al standalone para que WPS_JAR_PATH=/app/wps-simulator.jar siga válido
RUN cp /app/wps-simulator.jar /app/.next/standalone/wps-simulator.jar

# Transferir propiedad al usuario no-root sólo en los directorios necesarios:
# - .next/   → Next.js necesita leer los artefactos compilados
# - src/      → la API escribe el CSV de resultados en src/wps/logs/
# - logs      → symlink a src/wps/logs
# NO chowneamos node_modules (sólo-lectura en runtime) → ahorra ~7 min de build
RUN chown -R wpsuser:wpsuser /app/.next /app/src /app/logs /app/wps-simulator.jar

USER wpsuser

EXPOSE 3000
# WebSocket server de Java (Undertow) - ViewerLens/Server/WebsocketServer.java
EXPOSE 8000

# Next.js standalone escucha en la interfaz definida por HOSTNAME.
# 0.0.0.0 → todas las interfaces (requerido para el healthcheck con wget/curl).
# Las variables de entorno de negocio se gestionan vía docker-compose.yml / env_file
ENV HOSTNAME=0.0.0.0

CMD ["node", ".next/standalone/server.js"]

# ============================================================
# Stage 3: Headless — solo runtime Java, sin UI ni Node.js
#           Usado por docker-compose.exp-*.yml
#           Build: docker compose -f docker-compose.exp-*.yml build
# ============================================================
FROM eclipse-temurin:21-jre-jammy AS javaonly

WORKDIR /app
COPY --from=java-build \
    /build/wpsSimulator/target/wps-simulator-3.6.0.jar \
    /app/wps-simulator.jar
RUN mkdir -p /app/logs
ENTRYPOINT ["java", "-jar", "/app/wps-simulator.jar"]
