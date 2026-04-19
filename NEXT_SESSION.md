# NEXT_SESSION.md — VeriHome

**Última actualización**: 2026-04-19 noche (Fase L1 · profile/resume API verde)

---

## Estado actual

| Indicador | Valor |
|-----------|-------|
| Branch | `main` @ `17fea39` + Fase L1 |
| Backend tests | 690/690 OK (incluye 3 nuevos de Sentry J1) |
| Playwright moleculares | **25/25 verde** (Fase A-J + G5 + L1 · ~38 min total) |
| CI/CD | 9 jobs (backend/frontend fallan por lint pre-existente) + Lighthouse **verde** |
| Lighthouse score | a11y ≥0.9 ✅ · perf OK · best-practices 0.74 (warn) · SEO OK |
| Observability | Sentry guard-tested · slow-query log · health deep · axe-core WCAG |
| TS frontend | 5 errores pre-existentes |
| npm audit | **0 vulns** (K1 resuelto · vite 5→8 + typescript-eslint 6→8 + override serialize-javascript) |

---

## Lo que se hizo esta sesión (2026-04-19 noche)

### Fase L1 — Profile & Resume API flows (nueva spec molecular)
- `fase-l1-profile-resume.spec.ts` · 10 assertions end-to-end en 1.1 min:
  - `GET /users/profile/` anon → 401
  - `GET /users/profile/` landlord → 200 + `email` correcto
  - `PATCH /users/profile/` `phone_number` → 200 + persiste (re-GET)
  - `GET /users/profile/` tenant → 200 + `email` correcto
  - `POST /users/avatar/` sin file → 400
  - `GET /users/resume/` tenant → 200 (o 404 si primera corrida, entonces POST 201)
  - `PUT /users/resume/` `current_employer` + `education_level` → 200 + persiste
  - `GET /users/{tenant_id}/resume/` landlord → 200
  - `GET /users/{tenant_id}/resume/` service_provider → 403
- Seed `minimal` suficiente (solo usuarios, sin contratos).
- **Hallazgo**: `UserProfileSerializer` no expone `user_type` en el
  payload (solo el `UserSerializer`). El frontend toma `user_type` del
  `useAuth()` context, no del endpoint `/users/profile/`.

---

## Lo que se hizo esta sesión (2026-04-19 tarde)

### a11y landing (PR #2 merged · `3f2eb40`)
- `LandingPage.tsx:242` · Typography h6 → `component="h4"` (fix
  heading-order: venía h3 → h6 saltándose h4/h5).
- `LandingFooter.tsx` · aria-label en 4 IconButtons de Facebook/Twitter/
  LinkedIn/Instagram (link-name).
- Lighthouse CI re-run en `66a0c50` · accessibility subió 0.89 → ≥0.9
  (assertion bloqueante pasa).

### Fase J3-real · Lighthouse CI validado en PR real
- PR #2 `lighthouse-ci-validation` disparó `.github/workflows/lighthouse.yml`.
- Workflow corrió end-to-end: checkout → npm ci → build → LHCI → upload.
- Scores medidos en `/` (2 runs) + `/login` (2 runs), preset desktop:
  - `/` performance OK · **accessibility 0.89** (umbral 0.9 → falla · bloqueante)
  - `/` best-practices 0.74 (warn) · SEO OK
  - `/login` best-practices 0.74 (warn)
- **Finding a11y**: 2 audits fallando en landing (`heading-order`,
  `link-name`). Fix trivial, pendiente para próxima sesión.
- Side-fixes del commit `dcbffa4`:
  - `ci-cd.yml` + `lighthouse.yml` Node 18 → 22 (vite 8 requiere ≥20.19).
  - `frontend/.npmrc` `legacy-peer-deps=true` (vite 8 + plugin-react 6
    + typescript-eslint 8 requieren flag para resolver peers).

### Fase K1 — npm audit clean (12 → 0 vulns)
- `vite` 5.1.0 → **8.0.8** (3 majors · incluye Rolldown interno).
- `@vitejs/plugin-react` 4 → **6.0.1** (requerido por vite 8).
- `@typescript-eslint/parser` + `eslint-plugin` 6.21.0 → **8.58.2**
  (cierra cadena minimatch ReDoS).
- `vite.config.ts`: quitado `splitVendorChunkPlugin` (removido en vite 6).
  `manualChunks` explícito ya cubría el caso.
- `overrides.serialize-javascript` ^7.0.5 (cierra cadena
  workbox-build → @rollup/plugin-terser → serialize-javascript).
- `@testing-library/dom` ^10.4.1 instalado explícito (vite 8 rompió
  resolución transitiva; peer de `@testing-library/react@16`).
- Validado: `npm run build` OK 2m 56s · dev server OK · Playwright
  G5+A1+H1 verdes · tsc con 5 errores pre-existentes (theme tokens).

### Fase G5 — Contract PDF preview validation
- Nueva spec `fase-g5-contract-pdf-preview.spec.ts`:
  - Landlord + tenant reciben 200 + `application/pdf` + `%PDF-` + >10KB
  - Anon → 401 · service_provider → 403
- Endpoint validado: `GET /api/v1/contracts/{id}/preview-pdf/`
  (ContractPreviewPDFAPIView acepta LCC o Contract legacy con mismo UUID).
- PDF real pesa ~43KB con cláusulas + branding + Diosa Temis watermark.

---

## Lo que se hizo esta sesión (2026-04-18 tarde)

### Fase 1.9.2 — Deprecar `workflow_history` JSONField
- Migración `0024_bio_1_9_2_backfill_workflow_history.py`: backfill idempotente
  (dedupe contra signal 1.9.1 por contract+timestamp±1s+action_type).
- `add_workflow_entry` / `add_workflow_event` ahora persisten en
  `ContractWorkflowHistory` (misma firma para todos los callers: 8 internos +
  `biometric_service`, `landlord_api_views`, `tasks`, `tenant_api_views`).
- `_record_history` en service ya no duplica (antes creaba fila + JSON).
- Serializers (landlord + tenant): campo `workflow_history` removido; expuesto
  `history_entries` vía `ContractWorkflowHistorySerializer`.
- `circular_workflow_status` usa ORM con filtros sobre
  `metadata.legacy_event_type` (backfilled) + `new_state`.
- Frontend: `WorkflowHistoryEntry` → `ContractHistoryEntry`, shape alineado al
  serializer. `AdminContractReview.tsx` renderiza `history_entries`.
- Columna JSONField conservada en BD (rollback-safe); drop diferido.

---

## Lo que se hizo esta sesión (2026-04-18)

### Bugs P0/P1 resueltos (7)
| ID | Descripción | Tests |
|---|---|---|
| **MATCH-001** (P0) | `NameError match_data` en `create_contract_from_match`. Refactor: `MatchContractIntegrationService` delega en `_ensure_contract_exists()`. `MatchContractViewSet` desmantelado + 5 endpoints muertos removidos (sign, download-pdf, milestones, verify-identity, generate-clauses). El tercer modelo `ColombianContract` queda aislado (solo lo usa `payments/escrow_integration.py`). | 4/4 |
| **BIO-001** | Estados biométricos inconsistentes (`tenant_biometric` vs `pending_tenant_biometric`). `STATES_READY_FOR_BIOMETRIC` acepta ambos. Frontend `BiometricAuthenticationPage.tsx` whitelist ampliada. | 5/5 |
| **SVC-001** | `ServiceViewSet` ya era `ModelViewSet`; faltaba validar `max_active_services`. Añadido en `perform_create` + decrement en `perform_destroy`. | +1 |
| **ADM-001** | Endpoint `/api/v1/core/audit-logs/` ya existía; agregados filtros `date_from`/`date_to` ISO8601. Frontend (vista) queda para sesión siguiente. | — |
| **ABOG-001** | `PATCH /contracts/{id}/additional-clauses/{clause_id}/`: staff puede editar cuando LCC está en revisión jurídica (`PENDING_ADMIN_REVIEW` / `RE_PENDING_ADMIN` / `BOTH_REVIEWING`), con audit `CLAUSE_EDITED`. | — |
| **TENANT-001** | Nueva action `POST /contracts/landlord/{id}/reopen_negotiation/` (REJECTED_BY_TENANT → DRAFT). Fix colateral: `tenant_api_views` usa `REJECTED_BY_TENANT` canónico en vez de `TENANT_REJECTED`. | — |
| **BIO-002** | `biometric_flags.is_demo_biometric_mode()` + disclosure Ley 1581. Backend incluye `demo_mode: true` en start-authentication; frontend muestra Alert warning en los 5 pasos. | — |

### Fase 1.9.1 — Signal central de trazabilidad
- `contracts/signals.py`: nuevo receiver que graba cada transición de `current_state` en `ContractWorkflowHistory` automáticamente.
- Migración `0023_bio_1_9_1_signal_nullable_performed_by.py`: `performed_by` ahora nullable (para acciones del sistema); `user_role` default `'system'`.
- Views que necesitan atribuir usuario pueden setear `instance._updated_by = request.user` antes de `save()` (patrón estándar thread-local).

### Fase 3 — Limpieza de basura
- Eliminados: 4 logs vacíos, `db.sqlite3.pre-fixes.bak`, `PropertyForm.tsx.backup`, `AUDIT_2026_04_15_FINAL.md` (duplicado).
- Movidos a `docs/history/`: `ANALISIS_QUIRURGICO_*`, `AUDIT_2026_04_15`, `BUTTON_AUDIT_*`, `FINDINGS`, `GUIA_USUARIO_VERIHOME`, `IMPLEMENTATION_PLAN`, `SESSION_AUDIT_SUMMARY`, `SESSION_2026_04_13/14`.
- `verihome/settings.py`: retirados 3 comentarios de apps inexistentes.

---

## Pendiente próxima sesión

### ✅ Fase 1.9 (trazabilidad end-to-end) — COMPLETA
1. ✅ **1.9.1** Signal central ContractWorkflowHistory (sesión anterior).
2. ✅ **1.9.2** Deprecar `LCC.workflow_history` JSONField — `eac4f68`.
3. ✅ **1.9.3** `ServiceRequest` FK a User/Property/Contract — `70d5afd`.
4. ✅ **1.9.4** `Rating.service_order` FK + uniqueness parcial — `bb68dbe`.
5. ✅ **1.9.5** `ServiceOrderHistory` modelo + signal post_save — `85411ae`.
6. ✅ **1.9.6** `MessageThread.service_order` FK — `e269a5e`.
7. ✅ **1.9.7** `core.audit_service.log_activity()` en 7 módulos — `a9a6e60`.
8. ✅ **1.9.8** 2 tests E2E de trazabilidad — `60e3a22`.

### ✅ Fase 2 + ADM-001 frontend — COMPLETA
- ✅ `docs/CONTRACT_ARCHITECTURE.md` + docstrings en 3 modelos + comando
  `check_contract_sync` — `683c1bd`.
- ✅ `AdminAuditLog.tsx` sobre `/app/admin/audit-logs` — `b6f8a5e`.

### ✅ Fase 4 + seguridad deps + DIAN — COMPLETA
- ✅ Slim CLAUDE.md 703→174 líneas + 6 docs especializados — `8a5ee12`.
- ✅ xlsx removido (1 high-severity vuln menos) — `75eba17`.
- ✅ DIAN CUFE SHA-384 + XAdES stub + 7 tests — `690a1f4`.

### ✅ Playwright moleculares Fase A-F — COMPLETA (13/13 verde)
- A (3): ciclo circular · admin reject · tenant objection — `82a91ae` + `278fadf`.
- B (2): ServiceOrder · ServiceRequest anon/auth — `f2d6d93`.
- C (1): verificación presencial end-to-end — `c979579`.
- D (1): cronograma canon auto — `1559c78`.
- E (3): rating service_order · thread contexts · audit trail — `6056989`.
- F (3): renewal IPC · tickets · subscriptions — `6758977`.

**7 bugs producción arreglados** durante la suite:
- AdminContractApprovalView no aceptaba `RE_PENDING_ADMIN`.
- ContractWorkflowHistoryViewSet filtraba staff + sin filtro `?contract=`.
- ContractObjectionSerializer fields desincronizados del modelo.
- Seed no creaba `EmailAddress(verified=True)` → login fallaba.
- Seed ampliado con admin/service_provider/verification_agent.
- RatingListCreateView.perform_create ahora soporta `service_order`.
- ServiceSubscriptionViewSet.subscribe usa `update_or_create`
  (OneToOne impedía re-subscribe tras cancel).

### 🟢 P2 — requieren user/ops
- **Deploy producción** — infra (Daphne + Celery + PostgreSQL + Redis + SSL).
- **DIAN XAdES activo** — certificado `.p12` + signxml lib. Stub en
  `payments/dian_invoice_service.py:sign_invoice_xml`.

### 🟡 Pendientes detectados en esta sesión (para próxima)
- **ci-cd.yml failing**: `test-frontend` (ESLint --max-warnings 0 con
  warnings pre-existentes en `utils/imageOptimization.ts`,
  `performanceMonitor.ts`, `videoUtils.ts`), `lint-check` (black
  backend diff en `verihome/urls.py`, `wsgi.py`), `security-scan`,
  `test-backend`. Scope: fix de lints acumulados.
- **Lighthouse best-practices 0.74** · warn (no bloquea). Probable
  causa: cookies sin Secure, CSP, etc. Investigar.
- **i18next**: grep rápido arroja **~664 strings hardcoded** en 100+
  archivos (vs ~628 `t()` existentes). NO es quick win — proyecto de
  varias sesiones para internacionalizar completo.
- **Biometric UI real** (camera + voice E2E): scope grande · sesión
  fresca dedicada.
- ✅ **Profile/resume UI E2E** — cerrado con Fase L1 (API-level, 10
  assertions). UI navegación directa sobre `/app/profile` y
  `/app/resume` queda como opcional (Jest ya cubre render).

---

## Comandos para arrancar

```bash
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
git status                               # limpio en main @ 690a1f4
source venv_ubuntu/bin/activate
python manage.py migrate                 # todas aplicadas
python manage.py check_contract_sync     # Contract ↔ LCC sync status
python manage.py test matching contracts services ratings messaging payments verification properties
# → 687/687 OK + 3 skip
```

---

## Prompt para reanudar

```
Continúa VeriHome. Main @ 17fea39 + Fase L1 local (profile/resume API
spec verde, 10 assertions). 25/25 moleculares OK. Pendiente principal
es ci-cd.yml (1371 errores ESLint + 13 ruff backend) — no quick win.
Biometric UI E2E real sigue de sesión fresca. Ver NEXT_SESSION.md.
```
