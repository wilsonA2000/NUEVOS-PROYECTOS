# NEXT_SESSION.md — VeriHome

**Última actualización**: 2026-04-17 PM (BUG-PAY-GW-01/02/03 · Bold · VIS-5 · E2E 7/7)

---

## Estado actual

| Indicador | Valor |
|-----------|-------|
| Branch | `main` @ `496488a` |
| Backend tests | 812 verde · 0 failures · 3 skipped |
| E2E Playwright | **7/7 verde** (20.2 min) |
| tsc frontend | 0 errores |
| Servidores dev | backend `:8000` · frontend `:5174` |

---

## Lo que se hizo esta sesión (2026-04-17 PM)

### BUG-PAY-GW-01/02/03 resueltos (`6c46e2d`)
- `StripeGateway` implementa `create_payment` + `confirm_payment` (ABC).
- `PaymentResult` tiene `raw_response: Optional[Dict]`.
- `format_amount(amount)` sin segundo arg (2 ocurrencias).
- `BasePaymentGateway.handle_error()` añadido.
- `PaymentWebhookView`: `result['success']` → `result.success`.

### Bold — gateway colombiano primario (`85b5630`)
- `payments/gateways/bold_gateway.py` — `BoldGateway` completo (14 tests).
- Montos en COP pesos **enteros** (no centavos — importante).
- Endpoints: `POST /payments/bold/initiate/` + `POST /payments/webhooks/bold/`.
- Webhook: HMAC-SHA256 `x-bold-signature` con `BOLD_INTEGRITY_SECRET`.
- `PayOrderModal.tsx`: Bold tab 0 (primario), PSE/Nequi como alternativas legacy.
- Settings: `BOLD_API_KEY`, `BOLD_INTEGRITY_SECRET`, `BOLD_SANDBOX_MODE`.

### VIS-5 segunda pasada — 21 archivos (`496488a`)
Hex → `vhColors`/`vh` tokens en: PropertyFilters, UserStatusSelector, Profile, RegisterWithCode, Layout, PropertyForm, LandlordDocumentReview, MaintenancePage, AdminVerificationDashboard, EnhancedTenantDocumentUpload (solo getStatusIcon), GuaranteeDocumentUpload, SimpleProfessionalCamera, TenantContractView, BiometricVerification, PropertyList, CodeudorAuthPage, PrivacyModal, TermsModal, RatingsErrorBoundary, CandidateEvaluationView, PropertyImage, MatchRequestForm.

### E2E Playwright — 7/7 verde
Contrato finaliza `current_state: active`, confidence 87.7%. 2 FAILs conocidos no regresivos: `toggle-2fa` + `toggle-login-notifications` (timing con checkboxes en accordion Seguridad).

---

## Pendiente próxima sesión

### 🔴 P0 — bloqueador de deploy
1. **Pruebas manuales en browser** — `docs/MANUAL_E2E_CHECKLIST.md` (13 módulos).
   - Payments (Bold sandbox, PSE Wompi).
   - Image upload, ratings UI, subscriptions.
   - Maintenance, DIAN invoice preview.
   - Admin dashboards (tickets, verification).
   - Reportar como `BUG-MANUAL-XX` en `docs/MANUAL_E2E_BUGS.md`.
2. **Arreglar bugs P0/P1** encontrados en pruebas manuales.

### 🟡 P1 — antes de deploy
3. `npm audit fix` — vulnerabilidad `yaml` moderate.
4. **VIS-5 restantes** — ~26 archivos (landing pages, marketing gradients, EnhancedTenantDocumentUpload inline comparisons).
5. Corregir selector Playwright para `toggle-2fa` / `toggle-login-notifications`.

### 🟢 P2 — post-deploy
6. **Deploy producción**: Daphne + Celery + PostgreSQL/Redis + SSL + dominio.
7. **Stripe Elements** (tarjeta) — T3.2.b, `npm install @stripe/react-stripe-js @stripe/stripe-js`.
8. **DIAN firma digital XAdES** — comprar certificado + integrar.

---

## Comandos para arrancar

```bash
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
git status                                            # limpio en main @ 496488a
source venv_ubuntu/bin/activate

# Verificar servidores
screen -ls

# Re-correr E2E para confirmar estado
cd frontend && npx playwright test --config=playwright.config.e2e-real.ts
```

---

## Arquitectura de pagos (post-sesión)

```
PayOrderModal (frontend)
├── Tab 0: Bold (primario)  → POST /payments/bold/initiate/ → redirect checkout_url
├── Tab 1: Wompi PSE        → legacy
└── Tab 2: Nequi            → legacy

Backend gateways/
├── bold_gateway.py    ← nuevo · COP enteros · HMAC-SHA256 webhook
├── stripe_gateway.py  ← ABC completo · COP centavos
├── wompi.py           ← existente
└── nequi.py           ← existente
```

---

## Decisiones arquitectónicas confirmadas

1. **Bold** es el gateway primario para Colombia (PSE, Nequi, Daviplata, QR, Efecty en un solo link).
2. **Tope de usura**: 0.0208/mes (~28% EA). Revisar con Superfinanciera trimestralmente.
3. **3 fechas legales**: `date_due` + `date_grace_end` (5d) + `date_max_overdue` (30d).
4. **Servicios NO tienen mora** (pago al contado).
5. **Stripe** queda para tarjetas internacionales (T3.2.b opcional).

---

## Prompt para reanudar

```
Continúa el desarrollo de VeriHome. Estado:
- main @ 496488a · 812 tests verde · E2E 7/7 verde
- Bold integrado como gateway COP primario (POST /payments/bold/initiate/)
- BUG-PAY-GW-01/02/03 resueltos · VIS-5 segunda pasada 21 archivos
- Próximo: pruebas manuales browser (MANUAL_E2E_CHECKLIST.md)
  o npm audit fix / VIS-5 restantes / deploy a producción
Revisa NEXT_SESSION.md para detalle completo.
```
