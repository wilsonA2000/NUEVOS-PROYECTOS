# CLAUDE.md

Guía condensada para Claude Code (claude.ai/code). Este archivo se
carga en el contexto de cada sesión — se mantiene **slim**, con
punteros a docs especializados.

---

## Project Overview

**VeriHome** — plataforma empresarial de bienes raíces en Colombia
que conecta arrendadores, arrendatarios y prestadores de servicio.

- Backend: Django REST Framework.
- Frontend: React + TypeScript (Vite).
- Innovación: sistema biométrico de 5 pasos para contratos legalmente
  vinculantes (Ley 820/2003).

---

## Dónde mirar primero

| Tema | Documento |
|------|-----------|
| Arquitectura general + stack + apps Django + frontend | `docs/ARCHITECTURE.md` |
| Contratos (3 modelos: Contract, LCC, ColombianContract) | `docs/CONTRACT_ARCHITECTURE.md` |
| Subsistemas (biométrico, WebSocket, caché, fallbacks, rate-limits, trazabilidad, tickets, verification) | `docs/SYSTEMS.md` |
| Patrones de código (uploads, signals, audit, WebSocket consumer) | `docs/PATTERNS.md` |
| Cumplimiento legal (Ley 820, 1581, DIAN) | `docs/COMPLIANCE.md` |
| Deployment + variables de entorno + checklist | `docs/DEPLOYMENT.md` |
| Historial de features por fecha | `docs/CHANGELOG.md` |
| Sesión actual / próximos pasos | `NEXT_SESSION.md` |

---

## Development Commands

### Backend (Django)

```bash
source venv_ubuntu/bin/activate
python manage.py migrate
python manage.py runserver              # puerto 8000
python manage.py test                   # suite completa
python manage.py check_contract_sync    # Contract ↔ LCC sync
```

Detalles de comandos admin y management:
- `showmigrations`, `makemigrations`, `collectstatic`
- `check_admin_review_sla`, `check_biometric_expiration` (Celery)

### Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev            # puerto 5173
npm run build          # build producción
npm run lint           # ESLint
npm test               # Jest
npx tsc --noEmit       # type check
```

### Testing

```bash
# Backend
python manage.py test                              # todos
python manage.py test contracts matching services  # subset común
pytest --cov=.                                     # coverage

# Frontend
cd frontend && npm test                            # Jest
npx playwright test --config=playwright.config.e2e-real.ts
```

---

## Reglas de trabajo clave

### Trazabilidad (Fase 1.9)

Cuando modifiques estado de un `LandlordControlledContract` o
`ServiceOrder`, setea `_updated_by` antes de `save()` para que el
signal atribuya la acción:

```python
lcc._updated_by = request.user
lcc.current_state = 'TENANT_INVITED'
lcc.save()
```

Para logging unificado desde viewsets:

```python
from core.audit_service import log_activity
log_activity(request, action_type='match.accept',
             description='…', target_object=match_request,
             details={...})
```

Ver patterns completos en `docs/PATTERNS.md`.

### Contratos duales

**Ver `docs/CONTRACT_ARCHITECTURE.md`.** Contract (legacy) y
LandlordControlledContract comparten UUID. El biométrico sólo acepta
Contract (legacy); el frontend opera sobre LCC. Si creas LCC en un
test y tocas biométrico, crea también el Contract con el mismo UUID
(o usa `_ensure_contract_exists`). Valida consistencia con
`python manage.py check_contract_sync`.

### Sin retrocompat gratuita

Estamos en dev sin usuarios productivos. Eliminar campos, renombrar
types y borrar shims directamente en vez de dejar aliases. Si rompes
algo corre los tests y arregla; no inventes wrappers preventivos.

### Convenciones

- Backend: PEP 8, Django idiomático.
- Frontend: ESLint + Prettier, TypeScript strict (no `any`).
- Alias de imports: `@/…`.
- Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`).

---

## Estado actual (2026-04-18 noche)

- Branch `main` al día con la sesión más reciente.
- Tests backend: **677/677 OK** · traceability E2E 2/2 · contract_sync 3/3.
- Frontend: **5 errores TS pre-existentes** (tokens theme en landing/
  about/contact pages). Ninguno bloqueante.
- Fase 1.9 completa (trazabilidad end-to-end, 1.9.1 → 1.9.8).
- Fase 2 completa (doc dual contract + comando sync).
- ADM-001 frontend live en `/app/admin/audit-logs`.
- Fase 4 completa (split de docs + slim CLAUDE.md + archivo memorias).

Ver `NEXT_SESSION.md` para pendientes inmediatos.

---

## Archivos clave (de un vistazo)

**Backend**
- `verihome/settings.py` — fallbacks PG/Redis, Channels, Celery.
- `contracts/biometric_service.py` — flujo 5 pasos.
- `contracts/pdf_generator.py` — PDF notarial con Diosa Temis.
- `contracts/signals.py` — trazabilidad LCC (Fase 1.9.1).
- `services/signals.py` — trazabilidad ServiceOrder (Fase 1.9.5).
- `core/audit_service.py` — `log_activity` helper (Fase 1.9.7).
- `core/middleware.py` — rate-limiting + performance.

**Frontend**
- `src/components/contracts/BiometricAuthenticationFlow.tsx` — orchestration.
- `src/components/contracts/LandlordContractForm.tsx` — creación.
- `src/services/api.ts` — axios + interceptors (auto-refresh).
- `src/contexts/AuthContext.tsx` — estado global de auth.
- `src/pages/admin/AdminAuditLog.tsx` — audit trail (ADM-001).

---

## Auditorías recientes (link al detalle)

- E2E contratos + botones 2026-04-12 (14/14 bugs): `docs/history/SESSION_AUDIT_SUMMARY.md`.
- Auditoría E2E 5 viajes 2026-04-15 (25 bugs, 12 resueltos): `docs/history/AUDIT_2026_04_15_FINAL.md`.
- Auditoría profunda fases 1-6 2026-04-17 (15 bugs, 664→711 tests).

Para contexto histórico completo ver `docs/CHANGELOG.md` y
`docs/history/`.

---

**Last Updated**: 2026-04-18 (Fase 4 slim) · **Version**: Production-ready
