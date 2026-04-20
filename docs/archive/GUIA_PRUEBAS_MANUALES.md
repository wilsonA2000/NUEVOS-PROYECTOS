# 🧪 GUÍA DE PRUEBAS MANUALES POST-AUDITORÍA
## Proyecto VeriHome - Comandos de Verificación

**Fecha:** 17 de Noviembre, 2025
**Estado:** Post-Auditoría Quirúrgica
**Objetivo:** Verificar que todo funcione correctamente

---

## 📋 CHECKLIST DE PRUEBAS

### ✅ Fase 1: Verificación de Entorno
- [ ] Backend funciona
- [ ] Frontend funciona
- [ ] Base de datos conecta
- [ ] Redis conecta (opcional)
- [ ] Migraciones OK
- [ ] Tests pasan

### ✅ Fase 2: Verificación de Funcionalidad
- [ ] API endpoints responden
- [ ] Frontend carga
- [ ] Autenticación funciona
- [ ] WebSockets funcionan
- [ ] Media files accesibles

---

## 🔧 COMANDOS DE PRUEBA - BACKEND

### 1. Verificar Entorno Python

```bash
# Ver versión de Python
python3 --version

# Activar entorno virtual (si existe)
source venv/bin/activate
# O en Windows:
venv\Scripts\activate

# Verificar que Django está instalado
python3 -c "import django; print(django.get_version())"
```

**Resultado Esperado:**
```
Python 3.10+
Django 4.2.7
```

---

### 2. Verificar Dependencias Backend

```bash
# Ver dependencias instaladas
pip list | head -20

# Verificar dependencias críticas
pip show django djangorestframework django-allauth channels celery

# Si falta algo, instalar:
pip install -r requirements.txt
```

**Resultado Esperado:**
```
✅ Todas las dependencias instaladas
✅ Sin errores de compatibilidad
```

---

### 3. Verificar Migraciones Django

```bash
# Ver estado de migraciones
python3 manage.py showmigrations

# Ver migraciones pendientes
python3 manage.py showmigrations | grep "\[ \]"

# Si hay pendientes, aplicar:
# python3 manage.py migrate
```

**Resultado Esperado:**
```
admin
 [X] 0001_initial
 [X] 0002_logentry_remove_auto_add
...
contracts
 [X] 0001_initial
 [X] 0002_initial
...
(Todas con [X])
```

---

### 4. Verificar Configuración

```bash
# Verificar SECRET_KEY está configurada
python3 manage.py shell -c "from django.conf import settings; print('SECRET_KEY:', 'OK' if settings.SECRET_KEY else 'ERROR')"

# Verificar DEBUG mode
python3 manage.py shell -c "from django.conf import settings; print('DEBUG:', settings.DEBUG)"

# Verificar ALLOWED_HOSTS
python3 manage.py shell -c "from django.conf import settings; print('ALLOWED_HOSTS:', settings.ALLOWED_HOSTS)"
```

**Resultado Esperado:**
```
SECRET_KEY: OK
DEBUG: True
ALLOWED_HOSTS: ['localhost', '127.0.0.1', ...]
```

---

### 5. Verificar Base de Datos

```bash
# Verificar conexión a BD
python3 manage.py check database

# Ver tablas creadas
python3 manage.py dbshell
# Dentro de psql:
# \dt
# \q para salir

# O con SQLite:
# sqlite3 db.sqlite3
# .tables
# .quit
```

**Resultado Esperado:**
```
✅ Conexión exitosa
✅ Tablas creadas
```

---

### 6. Correr Tests Backend

```bash
# Correr todos los tests
python3 manage.py test

# Correr tests de una app específica
python3 manage.py test contracts
python3 manage.py test properties
python3 manage.py test users

# Correr con coverage
python3 -m pytest --cov=. --cov-report=html

# O usar el script
python3 run_tests_coverage.py
```

**Resultado Esperado:**
```
Ran X tests in Y.Zs
OK
Coverage: 80%+
```

---

### 7. INICIAR SERVIDOR BACKEND

```bash
# Método 1: Servidor de desarrollo Django
python3 manage.py runserver

# Método 2: Con IP específica
python3 manage.py runserver 0.0.0.0:8000

# Método 3: Con Daphne (para WebSockets)
daphne -b 0.0.0.0 -p 8000 verihome.asgi:application
```

**Resultado Esperado:**
```
Starting development server at http://127.0.0.1:8000/
Quit the server with CONTROL-C.
```

**Verificar en navegador:**
```
http://localhost:8000/admin/
http://localhost:8000/api/v1/
```

---

### 8. Verificar Endpoints API

```bash
# Verificar API health
curl http://localhost:8000/api/v1/ | python3 -m json.tool

# Ver endpoints disponibles (si tienes browsable API)
# Abrir en navegador: http://localhost:8000/api/v1/

# Verificar endpoint específico
curl http://localhost:8000/api/v1/properties/ | python3 -m json.tool
```

**Resultado Esperado:**
```json
{
  "status": "ok",
  "version": "1.0"
}
```

---

## ⚛️ COMANDOS DE PRUEBA - FRONTEND

### 1. Verificar Node y NPM

```bash
# Ver versión de Node
node --version

# Ver versión de NPM
npm --version

# Navegar a frontend
cd frontend
```

**Resultado Esperado:**
```
Node: v18+ o v20+
NPM: v9+ o v10+
```

---

### 2. Verificar Dependencias Frontend

```bash
# Ver dependencias instaladas
npm list --depth=0

# Verificar paquetes críticos
npm list react react-dom @mui/material vite typescript

# Si falta algo, instalar:
npm install
```

**Resultado Esperado:**
```
✅ Todas las dependencias instaladas
✅ Sin errores de peer dependencies
```

---

### 3. Verificar package.json

```bash
# Ver scripts disponibles
cat package.json | grep -A 20 '"scripts"'

# Verificar versiones principales
cat package.json | grep -E '(react|vite|typescript|@mui)'
```

**Resultado Esperado:**
```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "test": "vitest",
  ...
}
```

---

### 4. Correr Tests Frontend

```bash
# Asegúrate de estar en /frontend
cd frontend

# Correr todos los tests
npm test

# Correr tests con coverage
npm run test:coverage

# Correr tests específicos
npm test src/components/contracts

# Correr tests en watch mode
npm run test:watch
```

**Resultado Esperado:**
```
Test Files  X passed (X)
Tests  Y passed (Y)
Duration  Z.XXs
✅ Coverage: 80%+
```

---

### 5. Verificar TypeScript

```bash
# Verificar errores de TypeScript (sin compilar)
npm run type-check

# O manualmente
npx tsc --noEmit
```

**Resultado Esperado:**
```
✅ No errors
```

---

### 6. Verificar ESLint y Prettier

```bash
# Linter
npm run lint

# Fix automático
npm run lint:fix

# Prettier
npm run format
```

**Resultado Esperado:**
```
✅ No linting errors
✅ Files formatted
```

---

### 7. INICIAR SERVIDOR FRONTEND (DESARROLLO)

```bash
# Asegúrate de estar en /frontend
cd frontend

# Iniciar servidor de desarrollo
npm run dev

# Con host específico
npm run dev -- --host 0.0.0.0

# Con puerto específico
npm run dev -- --port 5173
```

**Resultado Esperado:**
```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h to show help
```

**Verificar en navegador:**
```
http://localhost:5173/
```

---

### 8. Build de Producción Frontend

```bash
# Build para producción
npm run build

# Build con análisis de bundle
npm run build:analyze

# Preview del build
npm run preview
```

**Resultado Esperado:**
```
✓ built in XXXms
dist/index.html
dist/assets/...
```

---

## 🔄 COMANDOS COMPLETOS - INICIAR TODO

### Opción 1: Backend + Frontend (2 Terminales)

**Terminal 1 - Backend:**
```bash
# Desde raíz del proyecto
python3 manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Acceder:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Admin: http://localhost:8000/admin

---

### Opción 2: Con Docker (si está configurado)

```bash
# Construir contenedores
docker-compose build

# Iniciar servicios
docker-compose up

# En background
docker-compose up -d

# Ver logs
docker-compose logs -f
```

---

## 🧪 PRUEBAS DE FUNCIONALIDAD

### 1. Probar Autenticación

**Backend:**
```bash
# Crear superuser (si no existe)
python3 manage.py createsuperuser

# Username: admin
# Email: admin@verihome.com
# Password: (tu password)
```

**Frontend:**
```
1. Abrir http://localhost:5173
2. Ir a /login
3. Ingresar credenciales
4. Verificar que redirija al dashboard
```

---

### 2. Probar API Endpoints

```bash
# Properties
curl http://localhost:8000/api/v1/properties/

# Contracts
curl http://localhost:8000/api/v1/contracts/

# Users
curl http://localhost:8000/api/v1/users/profile/

# Con autenticación (si tienes token)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/api/v1/properties/
```

---

### 3. Probar WebSockets (si aplica)

```bash
# Verificar que Daphne esté corriendo
daphne -b 0.0.0.0 -p 8000 verihome.asgi:application

# En frontend, verificar conexión WebSocket en consola del navegador
# Debe ver: "WebSocket conectado" o similar
```

---

### 4. Probar Media Files

```bash
# Verificar que media/ sea accesible
ls media/properties/

# En navegador:
http://localhost:8000/media/properties/images/
```

---

## 🐛 SOLUCIÓN DE PROBLEMAS

### Problema: Backend no inicia

```bash
# Ver errores detallados
python3 manage.py runserver --traceback

# Verificar migraciones
python3 manage.py showmigrations | grep "\[ \]"

# Aplicar migraciones pendientes
python3 manage.py migrate
```

---

### Problema: Frontend no inicia

```bash
# Limpiar cache
rm -rf node_modules/.vite
rm -rf dist

# Reinstalar dependencias
rm -rf node_modules
npm install

# Verificar puerto no esté ocupado
lsof -i:5173
# Si está ocupado, matar proceso:
kill -9 <PID>
```

---

### Problema: Tests fallan

```bash
# Ver tests con output detallado
python3 manage.py test --verbosity=2

# Frontend
npm test -- --reporter=verbose
```

---

### Problema: Error de CORS

```bash
# Verificar ALLOWED_HOSTS en settings.py
# Verificar CORS_ALLOWED_ORIGINS en settings.py

# Debe incluir:
ALLOWED_HOSTS = ['localhost', '127.0.0.1']
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
```

---

## ✅ CHECKLIST FINAL

### Antes de hacer Push:

- [ ] ✅ Backend inicia sin errores
- [ ] ✅ Frontend inicia sin errores
- [ ] ✅ Tests backend pasan (80%+ coverage)
- [ ] ✅ Tests frontend pasan (80%+ coverage)
- [ ] ✅ No hay errores de TypeScript
- [ ] ✅ No hay errores de ESLint
- [ ] ✅ API endpoints responden
- [ ] ✅ Login funciona
- [ ] ✅ Build de producción funciona
- [ ] ✅ Media files accesibles
- [ ] ✅ Migraciones aplicadas
- [ ] ✅ .env configurado

---

## 📊 COMANDOS DE VERIFICACIÓN RÁPIDA

```bash
# TODO EN UNO - Backend
python3 manage.py check && \
python3 manage.py showmigrations | grep "\[ \]" && \
python3 manage.py test --failfast

# TODO EN UNO - Frontend
cd frontend && \
npm run type-check && \
npm run lint && \
npm test

# Ver estado del proyecto
echo "Backend:" && python3 manage.py runserver --version
echo "Frontend:" && cd frontend && npm list react vite typescript | grep -E '(react|vite|typescript)'
```

---

## 🎯 PRUEBA COMPLETA END-TO-END

### Script de Prueba Completa:

```bash
#!/bin/bash

echo "🧪 INICIANDO PRUEBAS COMPLETAS..."

# Backend
echo "\n📦 1. Verificando Backend..."
python3 manage.py check
python3 manage.py test --failfast

# Frontend
echo "\n⚛️ 2. Verificando Frontend..."
cd frontend
npm run type-check
npm test

# Build
echo "\n🏗️ 3. Build de producción..."
npm run build

echo "\n✅ TODAS LAS PRUEBAS COMPLETADAS"
```

Guarda como `test_complete.sh` y ejecuta:
```bash
chmod +x test_complete.sh
./test_complete.sh
```

---

## 📞 AYUDA ADICIONAL

Si encuentras problemas, revisa:
1. `AUDIT_REPORT_COMPLETE.md` - Detalles de auditoría
2. `REPORTE_FINAL_AUDITORIA.md` - Resumen ejecutivo
3. `docs/` - Documentación del proyecto
4. `CLAUDE.md` - Guía del proyecto

---

**✨ LISTO PARA PROBAR ✨**

*Generado después de la Auditoría Quirúrgica*
*4 Agentes Especializados - Noviembre 2025*
