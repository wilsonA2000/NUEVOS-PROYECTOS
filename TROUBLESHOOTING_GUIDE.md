# 🛠️ VeriHome - Guía de Solución de Problemas

## Configurado por Agent D - Especialista en Configuración de Entorno

Esta guía resuelve los problemas más comunes al configurar VeriHome.

---

## 🚨 Problemas Críticos

### 1. Docker no está disponible
```bash
# Síntomas
The command 'docker' could not be found
The command 'docker-compose' could not be found

# Solución para WSL2
1. Instalar Docker Desktop en Windows
2. Habilitar integración WSL2 en Docker Desktop:
   - Settings → Resources → WSL Integration
   - Habilitar "Enable integration with my default WSL distro"
   - Aplicar y reiniciar

# Solución para Linux
sudo apt update
sudo apt install docker.io docker-compose
sudo systemctl start docker
sudo usermod -aG docker $USER

# Verificar instalación
docker --version
docker-compose --version
```

### 2. Puerto 80 ocupado
```bash
# Verificar qué está usando el puerto
sudo lsof -i :80
sudo netstat -tlnp | grep :80

# Soluciones
# Opción 1: Detener Apache/nginx local
sudo systemctl stop apache2
sudo systemctl stop nginx

# Opción 2: Cambiar puerto en docker-compose.override.yml
nginx:
  ports:
    - "8080:80"  # Cambiar puerto a 8080
```

### 3. Puerto 5432 ocupado (PostgreSQL local)
```bash
# Detener PostgreSQL local
sudo systemctl stop postgresql

# O cambiar puerto en .env
DATABASE_PORT=5433

# Y en docker-compose.yml
db:
  ports:
    - "5433:5432"
```

---

## 🐳 Problemas de Docker

### 1. Imagen no se construye
```bash
# Error común: npm install falla
# Solución: Limpiar cache y reconstruir
docker system prune -a
docker-compose build --no-cache

# Si persiste, verificar espacio en disco
df -h
docker system df
```

### 2. Contenedores no inician
```bash
# Ver logs detallados
docker-compose logs [servicio]

# Problemas comunes:
# - Permisos: chmod +x scripts/*.sh
# - Variables de entorno: verificar .env
# - Puertos ocupados: cambiar puertos en docker-compose
```

### 3. Base de datos no se conecta
```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps db

# Ver logs de PostgreSQL
docker-compose logs db

# Probar conexión manual
docker-compose exec db psql -U postgres -d verihome

# Solución común: Recrear volumen
docker-compose down --volumes
docker-compose up -d db
```

---

## 🌐 Problemas de Red y Conectividad

### 1. Frontend no carga
```bash
# Verificar nginx
docker-compose logs nginx

# Verificar archivos estáticos
docker-compose exec web ls -la /app/staticfiles/frontend/

# Reconstruir frontend
docker-compose exec web npm run build --prefix /app/frontend
docker-compose exec web python manage.py collectstatic --noinput
```

### 2. API no responde
```bash
# Verificar Django
docker-compose logs web

# Probar endpoint directamente
curl http://localhost:8000/api/v1/health/

# Verificar proxy nginx
curl -I http://localhost/api/v1/health/
```

### 3. CORS errors en desarrollo
```bash
# Verificar CORS_ALLOWED_ORIGINS en .env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:80,http://127.0.0.1:80

# Reiniciar web después de cambiar .env
docker-compose restart web
```

---

## 📊 Problemas de Base de Datos

### 1. Migraciones fallan
```bash
# Ver error específico
docker-compose exec web python manage.py migrate --verbosity=2

# Soluciones comunes:
# Reset completo (¡BORRA DATOS!)
docker-compose down --volumes
docker-compose up -d db
docker-compose exec web python manage.py migrate

# Migración específica
docker-compose exec web python manage.py migrate app_name migration_name
```

### 2. Superusuario no se crea
```bash
# Crear manualmente
docker-compose exec web python manage.py createsuperuser

# O usar variables de entorno
docker-compose exec web python manage.py create_superuser_if_not_exists
```

### 3. PgAdmin no se conecta
```bash
# Verificar configuración en pgadmin
Host: db (no localhost)
Port: 5432
Database: verihome
Username: postgres
Password: postgres

# Si no funciona, usar localhost:5432 desde fuera de Docker
```

---

## ⚙️ Problemas de Celery

### 1. Worker no procesa tareas
```bash
# Verificar Redis
docker-compose exec redis redis-cli ping

# Ver logs del worker
docker-compose logs celery-worker

# Reiniciar worker
docker-compose restart celery-worker

# Verificar tareas activas
docker-compose exec celery-worker celery -A verihome inspect active
```

### 2. Flower no carga
```bash
# Verificar logs
docker-compose logs flower

# Acceder con credenciales
http://localhost:5555
Usuario: admin
Contraseña: admin123
```

---

## 🔧 Problemas de Configuración

### 1. Variables de entorno no funcionan
```bash
# Verificar formato del .env (sin espacios)
SECRET_KEY=value  # ✅ Correcto
SECRET_KEY = value  # ❌ Incorrecto

# Reiniciar servicios después de cambiar .env
docker-compose down
docker-compose up -d
```

### 2. Archivos estáticos no cargan
```bash
# Recopilar archivos estáticos
docker-compose exec web python manage.py collectstatic --noinput

# Verificar permisos
docker-compose exec web ls -la /app/staticfiles/

# Verificar configuración nginx
docker-compose exec nginx nginx -t
```

### 3. Email no funciona
```bash
# Para desarrollo, usar backend de consola
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Ver logs de Django para emails
docker-compose logs web | grep -i email

# Para Gmail real, verificar app password
EMAIL_HOST_PASSWORD=tu_app_password_de_16_digitos
```

---

## 🔍 Scripts de Diagnóstico

### Script de verificación rápida
```bash
#!/bin/bash
echo "=== DIAGNOSTICO VERIHOME ==="

echo "1. Docker disponible:"
docker --version 2>/dev/null || echo "❌ Docker no disponible"

echo "2. Servicios corriendo:"
docker-compose ps 2>/dev/null || echo "❌ Docker-compose no funciona"

echo "3. Puertos ocupados:"
ss -tlnp | grep -E ":(80|8000|5432|6379|5555|5050) "

echo "4. Espacio en disco:"
df -h | head -2

echo "5. Memoria disponible:"
free -h | head -2

echo "=== FIN DIAGNOSTICO ==="
```

### Verificación de conectividad
```bash
# Verificar cada servicio
services=("http://localhost" "http://localhost:8000/admin" "http://localhost:5555" "http://localhost:5050")

for url in "${services[@]}"; do
    if curl -f -s --max-time 5 "$url" > /dev/null; then
        echo "✅ $url - OK"
    else
        echo "❌ $url - FALLA"
    fi
done
```

---

## 🚀 Comandos de Emergencia

### Reset completo del sistema
```bash
# ⚠️ ESTO BORRA TODOS LOS DATOS
docker-compose down --volumes --remove-orphans
docker system prune -a --volumes -f
docker-compose build --no-cache
docker-compose up -d
```

### Backup antes de reset
```bash
# Backup de base de datos
docker-compose exec db pg_dump -U postgres verihome > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup de archivos media
docker cp $(docker-compose ps -q web):/app/media ./media_backup
```

### Restaurar desde backup
```bash
# Restaurar base de datos
docker-compose exec -T db psql -U postgres verihome < backup_file.sql

# Restaurar archivos media
docker cp ./media_backup $(docker-compose ps -q web):/app/media
```

---

## 📞 Soporte Adicional

### Logs importantes a revisar
```bash
# Logs de aplicación Django
docker-compose logs web | tail -50

# Logs de base de datos
docker-compose logs db | tail -20

# Logs de nginx
docker-compose logs nginx | tail -20

# Logs de Celery
docker-compose logs celery-worker | tail -30
```

### Información del sistema para soporte
```bash
# Generar reporte completo
echo "=== REPORTE DE SISTEMA ===" > system_report.txt
echo "Fecha: $(date)" >> system_report.txt
echo "Docker version: $(docker --version)" >> system_report.txt
echo "Docker-compose version: $(docker-compose --version)" >> system_report.txt
echo "Sistema: $(uname -a)" >> system_report.txt
echo "Espacio disco: $(df -h | head -2)" >> system_report.txt
echo "Memoria: $(free -h | head -2)" >> system_report.txt
echo "Servicios Docker:" >> system_report.txt
docker-compose ps >> system_report.txt 2>/dev/null
echo "=== FIN REPORTE ===" >> system_report.txt
```

---

## ✅ Checklist de Verificación

Antes de reportar un problema, verifica:

- [ ] Docker Desktop está corriendo
- [ ] Puertos 80, 8000, 5432, 6379 están libres
- [ ] Archivo `.env` existe y tiene formato correcto
- [ ] Suficiente espacio en disco (>5GB)
- [ ] Suficiente RAM (>4GB)
- [ ] WSL2 integración habilitada (Windows)
- [ ] Scripts tienen permisos de ejecución (`chmod +x`)

### Comando de verificación automática
```bash
./scripts/health_check.sh
```

---

**🎯 Recuerda: La mayoría de problemas se resuelven con `docker-compose down && docker-compose up -d`**