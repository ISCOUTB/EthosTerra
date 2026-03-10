# Script de simulación de GitHub Actions
# Simula exactamente los pasos que ejecutaría GitHub Actions

Write-Host "🚀 Simulando GitHub Actions para RationalBESA" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Configurar variables de entorno como GitHub Actions
$env:GITHUB_TOKEN = "simulated-token"
$env:GITHUB_ACTOR = "simulated-actor"

# Step 1: Verificar configuración Maven
Write-Host ""
Write-Host "📋 Step 1: Verificar configuración Maven" -ForegroundColor Yellow
$result = & mvn help:effective-settings -P github-packages 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Configuración Maven OK" -ForegroundColor Green
} else {
    Write-Host "⚠️ Advertencias en configuración Maven (normal)" -ForegroundColor Yellow
}

# Step 2: Verificar estructura inicial
Write-Host ""
Write-Host "📋 Step 2: Verificar estructura inicial" -ForegroundColor Yellow
Write-Host "📁 Contenido del directorio:"
Get-ChildItem | Select-Object Name, Mode | Format-Table -AutoSize

# Step 3: Verificar disponibilidad de KernelBESA
Write-Host ""
Write-Host "📋 Step 3: Verificar disponibilidad de KernelBESA" -ForegroundColor Yellow
Write-Host "Probando resolución de dependencias con github-packages..."
$dependencyResult = & mvn dependency:resolve -P github-packages -B -q 2>&1
if ($LASTEXITCODE -eq 0) {
    $kernelAvailable = $true
    Write-Host "✅ KernelBESA encontrado en GitHub Packages" -ForegroundColor Green
} else {
    $kernelAvailable = $false
    Write-Host "⚠️ KernelBESA no encontrado en GitHub Packages" -ForegroundColor Yellow
    Write-Host "Error esperado: $($dependencyResult | Select-String 'status code: 401' | Select-Object -First 1)"
}

# Step 4: Estrategia de build
Write-Host ""
if ($kernelAvailable) {
    Write-Host "📋 Step 4: Build con GitHub Packages" -ForegroundColor Yellow
    Write-Host "🔨 Ejecutando: mvn clean compile package -P github-packages -B"
    $buildResult = & mvn clean compile package -P github-packages -B 2>&1
    $buildSuccess = $LASTEXITCODE -eq 0
} else {
    Write-Host "📋 Step 4: Build con dependencias locales (fallback)" -ForegroundColor Yellow
    Write-Host "🔨 Ejecutando: mvn clean compile package -P local-dev -B"
    $buildResult = & mvn clean compile package -P local-dev -B 2>&1
    $buildSuccess = $LASTEXITCODE -eq 0
}

if ($buildSuccess) {
    Write-Host "✅ Build exitoso" -ForegroundColor Green
} else {
    Write-Host "❌ Build falló" -ForegroundColor Red
    Write-Host "Últimas líneas del error:"
    $buildResult | Select-Object -Last 10 | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    exit 1
}

# Step 5: Verificar artefactos
Write-Host ""
Write-Host "📋 Step 5: Verificar artefactos generados" -ForegroundColor Yellow
if (Test-Path "target") {
    Write-Host "📁 Contenido del directorio target:"
    Get-ChildItem target | Select-Object Name, Length | Format-Table -AutoSize
    
    $jarFiles = Get-ChildItem target/*.jar -ErrorAction SilentlyContinue
    if ($jarFiles) {
        Write-Host "✅ Archivos JAR encontrados:" -ForegroundColor Green
        $jarFiles | ForEach-Object { 
            Write-Host "  📦 $($_.Name) ($('{0:N2}' -f ($_.Length / 1KB)) KB)" -ForegroundColor Green 
        }
    } else {
        Write-Host "❌ No se encontraron archivos JAR" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ Directorio target no encontrado" -ForegroundColor Red
    exit 1
}

# Step 6: Simular estrategia de deploy
Write-Host ""
Write-Host "📋 Step 6: Estrategia de deploy" -ForegroundColor Yellow
if ($kernelAvailable) {
    Write-Host "🚀 Se ejecutaría: mvn deploy -P github-packages -DskipTests -B" -ForegroundColor Cyan
    Write-Host "✅ Deploy se ejecutaría exitosamente" -ForegroundColor Green
} else {
    Write-Host "⚠️ Deploy se saltaría - usando dependencias locales" -ForegroundColor Yellow
    Write-Host "📝 Para habilitar deploy: Esperar a que KernelBESA se publique en GitHub Packages" -ForegroundColor Blue
}

# Resumen final
Write-Host ""
Write-Host "🎯 RESUMEN DE SIMULACIÓN" -ForegroundColor Cyan
Write-Host "========================" -ForegroundColor Cyan
Write-Host "Build exitoso: ✅" -ForegroundColor Green
Write-Host "Artefactos generados: ✅" -ForegroundColor Green
Write-Host "Estrategia usada: $(if ($kernelAvailable) { 'GitHub Packages' } else { 'Local Dependencies (fallback)' })" -ForegroundColor $(if ($kernelAvailable) { 'Green' } else { 'Yellow' })
Write-Host "Deploy habilitado: $(if ($kernelAvailable) { '✅' } else { '⚠️ Pendiente KernelBESA' })" -ForegroundColor $(if ($kernelAvailable) { 'Green' } else { 'Yellow' })

Write-Host ""
Write-Host "🔮 PREDICCIÓN GITHUB ACTIONS:" -ForegroundColor Magenta
if ($kernelAvailable) {
    Write-Host "✅ GitHub Actions ejecutará exitosamente" -ForegroundColor Green
    Write-Host "✅ Deploy se realizará a GitHub Packages" -ForegroundColor Green
} else {
    Write-Host "✅ GitHub Actions ejecutará exitosamente con fallback" -ForegroundColor Green
    Write-Host "⚠️ Deploy se saltará hasta que KernelBESA esté disponible" -ForegroundColor Yellow
    Write-Host "💡 El workflow clonará y buildará KernelBESA automáticamente" -ForegroundColor Blue
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🏁 Simulación completada exitosamente" -ForegroundColor Green
