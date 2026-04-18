# NEXT_SESSION.md — VeriHome

**Última actualización**: 2026-04-18 (Fase 1.9 + Fase 2 + ADM-001 frontend)

---

## Estado actual

| Indicador | Valor |
|-----------|-------|
| Branch | `main` @ `b6f8a5e` (11+ commits ahead de origin) |
| Backend tests | 677/677 OK · traceability E2E 2/2 · contract_sync 3/3 |
| TS frontend | 5 errores pre-existentes (tokens theme) |
| Raíz limpia | sólo CLAUDE.md + README.md + NEXT_SESSION.md |
| docs/history/ | 11 archivos históricos archivados |
| docs/ nuevos | `CONTRACT_ARCHITECTURE.md` (Fase 2) |

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

### 🟡 P1 — pendiente
- **Fase 4** Slim `CLAUDE.md` (703 → ~350 líneas) + split en
  `docs/ARCHITECTURE.md`, `docs/SYSTEMS.md`, `docs/PATTERNS.md`,
  `docs/COMPLIANCE.md`, `docs/DEPLOYMENT.md`, `docs/CHANGELOG.md`.
  Consolidar memorias de marzo → `memory/archive/`.

### 🟢 P2 — ya pendientes previos
- Pruebas manuales `MANUAL_E2E_CHECKLIST.md`.
- Migrar `xlsx` → `exceljs` (13 vulnerabilidades).
- Deploy producción (Daphne + Celery + PostgreSQL/Redis + SSL).
- DIAN firma digital XAdES.

---

## Comandos para arrancar

```bash
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
git status                               # limpio en main @ b6f8a5e
source venv_ubuntu/bin/activate
python manage.py migrate                 # 0024 LCC + 0005 services + 0003/0004 ratings + 0006 services + 0003 messaging aplicadas
python manage.py check_contract_sync     # Contract ↔ LCC sync status
python manage.py test matching contracts services ratings messaging payments verification properties  # 677/677
```

---

## Prompt para reanudar

```
Continúa VeriHome. Main @ b6f8a5e. Fase 1.9 completa (8 items), Fase 2
completa (doc + check_contract_sync), ADM-001 frontend live
(/app/admin/audit-logs). Siguiente bloque sugerido: Fase 4 (slim
CLAUDE.md de 703→350 líneas + split en 6 docs), ver NEXT_SESSION.md.
```
