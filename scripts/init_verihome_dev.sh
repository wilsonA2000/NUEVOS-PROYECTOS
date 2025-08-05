#!/bin/bash
# =============================================================================
# VERIHOME - SCRIPT DE INICIALIZACION PARA DESARROLLO
# =============================================================================
# Configurado por Agent D para inicialización completa del entorno
# Uso: ./scripts/init_verihome_dev.sh

set -e  # Exit on any error

echo "🚀 Iniciando configuración completa de VeriHome para desarrollo..."
echo ""

# =============================================================================
# VERIFICACIONES PREVIAS
# =============================================================================
echo "📋 Verificando requisitos previos..."

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker no está instalado. Por favor instala Docker Desktop."
    exit 1
fi

# Verificar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose no está instalado."
    exit 1
fi

# Verificar que Docker esté corriendo
if ! docker info &> /dev/null; then
    echo "❌ Docker no está corriendo. Por favor inicia Docker Desktop."
    exit 1
fi

echo "✅ Docker y Docker Compose están disponibles"

# =============================================================================
# LIMPIEZA PREVIA (OPCIONAL)
# =============================================================================
echo ""
echo "🧹 Limpiando contenedores e imágenes previas (si existen)..."
docker-compose down --remove-orphans --volumes 2>/dev/null || true
docker system prune -f --volumes 2>/dev/null || true

# =============================================================================
# CONSTRUCCION E INICIO DE SERVICIOS
# =============================================================================
echo ""
echo "🔨 Construyendo imágenes Docker..."
docker-compose build --no-cache

echo ""
echo "🚢 Iniciando servicios de base de datos y cache..."
docker-compose up -d db redis

echo ""
echo "⏳ Esperando a que PostgreSQL esté listo..."
for i in {1..30}; do
    if docker-compose exec -T db pg_isready -U postgres -d verihome &> /dev/null; then
        echo "✅ PostgreSQL está listo"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL no respondió después de 30 intentos"
        exit 1
    fi
    echo "Intento $i/30..."
    sleep 2
done

echo ""
echo "⏳ Esperando a que Redis esté listo..."
for i in {1..15}; do
    if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
        echo "✅ Redis está listo"
        break
    fi
    if [ $i -eq 15 ]; then
        echo "❌ Redis no respondió después de 15 intentos"
        exit 1
    fi
    echo "Intento $i/15..."
    sleep 1
done

# =============================================================================
# INICIO DE SERVICIOS PRINCIPALES
# =============================================================================
echo ""
echo "🌐 Iniciando servicios principales..."
docker-compose up -d web celery-worker celery-beat

echo ""
echo "⏳ Esperando a que Django esté listo..."
for i in {1..60}; do
    if curl -f http://localhost:8000/api/v1/health/ &> /dev/null; then
        echo "✅ Django está respondiendo"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "❌ Django no respondió después de 60 intentos"
        echo "📋 Revisar logs con: docker-compose logs web"
        exit 1
    fi
    echo "Intento $i/60..."
    sleep 3
done

# =============================================================================
# SERVICIOS ADICIONALES
# =============================================================================
echo ""
echo "🔧 Iniciando servicios adicionales..."
docker-compose up -d flower nginx pgadmin

# =============================================================================
# CONFIGURACION INICIAL DE DATOS
# =============================================================================
echo ""
echo "📊 Configurando datos iniciales..."

# Crear superusuario si no existe
echo "👤 Creando superusuario..."
docker-compose exec -T web python manage.py create_superuser_if_not_exists

# Ejecutar migraciones adicionales si hay pendientes
echo "🔄 Verificando migraciones..."
docker-compose exec -T web python manage.py migrate

# Recopilar archivos estáticos
echo "📁 Recopilando archivos estáticos..."
docker-compose exec -T web python manage.py collectstatic --noinput

# =============================================================================
# VERIFICACION FINAL
# =============================================================================
echo ""
echo "🔍 Verificando estado de todos los servicios..."

services=("web" "db" "redis" "celery-worker" "celery-beat" "flower" "nginx" "pgadmin")
failed_services=()

for service in "${services[@]}"; do
    if docker-compose ps $service | grep -q "Up"; then
        echo "✅ $service está funcionando"
    else
        echo "❌ $service tiene problemas"
        failed_services+=($service)
    fi
done

# =============================================================================
# REPORTE FINAL
# =============================================================================
echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "==============================================================================="
echo "                           VERIHOME - ACCESO A SERVICIOS"
echo "==============================================================================="
echo ""
echo "🌐 APLICACIÓN PRINCIPAL:"
echo "   - Frontend + Backend: http://localhost"
echo "   - API Django: http://localhost:8000"
echo "   - Documentación API: http://localhost:8000/api/v1/"
echo ""
echo "🔧 HERRAMIENTAS DE DESARROLLO:"
echo "   - PgAdmin (BD): http://localhost:5050"
echo "     Usuario: admin@verihome.com"
echo "     Contraseña: admin123"
echo ""
echo "   - Flower (Celery): http://localhost:5555"
echo ""
echo "👤 CREDENCIALES DE ACCESO:"
echo "   - Admin Django: admin@verihome.com / admin123"
echo "   - PostgreSQL: postgres / postgres"
echo "   - Base de datos: verihome"
echo ""
echo "📋 COMANDOS ÚTILES:"
echo "   - Ver logs: docker-compose logs [servicio]"
echo "   - Reiniciar: docker-compose restart [servicio]"
echo "   - Parar todo: docker-compose down"
echo "   - Estado: docker-compose ps"
echo ""

if [ ${#failed_services[@]} -eq 0 ]; then
    echo "✅ Todos los servicios están funcionando correctamente!"
    echo ""
    echo "🚀 VeriHome está listo para desarrollo. ¡Comienza a codear!"
else
    echo "⚠️  Algunos servicios tuvieron problemas: ${failed_services[*]}"
    echo "   Revisa los logs con: docker-compose logs [servicio]"
fi

echo ""
echo "==============================================================================="