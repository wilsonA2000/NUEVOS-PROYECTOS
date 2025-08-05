# Configuración de Servidor Único - VeriHome

Este documento explica cómo VeriHome está configurado para funcionar con un solo servidor, tanto en desarrollo como en producción.

## Arquitectura

### Desarrollo
- **Django**: Servidor en puerto 8000 (API + Admin)
- **Vite**: Servidor de desarrollo en puerto 3000 (Frontend React)
- **Proxy**: Vite redirige las llamadas `/api/*` a Django

### Producción
- **Django**: Servidor único que sirve tanto la API como el frontend React
- **Nginx**: Servidor web que actúa como proxy reverso (opcional con Docker)

## Estructura de Archivos

```
verihome/
├── frontend/                 # Aplicación React
│   ├── src/                 # Código fuente
│   ├── dist/                # Build de desarrollo (ignorado)
│   └── package.json         # Dependencias de Node.js
├── staticfiles/             # Archivos estáticos recolectados
│   └── frontend/           # Build del frontend React
├── templates/               # Templates de Django
│   └── react_app.html      # Template para servir React
├── manage_dev.py           # Script de gestión para desarrollo
├── build_frontend.py       # Script para construir frontend
├── deploy.py               # Script de despliegue
├── nginx.conf              # Configuración de nginx
└── docker-compose.yml      # Configuración de Docker
```

## Comandos de Desarrollo

### Script de Gestión (`manage_dev.py`)

```bash
# Instalar todas las dependencias
python manage_dev.py install

# Construir el frontend
python manage_dev.py build

# Ejecutar solo Django
python manage_dev.py django

# Ejecutar solo el frontend en desarrollo
python manage_dev.py frontend

# Ejecutar ambos servidores
python manage_dev.py both

# Recolectar archivos estáticos
python manage_dev.py static

# Ejecutar migraciones
python manage_dev.py migrate

# Crear superusuario
python manage_dev.py superuser

# Abrir shell de Django
python manage_dev.py shell

# Ejecutar pruebas
python manage_dev.py test
```

### Script de Despliegue (`deploy.py`)

```bash
# Verificar dependencias
python deploy.py check

# Construir para producción
python deploy.py build

# Desplegar con Docker
python deploy.py deploy

# Iniciar servicios
python deploy.py start

# Detener servicios
python deploy.py stop

# Ver logs
python deploy.py logs

# Limpiar build
python deploy.py clean

# Despliegue completo
python deploy.py full
```

## Configuración de URLs

### Desarrollo
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000/api/v1/
- **Admin**: http://localhost:8000/admin/

### Producción
- **Aplicación**: http://localhost (o dominio)
- **API**: http://localhost/api/v1/
- **Admin**: http://localhost/admin/

## Flujo de Trabajo

### Desarrollo Local

1. **Instalar dependencias**:
   ```bash
   python manage_dev.py install
   ```

2. **Ejecutar migraciones**:
   ```bash
   python manage_dev.py migrate
   ```

3. **Iniciar servidores**:
   ```bash
   python manage_dev.py both
   ```

4. **Acceder a la aplicación**:
   - Frontend: http://localhost:3000
   - API: http://localhost:8000/api/v1/
   - Admin: http://localhost:8000/admin/

### Producción

1. **Construir el frontend**:
   ```bash
   python build_frontend.py
   ```

2. **Recolectar archivos estáticos**:
   ```bash
   python manage.py collectstatic --noinput
   ```

3. **Configurar servidor web** (nginx, Apache, etc.)

### Con Docker

1. **Despliegue completo**:
   ```bash
   python deploy.py full
   ```

2. **Acceder a la aplicación**:
   - Aplicación: http://localhost
   - Admin: http://localhost/admin/

## Configuración de la API

El frontend está configurado para usar rutas relativas:

- **Desarrollo**: `/api` (proxy de Vite)
- **Producción**: `/api/v1` (ruta directa)

Esto permite que la misma aplicación funcione en ambos entornos sin cambios.

## Archivos de Configuración

### Vite (`frontend/vite.config.ts`)
- Configura el build para salir a `../staticfiles/frontend`
- Configura el proxy para desarrollo
- Optimiza el bundle con chunks

### Django (`verihome/settings.py`)
- Incluye `staticfiles/frontend` en `STATICFILES_DIRS`
- Configura CORS para desarrollo
- Configura `ALLOWED_HOSTS` correctamente

### URLs (`verihome/urls.py`)
- Configura catch-all para rutas del frontend
- Mantiene rutas de API y admin separadas
- Sirve el frontend React en producción

### Nginx (`nginx.conf`)
- Configura proxy reverso para Django
- Sirve archivos estáticos directamente
- Configura cache y compresión
- Maneja rutas del frontend React

## Ventajas de esta Configuración

1. **Simplicidad**: Un solo servidor en producción
2. **Rendimiento**: Archivos estáticos servidos por nginx
3. **Desarrollo**: Hot reload del frontend
4. **Despliegue**: Proceso automatizado
5. **Escalabilidad**: Fácil de escalar horizontalmente
6. **Mantenimiento**: Menos componentes que mantener

## Troubleshooting

### Frontend no se carga
1. Verificar que el build existe: `ls staticfiles/frontend/`
2. Reconstruir: `python build_frontend.py`
3. Recolectar estáticos: `python manage.py collectstatic`

### API no responde
1. Verificar que Django está corriendo
2. Verificar configuración de CORS
3. Verificar rutas de API en `urls.py`

### Docker no funciona
1. Verificar que Docker está instalado
2. Verificar que los puertos están libres
3. Ver logs: `python deploy.py logs`

## Migración desde Configuración Anterior

Si tienes una configuración anterior con servidores separados:

1. **Backup**: Hacer backup de la configuración actual
2. **Actualizar**: Aplicar los cambios de este setup
3. **Probar**: Probar en desarrollo primero
4. **Desplegar**: Usar los nuevos scripts de despliegue

## Soporte

Para problemas específicos de esta configuración:

1. Revisar los logs de Django
2. Verificar la configuración de nginx
3. Comprobar que los archivos estáticos están en su lugar
4. Verificar las variables de entorno 