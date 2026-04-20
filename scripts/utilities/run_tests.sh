#!/bin/bash

# 🎭 VeriHome - Script Automático de Testing E2E
# Este script inicia los servidores y ejecuta los tests de Playwright

set -e  # Exit on error

echo "🚀 VeriHome - Automated Testing Script"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -an | grep ":$port " | grep LISTEN >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Function to wait for server
wait_for_server() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=0

    echo -e "${YELLOW}⏳ Esperando a que ${name} esté listo...${NC}"

    while [ $attempt -lt $max_attempts ]; do
        if curl -s -o /dev/null -w "%{http_code}" "$url" | grep -q "200\|301\|302"; then
            echo -e "${GREEN}✅ ${name} está listo!${NC}"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 2
        echo -n "."
    done

    echo -e "${RED}❌ Timeout esperando a ${name}${NC}"
    return 1
}

# 1. Check if backend is running
echo "🔍 Verificando Backend (puerto 8000)..."
if check_port 8000; then
    echo -e "${GREEN}✅ Backend ya está corriendo en puerto 8000${NC}"
    BACKEND_RUNNING=true
else
    echo -e "${YELLOW}⚠️  Backend no está corriendo. Necesitas iniciarlo manualmente:${NC}"
    echo -e "${YELLOW}   Terminal 1: python manage.py runserver${NC}"
    BACKEND_RUNNING=false
fi

echo ""

# 2. Check if frontend is running
echo "🔍 Verificando Frontend (puerto 5173)..."
if check_port 5173; then
    echo -e "${GREEN}✅ Frontend ya está corriendo en puerto 5173${NC}"
    FRONTEND_RUNNING=true
else
    echo -e "${YELLOW}⚠️  Frontend no está corriendo. Necesitas iniciarlo manualmente:${NC}"
    echo -e "${YELLOW}   Terminal 2: cd frontend && npm run dev${NC}"
    FRONTEND_RUNNING=false
fi

echo ""
echo "======================================"
echo ""

# 3. Check if both servers are ready
if [ "$BACKEND_RUNNING" = true ] && [ "$FRONTEND_RUNNING" = true ]; then
    echo -e "${GREEN}🎉 ¡Ambos servidores están corriendo!${NC}"
    echo ""

    # Wait for servers to be fully ready
    wait_for_server "http://localhost:8000/api/v1/" "Backend API"
    wait_for_server "http://localhost:5173" "Frontend"

    echo ""
    echo "======================================"
    echo ""
    echo -e "${GREEN}🎭 Ejecutando Tests de Playwright...${NC}"
    echo ""

    # Navigate to frontend directory
    cd frontend

    # Run Playwright tests
    echo "📋 Opción 1: Tests con UI visible (headed mode)"
    echo "   Comando: npx playwright test contract-workflow --headed"
    echo ""
    echo "📋 Opción 2: Tests en background con screenshots"
    echo "   Comando: npx playwright test contract-workflow"
    echo ""
    echo "📋 Opción 3: Ver reporte HTML después"
    echo "   Comando: npx playwright show-report"
    echo ""

    read -p "¿Qué opción prefieres? (1/2/3 o Enter para opción 2): " option

    case $option in
        1)
            echo -e "${GREEN}▶️  Ejecutando tests con UI visible...${NC}"
            npx playwright test contract-workflow --headed
            ;;
        3)
            echo -e "${GREEN}📊 Abriendo reporte HTML...${NC}"
            npx playwright show-report
            ;;
        *)
            echo -e "${GREEN}▶️  Ejecutando tests en background...${NC}"
            npx playwright test contract-workflow

            echo ""
            echo -e "${GREEN}✅ Tests completados!${NC}"
            echo ""
            echo "📸 Screenshots generados en: playwright-report/screenshots/"
            echo "📊 Ver reporte HTML: npx playwright show-report"
            ;;
    esac

else
    echo -e "${RED}❌ Error: Necesitas iniciar los servidores primero${NC}"
    echo ""
    echo "📋 Instrucciones:"
    echo ""
    echo "Terminal 1 (Backend):"
    echo "  cd /mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
    echo "  python manage.py runserver"
    echo ""
    echo "Terminal 2 (Frontend):"
    echo "  cd /mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/frontend"
    echo "  npm run dev"
    echo ""
    echo "Terminal 3 (Tests):"
    echo "  ./run_tests.sh"
    echo ""
    exit 1
fi
