# Arquitectura — VeriHome

Estructura de apps Django y layout del frontend. Para detalles de
sistemas específicos (biométrico, WebSocket, caché) ver
`docs/SYSTEMS.md`. Para contratos específicamente ver
`docs/CONTRACT_ARCHITECTURE.md`.

---

## Stack técnico

**Backend**
- Django 4.2.7 + Django REST Framework 3.14.0
- PostgreSQL (fallback SQLite en dev)
- Redis (fallback in-memory en dev)
- Django Channels 4.2.2 (WebSocket)
- Celery 5.3.4 + Celery Beat
- JWT Authentication (SimpleJWT)

**Frontend**
- React 18 + TypeScript 5 (strict mode, no `any`)
- Vite 5 (build)
- Material-UI 5
- TanStack Query (data-fetching)
- Axios (HTTP)
- React Hook Form (forms)

---

## Apps Django (`<proyecto>/`)

```
verihome/              # Project config
├── settings.py        # Fallbacks Redis/PG, WebSocket, Celery
├── urls.py            # API v1 routing
└── asgi.py            # ASGI para WebSocket

core/                  # Middleware, caché, audit, notificaciones
├── middleware.py      # Security, rate-limiting, performance
├── cache_utils.py     # Multi-level caching
├── audit_service.py   # log_activity helper + AuditService
└── notification_service.py

users/                 # Auth + perfiles
├── models.py          # User email-based
├── api_views.py       # JWT
├── adapters.py        # Allauth
├── middleware.py      # Impersonation, admin log
└── api_interview.py   # Códigos de invitación

properties/            # Listados
contracts/             # Legacy Contract + LCC + biométrico (ver CONTRACT_ARCHITECTURE.md)
matching/              # MatchRequest, algoritmo
messaging/             # 4 consumer types WebSocket
payments/              # Stripe + Wompi + Bold + PSE + Nequi
ratings/               # Multi-rol + unique parcial per contract/service_order (1.9.4)
requests/              # Documentos (ServiceRequest/PropertyInterestRequest…)
services/              # Catálogo + ServiceOrder + ServiceOrderHistory (1.9.5)
dashboard/             # Analytics widgets
verification/          # Agentes de campo + visitas + reports
```

---

## Frontend (`frontend/src/`)

```
components/
├── contracts/         Biométrico + workflow arrendador/arrendatario
├── properties/        List, Form, ImageUpload (drag&drop + compresión)
├── matching/          MatchesDashboard + MatchRequestForm
├── messaging/         Chat real-time
└── common/            ErrorBoundaries, LoadingSpinner

services/              Axios + servicios por dominio
hooks/                 useProperties, useContracts, useWebSocket…
contexts/              AuthContext, NotificationContext
types/                 user, property, contract, landlordContract
utils/                 performanceMonitor, imageOptimization
pages/
├── admin/             Dashboard V2 + AuditLog (ADM-001) + verification
└── …
```

### Autenticación
- Email-based (no username).
- JWT access 1d + refresh 7d.
- `localStorage.getItem('access_token')`.
- Auto-refresh en interceptor 401.
- Interview-code system: registro por invitación temporal.

### Responsive
- Breakpoint: Material-UI `md` (960 px).
- Desktop: tablas completas. Móvil: cards con touch.
- Biométrico: mobile-first (cámara).

---

## Puertos

| Servicio | Puerto |
|----------|--------|
| Django dev | 8000 |
| Vite dev | 5173 |
| WebSocket | 8000 (mismo que Django via Channels) |
| Daphne prod | 8001 |

---

## Referencias a otros docs

- **Sistemas específicos** (biométrico, WebSocket, caché, fallbacks): `docs/SYSTEMS.md`
- **Contratos (3 modelos)**: `docs/CONTRACT_ARCHITECTURE.md`
- **Patterns reutilizables**: `docs/PATTERNS.md`
- **Cumplimiento legal colombiano**: `docs/COMPLIANCE.md`
- **Deployment producción**: `docs/DEPLOYMENT.md`
- **Features y changelog**: `docs/CHANGELOG.md`
