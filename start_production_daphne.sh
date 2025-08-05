#!/bin/bash
"""
Script para iniciar VeriHome en modo producción con Daphne
Configuración optimizada para WebSocket y alto rendimiento
"""

echo "🚀 INICIANDO VERIHOME EN MODO PRODUCCIÓN"
echo "======================================="

# Variables de configuración
PORT=${PORT:-8000}
WORKERS=${WORKERS:-4}
HOST=${HOST:-0.0.0.0}
VERBOSITY=${VERBOSITY:-1}

echo "📋 Configuración:"
echo "   Puerto: $PORT"
echo "   Workers: $WORKERS"
echo "   Host: $HOST"
echo "   Verbosity: $VERBOSITY"
echo ""

# Verificar que daphne esté instalado
if ! python -c "import daphne" 2>/dev/null; then
    echo "❌ Daphne no está instalado"
    echo "💡 Instalar con: pip install daphne"
    exit 1
fi

echo "✅ Daphne disponible"

# Verificar configuración de Django
echo "🔍 Verificando configuración de Django..."
python manage.py check --deploy --settings=verihome.settings > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Configuración Django válida"
else
    echo "⚠️  Advertencias en configuración Django"
    echo "🔧 Ejecutando verificación completa..."
    python manage.py check --deploy --settings=verihome.settings
fi

# Recopilar archivos estáticos
echo "📦 Recopilando archivos estáticos..."
python manage.py collectstatic --noinput --clear --settings=verihome.settings

# Aplicar migraciones
echo "🗄️  Aplicando migraciones..."
python manage.py migrate --settings=verihome.settings

# Verificar que Redis esté disponible (opcional)
echo "🔴 Verificando Redis..."
if docker ps --filter "name=verihome-redis" --format "{{.Names}}" | grep -q "verihome-redis"; then
    echo "✅ Redis disponible en Docker"
elif redis-cli ping 2>/dev/null | grep -q "PONG"; then
    echo "✅ Redis disponible localmente"
else
    echo "⚠️  Redis no disponible - usando InMemoryChannelLayer"
fi

echo ""
echo "🚀 INICIANDO SERVIDOR DAPHNE"
echo "============================="

# Comando daphne optimizado para producción
exec daphne \
    --port $PORT \
    --bind $HOST \
    --proxy-headers \
    --access-log /mnt/c/Users/wilso/Desktop/NUEVOS\ PROYECTOS/logs/daphne_access.log \
    --server-name "VeriHome-Production" \
    --verbosity $VERBOSITY \
    verihome.asgi:application

# Notas sobre los parámetros:
# --proxy-headers: Habilita headers de proxy para balanceadores de carga
# --access-log: Log de acceso para monitoreo
# --server-name: Identificador del servidor
# --verbosity: Nivel de detalle en logs (0=silencioso, 1=normal, 2=verbose)