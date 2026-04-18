# NEXT_SESSION.md — VeriHome

**Última actualización**: 2026-04-18 (fix 7 bugs workflow + Fase 1.9.1 + limpieza)

---

## Estado actual

| Indicador | Valor |
|-----------|-------|
| Branch | `main` @ `2fbab97` |
| Backend tests | `matching` + `contracts/tests/test_biometric_states` + `services` verde |
| Raíz limpia | sólo CLAUDE.md + README.md + NEXT_SESSION.md |
| docs/history/ | 11 archivos históricos archivados |

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

### 🔴 P0 — completar Fase 1.9 (trazabilidad end-to-end)
1. **1.9.2** Deprecar `LCC.workflow_history` JSONField → `ContractWorkflowHistory` como fuente única (migración de backfill).
2. **1.9.3** `ServiceRequest` FK a `User`/`Property`/`Contract` (migración, preservar campos string).
3. **1.9.4** `Rating.service_order` FK (migración) + serializer/UI.
4. **1.9.5** `ServiceOrderHistory` modelo + signal post_save.
5. **1.9.6** `MessageThread.service_order` FK.
6. **1.9.7** Usar `core.audit_service.log_user_activity()` en 7 módulos.
7. **1.9.8** 2 tests E2E (`test_full_traceability`, `test_service_traceability`).

### 🟡 P1 — plan original restante
- **Fase 2** Documentar dual contract system (ver plan): `docs/CONTRACT_ARCHITECTURE.md`, comentarios en modelos, `check_contract_sync` management command, test dual sync.
- **Fase 4** Slim `CLAUDE.md` (703 → ~350 líneas) + split en `docs/ARCHITECTURE.md`, `docs/SYSTEMS.md`, `docs/PATTERNS.md`, `docs/COMPLIANCE.md`, `docs/DEPLOYMENT.md`, `docs/CHANGELOG.md`. Consolidar memorias de marzo → `memory/archive/`.
- **ADM-001 frontend** Crear `AdminAuditLog.tsx` bajo `/app/admin/audit-logs`.

### 🟢 P2 — ya pendientes previos
- Pruebas manuales `MANUAL_E2E_CHECKLIST.md`.
- Migrar `xlsx` → `exceljs` (13 vulnerabilidades).
- Deploy producción (Daphne + Celery + PostgreSQL/Redis + SSL).
- DIAN firma digital XAdES.

---

## Comandos para arrancar

```bash
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
git status                               # limpio en main @ 2fbab97
source venv_ubuntu/bin/activate
python manage.py migrate                 # aplicar 0023_bio_1_9_1_signal_nullable_performed_by
python manage.py test matching contracts services  # verificar todo verde
```

---

## Prompt para reanudar

```
Continúa VeriHome. Main @ 2fbab97. Última sesión cerró 7 bugs P0/P1 + Fase 1.9.1.
Pendientes P0: Fase 1.9.2-1.9.8 (FKs ServiceRequest/Rating/MessageThread,
ServiceOrderHistory, tests E2E trazabilidad).
Ver NEXT_SESSION.md para detalle.
```
