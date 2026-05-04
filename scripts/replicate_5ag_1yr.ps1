# Script para replicar la prueba de 5 agentes y 1 año
# Uso: .\scripts\replicate_5ag_1yr.ps1

Write-Host "Iniciando replicación de prueba: 5 agentes, 1 año..." -ForegroundColor Cyan

# 1. Construir la imagen
Write-Host "Construyendo imagen de simulación..." -ForegroundColor Yellow
docker compose build simulation

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error al construir la imagen. Asegúrate de que Docker está corriendo." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 2. Levantar infraestructura
Write-Host "Levantando infraestructura (Redis, Postgres, RabbitMQ)..." -ForegroundColor Yellow
docker compose up -d redis postgres rabbitmq

# 3. Crear directorio de logs con timestamp
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$runLogDir = "data/logs/runs/$timestamp"
New-Item -Path $runLogDir -ItemType Directory -Force | Out-Null
Write-Host "Logs de esta corrida: $runLogDir" -ForegroundColor Cyan

# 4. Ejecutar simulación montando el nuevo directorio
Write-Host "Ejecutando simulación..." -ForegroundColor Yellow
docker compose run -v "${PWD}/${runLogDir}:/app/logs" simulation -agents 5 -years 1 -mode single -land 12 -world 400

if ($LASTEXITCODE -ne 0) {
    Write-Host "La simulación falló." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "Simulación completada exitosamente." -ForegroundColor Green
Write-Host "Resultados disponibles en: $runLogDir/wpsSimulator.csv" -ForegroundColor Cyan

Write-Host "`nResumen de logs (últimas 20 líneas):" -ForegroundColor Yellow
Get-Content -Path "$runLogDir/wpsSimulator.log" -Tail 20

