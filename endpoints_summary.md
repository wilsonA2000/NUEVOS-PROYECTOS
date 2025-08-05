# Resumen de Endpoints de la API - VeriHome

## Estructura General de URLs

### URLs Principales
- **Admin**: `/admin/`
- **Autenticación**: `/accounts/`
- **API Base**: `/api/v1/`

### Módulos Principales
- **Usuarios**: `/usuarios/` y `/api/v1/users/`
- **Propiedades**: `/propiedades/` y `/api/v1/properties/`
- **Contratos**: `/contratos/` y `/api/v1/contracts/`
- **Mensajes**: `/mensajes/` y `/api/v1/messages/`
- **Pagos**: `/pagos/` y `/api/v1/payments/`
- **Calificaciones**: `/calificaciones/` y `/api/v1/ratings/`
- **Core**: `/api/v1/core/`

## Endpoints de Autenticación

### JWT Authentication
- `POST /api/v1/auth/login/` - Login con JWT
- `POST /api/v1/auth/refresh/` - Refrescar token
- `GET /api/v1/auth/me/` - Perfil del usuario actual

### Usuarios
- `POST /api/v1/users/auth/register/` - Registro de usuarios
- `POST /api/v1/users/auth/logout/` - Logout
- `POST /api/v1/users/auth/change-password/` - Cambiar contraseña
- `GET /api/v1/users/verification/status/` - Estado de verificación
- `POST /api/v1/users/verification/request/` - Solicitar verificación
- `POST /api/v1/users/verification/upload-documents/` - Subir documentos
- `GET /api/v1/users/search/` - Búsqueda de usuarios
- `GET /api/v1/users/search/service-providers/` - Búsqueda de proveedores
- `GET /api/v1/users/stats/dashboard/` - Estadísticas del dashboard

### ViewSets de Usuarios
- `GET/POST/PUT/DELETE /api/v1/users/users/` - CRUD de usuarios
- `GET/POST/PUT/DELETE /api/v1/users/landlord-profiles/` - Perfiles de propietarios
- `GET/POST/PUT/DELETE /api/v1/users/tenant-profiles/` - Perfiles de inquilinos
- `GET/POST/PUT/DELETE /api/v1/users/service-provider-profiles/` - Perfiles de proveedores
- `GET/POST/PUT/DELETE /api/v1/users/portfolio-items/` - Elementos de portafolio

## Endpoints de Propiedades

### ViewSets de Propiedades
- `GET/POST/PUT/DELETE /api/v1/properties/properties/` - CRUD de propiedades
- `GET/POST/PUT/DELETE /api/v1/properties/property-images/` - Imágenes de propiedades
- `GET/POST/PUT/DELETE /api/v1/properties/property-videos/` - Videos de propiedades
- `GET/POST/PUT/DELETE /api/v1/properties/amenities/` - Amenidades
- `GET/POST/PUT/DELETE /api/v1/properties/inquiries/` - Consultas sobre propiedades
- `GET/POST/PUT/DELETE /api/v1/properties/favorites/` - Propiedades favoritas

### Endpoints Especiales de Propiedades
- `GET /api/v1/properties/search/` - Búsqueda de propiedades
- `GET /api/v1/properties/filters/` - Filtros disponibles
- `GET /api/v1/properties/featured/` - Propiedades destacadas
- `GET /api/v1/properties/trending/` - Propiedades en tendencia
- `GET /api/v1/properties/stats/` - Estadísticas de propiedades
- `POST /api/v1/properties/properties/{property_id}/toggle-favorite/` - Toggle favorito

## Endpoints de Contratos

### ViewSets de Contratos
- `GET/POST/PUT/DELETE /api/v1/contracts/contracts/` - CRUD de contratos
- `GET/POST/PUT/DELETE /api/v1/contracts/templates/` - Plantillas de contratos
- `GET/POST/PUT/DELETE /api/v1/contracts/signatures/` - Firmas de contratos
- `GET/POST/PUT/DELETE /api/v1/contracts/amendments/` - Enmiendas de contratos
- `GET/POST/PUT/DELETE /api/v1/contracts/renewals/` - Renovaciones de contratos
- `GET/POST/PUT/DELETE /api/v1/contracts/terminations/` - Terminaciones de contratos
- `GET/POST/PUT/DELETE /api/v1/contracts/documents/` - Documentos de contratos

### Endpoints Especiales de Contratos
- `POST /api/v1/contracts/{contract_pk}/sign/` - Firmar contrato
- `GET /api/v1/contracts/{contract_pk}/verify-signature/` - Verificar firma
- `POST /api/v1/contracts/{contract_pk}/activate/` - Activar contrato
- `POST /api/v1/contracts/{contract_pk}/suspend/` - Suspender contrato
- `POST /api/v1/contracts/{contract_pk}/documents/upload/` - Subir documento
- `GET /api/v1/contracts/reports/expiring/` - Contratos próximos a expirar
- `GET /api/v1/contracts/reports/pending-signatures/` - Contratos pendientes de firma
- `GET /api/v1/contracts/stats/` - Estadísticas de contratos

## Endpoints de Mensajería

### ViewSets de Mensajería
- `GET/POST/PUT/DELETE /api/v1/messages/threads/` - Hilos de mensajes
- `GET/POST/PUT/DELETE /api/v1/messages/messages/` - Mensajes individuales
- `GET/POST/PUT/DELETE /api/v1/messages/folders/` - Carpetas de mensajes
- `GET/POST/PUT/DELETE /api/v1/messages/templates/` - Plantillas de mensajes
- `GET/POST/PUT/DELETE /api/v1/messages/conversations/` - Conversaciones

### Endpoints Especiales de Mensajería
- `POST /api/v1/messages/send/` - Enviar mensaje
- `POST /api/v1/messages/quick-reply/` - Respuesta rápida
- `POST /api/v1/messages/mark-read/{message_pk}/` - Marcar como leído
- `POST /api/v1/messages/mark-unread/{message_pk}/` - Marcar como no leído
- `POST /api/v1/messages/star/{message_pk}/` - Destacar mensaje
- `POST /api/v1/messages/conversation/{thread_pk}/mark-read/` - Marcar conversación como leída
- `POST /api/v1/messages/conversation/{thread_pk}/archive/` - Archivar conversación
- `GET /api/v1/messages/search/` - Buscar mensajes
- `GET /api/v1/messages/stats/` - Estadísticas de mensajería
- `GET /api/v1/messages/unread-count/` - Contar mensajes no leídos
- `GET /api/v1/messages/can-communicate/{user_pk}/` - Verificar si se puede comunicar

## Endpoints de Pagos

### ViewSets de Pagos
- `GET/POST/PUT/DELETE /api/v1/payments/transactions/` - Transacciones
- `GET/POST/PUT/DELETE /api/v1/payments/payment-methods/` - Métodos de pago
- `GET/POST/PUT/DELETE /api/v1/payments/invoices/` - Facturas
- `GET/POST/PUT/DELETE /api/v1/payments/escrow-accounts/` - Cuentas de escrow
- `GET/POST/PUT/DELETE /api/v1/payments/payment-plans/` - Planes de pago
- `GET/POST/PUT/DELETE /api/v1/payments/installments/` - Cuotas de pago

### Endpoints Especiales de Pagos
- `POST /api/v1/payments/process/` - Procesar pago
- `POST /api/v1/payments/quick-pay/` - Pago rápido
- `POST /api/v1/payments/payment-methods/add/` - Agregar método de pago
- `POST /api/v1/payments/payment-methods/{pk}/verify/` - Verificar método de pago
- `POST /api/v1/payments/payment-methods/{pk}/set-default/` - Establecer método por defecto
- `POST /api/v1/payments/escrow/{pk}/fund/` - Fondear escrow
- `POST /api/v1/payments/escrow/{pk}/release/` - Liberar escrow
- `POST /api/v1/payments/invoices/create/` - Crear factura
- `POST /api/v1/payments/invoices/{pk}/pay/` - Pagar factura
- `POST /api/v1/payments/invoices/{pk}/send/` - Enviar factura
- `GET /api/v1/payments/stats/balance/` - Balance de usuario
- `GET /api/v1/payments/stats/dashboard/` - Estadísticas del dashboard
- `GET /api/v1/payments/reports/transactions/` - Reporte de transacciones
- `POST /api/v1/payments/webhooks/stripe/` - Webhook de Stripe
- `POST /api/v1/payments/webhooks/paypal/` - Webhook de PayPal

## Endpoints de Calificaciones

### Endpoints de Calificaciones
- `GET/POST /api/v1/ratings/ratings/` - Listar y crear calificaciones
- `GET/PUT/DELETE /api/v1/ratings/ratings/{pk}/` - Ver, actualizar o eliminar calificación
- `POST /api/v1/ratings/ratings/{rating_id}/response/` - Responder a calificación
- `POST /api/v1/ratings/ratings/{rating_id}/report/` - Reportar calificación
- `GET /api/v1/ratings/users/{user_id}/ratings/` - Calificaciones de un usuario
- `GET /api/v1/ratings/users/{user_id}/rating-profile/` - Perfil de calificaciones de usuario
- `GET /api/v1/ratings/contracts/{contract_id}/ratings/` - Calificaciones de un contrato
- `GET/POST /api/v1/ratings/ratings/categories/` - Categorías de calificación

## Endpoints de Core (Notificaciones y Sistema)

### ViewSets de Core
- `GET/POST/PUT/DELETE /api/v1/core/notifications/` - Notificaciones
- `GET /api/v1/core/activity-logs/` - Logs de actividad
- `GET /api/v1/core/system-alerts/` - Alertas del sistema

### Endpoints Especiales de Core
- `GET /api/v1/core/notifications/unread-count/` - Contar notificaciones no leídas
- `POST /api/v1/core/notifications/mark-all-read/` - Marcar todas como leídas
- `GET /api/v1/core/stats/dashboard/` - Estadísticas del dashboard
- `GET /api/v1/core/stats/overview/` - Estadísticas generales del sistema

## Estado de Implementación

### ✅ Completamente Implementados
- **Usuarios**: ViewSets y endpoints básicos implementados
- **Propiedades**: ViewSets completos con serializers y lógica de negocio
- **Mensajería**: ViewSets y endpoints especiales implementados
- **Core**: Notificaciones y estadísticas implementadas
- **Calificaciones**: Endpoints básicos implementados

### ⚠️ Parcialmente Implementados
- **Contratos**: ViewSets definidos pero sin serializers completos
- **Pagos**: ViewSets definidos pero sin serializers completos

### 🔧 Pendientes de Implementación
- Serializers completos para contratos y pagos
- Lógica de negocio específica para algunos endpoints
- Validaciones avanzadas
- Integración con pasarelas de pago reales

## Notas Importantes

1. **Autenticación**: Todos los endpoints requieren autenticación JWT excepto los webhooks
2. **Permisos**: Los permisos están configurados por endpoint
3. **Paginación**: Implementada en propiedades y otros módulos principales
4. **Filtros**: Disponibles en propiedades y otros módulos
5. **Búsqueda**: Implementada en usuarios, propiedades y mensajes

## URLs de Desarrollo vs Producción

### Desarrollo
- Frontend: `http://localhost:3000/` (Vite dev server)
- Backend: `http://localhost:8000/`

### Producción
- Todo servido desde el mismo dominio
- Frontend React servido por Django
- API en `/api/v1/` 