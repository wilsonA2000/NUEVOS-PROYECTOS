# Proxima sesion · Auditoria profunda pre-pruebas manuales

## Estado al cerrar 2026-04-16

- Branch: `main` · PR #1 merged (`f89ee21`)
- Tag de referencia: `post-audit-2026-04-15`
- **34 bugs resueltos** en auditoria 2026-04-15/16
- **0 bugs P0/P1 pendientes**
- Backend: 664 tests, 2 fails preexistentes (`core.ContactAPITests`)
- E2E triple firma biometrica: verde
- tsc --noEmit: 0 errores

## Contexto

La auditoria del 15/16-abr cubrio **5 viajes de usuario** (tenant busca propiedad, landlord publica, admin revisa, prestador suscribe, agente verifica) y encontro 34 bugs. Se arreglaron todos.

Sin embargo, hay apps que **nunca fueron auditadas en profundidad**:
- `messaging` (28 tests pasan pero endpoints no revisados manualmente)
- `ratings` (37 tests pasan, nunca auditado)
- `requests` (0 tests, 0 cobertura)
- `users` (33 tests, solo se toco impersonation)
- `core` (2 tests fallando: ContactAPITests)
- Frontend: messaging UI, ratings UI, admin dashboards, maintenance pages

La idea es: **encontrar y arreglar TODO antes de empezar pruebas manuales**, para no perder tiempo debuggeando mientras se prueba visualmente.

## Plan priorizado para la proxima sesion

### FASE 1: Fix tests fallando (15 min)
Los 2 tests en `core.tests.test_core_models_api.ContactAPITests` fallan. Arreglarlos primero para tener **664/664 verde**.

### FASE 2: Auditoria de `requests` app (30 min)
- **0 tests**. La app maneja `TenantDocument` y `PropertyInterestRequest`.
- Revisar modelos, serializers, api_views, endpoints.
- Escribir tests basicos para endpoints CRUD.
- Verificar que los endpoints respondan correctamente.

### FASE 3: Auditoria de `messaging` endpoints (30 min)
- 28 tests pasan pero son unitarios, no de integracion API.
- Hacer smoke test de todos los endpoints REST: threads, messages, mark-read, etc.
- Verificar WebSocket consumers (al menos que no crasheen al conectar).

### FASE 4: Auditoria de `ratings` endpoints (20 min)
- 37 tests pasan. Verificar CRUD de ratings y que las reviews funcionen end-to-end.

### FASE 5: Auditoria de `users` endpoints profunda (30 min)
- Revisar todos los endpoints: profile, resume, settings, activity-logs, notifications.
- El import roto de `AdminPermission` en `users/admin_views.py` sigue ahi: arreglarlo o eliminarlo.
- Verificar que el flujo register → email verification → login funcione.

### FASE 6: Frontend - modulos sin cobertura E2E (45 min)
- Navegar como tenant: messaging UI, ratings, service requests
- Navegar como landlord: admin dashboards, verification visits
- Navegar como admin: audit dashboard, tickets, SLA dashboard
- Documentar bugs encontrados.

### FASE 7: Limpieza final (20 min)
- VIS-5 restante (~50% de archivos con hex)
- `users/admin_views.py` import roto (`AdminPermission`)
- NAV-01 si da tiempo

---

## Prompt para la proxima sesion

```
Continua la auditoria profunda de VeriHome antes de pruebas manuales.

Branch: main (post-merge PR #1, tag post-audit-2026-04-15).

Lee primero NEXT_SESSION.md en la raiz del proyecto. Luego:

1. Arranca por FASE 1: arreglar los 2 tests fallando en
   core.tests.test_core_models_api.ContactAPITests. Correr
   python manage.py test para confirmar 664/664 verde.

2. Sigue con FASE 2: auditar requests app (0 tests, 0 cobertura).
   Revisar modelos/serializers/endpoints, escribir tests basicos.

3. FASE 3-5: smoke de messaging, ratings y users endpoints.
   Documentar cualquier bug como BUG-XXX en el mismo patron de la
   auditoria anterior.

4. FASE 6: si hay tiempo, navegar frontend como tenant/landlord/admin
   y documentar bugs UI.

Convenciones:
- Commits en español con formato "fix(modulo): ID . descripcion"
- Un commit por bug o grupo pequeno coherente
- Correr tests despues de cada fix
- Push a origin al terminar cada fase

Contexto:
- 664 tests backend, 2 fails preexistentes en core.ContactAPITests
- E2E triple firma verde · tsc 0 errores
- Servidores dev: Django :8000 / Vite :5174
- Token GitHub actualizado (ya configurado en remote)
```

---

## Como arrancar rapido

```bash
# 1. Posicionarte
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
git status  # debe decir "On branch main, up to date"

# 2. Arrancar servidores
screen -dmS django bash -c "source venv_ubuntu/bin/activate && python manage.py runserver 0.0.0.0:8000 > /tmp/django.log 2>&1"
cd frontend && screen -dmS vite bash -c "npm run dev > /tmp/vite.log 2>&1" && cd ..

# 3. Confirmar tests base ANTES de tocar nada
source venv_ubuntu/bin/activate
python manage.py test 2>&1 | tail -5
# Esperado: 664 tests, 2 failures (ContactAPITests)

# 4. Empezar por FASE 1
```
