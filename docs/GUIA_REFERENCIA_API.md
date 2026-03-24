# Guia de Referencia API -- VeriHome

**Version**: 1.0
**Fecha**: 23 de marzo de 2026
**Total de endpoints**: 688 (684 HTTP + 4 WebSocket)
**Base URL**: `http://localhost:8000/api/v1/`
**Autenticacion**: JWT (Bearer Token) salvo endpoints marcados como publicos

---

## Tabla de Contenido

1. [Core (40 endpoints)](#1-modulo-core-40-endpoints)
2. [Users (85 endpoints)](#2-modulo-users-85-endpoints)
3. [Properties (46 endpoints)](#3-modulo-properties-46-endpoints)
4. [Contracts (159 endpoints)](#4-modulo-contracts-159-endpoints)
5. [Messaging (41 endpoints)](#5-modulo-messaging-41-endpoints)
6. [Payments (84 endpoints)](#6-modulo-payments-84-endpoints)
7. [Ratings (24 endpoints)](#7-modulo-ratings-24-endpoints)
8. [Matching (54 endpoints)](#8-modulo-matching-54-endpoints)
9. [Requests (53 endpoints)](#9-modulo-requests-53-endpoints)
10. [Services (34 endpoints)](#10-modulo-services-34-endpoints)
11. [Dashboard (36 endpoints)](#11-modulo-dashboard-36-endpoints)
12. [Verification (25 endpoints)](#12-modulo-verification-25-endpoints)
13. [Top-level (3 endpoints)](#13-endpoints-top-level-3-endpoints)
14. [WebSocket (4 rutas)](#14-websocket-4-rutas)

---

## 1. Modulo Core (40 endpoints)

**Base URL**: `/api/v1/core/`

### 1.1 NotificationViewSet (8 endpoints)

Router: `notifications/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/core/notifications/` | Listar notificaciones del usuario | Si |
| POST | `/core/notifications/` | Crear notificacion | Si |
| GET | `/core/notifications/{id}/` | Detalle de notificacion | Si |
| PUT | `/core/notifications/{id}/` | Actualizar notificacion completa | Si |
| PATCH | `/core/notifications/{id}/` | Actualizar notificacion parcial | Si |
| DELETE | `/core/notifications/{id}/` | Eliminar notificacion | Si |
| GET | `/core/notifications/unread_count/` | Obtener conteo de no leidas | Si |
| POST | `/core/notifications/mark_all_read/` | Marcar todas como leidas | Si |

### 1.2 ActivityLogViewSet (7 endpoints)

Router: `activity-logs/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/core/activity-logs/` | Listar logs de actividad | Si |
| POST | `/core/activity-logs/` | Crear log de actividad | Si |
| GET | `/core/activity-logs/{id}/` | Detalle de log | Si |
| PUT | `/core/activity-logs/{id}/` | Actualizar log completo | Si |
| PATCH | `/core/activity-logs/{id}/` | Actualizar log parcial | Si |
| DELETE | `/core/activity-logs/{id}/` | Eliminar log | Si |
| POST | `/core/activity-logs/bulk/` | Crear logs en lote | Si |

### 1.3 SystemAlertViewSet (2 endpoints)

Router: `system-alerts/` (ReadOnly)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/core/system-alerts/` | Listar alertas del sistema | Si |
| GET | `/core/system-alerts/{id}/` | Detalle de alerta | Si |

### 1.4 SupportTicketViewSet (11 endpoints)

Router: `tickets/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/core/tickets/` | Listar tickets (staff=todos, user=propios) | Si |
| POST | `/core/tickets/` | Crear ticket de soporte | Si |
| GET | `/core/tickets/{id}/` | Detalle de ticket | Si |
| PUT | `/core/tickets/{id}/` | Actualizar ticket completo | Si |
| PATCH | `/core/tickets/{id}/` | Actualizar ticket parcial | Si |
| DELETE | `/core/tickets/{id}/` | Eliminar ticket | Si |
| POST | `/core/tickets/{id}/assign/` | Asignar ticket a miembro del staff | Si (staff) |
| POST | `/core/tickets/{id}/respond/` | Agregar respuesta al ticket | Si |
| POST | `/core/tickets/{id}/resolve/` | Marcar ticket como resuelto | Si |
| POST | `/core/tickets/{id}/close/` | Cerrar ticket | Si |
| GET | `/core/tickets/stats/` | Estadisticas por departamento/estado/prioridad | Si (staff) |

### 1.5 Rutas personalizadas (12 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/core/contact/` | Enviar mensaje de contacto | No |
| GET | `/core/faqs/` | Listar preguntas frecuentes | No |
| GET | `/core/health/` | Health check del sistema | No |
| GET | `/core/test/` | Test de conexion | No |
| POST | `/core/notifications/mark-all-read/` | Marcar todas las notificaciones como leidas | Si |
| GET | `/core/stats/dashboard/` | Estadisticas generales del dashboard | Si |
| GET | `/core/stats/overview/` | Vista general del sistema | Si (staff) |
| GET | `/core/maintenance/health/` | Health check de mantenimiento | Si (admin) |
| POST | `/core/maintenance/clear-logs/` | Limpiar logs del sistema | Si (admin) |
| POST | `/core/maintenance/clear-cache/` | Limpiar cache del sistema | Si (admin) |
| POST | `/core/maintenance/clear-sessions/` | Limpiar sesiones expiradas | Si (admin) |
| POST | `/core/maintenance/optimize-db/` | Optimizar base de datos | Si (admin) |

---

## 2. Modulo Users (85 endpoints)

**Base URL**: `/api/v1/users/`

### 2.1 UserViewSet (2 endpoints)

Router: `users/` (ReadOnly)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/users/users/` | Listar usuarios | Si |
| GET | `/users/users/{id}/` | Detalle de usuario | Si |

### 2.2 LandlordProfileViewSet (6 endpoints)

Router: `landlord-profiles/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/users/landlord-profiles/` | Listar perfiles de arrendador | Si |
| POST | `/users/landlord-profiles/` | Crear perfil de arrendador | Si |
| GET | `/users/landlord-profiles/{id}/` | Detalle de perfil arrendador | Si |
| PUT | `/users/landlord-profiles/{id}/` | Actualizar perfil completo | Si |
| PATCH | `/users/landlord-profiles/{id}/` | Actualizar perfil parcial | Si |
| DELETE | `/users/landlord-profiles/{id}/` | Eliminar perfil de arrendador | Si |

### 2.3 TenantProfileViewSet (6 endpoints)

Router: `tenant-profiles/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/users/tenant-profiles/` | Listar perfiles de arrendatario | Si |
| POST | `/users/tenant-profiles/` | Crear perfil de arrendatario | Si |
| GET | `/users/tenant-profiles/{id}/` | Detalle de perfil arrendatario | Si |
| PUT | `/users/tenant-profiles/{id}/` | Actualizar perfil completo | Si |
| PATCH | `/users/tenant-profiles/{id}/` | Actualizar perfil parcial | Si |
| DELETE | `/users/tenant-profiles/{id}/` | Eliminar perfil de arrendatario | Si |

### 2.4 ServiceProviderProfileViewSet (6 endpoints)

Router: `service-provider-profiles/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/users/service-provider-profiles/` | Listar perfiles de proveedor | Si |
| POST | `/users/service-provider-profiles/` | Crear perfil de proveedor | Si |
| GET | `/users/service-provider-profiles/{id}/` | Detalle de perfil proveedor | Si |
| PUT | `/users/service-provider-profiles/{id}/` | Actualizar perfil completo | Si |
| PATCH | `/users/service-provider-profiles/{id}/` | Actualizar perfil parcial | Si |
| DELETE | `/users/service-provider-profiles/{id}/` | Eliminar perfil de proveedor | Si |

### 2.5 PortfolioItemViewSet (6 endpoints)

Router: `portfolio-items/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/users/portfolio-items/` | Listar items de portafolio | Si |
| POST | `/users/portfolio-items/` | Crear item de portafolio | Si |
| GET | `/users/portfolio-items/{id}/` | Detalle de item | Si |
| PUT | `/users/portfolio-items/{id}/` | Actualizar item completo | Si |
| PATCH | `/users/portfolio-items/{id}/` | Actualizar item parcial | Si |
| DELETE | `/users/portfolio-items/{id}/` | Eliminar item | Si |

### 2.6 UserActivityLogViewSet (2 endpoints)

Router: `activity-logs/` (ReadOnly)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/users/activity-logs/` | Listar logs de actividad del usuario | Si |
| GET | `/users/activity-logs/{id}/` | Detalle de log de actividad | Si |

### 2.7 Autenticacion JWT (13 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/users/auth/login/` | Iniciar sesion (obtener tokens JWT) | No |
| POST | `/users/auth/refresh/` | Refrescar token de acceso | No (refresh token) |
| GET | `/users/auth/me/` | Obtener perfil del usuario autenticado | Si |
| POST | `/users/auth/logout/` | Cerrar sesion (invalidar token) | Si |
| POST | `/users/auth/confirm-email/{key}/` | Confirmar correo electronico | No |
| POST | `/users/auth/resend-confirmation/` | Reenviar correo de confirmacion | No |
| POST | `/users/auth/register/` | Registro simple de usuario | No |
| POST | `/users/auth/register-with-interview/` | Registro con entrevista previa | No |
| POST | `/users/auth/register-with-code/` | Registro con codigo de entrevista | No |
| POST | `/users/auth/validate-interview-code/` | Validar codigo de entrevista | No |
| POST | `/users/auth/change-password/` | Cambiar contrasena | Si |
| POST | `/users/auth/forgot-password/` | Solicitar restablecimiento de contrasena | No |
| POST | `/users/auth/reset-password/` | Restablecer contrasena con token | No |

### 2.8 Sistema de entrevistas (15 endpoints)

Sub-router: `interview/`

**InterviewCodeViewSet (6 + 6 acciones)**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/users/interview/admin/codes/` | Listar codigos de entrevista | Si (staff) |
| POST | `/users/interview/admin/codes/` | Crear codigo de entrevista | Si (staff) |
| GET | `/users/interview/admin/codes/{id}/` | Detalle de codigo | Si (staff) |
| PUT | `/users/interview/admin/codes/{id}/` | Actualizar codigo completo | Si (staff) |
| PATCH | `/users/interview/admin/codes/{id}/` | Actualizar codigo parcial | Si (staff) |
| DELETE | `/users/interview/admin/codes/{id}/` | Eliminar codigo | Si (staff) |
| POST | `/users/interview/admin/codes/{id}/approve/` | Aprobar codigo de entrevista | Si (staff) |
| POST | `/users/interview/admin/codes/{id}/revoke/` | Revocar codigo | Si (staff) |
| POST | `/users/interview/admin/codes/{id}/assign/` | Asignar codigo a usuario | Si (staff) |
| POST | `/users/interview/admin/codes/{id}/mark_contacted/` | Marcar como contactado | Si (staff) |
| POST | `/users/interview/admin/codes/{id}/create_interview_code/` | Crear codigo desde solicitud | Si (staff) |
| POST | `/users/interview/admin/codes/{id}/approve_and_generate/` | Aprobar y generar codigo | Si (staff) |

**ContactRequestViewSet (6 endpoints)**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/users/interview/admin/contact-requests/` | Listar solicitudes de contacto | Si (staff) |
| POST | `/users/interview/admin/contact-requests/` | Crear solicitud de contacto | Si (staff) |
| GET | `/users/interview/admin/contact-requests/{id}/` | Detalle de solicitud | Si (staff) |
| PUT | `/users/interview/admin/contact-requests/{id}/` | Actualizar solicitud completa | Si (staff) |
| PATCH | `/users/interview/admin/contact-requests/{id}/` | Actualizar solicitud parcial | Si (staff) |
| DELETE | `/users/interview/admin/contact-requests/{id}/` | Eliminar solicitud | Si (staff) |

**Rutas publicas de entrevista (3 endpoints)**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/users/interview/validate-interview-code/` | Validar codigo de entrevista | No |
| POST | `/users/interview/contact/` | Enviar solicitud de contacto | No |
| POST | `/users/interview/register-with-code/` | Registrarse con codigo | No |

### 2.9 Rutas personalizadas de usuario (26 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/users/contact/` | Enviar solicitud de contacto | No |
| POST | `/users/verification/request/` | Solicitar verificacion de identidad | Si |
| POST | `/users/verification/upload-documents/` | Subir documentos de verificacion | Si |
| GET | `/users/verification/status/` | Consultar estado de verificacion | Si |
| GET | `/users/search/` | Buscar usuarios | Si |
| GET | `/users/search/service-providers/` | Buscar proveedores de servicio | Si |
| GET | `/users/stats/dashboard/` | Estadisticas del dashboard del usuario | Si |
| GET/PUT | `/users/profile/` | Obtener/actualizar perfil propio | Si |
| POST | `/users/avatar/` | Subir/actualizar avatar | Si |
| GET/PUT | `/users/resume/` | Obtener/actualizar hoja de vida | Si |
| GET/PUT | `/users/settings/` | Obtener/actualizar ajustes de usuario | Si |
| POST | `/users/verify-interview-code/` | Verificar codigo de entrevista | No |
| POST | `/users/create-interview-code/` | Crear codigo de entrevista | Si (staff) |
| GET | `/users/dashboard/` | Dashboard general del usuario | Si |
| GET | `/users/notifications/` | Listar notificaciones del usuario | Si |
| POST | `/users/notifications/{notification_id}/mark-read/` | Marcar notificacion como leida | Si |
| POST | `/users/notifications/mark-all-read/` | Marcar todas las notificaciones como leidas | Si |
| GET | `/users/activity-logs/stats/` | Estadisticas de actividad | Si |
| POST | `/users/activity-logs/create/` | Crear log de actividad | Si |
| GET | `/users/activity-logs/types/` | Listar tipos de actividad disponibles | Si |
| GET | `/users/{user_id}/profile/` | Ver perfil publico de un usuario | Si |
| GET | `/users/{user_id}/resume/` | Ver hoja de vida publica de un usuario | Si |
| GET | `/users/{user_id}/evaluation/` | Evaluacion completa de un candidato | Si |

---

## 3. Modulo Properties (46 endpoints)

**Base URL**: `/api/v1/properties/`

### 3.1 PropertyViewSet (8 endpoints)

Router: (raiz)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/properties/` | Listar propiedades | Si |
| POST | `/properties/` | Crear propiedad | Si (arrendador) |
| GET | `/properties/{id}/` | Detalle de propiedad | Si |
| PUT | `/properties/{id}/` | Actualizar propiedad completa | Si (propietario) |
| PATCH | `/properties/{id}/` | Actualizar propiedad parcial | Si (propietario) |
| DELETE | `/properties/{id}/` | Eliminar propiedad | Si (propietario) |
| PATCH | `/properties/{id}/update_source/` | Actualizar fuente de la propiedad | Si (propietario) |
| PATCH | `/properties/{id}/reorder/` | Reordenar propiedad | Si (propietario) |

### 3.2 PropertyImageViewSet (6 endpoints)

Router: `property-images/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/properties/property-images/` | Listar imagenes de propiedades | Si |
| POST | `/properties/property-images/` | Subir imagen de propiedad | Si |
| GET | `/properties/property-images/{id}/` | Detalle de imagen | Si |
| PUT | `/properties/property-images/{id}/` | Actualizar imagen completa | Si |
| PATCH | `/properties/property-images/{id}/` | Actualizar imagen parcial | Si |
| DELETE | `/properties/property-images/{id}/` | Eliminar imagen | Si |

### 3.3 PropertyVideoViewSet (6 endpoints)

Router: `property-videos/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/properties/property-videos/` | Listar videos de propiedades | Si |
| POST | `/properties/property-videos/` | Subir video de propiedad | Si |
| GET | `/properties/property-videos/{id}/` | Detalle de video | Si |
| PUT | `/properties/property-videos/{id}/` | Actualizar video completo | Si |
| PATCH | `/properties/property-videos/{id}/` | Actualizar video parcial | Si |
| DELETE | `/properties/property-videos/{id}/` | Eliminar video | Si |

### 3.4 PropertyAmenityViewSet (6 endpoints)

Router: `amenities/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/properties/amenities/` | Listar amenidades | Si |
| POST | `/properties/amenities/` | Crear amenidad | Si |
| GET | `/properties/amenities/{id}/` | Detalle de amenidad | Si |
| PUT | `/properties/amenities/{id}/` | Actualizar amenidad completa | Si |
| PATCH | `/properties/amenities/{id}/` | Actualizar amenidad parcial | Si |
| DELETE | `/properties/amenities/{id}/` | Eliminar amenidad | Si |

### 3.5 PropertyInquiryViewSet (6 endpoints)

Router: `inquiries/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/properties/inquiries/` | Listar consultas de propiedades | Si |
| POST | `/properties/inquiries/` | Crear consulta sobre propiedad | Si |
| GET | `/properties/inquiries/{id}/` | Detalle de consulta | Si |
| PUT | `/properties/inquiries/{id}/` | Actualizar consulta completa | Si |
| PATCH | `/properties/inquiries/{id}/` | Actualizar consulta parcial | Si |
| DELETE | `/properties/inquiries/{id}/` | Eliminar consulta | Si |

### 3.6 PropertyFavoriteViewSet (6 endpoints)

Router: `favorites/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/properties/favorites/` | Listar propiedades favoritas | Si |
| POST | `/properties/favorites/` | Agregar a favoritos | Si |
| GET | `/properties/favorites/{id}/` | Detalle de favorito | Si |
| PUT | `/properties/favorites/{id}/` | Actualizar favorito completo | Si |
| PATCH | `/properties/favorites/{id}/` | Actualizar favorito parcial | Si |
| DELETE | `/properties/favorites/{id}/` | Eliminar de favoritos | Si |

### 3.7 Rutas personalizadas (8 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/properties/search/` | Busqueda avanzada de propiedades | Si |
| GET | `/properties/filters/` | Obtener filtros disponibles | Si |
| GET | `/properties/featured/` | Propiedades destacadas | No |
| GET | `/properties/trending/` | Propiedades en tendencia | No |
| GET | `/properties/stats/` | Estadisticas de propiedades | Si |
| POST | `/properties/{property_id}/toggle-favorite/` | Alternar estado de favorito | Si |
| GET | `/properties/property-videos/{video_id}/` | Detalle de video especifico | Si |
| POST | `/properties/{property_id}/videos/upload/` | Subir video a propiedad | Si |

---

## 4. Modulo Contracts (159 endpoints)

**Base URL**: `/api/v1/contracts/`

Este es el modulo mas grande de la plataforma. Incluye el sistema de contratos legacy, el sistema controlado por arrendador, el sistema del arrendatario, la API unificada, el flujo biometrico y las APIs de administracion.

### 4.1 ContractViewSet (6 endpoints)

Router: `contracts/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/contracts/` | Listar contratos | Si |
| POST | `/contracts/contracts/` | Crear contrato | Si |
| GET | `/contracts/contracts/{id}/` | Detalle de contrato | Si |
| PUT | `/contracts/contracts/{id}/` | Actualizar contrato completo | Si |
| PATCH | `/contracts/contracts/{id}/` | Actualizar contrato parcial | Si |
| DELETE | `/contracts/contracts/{id}/` | Eliminar contrato | Si |

### 4.2 UnifiedContractViewSet (12 endpoints)

Router: `unified-contracts/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/unified-contracts/` | Listar contratos unificados | Si |
| POST | `/contracts/unified-contracts/` | Crear contrato unificado | Si |
| GET | `/contracts/unified-contracts/{id}/` | Detalle de contrato unificado | Si |
| PUT | `/contracts/unified-contracts/{id}/` | Actualizar contrato completo | Si |
| PATCH | `/contracts/unified-contracts/{id}/` | Actualizar contrato parcial | Si |
| DELETE | `/contracts/unified-contracts/{id}/` | Eliminar contrato unificado | Si |
| POST | `/contracts/unified-contracts/{id}/tenant-approve/` | Aprobacion del arrendatario | Si (arrendatario) |
| POST | `/contracts/unified-contracts/{id}/tenant-object/` | Objecion del arrendatario | Si (arrendatario) |
| POST | `/contracts/unified-contracts/{id}/send-to-tenant-review/` | Enviar a revision del arrendatario | Si (arrendador) |
| POST | `/contracts/unified-contracts/{id}/respond-objections/` | Responder objeciones | Si (arrendador) |
| POST | `/contracts/unified-contracts/{id}/start-biometric/` | Iniciar autenticacion biometrica | Si |
| GET | `/contracts/unified-contracts/{id}/workflow-status/` | Estado del workflow | Si |

### 4.3 ContractTemplateViewSet (6 endpoints)

Router: `templates/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/templates/` | Listar plantillas de contrato | Si |
| POST | `/contracts/templates/` | Crear plantilla | Si (admin) |
| GET | `/contracts/templates/{id}/` | Detalle de plantilla | Si |
| PUT | `/contracts/templates/{id}/` | Actualizar plantilla completa | Si (admin) |
| PATCH | `/contracts/templates/{id}/` | Actualizar plantilla parcial | Si (admin) |
| DELETE | `/contracts/templates/{id}/` | Eliminar plantilla | Si (admin) |

### 4.4 ContractSignatureViewSet (6 endpoints)

Router: `signatures/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/signatures/` | Listar firmas de contratos | Si |
| POST | `/contracts/signatures/` | Crear firma | Si |
| GET | `/contracts/signatures/{id}/` | Detalle de firma | Si |
| PUT | `/contracts/signatures/{id}/` | Actualizar firma completa | Si |
| PATCH | `/contracts/signatures/{id}/` | Actualizar firma parcial | Si |
| DELETE | `/contracts/signatures/{id}/` | Eliminar firma | Si |

### 4.5 ContractAmendmentViewSet (6 endpoints)

Router: `amendments/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/amendments/` | Listar enmiendas | Si |
| POST | `/contracts/amendments/` | Crear enmienda | Si |
| GET | `/contracts/amendments/{id}/` | Detalle de enmienda | Si |
| PUT | `/contracts/amendments/{id}/` | Actualizar enmienda completa | Si |
| PATCH | `/contracts/amendments/{id}/` | Actualizar enmienda parcial | Si |
| DELETE | `/contracts/amendments/{id}/` | Eliminar enmienda | Si |

### 4.6 ContractRenewalViewSet (6 endpoints)

Router: `renewals/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/renewals/` | Listar renovaciones | Si |
| POST | `/contracts/renewals/` | Crear renovacion | Si |
| GET | `/contracts/renewals/{id}/` | Detalle de renovacion | Si |
| PUT | `/contracts/renewals/{id}/` | Actualizar renovacion completa | Si |
| PATCH | `/contracts/renewals/{id}/` | Actualizar renovacion parcial | Si |
| DELETE | `/contracts/renewals/{id}/` | Eliminar renovacion | Si |

### 4.7 ContractTerminationViewSet (6 endpoints)

Router: `terminations/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/terminations/` | Listar terminaciones | Si |
| POST | `/contracts/terminations/` | Crear terminacion | Si |
| GET | `/contracts/terminations/{id}/` | Detalle de terminacion | Si |
| PUT | `/contracts/terminations/{id}/` | Actualizar terminacion completa | Si |
| PATCH | `/contracts/terminations/{id}/` | Actualizar terminacion parcial | Si |
| DELETE | `/contracts/terminations/{id}/` | Eliminar terminacion | Si |

### 4.8 ContractDocumentViewSet (6 endpoints)

Router: `documents/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/documents/` | Listar documentos de contrato | Si |
| POST | `/contracts/documents/` | Crear documento | Si |
| GET | `/contracts/documents/{id}/` | Detalle de documento | Si |
| PUT | `/contracts/documents/{id}/` | Actualizar documento completo | Si |
| PATCH | `/contracts/documents/{id}/` | Actualizar documento parcial | Si |
| DELETE | `/contracts/documents/{id}/` | Eliminar documento | Si |

### 4.9 LandlordContractViewSet (27 endpoints)

Router: `landlord/contracts/`

**CRUD basico (6 endpoints)**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/landlord/contracts/` | Listar contratos del arrendador | Si (arrendador) |
| POST | `/contracts/landlord/contracts/` | Crear contrato controlado | Si (arrendador) |
| GET | `/contracts/landlord/contracts/{id}/` | Detalle de contrato | Si (arrendador) |
| PUT | `/contracts/landlord/contracts/{id}/` | Actualizar contrato completo | Si (arrendador) |
| PATCH | `/contracts/landlord/contracts/{id}/` | Actualizar contrato parcial | Si (arrendador) |
| DELETE | `/contracts/landlord/contracts/{id}/` | Eliminar contrato | Si (arrendador) |

**Acciones del workflow (21 endpoints)**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/contracts/landlord/contracts/{id}/complete_landlord_data/` | Completar datos del arrendador | Si (arrendador) |
| POST | `/contracts/landlord/contracts/{id}/send_tenant_invitation/` | Enviar invitacion al arrendatario | Si (arrendador) |
| POST | `/contracts/landlord/contracts/{id}/create_objection/` | Crear objecion al contrato | Si (arrendador) |
| POST | `/contracts/landlord/contracts/{id}/respond_to_objection/` | Responder a objecion | Si (arrendador) |
| POST | `/contracts/landlord/contracts/{id}/approve_contract/` | Aprobar contrato | Si (arrendador) |
| POST | `/contracts/landlord/contracts/{id}/sign_contract/` | Firmar contrato | Si (arrendador) |
| POST | `/contracts/landlord/contracts/{id}/publish_contract/` | Publicar contrato | Si (arrendador) |
| GET | `/contracts/landlord/contracts/{id}/objections/` | Listar objeciones del contrato | Si (arrendador) |
| GET | `/contracts/landlord/contracts/{id}/history/` | Historial del contrato | Si (arrendador) |
| GET | `/contracts/landlord/contracts/stats/` | Estadisticas del arrendador | Si (arrendador) |
| POST | `/contracts/landlord/contracts/{id}/add_guarantee/` | Agregar garantia | Si (arrendador) |
| POST | `/contracts/landlord/contracts/{id}/invite-codeudor/` | Invitar codeudor | Si (arrendador) |
| GET | `/contracts/landlord/contracts/{id}/codeudor-tokens/` | Listar tokens de codeudor | Si (arrendador) |
| POST | `/contracts/landlord/contracts/{id}/resend-codeudor-invitation/{token_id}/` | Reenviar invitacion codeudor | Si (arrendador) |
| GET | `/contracts/landlord/contracts/{id}/generate_pdf/` | Generar PDF del contrato | Si (arrendador) |
| GET | `/contracts/landlord/contracts/{id}/download_pdf/` | Descargar PDF del contrato | Si (arrendador) |
| GET | `/contracts/landlord/contracts/{id}/preview_pdf/` | Vista previa del PDF | Si (arrendador) |
| POST | `/contracts/landlord/contracts/{id}/start_correction/` | Iniciar correccion de contrato | Si (arrendador) |
| POST | `/contracts/landlord/contracts/{id}/resubmit_for_admin_review/` | Reenviar a revision admin | Si (arrendador) |
| GET | `/contracts/landlord/contracts/{id}/circular_workflow_status/` | Estado del workflow circular | Si (arrendador) |

### 4.10 ContractObjectionViewSet (8 endpoints)

Router: `landlord/objections/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/landlord/objections/` | Listar objeciones | Si |
| POST | `/contracts/landlord/objections/` | Crear objecion | Si |
| GET | `/contracts/landlord/objections/{id}/` | Detalle de objecion | Si |
| PUT | `/contracts/landlord/objections/{id}/` | Actualizar objecion completa | Si |
| PATCH | `/contracts/landlord/objections/{id}/` | Actualizar objecion parcial | Si |
| DELETE | `/contracts/landlord/objections/{id}/` | Eliminar objecion | Si |
| POST | `/contracts/landlord/objections/{id}/respond/` | Responder a objecion | Si |
| POST | `/contracts/landlord/objections/{id}/mark-implemented/` | Marcar como implementada | Si |

### 4.11 ContractGuaranteeViewSet (6 endpoints)

Router: `landlord/guarantees/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/landlord/guarantees/` | Listar garantias | Si |
| POST | `/contracts/landlord/guarantees/` | Crear garantia | Si |
| GET | `/contracts/landlord/guarantees/{id}/` | Detalle de garantia | Si |
| PUT | `/contracts/landlord/guarantees/{id}/` | Actualizar garantia completa | Si |
| PATCH | `/contracts/landlord/guarantees/{id}/` | Actualizar garantia parcial | Si |
| DELETE | `/contracts/landlord/guarantees/{id}/` | Eliminar garantia | Si |

### 4.12 ContractWorkflowHistoryViewSet (2 endpoints)

Router: `landlord/history/` (ReadOnly)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/landlord/history/` | Listar historial de workflow | Si |
| GET | `/contracts/landlord/history/{id}/` | Detalle de entrada de historial | Si |

### 4.13 ContractModificationRequestViewSet (6 endpoints)

Router: `landlord/modification-requests/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/landlord/modification-requests/` | Listar solicitudes de modificacion | Si |
| POST | `/contracts/landlord/modification-requests/` | Crear solicitud de modificacion | Si |
| GET | `/contracts/landlord/modification-requests/{id}/` | Detalle de solicitud | Si |
| PUT | `/contracts/landlord/modification-requests/{id}/` | Actualizar solicitud completa | Si |
| PATCH | `/contracts/landlord/modification-requests/{id}/` | Actualizar solicitud parcial | Si |
| DELETE | `/contracts/landlord/modification-requests/{id}/` | Eliminar solicitud | Si |

### 4.14 TenantContractViewSet (15 endpoints)

Router: `tenant/contracts/`

**CRUD basico (2 endpoints, ReadOnly)**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/tenant/contracts/` | Listar contratos del arrendatario | Si (arrendatario) |
| GET | `/contracts/tenant/contracts/{id}/` | Detalle de contrato | Si (arrendatario) |

**Acciones del workflow (13 endpoints)**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/contracts/tenant/contracts/accept_invitation/` | Aceptar invitacion de contrato | Si (arrendatario) |
| POST | `/contracts/tenant/contracts/{id}/complete_tenant_data/` | Completar datos del arrendatario | Si (arrendatario) |
| POST | `/contracts/tenant/contracts/{id}/create_objection/` | Crear objecion | Si (arrendatario) |
| POST | `/contracts/tenant/contracts/{id}/respond_to_objection/` | Responder a objecion | Si (arrendatario) |
| POST | `/contracts/tenant/contracts/{id}/approve_contract/` | Aprobar contrato | Si (arrendatario) |
| POST | `/contracts/tenant/contracts/{id}/reject_contract/` | Rechazar contrato | Si (arrendatario) |
| POST | `/contracts/tenant/contracts/{id}/sign_contract/` | Firmar contrato | Si (arrendatario) |
| GET | `/contracts/tenant/contracts/{id}/objections/` | Listar objeciones | Si (arrendatario) |
| GET | `/contracts/tenant/contracts/{id}/history/` | Historial del contrato | Si (arrendatario) |
| GET | `/contracts/tenant/contracts/stats/` | Estadisticas del arrendatario | Si (arrendatario) |
| GET | `/contracts/tenant/contracts/{id}/contract_preview/` | Vista previa del contrato | Si (arrendatario) |
| GET | `/contracts/tenant/contracts/pending_invitations/` | Invitaciones pendientes | Si (arrendatario) |
| POST | `/contracts/tenant/contracts/{id}/return_to_landlord/` | Devolver al arrendador | Si (arrendatario) |

### 4.15 TenantDashboardView (1 endpoint)

Router: `tenant/dashboard/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/tenant/dashboard/overview/` | Dashboard general del arrendatario | Si (arrendatario) |

### 4.16 Administracion de contratos (5 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/admin/pending/` | Contratos pendientes de revision | Si (admin) |
| GET | `/contracts/admin/stats/` | Estadisticas de contratos para admin | Si (admin) |
| GET | `/contracts/admin/contracts/{contract_id}/` | Detalle de contrato para revision | Si (admin) |
| POST | `/contracts/admin/contracts/{contract_id}/approve/` | Aprobar contrato (mover a DRAFT) | Si (admin) |
| POST | `/contracts/admin/contracts/{contract_id}/reject/` | Rechazar contrato (devolver) | Si (admin) |

### 4.17 Flujo biometrico (7 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/contracts/{contract_id}/start-biometric-authentication/` | Iniciar autenticacion biometrica | Si |
| POST | `/contracts/{contract_id}/auth/face-capture/` | Captura facial (frontal + lateral) | Si |
| POST | `/contracts/{contract_id}/auth/document-capture/` | Captura de documento de identidad | Si |
| POST | `/contracts/{contract_id}/auth/combined-capture/` | Verificacion combinada (documento + rostro) | Si |
| POST | `/contracts/{contract_id}/auth/voice-capture/` | Grabacion de voz (frase contractual) | Si |
| POST | `/contracts/{contract_id}/complete-auth/` | Completar autenticacion | Si |
| GET | `/contracts/{contract_id}/auth/status/` | Estado de la autenticacion biometrica | Si |

### 4.18 Sistema publico de codeudores (5 endpoints)

Estos endpoints no requieren autenticacion. El codeudor accede mediante un token unico recibido por correo.

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/public/codeudor/validate/{token}/` | Validar token de codeudor | No (token) |
| POST | `/contracts/public/codeudor/biometric/start/{token}/` | Iniciar biometrico del codeudor | No (token) |
| POST | `/contracts/public/codeudor/biometric/capture/{token}/` | Captura biometrica del codeudor | No (token) |
| POST | `/contracts/public/codeudor/biometric/complete/{token}/` | Completar biometrico del codeudor | No (token) |
| GET | `/contracts/public/codeudor/status/{token}/` | Estado del proceso del codeudor | No (token) |

### 4.19 Generacion y edicion de PDF (4 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/contracts/{contract_id}/generate-pdf/` | Generar PDF del contrato | Si |
| GET | `/contracts/{contract_id}/preview-pdf/` | Vista previa del PDF | Si |
| GET | `/contracts/{contract_id}/preview-with-clauses/` | Vista previa con clausulas | Si |
| PUT | `/contracts/{contract_id}/edit-before-auth/` | Editar contrato antes de autenticacion | Si |

### 4.20 Clausulas adicionales (2 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET/POST | `/contracts/{contract_id}/additional-clauses/` | Listar/crear clausulas adicionales | Si |
| GET/PUT/DELETE | `/contracts/{contract_id}/additional-clauses/{clause_id}/` | Detalle/editar/eliminar clausula | Si |

### 4.21 Firmas digitales (4 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/contracts/{contract_pk}/sign/` | Firmar contrato | Si |
| POST | `/contracts/{contract_pk}/digital-signature/` | Firma digital avanzada | Si |
| GET | `/contracts/{contract_pk}/verify-signature/` | Verificar firma de contrato | Si |
| GET | `/contracts/signatures/{signature_id}/verify/` | Verificar firma por ID | Si |

### 4.22 Estados del contrato (2 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/contracts/{contract_pk}/activate/` | Activar contrato | Si |
| POST | `/contracts/{contract_pk}/suspend/` | Suspender contrato | Si |

### 4.23 Documentos del contrato (1 endpoint)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/contracts/{contract_pk}/documents/upload/` | Subir documento al contrato | Si |

### 4.24 Workflow de matches aprobados (4 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/matched-candidates/` | Listar candidatos aprobados | Si (arrendador) |
| POST | `/contracts/workflow-action/` | Ejecutar accion de workflow | Si |
| GET | `/contracts/tenant-processes/` | Seguimiento de procesos del arrendatario | Si (arrendatario) |
| POST | `/contracts/tenant-review/` | Revision de contrato por arrendatario | Si (arrendatario) |

### 4.25 Reportes, estadisticas y ejecucion (6 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/contracts/reports/expiring/` | Contratos proximos a vencer | Si |
| GET | `/contracts/reports/pending-signatures/` | Firmas pendientes | Si |
| GET | `/contracts/stats/` | Estadisticas generales de contratos | Si |
| POST | `/contracts/{contract_id}/send-biometric-reminder/` | Enviar recordatorio biometrico | Si (arrendador) |
| POST | `/contracts/{contract_id}/confirm-key-delivery/` | Confirmar entrega de llaves | Si (arrendador) |
| POST | `/contracts/{contract_id}/start-execution/` | Iniciar ejecucion del contrato | Si (arrendador) |

---

## 5. Modulo Messaging (41 endpoints)

**Base URL**: `/api/v1/messages/`

### 5.1 MessageThreadViewSet (6 endpoints)

Router: `threads/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/messages/threads/` | Listar hilos de mensajes | Si |
| POST | `/messages/threads/` | Crear hilo de mensajes | Si |
| GET | `/messages/threads/{id}/` | Detalle de hilo | Si |
| PUT | `/messages/threads/{id}/` | Actualizar hilo completo | Si |
| PATCH | `/messages/threads/{id}/` | Actualizar hilo parcial | Si |
| DELETE | `/messages/threads/{id}/` | Eliminar hilo | Si |

### 5.2 MessageViewSet (6 endpoints)

Router: `messages/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/messages/messages/` | Listar mensajes | Si |
| POST | `/messages/messages/` | Crear mensaje | Si |
| GET | `/messages/messages/{id}/` | Detalle de mensaje | Si |
| PUT | `/messages/messages/{id}/` | Actualizar mensaje completo | Si |
| PATCH | `/messages/messages/{id}/` | Actualizar mensaje parcial | Si |
| DELETE | `/messages/messages/{id}/` | Eliminar mensaje | Si |

### 5.3 MessageFolderViewSet (6 endpoints)

Router: `folders/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/messages/folders/` | Listar carpetas de mensajes | Si |
| POST | `/messages/folders/` | Crear carpeta | Si |
| GET | `/messages/folders/{id}/` | Detalle de carpeta | Si |
| PUT | `/messages/folders/{id}/` | Actualizar carpeta completa | Si |
| PATCH | `/messages/folders/{id}/` | Actualizar carpeta parcial | Si |
| DELETE | `/messages/folders/{id}/` | Eliminar carpeta | Si |

### 5.4 MessageTemplateViewSet (6 endpoints)

Router: `templates/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/messages/templates/` | Listar plantillas de mensaje | Si |
| POST | `/messages/templates/` | Crear plantilla | Si |
| GET | `/messages/templates/{id}/` | Detalle de plantilla | Si |
| PUT | `/messages/templates/{id}/` | Actualizar plantilla completa | Si |
| PATCH | `/messages/templates/{id}/` | Actualizar plantilla parcial | Si |
| DELETE | `/messages/templates/{id}/` | Eliminar plantilla | Si |

### 5.5 ConversationViewSet (6 endpoints)

Router: `conversations/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/messages/conversations/` | Listar conversaciones | Si |
| POST | `/messages/conversations/` | Crear conversacion | Si |
| GET | `/messages/conversations/{id}/` | Detalle de conversacion | Si |
| PUT | `/messages/conversations/{id}/` | Actualizar conversacion completa | Si |
| PATCH | `/messages/conversations/{id}/` | Actualizar conversacion parcial | Si |
| DELETE | `/messages/conversations/{id}/` | Eliminar conversacion | Si |

### 5.6 Rutas personalizadas (11 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/messages/send/` | Enviar mensaje | Si |
| POST | `/messages/quick-reply/` | Respuesta rapida | Si |
| POST | `/messages/mark-read/{message_pk}/` | Marcar mensaje como leido | Si |
| POST | `/messages/mark-unread/{message_pk}/` | Marcar mensaje como no leido | Si |
| POST | `/messages/star/{message_pk}/` | Marcar mensaje como destacado | Si |
| POST | `/messages/conversation/{thread_pk}/mark-read/` | Marcar conversacion como leida | Si |
| POST | `/messages/conversation/{thread_pk}/archive/` | Archivar conversacion | Si |
| GET | `/messages/search/` | Buscar en mensajes | Si |
| GET | `/messages/stats/` | Estadisticas de mensajeria | Si |
| GET | `/messages/unread-count/` | Conteo de mensajes no leidos | Si |
| GET | `/messages/can-communicate/{user_pk}/` | Verificar si puede comunicarse con usuario | Si |

---

## 6. Modulo Payments (84 endpoints)

**Base URL**: `/api/v1/payments/`

### 6.1 TransactionViewSet (6 endpoints)

Router: `transactions/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/payments/transactions/` | Listar transacciones | Si |
| POST | `/payments/transactions/` | Crear transaccion | Si |
| GET | `/payments/transactions/{id}/` | Detalle de transaccion | Si |
| PUT | `/payments/transactions/{id}/` | Actualizar transaccion completa | Si |
| PATCH | `/payments/transactions/{id}/` | Actualizar transaccion parcial | Si |
| DELETE | `/payments/transactions/{id}/` | Eliminar transaccion | Si |

### 6.2 PaymentViewSet (8 endpoints)

Router: `payments/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/payments/payments/` | Listar pagos | Si |
| POST | `/payments/payments/` | Crear pago | Si |
| GET | `/payments/payments/{id}/` | Detalle de pago | Si |
| PUT | `/payments/payments/{id}/` | Actualizar pago completo | Si |
| PATCH | `/payments/payments/{id}/` | Actualizar pago parcial | Si |
| DELETE | `/payments/payments/{id}/` | Eliminar pago | Si |
| POST | `/payments/payments/process_payment/` | Procesar pago | Si |
| POST | `/payments/payments/{id}/refund/` | Reembolsar pago | Si |

### 6.3 PaymentMethodViewSet (6 endpoints)

Router: `payment-methods/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/payments/payment-methods/` | Listar metodos de pago | Si |
| POST | `/payments/payment-methods/` | Crear metodo de pago | Si |
| GET | `/payments/payment-methods/{id}/` | Detalle de metodo de pago | Si |
| PUT | `/payments/payment-methods/{id}/` | Actualizar metodo completo | Si |
| PATCH | `/payments/payment-methods/{id}/` | Actualizar metodo parcial | Si |
| DELETE | `/payments/payment-methods/{id}/` | Eliminar metodo de pago | Si |

### 6.4 InvoiceViewSet (6 endpoints)

Router: `invoices/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/payments/invoices/` | Listar facturas | Si |
| POST | `/payments/invoices/` | Crear factura | Si |
| GET | `/payments/invoices/{id}/` | Detalle de factura | Si |
| PUT | `/payments/invoices/{id}/` | Actualizar factura completa | Si |
| PATCH | `/payments/invoices/{id}/` | Actualizar factura parcial | Si |
| DELETE | `/payments/invoices/{id}/` | Eliminar factura | Si |

### 6.5 EscrowAccountViewSet (10 endpoints)

Router: `escrow-accounts/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/payments/escrow-accounts/` | Listar cuentas escrow | Si |
| POST | `/payments/escrow-accounts/` | Crear cuenta escrow | Si |
| GET | `/payments/escrow-accounts/{id}/` | Detalle de cuenta escrow | Si |
| PUT | `/payments/escrow-accounts/{id}/` | Actualizar cuenta completa | Si |
| PATCH | `/payments/escrow-accounts/{id}/` | Actualizar cuenta parcial | Si |
| DELETE | `/payments/escrow-accounts/{id}/` | Eliminar cuenta escrow | Si |
| POST | `/payments/escrow-accounts/{id}/release_funds/` | Liberar fondos escrow | Si |
| POST | `/payments/escrow-accounts/{id}/refund_escrow/` | Reembolsar escrow | Si |
| POST | `/payments/escrow-accounts/{id}/initiate_dispute/` | Iniciar disputa | Si |
| POST | `/payments/escrow-accounts/{id}/resolve_dispute/` | Resolver disputa | Si |

### 6.6 PaymentPlanViewSet (9 endpoints)

Router: `payment-plans/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/payments/payment-plans/` | Listar planes de pago | Si |
| POST | `/payments/payment-plans/` | Crear plan de pago | Si |
| GET | `/payments/payment-plans/{id}/` | Detalle de plan de pago | Si |
| PUT | `/payments/payment-plans/{id}/` | Actualizar plan completo | Si |
| PATCH | `/payments/payment-plans/{id}/` | Actualizar plan parcial | Si |
| DELETE | `/payments/payment-plans/{id}/` | Eliminar plan | Si |
| POST | `/payments/payment-plans/{id}/approve/` | Aprobar plan de pago | Si (admin) |
| GET | `/payments/payment-plans/{id}/installments/` | Listar cuotas del plan | Si |
| POST | `/payments/payment-plans/{id}/pay_installment/` | Pagar cuota | Si |

### 6.7 PaymentPlanInstallmentViewSet (7 endpoints)

Router: `installments/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/payments/installments/` | Listar cuotas | Si |
| POST | `/payments/installments/` | Crear cuota | Si |
| GET | `/payments/installments/{id}/` | Detalle de cuota | Si |
| PUT | `/payments/installments/{id}/` | Actualizar cuota completa | Si |
| PATCH | `/payments/installments/{id}/` | Actualizar cuota parcial | Si |
| DELETE | `/payments/installments/{id}/` | Eliminar cuota | Si |
| POST | `/payments/installments/{id}/apply_late_fee/` | Aplicar cargo por mora | Si |

### 6.8 RentPaymentScheduleViewSet (6 endpoints)

Router: `rent-schedules/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/payments/rent-schedules/` | Listar programacion de pagos de arriendo | Si |
| POST | `/payments/rent-schedules/` | Crear programacion de pago | Si |
| GET | `/payments/rent-schedules/{id}/` | Detalle de programacion | Si |
| PUT | `/payments/rent-schedules/{id}/` | Actualizar programacion completa | Si |
| PATCH | `/payments/rent-schedules/{id}/` | Actualizar programacion parcial | Si |
| DELETE | `/payments/rent-schedules/{id}/` | Eliminar programacion | Si |

### 6.9 Rutas personalizadas (26 endpoints)

**Procesamiento de pagos**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/payments/process/` | Procesar pago | Si |
| POST | `/payments/quick-pay/` | Pago rapido | Si |

**Gestion de metodos de pago**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/payments/payment-methods/add/` | Agregar metodo de pago | Si |
| POST | `/payments/payment-methods/{pk}/verify/` | Verificar metodo de pago | Si |
| POST | `/payments/payment-methods/{pk}/set-default/` | Establecer metodo por defecto | Si |

**Escrow**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/payments/escrow/{pk}/fund/` | Fondear cuenta escrow | Si |
| POST | `/payments/escrow/{pk}/release/` | Liberar fondos escrow | Si |

**Facturas**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/payments/invoices/create/` | Crear factura | Si |
| POST | `/payments/invoices/{pk}/pay/` | Pagar factura | Si |
| POST | `/payments/invoices/{pk}/send/` | Enviar factura por correo | Si |

**Estadisticas y reportes**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/payments/stats/balance/` | Consultar balance | Si |
| GET | `/payments/stats/dashboard/` | Dashboard de estadisticas de pago | Si |
| GET | `/payments/reports/transactions/` | Reporte de transacciones | Si |
| GET | `/payments/stats/` | Estadisticas generales de pago | Si |
| GET | `/payments/stats/system/` | Estadisticas del sistema de pagos | Si (admin) |
| GET | `/payments/stats/export/` | Exportar estadisticas de pago | Si |

**Pagos de arriendo**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/payments/rent/process/` | Procesar pago de arriendo | Si |
| GET | `/payments/tenant/portal/` | Portal de pagos del arrendatario | Si (arrendatario) |
| GET | `/payments/landlord/dashboard/` | Dashboard financiero del arrendador | Si (arrendador) |

**Webhooks (pasarelas de pago)**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/payments/webhooks/stripe/` | Webhook de Stripe | No (firma) |
| POST | `/payments/webhooks/paypal/` | Webhook de PayPal | No (firma) |
| POST | `/payments/webhooks/wompi/` | Webhook de Wompi | No (firma) |

**Wompi / PSE**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/payments/wompi/initiate/` | Iniciar pago Wompi | Si |
| GET | `/payments/wompi/status/{transaction_id}/` | Estado de pago Wompi | Si |
| GET | `/payments/pse/banks/` | Listar bancos PSE disponibles | Si |

**Recibos**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/payments/transactions/{pk}/receipt/` | Generar recibo de pago PDF | Si |

---

## 7. Modulo Ratings (24 endpoints)

**Base URL**: `/api/v1/ratings/`

### 7.1 AdvancedRatingViewSet (11 endpoints)

Router: `advanced/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/ratings/advanced/` | Listar calificaciones avanzadas | Si |
| POST | `/ratings/advanced/` | Crear calificacion avanzada | Si |
| GET | `/ratings/advanced/{id}/` | Detalle de calificacion | Si |
| PUT | `/ratings/advanced/{id}/` | Actualizar calificacion completa | Si |
| PATCH | `/ratings/advanced/{id}/` | Actualizar calificacion parcial | Si |
| DELETE | `/ratings/advanced/{id}/` | Eliminar calificacion | Si |
| POST | `/ratings/advanced/bulk_invite/` | Enviar invitaciones masivas | Si |
| GET | `/ratings/advanced/recommendations/` | Recomendaciones basadas en calificaciones | Si |
| GET | `/ratings/advanced/my_analytics/` | Analitica personal de calificaciones | Si |
| GET | `/ratings/advanced/improvement_suggestions/` | Sugerencias de mejora | Si |
| POST | `/ratings/advanced/{id}/mark_helpful/` | Marcar calificacion como util | Si |

### 7.2 API basica de calificaciones (8 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/ratings/ratings/` | Listar calificaciones | Si |
| POST | `/ratings/ratings/` | Crear calificacion | Si |
| GET | `/ratings/ratings/{pk}/` | Detalle de calificacion | Si |
| POST | `/ratings/ratings/{rating_id}/response/` | Responder a calificacion | Si |
| POST | `/ratings/ratings/{rating_id}/report/` | Reportar calificacion | Si |
| GET | `/ratings/users/{user_id}/ratings/` | Calificaciones de un usuario | Si |
| GET | `/ratings/users/{user_id}/rating-profile/` | Perfil de calificaciones de un usuario | Si |
| GET | `/ratings/contracts/{contract_id}/ratings/` | Calificaciones de un contrato | Si |

### 7.3 API avanzada (5 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/ratings/ratings/categories/` | Listar categorias de calificacion | Si |
| GET | `/ratings/analytics/` | Analitica de calificaciones | Si |
| GET | `/ratings/moderation/` | Panel de moderacion | Si (staff) |
| GET/POST | `/ratings/invitations/` | Listar/crear invitaciones a calificar | Si |
| POST | `/ratings/invite/{token}/` | Calificar desde invitacion | No (token) |
| GET | `/ratings/stats/` | Estadisticas rapidas de calificaciones | Si |

---

## 8. Modulo Matching (54 endpoints)

**Base URL**: `/api/v1/matching/`

### 8.1 MatchRequestViewSet (15 endpoints)

Router: `requests/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/matching/requests/` | Listar solicitudes de match | Si |
| POST | `/matching/requests/` | Crear solicitud de match | Si |
| GET | `/matching/requests/{id}/` | Detalle de solicitud | Si |
| PUT | `/matching/requests/{id}/` | Actualizar solicitud completa | Si |
| PATCH | `/matching/requests/{id}/` | Actualizar solicitud parcial | Si |
| DELETE | `/matching/requests/{id}/` | Eliminar solicitud | Si |
| POST | `/matching/requests/{id}/mark_viewed/` | Marcar match como visto | Si |
| POST | `/matching/requests/{id}/accept/` | Aceptar match | Si |
| POST | `/matching/requests/{id}/reject/` | Rechazar match | Si |
| POST | `/matching/requests/{id}/generate-contract/` | Generar contrato desde match | Si |
| POST | `/matching/requests/{id}/cancel/` | Cancelar solicitud | Si |
| POST | `/matching/requests/{id}/upload-document/` | Subir documento al match | Si |
| GET | `/matching/requests/{id}/compatibility/` | Verificar compatibilidad | Si |
| POST | `/matching/requests/{id}/advance-to-contract-stage/` | Avanzar a etapa de contrato | Si |
| GET | `/matching/requests/{id}/find_matches/` | Buscar matches para solicitud | Si |

### 8.2 MatchCriteriaViewSet (6 endpoints)

Router: `criteria/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/matching/criteria/` | Listar criterios de match | Si |
| POST | `/matching/criteria/` | Crear criterio | Si |
| GET | `/matching/criteria/{id}/` | Detalle de criterio | Si |
| PUT | `/matching/criteria/{id}/` | Actualizar criterio completo | Si |
| PATCH | `/matching/criteria/{id}/` | Actualizar criterio parcial | Si |
| DELETE | `/matching/criteria/{id}/` | Eliminar criterio | Si |

### 8.3 MatchNotificationViewSet (4 endpoints)

Router: `notifications/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/matching/notifications/` | Listar notificaciones de match | Si |
| GET | `/matching/notifications/{id}/` | Detalle de notificacion | Si |
| POST | `/matching/notifications/{id}/mark_read/` | Marcar como leida | Si |
| POST | `/matching/notifications/mark_all_read/` | Marcar todas como leidas | Si |

### 8.4 MatchContractViewSet (12 endpoints)

Router: `contracts/` (condicional, depende de disponibilidad)

**CRUD basico (6 endpoints)**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/matching/contracts/` | Listar contratos de match | Si |
| POST | `/matching/contracts/` | Crear contrato desde match | Si |
| GET | `/matching/contracts/{id}/` | Detalle de contrato | Si |
| PUT | `/matching/contracts/{id}/` | Actualizar contrato completo | Si |
| PATCH | `/matching/contracts/{id}/` | Actualizar contrato parcial | Si |
| DELETE | `/matching/contracts/{id}/` | Eliminar contrato | Si |

**Acciones del ViewSet (6 endpoints)**

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/matching/contracts/verify-identity/` | Verificar identidad para contrato | Si |
| GET | `/matching/contracts/{id}/legal_clauses/` | Obtener clausulas legales | Si |
| POST | `/matching/contracts/{id}/add_guarantee/` | Agregar garantia al contrato | Si |
| POST | `/matching/contracts/{id}/sign_contract/` | Firmar contrato | Si |
| GET | `/matching/contracts/{id}/download_pdf/` | Descargar PDF del contrato | Si |
| GET | `/matching/contracts/{id}/payment_schedule/` | Cronograma de pagos | Si |

### 8.5 Rutas especificas de contratos (7 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/matching/requests/{match_id}/validate-contract/` | Validar match para contrato | Si |
| POST | `/matching/requests/{match_id}/create-contract/` | Crear contrato desde match | Si |
| POST | `/matching/contracts/{contract_id}/verify-identity/` | Verificar identidad | Si |
| POST | `/matching/contracts/{contract_id}/generate-clauses/` | Generar clausulas legales | Si |
| POST | `/matching/contracts/{contract_id}/sign/` | Firmar contrato | Si |
| GET | `/matching/contracts/{contract_id}/download-pdf/` | Descargar PDF | Si |
| GET | `/matching/contracts/{contract_id}/milestones/` | Hitos del contrato | Si |

### 8.6 Rutas personalizadas (10 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/matching/potential-matches/` | Matches potenciales | Si |
| GET | `/matching/landlord-recommendations/` | Recomendaciones para arrendador | Si (arrendador) |
| GET | `/matching/statistics/` | Estadisticas de matching | Si |
| POST | `/matching/auto-apply/` | Aplicar matches automaticamente | Si |
| GET | `/matching/dashboard/` | Dashboard de matching | Si |
| GET | `/matching/preferences/` | Preferencias de matching | Si |
| GET | `/matching/analytics/` | Analitica de matching | Si |
| POST | `/matching/smart-matching/` | Matching inteligente (IA) | Si |
| GET | `/matching/find-match-request/` | Buscar solicitud de match | Si |
| GET | `/matching/check-existing/` | Verificar solicitud existente | Si |

---

## 9. Modulo Requests (53 endpoints)

**Base URL**: `/api/v1/requests/`

Nota: Las rutas de este modulo incluyen el prefijo `api/` en la configuracion interna, por lo que la ruta completa es `/api/v1/requests/api/`.

### 9.1 BaseRequestViewSet (10 endpoints)

Router: `api/base/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/requests/api/base/` | Listar solicitudes base | Si |
| POST | `/requests/api/base/` | Crear solicitud | Si |
| GET | `/requests/api/base/{id}/` | Detalle de solicitud | Si |
| PUT | `/requests/api/base/{id}/` | Actualizar solicitud completa | Si |
| PATCH | `/requests/api/base/{id}/` | Actualizar solicitud parcial | Si |
| DELETE | `/requests/api/base/{id}/` | Eliminar solicitud | Si |
| POST | `/requests/api/base/{id}/perform_action/` | Ejecutar accion sobre solicitud | Si |
| GET | `/requests/api/base/dashboard_stats/` | Estadisticas del dashboard | Si |
| GET | `/requests/api/base/my_sent_requests/` | Mis solicitudes enviadas | Si |
| GET | `/requests/api/base/my_received_requests/` | Mis solicitudes recibidas | Si |

### 9.2 PropertyInterestRequestViewSet (6 endpoints)

Router: `api/property-interest/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/requests/api/property-interest/` | Listar solicitudes de interes en propiedad | Si |
| POST | `/requests/api/property-interest/` | Crear solicitud de interes | Si |
| GET | `/requests/api/property-interest/{id}/` | Detalle de solicitud | Si |
| PUT | `/requests/api/property-interest/{id}/` | Actualizar solicitud completa | Si |
| PATCH | `/requests/api/property-interest/{id}/` | Actualizar solicitud parcial | Si |
| DELETE | `/requests/api/property-interest/{id}/` | Eliminar solicitud | Si |

### 9.3 ServiceRequestViewSet (6 endpoints)

Router: `api/services/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/requests/api/services/` | Listar solicitudes de servicio | Si |
| POST | `/requests/api/services/` | Crear solicitud de servicio | Si |
| GET | `/requests/api/services/{id}/` | Detalle de solicitud | Si |
| PUT | `/requests/api/services/{id}/` | Actualizar solicitud completa | Si |
| PATCH | `/requests/api/services/{id}/` | Actualizar solicitud parcial | Si |
| DELETE | `/requests/api/services/{id}/` | Eliminar solicitud | Si |

### 9.4 ContractSignatureRequestViewSet (7 endpoints)

Router: `api/contracts/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/requests/api/contracts/` | Listar solicitudes de firma | Si |
| POST | `/requests/api/contracts/` | Crear solicitud de firma | Si |
| GET | `/requests/api/contracts/{id}/` | Detalle de solicitud | Si |
| PUT | `/requests/api/contracts/{id}/` | Actualizar solicitud completa | Si |
| PATCH | `/requests/api/contracts/{id}/` | Actualizar solicitud parcial | Si |
| DELETE | `/requests/api/contracts/{id}/` | Eliminar solicitud | Si |
| POST | `/requests/api/contracts/{id}/sign_contract/` | Firmar contrato desde solicitud | Si |

### 9.5 MaintenanceRequestViewSet (6 endpoints)

Router: `api/maintenance/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/requests/api/maintenance/` | Listar solicitudes de mantenimiento | Si |
| POST | `/requests/api/maintenance/` | Crear solicitud de mantenimiento | Si |
| GET | `/requests/api/maintenance/{id}/` | Detalle de solicitud | Si |
| PUT | `/requests/api/maintenance/{id}/` | Actualizar solicitud completa | Si |
| PATCH | `/requests/api/maintenance/{id}/` | Actualizar solicitud parcial | Si |
| DELETE | `/requests/api/maintenance/{id}/` | Eliminar solicitud | Si |

### 9.6 RequestNotificationViewSet (4 endpoints)

Router: `api/notifications/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/requests/api/notifications/` | Listar notificaciones de solicitudes | Si |
| GET | `/requests/api/notifications/{id}/` | Detalle de notificacion | Si |
| POST | `/requests/api/notifications/{id}/mark_as_read/` | Marcar como leida | Si |
| POST | `/requests/api/notifications/mark_all_as_read/` | Marcar todas como leidas | Si |

### 9.7 Comentarios de solicitudes (2 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET/POST | `/requests/api/base/{request_pk}/comments/` | Listar/crear comentarios de solicitud | Si |
| GET/PUT/DELETE | `/requests/api/base/{request_pk}/comments/{pk}/` | Detalle/editar/eliminar comentario | Si |

### 9.8 Documentos de inquilinos (9 endpoints)

Base: `api/documents/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| POST | `/requests/api/documents/upload/` | Subir documento de inquilino | Si |
| GET | `/requests/api/documents/process/{process_id}/` | Listar documentos de un proceso | Si |
| GET | `/requests/api/documents/process/{process_id}/checklist/` | Checklist de documentos | Si |
| POST | `/requests/api/documents/{pk}/review/` | Revisar documento (arrendador) | Si (arrendador) |
| DELETE | `/requests/api/documents/{document_id}/delete/` | Eliminar documento | Si |
| GET | `/requests/api/documents/stats/` | Estadisticas de documentos para arrendador | Si (arrendador) |
| GET | `/requests/api/documents/{document_id}/secure-download/` | Descarga segura de documento | Si |
| GET | `/requests/api/documents/{document_id}/secure-preview/` | Vista previa segura | Si |
| GET | `/requests/api/documents/{document_id}/access-history/` | Historial de accesos al documento | Si |

---

## 10. Modulo Services (34 endpoints)

**Base URL**: `/api/v1/services/`

### 10.1 ServiceCategoryViewSet (3 endpoints)

Router: `categories/` (ReadOnly + 1 accion)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/services/categories/` | Listar categorias de servicio | Si |
| GET | `/services/categories/{id}/` | Detalle de categoria | Si |
| GET | `/services/categories/featured/` | Categorias destacadas | No |

### 10.2 ServiceViewSet (7 endpoints)

Router: `services/` (ReadOnly + 5 acciones)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/services/services/` | Listar servicios | Si |
| GET | `/services/services/{id}/` | Detalle de servicio | Si |
| GET | `/services/services/featured/` | Servicios destacados | No |
| GET | `/services/services/most_requested/` | Servicios mas solicitados | Si |
| GET | `/services/services/popular/` | Servicios populares | Si |
| GET | `/services/services/by_category/` | Servicios por categoria | Si |
| GET | `/services/services/stats/` | Estadisticas de servicios | Si |

### 10.3 ServiceRequestViewSet (6 endpoints)

Router: `requests/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/services/requests/` | Listar solicitudes de servicio | Si |
| POST | `/services/requests/` | Crear solicitud de servicio | Si |
| GET | `/services/requests/{id}/` | Detalle de solicitud | Si |
| PUT | `/services/requests/{id}/` | Actualizar solicitud completa | Si |
| PATCH | `/services/requests/{id}/` | Actualizar solicitud parcial | Si |
| DELETE | `/services/requests/{id}/` | Eliminar solicitud | Si |

### 10.4 SubscriptionPlanViewSet (2 endpoints)

Router: `subscription-plans/` (ReadOnly)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/services/subscription-plans/` | Listar planes de suscripcion | No |
| GET | `/services/subscription-plans/{id}/` | Detalle de plan | No |

### 10.5 ServiceSubscriptionViewSet (11 endpoints)

Router: `subscriptions/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/services/subscriptions/` | Listar mis suscripciones | Si |
| POST | `/services/subscriptions/` | Crear suscripcion | Si |
| GET | `/services/subscriptions/{id}/` | Detalle de suscripcion | Si |
| PUT | `/services/subscriptions/{id}/` | Actualizar suscripcion completa | Si |
| PATCH | `/services/subscriptions/{id}/` | Actualizar suscripcion parcial | Si |
| DELETE | `/services/subscriptions/{id}/` | Eliminar suscripcion | Si |
| GET | `/services/subscriptions/current/` | Suscripcion actual | Si |
| POST | `/services/subscriptions/subscribe/` | Suscribirse a plan | Si |
| POST | `/services/subscriptions/cancel/` | Cancelar suscripcion | Si |
| POST | `/services/subscriptions/upgrade/` | Actualizar plan de suscripcion | Si |
| GET | `/services/subscriptions/stats/` | Estadisticas de suscripcion | Si |

### 10.6 Rutas personalizadas (5 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/services/popular/` | Servicios populares | No |
| GET | `/services/featured/` | Servicios destacados | No |
| GET | `/services/most-requested/` | Servicios mas solicitados | Si |
| GET | `/services/category/{category_slug}/` | Servicios por slug de categoria | Si |
| GET | `/services/search/` | Buscar servicios | Si |

---

## 11. Modulo Dashboard (36 endpoints)

**Base URL**: `/api/v1/dashboard/`

### 11.1 APIs basicas (3 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/dashboard/stats/` | Estadisticas generales del dashboard | Si |
| GET | `/dashboard/charts/` | Datos para graficos del dashboard | Si |
| GET | `/dashboard/export/` | Exportar datos del dashboard | Si |

### 11.2 DashboardWidgetViewSet (10 endpoints)

Router: `v2/widgets/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/dashboard/v2/widgets/` | Listar widgets del dashboard | Si |
| POST | `/dashboard/v2/widgets/` | Crear widget | Si |
| GET | `/dashboard/v2/widgets/{id}/` | Detalle de widget | Si |
| PUT | `/dashboard/v2/widgets/{id}/` | Actualizar widget completo | Si |
| PATCH | `/dashboard/v2/widgets/{id}/` | Actualizar widget parcial | Si |
| DELETE | `/dashboard/v2/widgets/{id}/` | Eliminar widget | Si |
| GET | `/dashboard/v2/widgets/{id}/data/` | Obtener datos del widget | Si |
| POST | `/dashboard/v2/widgets/{id}/refresh/` | Refrescar datos del widget | Si |
| GET | `/dashboard/v2/widgets/{id}/analytics/` | Analitica del widget | Si |
| GET | `/dashboard/v2/widgets/available_types/` | Tipos de widget disponibles | Si |

### 11.3 UserDashboardLayoutViewSet (10 endpoints)

Router: `v2/layouts/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/dashboard/v2/layouts/` | Listar layouts del usuario | Si |
| POST | `/dashboard/v2/layouts/` | Crear layout | Si |
| GET | `/dashboard/v2/layouts/{id}/` | Detalle de layout | Si |
| PUT | `/dashboard/v2/layouts/{id}/` | Actualizar layout completo | Si |
| PATCH | `/dashboard/v2/layouts/{id}/` | Actualizar layout parcial | Si |
| DELETE | `/dashboard/v2/layouts/{id}/` | Eliminar layout | Si |
| POST | `/dashboard/v2/layouts/{id}/add_widget/` | Agregar widget al layout | Si |
| DELETE | `/dashboard/v2/layouts/{id}/remove_widget/` | Remover widget del layout | Si |
| PUT | `/dashboard/v2/layouts/{id}/update_layout/` | Actualizar disposicion del layout | Si |
| POST | `/dashboard/v2/layouts/{id}/reset_to_default/` | Restablecer layout por defecto | Si |

### 11.4 APIs avanzadas V2 (13 endpoints)

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/dashboard/v2/data/` | Datos avanzados del dashboard | Si |
| GET | `/dashboard/v2/analytics/` | Analitica avanzada | Si |
| GET | `/dashboard/v2/performance/` | Metricas de rendimiento | Si |
| GET | `/dashboard/v2/cache/` | Gestion de cache de widgets | Si (admin) |
| GET | `/dashboard/v2/widgets/{widget_id}/data/` | Datos de widget especifico | Si |
| POST | `/dashboard/v2/widgets/{widget_id}/refresh/` | Refrescar widget especifico | Si |
| GET | `/dashboard/v2/widgets/{widget_id}/analytics/` | Analitica de widget especifico | Si |
| POST | `/dashboard/v2/layouts/{layout_id}/add-widget/` | Agregar widget (ruta alternativa) | Si |
| DELETE | `/dashboard/v2/layouts/{layout_id}/remove-widget/` | Remover widget (ruta alternativa) | Si |
| PUT | `/dashboard/v2/layouts/{layout_id}/update/` | Actualizar layout (ruta alternativa) | Si |
| POST | `/dashboard/v2/layouts/{layout_id}/reset/` | Restablecer layout (ruta alternativa) | Si |
| GET | `/dashboard/v2/system/health/` | Salud del sistema | Si (admin) |
| GET | `/dashboard/v2/types/` | Tipos de widget disponibles | Si |

---

## 12. Modulo Verification (25 endpoints)

**Base URL**: `/api/v1/verification/`

### 12.1 VerificationAgentViewSet (8 endpoints)

Router: `agents/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/verification/agents/` | Listar agentes de verificacion | Si |
| POST | `/verification/agents/` | Crear agente de verificacion | Si (admin) |
| GET | `/verification/agents/{id}/` | Detalle de agente | Si |
| PUT | `/verification/agents/{id}/` | Actualizar agente completo | Si (admin) |
| PATCH | `/verification/agents/{id}/` | Actualizar agente parcial | Si (admin) |
| DELETE | `/verification/agents/{id}/` | Eliminar agente | Si (admin) |
| GET | `/verification/agents/available/` | Agentes con capacidad disponible | Si |
| GET | `/verification/agents/stats/` | Estadisticas de agentes | Si |

### 12.2 VerificationVisitViewSet (10 endpoints)

Router: `visits/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/verification/visits/` | Listar visitas de verificacion | Si |
| POST | `/verification/visits/` | Crear visita de verificacion | Si |
| GET | `/verification/visits/{id}/` | Detalle de visita | Si |
| PUT | `/verification/visits/{id}/` | Actualizar visita completa | Si |
| PATCH | `/verification/visits/{id}/` | Actualizar visita parcial | Si |
| DELETE | `/verification/visits/{id}/` | Eliminar visita | Si |
| POST | `/verification/visits/{id}/assign_agent/` | Asignar agente a visita | Si (admin) |
| POST | `/verification/visits/{id}/start/` | Iniciar visita | Si (agente) |
| POST | `/verification/visits/{id}/complete/` | Completar visita | Si (agente) |
| POST | `/verification/visits/{id}/cancel/` | Cancelar visita | Si |

### 12.3 VerificationReportViewSet (7 endpoints)

Router: `reports/`

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/verification/reports/` | Listar reportes de verificacion | Si |
| POST | `/verification/reports/` | Crear reporte de verificacion | Si (agente) |
| GET | `/verification/reports/{id}/` | Detalle de reporte | Si |
| PUT | `/verification/reports/{id}/` | Actualizar reporte completo | Si (agente) |
| PATCH | `/verification/reports/{id}/` | Actualizar reporte parcial | Si (agente) |
| DELETE | `/verification/reports/{id}/` | Eliminar reporte | Si (admin) |
| POST | `/verification/reports/{id}/approve/` | Aprobar reporte de verificacion | Si (admin) |

---

## 13. Endpoints Top-level (3 endpoints)

Estos endpoints estan fuera de los modulos y se acceden directamente desde la raiz de la API.

| Metodo | Ruta | Descripcion | Autenticacion |
|--------|------|-------------|---------------|
| GET | `/api/v1/schema/` | Esquema OpenAPI (JSON/YAML) | No |
| GET | `/api/v1/docs/` | Documentacion Swagger UI interactiva | No |
| GET | `/api/v1/redoc/` | Documentacion ReDoc | No |

---

## 14. WebSocket (4 rutas)

Conexiones WebSocket para comunicacion en tiempo real. Requieren autenticacion mediante token JWT enviado como query parameter o en el primer mensaje.

| Protocolo | Ruta | Descripcion | Consumer |
|-----------|------|-------------|----------|
| WS | `ws://host/ws/messaging/` | Mensajeria general en tiempo real | MessageConsumer |
| WS | `ws://host/ws/notifications/` | Notificaciones push en tiempo real | NotificationConsumer |
| WS | `ws://host/ws/messaging/thread/{thread_id}/` | Mensajeria de hilo especifico | ThreadConsumer |
| WS | `ws://host/ws/user-status/` | Estado online/offline de usuarios | UserStatusConsumer |

---

## Resumen por Modulo

| Modulo | Endpoints HTTP | Endpoints WS | Total |
|--------|---------------|-------------|-------|
| Core | 40 | 0 | 40 |
| Users | 85 | 0 | 85 |
| Properties | 46 | 0 | 46 |
| Contracts | 159 | 0 | 159 |
| Messaging | 41 | 0 | 41 |
| Payments | 84 | 0 | 84 |
| Ratings | 24 | 0 | 24 |
| Matching | 54 | 0 | 54 |
| Requests | 53 | 0 | 53 |
| Services | 34 | 0 | 34 |
| Dashboard | 36 | 0 | 36 |
| Verification | 25 | 0 | 25 |
| Top-level | 3 | 0 | 3 |
| WebSocket | 0 | 4 | 4 |
| **TOTAL** | **684** | **4** | **688** |

---

## Convenciones Generales

### Autenticacion

Todos los endpoints protegidos requieren el header:

```
Authorization: Bearer <access_token>
```

El token se obtiene mediante `POST /api/v1/users/auth/login/` y se refresca con `POST /api/v1/users/auth/refresh/`.

- **Access Token**: Vigencia de 1 dia
- **Refresh Token**: Vigencia de 7 dias

### Formato de respuesta

Todas las respuestas usan formato JSON. Las listas paginadas siguen el formato:

```json
{
    "count": 100,
    "next": "http://host/api/v1/.../&page=2",
    "previous": null,
    "results": [...]
}
```

### Codigos de respuesta HTTP

| Codigo | Significado |
|--------|-------------|
| 200 | Operacion exitosa |
| 201 | Recurso creado exitosamente |
| 204 | Eliminacion exitosa (sin contenido) |
| 400 | Error de validacion en datos enviados |
| 401 | No autenticado (token invalido o expirado) |
| 403 | Sin permisos para la operacion |
| 404 | Recurso no encontrado |
| 429 | Limite de solicitudes excedido (rate limiting) |
| 500 | Error interno del servidor |

### Roles y permisos

| Rol | Descripcion |
|-----|-------------|
| No autenticado | Acceso solo a endpoints publicos |
| Arrendatario (tenant) | Acceso a contratos, mensajes, pagos, solicitudes |
| Arrendador (landlord) | Acceso completo a propiedades, contratos, candidatos |
| Proveedor de servicio | Acceso a servicios, suscripciones, portafolio |
| Staff | Acceso a tickets, moderacion, estadisticas del sistema |
| Admin | Acceso total, aprobacion de contratos, gestion de agentes |

### Filtros comunes

La mayoria de los ViewSets soportan:

- **Paginacion**: `?page=1&page_size=20`
- **Ordenamiento**: `?ordering=-created_at`
- **Busqueda**: `?search=termino`
- **Filtros**: Varian por endpoint (documentados en Swagger UI)

---

**Documento generado el 23 de marzo de 2026**
**VeriHome -- Plataforma Inmobiliaria con Autenticacion Biometrica**
**Version de la API**: v1
