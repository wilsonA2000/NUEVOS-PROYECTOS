# Arquitectura de Contratos — VeriHome

**Última actualización**: 2026-04-18 · Fase 2 (post-1.9.8).

VeriHome tiene **tres modelos de contrato** coexistentes en el código
base. Entender quién los usa es obligatorio antes de tocar cualquier
código que viva en `contracts/`. Esta página es la fuente única.

---

## 1. Contract (legacy) — `contracts/models.py:Contract`

**Rol**: Modelo original. Es el **único** que el módulo biométrico
acepta como input. También lo consumen `payments`, `ratings`,
`messaging` (vía FK `.contract`), y `requests.ContractSignatureRequest`.

**Campos clave**:
- `primary_party` / `secondary_party`: User. Por convención
  `primary_party` = landlord, `secondary_party` = tenant.
- `status`: estados lineales (`draft` → `active` → `terminated`).
- `biometric_*`: datos del flujo biométrico.

**No escribir directamente sin sincronizar con LCC**. Ver §3.

---

## 2. LandlordControlledContract (moderno) — `contracts/landlord_contract_models.py:LandlordControlledContract`

**Rol**: Workflow circular con estados del Plan Maestro V2.0
(revisiones del abogado, devolución del tenant, firma secuencial).
Es lo que el frontend crea y edita.

**Campos clave**:
- `landlord`, `tenant`, `guarantor`, `property`.
- `current_state`: enumeración rica (`PENDING_ADMIN_REVIEW`,
  `RE_PENDING_ADMIN`, `TENANT_RETURNED`, `BOTH_REVIEWING`, etc.).
- `economic_terms`, `contract_terms`, `special_clauses`: JSONFields
  editables.
- `history_entries` (reverse accessor): relación 1→N a
  `ContractWorkflowHistory` (modelo relacional desde Fase 1.9.2).

**Trazabilidad**: cada cambio de `current_state` se registra
automáticamente en `ContractWorkflowHistory` vía el signal
`contracts.signals.record_state_transition` (Fase 1.9.1). Los views
pueden atribuir el cambio a un usuario concreto seteando
`instance._updated_by = request.user` antes de `instance.save()`.

---

## 3. ColombianContract — `contracts/colombian_contracts.py:ColombianContract`

**Rol**: Contenedor legal para cumplimiento estricto de la normativa
colombiana (Ley 820/2003 y otras). **Uso aislado**: sólo lo consume
`payments/escrow_integration.py` para escrow.

**Cuándo tocar**: únicamente si estás trabajando en escrow o
certificación legal. Cualquier otro flujo debe usar `Contract` o
`LandlordControlledContract`.

---

## Sincronización Contract ↔ LandlordControlledContract

**Invariante**: ambos modelos comparten el mismo `id` (UUID). Cuando se
crea un LCC, debe existir un `Contract` con el mismo UUID para que el
módulo biométrico pueda operar. Esta sincronización la realiza
`contracts.services.matching_integration._ensure_contract_exists`
(bug-fix BIO-02, sesión 2026-04-16).

### Diagrama

```
+------------------------+       +---------------------------+
| LandlordControlledCon. |       | Contract (legacy)         |
| id=UUID                |<----->| id=SAME UUID              |
| landlord, tenant,…     |       | primary_party=landlord    |
| current_state=DRAFT    |       | secondary_party=tenant    |
| economic_terms (JSON)  |       | monthly_rent,start_date,  |
|                        |       | status=pending_biometric  |
+------------------------+       +---------------------------+
         |                              ^
         | signal post_save (1.9.1)     |
         v                              |
+-----------------------+                |
| ContractWorkflowHist. |                |
| action_type=STATE_CH. |                |
| old_state,new_state   |                |
+-----------------------+                |
                                         |
                         BiometricAuthenticationService
                         sólo acepta Contract (legacy).
```

---

## Comando para detectar desincronizaciones

```bash
python manage.py check_contract_sync
```

Lista todos los `LandlordControlledContract` cuyo `id` no tiene
contraparte en `Contract` (y viceversa). Útil tras migraciones o
merges; debe devolver 0 incongruencias en una base saneada.

---

## Reglas de oro para tocar estos modelos

1. **Añadir campos**: casi siempre al `LandlordControlledContract`.
   `Contract` es legacy, minimiza cambios ahí.
2. **Cambiar estados**: modifica `LCC.current_state`; el signal lo
   registra. Si necesitas sincronizar estados a `Contract.status`,
   hazlo en el service, nunca en vistas dispersas.
3. **Consultar historial**: `lcc.history_entries.order_by('-timestamp')`.
   El JSONField legacy `workflow_history` **ya no se escribe** (sólo
   lectura histórica para backfill anterior a Fase 1.9.2).
4. **Testing**: cuando crees un `LCC` en tests que toque el flujo
   biométrico, crea también el `Contract` con el mismo UUID, o usa el
   fixture que hace la sincronización automáticamente.
5. **ColombianContract**: `.get()` sólo dentro de escrow. En cualquier
   otro lugar considera un smell.

---

## Referencias
- Fase 1.9.1 (signal): `contracts/signals.py`
- Fase 1.9.2 (deprecación JSONField): `contracts/migrations/0024_*`
- BIO-02 (sync): `contracts/services/matching_integration.py`
- Plan maestro workflow: `docs/history/ANALISIS_QUIRURGICO_*.md`
