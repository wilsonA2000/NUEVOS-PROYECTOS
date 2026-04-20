#!/bin/bash

echo "======================================================================"
echo "TESTING AUTOMATIZADO DE APIs - VERIHOME (CURL)"
echo "======================================================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:8000/api/v1"

# Función para hacer login y obtener token
login() {
    local email=$1
    local password=$2
    local user_type=$3

    echo "🔐 Login: $email"
    response=$(curl -s -X POST "$BASE_URL/users/auth/login/" \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$password\"}")

    token=$(echo "$response" | grep -o '"access":"[^"]*"' | cut -d'"' -f4)

    if [ -n "$token" ]; then
        echo -e "${GREEN}✅ Login exitoso${NC}"
        echo "$token"
    else
        echo -e "${RED}❌ Login fallido${NC}"
        echo "$response"
        echo ""
    fi
}

echo "🔐 FASE 1: AUTENTICACIÓN"
echo "----------------------------------------------------------------------"
LANDLORD_TOKEN=$(login "admin@verihome.com" "admin123" "landlord")
echo ""
TENANT_TOKEN=$(login "letefon100@gmail.com" "adim123" "tenant")
echo ""
SERVICE_TOKEN=$(login "serviceprovider@verihome.com" "service123" "service_provider")
echo ""

echo "🌐 FASE 2: ENDPOINTS PÚBLICOS"
echo "----------------------------------------------------------------------"
echo "📋 GET /properties/ (público)"
curl -s "$BASE_URL/properties/" | head -c 200
echo "..."
echo ""

if [ -n "$LANDLORD_TOKEN" ]; then
    echo "🏠 FASE 3: ENDPOINTS DE ARRENDADOR"
    echo "----------------------------------------------------------------------"

    echo "👤 GET /users/auth/me/"
    curl -s "$BASE_URL/users/auth/me/" \
        -H "Authorization: Bearer $LANDLORD_TOKEN" | head -c 200
    echo "..."
    echo ""

    echo "🏠 GET /properties/ (landlord)"
    curl -s "$BASE_URL/properties/" \
        -H "Authorization: Bearer $LANDLORD_TOKEN" | head -c 200
    echo "..."
    echo ""

    echo "📄 GET /contracts/"
    curl -s "$BASE_URL/contracts/" \
        -H "Authorization: Bearer $LANDLORD_TOKEN" | head -c 200
    echo "..."
    echo ""
fi

if [ -n "$TENANT_TOKEN" ]; then
    echo "👤 FASE 4: ENDPOINTS DE ARRENDATARIO"
    echo "----------------------------------------------------------------------"

    echo "👤 GET /users/auth/me/"
    curl -s "$BASE_URL/users/auth/me/" \
        -H "Authorization: Bearer $TENANT_TOKEN" | head -c 200
    echo "..."
    echo ""

    echo "🔗 GET /matching/requests/"
    curl -s "$BASE_URL/matching/requests/" \
        -H "Authorization: Bearer $TENANT_TOKEN" | head -c 200
    echo "..."
    echo ""
fi

echo "======================================================================"
echo "TESTING COMPLETADO"
echo "======================================================================"
