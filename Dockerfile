# ============================================================
# Stage 1: Compilar todos los JARs Java (BESA + wpsSimulator)
#           Un solo stage para compartir el repositorio Maven local (~/.m2)
# ============================================================
FROM eclipse-temurin:21-jdk-jammy AS java-build

RUN apt-get update && apt-get install -y --no-install-recommends maven && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# ---- Copiar fuentes de todos los repos ----
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
RUN cd RemoteBESA   && mvn install -q -DskipTests -Dmaven.javadoc.skip=true -Dmaven.source.skip=true
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

# Instalar Node.js 20 LTS (desde nodesource)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

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

# Compilar Next.js
RUN npx next build

EXPOSE 3000

# Variables de entorno para las API routes
ENV WPS_JAR_PATH=/app/wps-simulator.jar
ENV WPS_LOGS_PATH=/app/src/wps/logs
ENV NODE_ENV=production

CMD ["npx", "next", "start", "-p", "3000"]
