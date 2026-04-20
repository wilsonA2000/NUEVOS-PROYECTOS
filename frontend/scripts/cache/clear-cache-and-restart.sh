#!/bin/bash

echo "🧹 Limpiando cache de Vite y reiniciando..."
echo "============================================"

# Limpiar cache de Vite
echo "1. Limpiando cache de Vite..."
rm -rf node_modules/.vite
rm -rf .vite

# Limpiar cache de navegador (crear timestamp file)
echo "2. Actualizando timestamp para forzar recarga..."
date +%s > .cache-bust-timestamp

echo "3. Instalando dependencias por si acaso..."
npm install

echo "4. Iniciando servidor de desarrollo..."
echo ""
echo "⚠️  IMPORTANTE:"
echo "   1. Abre el navegador en modo incógnito o:"
echo "   2. Presiona Ctrl+Shift+R (o Cmd+Shift+R en Mac) para forzar recarga"
echo "   3. O abre DevTools > Network > Disable cache"
echo ""
echo "🚀 Iniciando servidor en http://localhost:5173"
echo ""

# Iniciar Vite
npm run dev
