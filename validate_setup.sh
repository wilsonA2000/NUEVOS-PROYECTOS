#!/bin/bash
# =============================================================================
# VERIHOME - SCRIPT DE VALIDACION DE CONFIGURACION
# =============================================================================
# Configurado por Agent D para verificar que todo esté listo sin Docker
# Uso: ./validate_setup.sh

set -e

echo "🔍 VERIHOME - VALIDACIÓN DE CONFIGURACIÓN"
echo "=========================================="
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ISSUES=0

# Función para reportar resultado
report_check() {
    local test_name="$1"
    local result="$2"
    local message="$3"
    
    if [ "$result" = "pass" ]; then
        echo -e "${GREEN}✅ $test_name${NC}"
        [ -n "$message" ] && echo -e "   ${message}"
    elif [ "$result" = "warn" ]; then
        echo -e "${YELLOW}⚠️  $test_name${NC}"
        [ -n "$message" ] && echo -e "   ${YELLOW}$message${NC}"
    else
        echo -e "${RED}❌ $test_name${NC}"
        [ -n "$message" ] && echo -e "   ${RED}$message${NC}"
        ((ISSUES++))
    fi
}

echo "📋 VERIFICANDO ARCHIVOS DE CONFIGURACIÓN..."
echo ""

# Verificar archivo .env principal
if [ -f ".env" ]; then
    report_check "Archivo .env principal" "pass" "Encontrado y listo"
    
    # Verificar variables críticas
    if grep -q "SECRET_KEY=" .env && ! grep -q "your-secret-key-here" .env; then
        report_check "SECRET_KEY configurada" "pass"
    else
        report_check "SECRET_KEY configurada" "fail" "SECRET_KEY no está configurada o usa valor por defecto"
    fi
    
    if grep -q "DATABASE_NAME=verihome" .env; then
        report_check "Base de datos configurada" "pass"
    else
        report_check "Base de datos configurada" "fail" "DATABASE_NAME no está configurada"
    fi
    
    if grep -q "REDIS_URL=" .env; then
        report_check "Redis configurado" "pass"
    else
        report_check "Redis configurado" "fail" "REDIS_URL no está configurada"
    fi
    
    if grep -q "EMAIL_HOST_USER=" .env && ! grep -q "your-email@gmail.com" .env; then
        report_check "Email configurado" "pass"
    else
        report_check "Email configurado" "warn" "Email usa configuración por defecto"
    fi
    
else
    report_check "Archivo .env principal" "fail" "Archivo .env no encontrado"
fi

# Verificar archivo .env del frontend
if [ -f "frontend/.env" ]; then
    report_check "Frontend .env" "pass"
    
    if grep -q "VITE_MAPBOX_TOKEN=" frontend/.env && ! grep -q "your_mapbox_token_here" frontend/.env; then
        report_check "Mapbox token configurado" "pass"
    else
        report_check "Mapbox token configurado" "warn" "Mapbox token parece ser por defecto"
    fi
else
    report_check "Frontend .env" "fail" "frontend/.env no encontrado"
fi

echo ""
echo "🐳 VERIFICANDO ARCHIVOS DOCKER..."
echo ""

# Verificar docker-compose.yml
if [ -f "docker-compose.yml" ]; then
    report_check "docker-compose.yml" "pass"
    
    # Verificar servicios críticos
    if grep -q "web:" docker-compose.yml; then
        report_check "Servicio web definido" "pass"
    else
        report_check "Servicio web definido" "fail"
    fi
    
    if grep -q "db:" docker-compose.yml; then
        report_check "Servicio database definido" "pass"
    else
        report_check "Servicio database definido" "fail"
    fi
    
    if grep -q "redis:" docker-compose.yml; then
        report_check "Servicio redis definido" "pass"
    else
        report_check "Servicio redis definido" "fail"
    fi
    
else
    report_check "docker-compose.yml" "fail" "Archivo principal de Docker Compose no encontrado"
fi

# Verificar docker-compose.override.yml
if [ -f "docker-compose.override.yml" ]; then
    report_check "docker-compose.override.yml" "pass" "Configuración de desarrollo encontrada"
else
    report_check "docker-compose.override.yml" "warn" "Archivo de override no encontrado"
fi

# Verificar Dockerfile
if [ -f "Dockerfile" ]; then
    report_check "Dockerfile" "pass"
    
    if grep -q "FROM python:" Dockerfile; then
        report_check "Dockerfile base Python" "pass"
    else
        report_check "Dockerfile base Python" "fail"
    fi
    
    if grep -q "npm" Dockerfile; then
        report_check "Node.js incluido en Dockerfile" "pass"
    else
        report_check "Node.js incluido en Dockerfile" "fail"
    fi
    
else
    report_check "Dockerfile" "fail" "Dockerfile no encontrado"
fi

echo ""
echo "📁 VERIFICANDO ESTRUCTURA DE DIRECTORIOS..."
echo ""

# Verificar directorios críticos
directories=("scripts" "docker" "frontend" "logs" "media" "staticfiles")
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        report_check "Directorio $dir" "pass"
    else
        # Crear directorios faltantes
        mkdir -p "$dir"
        report_check "Directorio $dir" "warn" "Creado automáticamente"
    fi
done

# Verificar subdirectorios específicos
if [ -d "docker/postgres" ]; then
    report_check "Configuración PostgreSQL" "pass"
else
    mkdir -p "docker/postgres"
    report_check "Configuración PostgreSQL" "warn" "Directorio creado"
fi

if [ -d "docker/redis" ]; then
    report_check "Configuración Redis" "pass"
else
    mkdir -p "docker/redis"
    report_check "Configuración Redis" "warn" "Directorio creado"
fi

if [ -d "docker/pgadmin" ]; then
    report_check "Configuración PgAdmin" "pass"
else
    report_check "Configuración PgAdmin" "warn" "Directorio no encontrado"
fi

echo ""
echo "🔧 VERIFICANDO SCRIPTS DE AUTOMATIZACIÓN..."
echo ""

# Verificar scripts
scripts=("quick_start.sh" "scripts/init_verihome_dev.sh" "scripts/health_check.sh")
for script in "${scripts[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            report_check "Script $script" "pass" "Ejecutable"
        else
            chmod +x "$script"
            report_check "Script $script" "warn" "Permisos de ejecución añadidos"
        fi
    else
        report_check "Script $script" "fail" "Script no encontrado"
    fi
done

echo ""
echo "🌐 VERIFICANDO CONFIGURACIÓN DE NGINX..."
echo ""

if [ -f "nginx.conf" ]; then
    report_check "nginx.conf" "pass"
    
    if grep -q "upstream django" nginx.conf; then
        report_check "Configuración upstream Django" "pass"
    else
        report_check "Configuración upstream Django" "fail"
    fi
    
    if grep -q "location /api/" nginx.conf; then
        report_check "Proxy API configurado" "pass"
    else
        report_check "Proxy API configurado" "fail"
    fi
    
    if grep -q "location /static/" nginx.conf; then
        report_check "Archivos estáticos configurados" "pass"
    else
        report_check "Archivos estáticos configurados" "fail"
    fi
else
    report_check "nginx.conf" "fail" "Configuración de nginx no encontrada"
fi

echo ""
echo "📦 VERIFICANDO DEPENDENCIAS DE FRONTEND..."
echo ""

if [ -f "frontend/package.json" ]; then
    report_check "Frontend package.json" "pass"
    
    if [ -f "frontend/package-lock.json" ]; then
        report_check "Frontend lockfile" "pass"
    else
        report_check "Frontend lockfile" "warn" "package-lock.json no encontrado"
    fi
    
    if [ -f "frontend/vite.config.ts" ]; then
        report_check "Configuración Vite" "pass"
        
        if grep -q "proxy" frontend/vite.config.ts; then
            report_check "Proxy Vite configurado" "pass"
        else
            report_check "Proxy Vite configurado" "warn" "Proxy no encontrado"
        fi
    else
        report_check "Configuración Vite" "fail"
    fi
else
    report_check "Frontend package.json" "fail"
fi

echo ""
echo "🔍 VERIFICANDO DEPENDENCIAS DE BACKEND..."
echo ""

if [ -f "requirements.txt" ]; then
    report_check "requirements.txt" "pass"
    
    # Verificar dependencias críticas
    critical_deps=("Django" "psycopg2" "redis" "celery" "gunicorn")
    for dep in "${critical_deps[@]}"; do
        if grep -i "$dep" requirements.txt > /dev/null; then
            report_check "Dependencia $dep" "pass"
        else
            report_check "Dependencia $dep" "warn" "Dependencia no encontrada en requirements.txt"
        fi
    done
else
    report_check "requirements.txt" "fail" "Archivo de dependencias Python no encontrado"
fi

# Verificar manage.py
if [ -f "manage.py" ]; then
    report_check "Django manage.py" "pass"
else
    report_check "Django manage.py" "fail" "Archivo manage.py no encontrado"
fi

echo ""
echo "📄 VERIFICANDO DOCUMENTACIÓN..."
echo ""

docs=("README_DESARROLLO.md" "SETUP_COMPLETO_DESARROLLO.md" "TROUBLESHOOTING_GUIDE.md")
for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        report_check "Documentación $doc" "pass"
    else
        report_check "Documentación $doc" "warn" "Documentación no encontrada"
    fi
done

echo ""
echo "==============================================================================="
echo "                              RESUMEN DE VALIDACIÓN"
echo "==============================================================================="
echo ""

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 ¡CONFIGURACIÓN COMPLETA Y VÁLIDA!${NC}"
    echo ""
    echo -e "${GREEN}✅ Todos los archivos de configuración están presentes${NC}"
    echo -e "${GREEN}✅ Variables de entorno configuradas correctamente${NC}"
    echo -e "${GREEN}✅ Docker Compose configurado completamente${NC}"
    echo -e "${GREEN}✅ Scripts de automatización listos${NC}"
    echo -e "${GREEN}✅ Estructura de directorios correcta${NC}"
    echo ""
    echo -e "${BLUE}🚀 VeriHome está listo para ser iniciado con:${NC}"
    echo -e "${BLUE}   ./quick_start.sh${NC}"
else
    echo -e "${RED}⚠️  SE ENCONTRARON $ISSUES PROBLEMAS${NC}"
    echo ""
    echo -e "${YELLOW}🔧 Algunos elementos necesitan atención antes del inicio.${NC}"
    echo -e "${YELLOW}   Revisa los elementos marcados con ❌ arriba.${NC}"
    echo ""
    echo -e "${BLUE}💡 Después de resolver los problemas, ejecuta:${NC}"
    echo -e "${BLUE}   ./quick_start.sh${NC}"
fi

echo ""
echo "==============================================================================="
echo ""
echo -e "${BLUE}📋 PRÓXIMOS PASOS:${NC}"
echo ""
echo "1. 🐳 Verificar que Docker Desktop esté corriendo"
echo "2. 🚀 Ejecutar: ./quick_start.sh"
echo "3. 🌐 Acceder a: http://localhost"
echo "4. 👤 Login: admin@verihome.com / admin123"
echo "5. 🔍 Verificar salud: ./scripts/health_check.sh"
echo ""
echo -e "${BLUE}📖 DOCUMENTACIÓN COMPLETA:${NC}"
echo "   - Setup: SETUP_COMPLETO_DESARROLLO.md"
echo "   - Problemas: TROUBLESHOOTING_GUIDE.md"
echo "   - General: README_DESARROLLO.md"
echo ""

exit $ISSUES