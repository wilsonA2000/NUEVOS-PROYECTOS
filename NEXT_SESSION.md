# NEXT_SESSION.md — VeriHome

**Última actualización**: 2026-04-18 (Auditoría contratos completa · 6 fases ejecutadas)

---

## Estado actual

| Indicador | Valor |
|-----------|-------|
| Branch | `main` @ `6457299` |
| Backend tests | 812 verde · 0 failures · 3 skipped |
| E2E Playwright | 7/7 verde (existentes) + nuevo full-admin-review-flow |
| tsc frontend | 0 errores |
| Servidores dev | backend `:8000` · frontend `:5174` |

---

## Lo que se hizo esta sesión (2026-04-18)

### Auditoría jurídica del contrato — Ley 820 de 2003 (`6457299`)

**Backend — pdf_generator.py + clause_manager.py:**
- Nueva **CLÁUSULA SÉPTIMA — DEPÓSITO DE GARANTÍA** (Art. 9 Ley 820): antes completamente ausente. 3 párrafos: no imputable como canon, devolución 30 días hábiles, aplicación por incumplimiento.
- **COBRO EXTRAJUDICIAL** ampliada (Art. 22): arrendador puede asumir servicios en mora, deuda exigible en 5 días hábiles, mora reiterada = causal de terminación.
- **DEUDORES SOLIDARIOS** ampliada (Arts. 13-15): responsabilidad postcontractual 6 meses, solidaridad no extinta por renovación, sin beneficio de excusión.
- **CAUSALES TERMINACIÓN ARRENDADOR** (Arts. 16-17): plazo 30 días para cumplimiento + PARÁGRAFO preaviso 3 meses para terminación sin justa causa.
- **VISITAS E INSPECCIONES**: protocolo formal — máx 1/trimestre, notificación escrita 24h, acta firmada, ingreso emergencia con constancia 24h.
- Numeración re-secuenciada: SÉPTIMA (depósito) → OCTAVA ... TRIGÉSIMA CUARTA. Cláusula dinámica → TRIGÉSIMA QUINTA.
- `clause_manager.py`: CUARTA Depósito de Garantía en `BASE_CLAUSES` con `legal_reference`.
- `settings.py`: `check_admin_review_sla` + `check_biometric_expiration` en `CELERY_BEAT_SCHEDULE`.

**Backend — models.py:**
- `guarantor_auth_completed`: reemplazado `getattr(self, ..., False)` fallido por `BiometricAuthentication.objects.filter(...).exists()`.
- `Contract.save()`: sincronización dual workflow → `LandlordControlledContract` se actualiza automáticamente a `TENANT_AUTHENTICATION`, `GUARANTOR_AUTHENTICATION`, `LANDLORD_AUTHENTICATION`, `ACTIVE`.

**Frontend — Visual:**
- `ContractDetail.tsx`: Estado Banner dinámico (fondo gradiente por estado), mini-cards Grid con `DataCard`, `LinearProgress` de progreso, acciones contextuales por estado, eliminadas listas planas.
- `AdminContractReview.tsx`: Stepper jurídico vertical (5 etapas del flujo), `legal_reference` chips en accordions de cláusulas, chip "Escalado" con `WarningAmberIcon` cuando `admin_review_escalated`.
- `LandlordContractForm.tsx`: Tokens `vhColors` en Stepper activo/completado, gradiente en botón "Crear Borrador", font-weight dinámico por paso activo.

**E2E:**
- Nuevo test `full-admin-review-flow.spec.ts`: 3 actores (juridico/landlord/tenant), flujo completo desde revisión admin hasta biométrica, guard de rol verificado.

---

## Pendiente próxima sesión

### 🔴 P0 — bloqueador de deploy
1. **Pruebas manuales en browser** — `docs/MANUAL_E2E_CHECKLIST.md` (13 módulos).
   - Probar el PDF del contrato con las nuevas cláusulas (SÉPTIMA depósito, etc.)
   - Verificar visualmente `ContractDetail` con nuevo diseño
   - Verificar `AdminContractReview` con Stepper jurídico
   - Payments (Bold sandbox, PSE Wompi)
   - Image upload, ratings UI, subscriptions
   - Reportar como `BUG-MANUAL-XX` en `docs/MANUAL_E2E_BUGS.md`
2. **Arreglar bugs P0/P1** encontrados en pruebas manuales.

### 🟡 P1 — antes de deploy
3. `npm audit fix` — vulnerabilidad `yaml` moderate.
4. **VIS-5 restantes** — ~26 archivos (landing pages, marketing gradients, EnhancedTenantDocumentUpload inline comparisons).
5. Corregir selector Playwright para `toggle-2fa` / `toggle-login-notifications`.
6. Ejecutar nuevo test E2E `full-admin-review-flow` y verificar que pasa.

### 🟢 P2 — post-deploy
7. **Deploy producción**: Daphne + Celery + PostgreSQL/Redis + SSL + dominio.
8. **Stripe Elements** (tarjeta) — T3.2.b, `npm install @stripe/react-stripe-js @stripe/stripe-js`.
9. **DIAN firma digital XAdES** — comprar certificado + integrar.

---

## Comandos para arrancar

```bash
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
git status                                            # limpio en main @ 6457299
source venv_ubuntu/bin/activate

# Verificar servidores
screen -ls

# Generar PDF de prueba (verificar cláusulas nuevas)
python manage.py shell -c "
from contracts.pdf_generator import ContractPDFGenerator
from contracts.models import LandlordControlledContract
gen = ContractPDFGenerator()
lcc = LandlordControlledContract.objects.last()
result = gen.generate_contract_pdf(lcc)
data = result.read() if hasattr(result, 'read') else bytes(result)
open('/tmp/test_contract.pdf', 'wb').write(data)
print(f'PDF OK: {len(data)} bytes')
"

# Abrir PDF y verificar SÉPTIMA (depósito), VIGÉSIMA TERCERA (cobro servicios), etc.
# explorer.exe /tmp/test_contract.pdf  # desde WSL

# Correr E2E existentes
cd frontend && npx playwright test --config=playwright.config.e2e-real.ts

# Correr nuevo test admin-review
cd frontend && npx playwright test full-admin-review-flow --config=playwright.config.e2e-real.ts
```

---

## Arquitectura jurídica del contrato (post-sesión)

```
PDF del Contrato — 35 cláusulas (Ley 820 de 2003):
PRIMERA    Objeto
SEGUNDA    Destinación
TERCERA    Precio (canon)
CUARTA     Reajuste IPC
QUINTA     Entrega del inmueble
SEXTA      Término del contrato
SÉPTIMA    ✅ NUEVA: Depósito de Garantía (Art. 9)
OCTAVA     Obligaciones del Arrendatario
NOVENA     Obligaciones del Arrendador
DÉCIMA     Servicios Públicos
...
VIGÉSIMA TERCERA   ✅ AMPLIADA: Cobro Extrajudicial + Servicios (Art. 22)
VIGÉSIMA CUARTA    ✅ AMPLIADA: Deudores Solidarios (Arts. 13-15)
...
VIGÉSIMA OCTAVA    ✅ AMPLIADA: Causales Terminación Arrendador (Arts. 16-17)
...
TRIGÉSIMA SEGUNDA  ✅ AMPLIADA: Inspecciones con protocolo formal
...
TRIGÉSIMA QUINTA   Dinámica: Garantías del contrato
```

---

## Prompt para reanudar

```
Continúa el desarrollo de VeriHome. Estado:
- main @ 6457299 · 812 tests verde · E2E 7/7 verde
- Auditoría jurídica completa (5 cláusulas Ley 820/2003 corregidas/añadidas)
- Visual mejorado: ContractDetail (Banner dinámico), AdminContractReview (Stepper jurídico)
- Nuevo test E2E full-admin-review-flow.spec.ts
- Próximo: pruebas manuales browser (MANUAL_E2E_CHECKLIST.md), npm audit fix, VIS-5 restantes
Revisa NEXT_SESSION.md para detalle completo.
```
