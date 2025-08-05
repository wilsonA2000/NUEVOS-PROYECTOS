@echo off
echo Limpiando dependencias del frontend...
echo.

echo [1/3] Eliminando node_modules...
rmdir /s /q node_modules 2>nul

echo [2/3] Eliminando package-lock.json...
del /f /q package-lock.json 2>nul

echo [3/3] Instalando dependencias...
npm install

echo.
echo Instalacion completada. Ahora puedes ejecutar:
echo npm run dev
echo.
pause