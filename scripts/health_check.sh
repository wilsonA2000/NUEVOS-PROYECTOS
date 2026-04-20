#!/bin/bash
# =============================================================================
# VERIHOME - SCRIPT DE VERIFICACION DE SALUD DE SERVICIOS
# =============================================================================
# Configurado por Agent D para monitoreo de servicios
# Uso: ./scripts/health_check.sh

set -e

echo "🏥 Verificando salud de servicios VeriHome..."
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar estado de contenedor
check_container() {
    local service=$1
    local container_name="$(docker-compose ps -q $service 2>/dev/null)"

    if [ -z "$container_name" ]; then
        echo -e "${RED}❌ $service: Contenedor no encontrado${NC}"
        return 1
    fi

    local status=$(docker inspect --format='{{.State.Status}}' $container_name 2>/dev/null || echo "unknown")

    case $status in
        "running")
            echo -e "${GREEN}✅ $service: Ejecutándose${NC}"
            return 0
            ;;
        "exited")
            echo -e "${RED}❌ $service: Detenido${NC}"
            return 1
            ;;
        "restarting")
            echo -e "${YELLOW}⚠️  $service: Reiniciando${NC}"
            return 1
            ;;
        *)
            echo -e "${RED}❌ $service: Estado desconocido ($status)${NC}"
            return 1
            ;;
    esac
}

# Función para verificar conectividad HTTP
check_http() {
    local url=$1
    local service_name=$2
    local timeout=${3:-10}

    if curl -f -s --max-time $timeout "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $service_name: HTTP OK${NC}"
        return 0
    else
        echo -e "${RED}❌ $service_name: HTTP no responde${NC}"
        return 1
    fi
}

# Función para verificar base de datos
check_database() {
    if docker-compose exec -T db pg_isready -U postgres -d verihome > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PostgreSQL: Base de datos accesible${NC}"
        return 0
    else
        echo -e "${RED}❌ PostgreSQL: Base de datos no accesible${NC}"
        return 1
    fi
}

# Función para verificar Redis
check_redis() {
    if docker-compose exec -T redis redis-cli ping | grep -q PONG 2>/dev/null; then
        echo -e "${GREEN}✅ Redis: Cache funcionando${NC}"
        return 0
    else
        echo -e "${RED}❌ Redis: Cache no responde${NC}"
        return 1
    fi
}

# =============================================================================
# VERIFICACIONES PRINCIPALES
# =============================================================================

echo "📋 Verificando contenedores Docker..."
echo ""

# Verificar servicios básicos
services=("db" "redis" "web" "celery-worker" "celery-beat" "flower" "nginx" "pgadmin")
container_issues=0

for service in "${services[@]}"; do
    if ! check_container $service; then
        ((container_issues++))
    fi
done

echo ""
echo "🌐 Verificando conectividad de servicios..."
echo ""

# Verificar servicios web
http_issues=0

# Django API
if ! check_http "http://localhost:8000/api/v1/health/" "Django API"; then
    ((http_issues++))
fi

# Nginx (frontend)
if ! check_http "http://localhost/" "Nginx Frontend" 5; then
    ((http_issues++))
fi

# Flower (Celery monitoring)
if ! check_http "http://localhost:5555/" "Flower" 5; then
    ((http_issues++))
fi

# PgAdmin
if ! check_http "http://localhost:5050/" "PgAdmin" 5; then
    ((http_issues++))
fi

echo ""
echo "🔍 Verificando servicios de datos..."
echo ""

# Verificar base de datos
db_issues=0
if ! check_database; then
    ((db_issues++))
fi

# Verificar Redis
if ! check_redis; then
    ((db_issues++))
fi

# =============================================================================
# VERIFICACIONES AVANZADAS
# =============================================================================

echo ""
echo "⚙️  Verificaciones avanzadas..."
echo ""

# Verificar logs por errores críticos
echo "📋 Verificando logs por errores críticos..."

# Verificar logs de Django
critical_errors=$(docker-compose logs web 2>/dev/null | grep -i "error\|exception\|critical" | tail -5)
if [ -n "$critical_errors" ]; then
    echo -e "${YELLOW}⚠️  Django: Errores recientes encontrados${NC}"
    echo "$critical_errors" | sed 's/^/   /'
else
    echo -e "${GREEN}✅ Django: Sin errores críticos recientes${NC}"
fi

# Verificar Celery worker
celery_status=$(docker-compose logs celery-worker 2>/dev/null | grep -i "ready\|error" | tail -3)
if echo "$celery_status" | grep -q "ready"; then
    echo -e "${GREEN}✅ Celery Worker: Funcionando${NC}"
else
    echo -e "${YELLOW}⚠️  Celery Worker: Verificar estado${NC}"
fi

# =============================================================================
# RESUMEN FINAL
# =============================================================================

echo ""
echo "==============================================================================="
echo "                        RESUMEN DE SALUD DEL SISTEMA"
echo "==============================================================================="

total_issues=$((container_issues + http_issues + db_issues))

if [ $total_issues -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡Todos los servicios están funcionando correctamente!${NC}"
    echo ""
    echo "✅ Contenedores: Todos funcionando"
    echo "✅ Servicios web: Todos accesibles"
    echo "✅ Base de datos: Funcionando"
    echo "✅ Cache: Funcionando"
    echo ""
    echo "🚀 VeriHome está completamente operativo"
else
    echo -e "${RED}⚠️  Se encontraron $total_issues problemas${NC}"
    echo ""
    if [ $container_issues -gt 0 ]; then
        echo "❌ Problemas de contenedores: $container_issues"
    fi
    if [ $http_issues -gt 0 ]; then
        echo "❌ Problemas de conectividad: $http_issues"
    fi
    if [ $db_issues -gt 0 ]; then
        echo "❌ Problemas de datos: $db_issues"
    fi
    echo ""
    echo "🔧 Comandos para diagnóstico:"
    echo "   - Ver logs: docker-compose logs [servicio]"
    echo "   - Reiniciar: docker-compose restart [servicio]"
    echo "   - Estado detallado: docker-compose ps"
fi

echo ""
echo "🕐 Verificación completada: $(date)"
echo "==============================================================================="

exit $total_issues
