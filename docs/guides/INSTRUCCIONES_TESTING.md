# INSTRUCCIONES PARA EJECUTAR TESTING DE APIs

## PASO 1: PREPARAR EL ENTORNO

### 1.1 Matar procesos colgados
```bash
# Buscar procesos de Django
ps aux | grep "manage.py runserver"

# Matar procesos (reemplazar PID con los IDs encontrados)
kill -9 3099
kill -9 9737

# O matar todos de una vez
pkill -9 -f "manage.py runserver"
```

### 1.2 Verificar estado de la base de datos
```bash
cd /mnt/c/Users/wilso/Desktop/"NUEVOS PROYECTOS"

# Verificar migraciones pendientes
python3 manage.py showmigrations

# Aplicar migraciones si hay pendientes
python3 manage.py migrate
```

### 1.3 Iniciar Redis (opcional pero recomendado)
```bash
# Verificar si Redis está instalado
redis-cli ping

# Si no está instalado:
sudo apt install redis-server

# Iniciar Redis
sudo systemctl start redis
sudo systemctl enable redis

# Verificar que esté corriendo
redis-cli ping
# Debe responder: PONG
```

### 1.4 Iniciar el servidor Django
```bash
cd /mnt/c/Users/wilso/Desktop/"NUEVOS PROYECTOS"

# Opción 1: Servidor de desarrollo simple
python3 manage.py runserver

# Opción 2: Con verbose output
python3 manage.py runserver --verbosity 2

# Opción 3: En un puerto diferente
python3 manage.py runserver 8080

# Opción 4: Con acceso desde red (WARNING: solo desarrollo)
python3 manage.py runserver 0.0.0.0:8000
```

### 1.5 Verificar que el servidor esté corriendo
```bash
# En otra terminal, verificar el puerto
netstat -tulpn | grep 8000

# O usar curl para test rápido
curl http://localhost:8000/admin/

# Debería retornar HTML del admin de Django
```

---

## PASO 2: EJECUTAR EL SCRIPT DE TESTING

### 2.1 Dar permisos de ejecución
```bash
cd /mnt/c/Users/wilso/Desktop/"NUEVOS PROYECTOS"
chmod +x test_backend_apis.py
```

### 2.2 Ejecutar el testing completo
```bash
# Ejecutar con Python 3
python3 test_backend_apis.py

# El script hará:
# 1. Crear/obtener usuario admin
# 2. Generar token JWT
# 3. Testear 85 endpoints
# 4. Generar reporte en REPORTE_TESTING_APIS.md
```

### 2.3 Ver resultados en tiempo real
Los resultados se mostrarán en consola con colores:
- **Verde** ✅ = Endpoint funciona correctamente
- **Rojo** ❌ = Endpoint con error
- **Amarillo** ⚠️ = Warning (timeout, conexión lenta)

---

## PASO 3: REVISAR REPORTES GENERADOS

### Archivos de reporte disponibles:

1. **`RESUMEN_EJECUTIVO_TESTING.md`** (LEER PRIMERO)
   - Vista general de hallazgos
   - Issues priorizados
   - Recomendaciones accionables
   - **👉 EMPEZAR POR AQUÍ**

2. **`REPORTE_AUDITORIA_APIS_COMPLETO.md`**
   - Análisis detallado de cada módulo (10 módulos)
   - Tablas de endpoints por prioridad
   - Issues con análisis de impacto
   - Recomendaciones técnicas detalladas

3. **`REPORTE_TESTING_APIS.md`**
   - Resultados de testing funcional
   - Status codes de cada endpoint
   - Errores específicos encontrados
   - Tabla resumen por módulo

### Abrir reportes:
```bash
# Con editor de texto
code RESUMEN_EJECUTIVO_TESTING.md

# O con markdown viewer
grip RESUMEN_EJECUTIVO_TESTING.md
```

---

## PASO 4: TESTING AVANZADO (OPCIONAL)

### 4.1 Crear usuario de prueba manualmente
```bash
python3 manage.py shell

# En el shell de Django:
from django.contrib.auth import get_user_model
User = get_user_model()

# Crear usuario tenant
tenant = User.objects.create_user(
    email='tenant@test.com',
    password='test123',
    first_name='Test',
    last_name='Tenant',
    role='tenant'
)

# Crear usuario landlord
landlord = User.objects.create_user(
    email='landlord@test.com',
    password='test123',
    first_name='Test',
    last_name='Landlord',
    role='landlord'
)

exit()
```

### 4.2 Obtener tokens JWT manualmente
```bash
# Usando curl
curl -X POST http://localhost:8000/api/v1/users/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@verihome.com", "password": "admin123"}'

# Guardar el access token de la respuesta
# Ejemplo de respuesta:
# {"access": "eyJ0eXAiOiJKV1Q...", "refresh": "eyJ0eXAiOiJKV1Q..."}
```

### 4.3 Testear endpoint específico
```bash
# Reemplazar TOKEN con el access token obtenido
TOKEN="eyJ0eXAiOiJKV1Q..."

# Test GET a un endpoint autenticado
curl -X GET http://localhost:8000/api/v1/users/auth/me/ \
  -H "Authorization: Bearer $TOKEN"

# Test POST para crear propiedad
curl -X POST http://localhost:8000/api/v1/properties/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Apartamento de prueba",
    "description": "Descripción de prueba",
    "price": 1000000,
    "property_type": "apartment",
    "transaction_type": "rent"
  }'
```

### 4.4 Testear flujo biométrico (simulado)
```bash
# 1. Crear un contrato primero
curl -X POST http://localhost:8000/api/v1/contracts/contracts/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'

# 2. Iniciar autenticación biométrica
CONTRACT_ID="uuid-del-contrato"
curl -X POST http://localhost:8000/api/v1/contracts/$CONTRACT_ID/start-biometric-authentication/ \
  -H "Authorization: Bearer $TOKEN"

# 3. Verificar estado
curl -X GET http://localhost:8000/api/v1/contracts/$CONTRACT_ID/auth/status/ \
  -H "Authorization: Bearer $TOKEN"
```

---

## PASO 5: DEBUGGING SI ALGO FALLA

### 5.1 Ver logs de Django
```bash
# Logs del servidor (en la terminal donde corre)
# Buscar errores en rojo

# Logs específicos de una app
python3 manage.py shell
>>> import logging
>>> logger = logging.getLogger('django')
>>> logger.debug('Test log')
```

### 5.2 Problemas comunes

#### Error: "Connection refused"
```bash
# Verificar que el servidor esté corriendo
ps aux | grep "manage.py runserver"

# Verificar el puerto
netstat -tulpn | grep 8000

# Reiniciar servidor
pkill -9 -f "manage.py runserver"
python3 manage.py runserver
```

#### Error: "Redis connection failed"
```bash
# El sistema usará fallback local (OK para desarrollo)
# Para producción, instalar Redis:
sudo apt install redis-server
sudo systemctl start redis
```

#### Error: "Database locked"
```bash
# Si usando SQLite, cerrar todas las conexiones
pkill -9 -f "manage.py"

# Reiniciar servidor
python3 manage.py runserver
```

#### Error: "Port 8000 already in use"
```bash
# Encontrar qué proceso usa el puerto
lsof -i:8000

# Matar ese proceso
kill -9 <PID>

# O usar otro puerto
python3 manage.py runserver 8080
```

### 5.3 Verificar configuración
```bash
# Verificar settings de Django
python3 manage.py diffsettings

# Verificar base de datos
python3 manage.py dbshell
# Luego: .tables (SQLite) o \dt (PostgreSQL)

# Verificar migraciones
python3 manage.py showmigrations
```

---

## PASO 6: INTERPRETAR RESULTADOS

### Códigos de status HTTP esperados:

- **200 OK** ✅ - Solicitud exitosa (GET, PUT, PATCH)
- **201 Created** ✅ - Recurso creado (POST)
- **204 No Content** ✅ - Eliminación exitosa (DELETE)
- **400 Bad Request** ⚠️ - Error en la solicitud (validación)
- **401 Unauthorized** ⚠️ - Sin autenticación o token inválido
- **403 Forbidden** ⚠️ - Sin permisos para la operación
- **404 Not Found** ❌ - Endpoint no existe o recurso no encontrado
- **500 Internal Server Error** ❌ - Error del servidor (revisar logs)

### Métricas de éxito:

- **90-100%** = Sistema funcionando correctamente
- **70-89%** = Sistema funcional con algunos problemas
- **50-69%** = Problemas significativos, requiere atención
- **< 50%** = Sistema crítico, requiere investigación urgente

---

## PASO 7: ACCIONES POST-TESTING

### Si el testing es exitoso (>90%):
1. ✅ Revisar warnings para optimización
2. ✅ Implementar mejoras de seguridad (rate limiting)
3. ✅ Añadir tests automatizados
4. ✅ Configurar monitoreo (Sentry)
5. ✅ Preparar para staging/producción

### Si hay problemas (<70%):
1. ❌ Revisar logs de Django en detalle
2. ❌ Verificar configuración de base de datos
3. ❌ Revisar permisos de endpoints
4. ❌ Verificar que todas las migraciones estén aplicadas
5. ❌ Contactar al equipo de desarrollo

---

## COMANDOS RÁPIDOS (CHEAT SHEET)

```bash
# SETUP RÁPIDO
cd /mnt/c/Users/wilso/Desktop/"NUEVOS PROYECTOS"
pkill -9 -f "manage.py runserver"
python3 manage.py migrate
python3 manage.py runserver &

# TESTING
python3 test_backend_apis.py

# VER RESULTADOS
cat REPORTE_TESTING_APIS.md | grep "❌"  # Ver solo errores
cat REPORTE_TESTING_APIS.md | grep "✅"  # Ver solo éxitos
wc -l REPORTE_TESTING_APIS.md           # Contar líneas del reporte

# CLEANUP
pkill -9 -f "manage.py runserver"
rm -f REPORTE_TESTING_APIS.md
```

---

## CONTACTO Y SOPORTE

Si encuentras problemas o tienes dudas:

1. **Revisar logs:** `logs/django.log` (si está configurado)
2. **Revisar documentación:** `CLAUDE.md` en la raíz del proyecto
3. **Revisar código:** Los archivos `*api_views.py` y `*api_urls.py` de cada app
4. **Contactar al equipo:** Incluir los reportes generados

---

**Última actualización:** 12 de Octubre de 2025
**Mantenido por:** AGENTE 1 - BACKEND API TESTING
**Versión del script:** test_backend_apis.py v1.0
