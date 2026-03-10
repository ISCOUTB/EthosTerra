# Script de validación para simular GitHub Actions localmente
# Este script valida la configuración de RationalBESA

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "RationalBESA - Validación de Build" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan

# Funciones para imprimir mensajes con color
function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

# Validar que estamos en el directorio correcto
if (-not (Test-Path "pom.xml") -or -not (Test-Path ".github")) {
    Write-Error "Este script debe ejecutarse desde el directorio raíz de RationalBESA"
    exit 1
}

Write-Info "Validando configuración de Maven..."

# Verificar configuración efectiva de Maven
Write-Host ""
Write-Host "1. Verificando settings efectivos..."
$result = & mvn help:effective-settings -P github-packages -q 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Success "Configuración de Maven válida"
} else {
    Write-Warning "Advertencias en configuración de Maven (esto es normal)"
}

# Probar build local (perfil por defecto)
Write-Host ""
Write-Host "2. Probando build local (perfil local-dev)..."
$result = & mvn clean compile -q 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Success "Build local exitoso"
} else {
    Write-Error "Build local falló"
    exit 1
}

# Probar configuración GitHub Packages (esperamos fallo por autenticación)
Write-Host ""
Write-Host "3. Probando configuración GitHub Packages..."
$githubResult = & mvn clean compile -P github-packages 2>&1 | Out-String
if ($githubResult -like "*status code: 401*") {
    Write-Success "Configuración GitHub Packages correcta (error 401 esperado sin credenciales)"
} else {
    # Verificar si falló por otra razón
    $result = & mvn clean compile -P github-packages -q 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Build con GitHub Packages exitoso (KernelBESA disponible)"
    } else {
        Write-Warning "Error diferente en GitHub Packages (verificar logs)"
    }
}

# Verificar estructura de archivos
Write-Host ""
Write-Host "4. Verificando estructura de archivos..."

$requiredFiles = @(
    ".github/workflows/build.yml",
    ".github/maven-settings.xml",
    "pom.xml",
    "README.md",
    "README-GITHUB-ACTIONS.md"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Success "Archivo encontrado: $file"
    } else {
        Write-Error "Archivo faltante: $file"
    }
}

# Verificar contenido del workflow
Write-Host ""
Write-Host "5. Verificando configuración del workflow..."

$workflowContent = Get-Content ".github/workflows/build.yml" -Raw

if ($workflowContent -like "*cache: maven*") {
    Write-Success "Cache de Maven configurado"
} else {
    Write-Warning "Cache de Maven no encontrado"
}

if ($workflowContent -like "*continue-on-error: true*") {
    Write-Success "Continue-on-error configurado para tests"
} else {
    Write-Warning "Continue-on-error no encontrado"
}

if ($workflowContent -like "*github-packages*") {
    Write-Success "Perfil github-packages configurado en workflow"
} else {
    Write-Error "Perfil github-packages no encontrado en workflow"
}

# Verificar configuración de Maven settings
Write-Host ""
Write-Host "6. Verificando maven-settings.xml..."

$settingsContent = Get-Content ".github/maven-settings.xml" -Raw

if ($settingsContent -like "*github-kernelbesa*") {
    Write-Success "Servidor github-kernelbesa configurado"
} else {
    Write-Error "Servidor github-kernelbesa no encontrado"
}

if ($settingsContent -like "*GITHUB_TOKEN*") {
    Write-Success "Autenticación con GITHUB_TOKEN configurada"
} else {
    Write-Error "GITHUB_TOKEN no configurado"
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Validación completada" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Info "Para desplegar en GitHub Packages:"
Write-Info "1. Asegúrese de que KernelBESA esté publicado primero"
Write-Info "2. Haga push de los cambios a la rama main"
Write-Info "3. GitHub Actions se ejecutará automáticamente"
Write-Host ""
Write-Info "Para desarrollo local, use:"
Write-Info "mvn clean compile package (usa perfil local-dev por defecto)"
