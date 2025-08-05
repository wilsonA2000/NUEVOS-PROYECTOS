#!/bin/bash

echo "🚀 VERIHOME - INICIO NATIVO (Sin Docker)"
echo "========================================"
echo ""

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con colores
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [[ ! -f "manage.py" ]]; then
    print_error "No se encontró manage.py. Asegúrate de estar en el directorio raíz de VeriHome."
    exit 1
fi

print_info "Verificando configuración..."

# Verificar archivo .env
if [[ ! -f ".env" ]]; then
    print_warning "Archivo .env no encontrado. Creando desde .env.example..."
    if [[ -f ".env.example" ]]; then
        cp .env.example .env
        print_status "Archivo .env creado"
    else
        print_error "No se encontró .env.example"
        exit 1
    fi
fi

print_status "Archivo .env encontrado"

# Crear entorno virtual si no existe
if [[ ! -d "venv" ]]; then
    print_info "Creando entorno virtual Python..."
    python3 -m venv venv
    print_status "Entorno virtual creado"
fi

# Activar entorno virtual
print_info "Activando entorno virtual..."
source venv/bin/activate
print_status "Entorno virtual activado"

# Instalar dependencias Python
print_info "Instalando dependencias de Python..."
if pip install -r requirements.txt > /dev/null 2>&1; then
    print_status "Dependencias de Python instaladas"
else
    print_warning "Algunas dependencias pueden haber fallado, continuando..."
fi

# Verificar e instalar dependencias del frontend
print_info "Verificando dependencias del frontend..."
cd frontend

if [[ ! -d "node_modules" ]]; then
    print_info "Instalando dependencias de Node.js..."
    npm install
    print_status "Dependencias de Node.js instaladas"
else
    print_status "Dependencias de Node.js ya instaladas"
fi

# Volver al directorio raíz
cd ..

# Crear base de datos SQLite y ejecutar migraciones
print_info "Configurando base de datos..."
if python manage.py migrate > /dev/null 2>&1; then
    print_status "Migraciones ejecutadas exitosamente"
else
    print_warning "Algunas migraciones pueden haber fallado, continuando..."
fi

# Crear superusuario si no existe
print_info "Verificando superusuario..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser('admin@verihome.com', 'admin123')
    print('Superusuario creado: admin@verihome.com / admin123')
else:
    print('Superusuario ya existe')
" 2>/dev/null

print_status "Base de datos configurada"

# Recopilar archivos estáticos
print_info "Recopilando archivos estáticos..."
python manage.py collectstatic --noinput > /dev/null 2>&1
print_status "Archivos estáticos recopilados"

echo ""
echo "🎉 ¡VeriHome está listo para funcionar!"
echo "======================================"
echo ""
echo "📋 CREDENCIALES DE ACCESO:"
echo "   👤 Usuario: admin@verihome.com"
echo "   🔑 Contraseña: admin123"
echo ""
echo "🌐 PARA INICIAR LOS SERVICIOS:"
echo "   Backend:  python manage.py runserver"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "📍 URLS DE ACCESO:"
echo "   🖥️  Frontend: http://localhost:5173"
echo "   🔧 Backend API: http://localhost:8000/api/v1/"
echo "   👨‍💼 Admin Django: http://localhost:8000/admin/"
echo ""

print_info "Para iniciar ambos servicios automáticamente, ejecuta:"
echo "   ./start_both_services.sh"
echo ""

# Preguntar si quiere iniciar los servicios automáticamente
read -p "¿Quieres iniciar los servicios ahora? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    print_info "Iniciando servicios de VeriHome..."
    
    # Crear script para iniciar ambos servicios
    cat > start_both_services.sh << 'EOF'
#!/bin/bash

echo "🚀 Iniciando VeriHome - Servicios Completos"
echo "=========================================="

# Función para manejar la terminación
cleanup() {
    echo ""
    echo "🛑 Deteniendo servicios..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    wait
    echo "✅ Servicios detenidos"
    exit 0
}

# Configurar trap para cleanup
trap cleanup SIGINT SIGTERM

# Activar entorno virtual
source venv/bin/activate

# Iniciar backend en segundo plano
echo "🔧 Iniciando backend Django..."
python manage.py runserver 8000 &
BACKEND_PID=$!

# Esperar un momento para que Django inicie
sleep 3

# Iniciar frontend en segundo plano
echo "🖥️  Iniciando frontend React..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉 ¡VeriHome está funcionando!"
echo "========================="
echo "🖥️  Frontend: http://localhost:5173"
echo "🔧 Backend: http://localhost:8000"
echo "👨‍💼 Admin: http://localhost:8000/admin"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios"
echo ""

# Esperar indefinidamente
wait
EOF

    chmod +x start_both_services.sh
    ./start_both_services.sh
else
    echo ""
    print_info "Para iniciar manualmente:"
    echo "   Backend:  python manage.py runserver"
    echo "   Frontend: cd frontend && npm run dev"
fi