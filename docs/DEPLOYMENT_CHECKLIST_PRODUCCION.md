# ✅ CHECKLIST DE DEPLOYMENT A PRODUCCIÓN
## VeriHome Platform - Octubre 2025

---

## 🎯 OVERVIEW

Este checklist asegura un deployment seguro y sin errores a producción. Seguir cada paso en orden.

**Última actualización**: Octubre 12, 2025
**Versión**: 1.0.0
**Estado de la plataforma**: Production-Ready ✅

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### 1. ✅ CÓDIGO Y VERSIONING

- [ ] **Todos los cambios committeados a Git**
  ```bash
  git status
  # Should show: nothing to commit, working tree clean
  ```

- [ ] **Branch feature/cleanup-conservative actualizada**
  ```bash
  git pull origin feature/cleanup-conservative
  ```

- [ ] **Ningún archivo sensible en staging**
  ```bash
  # Verificar que .env no está en Git
  git ls-files | grep -E "\.env$|\.key$|credentials"
  # Should return empty
  ```

- [ ] **Version tag creado**
  ```bash
  git tag -a v1.0.0 -m "Production Release v1.0.0 - Oct 2025"
  git push origin v1.0.0
  ```

---

### 2. 🔒 VARIABLES DE ENTORNO

#### Backend (.env)
```bash
# Django Core
DEBUG=False
SECRET_KEY=<generate_new_secret_50_chars>
ALLOWED_HOSTS=verihome.com,www.verihome.com,api.verihome.com

# Database
DATABASE_URL=postgresql://user:password@db_host:5432/verihome_prod
DATABASE_NAME=verihome_prod
DATABASE_USER=verihome_user
DATABASE_PASSWORD=<strong_password>

# Redis
REDIS_URL=redis://:redis_password@redis_host:6379/0

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@verihome.com
EMAIL_HOST_PASSWORD=<app_password>

# Payment Gateways
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

WOMPI_PUBLIC_KEY=pub_prod_...
WOMPI_PRIVATE_KEY=prv_prod_...
WOMPI_EVENTS_SECRET=<wompi_events_secret>
WOMPI_SANDBOX_MODE=False

# Security
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True

# Frontend
FRONTEND_URL=https://verihome.com

# Monitoring
SENTRY_DSN=<sentry_dsn>
```

#### Frontend (.env)
```bash
VITE_API_URL=https://api.verihome.com/api/v1
VITE_WS_URL=wss://api.verihome.com/ws

# Mapbox
VITE_MAPBOX_TOKEN=<mapbox_production_token>
VITE_DEFAULT_COUNTRY=CO
VITE_DEFAULT_LAT=4.5709
VITE_DEFAULT_LNG=-74.2973
VITE_DEFAULT_ZOOM=6

# Environment
VITE_ENV=production
VITE_SENTRY_DSN=<sentry_frontend_dsn>
```

**Validaciones**:
- [ ] Todos los secrets generados son únicos (no usar valores de dev)
- [ ] SECRET_KEY tiene al menos 50 caracteres
- [ ] Passwords cumplen requisitos de seguridad (16+ chars, mixed)
- [ ] Wompi keys son de producción (no sandbox)
- [ ] Stripe keys son live keys (no test keys)

---

### 3. 🗄️ BASE DE DATOS

- [ ] **Database backup creado**
  ```bash
  pg_dump verihome_dev > backup_pre_production_$(date +%Y%m%d).sql
  ```

- [ ] **Production database creada**
  ```sql
  CREATE DATABASE verihome_prod;
  CREATE USER verihome_user WITH PASSWORD 'strong_password';
  GRANT ALL PRIVILEGES ON DATABASE verihome_prod TO verihome_user;
  ```

- [ ] **Migraciones aplicadas**
  ```bash
  python manage.py migrate --noinput
  ```

- [ ] **Verificar tablas críticas existen**
  ```bash
  python manage.py dbshell
  \dt  # Listar todas las tablas
  # Verificar: users, properties, contracts, transactions, etc.
  ```

- [ ] **Crear superusuario de producción**
  ```bash
  python manage.py createsuperuser
  # Email: admin@verihome.com
  # Password: <strong_admin_password>
  ```

---

### 4. 📦 DEPENDENCIAS

#### Backend
- [ ] **Instalar dependencias de producción**
  ```bash
  pip install -r requirements.txt
  pip install gunicorn daphne
  ```

- [ ] **Verificar versiones críticas**
  ```bash
  pip list | grep -E "Django|djangorestframework|channels|celery|stripe"
  # Django==4.2.7
  # djangorestframework==3.14.0
  # channels==4.2.2
  # celery==5.3.4
  # stripe==latest
  ```

#### Frontend
- [ ] **Instalar dependencias**
  ```bash
  cd frontend
  npm ci  # Usar ci en lugar de install para producción
  ```

- [ ] **Build de producción**
  ```bash
  npm run build
  # Verificar que frontend/dist/ se creó correctamente
  ```

- [ ] **Verificar bundle size**
  ```bash
  npm run build:analyze
  # Verificar que bundles son < 500KB cada uno
  ```

---

### 5. 🔧 CONFIGURACIÓN DE SERVICIOS

#### PostgreSQL
- [ ] **Configurado para aceptar conexiones remotas** (si aplica)
- [ ] **SSL/TLS habilitado**
- [ ] **Backups automáticos configurados**
- [ ] **Connection pooling configurado** (PgBouncer recomendado)

#### Redis
- [ ] **Redis protegido con password**
- [ ] **Redis bind configurado a IP específica** (no 0.0.0.0)
- [ ] **Persistence habilitada** (AOF + RDB)
- [ ] **Max memory policy configurada**

#### Nginx
- [ ] **Certificados SSL/TLS instalados**
  ```bash
  # Verificar certificados
  ls -la /etc/nginx/ssl/
  # Debe existir: fullchain.pem, privkey.pem
  ```

- [ ] **Configuración de producción copiada**
  ```bash
  cp nginx/nginx.prod.conf /etc/nginx/nginx.conf
  nginx -t  # Test configuration
  ```

- [ ] **Rate limiting configurado**
- [ ] **Security headers configuradas**

#### Celery
- [ ] **Worker configurado como servicio systemd**
- [ ] **Beat scheduler configurado**
- [ ] **Monitoring de tareas configurado**

---

### 6. 🔒 SEGURIDAD

- [ ] **Firewall configurado**
  ```bash
  # Permitir solo puertos necesarios
  ufw allow 22/tcp    # SSH
  ufw allow 80/tcp    # HTTP
  ufw allow 443/tcp   # HTTPS
  ufw enable
  ```

- [ ] **SSH key-based authentication**
- [ ] **Fail2ban instalado y configurado**
- [ ] **Security headers verificados**
  ```bash
  curl -I https://verihome.com | grep -E "Strict-Transport|X-Frame|X-Content"
  ```

- [ ] **CORS configurado correctamente**
  ```python
  # settings.py
  CORS_ALLOWED_ORIGINS = [
      "https://verihome.com",
      "https://www.verihome.com",
  ]
  ```

- [ ] **Rate limiting activo en Nginx**
- [ ] **Webhook signatures validándose** (✅ ya implementado)
- [ ] **Payment-contract validation activa** (✅ ya implementado)

---

### 7. 🎨 FRONTEND

- [ ] **Build de producción exitoso**
  ```bash
  cd frontend && npm run build
  ```

- [ ] **Static files en nginx directory**
  ```bash
  cp -r frontend/dist/* /usr/share/nginx/html/
  ```

- [ ] **Service Worker registrado** (PWA)
- [ ] **Error boundaries activos**
- [ ] **Analytics configurado** (Google Analytics / Mixpanel)
- [ ] **Sentry configurado para error tracking**

---

### 8. 📊 MONITORING Y LOGGING

#### Sentry
- [ ] **Sentry DSN configurado en backend**
- [ ] **Sentry DSN configurado en frontend**
- [ ] **Source maps subidos a Sentry**
  ```bash
  npm run build
  sentry-cli releases files VERSION upload-sourcemaps ./dist
  ```

#### Logs
- [ ] **Logging configurado en producción**
  ```python
  # settings.py
  LOGGING = {
      'version': 1,
      'disable_existing_loggers': False,
      'handlers': {
          'file': {
              'class': 'logging.FileHandler',
              'filename': '/var/log/verihome/django.log',
          },
      },
      'loggers': {
          'django': {
              'handlers': ['file'],
              'level': 'INFO',
          },
      },
  }
  ```

- [ ] **Log rotation configurado** (logrotate)

#### Health Checks
- [ ] **Endpoint /health/ responde 200**
  ```bash
  curl https://verihome.com/health/
  # Should return: OK
  ```

- [ ] **Database connection monitoreada**
- [ ] **Redis connection monitoreada**
- [ ] **Celery tasks monitoreadas**

---

### 9. 🚀 DOCKER DEPLOYMENT (Opcional)

Si usas Docker Compose:

- [ ] **docker-compose.prod.yml configurado**
- [ ] **Imágenes buildadas**
  ```bash
  docker-compose -f docker-compose.prod.yml build
  ```

- [ ] **Secrets en Docker secrets** (no en compose file)
- [ ] **Volumes para persistence configurados**
- [ ] **Networks aislados correctamente**

---

### 10. ⚡ PERFORMANCE

- [ ] **Gunicorn workers optimizados**
  ```bash
  # Regla: (2 * CPU cores) + 1
  gunicorn --workers 9 --timeout 120 verihome.wsgi:application
  ```

- [ ] **Daphne para WebSocket corriendo**
  ```bash
  daphne -b 0.0.0.0 -p 8001 verihome.asgi:application
  ```

- [ ] **Static files servidos por Nginx** (no Django)
- [ ] **Media files con CDN configurado** (CloudFront/CloudFlare)
- [ ] **Database queries optimizadas** (verificar N+1 queries)
- [ ] **Redis cache funcionando**
  ```bash
  python manage.py shell
  >>> from django.core.cache import cache
  >>> cache.set('test', 'value', 60)
  >>> cache.get('test')
  'value'
  ```

---

## 🚀 DEPLOYMENT STEPS

### Paso 1: Preparar Servidor

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install -y python3-pip python3-venv nginx postgresql redis-server

# 3. Create app user
sudo useradd -m -s /bin/bash verihome
sudo su - verihome
```

### Paso 2: Clonar Repositorio

```bash
cd /home/verihome
git clone https://github.com/yourorg/verihome.git
cd verihome
git checkout main  # o branch de producción
```

### Paso 3: Setup Backend

```bash
# Virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn daphne

# Configure .env
cp .env.example .env
nano .env  # Edit with production values

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Create superuser
python manage.py createsuperuser
```

### Paso 4: Setup Frontend

```bash
cd frontend
npm ci
npm run build

# Copy build to nginx
sudo cp -r dist/* /usr/share/nginx/html/
```

### Paso 5: Configure Nginx

```bash
sudo cp nginx/nginx.prod.conf /etc/nginx/nginx.conf
sudo nginx -t
sudo systemctl restart nginx
```

### Paso 6: Setup Systemd Services

**Gunicorn Service** (`/etc/systemd/system/verihome.service`):
```ini
[Unit]
Description=VeriHome Gunicorn
After=network.target

[Service]
User=verihome
Group=www-data
WorkingDirectory=/home/verihome/verihome
Environment="PATH=/home/verihome/verihome/venv/bin"
ExecStart=/home/verihome/verihome/venv/bin/gunicorn \
    --workers 9 \
    --bind 0.0.0.0:8000 \
    --timeout 120 \
    verihome.wsgi:application

[Install]
WantedBy=multi-user.target
```

**Daphne Service** (`/etc/systemd/system/verihome-daphne.service`):
```ini
[Unit]
Description=VeriHome Daphne WebSocket
After=network.target

[Service]
User=verihome
Group=www-data
WorkingDirectory=/home/verihome/verihome
Environment="PATH=/home/verihome/verihome/venv/bin"
ExecStart=/home/verihome/verihome/venv/bin/daphne \
    -b 0.0.0.0 \
    -p 8001 \
    verihome.asgi:application

[Install]
WantedBy=multi-user.target
```

**Start services**:
```bash
sudo systemctl daemon-reload
sudo systemctl enable verihome verihome-daphne
sudo systemctl start verihome verihome-daphne
sudo systemctl status verihome verihome-daphne
```

### Paso 7: Setup Celery

**Celery Worker** (`/etc/systemd/system/verihome-celery.service`):
```ini
[Unit]
Description=VeriHome Celery Worker
After=network.target redis.service

[Service]
Type=forking
User=verihome
Group=www-data
WorkingDirectory=/home/verihome/verihome
Environment="PATH=/home/verihome/verihome/venv/bin"
ExecStart=/home/verihome/verihome/venv/bin/celery -A verihome worker \
    --loglevel=info \
    --concurrency=4

[Install]
WantedBy=multi-user.target
```

**Celery Beat** (`/etc/systemd/system/verihome-celery-beat.service`):
```ini
[Unit]
Description=VeriHome Celery Beat
After=network.target redis.service

[Service]
Type=simple
User=verihome
Group=www-data
WorkingDirectory=/home/verihome/verihome
Environment="PATH=/home/verihome/verihome/venv/bin"
ExecStart=/home/verihome/verihome/venv/bin/celery -A verihome beat \
    --loglevel=info \
    --scheduler django_celery_beat.schedulers:DatabaseScheduler

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable verihome-celery verihome-celery-beat
sudo systemctl start verihome-celery verihome-celery-beat
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

### 1. Health Checks

```bash
# Backend health
curl https://api.verihome.com/health/
# Expected: 200 OK

# Frontend loads
curl -I https://verihome.com/
# Expected: 200 OK

# WebSocket connection
wscat -c wss://api.verihome.com/ws/
# Expected: Connection established
```

### 2. Functionality Tests

- [ ] **Login funciona**
  - Ir a https://verihome.com/login
  - Intentar login con credenciales válidas
  - Verificar JWT token en localStorage

- [ ] **Properties CRUD funciona**
  - Crear propiedad nueva
  - Subir imágenes
  - Editar propiedad
  - Eliminar propiedad

- [ ] **Biometric Flow funciona**
  - Crear contrato
  - Iniciar flujo biométrico
  - Completar 5 pasos
  - Verificar firma digital

- [ ] **WebSocket funciona** (✅ fix implementado)
  - Enviar mensaje en chat
  - Verificar recepción en tiempo real
  - Verificar notificaciones push

- [ ] **Payments funcionan**
  - Iniciar pago de prueba (Stripe test mode primero)
  - Verificar redirección correcta
  - Verificar webhook recibido
  - Validar que requiere contrato firmado (✅ fix implementado)

### 3. Performance Tests

```bash
# Load test con Apache Bench
ab -n 1000 -c 10 https://verihome.com/

# Verificar response times < 500ms para 95% de requests
```

### 4. Security Tests

```bash
# SSL Labs test
# Ir a: https://www.ssllabs.com/ssltest/analyze.html?d=verihome.com
# Expected: A+ rating

# Security headers
curl -I https://verihome.com/ | grep -E "Strict-Transport|X-Frame|X-Content"
# Expected: All security headers present

# Webhook signature validation
curl -X POST https://api.verihome.com/api/v1/payments/webhooks/stripe/ \
  -H "Content-Type: application/json" \
  -d '{"invalid":"data"}'
# Expected: 403 Forbidden (signature validation)
```

---

## 🚨 ROLLBACK PLAN

Si algo sale mal:

### Opción 1: Quick Rollback (Git)
```bash
git checkout main
git pull origin main
git reset --hard <previous_commit_hash>
sudo systemctl restart verihome verihome-daphne
```

### Opción 2: Database Rollback
```bash
# Restore backup
psql verihome_prod < backup_pre_production_YYYYMMDD.sql

# Rollback migrations
python manage.py migrate <app_name> <migration_number>
```

### Opción 3: Docker Rollback
```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

---

## 📞 CONTACTS

**En caso de emergencia**:
- DevOps Lead: [email]
- Backend Lead: [email]
- Frontend Lead: [email]
- Security Team: [email]

**Monitoring Dashboards**:
- Sentry: https://sentry.io/organizations/verihome
- Server Monitoring: [URL]
- Database Monitoring: [URL]

---

## 📝 NOTAS FINALES

### Optimizaciones Post-Deployment

1. **Configurar CDN para static/media files** (CloudFlare/CloudFront)
2. **Setup monitoring avanzado** (Datadog/New Relic)
3. **Configurar backups automáticos diarios**
4. **Implementar blue-green deployment** para future updates
5. **Setup staging environment** que replica producción

### Mantenimiento Regular

- **Diario**: Verificar logs, health checks
- **Semanal**: Revisar métricas de performance, errores en Sentry
- **Mensual**: Actualizar dependencias de seguridad, review de backups
- **Trimestral**: Load testing, security audit

---

**✅ DEPLOYMENT COMPLETADO**

Una vez todos los items marcados, la plataforma está lista para usuarios en producción.

**Version**: 1.0.0
**Date**: Octubre 2025
**Status**: Production-Ready ✅
