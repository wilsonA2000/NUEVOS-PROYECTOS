#!/bin/bash
"""
Script para instalar y configurar Redis usando Docker para VeriHome
Permite tener Redis funcionando sin instalación local
"""

echo "🔴 CONFIGURANDO REDIS CON DOCKER PARA VERIHOME"
echo "=============================================="

# Verificar si Docker está disponible
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado o no está disponible"
    echo "💡 Soluciones:"
    echo "   1. Instalar Docker Desktop"
    echo "   2. En WSL2: Activar integración con Docker Desktop"
    echo "   3. Alternativa: Instalar Redis localmente"
    echo ""
    echo "🔗 Enlaces útiles:"
    echo "   - Docker Desktop: https://docs.docker.com/desktop/"
    echo "   - WSL2 + Docker: https://docs.docker.com/desktop/wsl/"
    exit 1
fi

echo "✅ Docker disponible"

# Verificar si el contenedor ya existe
if docker ps -a --format "table {{.Names}}" | grep -q "verihome-redis"; then
    echo "⚠️  Contenedor 'verihome-redis' ya existe"
    echo "🔄 Deteniendo contenedor existente..."
    docker stop verihome-redis 2>/dev/null
    echo "🗑️  Eliminando contenedor existente..."
    docker rm verihome-redis 2>/dev/null
fi

echo "🚀 Iniciando Redis en Docker..."

# Ejecutar Redis en Docker
docker run -d \
    --name verihome-redis \
    -p 6379:6379 \
    --restart unless-stopped \
    redis:alpine \
    redis-server --appendonly yes

# Verificar que el contenedor esté corriendo
if docker ps --format "table {{.Names}}" | grep -q "verihome-redis"; then
    echo "✅ Redis iniciado exitosamente"
    echo ""
    echo "📊 Estado del contenedor:"
    docker ps --filter "name=verihome-redis" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    # Probar conexión
    echo "🧪 Probando conexión a Redis..."
    sleep 2
    
    if docker exec verihome-redis redis-cli ping | grep -q "PONG"; then
        echo "✅ Redis responde correctamente"
        echo ""
        echo "🎉 REDIS CONFIGURADO EXITOSAMENTE"
        echo "================================"
        echo "🔴 Redis URL: redis://localhost:6379"
        echo "🐳 Contenedor: verihome-redis"
        echo "📁 Datos persistentes: Sí (--appendonly yes)"
        echo "🔄 Auto-restart: Sí (unless-stopped)"
        echo ""
        echo "💡 Comandos útiles:"
        echo "   docker stop verihome-redis     # Detener Redis"
        echo "   docker start verihome-redis    # Iniciar Redis"
        echo "   docker logs verihome-redis     # Ver logs"
        echo "   docker exec -it verihome-redis redis-cli  # Cliente Redis"
        echo ""
        echo "🔧 Ahora reinicia Django para usar Redis:"
        echo "   python manage.py runserver"
        echo ""
        echo "✅ Django Channels ahora usará RedisChannelLayer"
        
    else
        echo "❌ Redis no responde"
        echo "🔧 Verifica los logs: docker logs verihome-redis"
        exit 1
    fi
    
else
    echo "❌ Error al iniciar Redis"
    echo "🔧 Verifica los logs: docker logs verihome-redis"
    exit 1
fi