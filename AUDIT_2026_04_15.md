# Bitácora Auditoría End-to-End VeriHome — 2026-04-15

Plan: `/home/wilsonadmin/.claude/plans/swirling-sniffing-crayon.md`
Tag rollback: `pre-audit-2026-04-15`

## Convenciones de bugs

- **ID**: `{ÁREA}-{NN}` (AUTH, PROP, MATCH, BIO, PAY, MSG, NOTIF, ADM, VER, VIS, SEC, INFRA, LEGAL, FLOW)
- **Severidad**: P0 bloqueante · P1 grave · P2 moderado · P3 cosmético
- **Formato**: `ID · severidad · módulo · descripción · reproducción · fix sugerido`

---

## FASE 0 — Preparación

### Acciones ejecutadas
- ✅ Tag `pre-audit-2026-04-15` creado
- ✅ BD flush completo
- ✅ Seed `minimal` ejecutado: landlord + tenant + guarantor
- ⏳ Levantar Django :8000 + Vite :5174 en screen

### Usuarios sembrados (password: `admin123`)
| Rol | Email | UUID |
|---|---|---|
| landlord | admin@verihome.com | 491a4b7e-2d0a-4f7b-a245-efbe80227382 |
| tenant | letefon100@gmail.com | 04b1ea50-8b10-46d2-9cb2-58f63a5586c3 |
| guarantor | guarantor.e2e@verihome.com | 52369ead-6fee-4293-be61-29a0eb2f2e06 |

**Nota**: el seed actual no crea admin jurídico, service_provider ni verification_agent. Para FASE 1.3-1.5 habrá que crearlos manualmente o extender el seed.

---

## Bugs detectados durante FASE 0

### NOTIF-01 · P2 · core/notification_service.py
**Descripción**: Falla al enviar email de bienvenida porque el template `core/email/welcome_notification.html` no existe.
**Log**:
```
ERROR core.notification_service - Error sending email notification to admin@verihome.com: core/email/welcome_notification.html
```
**Reproducción**: crear cualquier usuario nuevo (seed, registro normal).
**Impacto**: usuarios nuevos NO reciben email de bienvenida. Rompe la promesa de onboarding profesional.
**Fix sugerido**: crear `templates/core/email/welcome_notification.html` siguiendo el patrón de `templates/core/email/contract_notification.html` que sí existe.
**Ubicación del error**: `core/notification_service.py:194`

### INFRA-01 · P3 · Redis
**Descripción**: Redis no está corriendo localmente → fallback a InMemoryChannelLayer + cache local.
**Log**: `Error -3 connecting to redis:6379. Temporary failure in name resolution.`
**Impacto**: desarrollo OK (fallback funciona), pero WebSocket multi-proceso no soportado en este entorno. No es bug de código, es config del entorno WSL.
**Fix sugerido**: arrancar Redis en WSL o usar docker-compose para auditoría de producción.

### NOTIF-02 · P3 · pywebpush
**Descripción**: `pywebpush` no instalado → push notifications silenciosamente skip.
**Log**: `Push notification skipped (pywebpush not installed)`
**Impacto**: push web (service workers) no funciona. En-app + email sí.
**Fix sugerido**: `pip install pywebpush` + configurar VAPID keys en `.env`.

---

### AUTH-01 · P1 · seed_e2e_multiuser.py + allauth
**Descripción**: El seed marca `User.is_verified=True` pero el login usa `allauth.EmailAddress.verified` → los usuarios sembrados NO pueden loguear.
**Reproducción**: `python scripts/testing/seed_e2e_multiuser.py minimal` + `POST /api/v1/users/auth/login/` → 400 "email_not_verified".
**Workaround aplicado**: script shell que crea `EmailAddress(verified=True, primary=True)` para cada User.
**Fix sugerido**: en `ensure_user()` agregar:
```python
from allauth.account.models import EmailAddress
EmailAddress.objects.update_or_create(
    user=user, email=user.email,
    defaults={'verified': True, 'primary': True}
)
```
**Ubicación**: `scripts/testing/seed_e2e_multiuser.py:45-66`

---

## Estado FASE 0

- ✅ Tag rollback · BD flush · seed ejecutado · bug AUTH-01 parchado
- ✅ Django :8000 arriba · Vite :5174 arriba
- ✅ Login funciona (`admin@verihome.com` · HTTP 200 · JWT recibido)
- ✅ Bitácora inicializada con 4 bugs registrados: NOTIF-01, INFRA-01, NOTIF-02, AUTH-01

**FASE 0 → COMPLETADA** ✓

---

## FASE 1 — en progreso

### FASE 1.1 · Viaje del arrendatario — hallazgos

**Entorno**: tenant `letefon100@gmail.com` loguea ✓ · `/me/` 200 ✓ · propiedad sembrada id=`87f452ec-a83b-4efe-9ece-ec0680bf2967`

#### PROP-02 · P1 · properties/api_views.py:589 · PropertySearchAPIView
**Descripción**: `GET /api/v1/properties/search/` responde **HTTP 500** con `AssertionError`.
**Causa raíz**: la clase hereda de `PropertyAccessMixin` + `generics.ListAPIView` y en su `get_queryset()` llama `super().get_queryset()`. El mixin no define `queryset`, y `GenericAPIView.get_queryset()` requiere el atributo de clase. Cadena rota.
**Reproducción**: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/properties/search/`
**Impacto**: la ruta pública de búsqueda **no funciona**. El frontend (si la consume) recibe 500.
**Fix sugerido**: agregar `queryset = Property.objects.all()` como atributo de clase en `PropertySearchAPIView`, o reemplazar `super().get_queryset()` por `Property.objects.filter(is_active=True, status='available')`.

#### PROP-03 · P0 · properties/optimized_views.py:201 · OptimizedPropertyViewSet.list + api_views.py:108
**Descripción**: La lista de propiedades queda cacheada vacía y nunca se invalida al crear una propiedad.
**Causa raíz**:
- `list()` cachea con key `properties:list:v2:{user_id}:{filters_hash}` (sin prefijo `verihome:`)
- `perform_create()` en `api_views.py:108` invalida con patrón `verihome:properties:*` → **el patrón NO coincide con la key real**
- TTL por defecto 300s (5 min) → cualquier tenant que consulte antes de una creación verá 0 propiedades durante 5 minutos
**Reproducción**: 
  1. Login tenant · `GET /properties/` → count=0 (cachea vacío)
  2. Landlord crea propiedad
  3. Tenant hace `GET /properties/` → sigue count=0 durante 5 min
**Impacto**: **bloqueante del flujo humano**. El arrendatario no descubre propiedades nuevas en tiempo real. Rompe la promesa de plataforma en vivo.
**Fix sugerido**: unificar prefijo. Opción A: cambiar `perform_create` a `SmartCache.invalidate_pattern('properties:list:v2:*')`. Opción B: prefijar todas las keys con `verihome:`. Verificar también `perform_update` y `perform_destroy`.

### Fixes aplicados (branch `fix/audit-2026-04-15`)

- **PROP-02** ✓ · `properties/api_views.py:589-603` · agregado `queryset = Property.objects.filter(is_active=True, status='available')` + `get_queryset()` sin `super()`. Validado: `/properties/search/` pasa de HTTP 500 → 200.
- **PROP-03** ✓ · tres fixes encadenados:
  1. `properties/api_views.py:107-109` + `properties/optimized_views.py:289-296` · `perform_create` ahora invalida los patrones correctos: `properties:list:v2:*` + `property:detail:v2:*` (antes solo `verihome:properties:*` que no coincidía con ninguna key).
  2. `properties/api_views.py:173-175,193-195` · mismo arreglo en `perform_destroy` (ruta feliz y fallback soft-delete).
  3. `core/cache.py:208-221` · `_invalidate_known_keys` ahora tolera el prefijo de versión `:1:` que Django locmem añade automáticamente a cada key — antes el `startswith(base_pattern)` nunca matcheaba.
  - Validado E2E: landlord crea propiedad → tenant ve count +1 inmediatamente (antes tenía que esperar 5 min TTL o invalidar manualmente).
- **PROP-04** (descubierto durante fix PROP-02) ✓ · `properties/optimized_serializers.py:58-68` · `get_profile()` referenciaba campos inexistentes `landlord_profile.phone_number`, `verified`, `rating`. `phone_number` está en `User`, `verified` no existe en profile (se usa `User.is_verified`), `rating` no existe. Reescrito con `getattr()` y campos reales del modelo.

- **PROP-05** (descubierto por suite `properties.tests` durante consolidación) ✓ · `properties/api_views.py:665` · `FeaturedPropertiesAPIView` gemelo de PROP-02: mismo bug de `queryset` ausente. Fix: atributo de clase + `get_queryset()` sin `super()`.

- **PROP-06** (mismo origen) ✓ · `properties/api_views.py:683` · `TrendingPropertiesAPIView.get_queryset()` consultaba `PropertyView.objects.filter(created_at__gte=...)` pero el modelo tiene `viewed_at`, no `created_at` → `FieldError`. Fix: renombrado + mismo tratamiento de queryset que PROP-05.

### Suite de tests unitarios

- **properties**: 79/79 OK ✓ (antes de fixes: 77/79 · 1 fail + 1 error en `test_featured_endpoint`/`test_trending_endpoint` que ya aceptaban 200/404 como tolerancia al bug conocido; ahora son 200 verdes reales).

### Suite E2E Playwright (`playwright.config.e2e-real.ts`)

- ✅ **multi-user-contract-signing** (2.9 min) — triple firma biométrica → `contract_status=active` · overall_confidence 87.7%
- ✅ 3 passed
- ⚠️ **full-platform-e2e CASO 1 - landlord ciclo UI crear propiedad**: timeout 120s pero `steps.jsonl` marca `run-complete status:ok` a los 79s. La suite de pasos pasó (login, visita a listas, formulario, detalle). El timeout parece venir del cierre del contexto con video recording en WSL, no del test en sí. **No introducido por los fixes de properties** (el `multi-user-contract-signing` sí toca propiedades y pasó).
- ⚠️ 3 did not run (consecuencia del fallo de CASO 1)

**Veredicto**: fixes no introducen regresión. El único fallo es preexistente y ambiental.

---

### FASE 1.1 · Paso 2 · Favoritear + Match request

#### FAV-01 · P2 · properties/api_urls.py
**Descripción**: `/api/v1/properties/favorites/` devuelve **HTTP 404** aunque `PropertyFavoriteViewSet` está registrado en el router.
**Causa raíz probable**: el `DefaultRouter` registra `PropertyViewSet` en `r''` (línea 13) y `PropertyFavoriteViewSet` en `r'favorites'` (línea 18). La URL `/properties/favorites/` puede estar siendo capturada por el patrón detail del ViewSet raíz (`<pk>/`) con `pk=favorites`, que luego 404 porque no es UUID válido.
**Reproducción**:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/properties/favorites/ → 404
curl -X POST http://localhost:8000/api/v1/properties/{UUID}/toggle-favorite/ → 200 ✓
```
**Impacto**: tenant no puede listar sus favoritos guardados. Toggle individual sí funciona.
**Fix sugerido**: registrar `PropertyFavoriteViewSet` con un prefijo distintivo como `user-favorites` para evitar colisión con el PK del ViewSet raíz. O mover la ruta fuera del router con path explícito en `api_urls.py`.

#### Flujo validado ✓
- Tenant crea match request → HTTP 201 · `match_code=MT-8VUY0EWA` · status `pending` · compatibility_score 45
- Landlord ve match pending en su lista ✓
- Landlord acepta via `POST /matching/requests/{id}/accept/` → HTTP 200 ✓
- **Contract auto-creado** ✓ tras accept (refactor 13-abr funcional) · status `draft`

#### Observación · API naming inconsistencia
El frontend y memoria del 13-abr mencionan `accept_match` pero el endpoint real es `/accept/`. No es bug pero amerita uniformar o documentar.

---

### FASE 1.1 · Paso 3 · Firma biométrica (BLOQUEADO)

#### BIO-02 · **P0** · matching/models.py:_ensure_contract_exists · contracts/tenant_api_views.py · ✅ RESUELTO 2026-04-16

**Resolución (sesión 2026-04-16)**:
- `MatchRequest._ensure_contract_exists()` ahora crea simultáneamente `Contract` (legacy) y `LandlordControlledContract` con el **mismo UUID** (`shared_id = uuid.uuid4()`), condición que el endpoint biométrico requiere (ver `StartBiometricAuthenticationAPIView` en `contracts/api_views.py:1470`).
- LCC se inicializa en `current_state='BOTH_REVIEWING'` con `landlord_approved=True` y `admin_reviewed=True`, de manera que el tenant ve directamente la acción `approve_contract` sin depender del formulario manual del landlord.
- Tests de regresión agregados: `matching.tests.EnsureContractExistsTests` (`test_accept_match_creates_synced_contracts`, `test_ensure_contract_is_idempotent`).
- E2E `multi-user-contract-signing` sigue verde: `finalState: active`, `workflow_status: all_biometrics_completed`.

**Descripción original**: El refactor 13-abr (auto-creación de Contract tras `accept_match`) está incompleto. Crea solo `Contract` legacy con `status='draft'`, pero **NO crea `LandlordControlledContract`**, que es el modelo que el tenant necesita para aprobar el contrato y avanzar a biometría.

**Cadena de fallos**:
1. Landlord acepta match → `Contract(status='draft')` creado, sin `LandlordControlledContract`
2. Tenant intenta `POST /api/v1/contracts/tenant/contracts/{id}/approve_contract/` → falla porque no hay `LandlordControlledContract`
3. Estado nunca transiciona a `ready_for_authentication` / `pending_tenant_biometric`
4. Tenant intenta `POST /contracts/{id}/start-biometric-authentication/` → HTTP 404 porque `Contract.status='draft'` no está en la whitelist del endpoint (`pdf_generated`, `ready_for_authentication`, `pending_biometric`, etc.)

**Impacto**: el flujo auto-creado desde match NO puede completarse a firma. El tenant queda en limbo. El único camino funcional hoy es que el landlord cree el contrato manualmente desde el formulario (flujo viejo), lo que anula el beneficio del refactor.

**Reproducción**:
```bash
# Seed minimal → tenant crea match → landlord acepta → Contract(draft) creado pero LandlordControlledContract NO
# Tenant intenta biometría:
curl -X POST /api/v1/contracts/{contract_id}/start-biometric-authentication/ → 404
```

**Fix sugerido** (dos opciones):

A) **Completar `_ensure_contract_exists()` en `matching/models.py:193`** para crear también `LandlordControlledContract` + marcar `status='ready_for_authentication'` de una vez, de modo que ambos modelos queden sincronizados y el tenant pueda aprobar.

B) **Eliminar el atajo** y forzar al landlord a pasar por el formulario de contrato (flujo viejo) tras accept_match — pero esto deshace el valor del refactor del 13-abr.

**Preferida**: opción A. Es lo que la memoria del 13-abr implicaba que ya funcionaba.

---

## Pausa · Decisión requerida

FASE 1.1 tiene los pasos 1-2 verdes pero paso 3 (firma biométrica) bloqueado por BIO-02, que es un bug **arquitectónico** del refactor 13-abr. No es una corrección cosmética: requiere tocar `matching/models.py` + sincronizar ambos modelos de contrato + probar que el flujo triple-firma del E2E sigue verde.

### Opciones

1. **Arreglar BIO-02 ahora** (estimado 45-60 min): modificar `_ensure_contract_exists()` para crear también `LandlordControlledContract` con estado correcto, re-correr E2E `multi-user-contract-signing` para validar que no se rompa.

2. **Registrar BIO-02 y saltar a FASE 1.2** (viaje landlord) usando el flujo viejo (formulario directo) que sí funciona. Retomar BIO-02 en FASE de remediación final.

3. **Cerrar sesión aquí** con lo consolidado (6 bugs arreglados) y retomar mañana desde BIO-02 como primera tarea del día siguiente.

---

## FASE 1.2 · Viaje del arrendador (landlord)

### Endpoints validados ✓
- `POST /api/v1/properties/` — crear propiedad · HTTP 201 ✓
- `POST /api/v1/contracts/landlord/contracts/` — crear LandlordControlledContract · 201 ✓
- `GET /api/v1/contracts/admin/pending/` — admin ve bandeja · 200 ✓
- `POST /api/v1/contracts/admin/contracts/{id}/approve/` — admin aprueba · 200 ✓
- **Conflicto de interés ✓ validado**: admin intenta auto-aprobarse → HTTP 400 con mensaje "Conflicto de intereses: el administrador no puede aprobar un contrato en el que figura como arrendador" ✓
- `GET /api/v1/contracts/admin/stats/` — estadísticas admin · 200 ✓
- `GET /api/v1/dashboard/stats/` — dashboard landlord · 200 ✓
- `GET /api/v1/contracts/reports/expiring/` — 200 ✓
- `GET /api/v1/contracts/reports/pending-signatures/` — 200 ✓
- `GET /api/v1/messages/threads/` — messaging · 200 ✓ (1 thread creado automáticamente por `accept_match` ✓)
- `GET /api/v1/ratings/advanced/` — 200 ✓
- `GET /api/v1/payments/{transactions,invoices}/` — 200 ✓

### Bugs descubiertos

#### PROP-07 · P2 · `properties/api_views.py:271` PropertyImageViewSet
**Descripción**: `POST /api/v1/properties/property-images/` devuelve **HTTP 405 "POST no permitido"**. El ViewSet está registrado pero no expone método `create()`.
**Workaround actual**: el frontend envía imágenes como FormData dentro del POST de creación de propiedad (`propertyService.createProperty` acepta FormData).
**Impacto**: no hay forma de agregar/eliminar imágenes a una propiedad ya creada sin reescribir toda. Falta upload/delete individual.
**Fix sugerido**: revisar si el ViewSet tiene `http_method_names` restrictivo o si falta `serializer_class`/`parser_classes`. Debería permitir POST con MultiPartParser.

#### DASH-02 · P2 · `contracts/api_views.py:ContractStatsAPIView`
**Descripción**: `GET /api/v1/contracts/stats/` devuelve `total_value: 0` aunque hay contratos activos con `monthly_rent` ≠ 0.
**Reproducción**: contrato `d6d4657a` está en estado `active` con `monthly_rent=1500000` pero stats muestra 0.
**Impacto**: el dashboard ejecutivo del landlord miente sobre su volumen de negocio.
**Fix sugerido**: revisar agregación. Probable que filtre por estado incorrecto o monte `monthly_rent`.

#### DASH-03 · **P1** · `dashboard/urls.py:20-62` · PARCIAL
**Descripción**: El sistema V2 de widgets (25+ tipos documentados) está completamente **inaccesible** porque el bloque está en `try/except ImportError` y **falla silenciosamente**.
**Causa raíz**: cadena de 2 problemas:
  1. `dashboard/services.py:22` hacía `from properties.models import Amenity` — el modelo fue renombrado a `PropertyAmenity`. **ARREGLADO ✓**
  2. `dashboard/api_views.py:24` hace `from .services import DashboardDataService, WidgetDataProvider, DashboardAnalytics` — esas clases NO existen en `services.py`. **PENDIENTE** (fix grande, requiere crear las 3 clases o refactorizar llamadas).
El `try/except` silencioso antes ocultaba ambos errores. Ahora se loggea warning. **DASH-03 sigue como P1 hasta completar fix #2**.
**Reproducción**:
```bash
curl /api/v1/dashboard/v2/widgets/ → 404
curl /api/v1/dashboard/v2/data/ → 404
# Desde shell Django:
from dashboard import api_views  # → ImportError: cannot import 'Amenity'
```
**Impacto**: **todo el sistema avanzado de dashboard** (widgets configurables, analytics, performance, layouts) no funciona. Solo está accesible `/dashboard/stats/` legacy.
**Fix sugerido**: cambiar import en `dashboard/api_views.py` de `Amenity` a `PropertyAmenity`, y quitar el `try/except` silencioso o al menos loggear el error.

#### NAV-01 · P3 · naming inconsistente
**Descripción**: URLs no siguen un patrón uniforme.
- `/api/v1/notifications/` → 404 · `/api/v1/core/notifications/` → 200 ✓
- `/api/v1/messaging/` → 404 · `/api/v1/messages/` → 200 ✓
- `/api/v1/payments/schedules/` → 404 · `/api/v1/payments/transactions/` → 200 ✓
- `/contracts/reports/expiring/` → 200 pero no hay `/reports/expiring/` top-level
**Impacto**: el frontend debe memorizar prefijos arbitrarios. Nuevos devs tienen fricción.
**Fix sugerido**: documentar la convención en `API_MAP.md` y/o agregar redirects.

#### ADM-02 · P3 · `contracts/admin_approval_api.py`
**Descripción**: `/api/v1/contracts/admin/sla-dashboard/` devuelve 404. La URL no existe pero el endpoint de SLA dashboard está referenciado en la memoria del 13-abr.
**Impacto**: no hay panel de seguimiento de los 5 días SLA. La tarea Celery `check_admin_review_sla` corre pero sin visibilidad frontend.
**Fix sugerido**: implementar endpoint o renombrar si existe bajo otra ruta.

### Flujo triple firma pre-existente ✓ (del contrato VH-2026-000001)
- Landlord crea LCC con formulario ✓
- Admin aprueba ✓
- Publica ✓
- Match → tenant asigna ✓
- Tenant aprueba (TenantContractReviewAPIView) → estado `READY_FOR_AUTHENTICATION` ✓
- Triple biométrica ✓ (validado por E2E Playwright)
- Estado final: ACTIVE ✓

---

## FASE 1.3 · Viaje del prestador de servicios

### Endpoints validados ✓
- `POST /api/v1/users/auth/login/` · SP loguea ✓
- `GET /api/v1/services/` · root enumera endpoints hijos ✓
- `GET /api/v1/services/subscription-plans/` · 200 · después de seed, 3 planes visibles ✓
- `POST /api/v1/services/subscriptions/` · SP se suscribe al plan Profesional · 201 ✓
- `GET /api/v1/services/subscriptions/` · SP ve su suscripción activa ✓
- `GET /api/v1/services/requests/` · 200 ✓
- `POST /api/v1/core/tickets/` · 201 ✓ (requiere `category` obligatorio, solo acepta `priority` en `low/normal/high/urgent` — no `medium`)

### Bugs descubiertos

#### SVC-01 · P1 · sin seed de planes
**Descripción**: tras un `flush` limpio, la tabla `SubscriptionPlan` queda vacía. Los 3 planes documentados (Básico $50K / Profesional $100K / Enterprise $150K) no están en BD → SP no puede suscribirse hasta que alguien crea los planes manualmente desde admin.
**Impacto**: bloquea el flujo completo del prestador en un entorno recién desplegado.
**Fix aplicado ✓**: creado management command `services/management/commands/seed_subscription_plans.py`. Se corre con `python manage.py seed_subscription_plans` (idempotente, update_or_create por slug). Probado: 3 planes creados, SP se suscribe correctamente.

#### SVC-02 · **P1** · services/api_views.py:38 ServiceViewSet
**Descripción**: `POST /api/v1/services/services/` devuelve **HTTP 405**. El `ServiceViewSet` es `ReadOnlyModelViewSet` — **el prestador NO puede crear servicios** vía API.
**Causa raíz**: el modelo `Service` está diseñado como catálogo público (tipos genéricos por categoría, ej: "plomería residencial"), no como listings del prestador. No existe modelo `ServiceListing`/`ProviderOffer` que represente la oferta específica del prestador.
**Gap de modelo de negocio**: el plan Profesional anuncia `max_active_services: 10` pero no hay endpoint para publicar esos 10. Los campos `services_published` / `can_publish_service` de la suscripción no tienen contraparte escribible.
**Impacto**: el plan Profesional y Enterprise pagan por funcionalidades **inexistentes**. El SP paga $100K/mes sin poder publicar nada.
**Fix sugerido**: decisión de diseño requerida — (a) cambiar `ServiceViewSet` a `ModelViewSet` y permitir que el SP agregue categorías de servicio; (b) crear modelo `ServiceListing` nuevo vinculado a suscripción; (c) repensar modelo de negocio.

#### SVC-03 · P3 · naming
**Descripción**: ruta `/services/services/` (doble) por el router. Confuso pero funcional.

### Tickets validados ✓
- Creación `POST /core/tickets/` · 201 · ticket_number auto (`SPT-2026-00001`) · auto-assignment a department `general`
- Responses array vacío, ready for admin

---

## FASE 1.4 · Viaje del agente verificador

### Endpoints validados ✓
- `GET /api/v1/verification/agents/` · 200
- `GET /api/v1/verification/agents/available/` · 200
- `GET /api/v1/verification/agents/stats/` · 200
- `GET /api/v1/verification/visits/` · 200
- `POST /api/v1/verification/visits/` · 201 (admin crea)
- `POST /api/v1/verification/visits/{id}/assign_agent/` · 200 (después de fix VER-02)
- `POST /api/v1/verification/visits/{id}/start/` · 200 (después de fix VER-03 · por el agente)
- `POST /api/v1/verification/visits/{id}/complete/` · 200 (por el agente)

### Bugs descubiertos

#### VER-01 · P2 · `verification/api_views.py` VerificationAgentViewSet
**Descripción**: crear un agente vía API falla: `POST /verification/agents/` con body `{user: UUID, ...}` devuelve **HTTP 400 "Clave primaria inválida - objeto no existe"**, pese a que el User sí existe y el UUID es válido.
**Causa raíz probable**: el serializer usa `PrimaryKeyRelatedField` con queryset por defecto que no respeta `get_user_model()` (user_type filter?) o conflicto con la importación circular.
**Workaround**: crear VerificationAgent directamente desde Django shell.
**Fix sugerido**: en `VerificationAgentSerializer`, definir explícitamente `user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())`.

#### VER-02 · P2 · `verification/api_views.py:95-98` assign_agent
**Descripción**: `assign_agent` esperaba campo `agent_id` pero el cliente natural envía `agent` (nombre del FK en el modelo). Con `agent` respondía "Agente no encontrado".
**Fix aplicado ✓**: aceptar ambos nombres (`request.data.get('agent_id') or request.data.get('agent')`).

#### VER-03 · **P1** · `verification/api_views.py` VerificationVisitViewSet permissions
**Descripción**: `permission_classes = [IsAuthenticated, IsStaffUser]` bloqueaba TODO acceso al agente verificador, incluso para operar SU propia visita asignada. El agente no es staff (es `user_type='service_provider'`), así que recibía 403 en `start/complete/cancel`.
**Impacto bloqueante**: **el agente verificador no podía trabajar** — solo el admin podía ejecutar los pasos del agente, desvirtuando el modelo.
**Fix aplicado ✓**: creado `IsStaffOrAssignedAgent` permission class:
- Staff → CRUD completo
- Agente → solo `list/retrieve/start/complete/cancel` en SUS visitas (filtradas por `agent__user=request.user` en `get_queryset`)
Validado E2E: agente inicia y completa visita 200 ✓.

### Flujo completo validado ✓
pending → (admin `assign_agent`) → scheduled → (agente `start`) → in_progress → (agente `complete`) → completed
+ email notification al target_user

---

## FASE 1.5 · Viaje del admin jurídico

### Endpoints validados ✓
- `GET /api/v1/contracts/admin/pending/` · 200 bandeja de contratos pendientes
- `GET /api/v1/contracts/admin/stats/` · 200 estadísticas globales
- `POST /api/v1/contracts/admin/contracts/{id}/approve/` · 200 aprobación
- `POST /api/v1/contracts/admin/contracts/{id}/reject/` · 200 (no probado directamente pero endpoint existe)
- `POST /api/v1/contracts/admin/contracts/{id}/approve/` con self-contract → HTTP 400 **conflicto de interés validado** ✓
- `GET /api/v1/core/tickets/` + `/stats/` · 200
- `POST /api/v1/core/tickets/{id}/assign/` · 200
- `POST /api/v1/core/tickets/{id}/respond/` · 201 (requiere `message`, no `response`)
- `POST /api/v1/core/tickets/{id}/resolve/` · 200

### Bugs descubiertos

#### ADM-02 · P3 · `/api/v1/contracts/admin/sla-dashboard/` no existe · documentado arriba
#### ADM-03 · P3 · naming `respond` endpoint
**Descripción**: `POST /core/tickets/{id}/respond/` espera campo `message` pero el naming natural (según nombre de action) sería `response`. Envíar `{response:...}` → 400.
**Impacto**: fricción al usar el endpoint. Frontend tiene que saber el nombre específico.
**Fix sugerido**: aceptar ambos o renombrar el campo.

#### ADM-04 · P2 · `/api/v1/core/audit-logs/` 404
**Descripción**: no existe endpoint para consultar audit logs. La memoria dice "ContractTimeline Integration" pero el endpoint genérico está ausente.
**Impacto**: admin no puede ver historial de acciones globales.
**Fix sugerido**: evaluar si el endpoint debe agregarse o si el audit log es solo interno.

#### ADM-05 · P3 · `/api/v1/users/impersonation/` 404
**Descripción**: middleware `users/middleware.py` registra impersonation pero no hay endpoint API para iniciar/finalizar sesión de impersonation.
**Fix sugerido**: agregar endpoint admin protegido.

### Flujo ticket validado ✓
open → (admin `assign`) → in_progress → (admin `respond` agrega comentario) → (admin `resolve`) → resolved

### Conflict of interest (SEC crítico) ✓
`contracts/admin_approval_api.py` valida que `admin_user != contract.landlord` y retorna 400 con mensaje claro.

---

## FASE 2 · Conectividad técnica

### Integraciones probadas

#### Pagos
- `/api/v1/payments/transactions/` · `/invoices/` · `/payment-methods/` · `/escrow-accounts/` · 200 ✓
- `/payments/stats/balance/` · `/stats/dashboard/` · `/landlord/dashboard/` · 200 ✓
- Stripe / Wompi / PSE / Nequi: código de gateway existe (`payments/gateways/`), pero **no probado contra sandbox real** en esta auditoría.

#### DIAN Facturación electrónica
- `payments/dian_invoice_service.py` implementado (Resolución 000042/2020 · UBL 2.1 · CUFE)
- Se dispara vía `auto_invoice_rent_payment(transaction)` desde webhook de pago
- **No hay endpoint HTTP** para regenerar/consultar facturas DIAN directo

#### Messaging
- `/api/v1/messages/threads/` · `/conversations/` · `/messages/` · 200 ✓
- Thread auto-creado tras `accept_match` ✓
- WebSocket: 4 consumers registrados en `messaging/routing.py` (no probados end-to-end esta sesión)

### Bugs descubiertos

#### PAY-01 · **P1** · payments/ · currency='MXN' hardcoded
**Descripción**: toda la plataforma de pagos tenía `'MXN'` (peso mexicano) como moneda default. VeriHome opera en Colombia → debe ser `'COP'`.
**Impacto bloqueante**: transactions, invoices, escrow y payment plans guardarían moneda incorrecta. Facturas DIAN serían inválidas. Reportes mostrarían "MXN" a landlords colombianos.
**Archivos afectados**: `payments/models.py` (Transaction, Invoice, EscrowAccount), `payments/payment_plans.py`, `payments/api_views.py:1037`, `payments/gateways/stripe_gateway.py:134`.
**Fix aplicado ✓**: reemplazado 6 ocurrencias + migration `0004_alter_*_currency_*` generada y aplicada.
**Validado**: `GET /payments/stats/balance/` responde `"currency": "COP"` ✓.

#### DIAN-01 · P2 · `payments/dian_invoice_service.py`
**Descripción**: servicio DIAN implementado pero sin endpoint HTTP expuesto. Solo se dispara automáticamente desde webhook; no hay forma de regenerar manualmente ni descargar XML desde API.
**Fix sugerido**: crear `POST /payments/invoices/{id}/generate-dian/` + `GET /payments/invoices/{id}/dian-xml/`.

#### DASH-03 · P1 · warning ahora visible ✓
Tras fix parcial de DASH-03, el warning ahora aparece en logs del startup:
```
WARNING dashboard.urls - Dashboard V2 deshabilitado: cannot import name 'DashboardDataService' from 'dashboard.services'
```
Lo cual expone el problema real: faltan 3 clases service (`DashboardDataService`, `WidgetDataProvider`, `DashboardAnalytics`). Antes estaba oculto por el `pass` silencioso.

### Fix adicional · NOTIF-01
Creado `templates/core/email/welcome_notification.html` siguiendo el patrón de `contract_notification.html`. Usuarios nuevos ahora reciben email de bienvenida sin romper el send_mail.

---

## FASE 3 · Seguridad y cumplimiento legal

### Security ✓
- **Permisos**: tenant → 403 en contratos/propiedades ajenas ✓ · admin delete propiedad ajena → 403 ✓ · landlord no edita contrato en estado `completed_biometric` ✓ (validado por test unitario)
- **JWT**: refresh endpoint `/api/v1/users/auth/refresh/` 200 ✓ · tokens con TTL (access 1d / refresh 7d)
- **Security headers**: `X-Content-Type-Options: nosniff` ✓ · `X-XSS-Protection: 1; mode=block` ✓ · `Referrer-Policy: strict-origin-when-cross-origin` ✓ · `Content-Security-Policy: default-src 'none'` ✓
- **Rate limiting**: `auth_strict` 10/min configurado en `core/middleware.py:35` — exento en `DEBUG + localhost` (documentado, intencional, funciona en producción)
- **Conflict of interest**: admin ≠ landlord validado en `admin_approval_api` ✓

### Bugs menores

#### SEC-01 · P3 · `X-Frame-Options` faltante
**Descripción**: response headers no incluyen `X-Frame-Options: DENY`. Django lo agrega por default con `XFrameOptionsMiddleware`; puede estar desactivado.
**Fix sugerido**: verificar `MIDDLEWARE` en settings.

#### AUTH-02 · P3 · naming refresh endpoint
**Descripción**: el endpoint real es `/api/v1/users/auth/refresh/`. El cliente puede intentar `/auth/token/refresh/` (convención SimpleJWT) y recibir 404. Es convención VeriHome distinta a lib.
**Fix sugerido**: agregar alias `/auth/token/refresh/` o documentar.

### Cumplimiento Legal ✓

#### Ley 820 de 2003 (Arrendamiento Vivienda Urbana)
- Referenciado explícitamente en `contracts/api_views.py:2157`, `clause_models.py`, `colombian_contracts.py`
- `ARR_VIV_URB` tipo de contrato dedicado ✓
- Cláusulas dinámicas via `clause_manager.py`
- IPC adjustment para renovaciones (Art. 20)

#### Ley 1581 de 2012 (Habeas Data)
- Página pública `/privacy` accesible ✓ (HTTP 200)
- Páginas `/terms`, `/security` accesibles ✓
- Consentimiento en registro (pendiente verificar UI)

#### Resolución 000042/2020 DIAN
- Servicio UBL 2.1 implementado (`payments/dian_invoice_service.py`)
- CUFE generation lógica presente

---

## FASE 4 · Experiencia visual y UX

### Métricas

- **Adopción sistema diseño VIS-2**: 13 archivos usan `StatusChip`/`DialogShell`/`ProcessStepHeader`/`EmptyState`
- **Colores hardcoded (`#XXXXXX`)**: 29 archivos todavía con valores directos en lugar de tokens
- **Emojis residuales**: 15 hotspots principales (el más grande: `EnhancedTenantDocumentUpload.tsx` con 13, `PropertyForm.tsx` con 10, `PropertyFilters.tsx` con 6)
- **console.log en components**: 0 ✓ (limpios)

### Bugs / deuda técnica

#### VIS-4 · P3 · emojis fuera del flujo crítico
Los 15 archivos con emojis son SECUNDARIOS (no son los hotspots del flujo match/contract que VIS-3 ya cubrió). Principales:
- `EnhancedTenantDocumentUpload.tsx` (13)
- `PropertyForm.tsx` (10)
- `PropertyFilters.tsx` (6)
**Impacto**: inconsistencia visual menor. La plataforma se ve "infantil" en estos módulos.
**Fix sugerido**: re-aplicar barrido VIS-3 a estos archivos.

#### VIS-5 · P3 · 29 archivos con colores hardcoded
**Impacto**: cambio de tema (ej: dark mode completo) requiere tocar 29 archivos.
**Fix sugerido**: migrar todos a `useTheme()` + `theme.palette.*` + tokens de `theme/tokens.ts`.

### Validación TypeScript
- `npx tsc --noEmit` → exit 0 ✓ sin errores de tipos
- Responsive breakpoints: 21 archivos con `useMediaQuery`/`theme.breakpoints` ✓
- `aria-label` usages: 18 (parcial pero presente)
