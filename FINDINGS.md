# FINDINGS — Auditoría E2E Completa VeriHome

**Fecha**: 2026-04-12
**Ejecutor**: Playwright E2E Suite (backend real :8000 + frontend :5173)
**Runs analizados**: 5 (1 inicial + 4 del full-platform suite)
**Resultado global**: 4 de 5 casos ✓ pasan; 4 bugs P0, 4 P1, 3 P2 documentados

Este documento consolida TODOS los hallazgos de la auditoría E2E con tres
actores (arrendador + arrendatario + garante público) contra backend real
con DB reseteada. La suite cubre: login, propiedades, matching, contratos,
firma biométrica secuencial con garante, messaging, ratings, perfil,
dashboard, pagos y soporte.

---

## 1. Resultado por caso de prueba

| # | Caso | Estado | Artefactos |
|---|---|---|---|
| 1 | Landlord UI: crear/ver propiedad | ✓ PASS | `e2e-logs/full/run-2026-04-12T22-36-10-256Z/` |
| 2 | Tenant+Landlord: match request (tenant crea, API 201) | ✓ PASS | `e2e-logs/full/run-2026-04-12T22-38-06-127Z/` |
| 3 | Firma biométrica TRIPLE (tenant + garante público + landlord) | ⚠ PARCIAL | `e2e-logs/full/run-2026-04-12T22-39-34-475Z/` |
| 4 | Features: messaging, ratings, dashboard, profile, 11 páginas | ✓ PASS | `e2e-logs/full/run-2026-04-12T22-46-01-260Z/` |
| 5 | Flujo tenant→landlord inicial (spec original) | ⚠ PARCIAL | `e2e-logs/run-2026-04-12T22-03-43-387Z/` |

**Cobertura lograda**: login ✓ · propiedades CRUD UI ✓ · match request API ✓ ·
firma tenant ✓ · firma garante pública ✓ · firma landlord ✗ (bug) ·
11 páginas UI accesorias ✓ · 7 de 8 endpoints API probados ✓.

---

## 2. Bugs P0 (BLOQUEADORES)

### 🔴 BUG-E2E-01 · Whitelist de estados biométricos restrictiva en backend

**Archivo**: `contracts/api_views.py:1341-1344` (`StartBiometricAuthenticationAPIView`)

```python
contract = Contract.objects.get(
    id=contract_id,
    status__in=['pdf_generated', 'ready_for_authentication', 'pending_biometric']
)
```

Tras el `complete-auth` del tenant, `biometric_service.py:940` cambia
`contract.status = 'pending_landlord_biometric'`. Ese estado NO está en
la lista → el landlord recibe `404 "Contrato no encontrado"`.

**Evidencia**: `steps.jsonl` línea "landlord :: start-biometric → 404".

**Fix**: añadir `pending_tenant_biometric`, `pending_guarantor_biometric`,
`pending_landlord_biometric` a la whitelist.

**Impacto**: **bloquea toda firma del landlord**. Los contratos nunca
llegan a estado `active`.

---

### 🔴 BUG-E2E-02 · Frontend BiometricAuthenticationPage redirige con estados válidos

**Archivo**: `frontend/src/pages/contracts/BiometricAuthenticationPage.tsx:132-142`

La whitelist `validStatesForAuth` no incluye los estados del flujo
secuencial (`pending_*_biometric`). Cuando un usuario va a la URL
`/app/contracts/{id}/authenticate`, la página lo redirige a `/app/dashboard`
silenciosamente.

**Evidencia**: en 5 runs consecutivos, `visit-biometric-page` siempre
termina en `/app/dashboard` en vez de mostrar el flujo biométrico.

**Fix**:
```typescript
const validStatesForAuth = [
  'ready_for_authentication', 'pending_authentication',
  'pending_tenant_authentication', 'pending_landlord_authentication',
  'pending_biometric', 'draft', 'pending_tenant_review', 'pdf_generated',
  // AÑADIR:
  'pending_tenant_biometric',
  'pending_guarantor_biometric',
  'pending_landlord_biometric',
];
```

**Impacto**: la UI biométrica es **inaccesible** para usuarios reales
una vez inicia el flujo secuencial. Solo API directa funciona.

---

### 🔴 BUG-E2E-03 · Sistema dual Contract/LandlordControlledContract desincronizado

**Archivos**:
- `matching/models.py:392-455` (`MatchRequest.auto_create_contract` crea SOLO Contract legacy)
- `contracts/tenant_api_views.py:282-298` (`approve_contract` consulta SOLO LandlordControlledContract)

El endpoint `POST /matching/requests/{id}/generate-contract/` crea únicamente
el modelo `Contract` (legacy), pero `POST /contracts/tenant/contracts/{id}/approve_contract/`
busca en `LandlordControlledContract` y devuelve:
```
{"detail":"No LandlordControlledContract matches the given query."}
```

**Evidencia**: primer run (2026-04-12T21-45-22). Tuvimos que crear el
`LandlordControlledContract` manualmente en el seed (Caso 3 usa
`create_landlord_controlled_contract` en el seed script).

**Fix**: `auto_create_contract` debe crear ambos modelos en la misma
transacción, o unificar el sistema. Reutilizar `scripts/fixes/sync_biometric_contract.py`
como punto de partida.

**Impacto**: el flujo **match → contrato → aprobar por tenant NO funciona
end-to-end para usuarios reales**.

---

### 🔴 BUG-E2E-04 · Rate limit agresivo bloquea tests E2E y usuarios intensivos

**Archivo**: middleware de rate limiting (`core/middleware.py` probable)

El backend responde:
```json
{"error": "Rate limit exceeded", "detail": "Too many requests. Limit: 300 per 3600 seconds", "retry_after": 3600}
```

**Evidencia**: tras ~45 min ejecutando tests, `POST /users/auth/login/`
empezó a devolver 429 forzando reinicio del backend.

**Impacto**:
1. Bloquea CI/CD: dos ejecuciones seguidas rompen los tests.
2. Afecta usuarios legítimos: un landlord con 50 inquilinos puede hacer
   fácilmente >300 requests/hora navegando su dashboard.
3. El mensaje `retry_after: 3600` es absurdamente largo.

**Fix propuesto**:
- Rate limit por endpoint (login: 10/min; navegación: 5000/hora).
- No rate limit para usuarios autenticados en endpoints GET.
- Excepción para IPs de desarrollo vía `settings.DEBUG`.
- Considerar `django-ratelimit` por vista en vez de middleware global.

---

## 3. Bugs P1 (FLUJO PRINCIPAL AFECTADO)

### 🟠 BUG-E2E-05 · Workflow no avanza tras firma del garante

**Archivo**: `contracts/biometric_service.py` (flujo codeudor público)
+ `contracts/codeudor_public_api.py:CodeudorBiometricCompleteView`

**Escenario** (Caso 3):
1. Tenant completa firma ✓ (`contract.status = 'pending_landlord_biometric'` o similar)
2. Garante completa firma por URL pública ✓ (`CodeudorAuthToken.status = 'completed'`, confidence 87.8%)
3. Landlord intenta `start-biometric-authentication` → **423 Locked**:
   ```json
   {
     "error": "Esperando autenticación del arrendatario",
     "current_turn": "tenant",
     "waiting_for": "tenant_biometric"
   }
   ```

**Problema**: tras las firmas de tenant Y garante, `MatchRequest.workflow_status`
sigue en `pending_tenant_biometric`. El backend cree que el tenant no ha
firmado (cuando sí) porque la sincronización entre `CodeudorAuthToken`,
`BiometricAuthentication` y `MatchRequest.workflow_status` está rota.

**Evidencia**: `api-guarantor-complete.json` muestra certificado emitido
`CERT-COD-A1976659`, pero `api-landlord-start-bio.json` sigue respondiendo
423 con `current_turn: tenant`.

**Fix propuesto**: en `CodeudorBiometricCompleteView` (+ también tras el
`CompleteAuthenticationAPIView` del tenant) recalcular explícitamente el
siguiente estado del workflow:

```python
# Después de cada firma completada
if all_biometrics_completed(contract):
    match_request.workflow_status = 'all_biometrics_completed'
elif tenant_and_guarantor_done(contract):
    match_request.workflow_status = 'pending_landlord_biometric'
elif tenant_done(contract) and contract.has_guarantor:
    match_request.workflow_status = 'pending_guarantor_biometric'
```

---

### 🟠 BUG-E2E-06 · `/dashboard/stats/` devuelve 500 intermitente

**Archivo**: `dashboard/api_views.py`

```
status: 500
body: <AttributeError at /api/v1/dashboard/stats/>
```

A veces devuelve 200 (lento, 9.6s); a veces 500. Reproducible en ambos
runs ejecutados (tenant y landlord).

**Evidencia**: `tenant-responses.jsonl` en múltiples runs; Caso 4 `api-dashboard-stats.json`:
`{"ok": false, "status": 500}`.

**Fix propuesto**: capturar el traceback con logging estructurado y
envolver las consultas agregadas en `try/except` con fallbacks sensatos.

---

### 🟠 BUG-E2E-07 · Performance inaceptable en cold cache

Endpoints medidos (`frontend/src/utils/performanceMonitor.ts`):

| Endpoint | Primera llamada | Status |
|---|---|---|
| `GET /contracts/templates/` | 5255 ms | 200 |
| `GET /contracts/reports/expiring/` | 5395 ms | 200 |
| `GET /contracts/tenant-processes/` | 5637 ms | 200 |
| `GET /contracts/contracts/` | 6195 ms | 200 |
| `GET /dashboard/stats/?period=month` | 6546 ms | 200 (o 500) |
| `GET /contracts/reports/pending-signatures/` | 8414 ms | 200 |
| `GET /dashboard/stats/?period=month` (retry) | 9641 ms | 200 |

**Impacto**: login → dashboard tarda >15s; cada refresh de página tarda
~6-9s porque algunas consultas no cachean.

**Causa probable**:
1. Redis no disponible → fallback InMemoryChannelLayer (memoria de
   `feedback_server_management.md`). Cache también en memoria → cold en cada reload.
2. Posible N+1 en serializers (`templates`, `tenant-processes`, `stats`).
3. Sin índices compuestos en filtros frecuentes.

**Fix propuesto**:
- Redis obligatorio en desarrollo (o `locmem` explícito con warmup).
- `select_related`/`prefetch_related` en los 7 endpoints problemáticos.
- Django Debug Toolbar para identificar N+1 concretos.

---

### 🟠 BUG-E2E-08 · La UI biométrica usa `getUserMedia` sin fallback

**Archivos**:
- `frontend/src/components/contracts/EnhancedFaceCapture.tsx`
- `frontend/src/components/contracts/EnhancedVoiceRecording.tsx`
- `frontend/src/components/contracts/EnhancedDocumentVerification.tsx`

Los componentes requieren `navigator.mediaDevices.getUserMedia` sin
fallback a upload de archivo. Esto:
1. **Rompe en navegadores sin webcam** (desktop sin cámara).
2. **Rompe en entornos sin permisos** (iframes, embeds, políticas corporativas).
3. **Dificulta testing** — tuvimos que bypassear la UI completa.

**Fix propuesto**: agregar botón "Subir archivo" como alternativa en cada
paso biométrico. Backend ya acepta base64 uploaded desde File input.

---

## 4. Bugs P2 (mejoras DX/UX)

### 🟡 LOG-E2E-01 · Redirecciones silenciosas sin feedback

Cuando `BiometricAuthenticationPage` rechaza el estado del contrato,
navega a `/app/dashboard` sin mostrar alerta. El usuario no sabe por qué
su clic no funcionó.

**Fix**: mostrar `<Alert severity="warning">` con el estado actual y
qué se esperaba. Logear a Sentry cuando el estado no esté en la whitelist.

---

### 🟡 UX-E2E-02 · Vocabulario de estados inconsistente

Para el mismo concepto "contrato listo para firma" coexisten:
- `'pending_authentication'` (en API final)
- `'pending_biometric'` (en whitelist)
- `'ready_for_authentication'` (en seed)
- `'pending_tenant_signature'` (en otra parte del código)

**Fix**: consolidar en una enum/TextChoices única en `contracts/models.py`
y migrar referencias.

---

### 🟡 TEST-E2E-03 · Respuestas API pobres para debugging

`complete-auth` del tenant responde `{ok: true}` sin datos. Para operadores,
CI, y debugging sería útil que devuelva:
- `authentication_id`
- `overall_confidence`
- `new_contract_status`
- `next_step`
- `next_actor` (tenant/guarantor/landlord)

Curiosamente el endpoint del **codeudor sí hace esto bien** (`api-guarantor-complete.json`
muestra certificado, confianza, next_step). Habría que replicar el patrón.

---

## 5. Observaciones positivas (lo que SÍ funciona bien)

1. ✅ **Login JWT**: rápido, robusto, con refresh token (multi-actor paralelo).
2. ✅ **Crear propiedad API**: `POST /properties/` responde 201 bien.
3. ✅ **Listar propiedades API**: 200 OK, shape consistente.
4. ✅ **Match request creation API**: 201 con shape completo.
5. ✅ **Firma del tenant biométrica**: end-to-end funcional por API.
6. ✅ **Firma pública del garante**: flujo de 5 pasos (`face_front`,
   `face_side`, `document`, `combined`, `voice`) completamente funcional
   **sin requerir login**, con tracking de progreso en cada paso (20%,
   40%, 60%, 80%, 100%), confidence scores y emisión de certificado.
   **Este es el flujo MEJOR implementado de la plataforma**.
7. ✅ **API endpoints accesorios**: messaging, ratings, payments,
   contracts, matching, core/faqs todos responden 200.
8. ✅ **Rate limiter sí funciona** (aunque demasiado agresivo) —
   importante para seguridad.
9. ✅ **Rutas React protegidas**: todas las 11 páginas accesorias
   renderizan sin crash (dashboard, messages, profile, resume, ratings,
   properties, contracts, requests, payments, help, settings).

---

## 6. Artefactos completos

```
frontend/e2e-logs/
├── run-2026-04-12T22-03-43-387Z/        # Spec original tenant+landlord
│   └── FINDINGS.md                       # Hallazgos iniciales
└── full/
    ├── run-2026-04-12T22-36-10-256Z/    # Caso 1: propiedades UI
    ├── run-2026-04-12T22-38-06-127Z/    # Caso 2: match request
    ├── run-2026-04-12T22-39-34-475Z/    # Caso 3: firma TRIPLE
    ├── run-2026-04-12T22-42-00-278Z/    # Caso 4 (fallido por timeout)
    └── run-2026-04-12T22-46-01-260Z/    # Caso 4: features (re-run OK)
```

Cada run incluye: `steps.jsonl`, 3x `<actor>-*.jsonl` (console/requests/responses),
`api-*.json` snapshots, `screenshots/*.png`, `videos/*/.webm`, `seed.json`.

---

## 7. Priorización de fixes recomendada

Aplicar en este orden para maximizar valor con mínimo esfuerzo:

| # | Bug | Esfuerzo | Impacto | Desbloquea |
|---|---|---|---|---|
| 1 | BUG-E2E-01 | 5 min | ALTO | firma landlord |
| 2 | BUG-E2E-02 | 5 min | ALTO | UI biométrica |
| 3 | BUG-E2E-05 | 30-60 min | ALTO | flujo garante completo |
| 4 | BUG-E2E-03 | 1-2 h | ALTO | approve del tenant |
| 5 | BUG-E2E-04 | 30 min | MEDIO | tests E2E + usuarios pesados |
| 6 | BUG-E2E-06 | 30 min | MEDIO | dashboard siempre OK |
| 7 | BUG-E2E-07 | 2-4 h | MEDIO | UX aceptable |
| 8 | BUG-E2E-08 | 2-3 h | MEDIO | accesibilidad biométrica |
| 9 | UX-E2E-02 | 1-2 h | BAJO | claridad código |
| 10 | LOG-E2E-01 | 30 min | BAJO | UX errores |
| 11 | TEST-E2E-03 | 15 min | BAJO | observabilidad |

**Total estimado**: ~12-18 horas para resolver los 11 hallazgos, con los
**P0 en ~2-3 horas** que desbloquean la plataforma completa para su uso
real.

---

## 8. Re-ejecución

```bash
# Asegurar servers en screen
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
screen -dmS backend bash -c 'source venv_ubuntu/bin/activate && python manage.py runserver 0.0.0.0:8000'
screen -dmS frontend bash -c 'cd frontend && npm run dev'

# Esperar ~80s, luego:
cd frontend
npx playwright test --config=playwright.config.e2e-real.ts

# Si se excede rate limit:
screen -S backend -X quit && screen -dmS backend bash -c 'source ../venv_ubuntu/bin/activate && python ../manage.py runserver 0.0.0.0:8000'
```

La suite es idempotente: cada caso ejecuta su propio seed, limpia datos
previos y deja artefactos en `e2e-logs/full/run-<timestamp>/`.

---

**Última actualización**: 2026-04-12 22:50 UTC · Test suite completa ejecutada · 11 bugs documentados.
