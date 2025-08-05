#!/bin/bash
# =============================================================================
# VERIHOME - SCRIPT DE INICIALIZACIÓN COMPLETA
# =============================================================================

set -e  # Salir en caso de error

echo "🚀 Iniciando configuración completa de VeriHome..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes con colores
print_message() {
    echo -e "${GREEN}[VeriHome]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[Warning]${NC} $1"
}

print_error() {
    echo -e "${RED}[Error]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[Info]${NC} $1"
}

# Verificar si estamos en el directorio correcto
if [ ! -f "manage.py" ]; then
    print_error "Este script debe ejecutarse desde el directorio raíz de VeriHome"
    exit 1
fi

# Verificar si existe archivo .env
if [ ! -f ".env" ]; then
    print_warning "No se encontró archivo .env, copiando desde .env.example"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_info "Archivo .env creado. Por favor configúralo antes de continuar."
        print_info "Presiona ENTER para continuar después de configurar .env"
        read
    else
        print_error "No se encontró .env.example"
        exit 1
    fi
fi

# Cargar variables de entorno
if [ -f ".env" ]; then
    export $(cat .env | xargs)
fi

print_message "1/10 Creando directorios necesarios..."
mkdir -p logs backups media static

print_message "2/10 Verificando dependencias de Python..."
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    print_error "Python no está instalado"
    exit 1
fi

print_message "3/10 Creando entorno virtual (si no existe)..."
if [ ! -d "venv" ]; then
    $PYTHON_CMD -m venv venv
    print_info "Entorno virtual creado"
fi

print_message "4/10 Activando entorno virtual e instalando dependencias..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

print_message "5/10 Verificando conexión a base de datos..."
$PYTHON_CMD manage.py check --database default

print_message "6/10 Ejecutando migraciones de base de datos..."
$PYTHON_CMD manage.py makemigrations
$PYTHON_CMD manage.py migrate

print_message "7/10 Creando superusuario (si no existe)..."
$PYTHON_CMD manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    User.objects.create_superuser(
        email='${DJANGO_SUPERUSER_EMAIL:-admin@verihome.com}',
        password='${DJANGO_SUPERUSER_PASSWORD:-admin123}'
    )
    print('Superusuario creado')
else:
    print('Superusuario ya existe')
"

print_message "8/10 Recolectando archivos estáticos..."
$PYTHON_CMD manage.py collectstatic --noinput

print_message "9/10 Ejecutando comandos de inicialización adicionales..."
# Crear códigos de entrevista si existen
if $PYTHON_CMD manage.py help create_interview_codes &> /dev/null; then
    $PYTHON_CMD manage.py create_interview_codes --count=100
fi

# Configurar sitio de Django
$PYTHON_CMD manage.py shell -c "
from django.contrib.sites.models import Site
site, created = Site.objects.get_or_create(id=1)
site.domain = '${ALLOWED_HOSTS%%,*}'
site.name = 'VeriHome'
site.save()
print(f'Sitio configurado: {site.domain}')
"

print_message "10/10 Verificando configuración..."
$PYTHON_CMD manage.py check --deploy

print_message "✅ ¡Inicialización de VeriHome completada exitosamente!"
print_info "Para iniciar el servidor de desarrollo ejecuta:"
print_info "  source venv/bin/activate"
print_info "  python manage.py runserver 0.0.0.0:8000"
print_info ""
print_info "Para usar Docker ejecuta:"
print_info "  docker-compose up -d"
print_info ""
print_info "Accesos:"
print_info "  - Aplicación: http://localhost:8000"
print_info "  - Admin Django: http://localhost:8000/admin"
print_info "  - PgAdmin: http://localhost:5050 (si usas Docker)"
print_info "  - Flower (Celery): http://localhost:5555 (si usas Docker)"
print_info ""
print_info "Credenciales por defecto:"
print_info "  - Admin: ${DJANGO_SUPERUSER_EMAIL:-admin@verihome.com} / ${DJANGO_SUPERUSER_PASSWORD:-admin123}"