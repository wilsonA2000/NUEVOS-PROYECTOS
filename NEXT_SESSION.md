# Próxima sesión · Continuación auditoría 2026-04-15

## Estado al cerrar 2026-04-15

- Branch: `fix/audit-2026-04-15` · **10 commits empujados a origin**
- Rollback: `git checkout pre-audit-2026-04-15`
- Reporte final: `AUDIT_2026_04_15_FINAL.md`
- Bitácora detallada: `AUDIT_2026_04_15.md`
- **12 bugs arreglados y validados** · **13 bugs pendientes documentados**

## Plan priorizado para la próxima sesión

### 🔴 PRIORIDAD 1 · Arreglar BIO-02 (P0 bloqueante) · ~45-60 min

Es el único bug que bloquea el **propósito del refactor del 13-abr**. Sin él, el flujo auto-creado Match→Contract queda a medias y nadie puede llegar a firma biométrica sin pasar por el formulario viejo del landlord.

**Qué hay que hacer**:

1. Leer `matching/models.py:193-218` (método `_ensure_contract_exists`)
2. Agregar creación de `LandlordControlledContract` sincronizado con el `Contract` legacy
3. Establecer estado inicial correcto (`ready_for_authentication` o `pending_tenant_biometric` según el flujo que use el frontend)
4. Validar que `approve_contract` del tenant funcione sin tener que pasar por el formulario manual del landlord
5. Validar E2E con:
   ```bash
   cd frontend
   npx playwright test --config=playwright.config.e2e-real.ts multi-user-contract-signing
   ```
6. Si E2E pasa → commit + push

**Archivos a tocar (predicho)**:
- `matching/models.py` (método `_ensure_contract_exists`)
- Posiblemente `contracts/landlord_contract_service.py` para reusar constructor LCC
- Posiblemente test nuevo en `matching/tests.py`

**Riesgos**:
- Si el E2E `multi-user-contract-signing` se rompe, hay que investigar qué estado exacto espera el frontend
- La tabla `LandlordControlledContract` tiene campos adicionales (basic_terms, guarantee_terms) — hay que decidir defaults razonables

### 🟠 PRIORIDAD 2 · DASH-03 resto (P1) · ~60 min

Sistema V2 de widgets inaccesible. Son 3 clases que faltan en `dashboard/services.py`:
- `DashboardDataService`
- `WidgetDataProvider`
- `DashboardAnalytics`

**Decisión previa requerida**: ¿las creamos stub mínimas o refactorizamos los endpoints V2 para no depender de ellas? Leer `dashboard/api_views.py` completo primero.

### 🟠 PRIORIDAD 3 · SVC-02 (P1) · requiere decisión de producto

**Gap de modelo de negocio**: prestadores pagan $100K/mes plan Profesional pero no pueden publicar nada.

**Decisión previa requerida** (preguntar a Wilson):
- **Opción A**: cambiar `ServiceViewSet` a `ModelViewSet` · permitir que el SP agregue ítems al catálogo público
- **Opción B**: crear modelo nuevo `ServiceListing` vinculado a `ServiceSubscription` · los SP publican listings privados a su perfil
- **Opción C**: redefinir qué significa "publicar servicios" en el plan Profesional (ej: solo habilita badge verificado + listado destacado)

### 🟡 PRIORIDAD 4 · Bugs P2 menores · ~30 min total

- **FAV-01**: mover `favorites` fuera del router raíz en `properties/api_urls.py`
- **PROP-07**: permitir POST en `PropertyImageViewSet` con MultiPartParser
- **VER-01**: agregar `queryset` explícito al `PrimaryKeyRelatedField` de user en VerificationAgentSerializer
- **DASH-02**: arreglar agregación de `total_value` en `ContractStatsAPIView`

### 🔵 PRIORIDAD 5 · Cosméticos (sesión separada)

- **VIS-4** · barrido emojis en 15 archivos secundarios
- **VIS-5** · migrar 29 archivos de colores hardcoded a tokens
- **NAV-01** · documentar convenciones de URLs o agregar redirects

---

## Prompt para la próxima sesión

```
Continúa la auditoría VeriHome iniciada el 2026-04-15.

Branch activa: fix/audit-2026-04-15 (sincronizada con origin).
Rollback disponible: pre-audit-2026-04-15.

Lee primero NEXT_SESSION.md en la raíz del proyecto. Luego:

1. Arranca por BIO-02 (P0 bloqueante): modificar
   matching/models.py:_ensure_contract_exists() para que también cree un
   LandlordControlledContract sincronizado con el Contract legacy, con estado
   inicial que permita al tenant approve_contract sin pasar por el formulario
   manual del landlord. Validar con el E2E multi-user-contract-signing.

2. Tras validar BIO-02, discútele a Wilson las decisiones de producto
   pendientes (SVC-02 opciones A/B/C) antes de tocar código.

3. Sigue el mismo patrón que ayer: auditar → arreglar → validar → commit →
   push → documentar. Un commit por bug (o grupo pequeño coherente).

Convenciones:
- Commits en español con formato "fix(módulo): ID · descripción"
- Bugs tipificados en AUDIT_2026_04_15.md (actualizar esa bitácora)
- Reporte final se actualiza al cierre (AUDIT_2026_04_15_FINAL.md)

Contexto de la sesión anterior:
- 25 bugs descubiertos · 12 arreglados · 13 pendientes
- Core de la plataforma (triple firma biométrica) sigue verde en E2E
- 79/79 tests properties OK · tsc --noEmit 0 errores

Al arrancar, verifica el estado de servidores (Django :8000, Vite :5174)
y corre el E2E base para tener línea de comparación antes de los fixes.
```

---

## Cómo arrancar rápido en la próxima sesión

```bash
# 1. Posicionarte en el branch
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
git checkout fix/audit-2026-04-15
git pull origin fix/audit-2026-04-15

# 2. Revisar estado
cat NEXT_SESSION.md
cat AUDIT_2026_04_15_FINAL.md

# 3. Arrancar servidores (screen)
screen -dmS django bash -c "source venv_ubuntu/bin/activate && python manage.py runserver 0.0.0.0:8000 > /tmp/django.log 2>&1"
cd frontend && screen -dmS vite bash -c "npm run dev > /tmp/vite.log 2>&1" && cd ..

# 4. Seed users + propiedades
source venv_ubuntu/bin/activate
python scripts/testing/seed_e2e_multiuser.py property_ready
python manage.py seed_subscription_plans

# 5. Correr E2E de referencia ANTES de tocar nada
cd frontend && npx playwright test --config=playwright.config.e2e-real.ts multi-user-contract-signing
```
