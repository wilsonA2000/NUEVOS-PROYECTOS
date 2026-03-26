#!/bin/bash
set -e

echo "=========================================="
echo "  VeriHome - Production Startup"
echo "=========================================="

# Esperar a que la base de datos este lista
echo "[1/6] Esperando base de datos..."
while ! python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()
from django.db import connections
conn = connections['default']
conn.ensure_connection()
" 2>/dev/null; do
    echo "  Base de datos no disponible, reintentando en 2s..."
    sleep 2
done
echo "  Base de datos lista."

# Esperar a que Redis este listo
echo "[2/6] Verificando Redis..."
python -c "
import redis, os
r = redis.from_url(os.environ.get('REDIS_URL', 'redis://redis:6379/1'))
try:
    r.ping()
    print('  Redis listo.')
except:
    print('  Redis no disponible - usando fallback a memoria local.')
" 2>/dev/null || echo "  Redis no disponible - continuando con fallback."

# Ejecutar migraciones
echo "[3/6] Ejecutando migraciones..."
python manage.py migrate --noinput
echo "  Migraciones completadas."

# Recolectar archivos estaticos
echo "[4/6] Recolectando archivos estaticos..."
python manage.py collectstatic --noinput
echo "  Archivos estaticos listos."

# Crear superusuario si no existe
echo "[5/6] Verificando superusuario..."
python -c "
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()
from django.contrib.auth import get_user_model
User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@verihome.com')
if not User.objects.filter(email=email).exists():
    password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin123')
    User.objects.create_superuser(email=email, password=password)
    print(f'  Superusuario {email} creado.')
else:
    print(f'  Superusuario {email} ya existe.')
"

# Iniciar servidor
echo "[6/6] Iniciando Gunicorn..."
echo "=========================================="
exec gunicorn verihome.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --worker-class gthread \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
