#!/bin/bash

# Script de validación para simular GitHub Actions localmente
# Este script valida la configuración de RationalBESA

echo "==================================="
echo "RationalBESA - Validación de Build"
echo "==================================="

# Función para imprimir mensajes con color
print_success() {
    echo "✅ $1"
}

print_warning() {
    echo "⚠️  $1"
}

print_error() {
    echo "❌ $1"
}

print_info() {
    echo "ℹ️  $1"
}

# Validar que estamos en el directorio correcto
if [ ! -f "pom.xml" ] || [ ! -d ".github" ]; then
    print_error "Este script debe ejecutarse desde el directorio raíz de RationalBESA"
    exit 1
fi

print_info "Validando configuración de Maven..."

# Verificar configuración efectiva de Maven
echo ""
echo "1. Verificando settings efectivos..."
mvn help:effective-settings -P github-packages -q > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Configuración de Maven válida"
else
    print_warning "Advertencias en configuración de Maven (esto es normal)"
fi

# Probar build local (perfil por defecto)
echo ""
echo "2. Probando build local (perfil local-dev)..."
mvn clean compile -q > /dev/null 2>&1
if [ $? -eq 0 ]; then
    print_success "Build local exitoso"
else
    print_error "Build local falló"
    exit 1
fi

# Probar configuración GitHub Packages (esperamos fallo por autenticación)
echo ""
echo "3. Probando configuración GitHub Packages..."
mvn clean compile -P github-packages 2>&1 | grep -q "status code: 401"
if [ $? -eq 0 ]; then
    print_success "Configuración GitHub Packages correcta (error 401 esperado sin credenciales)"
else
    # Verificar si falló por otra razón
    mvn clean compile -P github-packages -q > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        print_success "Build con GitHub Packages exitoso (KernelBESA disponible)"
    else
        print_warning "Error diferente en GitHub Packages (verificar logs)"
    fi
fi

# Verificar estructura de archivos
echo ""
echo "4. Verificando estructura de archivos..."

required_files=(
    ".github/workflows/build.yml"
    ".github/maven-settings.xml"
    "pom.xml"
    "README.md"
    "README-GITHUB-ACTIONS.md"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        print_success "Archivo encontrado: $file"
    else
        print_error "Archivo faltante: $file"
    fi
done

# Verificar contenido del workflow
echo ""
echo "5. Verificando configuración del workflow..."

if grep -q "cache: maven" .github/workflows/build.yml; then
    print_success "Cache de Maven configurado"
else
    print_warning "Cache de Maven no encontrado"
fi

if grep -q "continue-on-error: true" .github/workflows/build.yml; then
    print_success "Continue-on-error configurado para tests"
else
    print_warning "Continue-on-error no encontrado"
fi

if grep -q "github-packages" .github/workflows/build.yml; then
    print_success "Perfil github-packages configurado en workflow"
else
    print_error "Perfil github-packages no encontrado en workflow"
fi

# Verificar configuración de Maven settings
echo ""
echo "6. Verificando maven-settings.xml..."

if grep -q "github-kernelbesa" .github/maven-settings.xml; then
    print_success "Servidor github-kernelbesa configurado"
else
    print_error "Servidor github-kernelbesa no encontrado"
fi

if grep -q "GITHUB_TOKEN" .github/maven-settings.xml; then
    print_success "Autenticación con GITHUB_TOKEN configurada"
else
    print_error "GITHUB_TOKEN no configurado"
fi

echo ""
echo "==================================="
echo "Validación completada"
echo "==================================="
echo ""
print_info "Para desplegar en GitHub Packages:"
print_info "1. Asegúrese de que KernelBESA esté publicado primero"
print_info "2. Haga push de los cambios a la rama main"
print_info "3. GitHub Actions se ejecutará automáticamente"
echo ""
print_info "Para desarrollo local, use:"
print_info "mvn clean compile package (usa perfil local-dev por defecto)"
