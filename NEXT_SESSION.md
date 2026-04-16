# Próxima sesión · Pruebas manuales E2E + deploy a producción

## Estado al cerrar 2026-04-16 (plan 14/14 completo)

- Branch: `main` sincronizado con `origin/main`
- Último commit: `6301951`
- Tags: `payments-e1-e2-e3-2026-04-16`, `plan-completo-2026-04-16`
- **16 commits pusheados** en esta sesión
- **Backend**: 812 tests verde (664 → 812, +148) · 0 failures · 3 skipped
- **Frontend**: tsc 0 errores

---

## ✅ Lo implementado hoy (sesión 2026-04-16)

### Auditoría profunda inicial (FASES 1-6 en paralelo con plan)
Antes del plan del módulo de pagos, ya se había cerrado la auditoría profunda de 5 apps backend que no habían sido auditadas (`core`, `requests`, `messaging`, `ratings`, `users`) + frontend ratings/messaging URLs. 15 bugs corregidos en 9 commits previos del día.

### Plan módulo de pagos · E1 · Núcleo legal del canon

| Task | Descripción | Commit |
|------|-------------|--------|
| T1.1 | `LegalInterestRate` + `MAX_USURY_MONTHLY_RATE = 0.0208` (~28% EA Superfinanciera). Modelo con `clean()` que rechaza tasas > tope. Data migration con tasas 2025-2026. 10 tests. | `f91efcd` |
| T1.2 | `RentPaymentSchedule` con **3 fechas legales** (Ley 820/2003): `date_due` + `date_grace_end` + `date_max_overdue`. `calculate_late_fee()` refactorizado a tasa diaria proporcional con tope de días computables. 10 tests. | `48b861b` |
| T1.3 | Auto-generación de cuotas al activar contrato (`contracts/signals.py`). Pre/post_save detecta transición → ACTIVE y crea: 1 RentPaymentSchedule + N PaymentInstallment + N PaymentOrder + 1 PaymentPlan. Idempotente. 6 tests. | `8f8a532` |
| T1.4 | `PaymentOrder` consecutivo único `PO-YYYY-NNNNNNNN` que unifica canon + servicios + suscripciones + depósitos. Audit log JSON. ViewSet con filtros por rol (admin/landlord/tenant/provider). Endpoints `/api/v1/payments/orders/` con acciones `cancel` + `summary`. 15 tests. | `52f3ab9` |

### Plan módulo de pagos · E2 · Pagos de servicios

| Task | Descripción | Commit |
|------|-------------|--------|
| T2.1 | `ServiceOrder` + `ServicePayment` en `services/`. Workflow draft→sent→accepted→paid→rejected/cancelled. **Sin intereses moratorios** (decisión de producto: pago al contado/al entregar). 5 tests. | `9b2e00c` |
| T2.2 | `ServiceOrderViewSet` API con acciones `send` (provider), `accept` (client crea PaymentOrder enlazada), `reject`, `cancel`. Valida que el provider tenga `ServiceSubscription` activa. 9 tests. | `7d8f55a` |
| T2.3 | `reconcile_payment` extendido: maneja `rent_payment` + `service_payment`. Marca PaymentOrder paid, crea ServicePayment, enlaza Transaction, actualiza last_payment_date. 8 tests. | `15b7c7f` |

### Plan módulo de pagos · E3 · Frontend + integraciones

| Task | Descripción | Commit |
|------|-------------|--------|
| T3.4 | Tests sandbox para Stripe/Wompi/PSE gateways con mocks (no API real). 26 tests. Bug arreglado: `WompiGateway.validate_config` accedía a `self.public_key` antes de `__init__`. Bugs preexistentes documentados (BUG-PAY-GW-01/02/03). | `f0d7df6` |
| T3.1 | `PaymentDashboardPage` en `/app/payments` con tabs adaptados por rol. `PaymentOrderList` tabla con consecutivo monospace, StatusChip VIS-2, botón Pagar condicional. `StatCard` con resumen (total/pending/overdue/paid). | `903a413` |
| T3.2 | `PayOrderModal` con 3 tabs (PSE/Nequi/Tarjeta). PSE con 6 bancos + documento. Nequi con celular. Tarjeta pendiente (Stripe Elements). | `1fe12df` |
| T3.3 | `send_payment_order_reminder` con 3 tipos (upcoming/overdue/late_fee) y citación explícita a Superfinanciera. `generate_payment_order_receipt` produce PDF con 3 fechas + desglose intereses. Endpoint `GET /orders/<id>/receipt/` con permisos por rol. 12 tests. | `e0a33db` |

### Plan módulo de pagos · T_AUDIT · Cosmético + CI + manual

| Task | Descripción | Commit |
|------|-------------|--------|
| T_AUDIT.3 | Job `test-e2e-playwright` añadido al CI/CD pipeline de GitHub Actions. Levanta Postgres + Redis, compila frontend, inicia Django+Vite, corre Playwright con `playwright.config.e2e-real.ts`. `continue-on-error: true` hasta estabilizar entorno. | `6957b31` |
| T_AUDIT.2 | Primera pasada VIS-5: añadido `vhColors` en `theme/tokens.ts` con tokens semánticos. Migrados 7 componentes de alto tráfico (MatchesDashboard, Maintenance×2, ContextSwitcher, CustomNotification, OfflineIndicator, AuthErrorModal, MatchConversationList). Archivos con hex: 48→41. | `21279f6` |
| T_AUDIT.1 | Checklist manual E2E creado en `docs/MANUAL_E2E_CHECKLIST.md` con 13 módulos, 3 flows E2E y criterios de aceptación. Incluye template para reportar bugs. | `6301951` |

---

## ❌ Lo que falta por hacer

### 🔴 Prioridad alta · Pre-deploy

1. **Ejecutar `docs/MANUAL_E2E_CHECKLIST.md`** con navegador (13 módulos).
   - Se necesita usuario humano probando en `http://localhost:5173`
   - Seed: `python scripts/testing/seed_e2e_multiuser.py`
   - Reportar bugs como `BUG-MANUAL-XX` en `docs/MANUAL_E2E_BUGS.md`
   - **Bloqueador de deploy** hasta que pase 100%
2. **Arreglar bugs P0/P1** encontrados durante pruebas manuales.
3. **Verificar flujo completo de pago sandbox** (PSE Wompi):
   - Configurar keys sandbox Wompi en `.env`
   - Probar un flujo completo tenant paga PSE → webhook reconcilia → Invoice DIAN generada

### 🟡 Prioridad media · Saneamiento

4. **Bugs preexistentes payments gateways** (BUG-PAY-GW-01/02/03):
   - `StripeGateway` no implementa `create_payment` ni `confirm_payment` (interfaz `BasePaymentGateway` ABC incompleta)
   - `PaymentResult(raw_response=...)` kwarg inexistente en dataclass
   - `self.format_amount(amount, currency)` pasa 2 args pero base toma 1
5. **T3.2.b opcional** · Integrar Stripe Elements en `PayOrderModal.tsx`:
   ```bash
   cd frontend && npm install @stripe/react-stripe-js @stripe/stripe-js
   ```
   Reemplazar el placeholder del tab "Tarjeta" con `<Elements>` + `StripePaymentForm`.
6. **VIS-5 segunda pasada** (~41 archivos restantes con hex):
   - Mayoría son gradientes de marketing/landing o branding específico
   - Decisión de diseño: ¿mantener como "specialty branding" o migrar todo a tokens?

### 🟢 Prioridad baja · Infraestructura

7. **Deploy a producción**:
   - Dominio + SSL (Let's Encrypt o similar)
   - Variables de entorno producción (`DEBUG=False`, `SECURE_SSL_REDIRECT=True`)
   - PostgreSQL + Redis productivos (no SQLite fallback)
   - Daphne para WebSocket (no runserver)
   - Celery workers + beat
   - Sentry monitoring (opcional)
   - CDN para estáticos (opcional)
8. **DIAN firma digital**:
   - Comprar certificado digital DIAN
   - Integrar firma XAdES al XML UBL 2.1 existente
   - Configurar endpoint de la DIAN para envío automático
9. **Auditoría pre-producción**:
   - Revisar dependencias (`safety check`, `npm audit`)
   - Revisar permisos de admin vs usuarios normales
   - Test de carga básico (Locust o Apache Bench)

---

## Comandos rápidos para reanudar

```bash
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
git status                                                       # clean en main
source venv_ubuntu/bin/activate

# 1. Verificar que todo sigue verde
python manage.py test 2>&1 | tail -3                             # Ran 812 OK
cd frontend && npx tsc --noEmit && echo OK                        # 0 errores
cd ..

# 2. Levantar servidores (si no están ya corriendo)
screen -list
screen -dmS django bash -c "source venv_ubuntu/bin/activate && python manage.py runserver 0.0.0.0:8000 > /tmp/django.log 2>&1"
cd frontend && screen -dmS vite bash -c "npm run dev > /tmp/vite.log 2>&1" && cd ..

# 3. Seed de usuarios de prueba
python scripts/testing/seed_e2e_multiuser.py

# 4. Abrir el checklist y empezar pruebas manuales
cat docs/MANUAL_E2E_CHECKLIST.md
```

---

## Referencias

- **Plan completo**: `/home/wilsonadmin/.claude/plans/snoopy-petting-pebble.md`
- **Checklist manual**: `docs/MANUAL_E2E_CHECKLIST.md`
- **Memoria sesión hoy**: `project_session_2026_04_16b.md`
- **Memoria auditoría previa**: `project_session_2026_04_17.md`
- **Repo**: https://github.com/wilsonA2000/NUEVOS-PROYECTOS

---

## Decisiones arquitectónicas confirmadas

1. **Tope de usura hardcoded** (`0.0208`/mes ~ 28% EA). Revisar trimestralmente con Superfinanciera.
2. **3 fechas legales**: vencimiento + gracia (5d default) + tope mora (30d default). Pasado `date_max_overdue` los intereses se congelan.
3. **`PaymentOrder` unifica** todas las fuentes de cobro bajo un consecutivo único auditable.
4. **Servicios NO tienen mora** (pago al contado o al entregar, decisión de producto).
5. **PSE + Nequi** cubren el caso colombiano; **Stripe** queda para tarjetas internacionales (opcional T3.2.b).
