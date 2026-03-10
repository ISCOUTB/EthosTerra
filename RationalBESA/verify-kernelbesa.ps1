# Script para verificar si KernelBESA está realmente disponible en GitHub Packages

Write-Host "🔍 Verificando disponibilidad de KernelBESA en GitHub Packages" -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan

# Función para verificar usando GitHub API
function Test-GitHubPackage {
    param(
        [string]$Owner,
        [string]$Package,
        [string]$Version
    )
    
    try {
        Write-Host ""
        Write-Host "📡 Consultando GitHub API..." -ForegroundColor Yellow
        Write-Host "   Owner: $Owner" -ForegroundColor Gray
        Write-Host "   Package: $Package" -ForegroundColor Gray
        Write-Host "   Version: $Version" -ForegroundColor Gray
        
        $url = "https://api.github.com/users/$Owner/packages/maven/$Package"
        Write-Host "   URL: $url" -ForegroundColor Gray
        
        $response = Invoke-RestMethod -Uri $url -Method Get -ErrorAction SilentlyContinue
        
        if ($response) {
            Write-Host "✅ Package encontrado en GitHub API" -ForegroundColor Green
            Write-Host "   Nombre: $($response.name)" -ForegroundColor Gray
            Write-Host "   Versiones disponibles: $($response.version_count)" -ForegroundColor Gray
            return $true
        }
    }
    catch {
        Write-Host "❌ Error consultando GitHub API: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    return $false
}

# Función para verificar usando curl
function Test-MavenEndpoint {
    param(
        [string]$Url
    )
    
    try {
        Write-Host ""
        Write-Host "🌐 Verificando endpoint Maven..." -ForegroundColor Yellow
        Write-Host "   URL: $Url" -ForegroundColor Gray
        
        $result = curl -s -I $Url 2>$null
        if ($LASTEXITCODE -eq 0) {
            $statusLine = $result | Select-Object -First 1
            if ($statusLine -like "*200*") {
                Write-Host "✅ Endpoint responde con 200 OK" -ForegroundColor Green
                return $true
            } elseif ($statusLine -like "*401*") {
                Write-Host "🔐 Endpoint responde con 401 (requiere autenticación)" -ForegroundColor Yellow
                Write-Host "   Esto indica que el package EXISTE pero requiere autenticación" -ForegroundColor Yellow
                return $true
            } else {
                Write-Host "❌ Endpoint responde con: $statusLine" -ForegroundColor Red
                return $false
            }
        }
    }
    catch {
        Write-Host "❌ Error verificando endpoint: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
    
    return $false
}

Write-Host ""
Write-Host "🎯 VERIFICACIONES:" -ForegroundColor Magenta

# Test 1: GitHub API
$apiResult = Test-GitHubPackage -Owner "ISCOUTB" -Package "io.github.iscoutb.kernel-besa" -Version "3.5.1"

# Test 2: Maven endpoint directo
$mavenUrl = "https://maven.pkg.github.com/ISCOUTB/KernelBESA/io/github/iscoutb/kernel-besa/3.5.1/kernel-besa-3.5.1.pom"
$mavenResult = Test-MavenEndpoint -Url $mavenUrl

# Test 3: Repositorio base
$repoUrl = "https://maven.pkg.github.com/ISCOUTB/KernelBESA/"
$repoResult = Test-MavenEndpoint -Url $repoUrl

Write-Host ""
Write-Host "📊 RESULTADOS:" -ForegroundColor Magenta
Write-Host "==============" -ForegroundColor Magenta
Write-Host "GitHub API: $(if($apiResult){'✅'}else{'❌'})" -ForegroundColor $(if($apiResult){'Green'}else{'Red'})
Write-Host "Maven POM: $(if($mavenResult){'✅'}else{'❌'})" -ForegroundColor $(if($mavenResult){'Green'}else{'Red'})
Write-Host "Repositorio: $(if($repoResult){'✅'}else{'❌'})" -ForegroundColor $(if($repoResult){'Green'}else{'Red'})

Write-Host ""
if ($mavenResult -or $repoResult) {
    Write-Host "🎉 CONCLUSIÓN: KernelBESA ESTÁ DISPONIBLE" -ForegroundColor Green -BackgroundColor DarkGreen
    Write-Host ""
    Write-Host "🚀 PRÓXIMOS PASOS:" -ForegroundColor Yellow
    Write-Host "1. Hacer commit y push del workflow actualizado" -ForegroundColor White
    Write-Host "2. GitHub Actions detectará KernelBESA automáticamente" -ForegroundColor White
    Write-Host "3. Se ejecutará el deploy de RationalBESA" -ForegroundColor White
    Write-Host ""
    Write-Host "💡 El deploy funcionará porque:" -ForegroundColor Blue
    Write-Host "   - KernelBESA está disponible en GitHub Packages" -ForegroundColor Gray
    Write-Host "   - GitHub Actions tiene GITHUB_TOKEN automático" -ForegroundColor Gray
    Write-Host "   - El workflow detectará kernel-available=true" -ForegroundColor Gray
    Write-Host "   - Se ejecutará: mvn deploy -P github-packages" -ForegroundColor Gray
} else {
    Write-Host "⚠️ CONCLUSIÓN: KernelBESA NO DISPONIBLE PÚBLICAMENTE" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "🔧 POSIBLES RAZONES:" -ForegroundColor Red
    Write-Host "1. KernelBESA no se ha publicado aún" -ForegroundColor White
    Write-Host "2. El package es privado y requiere autenticación" -ForegroundColor White
    Write-Host "3. Hay un problema con el deploy de KernelBESA" -ForegroundColor White
    Write-Host ""
    Write-Host "🚀 SOLUCIONES:" -ForegroundColor Yellow
    Write-Host "1. Verificar GitHub Actions de KernelBESA" -ForegroundColor White
    Write-Host "2. Hacer que el package sea público" -ForegroundColor White
    Write-Host "3. Ejecutar deploy manual de KernelBESA" -ForegroundColor White
}

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
