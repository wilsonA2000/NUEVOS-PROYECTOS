# Manual E2E testing checklist · VeriHome

Este checklist cubre los **10 módulos sin cobertura E2E automatizada** que deben probarse manualmente antes del deploy a producción. Marca ☑ cuando cada ítem pase.

**Última actualización**: 2026-04-16 (T_AUDIT.1)

## Preparación

```bash
cd "/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS"
git status                                                       # clean
source venv_ubuntu/bin/activate
python manage.py test 2>&1 | tail -3                             # Ran 812 OK
cd frontend && npx tsc --noEmit && echo OK                        # 0 errores

# Levantar servidores
screen -list                                                      # verificar
# Si no están:
screen -dmS django bash -c "python manage.py runserver 0.0.0.0:8000 > /tmp/django.log 2>&1"
cd frontend && screen -dmS vite bash -c "npm run dev > /tmp/vite.log 2>&1" && cd ..

# Seed de datos de prueba
python scripts/testing/seed_e2e_multiuser.py
```

## Usuarios de prueba (post-seed)

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@verihome.com | admin123 |
| Landlord | landlord_e2e@verihome.com | TestPass123! |
| Tenant | tenant_e2e@verihome.com | TestPass123! |
| Provider | provider_e2e@verihome.com | TestPass123! |
| Guarantor | guarantor_e2e@verihome.com | TestPass123! |

---

## Checklist por módulo

### 1. ☐ Property image upload + gallery

**Ruta**: `/app/properties/new` (landlord)

- [ ] Drag & drop 3 imágenes (JPG/PNG)
- [ ] Compresión automática — ver stats de ahorro
- [ ] Reordenar imágenes con drag handle
- [ ] Marcar una como principal (estrella)
- [ ] Eliminar una imagen antes de guardar
- [ ] Guardar propiedad → verificar que galería muestra todas las imágenes en el detalle

### 2. ☐ Pagos — Dashboard unificado por rol **(NUEVO T3.1)**

**Ruta**: `/app/payments`

- [ ] **Como tenant**: ver tabs "Lo que debo" / "Pagado" / "En mora"
- [ ] **Como landlord**: ver tabs "Por cobrar" / "Cobrado" / "En mora"
- [ ] **Como provider**: ver tabs "Por cobrar" / "Cobrado" / "En mora"
- [ ] **Como admin**: ver tabs "Todas" / "Pendientes" / "En mora" / "Pagadas"
- [ ] StatCards muestran números reales del backend
- [ ] Tabla lista órdenes con consecutivo monospace `PO-YYYY-NNNNNNNN`
- [ ] Click en consecutivo muestra tooltip con descripción
- [ ] Cambiar tab recarga el listado con filtro correcto
- [ ] StatusChip cambia color según estado (verde/rojo/amarillo)

### 3. ☐ Pagos — Modal de pago PSE/Nequi **(NUEVO T3.2)**

**Ruta**: click "Pagar" en una orden del dashboard (como tenant)

- [ ] Modal abre con consecutivo + monto
- [ ] Tab PSE: selector de 6 bancos + CC/CE/NIT/PP + número documento
- [ ] Validación: botón Pagar deshabilitado sin banco+documento
- [ ] Enviar PSE → debería redirigir al async_payment_url de Wompi sandbox
- [ ] Tab Nequi: celular
- [ ] Tab Tarjeta: alert "próximamente" (Stripe Elements pendiente T3.2.b)
- [ ] Cerrar modal con Cancel funciona

### 4. ☐ Pagos — Auto-generación cuotas al activar contrato **(NUEVO T1.3)**

**Ruta**: crear contrato nuevo, firmar biometría tenant + landlord, pasar a ACTIVE

- [ ] Crear contrato como landlord (formulario completo, 12 meses, canon $1.500.000)
- [ ] Admin aprueba el borrador (revisión jurídica)
- [ ] Tenant firma biométricamente (4 pasos)
- [ ] Landlord firma biométricamente
- [ ] Contrato pasa a ACTIVE
- [ ] Ir a `/app/payments` como landlord → ver 12 PaymentOrders con consecutivos
- [ ] Ver que fechas de vencimiento son día 1 de cada mes (si start_date = día 1)
- [ ] Ir a `/app/payments` como tenant → ver las mismas 12 órdenes como "Lo que debo"

### 5. ☐ Servicios — ServiceOrder workflow **(NUEVO T2.1-T2.3)**

**Ruta**: sin UI dedicada todavía, se puede probar vía admin o directamente API

- [ ] Como provider (con suscripción activa), llamar POST `/api/v1/services/orders/` con `client`, `title`, `amount`
- [ ] Orden creada en status='draft'
- [ ] POST `/orders/<id>/send/` → status='sent'
- [ ] Como client (tenant), POST `/orders/<id>/accept/` → status='accepted', se crea PaymentOrder con consecutivo
- [ ] Como client, ir a `/app/payments` → ver la orden de servicio en "Lo que debo"
- [ ] Pagar la orden (flujo T3.2) → después del webhook, status='paid' y se crea ServicePayment

### 6. ☐ Ratings/reviews UI

**Ruta**: `/app/ratings`

- [ ] Lista de ratings carga correctamente (sin 404)
- [ ] Click "Nueva calificación" abre formulario
- [ ] Enviar rating con stars + comentario
- [ ] Aparece en la lista después de enviar
- [ ] Ratings de otros usuarios se muestran con avatares

### 7. ☐ Subscriptions — Planes de servicio

**Ruta**: `/app/subscriptions` (como provider)

- [ ] Ver los 3 planes (Básico, Profesional, Enterprise)
- [ ] Click "Suscribirme" al Básico
- [ ] Suscripción queda en status='trial' o 'active'
- [ ] Ver banner de plan actual en el dashboard de provider

### 8. ☐ Maintenance requests

**Ruta**: `/app/maintenance` (como tenant)

- [ ] Crear solicitud: tipo (emergency/routine/preventive/repair/improvement), área, descripción
- [ ] Subir fotos (drag & drop)
- [ ] Enviar → aparece en lista
- [ ] Como landlord: ver la solicitud en `/app/admin/maintenance` o similar
- [ ] Responder/asignar a provider

### 9. ☐ DIAN electronic invoicing

**Ruta**: admin, después de un pago real

- [ ] Tras reconciliar un webhook de pago (T2.3), se genera una Invoice con XML UBL 2.1
- [ ] GET `/api/v1/payments/invoices/<id>/dian-xml/` devuelve XML válido
- [ ] XML incluye consecutivo DIAN (formato VH-YYYY-NNNNNN)
- [ ] XML tiene elementos Resolution 000042/2020 (namespace UBL 2.1)

### 10. ☐ Admin verification dashboard

**Ruta**: `/app/admin/verification` (como admin)

- [ ] Lista de agentes de verificación
- [ ] Toggle availability de un agente
- [ ] Programar una visita asignando agente
- [ ] Ver reporte de visita completada
- [ ] Aprobar/rechazar reporte como admin

### 11. ☐ Admin tickets dashboard

**Ruta**: `/app/admin/tickets` (como admin)

- [ ] Lista de tickets con filtros por departamento (general, legal, ceo, etc.)
- [ ] Asignar ticket a staff
- [ ] Responder con mensaje público o interno
- [ ] Resolver/cerrar ticket
- [ ] Ver stats globales

### 12. ☐ Verification agents module

**Ruta**: `/app/verification/visits` (como agent)

- [ ] Ver visitas asignadas
- [ ] Iniciar visita → status='in_progress'
- [ ] Completar visita con foto + firma
- [ ] Generar reporte
- [ ] Enviar reporte a admin para aprobación

### 13. ☐ Audit trail / SLA dashboard

**Ruta**: `/app/admin/audit` (como admin)

- [ ] Ver ContractTimeline de un contrato específico
- [ ] Contratos con admin_review_deadline vencida marcados como escalated
- [ ] Ver logs de acciones administrativas
- [ ] Filtrar por usuario/fecha

---

## Flujos end-to-end recomendados (post-módulos)

### Flow 1: Contrato nuevo completo
1. Landlord publica propiedad (módulo 1)
2. Tenant solicita match
3. Landlord acepta → crea contrato
4. Admin aprueba borrador
5. Firma biométrica tenant + landlord (módulo 4)
6. Auto-generación 12 cuotas con consecutivo (módulo 4)
7. Tenant paga cuota del mes con PSE (módulo 3)
8. Webhook reconcilia + genera Invoice DIAN (módulos 3+9)
9. Receipt PDF descargable con consecutivo y 3 fechas (T3.3)

### Flow 2: Servicio prestador↔tenant
1. Provider suscribe plan (módulo 7)
2. Provider crea ServiceOrder a tenant (módulo 5)
3. Tenant acepta → se crea PaymentOrder enlazada
4. Tenant paga con Nequi (módulo 3)
5. Webhook marca ServiceOrder como paid, crea ServicePayment

### Flow 3: Mantenimiento
1. Tenant reporta avería (módulo 8)
2. Landlord ve la solicitud
3. Admin asigna provider
4. Provider completa reparación
5. Tenant confirma y califica al provider (módulo 6)

---

## Criterios de aceptación

- ☐ **Backend 812 tests verde** antes de comenzar pruebas
- ☐ **tsc 0 errores** en frontend
- ☐ **Todos los módulos 1-13** marcados sin bloqueadores P0
- ☐ **3 flows E2E** completos sin crash
- ☐ Bugs encontrados documentados como BUG-MANUAL-XX con pasos para reproducir
- ☐ Cualquier endpoint que devuelva 500 se reporta como P1

## Reportar hallazgos

Para cada bug encontrado:

```markdown
### BUG-MANUAL-01 · [Módulo X] · [Descripción breve]
**Severidad**: P0 / P1 / P2 / P3
**Ruta**: /app/...
**Pasos para reproducir**:
1. ...
2. ...
**Resultado esperado**: ...
**Resultado obtenido**: ...
**Screenshot/log**: ...
```

Archivo de bugs: `docs/MANUAL_E2E_BUGS.md` (crear si no existe).

## Deploy a producción (post-checklist)

Cuando el 100% esté ☑:

```bash
# 1. Crear tag de pre-deploy
git tag -a pre-deploy-$(date +%Y-%m-%d) -m "Manual E2E checklist 100% OK"
git push --tags

# 2. Verificar que no hay bugs P0/P1 abiertos
# 3. Proceder con deploy a staging → producción
```
