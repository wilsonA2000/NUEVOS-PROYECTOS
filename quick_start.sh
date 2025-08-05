#!/bin/bash
# =============================================================================
# VERIHOME - INICIO RAPIDO PARA DESARROLLADORES
# =============================================================================
# Configurado por Agent D para inicio rápido en menos de 5 minutos
# Uso: ./quick_start.sh

echo "⚡ VERIHOME - INICIO RÁPIDO"
echo "=========================="
echo ""

# Verificar Docker
if ! docker info &> /dev/null; then
    echo "❌ Docker no está corriendo. Iniciando Docker Desktop..."
    # En Windows/Mac, esto podría no funcionar automáticamente
    echo "   Por favor, inicia Docker Desktop manualmente y ejecuta este script de nuevo."
    exit 1
fi

echo "🚀 Iniciando VeriHome en modo desarrollo..."
echo ""

# Detener servicios existentes
echo "🛑 Deteniendo servicios existentes..."
docker-compose down --remove-orphans 2>/dev/null || true

# Iniciar servicios esenciales
echo "📦 Iniciando servicios esenciales..."
docker-compose up -d db redis

# Esperar a que estén listos
echo "⏳ Esperando servicios base..."
sleep 10

# Iniciar aplicación principal
echo "🌐 Iniciando aplicación..."
docker-compose up -d web

# Esperar a Django
echo "⏳ Esperando Django..."
sleep 15

# Iniciar servicios adicionales
echo "🔧 Iniciando servicios adicionales..."
docker-compose up -d celery-worker flower nginx pgadmin

echo ""
echo "✅ ¡VeriHome iniciado!"
echo ""
echo "🌐 Accede a la aplicación en: http://localhost"
echo "🔧 Panel de administración: http://localhost:8000/admin"
echo "📊 Monitor Celery: http://localhost:5555"
echo "🗄️  PgAdmin: http://localhost:5050"
echo ""
echo "👤 Credenciales por defecto:"
echo "   Admin: admin@verihome.com / admin123"
echo ""
echo "💡 Para ver el estado: docker-compose ps"
echo "💡 Para ver logs: docker-compose logs [servicio]"
echo "💡 Para verificar salud: ./scripts/health_check.sh"
echo ""