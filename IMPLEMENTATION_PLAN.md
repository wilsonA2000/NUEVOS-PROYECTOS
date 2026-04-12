# Plan de Implementación y Revisión de Fixes — VeriHome

**Basado en**: `FINDINGS.md` (auditoría E2E 2026-04-12)
**Objetivo**: aplicar los 11 fixes de forma incremental, con verificación
automática después de cada cambio usando el test suite E2E existente.
**Esfuerzo total estimado**: 12-18 horas repartidas en 4 fases.

---

## 0. Principios de trabajo

1. **Una fase = un commit atómico + re-run de E2E suite**. Si falla, se
   revierte y se diagnostica. No se avanza con bugs regresivos.
2. **Cirujano, no carpintero**: cada fix toca las líneas estrictamente
   necesarias. No refactor oportunista dentro de fases P0.
3. **Antes de cada fix**: correr E2E suite completo para tener baseline
   "antes". Después del fix, correr otra vez: baseline "después".
4. **Rate limit** (BUG-E2E-04) se arregla PRIMERO porque bloquea la
   propia verificación de los demás fixes.
5. **Cada commit**: `fix(<area>): resuelve BUG-E2E-NN · <resumen en una línea>`
   con referencia al findings.

---

## FASE 0 — Preparación (30 min)

### 0.1 Validar baseline
```bash
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
# Levantar servers si no están
screen -dmS backend bash -c 'source venv_ubuntu/bin/activate && python manage.py runserver 0.0.0.0:8000'
screen -dmS frontend bash -c 'cd frontend && npm run dev'
# Esperar ~80s

cd frontend
npx playwright test --config=playwright.config.e2e-real.ts 2>&1 | tee ../e2e-logs/baseline-pre-fixes.log
```

Confirmar que **4 de 5 casos pasan** (el estado actual). Guardar hash del
commit base:
```bash
cd ..
git rev-parse HEAD > .e2e-baseline-commit
```

### 0.2 Crear rama de trabajo
```bash
git checkout -b fix/e2e-audit-2026-04-12
```

### 0.3 Checkpoint de DB
La DB es SQLite local. Hacer copia:
```bash
cp db.sqlite3 db.sqlite3.pre-fixes.bak
```

---

## FASE 1 — Fixes P0 (2-3 horas)

Orden quirúrgico: rate limit → whitelist backend → whitelist frontend → dual system.

### 1.1 · BUG-E2E-04 · Rate limit (30 min)

**Por qué primero**: sin esto, los re-tests post-fix fallan con 429.

**Archivo**: `core/middleware.py` (buscar clase con `300` o `rate_limit`)

**Cambios propuestos**:
1. Ampliar límite global autenticado: 300/hora → 2000/hora.
2. Dejar login/register estrictos (10/min).
3. Exención cuando `settings.DEBUG = True`:

```python
# core/middleware.py (pseudocódigo)
class RateLimitMiddleware:
    def __call__(self, request):
        if settings.DEBUG and request.META.get('REMOTE_ADDR') in ('127.0.0.1', '::1'):
            return self.get_response(request)  # sin rate limit en dev
        # ... lógica actual con nuevos límites por ruta
```

4. Documentar límites en `core/middleware.py` como constantes nombradas:

```python
RATE_LIMITS = {
    'login': (10, 60),              # 10/min
    'register': (5, 60),
    'auth_refresh': (60, 60),
    'default_authenticated': (2000, 3600),  # 2000/hora
    'default_anonymous': (200, 3600),
}
```

**Verificación**:
```bash
# Reiniciar backend
screen -S backend -X quit
screen -dmS backend bash -c 'source venv_ubuntu/bin/activate && python manage.py runserver 0.0.0.0:8000'
sleep 80

# Hammer test manual
for i in {1..350}; do
  curl -sS -o /dev/null -w "%{http_code} " http://localhost:8000/api/v1/users/auth/me/ \
    -H "Authorization: Bearer <TOKEN>"
done
# Esperado: 350 x 200 (antes: 300 x 200 + 50 x 429)
```

**Commit**: `fix(core): BUG-E2E-04 · rate limit por endpoint + exención DEBUG local`

---

### 1.2 · BUG-E2E-01 · Whitelist estados backend (10 min)

**Archivo**: `contracts/api_views.py:1341-1344`

**Diff exacto**:
```python
# ANTES
contract = Contract.objects.get(
    id=contract_id,
    status__in=['pdf_generated', 'ready_for_authentication', 'pending_biometric']
)

# DESPUÉS
contract = Contract.objects.get(
    id=contract_id,
    status__in=[
        'pdf_generated',
        'ready_for_authentication',
        'pending_biometric',
        'pending_tenant_biometric',      # BUG-E2E-01
        'pending_guarantor_biometric',   # BUG-E2E-01
        'pending_landlord_biometric',    # BUG-E2E-01
    ]
)
```

**Validación**: buscar TODOS los lugares donde se valide el status con la
whitelist vieja. Usar grep:
```bash
grep -rn "pdf_generated.*ready_for_authentication" contracts/ --include="*.py"
```

Aplicar el mismo fix en cada ocurrencia.

**Verificación E2E**:
```bash
cd frontend
npx playwright test --config=playwright.config.e2e-real.ts -g "multi-user-contract" 2>&1 | tee ../e2e-logs/post-BUG-01.log
```

**Criterio de éxito**: el landlord ahora avanza más allá del `start-biometric`.
En el `steps.jsonl` debería aparecer:
```
[OK] landlord :: start-biometric {"status": 200}
```
en vez de `{"status": 404}`.

**Commit**: `fix(contracts): BUG-E2E-01 · whitelist estados biométricos secuenciales`

---

### 1.3 · BUG-E2E-02 · Whitelist estados frontend (5 min)

**Archivo**: `frontend/src/pages/contracts/BiometricAuthenticationPage.tsx:132-142`

**Diff exacto**:
```typescript
// ANTES
const validStatesForAuth = [
  'ready_for_authentication',
  'pending_authentication',
  'pending_tenant_authentication',
  'pending_landlord_authentication',
  'pending_biometric',
  'draft',
  'pending_tenant_review',
  'pdf_generated',
];

// DESPUÉS
const validStatesForAuth = [
  'ready_for_authentication',
  'pending_authentication',
  'pending_tenant_authentication',
  'pending_landlord_authentication',
  'pending_biometric',
  'draft',
  'pending_tenant_review',
  'pdf_generated',
  'pending_tenant_biometric',      // BUG-E2E-02
  'pending_guarantor_biometric',   // BUG-E2E-02
  'pending_landlord_biometric',    // BUG-E2E-02
];
```

**Verificación**:
- Manual: logear como tenant, visitar `/app/contracts/{id}/authenticate`
  con contrato en `pending_tenant_biometric`. Debe cargar la UI (no
  redirigir a `/app/dashboard`).
- E2E: re-run del Caso 3. El step `visit-biometric-page` debería terminar
  en la URL `/app/contracts/{id}/authenticate`, no en `/app/dashboard`.

**Commit**: `fix(frontend): BUG-E2E-02 · aceptar estados pending_*_biometric en UI`

---

### 1.4 · BUG-E2E-03 · Sincronización dual Contract/LandlordControlledContract (1-2 h)

**Archivos**:
- `matching/models.py:392-455` — `auto_create_contract`
- `contracts/models.py` + `contracts/landlord_contract_models.py`

**Estrategia**: no migrar de sistema; sincronizar. Ampliar
`auto_create_contract` para crear ambos modelos en la misma transacción
usando lógica idéntica a `scripts/fixes/sync_biometric_contract.py`.

**Pseudocódigo**:
```python
from django.db import transaction

def auto_create_contract(self):
    with transaction.atomic():
        legacy = Contract.objects.create(...)   # código actual

        # NUEVO: crear espejo LandlordControlledContract
        from contracts.landlord_contract_models import LandlordControlledContract
        lcc = LandlordControlledContract.objects.create(
            id=legacy.id,  # mismo UUID para que approve_contract los encuentre
            contract_number=legacy.contract_number,
            landlord=self.landlord,
            tenant=self.tenant,
            property=self.property,
            contract_type='rental_urban',
            title=legacy.title,
            current_state='TENANT_REVIEWING',  # listo para tenant apruebe
            economic_terms={'monthly_rent': float(legacy.monthly_rent)},
            start_date=legacy.start_date,
            end_date=legacy.end_date,
            landlord_approved=True,
        )
        return legacy
```

**Además**: revisar si `tenant_api_views.approve_contract` debe actualizar
AMBOS modelos tras aprobar. Si sí, añadir sync hook ahí también.

**Verificación**:
- Unit test nuevo en `matching/tests.py::test_auto_create_creates_both_models`
- Re-run del flow match → approve por UI manual
- E2E: re-activar el código comentado en `multi-user-contract-signing.spec.ts`
  (etapas 3-4) que se saltó antes por este bug. Debería pasar ahora.

**Commit**: `fix(contracts,matching): BUG-E2E-03 · crear LandlordControlledContract desde auto_create_contract`

---

### 1.5 · Validación de Fase 1

Re-run completo de la suite E2E:
```bash
cd frontend
npx playwright test --config=playwright.config.e2e-real.ts 2>&1 | tee ../e2e-logs/phase1-complete.log
```

**Criterio de éxito Fase 1**:
- Todos los casos pasan SIN saltarse etapas
- `api-final-contract.json` del Caso 5 (multi-user) debe tener
  `current_state: "ACTIVE"` o `"PUBLISHED"` (no `pending_authentication`)
- Duración total ~6-8 min (vs 9 min actuales por timeouts)

Si todo OK:
```bash
git push origin fix/e2e-audit-2026-04-12
```

---

## FASE 2 — Fixes P1 (3-5 horas)

### 2.1 · BUG-E2E-05 · Sync workflow post-firma garante (30-60 min)

**Archivos**:
- `contracts/codeudor_public_api.py` · `CodeudorBiometricCompleteView`
- `contracts/biometric_service.py` (método que cierra bio tenant/landlord)

**Diagnóstico**: revisar `api-guarantor-complete.json` del último run.
Confidence 87.8%, certificado emitido, pero `MatchRequest.workflow_status`
sigue en `pending_tenant_biometric` cuando ya debería estar en
`pending_landlord_biometric`.

**Fix**: añadir helper centralizado `recompute_workflow_status(contract)`:

```python
# contracts/biometric_service.py (nuevo método)
def recompute_workflow_status(contract):
    """
    Recalcula MatchRequest.workflow_status basado en BiometricAuthentication
    y CodeudorAuthToken reales del contrato.
    """
    from matching.models import MatchRequest
    from contracts.landlord_contract_models import CodeudorAuthToken

    mr = MatchRequest.objects.filter(
        property=contract.property,
        tenant=contract.secondary_party or contract.tenant
    ).first()
    if not mr:
        return

    tenant_done = BiometricAuthentication.objects.filter(
        contract=contract, user=mr.tenant, status='completed'
    ).exists()
    landlord_done = BiometricAuthentication.objects.filter(
        contract=contract, user=mr.landlord, status='completed'
    ).exists()
    guarantor_done = CodeudorAuthToken.objects.filter(
        contract_id=contract.id, status='completed'
    ).exists()
    has_guarantor = CodeudorAuthToken.objects.filter(contract_id=contract.id).exists()

    if tenant_done and landlord_done and (guarantor_done or not has_guarantor):
        mr.workflow_status = 'all_biometrics_completed'
    elif tenant_done and (guarantor_done or not has_guarantor):
        mr.workflow_status = 'pending_landlord_biometric'
    elif tenant_done and has_guarantor and not guarantor_done:
        mr.workflow_status = 'pending_guarantor_biometric'
    else:
        mr.workflow_status = 'pending_tenant_biometric'

    mr.save(update_fields=['workflow_status'])
```

Luego llamar `recompute_workflow_status(contract)` al final de:
- `CompleteAuthenticationAPIView.post` (bio tenant/landlord)
- `CodeudorBiometricCompleteView.post` (bio garante)

**Verificación**:
- E2E Caso 3: tras `guarantor-complete` + `landlord-start-biometric`,
  el landlord debe recibir 200 (no 423).
- Contrato final: `current_state = 'ACTIVE'`.

**Commit**: `fix(contracts): BUG-E2E-05 · recompute_workflow_status unificado tras cada firma`

---

### 2.2 · BUG-E2E-06 · `/dashboard/stats/` 500 (30 min)

**Archivo**: `dashboard/api_views.py` — endpoint que responde a `GET /stats/`

**Acción 1 — diagnosticar**: la vista tiene `AttributeError`. Capturar
el traceback exacto:

```bash
# Reproducir en shell Django
venv_ubuntu/bin/python manage.py shell <<EOF
from django.test import RequestFactory
from dashboard.api_views import DashboardStatsView  # ajustar nombre
rf = RequestFactory()
req = rf.get('/api/v1/dashboard/stats/?period=month')
req.user = User.objects.get(email='admin@verihome.com')
DashboardStatsView.as_view()(req)
EOF
```

**Acción 2 — parchar**: envolver el cálculo en `try/except` con fallback:
```python
def get_stats_for_period(user, period):
    try:
        # lógica actual
    except AttributeError as e:
        logger.exception(f"Dashboard stats AttributeError: {e}")
        return {'error': 'stats_temporarily_unavailable', 'detail': str(e)}
```

**Verificación**: re-run E2E Caso 4. `api-dashboard-stats.json` debe
mostrar `{"ok": true, "status": 200}`.

**Commit**: `fix(dashboard): BUG-E2E-06 · resolver AttributeError en /dashboard/stats/`

---

### 2.3 · BUG-E2E-07 · Performance cold cache (2-4 h)

**Subtareas**:

#### 2.3.1 Habilitar Redis en dev
`verihome/settings.py`: confirmar que si Redis NO está en `redis:6379`
(memoria `feedback_server_management.md`), al menos `locmem` cache tenga
TTL razonable.

#### 2.3.2 Identificar N+1 con Django Debug Toolbar

```bash
# GET cada endpoint lento y revisar SQL panel
curl http://localhost:8000/api/v1/contracts/templates/?djdt=1
```

#### 2.3.3 Aplicar `select_related`/`prefetch_related`
Endpoints candidatos:
- `GET /contracts/templates/` → `.select_related('landlord', 'property')`
- `GET /contracts/tenant-processes/` → `.prefetch_related('documents', 'workflow_data')`
- `GET /contracts/reports/pending-signatures/` → análogo
- `GET /dashboard/stats/` → cache con TTL 60s por usuario

#### 2.3.4 Meta de performance
Después del fix, ningún endpoint medido debe exceder **1500ms** en cold
cache (desde los 5-9s actuales). El `performanceMonitor` del frontend ya
avisa automáticamente cuando se excede 1s — usar esos logs para medir.

**Commit**: `perf(dashboard,contracts): BUG-E2E-07 · select_related/prefetch en endpoints lentos`

---

### 2.4 · BUG-E2E-08 · UI biométrica con fallback a upload (2-3 h)

**Archivos**:
- `frontend/src/components/contracts/EnhancedFaceCapture.tsx`
- `frontend/src/components/contracts/EnhancedDocumentVerification.tsx` (ya tiene PDF upload — mantener)
- `frontend/src/components/contracts/EnhancedVoiceRecording.tsx`

**Estrategia**: añadir botón alternativo "Subir archivo" al lado del
botón de captura con cámara/mic. Si el usuario elige upload, se convierte
a base64 y sigue el mismo flujo hacia el backend.

**Ejemplo** en `EnhancedFaceCapture.tsx`:
```tsx
<Stack direction="row" spacing={2}>
  <Button onClick={handleCapture} startIcon={<Camera />}>
    Tomar foto
  </Button>
  <Button component="label" variant="outlined" startIcon={<Upload />}>
    Subir archivo
    <input
      type="file"
      hidden
      accept="image/*"
      onChange={(e) => handleFileUpload(e.target.files?.[0])}
    />
  </Button>
</Stack>
```

**Verificación**:
- Manual: en navegador desktop sin cámara (simular via
  `chrome://settings/content/camera` → bloquear) completar flujo.
- E2E: nuevo caso opcional usando `page.setInputFiles(...)`.

**Commit**: `feat(biometric): BUG-E2E-08 · fallback a upload de archivo en captura facial/voz`

---

### 2.5 · Validación de Fase 2

```bash
cd frontend
npx playwright test --config=playwright.config.e2e-real.ts 2>&1 | tee ../e2e-logs/phase2-complete.log
```

**Criterio de éxito Fase 2**:
- Todos los casos pasan ✓
- Contrato final: `current_state = 'ACTIVE'` con garante completo
- Duración total <6 min
- Ningún endpoint en slow log con >1500ms
- `api-dashboard-stats.json` status 200

---

## FASE 3 — Fixes P2 (2-3 horas)

### 3.1 · LOG-E2E-01 · Feedback en redirecciones (30 min)

**Archivo**: `frontend/src/pages/contracts/BiometricAuthenticationPage.tsx`

Cambiar la redirección silenciosa por:
```tsx
if (!validStatesForAuth.includes(contract.status)) {
  return (
    <Alert severity="warning" sx={{ m: 3 }}>
      <AlertTitle>Contrato no listo para firma</AlertTitle>
      Estado actual: <code>{contract.status}</code>. Se esperaba uno de:
      {validStatesForAuth.join(', ')}.
      <Button onClick={() => navigate('/app/dashboard')} sx={{ ml: 2 }}>
        Volver al dashboard
      </Button>
    </Alert>
  );
}
```

Logear a Sentry (si está habilitado):
```tsx
Sentry.captureMessage(`Invalid contract state for biometric: ${contract.status}`, 'warning');
```

**Commit**: `ux(biometric): LOG-E2E-01 · mostrar estado del contrato cuando no está listo para firma`

---

### 3.2 · UX-E2E-02 · Consolidar vocabulario de estados (1-2 h)

**Archivo**: `contracts/models.py` + `frontend/src/types/contract.ts`

Crear enum canónica compartida:

```python
# contracts/constants.py (nuevo)
class ContractState(models.TextChoices):
    DRAFT = 'draft', 'Borrador'
    PENDING_TENANT_REVIEW = 'pending_tenant_review', 'Pendiente Revisión Tenant'
    READY_FOR_AUTHENTICATION = 'ready_for_authentication', 'Listo para Firma'
    PENDING_TENANT_BIOMETRIC = 'pending_tenant_biometric', 'Esperando Tenant'
    PENDING_GUARANTOR_BIOMETRIC = 'pending_guarantor_biometric', 'Esperando Garante'
    PENDING_LANDLORD_BIOMETRIC = 'pending_landlord_biometric', 'Esperando Landlord'
    ALL_BIOMETRICS_COMPLETED = 'all_biometrics_completed', 'Biometrías Completas'
    ACTIVE = 'active', 'Activo'
    # ...
```

Reemplazar ocurrencias de strings sueltos con `ContractState.*`. Generar
TypeScript equivalente con `openapi-typescript` o manual.

**Migración de datos**: actualizar contratos existentes que tengan estados
legacy (`pending_authentication`, `pending_biometric`) al nombre canónico.

**Commit**: `refactor(contracts): UX-E2E-02 · consolidar vocabulario de estados en TextChoices`

---

### 3.3 · TEST-E2E-03 · Respuestas completas en complete-auth (15 min)

**Archivo**: `contracts/api_views.py::CompleteAuthenticationAPIView.post`

Replicar shape de `api-guarantor-complete.json` (el mejor implementado):

```python
return Response({
    'success': True,
    'message': '¡Autenticación biométrica completada exitosamente!',
    'authentication_id': str(auth.id),
    'certificate': {
        'certificate_id': f'CERT-{user_type.upper()}-{auth.id.hex[:8].upper()}',
        'user_name': auth.user.get_full_name(),
        'contract_number': contract.contract_number,
        'completed_at': timezone.now().isoformat(),
        'overall_confidence': f'{auth.overall_confidence:.1%}',
    },
    'overall_confidence': auth.overall_confidence,
    'new_contract_status': contract.status,
    'next_actor': determine_next_actor(contract),
    'next_step': get_next_step_description(contract),
})
```

**Commit**: `feat(biometric): TEST-E2E-03 · respuesta enriquecida en complete-auth con certificado`

---

## FASE 4 — Regresión y cierre (1-2 horas)

### 4.1 · Suite E2E completa final
```bash
cd frontend
npx playwright test --config=playwright.config.e2e-real.ts --reporter=html 2>&1 | tee ../e2e-logs/final-regression.log
npx playwright show-report playwright-report-e2e-real
```

**Gates**:
- [ ] 5/5 casos pasan ✓
- [ ] Tiempo total <7 min
- [ ] `api-final-contract.json` todos terminan en `ACTIVE`
- [ ] 0 responses 5xx en `*-responses.jsonl`
- [ ] 0 console errors en `*-console.jsonl`

### 4.2 · Smoke test manual (humano real)
Checklist en navegador (Chrome limpio, incognito):
- [ ] Landlord login → crear propiedad UI → ver en `/app/properties`
- [ ] Tenant login → `/app/properties/{id}` → enviar match request UI
- [ ] Landlord dashboard → ver solicitud en tab PENDIENTES → aceptar
- [ ] Tenant → subir documentos → landlord aprueba
- [ ] Landlord → crear contrato desde formulario
- [ ] Tenant → ver contrato → aprobar → redirige a `/authenticate`
- [ ] Tenant → completar 5 pasos biométricos → ver certificado
- [ ] Landlord → recibir notificación → completar 5 pasos → contrato ACTIVO
- [ ] Messaging entre ambos funcional
- [ ] Ratings post-contrato funcional

### 4.3 · Documentación actualizada

Actualizar `CLAUDE.md` + `frontend/CLAUDE.md`:
- Nueva sección "Estados del Contrato" con enum canónica
- Actualizar "Known Issues" removiendo los 11 bugs resueltos
- Añadir sección "Rate Limits" documentando los nuevos límites

### 4.4 · Actualizar memoria Claude
```
[feedback] E2E suite en frontend/playwright.config.e2e-real.ts corre contra
backend real. Seed en scripts/testing/seed_e2e_multiuser.py soporta 4 modos
(minimal/property_ready/ready_for_bio/ready_for_bio_guarantor). Artefactos
en frontend/e2e-logs/. Todos los 11 bugs del FINDINGS.md 2026-04-12 están
resueltos. Re-run con: cd frontend && npx playwright test --config=playwright.config.e2e-real.ts
```

### 4.5 · Merge
```bash
git checkout main
git merge --no-ff fix/e2e-audit-2026-04-12 -m "fix: resolver 11 bugs de auditoría E2E 2026-04-12

P0 (bloqueadores): whitelist estados biométricos backend/frontend,
sincronización Contract/LandlordControlledContract, rate limit.
P1 (flujo principal): sync workflow post-firma garante, dashboard stats 500,
performance cold cache, fallback upload biométrico.
P2 (DX/UX): feedback en redirecciones, consolidar vocabulario estados,
respuestas enriquecidas.

Ref: FINDINGS.md · Verificado con E2E suite (5/5 casos pasan).
"
git push origin main
```

---

## Resumen de esfuerzo por fase

| Fase | Esfuerzo | Resultado |
|---|---|---|
| 0. Preparación | 30 min | Rama + baseline |
| 1. P0 (4 bugs) | 2-3 h | Plataforma usable end-to-end |
| 2. P1 (4 bugs) | 3-5 h | Performance + resiliencia |
| 3. P2 (3 bugs) | 2-3 h | DX/UX pulido |
| 4. Regresión | 1-2 h | Garantía de calidad + merge |
| **Total** | **8-13 h** | **Plataforma production-ready** |

---

## Rollback plan

Si alguna fase rompe regresivamente algo crítico:

```bash
# Volver a baseline
git checkout main
cp db.sqlite3.pre-fixes.bak db.sqlite3
screen -S backend -X quit && screen -dmS backend ...
```

Por fase, hacer un **tag** antes de empezar:
```bash
git tag pre-phase-1  # antes de fase 1
git tag pre-phase-2  # antes de fase 2
# ...
```

Para revertir solo una fase:
```bash
git revert <commit-range-de-la-fase>
```

---

## Anexo — Comandos útiles durante las fases

```bash
# Re-correr solo un caso del E2E
cd frontend
npx playwright test --config=playwright.config.e2e-real.ts -g "CASO 3"

# Ver último reporte HTML
npx playwright show-report playwright-report-e2e-real

# Resetear DB completamente
venv_ubuntu/bin/python scripts/database/clean_database_auto.py

# Ejecutar seed standalone
venv_ubuntu/bin/python scripts/testing/seed_e2e_multiuser.py ready_for_bio_guarantor

# Hammer test rate limit
ab -n 500 -c 5 -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/users/auth/me/

# Reset rate limit reiniciando backend (con cache en memoria)
screen -S backend -X quit
screen -dmS backend bash -c 'source venv_ubuntu/bin/activate && python manage.py runserver 0.0.0.0:8000'
```

---

## Dependencias entre fixes

```
RATE-LIMIT (P0-04) ──────┐
                         ↓
WHITELIST-BACK (P0-01) ──┼──→ WORKFLOW-SYNC (P1-05) ──→ TEST-E2E-03 (P2)
WHITELIST-FRONT (P0-02) ─┘
                         
DUAL-SYSTEM (P0-03) ────────→ (indep, pero habilita approve via UI)

DASHBOARD-500 (P1-06) ────→ (indep)
PERF (P1-07) ──────────────→ (indep, pero mejora runtime de tests)
BIO-UPLOAD (P1-08) ────────→ (indep)

UX-VOCAB (P2-02) ──────────→ post Fase 1 (reusa whitelist)
LOG-REDIRECT (P2-01) ──────→ post P0-02
```

**Orden seguro**: siempre Fase 1 completa antes de Fase 2.
Los bugs independientes dentro de una fase pueden paralelizarse si hay
varios desarrolladores.

---

**Archivo complementario**: `FINDINGS.md` (raíz del proyecto) con el detalle
técnico de cada bug, evidencia y fix exacto.

**Última actualización**: 2026-04-12
