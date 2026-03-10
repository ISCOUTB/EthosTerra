# 🔍 Verificador de Deploy de GitHub Packages
# Script para monitorear el progreso del deploy de RationalBESA

Write-Host "🚀 Verificando deploy de RationalBESA en GitHub Packages" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Función para verificar si el paquete está disponible
function Test-GitHubPackage {
    param(
        [string]$GroupId = "io.github.iscoutb",
        [string]$ArtifactId = "rational-besa", 
        [string]$Version = "3.5"
    )
    
    Write-Host "📦 Verificando disponibilidad del paquete..." -ForegroundColor Yellow
    Write-Host "   GroupId: $GroupId" -ForegroundColor Gray
    Write-Host "   ArtifactId: $ArtifactId" -ForegroundColor Gray  
    Write-Host "   Version: $Version" -ForegroundColor Gray
    Write-Host ""
    
    try {
        # Intentar resolver la dependencia
        $result = & mvn dependency:get -Dartifact="$GroupId`:$ArtifactId`:$Version" -B -q 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ ¡PAQUETE ENCONTRADO!" -ForegroundColor Green
            Write-Host "   RationalBESA 3.5 está disponible en GitHub Packages" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⏳ Paquete aún no disponible" -ForegroundColor Yellow
            Write-Host "   Esto es normal si el deploy está en progreso..." -ForegroundColor Gray
            return $false
        }
    } catch {
        Write-Host "⏳ Paquete aún no disponible" -ForegroundColor Yellow
        return $false
    }
}

# Función para verificar el estado de GitHub Actions
function Show-GitHubActionsInfo {
    Write-Host "🔗 Enlaces útiles para monitoreo:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "   📊 GitHub Actions:" -ForegroundColor White
    Write-Host "      https://github.com/ISCOUTB/RationalBESA/actions" -ForegroundColor Blue
    Write-Host ""
    Write-Host "   📦 GitHub Packages:" -ForegroundColor White  
    Write-Host "      https://github.com/ISCOUTB/RationalBESA/packages" -ForegroundColor Blue
    Write-Host ""
    Write-Host "   🔍 Último commit:" -ForegroundColor White
    try {
        $lastCommit = git log --oneline -1
        Write-Host "      $lastCommit" -ForegroundColor Gray
    } catch {
        Write-Host "      No disponible" -ForegroundColor Gray
    }
    Write-Host ""
}

# Función principal de monitoreo
function Start-DeployMonitoring {
    $maxAttempts = 12  # 12 intentos = 6 minutos con intervalos de 30s
    $attempt = 0
    $interval = 30  # segundos
    
    Show-GitHubActionsInfo
    
    Write-Host "🕐 Iniciando monitoreo del deploy..." -ForegroundColor Cyan
    Write-Host "   (Verificando cada $interval segundos por máximo $($maxAttempts * $interval / 60) minutos)" -ForegroundColor Gray
    Write-Host ""
    
    while ($attempt -lt $maxAttempts) {
        $attempt++
        
        Write-Host "🔄 Intento $attempt/$maxAttempts..." -ForegroundColor Yellow
        
        if (Test-GitHubPackage) {
            Write-Host ""
            Write-Host "🎉 ¡DEPLOY COMPLETADO EXITOSAMENTE!" -ForegroundColor Green
            Write-Host ""
            Write-Host "📝 Para usar RationalBESA en tus proyectos:" -ForegroundColor Cyan
            Write-Host @"
<dependency>
    <groupId>io.github.iscoutb</groupId>
    <artifactId>rational-besa</artifactId>
    <version>3.5</version>
</dependency>
"@ -ForegroundColor White
            Write-Host ""
            return $true
        }
        
        if ($attempt -lt $maxAttempts) {
            Write-Host "   ⏳ Esperando $interval segundos antes del siguiente intento..." -ForegroundColor Gray
            Start-Sleep -Seconds $interval
            Write-Host ""
        }
    }
    
    Write-Host "⚠️ Tiempo de espera agotado" -ForegroundColor Yellow
    Write-Host "   El deploy puede tomar más tiempo del esperado." -ForegroundColor Gray
    Write-Host "   Verifica manualmente en GitHub Actions:" -ForegroundColor Gray
    Write-Host "   https://github.com/ISCOUTB/RationalBESA/actions" -ForegroundColor Blue
    Write-Host ""
    return $false
}

# Verificación inicial
Write-Host "📋 Verificación inicial..." -ForegroundColor Cyan

# Verificar si ya está disponible
if (Test-GitHubPackage) {
    Write-Host ""
    Write-Host "✅ RationalBESA ya está disponible en GitHub Packages" -ForegroundColor Green
    exit 0
}

Write-Host ""
Write-Host "🚀 El paquete aún no está disponible. Iniciando monitoreo..." -ForegroundColor Yellow
Write-Host ""

# Iniciar monitoreo
Start-DeployMonitoring
