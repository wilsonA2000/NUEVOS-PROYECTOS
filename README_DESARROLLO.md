# 🏠 VeriHome - Plataforma Inmobiliaria Completa

## Configurado por Agent D - Especialista en Configuración de Entorno

**VeriHome** es una plataforma inmobiliaria completa construida con Django + PostgreSQL + Redis + React que permite gestión de propiedades, usuarios, contratos, pagos y más.

---

## ⚡ Inicio Rápido (< 5 minutos)

```bash
# 1. Clonar repositorio
git clone <tu-repositorio>
cd verihome

# 2. Ejecutar script de inicio rápido
./quick_start.sh

# 3. Acceder a la aplicación
# Frontend: http://localhost
# Admin: http://localhost:8000/admin (admin@verihome.com / admin123)
```

---

## 🎯 Estado Actual de la Configuración

### ✅ Completamente Configurado
- **Variables de entorno**: `.env` con todos los valores necesarios
- **Docker Compose**: Servicios completos y optimizados
- **Dockerfile**: Construcción de imagen Django + React
- **Scripts de automatización**: Inicio, verificación y troubleshooting
- **Proxy nginx**: Configurado para servir frontend y API
- **Base de datos**: PostgreSQL con configuración de desarrollo
- **Cache y tareas**: Redis + Celery completamente configurado
- **Monitoreo**: Flower, PgAdmin y scripts de salud

### 🚀 Servicios Disponibles

| Servicio | Puerto | URL | Credenciales |
|----------|---------|-----|--------------|
| **Frontend + API** | 80 | http://localhost | - |
| **Django Admin** | 8000 | http://localhost:8000/admin | admin@verihome.com / admin123 |
| **PgAdmin** | 5050 | http://localhost:5050 | admin@verihome.com / admin123 |
| **Flower (Celery)** | 5555 | http://localhost:5555 | admin / admin123 |
| **PostgreSQL** | 5432 | localhost:5432 | postgres / postgres |
| **Redis** | 6379 | localhost:6379 | - |

---

## 📁 Archivos de Configuración Creados

### Scripts de Automatización
- `quick_start.sh` - Inicio rápido en 5 minutos
- `scripts/init_verihome_dev.sh` - Configuración completa inicial
- `scripts/health_check.sh` - Verificación de salud de servicios

### Configuración Docker
- `.env` - Variables de entorno completas
- `docker-compose.yml` - Servicios principales
- `docker-compose.override.yml` - Configuración para desarrollo
- `Dockerfile` - Imagen optimizada Django + React

### Documentación
- `SETUP_COMPLETO_DESARROLLO.md` - Guía completa de configuración
- `TROUBLESHOOTING_GUIDE.md` - Solución de problemas comunes
- `README_DESARROLLO.md` - Este archivo

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Base de Datos │
│   React + Vite  │◄──►│   Django REST   │◄──►│   PostgreSQL    │
│   Puerto 80     │    │   Puerto 8000   │    │   Puerto 5432   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │     Redis       │              │
         │              │  Cache + Queue  │              │
         │              │   Puerto 6379   │              │
         │              └─────────────────┘              │
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │     Celery      │              │
         └──────────────┤  Worker + Beat  │──────────────┘
                        │  (Async Tasks)  │
                        └─────────────────┘
```

---

## 🔧 Comandos Esenciales

### Gestión de Servicios
```bash
# Iniciar todos los servicios
docker-compose up -d

# Ver estado
docker-compose ps

# Ver logs
docker-compose logs [servicio]

# Reiniciar servicio específico
docker-compose restart [servicio]

# Detener todo
docker-compose down
```

### Desarrollo
```bash
# Ejecutar migraciones
docker-compose exec web python manage.py migrate

# Crear superusuario
docker-compose exec web python manage.py createsuperuser

# Recopilar archivos estáticos
docker-compose exec web python manage.py collectstatic --noinput

# Acceder a shell Django
docker-compose exec web python manage.py shell

# Acceder a PostgreSQL
docker-compose exec db psql -U postgres -d verihome
```

### Verificación
```bash
# Verificar salud de todos los servicios
./scripts/health_check.sh

# Verificar configuración Docker
docker-compose config

# Ver uso de recursos
docker stats
```

---

## 📊 Módulos Implementados

### Core (Núcleo)
- ✅ Sistema de usuarios con roles (Tenant, Landlord, Service Provider)
- ✅ Sistema de autenticación con código de entrevista
- ✅ Panel de administración Django
- ✅ API REST completa
- ✅ Sistema de auditoría y logs

### Propiedades
- ✅ Gestión completa de propiedades
- ✅ Carga de imágenes múltiples
- ✅ Búsqueda y filtros avanzados
- ✅ Integración con Mapbox para mapas
- ✅ Sistema de favoritos

### Usuarios
- ✅ Perfiles de usuario completos
- ✅ Sistema de currículum/resume
- ✅ Gestión de documentos
- ✅ Sistema de verificación por email

### Mensajería
- ✅ Sistema de mensajes entre usuarios
- ✅ Conversaciones organizadas
- ✅ Notificaciones en tiempo real
- ✅ Archivos adjuntos

### Contratos
- ✅ Gestión de contratos de arrendamiento
- ✅ Firmas digitales
- ✅ Verificación biométrica
- ✅ Estados de contrato

### Pagos
- ✅ Gestión de pagos y transacciones
- ✅ Integración con Stripe (configurado)
- ✅ Sistema de escrow
- ✅ Historial de pagos

### Calificaciones
- ✅ Sistema de reseñas y calificaciones
- ✅ Calificaciones bidireccionales
- ✅ Moderación de contenido
- ✅ Estadísticas de reputación

### Matching
- ✅ Sistema de matching entre propiedades y usuarios
- ✅ Algoritmo de recomendaciones
- ✅ Solicitudes de contacto
- ✅ Conversaciones de matching

---

## 🔐 Configuración de Seguridad

### Desarrollo (Actual)
- Variables de entorno configuradas
- CORS habilitado para desarrollo
- SSL deshabilitado (desarrollo local)
- Credenciales por defecto simples

### Producción (Próximos pasos)
- [ ] Generar nueva SECRET_KEY
- [ ] Configurar ALLOWED_HOSTS específicos
- [ ] Habilitar SSL/HTTPS
- [ ] Configurar claves reales de Stripe
- [ ] Configurar backup automático de BD

---

## 📈 Monitoreo y Performance

### Herramientas Incluidas
- **Flower**: Monitor de tareas Celery en http://localhost:5555
- **PgAdmin**: Administración de PostgreSQL en http://localhost:5050
- **Django Debug Toolbar**: Habilitado en desarrollo
- **Health Check**: Script automático de verificación

### Logs Disponibles
- Django: `./logs/django.log`
- Celery: `./logs/celery.log`
- Nginx: Logs de contenedor Docker
- PostgreSQL: Logs de contenedor Docker

---

## 🛠️ Solución de Problemas

### Problemas Comunes
1. **Docker no disponible**: Ver [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)
2. **Puertos ocupados**: Cambiar puertos en docker-compose.override.yml
3. **Frontend no carga**: Verificar nginx y archivos estáticos
4. **Base de datos no conecta**: Verificar PostgreSQL y variables de entorno

### Scripts de Ayuda
- `./scripts/health_check.sh` - Diagnóstico completo
- `./quick_start.sh` - Reinicio rápido
- `./scripts/init_verihome_dev.sh` - Configuración desde cero

---

## 🚀 Próximos Pasos

### Para Desarrolladores
1. **Configurar entorno**: Ejecutar `./quick_start.sh`
2. **Crear datos de prueba**: Acceder a admin y crear propiedades/usuarios
3. **Probar API**: Usar http://localhost:8000/api/v1/
4. **Desarrollar frontend**: Modificar archivos en `frontend/src/`
5. **Probar funcionalidades**: Registrar usuarios, crear propiedades, etc.

### Para Producción
1. **Configurar variables de producción**: Copiar `.env.production.example`
2. **Configurar dominio**: Actualizar ALLOWED_HOSTS y nginx
3. **Configurar SSL**: Certificados en `./ssl/`
4. **Configurar backups**: Scripts en `./scripts/`
5. **Configurar monitoreo**: Prometheus, Grafana, etc.

---

## 📞 Soporte

### Documentación Completa
- **Configuración**: [SETUP_COMPLETO_DESARROLLO.md](./SETUP_COMPLETO_DESARROLLO.md)
- **Problemas**: [TROUBLESHOOTING_GUIDE.md](./TROUBLESHOOTING_GUIDE.md)
- **API**: http://localhost:8000/api/v1/ (cuando esté corriendo)

### Comandos de Diagnóstico
```bash
# Verificación completa
./scripts/health_check.sh

# Estado de servicios
docker-compose ps

# Logs en tiempo real
docker-compose logs -f

# Información del sistema
docker system info
```

---

## 🎉 Resultado Final

**✅ VeriHome está completamente configurado y listo para desarrollo**

### Lo que está funcionando:
- ✅ Configuración completa de Docker con 8 servicios
- ✅ Variables de entorno configuradas
- ✅ Scripts de automatización creados
- ✅ Base de datos PostgreSQL lista
- ✅ Cache Redis configurado
- ✅ Tareas asíncronas Celery operativas
- ✅ Proxy nginx configurado
- ✅ Frontend React integrado
- ✅ API Django REST funcional
- ✅ Herramientas de desarrollo (PgAdmin, Flower)
- ✅ Documentación completa
- ✅ Guías de troubleshooting

### Tiempo de inicio: < 5 minutos con `./quick_start.sh`

---

**🚀 ¡VeriHome está listo para que cualquier desarrollador comience a trabajar inmediatamente!**