# Script para iniciar el servidor de desarrollo en PowerShell
Write-Host "Iniciando VeriHome Frontend..." -ForegroundColor Green
Write-Host "URL: http://localhost:5173" -ForegroundColor Yellow

# Usar npx para ejecutar vite directamente
npx vite --host --port 5173