# 📋 PLAN DE ORGANIZACIÓN - PROYECTO VERIHOME

**Fecha**: 29 de Septiembre, 2025
**Objetivo**: Limpiar y organizar la raíz del proyecto siguiendo estándares profesionales

---

## 🎯 PROBLEMAS IDENTIFICADOS

### ❌ Raíz del proyecto desordenada:
- **13 scripts Python** sueltos (debug, test, fix)
- **4 archivos Markdown** de sesiones dispersos
- **8 directorios de testing** diferentes
- **3+ directorios de entornos virtuales**
- **Directorios obsoletos**: `backend/`, `src/`, `sub_tasks/`
- **Archivos temporales**: `.temp_token`, `__pycache__/`
- **Múltiples `.env` files** (`.env`, `.env.local`, `.env.example`)

---

## 📂 ESTRUCTURA ACTUAL vs PROPUESTA

### ✅ ESTRUCTURA OBJETIVO (Profesional)

```
NUEVOS PROYECTOS/
│
├── 📁 apps/                          # Django apps (NUEVA CARPETA)
│   ├── contracts/
│   ├── core/
│   ├── dashboard/
│   ├── matching/
│   ├── messaging/
│   ├── payments/
│   ├── properties/
│   ├── ratings/
│   ├── requests/
│   ├── services/
│   └── users/
│
├── 📁 config/                        # Configuración del proyecto (RENOMBRAR verihome/)
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py
│   └── __init__.py
│
├── 📁 frontend/                      # React frontend (YA EXISTE - OK)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── 📁 scripts/                       # Scripts utilitarios (CONSOLIDAR)
│   ├── database/                     # Scripts de BD
│   │   ├── database_config.py
│   │   └── migrations_helpers.py
│   ├── debug/                        # Scripts de debugging
│   │   ├── check_contract_status.py
│   │   ├── check_workflow_status.py
│   │   ├── debug_contract_404.py
│   │   └── debug_contract_approval.py
│   ├── fixes/                        # Scripts de corrección
│   │   ├── clean_matching_processes.py
│   │   ├── fix_file_name_length.py
│   │   ├── fix_missing_contract.py
│   │   └── sync_biometric_contract.py
│   ├── testing/                      # Scripts de prueba
│   │   ├── test_biometric_endpoint.py
│   │   ├── test_document_upload.py
│   │   ├── test_guarantor_biometric_flow.py
│   │   └── test_sequential_biometric_flow.py
│   └── maintenance/                  # Scripts de mantenimiento
│       └── cleanup_old_files.py
│
├── 📁 tests/                         # CONSOLIDAR todos los tests aquí
│   ├── integration/                  # De backend_tests/
│   ├── unit/                         # De testing_scripts/
│   ├── performance/                  # De performance_tests/
│   └── conftest.py
│
├── 📁 docs/                          # Documentación (YA EXISTE - ORGANIZAR)
│   ├── api/                          # API docs
│   ├── architecture/                 # Diagramas arquitectura
│   ├── guides/                       # Guías de desarrollo
│   ├── sessions/                     # MOVER sesiones aquí
│   │   ├── SESION_20_SEPTIEMBRE_2025.md
│   │   └── SESION_23_SEPTIEMBRE_2025.md
│   └── reports/                      # Reportes técnicos
│
├── 📁 docker/                        # Docker configs (YA EXISTE - OK)
│   ├── postgres/
│   └── nginx/
│
├── 📁 deployment/                    # NUEVA: Configs de deployment
│   ├── nginx/                        # MOVER de raíz
│   ├── monitoring/                   # MOVER de raíz
│   └── backups/                      # MOVER de raíz
│
├── 📁 static/                        # RENOMBRAR staticfiles/
│   └── frontend/
│
├── 📁 media/                         # Uploads (YA EXISTE - OK)
│
├── 📁 templates/                     # Django templates (YA EXISTE - OK)
│
├── 📁 logs/                          # Application logs (YA EXISTE - OK)
│
├── 📁 .venv/                         # RENOMBRAR venv_ubuntu/ (estándar Python)
│
├── 📁 archived/                      # RENOMBRAR "ARCHIVOS INNECESARIOS/"
│   ├── archived-components/          # MOVER aquí
│   └── old-code/
│
├── 📄 manage.py                      # Django management (MANTENER)
├── 📄 requirements.txt               # Python deps (MANTENER)
├── 📄 .env                           # Environment vars (MANTENER)
├── 📄 .env.example                   # Template (MANTENER)
├── 📄 .gitignore                     # Git ignore (MANTENER)
├── 📄 README.md                      # Project readme (MANTENER)
├── 📄 CLAUDE.md                      # Claude context (MANTENER)
├── 📄 LICENSE                        # License (MANTENER)
│
└── 📄 .temp_token                    # ELIMINAR
```

---

## 🗂️ ACCIONES DETALLADAS POR CATEGORÍA

### 1️⃣ CREAR NUEVAS CARPETAS PRINCIPALES

```bash
# Crear estructura de apps
mkdir -p apps

# Crear carpeta de deployment
mkdir -p deployment/nginx
mkdir -p deployment/monitoring
mkdir -p deployment/backups

# Reorganizar tests
mkdir -p tests/integration
mkdir -p tests/unit
mkdir -p tests/performance

# Organizar documentación
mkdir -p docs/sessions
mkdir -p docs/architecture
mkdir -p docs/api
```

### 2️⃣ MOVER DJANGO APPS A `apps/`

```bash
# Mover todas las aplicaciones Django
mv contracts apps/
mv core apps/
mv dashboard apps/
mv matching apps/
mv messaging apps/
mv payments apps/
mv properties apps/
mv ratings apps/
mv requests apps/
mv services apps/
mv users apps/
```

**⚠️ IMPORTANTE**: Después de mover apps, actualizar:
- `config/settings.py` → `INSTALLED_APPS` paths
- Imports en todos los archivos que referencian estas apps

### 3️⃣ REORGANIZAR SCRIPTS

```bash
# Ya existe scripts/ - solo reorganizar contenido
mkdir -p scripts/debug
mkdir -p scripts/fixes
mkdir -p scripts/testing

# Mover scripts de debugging
mv check_contract_status.py scripts/debug/
mv check_workflow_status.py scripts/debug/
mv debug_contract_404.py scripts/debug/
mv debug_contract_approval.py scripts/debug/

# Mover scripts de fixes
mv clean_matching_processes.py scripts/fixes/
mv fix_file_name_length.py scripts/fixes/
mv fix_missing_contract.py scripts/fixes/
mv sync_biometric_contract.py scripts/fixes/

# Mover scripts de testing
mv test_biometric_endpoint.py scripts/testing/
mv test_document_upload.py scripts/testing/
mv test_guarantor_biometric_flow.py scripts/testing/
mv test_sequential_biometric_flow.py scripts/testing/
```

### 4️⃣ CONSOLIDAR TESTS

```bash
# Mover contenido de directorios de test
mv backend_tests/* tests/integration/
mv testing_scripts/* tests/unit/
mv performance_tests/* tests/performance/

# Eliminar directorios vacíos
rm -rf backend_tests/
rm -rf testing_scripts/
rm -rf performance_tests/
rm -rf test_env/
rm -rf modular-testing-docs/  # Mover docs importantes primero
```

### 5️⃣ RENOMBRAR DIRECTORIOS CLAVE

```bash
# Renombrar verihome/ a config/
mv verihome/ config/

# Renombrar staticfiles/ a static/
mv staticfiles/ static/

# Renombrar venv_ubuntu/ a .venv/
mv venv_ubuntu/ .venv/

# Renombrar carpeta de archivos
mv "ARCHIVOS INNECESARIOS/" archived/
mv archived-components/ archived/archived-components/
```

### 6️⃣ MOVER DOCUMENTACIÓN

```bash
# Mover sesiones a docs/
mv SESION_20_SEPTIEMBRE_2025.md docs/sessions/
mv SESION_23_SEPTIEMBRE_2025.md docs/sessions/

# Verificar contenido de sub_tasks/
# Si tiene documentación útil, mover a docs/
# Si no, mover a archived/
```

### 7️⃣ REORGANIZAR DEPLOYMENT

```bash
# Mover configs de deployment
mv nginx/* deployment/nginx/
mv monitoring/* deployment/monitoring/
mv backups/* deployment/backups/

# Eliminar directorios vacíos
rm -rf nginx/
rm -rf monitoring/
rm -rf backups/
```

### 8️⃣ ELIMINAR ARCHIVOS TEMPORALES

```bash
# Eliminar temporales
rm .temp_token
rm -rf __pycache__/

# Limpiar archivos de sesión obsoletos
# (Revisar antes de eliminar)
```

### 9️⃣ CONSOLIDAR ARCHIVOS .ENV

```bash
# Mantener solo:
# - .env (activo)
# - .env.example (template)

# Analizar y potencialmente eliminar:
# - .env.local (si es redundante)
# - .env.production.example (mover a deployment/ o eliminar si está en .env.example)
```

### 🔟 ELIMINAR DIRECTORIOS OBSOLETOS

```bash
# Directorios que parecen obsoletos o duplicados:
rm -rf backend/  # ¿Qué contiene? Si es viejo, archivar
rm -rf src/      # ¿Qué contiene? Parece duplicado de frontend/src
```

---

## ⚙️ ACTUALIZACIONES DE CONFIGURACIÓN NECESARIAS

### 1. `config/settings.py` (antes verihome/settings.py)

```python
# Actualizar INSTALLED_APPS
INSTALLED_APPS = [
    # ...
    'apps.core.apps.CoreConfig',
    'apps.users.apps.UsersConfig',
    'apps.properties.apps.PropertiesConfig',
    'apps.contracts.apps.ContractsConfig',
    'apps.payments.apps.PaymentsConfig',
    'apps.messaging.apps.MessagingConfig',
    'apps.ratings.apps.RatingsConfig',
    'apps.matching.apps.MatchingConfig',
    'apps.requests.apps.RequestsConfig',
    'apps.services.apps.ServicesConfig',
    'apps.dashboard.apps.DashboardConfig',
]

# Actualizar ROOT_URLCONF
ROOT_URLCONF = 'config.urls'

# Actualizar WSGI/ASGI
WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

# Actualizar STATIC_ROOT
STATIC_ROOT = BASE_DIR / 'static'

# Actualizar sys.path para scripts
import sys
sys.path.append(str(BASE_DIR / 'scripts' / 'database'))
```

### 2. `manage.py`

```python
# Actualizar settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
```

### 3. `config/wsgi.py` y `config/asgi.py`

```python
# Actualizar settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
```

### 4. Todos los imports en el código

Buscar y reemplazar:
```python
# ANTES:
from users.models import User
from contracts.services import BiometricService

# DESPUÉS:
from apps.users.models import User
from apps.contracts.services import BiometricService
```

---

## 📝 ACTUALIZAR .gitignore

```gitignore
# Python
__pycache__/
*.py[cod]
*.so
*.egg-info/
.venv/
venv*/

# Django
db.sqlite3
*.log
media/
static/

# Environment
.env
.env.local
.temp_token

# IDE
.vscode/
.idea/
*.swp

# Testing
.coverage
htmlcov/
.pytest_cache/

# Frontend
frontend/node_modules/
frontend/dist/
frontend/build/

# Logs
logs/*.log
```

---

## 🔍 CHECKLIST DE VERIFICACIÓN POST-REORGANIZACIÓN

### Backend
- [ ] `python manage.py check` - No errors
- [ ] `python manage.py migrate --check` - Migrations OK
- [ ] `python manage.py runserver` - Server starts
- [ ] Imports resueltos correctamente
- [ ] Tests ejecutándose: `pytest tests/`

### Frontend
- [ ] `cd frontend && npm run dev` - Dev server starts
- [ ] `npm run build` - Build succeeds
- [ ] APIs conectándose correctamente

### Scripts
- [ ] Scripts en `scripts/` ejecutables
- [ ] Paths actualizados en scripts
- [ ] Documentación de cada script agregada

### Git
- [ ] `.gitignore` actualizado
- [ ] Commit inicial de reorganización
- [ ] Push sin conflictos

---

## 🎯 BENEFICIOS DE ESTA REORGANIZACIÓN

### ✅ Ventajas:
1. **Estructura clara y profesional** siguiendo estándares Django
2. **Fácil navegación** - Todo tiene su lugar lógico
3. **Escalabilidad** - Fácil agregar nuevas apps/scripts
4. **Mejor mantenimiento** - Scripts y tests organizados por categoría
5. **Deploy simplificado** - Configs de deployment centralizadas
6. **Documentación centralizada** - Sesiones y guías en docs/
7. **Git más limpio** - Menos archivos en raíz

### 📊 Métricas:
- **Raíz antes**: ~50 archivos/carpetas
- **Raíz después**: ~15 archivos/carpetas esenciales
- **Reducción**: 70% menos clutter

---

## ⚠️ ADVERTENCIAS Y PRECAUCIONES

### 🛑 ANTES DE EMPEZAR:
1. **BACKUP COMPLETO**: `git commit -am "Pre-reorganization backup"`
2. **Verificar git status**: No debe haber cambios sin commitear
3. **Cerrar servicios**: Backend, frontend, Celery, Redis
4. **Testing funcional**: Asegurar que todo funciona antes de mover

### 🔥 RIESGOS:
- **Imports rotos**: Requiere búsqueda y reemplazo masiva
- **Migrations**: Posibles conflictos si hay migraciones pendientes
- **Frontend**: Puede necesitar actualización de API paths
- **Celery tasks**: Verificar imports en tasks asíncronas

### 💡 RECOMENDACIÓN:
**Hacer reorganización en RAMA SEPARADA:**
```bash
git checkout -b feature/project-reorganization
# Hacer todos los cambios
# Testing completo
# Merge a main solo cuando TODO funcione
```

---

## 🚀 PLAN DE EJECUCIÓN SUGERIDO

### Fase 1: PREPARACIÓN (15 min)
1. Git commit actual
2. Crear rama feature
3. Cerrar servicios
4. Crear carpetas nuevas

### Fase 2: MOVIMIENTO DE ARCHIVOS (30 min)
1. Mover Django apps
2. Reorganizar scripts
3. Consolidar tests
4. Mover documentación
5. Renombrar directorios clave

### Fase 3: ACTUALIZACIÓN DE CÓDIGO (45 min)
1. Actualizar settings.py
2. Actualizar manage.py
3. Buscar y reemplazar imports
4. Actualizar configs WSGI/ASGI

### Fase 4: TESTING (30 min)
1. `python manage.py check`
2. `python manage.py migrate --check`
3. `python manage.py runserver`
4. Testing frontend
5. Verificar scripts

### Fase 5: LIMPIEZA FINAL (15 min)
1. Eliminar temporales
2. Actualizar .gitignore
3. Eliminar directorios vacíos
4. Actualizar README.md

### Fase 6: DOCUMENTACIÓN (15 min)
1. Actualizar CLAUDE.md con nueva estructura
2. Crear ARCHITECTURE.md si no existe
3. Documentar cambios en CHANGELOG.md

**TIEMPO TOTAL ESTIMADO**: 2.5 - 3 horas

---

## 📌 DECISIONES PENDIENTES

### ❓ Preguntas para el usuario:

1. **¿Qué contiene `backend/`?**
   - Si es código viejo → Archivar
   - Si es útil → Mover a lugar apropiado

2. **¿Qué contiene `src/`?**
   - Parece redundante con `frontend/src/`
   - ¿Eliminar o archivar?

3. **¿Mantener `sub_tasks/`?**
   - ¿Tiene documentación importante?
   - ¿Mover a `docs/` o archivar?

4. **¿`.env.local` y `.env.production.example` necesarios?**
   - ¿O consolidar en `.env.example`?

5. **¿Renombrar proyecto de "NUEVOS PROYECTOS" a "verihome"?**
   - Más profesional
   - Evita espacios en path

---

**¿Proceder con la reorganización?**
- ✅ **SÍ** → Ejecutar plan paso a paso
- ⏸️ **REVISAR** → Analizar carpetas específicas primero
- ❌ **NO** → Mantener estructura actual
