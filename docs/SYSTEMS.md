# Sistemas — VeriHome

Detalles operativos de subsistemas críticos (biométrico, WebSocket,
caché, fallbacks, rate-limits). El índice general está en
`CLAUDE.md`. La arquitectura en `docs/ARCHITECTURE.md`. Los 3
modelos de contrato en `docs/CONTRACT_ARCHITECTURE.md`.

---

## Biometric Contract Flow (revolucionario)

### Flujo (5 pasos + orden secuencial)

```
1. Draft Contract → PDF Generation
2. Edit Option (pre-autenticación)
3. Biometric Authentication (5 pasos):
   a. Face Capture (frontal + lateral)
   b. Document Verification (cédulas colombianas)
   c. Combined Verification (doc + cara)
   d. Voice Recording (frase del contrato)
   e. Digital Signature
4. Contract Activation → Execution Phase
```

**Orden secuencial forzado por backend**: Tenant → Guarantor (si
aplica) → Landlord. No se puede bypassear.

### Endpoints biométricos

```
POST /api/v1/contracts/{id}/start-authentication/
POST /api/v1/contracts/{id}/face-capture/
POST /api/v1/contracts/{id}/document-capture/
POST /api/v1/contracts/{id}/combined-capture/
POST /api/v1/contracts/{id}/voice-capture/
POST /api/v1/contracts/{id}/complete-auth/
GET  /api/v1/contracts/{id}/auth-status/
```

### Notas
- ML actualmente en simulación (listo para integración Google
  Vision / Azure Speech en producción).
- Thresholds de seguridad configurables por tipo de contrato.
- Mobile-first: cámara con guías visuales y análisis de calidad en
  tiempo real.
- Demo mode (Fase BIO-002): incluye `demo_mode: true` en
  start-authentication + disclosure Ley 1581 en frontend.

---

## Estados canónicos del contrato

Usar desde `contracts/constants.py`:

```python
from contracts.constants import ContractState, STATES_READY_FOR_BIOMETRIC

# Comparar con .value, mostrar con .label
if contract.status == ContractState.ACTIVE.value:
    ...
```

### Safeguards del workflow LCC
- `admin_review_deadline`: SLA de 5 días hábiles para revisión jurídica.
- `admin_review_escalated`: flag de auto-escalación.
- Conflict-of-interest: validación `admin_user != contract.landlord`.
- Celery: `check_admin_review_sla`, `check_biometric_expiration`.

---

## WebSocket (4 consumers)

1. `ws://localhost:8000/ws/messaging/` — General.
2. `ws://localhost:8000/ws/notifications/` — Push.
3. `ws://localhost:8000/ws/messaging/thread/{thread_id}/` — Thread-specific.
4. `ws://localhost:8000/ws/user-status/` — Online/offline.

Ejemplo de uso:

```typescript
import { websocketService } from '@/services/websocketService';
websocketService.connect('messaging');
websocketService.subscribe('message.new', handleNewMessage);
```

---

## Caché multi-nivel

| Nombre         | Propósito                 | TTL        |
|----------------|---------------------------|------------|
| `default`      | General                   | 5 min      |
| `sessions`     | Session data              | 1 hora     |
| `query_cache`  | Query results             | 15 min     |
| `local_fallback` | In-memory backup        | según uso  |

Patrón de keys:

```python
f'property_list_{filters_hash}'
f'property_detail_{property_id}'
f'contract_{contract_id}_status'
f'user_{user_id}_contracts'
```

---

## Fallbacks automáticos

`scripts/database/database_config.py` auto-detecta PostgreSQL/Redis
al arrancar. Si no responden:
- PostgreSQL → SQLite (dev only).
- Redis → local in-memory (dev only).

Logs que lo confirman:

```
Usando cache local como fallback - Redis no disponible
Usando InMemoryChannelLayer - Redis no disponible
```

---

## Rate limiting (`core/middleware.py`)

| Scope | Límite |
|-------|--------|
| `auth_strict` | 10/min (login, register, forgot-password) |
| `auth` | 60 / 5 min (refresh, me) |
| `api_authenticated` | 3000/h (dashboards intensivos) |
| `api_anonymous` | 300/h |
| `admin` | 1000/h |

Exención: en `settings.DEBUG` y IP en `{127.0.0.1, ::1}` → sin límite.

---

## Trazabilidad end-to-end (Fase 1.9)

Todo cambio relevante queda en tablas relacionales para auditoría:

- `ContractWorkflowHistory`: transiciones LCC (signal 1.9.1).
- `ServiceOrderHistory`: transiciones ServiceOrder (signal 1.9.5).
- `Rating.service_order`: FK cuando la calificación es sobre un
  servicio (1.9.4).
- `ServiceRequest.requester/property/contract`: FKs nullable (1.9.3).
- `MessageThread.service_order`: FK opcional (1.9.6).
- `core.audit_service.log_activity(request, ...)`: helper uniforme en
  7 módulos (matching, contracts, properties, ratings, services,
  payments, verification) — persiste en `ActivityLog` y
  `UserActivityLog`.

Frontend: `/app/admin/audit-logs` (ADM-001).

---

## Internal Tickets (Pilar 2)

Departamentos: `general`, `verification_agents`, `legal`, `ceo`,
`marketing`, `technical`, `billing`.

Auto-distribución: cada `ContactMessage` → `SupportTicket` (departamento
detectado por keywords).

### API

```
GET/POST   /api/v1/core/tickets/                  # CRUD
POST       /api/v1/core/tickets/{id}/assign/       # Asignar
POST       /api/v1/core/tickets/{id}/respond/      # Respuesta
POST       /api/v1/core/tickets/{id}/resolve/      # Resolver
POST       /api/v1/core/tickets/{id}/close/        # Cerrar
GET        /api/v1/core/tickets/stats/             # Métricas
```

---

## Verification Agents (Pilar 1)

```
verification/
├── models.py       VerificationAgent, VerificationVisit, VerificationReport
├── admin.py        Panel con fieldsets
├── api_views.py    3 ViewSets + acciones (assign, start, complete…)
└── api_urls.py     Router-based URLs
```

### API

```
GET/POST   /api/v1/verification/agents/
GET        /api/v1/verification/agents/available/
GET        /api/v1/verification/agents/stats/
GET/POST   /api/v1/verification/visits/
POST       /api/v1/verification/visits/{id}/assign_agent/
POST       /api/v1/verification/visits/{id}/start/
POST       /api/v1/verification/visits/{id}/complete/
POST       /api/v1/verification/visits/{id}/cancel/
GET/POST   /api/v1/verification/reports/
POST       /api/v1/verification/reports/{id}/approve/
```
