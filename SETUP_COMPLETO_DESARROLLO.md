# 🚀 VeriHome - Configuración Completa de Desarrollo

## Configurado por Agent D - Especialista en Configuración de Entorno

Este documento proporciona **TODO lo necesario** para que cualquier desarrollador pueda levantar VeriHome en **menos de 5 minutos**.

---

## 📋 Requisitos Previos

### Software Necesario
- **Docker Desktop** (Windows/Mac) o **Docker Engine** (Linux)
- **Git** para clonar el repositorio
- **Navegador web** moderno

### Verificación de Docker
```bash
# Verificar que Docker esté instalado y funcionando
docker --version
docker-compose --version
docker info
```

---

## ⚡ Inicio Rápido (5 minutos)

### Opción 1: Script Automático (Recomendado)
```bash
# Clonar y entrar al directorio
git clone <tu-repositorio>
cd verihome

# Ejecutar inicio rápido
./quick_start.sh
```

### Opción 2: Script Completo con Configuración Inicial
```bash
# Para primera vez o configuración completa
./scripts/init_verihome_dev.sh
```

---

## 🔧 Configuración Manual (Paso a Paso)

### 1. Configuración de Variables de Entorno

El archivo `.env` ya está **completamente configurado** con valores por defecto seguros:

```bash
# Ver configuración actual
cat .env
```

**Configuración incluye:**
- ✅ PostgreSQL configurado para Docker
- ✅ Redis configurado para Docker  
- ✅ Email configurado (Gmail)
- ✅ Mapbox token configurado
- ✅ Todas las URLs y puertos listos
- ✅ Credenciales por defecto establecidas

### 2. Iniciar Servicios Docker

```bash
# Construir imágenes
docker-compose build

# Iniciar todos los servicios
docker-compose up -d

# Verificar estado
docker-compose ps
```

### 3. Verificar Funcionamiento

```bash
# Script de verificación de salud
./scripts/health_check.sh
```

---

## 🌐 URLs de Acceso

| Servicio | URL | Credenciales |
|----------|-----|--------------|
| **Frontend + Backend** | http://localhost | - |
| **Admin Django** | http://localhost:8000/admin | admin@verihome.com / admin123 |
| **API Documentation** | http://localhost:8000/api/v1/ | - |
| **PgAdmin (Base de Datos)** | http://localhost:5050 | admin@verihome.com / admin123 |
| **Flower (Monitor Celery)** | http://localhost:5555 | admin / admin123 |

---

## 👤 Credenciales por Defecto

### Aplicación
- **Email**: admin@verihome.com
- **Contraseña**: admin123

### Base de Datos PostgreSQL
- **Usuario**: postgres
- **Contraseña**: postgres
- **Base de datos**: verihome
- **Host**: localhost (externo) / db (interno)
- **Puerto**: 5432

### PgAdmin
- **Email**: admin@verihome.com
- **Contraseña**: admin123

### Flower (Celery)
- **Usuario**: admin
- **Contraseña**: admin123

---

## 🐳 Servicios Docker Configurados

### Servicios Principales
- **web**: Django + React (Puerto 8000)
- **nginx**: Proxy reverso (Puerto 80)
- **db**: PostgreSQL 15 (Puerto 5432)
- **redis**: Cache y broker Celery (Puerto 6379)

### Servicios de Procesamiento
- **celery-worker**: Tareas asíncronas
- **celery-beat**: Tareas programadas
- **flower**: Monitor de Celery (Puerto 5555)

### Herramientas de Desarrollo
- **pgadmin**: Administración de BD (Puerto 5050)

---

## 📁 Estructura de Archivos de Configuración

```
📁 NUEVOS PROYECTOS/
├── 📄 .env                           # Variables de entorno (CONFIGURADO)
├── 📄 docker-compose.yml             # Servicios principales
├── 📄 docker-compose.override.yml    # Configuración desarrollo
├── 📄 Dockerfile                     # Imagen Django + React
├── 📄 quick_start.sh                 # Inicio rápido
├── 📁 scripts/
│   ├── 📄 init_verihome_dev.sh       # Configuración completa
│   └── 📄 health_check.sh            # Verificación de salud
├── 📁 docker/
│   ├── 📁 postgres/
│   │   └── 📄 init.sql               # Scripts de inicialización
│   ├── 📁 redis/
│   │   └── 📄 redis.conf             # Configuración Redis
│   └── 📁 pgadmin/
│       └── 📄 servers.json           # Servidores pre-configurados
└── 📁 frontend/
    ├── 📄 .env                       # Variables frontend
    └── 📄 vite.config.ts             # Configuración con proxy
```

---

## 🔍 Comandos de Desarrollo Útiles

### Gestión de Servicios
```bash
# Ver estado de todos los servicios
docker-compose ps

# Ver logs de un servicio específico
docker-compose logs web
docker-compose logs -f celery-worker  # Seguir logs en tiempo real

# Reiniciar un servicio
docker-compose restart web

# Detener todos los servicios
docker-compose down

# Limpiar completamente (incluye volúmenes)
docker-compose down --volumes --remove-orphans
```

### Base de Datos
```bash
# Conectar a PostgreSQL
docker-compose exec db psql -U postgres -d verihome

# Ejecutar migraciones
docker-compose exec web python manage.py migrate

# Crear superusuario
docker-compose exec web python manage.py createsuperuser

# Cargar datos de prueba
docker-compose exec web python manage.py loaddata fixtures/sample_data.json
```

### Desarrollo Frontend
```bash
# Reconstruir frontend
docker-compose exec web npm run build --prefix /app/frontend

# Ver logs del frontend durante desarrollo
docker-compose logs nginx
```

### Celery (Tareas Asíncronas)
```bash
# Ver estado de workers
docker-compose exec celery-worker celery -A verihome inspect active

# Purgar todas las tareas
docker-compose exec celery-worker celery -A verihome purge

# Ver estadísticas
docker-compose exec celery-worker celery -A verihome inspect stats
```

---

## 🛠️ Solución de Problemas Comunes

### 1. Docker no inicia
```bash
# Verificar que Docker Desktop esté corriendo
docker info

# Reiniciar Docker Desktop si es necesario
```

### 2. Puerto ocupado
```bash
# Verificar qué está usando el puerto
lsof -i :80
lsof -i :8000
lsof -i :5432

# Detener proceso si es necesario
sudo kill -9 <PID>
```

### 3. Base de datos no se conecta
```bash
# Verificar logs de PostgreSQL
docker-compose logs db

# Reiniciar solo la base de datos
docker-compose restart db

# Verificar conectividad
docker-compose exec db pg_isready -U postgres -d verihome
```

### 4. Frontend no carga
```bash
# Verificar logs de nginx
docker-compose logs nginx

# Reconstruir imagen con frontend
docker-compose build --no-cache web

# Verificar archivos estáticos
docker-compose exec web python manage.py collectstatic --noinput
```

### 5. Celery no procesa tareas
```bash
# Verificar logs de worker
docker-compose logs celery-worker

# Verificar conexión a Redis
docker-compose exec redis redis-cli ping

# Reiniciar worker
docker-compose restart celery-worker
```

---

## 🔒 Configuración de Seguridad

### Para Desarrollo (Actual)
- DEBUG = True
- Claves por defecto simples
- CORS permisivo
- SSL deshabilitado

### Para Producción (Cambiar antes de deploy)
- Generar SECRET_KEY nueva
- Configurar ALLOWED_HOSTS específicos
- Habilitar SSL/HTTPS
- Configurar claves de Stripe reales
- Configurar backup de base de datos

---

## 📊 Monitoreo y Logs

### Ubicaciones de Logs
- **Django**: `./logs/django.log`
- **Celery**: `./logs/celery.log`
- **Nginx**: Logs de contenedor Docker
- **PostgreSQL**: Logs de contenedor Docker

### Scripts de Monitoreo
```bash
# Verificación completa de salud
./scripts/health_check.sh

# Ver uso de recursos
docker stats

# Ver logs en tiempo real de todos los servicios
docker-compose logs -f
```

---

## 🚀 Próximos Pasos

### Una vez que VeriHome esté funcionando:

1. **Acceder al Admin**: http://localhost:8000/admin
2. **Crear datos de prueba**: Propiedades, usuarios, contratos
3. **Probar API**: http://localhost:8000/api/v1/
4. **Verificar frontend**: http://localhost
5. **Monitorear Celery**: http://localhost:5555

### Desarrollo Continuo:
- Los archivos se sincronizan automáticamente (hot reload)
- Los cambios en Python requieren reiniciar el contenedor web
- Los cambios en frontend se rebuildan automáticamente

---

## 🆘 Soporte

### Scripts de Ayuda Disponibles:
- `./quick_start.sh` - Inicio rápido
- `./scripts/init_verihome_dev.sh` - Configuración completa
- `./scripts/health_check.sh` - Verificación de salud

### Información del Sistema:
```bash
# Ver configuración completa de Docker Compose
docker-compose config

# Ver imágenes construidas
docker images | grep verihome

# Ver volúmenes creados
docker volume ls | grep verihome
```

---

**✅ VeriHome está completamente configurado y listo para desarrollo.**

**🎯 Objetivo cumplido: Cualquier desarrollador puede levantar VeriHome en menos de 5 minutos usando `./quick_start.sh`**