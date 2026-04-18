# Changelog — VeriHome

Resumen condensado de features entregadas. Para detalle por sesión,
ver `docs/history/` (histórico arquivado) y memoria de Claude Code.

---

## 2026-04

### Fase 1.9 (trazabilidad end-to-end, 8 items) — 2026-04-18 PM/noche

- **1.9.1** Signal central `contracts/signals.py` → filas automáticas
  en `ContractWorkflowHistory` cada transición de `current_state`.
- **1.9.2** JSONField `workflow_history` deprecado. Backfill migración
  0024 preserva `legacy_event_type` en `metadata`.
- **1.9.3** `services.ServiceRequest` FKs `User/Property/Contract`
  nullable (`related_name='catalog_service_requests'`).
- **1.9.4** `Rating.service_order` FK + uniqueness parciales (una
  calificación por contrato, una por orden).
- **1.9.5** `ServiceOrderHistory` + signal `services/signals.py`.
- **1.9.6** `MessageThread.service_order` FK opcional.
- **1.9.7** Helper `core.audit_service.log_activity` instrumentado en
  7 módulos (matching, contracts, properties, ratings, services,
  payments, verification).
- **1.9.8** Tests E2E `test_full_traceability` + `test_service_traceability`.

### Fase 2 — 2026-04-18 noche

- `docs/CONTRACT_ARCHITECTURE.md` como fuente única para los 3 modelos
  (Contract legacy, LCC, ColombianContract).
- Comando `python manage.py check_contract_sync [--json] [--fix]`.
- Docstrings apuntando al doc en cada modelo.

### ADM-001 frontend — 2026-04-18 noche

- `AdminAuditLog.tsx` sobre `/app/admin/audit-logs`.
- Consume `/api/v1/core/audit-logs/` con filtros de fechas / tipo /
  modelo / usuario.
- TanStack Query v5 (`placeholderData: keepPreviousData`).

### Fase 4 — 2026-04-18 noche

- Slim `CLAUDE.md` (703 → ~350 líneas).
- Split en 6 docs: `ARCHITECTURE.md`, `SYSTEMS.md`, `PATTERNS.md`,
  `COMPLIANCE.md`, `DEPLOYMENT.md`, `CHANGELOG.md`.
- Memorias de marzo archivadas en `memory/archive/`.

### Workflow fixes — 2026-04-18

- MATCH-001 `NameError match_data` en `create_contract_from_match`.
  Refactor: delega en `_ensure_contract_exists`.
- BIO-001 Estados biométricos canónicos (`STATES_READY_FOR_BIOMETRIC`).
- SVC-001 Validación `max_active_services` en `ServiceViewSet`.
- ABOG-001 Staff puede editar cláusulas cuando LCC en revisión.
- TENANT-001 Action `reopen_negotiation` (REJECTED_BY_TENANT → DRAFT).
- BIO-002 `demo_mode` + disclosure Ley 1581 en biométrico.

---

## 2026-04 (primera mitad)

### Auditoría jurídica Ley 820/2003 — 2026-04-18 AM

5 cláusulas reforzadas + guarantor ORM fix + dual workflow sync +
visual ContractDetail/AdminContractReview + E2E admin-review.

### Módulo de pagos E1+E2+E3 — 2026-04-16 PM

- PaymentOrder consecutivo.
- 3 fechas Ley 820 (due, grace_end, max_overdue).
- Frontend: dashboard + modal pago + PDF receipt.
- 148 tests nuevos (total 812).

### BUG-PAY-GW — 2026-04-17 PM

- Bold integrado (gateway COP primario).
- VIS-5 design tokens en 21 archivos.
- E2E 7/7 verde (20.2 min).

### Auditoría profunda 6 fases — 2026-04-17

15 bugs resueltos, tests backend 664→711, frontend ratings/messaging
URLs y guards corregidos.

### BIO-02 P0 — 2026-04-16

`_ensure_contract_exists` crea LCC sincronizado por UUID, E2E triple
firma verde, matching tests 60/60.

### Auditoría E2E 5 viajes humanos — 2026-04-15

25 bugs, 12 arreglados (PAY-01 MXN→COP, PROP-03 cache P0, VER-03
permisos, SVC-01 seed). BIO-02 dejado como P0 pendiente.

### Sistema visual VIS-2 + VIS-3 — 2026-04-14

Design tokens + 4 componentes + 15 archivos aplicados + 86 emojis
fuera. E2E 5 verdes.

### Consolidado Match→Contract — 2026-04-13

Eliminado `/matched-candidates`. Fix `accept_match` crea Contract
automático. 6 bugs HTTP pendientes, plan visual aprobado.

### Auditorías E2E completas — 2026-04-12

Contratos + botones: 116/116 acciones OK. 14/14 bugs resueltos.

---

## 2026-03 (consolidado)

Sesiones de marzo archivadas en memoria (ver `memory/archive/`):
- 2026-03-18: CI/CD 7/7 green, TS strict mode, 745 tests.
- 2026-03-19 AM/PM: Phases 2-5 completas, 771 tests, renewal wizard,
  dashboard stats; 20 bugs resueltos, 95 alerts→MUI, 41 archivos
  muertos removidos, theme unificado.
- 2026-03-20: Public pages enterprise redesign, contact form, 3 legal
  pages, scroll-reveal.
- 2026-03-23 P1/P2/P3: Business model 6 pillars, DIAN invoicing,
  frontend gaps closed, E2E 60 tests, 254 new backend tests (502 total),
  688 endpoints verificados.
- 2026-03-27: Match workflow debug, DB reset, screen-based server mgmt.

---

## Features destacadas históricas

- Biometric Contract Authentication — 5 pasos, first-in-industry.
- Real-time messaging WebSocket.
- AI matching tenant↔landlord.
- Mobile responsive total.
- Ley 820/2003 + Ley 1581/2012 compliance.
- Dual contract architecture (Contract legacy + LCC).
- Fallbacks PostgreSQL→SQLite, Redis→memory.
- PDFs notariales con Diosa Temis.
- Renovación con IPC (Ley 820 Art. 20).
- Integración Stripe + Wompi/PSE + Nequi + Bold.
- Maintenance request system.
- Multi-idioma ES/EN (react-i18next).
- Admin Dashboard V2 con notificaciones real-time.
- Contact form backend real + email.
- Páginas legales (/terms /privacy /security).
- Scroll animations (useScrollReveal + ScrollToTopButton).
- Google Maps en /contact.
- Juridical review SLA (5 días hábiles + auto-escalación).
- Conflict-of-interest validation.
- ContractTimeline component.
- Verification Agents module (visits, reports, ratings).
- Internal Tickets system (departments + auto-distribución).
- Service Provider Subscriptions (Básico / Profesional / Enterprise).
- Payment auto-charge diario con Celery.
- Payment reconciliation via webhooks.
- Payment confirmation emails.
- DIAN electronic invoicing UBL 2.1.
- Admin Verification / Tickets / Subscriptions dashboards.
- User status persistence (is_online, last_seen).
- Dynamic FAQ system.
- Profile completeness alerts.
