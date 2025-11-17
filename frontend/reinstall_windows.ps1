# Script de reinstalación de node_modules para Windows
# Ejecutar desde PowerShell en el directorio frontend

Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host "  REINSTALACIÓN DE NODE_MODULES PARA WINDOWS" -ForegroundColor Cyan
Write-Host "===========================================================" -ForegroundColor Cyan
Write-Host ""

# Paso 1: Eliminar node_modules
Write-Host "Paso 1: Eliminando node_modules (puede tomar 1-2 minutos)..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
    Write-Host "✓ node_modules eliminado" -ForegroundColor Green
} else {
    Write-Host "✓ node_modules no existe (ok)" -ForegroundColor Green
}

# Paso 2: Eliminar package-lock.json
Write-Host "Paso 2: Eliminando package-lock.json..." -ForegroundColor Yellow
if (Test-Path "package-lock.json") {
    Remove-Item -Force package-lock.json
    Write-Host "✓ package-lock.json eliminado" -ForegroundColor Green
} else {
    Write-Host "✓ package-lock.json no existe (ok)" -ForegroundColor Green
}

# Paso 3: Reinstalar dependencias
Write-Host ""
Write-Host "Paso 3: Instalando dependencias (esto tomará 3-5 minutos)..." -ForegroundColor Yellow
Write-Host "Por favor espera..." -ForegroundColor Yellow
Write-Host ""

npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "===========================================================" -ForegroundColor Green
    Write-Host "  ✓ INSTALACIÓN COMPLETADA EXITOSAMENTE" -ForegroundColor Green
    Write-Host "===========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora ejecuta: npm run dev" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "===========================================================" -ForegroundColor Red
    Write-Host "  ✗ ERROR EN LA INSTALACIÓN" -ForegroundColor Red
    Write-Host "===========================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Revisa los errores arriba e intenta manualmente:" -ForegroundColor Yellow
    Write-Host "  1. Remove-Item -Recurse -Force node_modules" -ForegroundColor Yellow
    Write-Host "  2. Remove-Item -Force package-lock.json" -ForegroundColor Yellow
    Write-Host "  3. npm install" -ForegroundColor Yellow
    Write-Host ""
}
