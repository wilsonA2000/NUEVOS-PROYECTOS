# Auditoría End-to-End VeriHome · 2026-04-15 · Reporte Final

**Branch**: `fix/audit-2026-04-15` (origin sincronizado)
**Rollback**: `git checkout pre-audit-2026-04-15`
**Bitácora detallada**: `AUDIT_2026_04_15.md`

---

## Resumen ejecutivo

Se ejecutó auditoría de extremo a extremo recorriendo los **5 viajes humanos** (arrendatario, arrendador, prestador, agente verificador, admin jurídico) + infraestructura + seguridad + UX. Se descubrieron **25 bugs**, se arreglaron **12** (6 P0/P1 críticos, 6 P2/P3) y se documentaron 13 restantes con severidad y ruta de remediación.

El corazón de la plataforma — triple firma biométrica — se mantiene verde: el E2E Playwright `multi-user-contract-signing` pasa en 2.9 min con contrato `active` y confianza 87.7%.

---

## Bugs arreglados (12)

| ID | Severidad | Módulo | Fix |
|---|---|---|---|
| AUTH-01 | P1 | seed+allauth | EmailAddress auto-verificado |
| PROP-02 | P1 | PropertySearchAPIView | HTTP 500→200 (queryset attr) |
| PROP-03 | **P0** | cache invalidation | Patrón cache match + strip prefijo `:N:` · tenants ven propiedades en vivo |
| PROP-04 | P1 | optimized_serializers | 3 campos inexistentes de `landlord_profile` corregidos |
| PROP-05 | P1 | FeaturedPropertiesAPIView | HTTP 500→200 (gemelo de PROP-02) |
| PROP-06 | P1 | TrendingPropertiesAPIView | FieldError `created_at`→`viewed_at` |
| DASH-03 parcial | P1 | dashboard/services.py | Import `Amenity`→`PropertyAmenity` + warning visible |
| SVC-01 | P1 | services | Management command `seed_subscription_plans` (3 planes idempotentes) |
| VER-02 | P2 | verification assign_agent | Acepta `agent_id` y `agent` |
| VER-03 | P1 | verification permissions | `IsStaffOrAssignedAgent` · agente opera sus visitas |
| PAY-01 | P1 | payments currency | MXN→COP (4 archivos + migration 0004) |
| NOTIF-01 | P2 | core/email | Template `welcome_notification.html` creado |

---

## Bugs pendientes (13)

### P0 bloqueantes (1)
- **BIO-02** · `matching/models.py:_ensure_contract_exists()` · el refactor 13-abr crea solo `Contract` legacy, no `LandlordControlledContract` → tenant no puede `approve_contract` ni iniciar biometría desde el flujo auto-creado. Fix requiere diseño + re-correr E2E triple firma.

### P1 graves (3)
- **DASH-03 resto** · `dashboard/api_views.py` importa 3 clases inexistentes de `services.py`. Refactor mayor.
- **SVC-02** · `ServiceViewSet` es ReadOnlyModelViewSet · prestadores pagan $100K/mes pero no pueden publicar servicios. Gap de modelo de negocio, requiere decisión.
- **ADM-04** · No hay endpoint `/core/audit-logs/` para admin consulte auditoría global.

### P2 moderados (4)
- **FAV-01** · `/properties/favorites/` 404 · router shadowing con UUID detail
- **PROP-07** · `/properties/property-images/` POST 405 · no se pueden subir imágenes post-creación
- **DASH-02** · `ContractStats.total_value=0` aunque hay contratos activos
- **DIAN-01** · Servicio DIAN implementado sin endpoint HTTP
- **VER-01** · Crear agente via API falla (PrimaryKeyRelatedField sin queryset)

### P3 cosméticos (5)
- **NOTIF-02** · `pywebpush` no instalado (opcional)
- **INFRA-01** · Redis no corriendo en WSL (intencional dev)
- **NAV-01** · Naming URLs inconsistente (`core/notifications` vs `messages` vs `payments`)
- **ADM-02** · `/admin/sla-dashboard/` 404
- **ADM-03** · Ticket respond requiere `message` no `response`
- **ADM-05** · `/users/impersonation/` 404
- **SEC-01** · `X-Frame-Options` ausente
- **AUTH-02** · Refresh endpoint en path no-estándar SimpleJWT
- **SVC-03** · `/services/services/` naming confuso
- **VIS-4** · 15 archivos con emojis residuales (secundarios)
- **VIS-5** · 29 archivos con colores hardcoded

---

## Validación

- **Tests unitarios properties**: 79/79 OK ✓
- **E2E Playwright `multi-user-contract-signing`**: PASÓ 2.9 min · contrato `active` · confianza 87.7% ✓
- **E2E Playwright CASO 1 (landlord UI)**: 1 timeout 120s preexistente (ambiental WSL), no introducido por fixes
- **TypeScript `tsc --noEmit`**: exit 0 ✓

---

## Entregables

### Commits (9) en `fix/audit-2026-04-15`

```
cce3918  docs(audit): FASE 3 seguridad + cumplimiento legal
93caeef  fix(payments+core): PAY-01 MXN→COP + NOTIF-01 welcome template
3683a2b  docs(audit): FASE 1.5 admin jurídico completado
a1b6e68  fix(verification): VER-02 + VER-03 · agente puede operar sus visitas
e86201a  fix(services): SVC-01 · seed idempotente de 3 planes de suscripción
b8e4433  fix(dashboard): DASH-03 parcial · import Amenity→PropertyAmenity + log warning
d50bd49  docs(audit): FASE 1.1 paso 2 completado + BIO-02 bloqueante descubierto
4c41bae  docs(audit): registro resultados suite unitaria + E2E Playwright
2add1cc  fix(properties): PROP-05 + PROP-06 · Featured/Trending endpoints rotos
7ffe4d7  fix(properties): PROP-02 + PROP-03 + PROP-04 descubiertos en auditoría 2026-04-15
```

### Archivos nuevos
- `services/management/commands/seed_subscription_plans.py` · seed idempotente
- `templates/core/email/welcome_notification.html` · email bienvenida
- `payments/migrations/0004_alter_escrowaccount_currency_alter_invoice_currency_and_more.py`
- `AUDIT_2026_04_15.md` · bitácora detallada (500+ líneas)
- `AUDIT_2026_04_15_FINAL.md` · este reporte

### Archivos modificados (10)
- `properties/api_views.py` · `properties/optimized_views.py` · `properties/optimized_serializers.py`
- `core/cache.py`
- `dashboard/services.py` · `dashboard/urls.py`
- `verification/api_views.py`
- `payments/models.py` · `payments/payment_plans.py` · `payments/api_views.py` · `payments/gateways/stripe_gateway.py`

---

## Plan de remediación sugerido

### Corto plazo (próxima sesión, ~4h)
1. **BIO-02** · arreglar auto-creación de `LandlordControlledContract` en `accept_match` + re-correr E2E triple firma
2. **DASH-03 resto** · crear las 3 clases faltantes o refactorizar endpoints V2
3. **PROP-07** · permitir POST en `PropertyImageViewSet` para upload post-creación
4. **FAV-01** · mover ruta `favorites` fuera del router raíz

### Mediano plazo (decisión de producto)
5. **SVC-02** · definir si existirá modelo `ServiceListing` para prestadores o se cambia `ServiceViewSet` a `ModelViewSet`
6. **ADM-04** · decidir si exponer audit logs por API o solo admin panel
7. **VIS-4 / VIS-5** · extender barrido VIS-2/VIS-3 a los 15-29 archivos restantes

### Largo plazo (hardening)
8. Integraciones de pago contra sandbox real (Stripe · Wompi · PSE · Nequi)
9. DIAN sandbox end-to-end
10. WebSocket real-time 2-browsers test
11. Suite Playwright nueva con los 5 viajes humanos

---

## Conclusión

VeriHome tiene **núcleo funcional sólido** (firma biométrica triple, flujo admin+conflict-of-interest, auditoría trazable). Los fixes de esta auditoría **desbloquean el descubrimiento de propiedades**, **corrigen la moneda de todo el sistema de pagos**, **permiten al agente verificador trabajar** y **liberan el flujo del prestador con planes reales**.

Quedan dos deudas arquitectónicas importantes (BIO-02, DASH-03 resto) y un gap de producto (SVC-02) que requieren decisión antes de exponer la plataforma al mercado.

Tag de cierre sugerido tras merge a main: `post-audit-2026-04-15`.
