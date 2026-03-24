# Guia de Usuario - Rol Administrador VeriHome

**Version**: 1.0
**Fecha**: Marzo 2026
**Plataforma**: VeriHome - Plataforma inmobiliaria empresarial
**Audiencia**: Usuarios con rol `is_staff=True` y/o `is_superuser=True`

---

## Tabla de Contenidos

1. [Introduccion](#1-introduccion)
2. [Panel de Administracion Django](#2-panel-de-administracion-django-admin)
3. [Sistema de Tickets Internos](#3-sistema-de-tickets-internos)
4. [Dashboard Administrativo](#4-dashboard-administrativo)
5. [Revision Juridica de Contratos](#5-revision-juridica-de-contratos-pilar-5)
6. [Gestion de Agentes de Verificacion](#6-gestion-de-agentes-de-verificacion)
7. [Gestion de Codigos de Entrevista](#7-gestion-de-codigos-de-entrevista)
8. [Moderacion de Calificaciones](#8-moderacion-de-calificaciones)
9. [Gestion de Pagos](#9-gestion-de-pagos)
10. [Mantenimiento del Sistema](#10-mantenimiento-del-sistema)
11. [Logs de Actividad y Auditoria](#11-logs-de-actividad-y-auditoria)
12. [Notificaciones del Sistema](#12-notificaciones-del-sistema)
13. [Gestion de Suscripciones de Prestadores](#13-gestion-de-suscripciones-de-prestadores)
14. [Celery Tasks Automaticas](#14-celery-tasks-automaticas)
15. [Seguridad](#15-seguridad)

---

## 1. Introduccion

### Que es VeriHome

VeriHome es una plataforma inmobiliaria empresarial que conecta arrendadores, arrendatarios y prestadores de servicios en Colombia. La plataforma se distingue por su sistema revolucionario de autenticacion biometrica de contratos en 5 pasos, cumpliendo con la Ley 820 de 2003 de arrendamiento de vivienda urbana.

### Rol del Administrador

El administrador de VeriHome tiene control total sobre la plataforma. Sus responsabilidades incluyen:

- Revision juridica y aprobacion de contratos antes de firma.
- Gestion de usuarios, verificacion de identidades y control de acceso.
- Moderacion de calificaciones y resolucion de disputas.
- Supervision del sistema de pagos y facturacion electronica.
- Gestion de agentes de verificacion presencial.
- Administracion de tickets de soporte interno.
- Monitoreo del estado de salud del sistema.
- Auditoria de actividades y seguridad.

### Credenciales y Acceso

#### Panel Django Admin

- **URL**: `https://su-dominio.com/admin/`
- **Requisitos**: Usuario con `is_staff=True` para acceso basico, `is_superuser=True` para acceso completo.
- **Autenticacion**: Email + contrasena (el sistema usa email como identificador, no username).

#### API REST

- **Base URL**: `https://su-dominio.com/api/v1/`
- **Autenticacion**: JWT (JSON Web Token)
  - Obtener token: `POST /api/v1/auth/jwt/create/` con `{"email": "admin@verihome.co", "password": "..."}`
  - El token de acceso dura 1 dia, el refresh token 7 dias.
  - Header de autorizacion: `Authorization: Bearer <access_token>`

#### Creacion de cuenta superusuario

```bash
python manage.py createsuperuser
```

Se solicitara email, nombre, apellido y contrasena.

---

## 2. Panel de Administracion Django (/admin/)

El panel de administracion Django es la interfaz principal para la gestion operativa de VeriHome. Acceda a `https://su-dominio.com/admin/` con credenciales de staff.

### 2.1 Gestion de Usuarios

**Ubicacion**: Admin > Users > Users

| Campo | Descripcion |
|-------|-------------|
| `email` | Identificador unico del usuario (no se usa username) |
| `user_type` | Tipo de usuario: `landlord`, `tenant`, `service_provider` |
| `is_verified` | Si el usuario ha pasado verificacion de identidad |
| `is_active` | Si la cuenta esta activa |
| `verification_date` | Fecha de verificacion |

**Acciones disponibles**:

- **Crear usuario**: Desde "Add User", completar email, nombre, tipo de usuario y contrasena.
- **Editar usuario**: Modificar tipo, verificacion, permisos.
- **Verificar usuario**: Marcar `is_verified=True` y establecer `verification_date`.
- **Desactivar cuenta**: Establecer `is_active=False` (el usuario no podra autenticarse).
- **Asignar permisos de staff**: Marcar `is_staff=True` para dar acceso al panel admin.

**Perfiles asociados**: Cada tipo de usuario tiene un perfil dedicado:

- **LandlordProfile**: Informacion de empresa, propiedades, documentos de propiedad.
- **TenantProfile**: Informacion financiera, empleo, referencias.
- **ServiceProviderProfile**: Servicios ofrecidos, areas de cobertura, disponibilidad, licencias.

**UserResume**: Hoja de vida completa del usuario con:
- Informacion personal, educativa, laboral y financiera.
- Documentos verificables (cedula, certificados de ingresos, extractos bancarios).
- Porcentaje de completitud calculado automaticamente.
- Estado de verificacion con notas del admin.

#### Impersonacion de Usuarios

Solo disponible para superusuarios. Permite actuar como otro usuario sin conocer su contrasena.

- Toda accion durante impersonacion queda registrada en `AdminImpersonationSession`.
- El header `X-Impersonating: true` se agrega a las respuestas HTTP.
- Para terminar la sesion, el sistema limpia automaticamente los datos de impersonacion.

### 2.2 Gestion de Propiedades

**Ubicacion**: Admin > Properties > Properties

| Campo | Descripcion |
|-------|-------------|
| `title` | Titulo de la propiedad |
| `landlord` | Arrendador propietario |
| `property_type` | apartment, house, commercial, room, rural |
| `status` | available, rented, maintenance, inactive |
| `is_featured` | Si aparece como destacada en la pagina principal |
| `is_active` | Si esta visible en la plataforma |

**Acciones masivas**:

| Accion | Descripcion |
|--------|-------------|
| Marcar como destacadas | Muestra las propiedades seleccionadas en la seccion destacada |
| Marcar como disponibles | Cambia el estado a `available` |
| Marcar como rentadas | Cambia el estado a `rented` |

**Elementos inline**: Al editar una propiedad, se pueden gestionar:
- **Imagenes** (PropertyImage): Con orden y marca de imagen principal.
- **Videos** (PropertyVideo): Tours virtuales.
- **Amenidades** (PropertyAmenityRelation): Relacion con amenidades del catalogo.

**Metricas**: `views_count` y `favorites_count` son de solo lectura y se actualizan automaticamente.

### 2.3 Gestion de Contratos

**Ubicacion**: Admin > Contracts

#### Contract (Modelo legacy)

Modelo base requerido para el flujo biometrico. Lista los contratos con:
- Numero de contrato, tipo, estado, partes involucradas.
- Estado de firmas con indicador visual (porcentaje completado).
- Dias hasta vencimiento con codificacion de colores.

**Acciones masivas**:
- **Exportar a CSV**: Genera archivo descargable con todos los datos.
- **Marcar como activos**: Cambia contratos `fully_signed` a `active`.

#### Clausulas Editables (Sistema Control Molecular)

**Ubicacion**: Admin > Contracts > Editable Contract Clauses

Permite editar las clausulas del contrato sin modificar codigo. Cada clausula tiene:

| Campo | Descripcion |
|-------|-------------|
| `clause_number` | Numero ordinal de la clausula |
| `ordinal_text` | Texto del ordinal (PRIMERA, SEGUNDA, etc.) |
| `title` | Titulo de la clausula |
| `content` | Texto completo (con editor CKEditor si esta disponible) |
| `category` | mandatory, standard, optional, guarantee |
| `contract_types` | Tipos de contrato aplicables |
| `legal_reference` | Referencia legal (Ley 820, Codigo Civil, etc.) |
| `has_paragraph` | Si incluye paragrafo |
| `paragraph_text` | Texto del paragrafo |

**Variables dinamicas**: El contenido puede incluir variables como `{property_address}`, `{monthly_rent}`, `{tenant_name}` que se reemplazan automaticamente al generar el PDF.

**Historial de versiones**: Cada modificacion crea un `ClauseVersion` con:
- Snapshot del contenido anterior.
- Razon del cambio.
- Usuario que modifico.
- Fecha y hora.

**Plantillas por tipo de contrato** (ContractTypeTemplate):
- Asigna clausulas especificas a cada tipo de contrato.
- Define el orden de las clausulas.
- Accion "Marcar como revisadas" para registro de auditoria legal.

### 2.4 Gestion de Pagos

**Ubicacion**: Admin > Payments

El panel de pagos esta registrado pero actualmente sin configuracion personalizada de admin (usa la configuracion por defecto de Django). Los modelos disponibles incluyen:

- **Transaction**: Transacciones de pago entre usuarios.
- **PaymentMethod**: Metodos de pago registrados.
- **Invoice**: Facturas generadas.
- **EscrowAccount**: Cuentas de deposito en garantia.
- **PaymentPlan**: Planes de pago a cuotas.
- **RentPaymentSchedule**: Programacion de cobros de arriendo.

### 2.5 Gestion de Ratings

**Ubicacion**: Admin > Ratings

| Modelo | Descripcion |
|--------|-------------|
| Rating | Calificaciones entre usuarios (1-5 estrellas) |
| RatingCategory | Categorias de evaluacion (comunicacion, limpieza, etc.) |
| RatingResponse | Respuestas a calificaciones |
| RatingReport | Reportes de calificaciones inapropiadas |
| UserRatingProfile | Perfil agregado de calificaciones |
| RatingInvitation | Invitaciones para calificar |

**Acciones en RatingReport**:
- Marcar como "En Revision"
- Marcar como "Resuelto"
- Marcar como "Desestimado"

**Accion en UserRatingProfile**: "Actualizar estadisticas de calificaciones" recalcula promedios.

### 2.6 Gestion de Servicios y Suscripciones

**Ubicacion**: Admin > Services

| Modelo | Acciones Disponibles |
|--------|---------------------|
| ServiceCategory | Editar orden, destacar, activar/desactivar |
| Service | Marcar como destacado, marcar como mas solicitado |
| ServiceRequest | Marcar como contactado, en progreso, completado |
| SubscriptionPlan | Editar precio, activar/desactivar, marcar como recomendado |
| ServiceSubscription | Gestionar suscripciones activas, ver historial de facturacion |

### 2.7 Gestion de Verificacion

**Ubicacion**: Admin > Verification

| Modelo | Campos Clave |
|--------|-------------|
| VerificationAgent | Codigo de agente, especializacion, disponibilidad, visitas completadas, rating promedio |
| VerificationVisit | Numero de visita, tipo, agente asignado, estado, fecha programada, resultado |
| VerificationReport | Condicion general, identidad verificada, propiedad existe, hallazgos, aprobacion admin |

El `VerificationReport` tiene `approved_by_admin` como campo editable directamente en la lista.

---

## 3. Sistema de Tickets Internos

El sistema de tickets permite gestionar solicitudes de soporte interno con distribucion automatica por departamento.

### 3.1 Departamentos

| Departamento | Codigo | Descripcion |
|-------------|--------|-------------|
| General | `general` | Consultas generales |
| Agentes de Verificacion | `verification_agents` | Temas de verificacion presencial |
| Legal | `legal` | Contratos, arriendos, temas juridicos |
| CEO | `ceo` | Escalamiento ejecutivo |
| Marketing | `marketing` | Promocion y comunicacion |
| Tecnico | `technical` | Soporte tecnico, bugs, mantenimiento |
| Facturacion | `billing` | Pagos, facturas, cobros |

### 3.2 Auto-distribucion desde Formulario de Contacto

Cuando un usuario envia un mensaje desde el formulario de contacto publico (`POST /api/v1/core/contact/`), el sistema:

1. Guarda el `ContactMessage` en base de datos.
2. Envia notificacion por email al admin.
3. Crea automaticamente un `SupportTicket` asociado.
4. Determina el departamento por palabras clave en el asunto:

| Palabras clave | Departamento asignado |
|---------------|----------------------|
| contrato, arriendo, legal, juridic | `legal` |
| pago, factura, cobro, dinero | `billing` |
| verificacion, visita, agente | `verification_agents` |
| servicio, mantenimiento, reparacion | `technical` |
| (otros) | `general` |

### 3.3 Endpoints de API

#### Listar tickets

```
GET /api/v1/core/tickets/
```

**Staff**: Ve todos los tickets. Soporta filtros por query params:

| Parametro | Valores |
|-----------|---------|
| `department` | general, legal, billing, technical, verification_agents, ceo, marketing |
| `status` | open, in_progress, resolved, closed |
| `priority` | low, normal, high, urgent |

**Usuarios normales**: Solo ven sus propios tickets.

#### Crear ticket

```
POST /api/v1/core/tickets/
```

Body:
```json
{
  "subject": "Problema con mi contrato",
  "description": "Descripcion detallada del problema...",
  "category": "contract",
  "department": "legal",
  "priority": "high"
}
```

El campo `created_by` se asigna automaticamente al usuario autenticado.

#### Asignar ticket a miembro del staff

```
POST /api/v1/core/tickets/{id}/assign/
```

Body:
```json
{
  "assigned_to": 5
}
```

Solo staff puede ejecutar esta accion. El ticket cambia a estado `in_progress`.

#### Responder a un ticket

```
POST /api/v1/core/tickets/{id}/respond/
```

Body:
```json
{
  "message": "Texto de la respuesta...",
  "is_internal": true
}
```

- `is_internal=true`: Solo visible para staff (notas internas).
- `is_internal=false`: Visible para el usuario que creo el ticket.
- Si el staff responde un ticket `open`, cambia automaticamente a `in_progress`.

#### Resolver ticket

```
POST /api/v1/core/tickets/{id}/resolve/
```

Solo staff. Marca el ticket como `resolved` y registra `resolved_at`.

#### Cerrar ticket

```
POST /api/v1/core/tickets/{id}/close/
```

Marca el ticket como `closed` y registra `closed_at`. Puede ser ejecutado por staff o por el creador del ticket.

#### Estadisticas de tickets

```
GET /api/v1/core/tickets/stats/
```

Solo staff. Retorna:

```json
{
  "total": 150,
  "open": 23,
  "by_status": {
    "open": 15,
    "in_progress": 8,
    "resolved": 95,
    "closed": 32
  },
  "by_department": {
    "general": 45,
    "legal": 30,
    "billing": 25,
    "technical": 20,
    "verification_agents": 15,
    "ceo": 5,
    "marketing": 10
  },
  "by_priority": {
    "low": 40,
    "normal": 70,
    "high": 30,
    "urgent": 10
  }
}
```

### 3.4 Gestion desde Panel Admin

**Ubicacion**: Admin > Core > Support Tickets

El panel admin ofrece funcionalidades adicionales:

- Vista de lista con `ticket_number`, asunto, departamento, categoria, prioridad, estado, asignado y fecha.
- Edicion en linea de `status`, `priority` y `department` directamente desde la lista.
- Busqueda por numero de ticket, asunto, descripcion y email del creador.
- Filtros por departamento, categoria, prioridad, estado y fecha.
- Jerarquia de fechas para navegacion rapida.
- Respuestas inline (TicketResponseInline) para agregar respuestas directamente al editar un ticket.

---

## 4. Dashboard Administrativo

### 4.1 Vista General del Sistema

```
GET /api/v1/core/stats/overview/
```

**Permisos**: Solo `IsAdminUser`.

Retorna estadisticas globales:

```json
{
  "users": {
    "total": 500,
    "active": 480,
    "verified": 350
  },
  "properties": {
    "total": 200,
    "active": 180
  },
  "contracts": {
    "total": 150,
    "active": 90
  },
  "alerts": {
    "active": 3,
    "critical": 1
  }
}
```

### 4.2 Dashboard de Auditoria

```
GET /api/v1/core/dashboard/stats/
```

Para administradores retorna:

| Metrica | Descripcion |
|---------|-------------|
| `period_days` | Periodo de analisis (default: 7 dias) |
| `total_activities` | Total de actividades registradas |
| `unique_users` | Usuarios unicos activos |
| `failed_activities` | Actividades fallidas |
| `success_rate` | Porcentaje de exito |
| `active_alerts` | Alertas activas no resueltas |
| `security_risk_score` | Puntuacion de riesgo de seguridad |
| `recent_security_events` | Logins fallidos, IPs sospechosas, impersonaciones activas |

Parametro opcional: `?days=30` para cambiar el periodo de analisis.

### 4.3 Alertas del Sistema

```
GET /api/v1/core/alerts/
```

**Permisos**: Solo `IsAdminUser`.

Retorna alertas activas del sistema (`SystemAlert`), ordenadas por fecha de creacion descendente. Cada alerta tiene un nivel (`info`, `warning`, `error`, `critical`).

### 4.4 Reportes de Auditoria

```
POST /api/v1/core/audit/report/
```

**Permisos**: Solo `IsAdminUser`.

Body:
```json
{
  "start_date": "2026-01-01T00:00:00Z",
  "end_date": "2026-03-31T23:59:59Z",
  "sections": [
    "general_stats",
    "user_activities",
    "admin_actions",
    "security_events",
    "system_alerts",
    "performance_metrics"
  ]
}
```

Genera un reporte completo de auditoria para el periodo especificado.

### 4.5 Analisis de Seguridad

```
GET /api/v1/core/security/analysis/?hours=24
```

**Permisos**: Solo `IsAdminUser`.

Retorna analisis de eventos de seguridad para las ultimas N horas, incluyendo intentos de login fallidos, IPs sospechosas e impersonaciones activas.

### 4.6 Exportacion de Logs

```
POST /api/v1/core/audit/export/
```

**Permisos**: Solo `IsAdminUser`.

Body:
```json
{
  "start_date": "2026-03-01T00:00:00Z",
  "end_date": "2026-03-23T23:59:59Z",
  "format": "csv",
  "log_types": ["activity", "user_activity", "admin_action"]
}
```

Formatos soportados: `csv`, `json`. Descarga un archivo con los logs del periodo seleccionado.

---

## 5. Revision Juridica de Contratos (Pilar 5)

La revision juridica es un paso obligatorio antes de que un contrato pueda ser firmado biometricamente. El administrador actua como abogado revisor.

### 5.1 Flujo de Revision

```
Arrendador crea contrato
        |
        v
PENDING_ADMIN_REVIEW  <-- Notificacion automatica al admin
        |
   Admin revisa
   /          \
  v            v
DRAFT        Devuelto al arrendador con notas
(Aprobado)   (El arrendador corrige y re-envia)
  |                    |
  v                    v
Proceso          RE_PENDING_ADMIN
biometrico       (Re-revision)
```

### 5.2 SLA de 5 Dias Habiles

- Cada contrato que llega a `PENDING_ADMIN_REVIEW` tiene un campo `admin_review_deadline` establecido a 5 dias habiles.
- **24 horas antes del deadline**: La tarea Celery `check_admin_review_sla` envia un recordatorio por email al admin.
- **Despues del deadline**: El contrato se marca como `admin_review_escalated=True`, se registra un evento de escalamiento en el workflow, y se notifica al arrendador que su contrato ha sido priorizado.

### 5.3 Validacion de Conflicto de Interes

El sistema valida que el administrador que aprueba o rechaza un contrato **no sea el mismo arrendador** del contrato. Esta validacion se ejecuta en el metodo `approve_by_admin()` del modelo `LandlordControlledContract`.

### 5.4 Endpoints de Revision

#### Listar contratos pendientes de revision

```
GET /api/v1/contracts/admin/pending/
```

**Permisos**: `IsAdminUser`

Retorna:
```json
{
  "count": 3,
  "contracts": [
    {
      "id": "uuid-del-contrato",
      "contract_number": "VH-2026-0001",
      "landlord_name": "Juan Perez",
      "landlord_email": "juan@email.com",
      "property_address": "Calle 45 #23-10, Bucaramanga",
      "created_at": "2026-03-20T10:30:00Z",
      "monthly_rent": 1500000,
      "days_pending": 3
    }
  ]
}
```

#### Ver detalle de contrato para revision

```
GET /api/v1/contracts/admin/contracts/{contract_id}/
```

Retorna informacion completa: datos del arrendador, propiedad, terminos economicos, terminos del contrato, datos del inquilino, preview de clausulas y estado de revision.

#### Aprobar contrato

```
POST /api/v1/contracts/admin/contracts/{contract_id}/approve/
```

Body:
```json
{
  "notes": "Contrato revisado. Clausulas conformes con la Ley 820/2003."
}
```

- Mueve el contrato de `PENDING_ADMIN_REVIEW` a `DRAFT`.
- Envia email de notificacion al arrendador.
- Registra la accion en el historial de workflow.

#### Rechazar contrato

```
POST /api/v1/contracts/admin/contracts/{contract_id}/reject/
```

Body (obligatorio):
```json
{
  "notes": "El canon mensual excede el tope legal para vivienda de interes social. Corregir clausula de renta."
}
```

- Devuelve el contrato al arrendador con las notas de correccion.
- Envia email al arrendador detallando las correcciones requeridas.
- El arrendador corrige y re-envia, generando estado `RE_PENDING_ADMIN`.

#### Estadisticas de contratos admin

```
GET /api/v1/contracts/admin/stats/
```

Retorna conteos por estado (total, pending_review, draft, active, completed, cancelled), los 5 contratos pendientes mas recientes, y un `alert_level` (`high` si hay mas de 5 pendientes).

---

## 6. Gestion de Agentes de Verificacion

El modulo de verificacion permite gestionar agentes de campo que realizan visitas presenciales para verificar identidades, propiedades y condiciones de vivienda.

### 6.1 CRUD de Agentes

```
GET    /api/v1/verification/agents/           # Listar agentes
POST   /api/v1/verification/agents/           # Crear agente
GET    /api/v1/verification/agents/{id}/       # Detalle
PUT    /api/v1/verification/agents/{id}/       # Actualizar
DELETE /api/v1/verification/agents/{id}/       # Eliminar
```

**Permisos**: Autenticado + Staff.

Campos clave al crear un agente:

| Campo | Descripcion |
|-------|-------------|
| `user` | ID del usuario asociado al agente |
| `specialization` | Area de especializacion |
| `service_areas` | Areas geograficas de cobertura |
| `max_weekly_visits` | Maximo de visitas semanales |
| `is_available` | Si esta disponible para nuevas asignaciones |

#### Agentes disponibles

```
GET /api/v1/verification/agents/available/
```

Retorna agentes con `is_available=True` y que no han alcanzado su limite semanal de visitas.

#### Estadisticas de agentes

```
GET /api/v1/verification/agents/stats/
```

Retorna:
```json
{
  "total_agents": 10,
  "available_agents": 7,
  "visits_today": 5,
  "visits_pending_assignment": 3,
  "visits_completed_this_month": 42
}
```

### 6.2 Programacion de Visitas

```
GET    /api/v1/verification/visits/            # Listar visitas
POST   /api/v1/verification/visits/            # Crear visita
GET    /api/v1/verification/visits/{id}/        # Detalle
PUT    /api/v1/verification/visits/{id}/        # Actualizar
DELETE /api/v1/verification/visits/{id}/        # Eliminar
```

Filtros disponibles via query params:

| Parametro | Descripcion |
|-----------|-------------|
| `status` | pending, scheduled, in_progress, completed, cancelled, rescheduled |
| `type` | Tipo de visita |
| `agent` | ID del agente |

### 6.3 Flujo de una Visita

```
pending  -->  scheduled (asignacion de agente)
                |
                v
          in_progress (agente inicia la visita)
                |
                v
           completed (agente completa la visita)
```

#### Asignar agente a visita

```
POST /api/v1/verification/visits/{id}/assign_agent/
```

Body:
```json
{
  "agent_id": 5
}
```

- Solo se puede asignar a visitas en estado `pending` o `rescheduled`.
- Valida que el agente tenga capacidad disponible.
- Cambia el estado a `scheduled`.
- Envia email al agente con los detalles de la visita.

#### Iniciar visita

```
POST /api/v1/verification/visits/{id}/start/
```

Solo visitas en estado `scheduled`. Registra `started_at`.

#### Completar visita

```
POST /api/v1/verification/visits/{id}/complete/
```

Body:
```json
{
  "passed": true,
  "notes": "Propiedad en excelente estado. Documentos verificados."
}
```

- Registra `completed_at` y `verification_passed`.
- Incrementa `total_visits_completed` del agente.
- Envia email al usuario verificado con el resultado.

#### Cancelar visita

```
POST /api/v1/verification/visits/{id}/cancel/
```

Body:
```json
{
  "reason": "El usuario no se presento en la fecha acordada."
}
```

### 6.4 Reportes de Verificacion

```
GET    /api/v1/verification/reports/           # Listar reportes
POST   /api/v1/verification/reports/           # Crear reporte
GET    /api/v1/verification/reports/{id}/       # Detalle
```

Al crear un reporte con `identity_verified=True` y `overall_condition` en (excellent, good, acceptable), el sistema marca automaticamente al usuario como verificado (`is_verified=True`).

#### Aprobar reporte

```
POST /api/v1/verification/reports/{id}/approve/
```

Body:
```json
{
  "notes": "Reporte revisado y aprobado. Verificacion valida."
}
```

Marca `approved_by_admin=True` en el reporte.

---

## 7. Gestion de Codigos de Entrevista

El sistema de codigos de entrevista permite un registro controlado de usuarios. Solo las personas con un codigo valido pueden registrarse en la plataforma.

### 7.1 Panel Admin de Codigos

**Ubicacion**: Admin > Users > Interview Codes

El panel ofrece:

- **Vista de lista**: Codigo, tipo de usuario, email, estado, activo/usado, fecha de creacion.
- **Filtros**: Tipo de usuario, activo, usado, fecha de creacion, fecha de vencimiento.
- **Filtro especial de estado de entrevista**: Pendiente de entrevista, Entrevistado, Aprobado, Calificacion alta (8+), Expira pronto.
- **Busqueda**: Por codigo, email o usuario creador.

**Acciones masivas**:

| Accion | Descripcion |
|--------|-------------|
| Aprobar codigos seleccionados | Aprueba con tipo de usuario y calificacion |
| Revocar codigos seleccionados | Revoca codigos activos |
| Exportar a CSV | Descarga listado completo |
| Extender expiracion 30 dias | Amplia la validez del codigo |

### 7.2 API de Gestion de Codigos (Solo Admin)

#### CRUD de codigos

```
GET    /api/v1/users/interview/admin/codes/            # Listar todos los codigos
POST   /api/v1/users/interview/admin/codes/            # Crear codigo
GET    /api/v1/users/interview/admin/codes/{id}/        # Detalle
PUT    /api/v1/users/interview/admin/codes/{id}/        # Actualizar
DELETE /api/v1/users/interview/admin/codes/{id}/        # Eliminar
```

**Permisos**: Solo `IsAdminUser`.

#### Aprobar codigo

```
POST /api/v1/users/interview/admin/codes/{id}/approve/
```

Body:
```json
{
  "user_type": "tenant",
  "rating": 8,
  "notes": "Candidato con excelente perfil financiero."
}
```

Rating debe estar entre 1 y 10.

#### Revocar codigo

```
POST /api/v1/users/interview/admin/codes/{id}/revoke/
```

Marca el codigo como revocado e inutilizable.

### 7.3 Panel de Solicitudes de Contacto

```
GET    /api/v1/users/interview/admin/contact-requests/
POST   /api/v1/users/interview/admin/contact-requests/{id}/assign/
```

**Permisos**: Solo `IsAdminUser`.

Permite ver todas las solicitudes de contacto recibidas y asignarlas a un usuario o proceso.

### 7.4 Validacion de Codigos (Endpoint Publico)

```
POST /api/v1/users/interview/validate/
```

Body:
```json
{
  "interview_code": "VH-ABC123"
}
```

Verifica si el codigo existe, esta activo, no esta expirado y no ha alcanzado el maximo de usos.

### 7.5 Registro con Codigo

```
POST /api/v1/users/interview/register/
```

Body:
```json
{
  "interview_code": "VH-ABC123",
  "email": "nuevo.usuario@email.com",
  "password": "contrasena_segura",
  "first_name": "Carlos",
  "last_name": "Rodriguez",
  "user_type": "tenant",
  "phone_number": "3001234567"
}
```

- El email y tipo de usuario deben coincidir con los del codigo.
- El usuario se crea con `is_verified=True` (pre-verificado por entrevista).
- El codigo se marca como usado.

---

## 8. Moderacion de Calificaciones

### 8.1 Panel de Moderacion

```
GET /api/v1/ratings/moderation/
```

**Permisos**: Solo `IsAdminUser`.

Retorna:

```json
{
  "pending_ratings": [...],
  "flagged_ratings": [...],
  "pending_reports": [...],
  "suspicious_patterns": {...},
  "summary": {
    "pending_count": 5,
    "flagged_count": 2,
    "reports_count": 3
  }
}
```

- **pending_ratings**: Calificaciones con `moderation_status='pending'`.
- **flagged_ratings**: Calificaciones marcadas como `is_flagged=True`.
- **pending_reports**: Reportes de usuarios sobre calificaciones inapropiadas.
- **suspicious_patterns**: Deteccion automatica de patrones sospechosos (multiples calificaciones desde la misma IP, calificaciones reciprocas, etc.).

### 8.2 Acciones de Moderacion

```
POST /api/v1/ratings/moderation/
```

#### Aprobar calificacion

```json
{
  "action": "approve_rating",
  "rating_id": 15
}
```

Cambia `moderation_status` a `approved`, desactiva `is_flagged`, y actualiza las estadisticas del perfil del usuario calificado.

#### Rechazar calificacion

```json
{
  "action": "reject_rating",
  "rating_id": 15
}
```

Cambia `moderation_status` a `rejected` y desactiva la calificacion (`is_active=False`).

#### Resolver reporte

```json
{
  "action": "resolve_report",
  "report_id": 8,
  "reason": "La calificacion cumple con las normas de la comunidad."
}
```

Marca el reporte como `resolved`, registra el reviewer y la fecha.

### 8.3 Gestion desde Panel Admin

En el panel admin, los `RatingReport` tienen tres acciones masivas:

- Marcar como "En Revision" (`under_review`)
- Marcar como "Resuelto" (`resolved`)
- Marcar como "Desestimado" (`dismissed`)

---

## 9. Gestion de Pagos

### 9.1 Dashboard de Pagos

```
GET /api/v1/payments/dashboard/stats/
```

Retorna estadisticas de transacciones del usuario autenticado: total, monto, pendientes, completadas y fallidas.

### 9.2 Webhooks de Pasarelas de Pago

VeriHome soporta tres pasarelas de pago. Los webhooks reciben notificaciones automaticas de las pasarelas:

| Pasarela | Endpoint |
|----------|----------|
| Stripe | `POST /api/v1/payments/webhook/stripe/` |
| Wompi/PSE | `POST /api/v1/payments/webhook/wompi/` |
| PayPal | `POST /api/v1/payments/webhook/paypal/` |

Los webhooks se encargan de:
- Verificar la autenticidad de la notificacion (firma, token).
- Actualizar el estado de la transaccion.
- Reconciliar con `RentPaymentSchedule` si aplica.
- Enviar emails de confirmacion/fallo.

### 9.3 Cuentas Escrow

Las cuentas escrow retienen fondos hasta que se cumplan condiciones acordadas.

#### Fondear escrow

```
POST /api/v1/payments/escrow/{id}/fund/
```

#### Liberar fondos escrow

```
POST /api/v1/payments/escrow/{id}/release/
```

#### Resolver disputa

```
POST /api/v1/payments/escrow/{id}/resolve-dispute/
```

Body:
```json
{
  "resolution": "Descripcion de la resolucion de la disputa",
  "release_to_beneficiary": true
}
```

### 9.4 Facturacion Electronica DIAN

El sistema genera facturas electronicas compatibles con la Resolucion 000042/2020 de la DIAN, en formato UBL 2.1 XML. La facturacion se dispara automaticamente cuando se completa un pago de arriendo.

### 9.5 Portal de Pagos

| Endpoint | Descripcion |
|----------|-------------|
| `GET /api/v1/payments/tenant/portal/` | Portal de pagos del arrendatario |
| `GET /api/v1/payments/landlord/financial/dashboard/` | Dashboard financiero del arrendador |
| `POST /api/v1/payments/rent/process/` | Procesar pago de arriendo |
| `GET /api/v1/payments/receipt/{id}/` | Recibo de pago |

---

## 10. Mantenimiento del Sistema

Todos los endpoints de mantenimiento requieren `IsAdminUser`.

### 10.1 Health Check

```
GET /api/v1/core/maintenance/health/
```

Verifica el estado de todos los componentes:

| Componente | Estados Posibles |
|-----------|-----------------|
| Database | healthy (con latencia_ms), unhealthy |
| Redis | healthy (con latencia_ms), fallback |
| Storage | healthy (< 85% uso), warning (>= 85%) |
| Celery | healthy (workers activos), warning (sin workers), unavailable |

Retorna `overall: healthy` o `overall: degraded`.

### 10.2 Limpiar Logs

```
POST /api/v1/core/maintenance/clear-logs/
```

Elimina registros de `ActivityLog` con mas de 30 dias de antiguedad. Retorna el conteo de registros eliminados.

### 10.3 Limpiar Cache

```
POST /api/v1/core/maintenance/clear-cache/
```

Limpia todas las entradas de cache en los backends `default` y `local_fallback`.

### 10.4 Limpiar Sesiones Expiradas

```
POST /api/v1/core/maintenance/clear-sessions/
```

Elimina sesiones de Django cuya fecha de expiracion ya paso. Retorna el conteo de sesiones eliminadas.

### 10.5 Optimizar Base de Datos

```
POST /api/v1/core/maintenance/optimize-db/
```

- **PostgreSQL**: Ejecuta `ANALYZE` para actualizar estadisticas del planificador de consultas.
- **SQLite**: Ejecuta `PRAGMA integrity_check` para verificar la integridad de la base de datos.

### 10.6 Health Check Publico

```
GET /api/v1/core/health/
```

**Permisos**: Publico (sin autenticacion). Retorna estado basico (`status: ok`) para monitoreo externo.

---

## 11. Logs de Actividad y Auditoria

VeriHome cuenta con un sistema completo de auditoria que registra todas las acciones significativas en la plataforma.

### 11.1 Modelos de Auditoria

| Modelo | Descripcion | Registro Automatico |
|--------|-------------|-------------------|
| `ActivityLog` | Log general de actividad del sistema | Si (via middleware) |
| `UserActivityLog` | Actividades especificas de usuarios con metadatos | Si (via ActivityLoggerMiddleware) |
| `AdminActionLog` | Acciones realizadas durante impersonacion | Si (via AdminActionLoggingMiddleware) |
| `AdminImpersonationSession` | Sesiones de impersonacion con tiempos y estado | Si (via ImpersonationMiddleware) |

### 11.2 ActivityLoggerMiddleware

Este middleware registra automaticamente actividades basadas en la URL y el metodo HTTP:

| Tipo de Actividad | Trigger |
|-------------------|---------|
| `login` | POST /api/v1/auth/jwt/create/ |
| `logout` | POST a endpoint de logout |
| `profile_update` | PUT/PATCH a perfil |
| `password_change` | POST a cambio de contrasena |
| `property_create` | POST a propiedades |
| `property_update` | PUT/PATCH a propiedades |
| `property_delete` | DELETE a propiedades |
| `payment_made` | POST a pagos |
| `message_sent` | POST a mensajes |
| `rating_given` | POST a calificaciones |
| `search` | GET a listados |
| `api_access` | Cualquier otro acceso API |

Cada registro incluye: usuario, tipo de actividad, descripcion, IP, user agent, tiempo de respuesta en ms y metadatos de la peticion.

**Datos sensibles excluidos**: Los campos `password`, `password2`, `token`, `key`, `secret` nunca se registran en los metadatos.

### 11.3 AdminActionLog

Registra acciones especificas durante sesiones de impersonacion:

| Campo | Descripcion |
|-------|-------------|
| `impersonation_session` | FK a la sesion de impersonacion |
| `action_type` | Tipo de accion (payment_create, payment_update, etc.) |
| `action_description` | Descripcion legible |
| `target_object_type` | Tipo del objeto afectado |
| `target_object_id` | ID del objeto afectado |
| `old_data` | Estado anterior (JSON) |
| `new_data` | Estado nuevo (JSON) |
| `ip_address` | IP del administrador |
| `success` | Si la accion fue exitosa |
| `error_message` | Mensaje de error si aplica |

### 11.4 Limpieza de Logs

```
POST /api/v1/core/audit/cleanup/
```

Body:
```json
{
  "retention_days": 90,
  "dry_run": true
}
```

- `dry_run=true`: Simula la limpieza y reporta cuantos registros se eliminarian.
- `dry_run=false`: Ejecuta la limpieza real.

---

## 12. Notificaciones del Sistema

### 12.1 SystemAlert

Las alertas del sistema se gestionan desde el panel admin:

**Ubicacion**: Admin > Core > System Alerts

Niveles de alerta: `info`, `warning`, `error`, `critical`.

Las alertas activas (`is_active=True`) se muestran en el dashboard administrativo.

### 12.2 Notificaciones a Usuarios

```
GET  /api/v1/core/notifications/                    # Listar notificaciones del usuario
GET  /api/v1/core/notifications/unread_count/        # Conteo de no leidas
POST /api/v1/core/notifications/mark_all_read/       # Marcar todas como leidas
```

Las notificaciones se envian por multiples canales:

| Canal | Implementacion |
|-------|---------------|
| In-app | Modelo `Notification` + API REST |
| WebSocket | Consumers de notificaciones en tiempo real |
| Email | Django `send_mail` (configurable) |

### 12.3 WebSocket de Notificaciones

```
ws://localhost:8000/ws/notifications/
```

Recibe notificaciones push en tiempo real cuando hay nuevos eventos relevantes para el usuario.

### 12.4 FAQs Dinamicas

```
GET /api/v1/core/faqs/
```

**Permisos**: Publico.

Parametro opcional: `?category=general` para filtrar por categoria.

Las FAQs se gestionan desde el panel admin:

**Ubicacion**: Admin > Core > FAQs

Campos editables en lista: `order` e `is_published`.

---

## 13. Gestion de Suscripciones de Prestadores

### 13.1 Planes Disponibles

VeriHome ofrece tres planes de suscripcion para prestadores de servicios:

| Plan | Precio Mensual | Servicios Activos | Solicitudes/Mes | Destacado | Prioridad | Badge |
|------|---------------|-------------------|-----------------|-----------|-----------|-------|
| Basico | $50,000 COP | Limitado | Limitado | No | No | No |
| Profesional | $100,000 COP | Mayor | Mayor | Si | Si | Si |
| Enterprise | $150,000 COP | Ilimitado | Ilimitado | Si | Si | Si |

### 13.2 Gestion desde Panel Admin

**SubscriptionPlan** (Admin > Services > Subscription Plans):
- Editar precios directamente en la lista.
- Activar/desactivar planes.
- Marcar como recomendado.
- Configurar funcionalidades: servicios maximos, solicitudes, destacado, prioridad, badge verificado, acceso a analytics, mensajeria directa, pasarela de pagos.

**ServiceSubscription** (Admin > Services > Service Subscriptions):
- Ver suscripciones activas con fechas de inicio, fin y proxima facturacion.
- Historial de facturacion inline (SubscriptionBillingHistory).
- Gestionar auto-renovacion.
- Agregar notas administrativas.
- Ver metricas de uso: servicios publicados y solicitudes del mes.

### 13.3 API de Suscripciones

Las suscripciones se gestionan desde la API por los propios prestadores:

```
GET  /api/v1/services/subscriptions/plans/
POST /api/v1/services/subscriptions/subscribe/
POST /api/v1/services/subscriptions/cancel/
POST /api/v1/services/subscriptions/upgrade/
```

El administrador supervisa desde el panel admin y puede intervenir manualmente si es necesario.

---

## 14. Celery Tasks Automaticas

VeriHome utiliza Celery para tareas asincronas programadas. Estas tareas se configuran en Celery Beat y se ejecutan automaticamente.

### 14.1 Tareas del Modulo de Contratos

| Tarea | Frecuencia | Descripcion |
|-------|-----------|-------------|
| `check_contract_renewals` | Diaria | Revisa contratos proximos a vencer (60, 30, 15 dias) y envia alertas |
| `check_admin_review_sla` | Diaria | Monitorea SLA de revision juridica: recordatorios 24h antes, escalamiento si vence |
| `check_biometric_expiration` | Cada hora | Notifica usuarios cuya sesion biometrica expira en 2 horas |

### 14.2 Tareas del Modulo de Pagos

| Tarea | Frecuencia | Descripcion |
|-------|-----------|-------------|
| `check_payment_reminders` | Diaria | Envia recordatorios de pagos proximos, vencidos hoy y recien vencidos |
| `escalate_overdue_payments` | Semanal | Escala pagos severamente vencidos (mas de 15 dias) |
| `process_auto_rent_charges` | Diaria | Procesa cobros automaticos de arriendo para RentPaymentSchedule con auto_charge_enabled |

### 14.3 Monitoreo de Tareas

**Desde Panel Admin**: Celery Beat se integra con Django admin a traves de `django_celery_beat`:

**Ubicacion**: Admin > Periodic Tasks

Permite:
- Ver tareas programadas y su intervalo.
- Crear nuevas tareas periodicas.
- Activar/desactivar tareas.
- Ver la ultima ejecucion.

**Desde Terminal**:

```bash
# Iniciar workers
celery -A verihome worker -l info

# Iniciar beat (scheduler)
celery -A verihome beat -l info

# Inspeccionar workers activos
celery -A verihome inspect active

# Ver tareas registradas
celery -A verihome inspect registered
```

### 14.4 Reintentos y Tolerancia a Fallos

Las tareas de pagos tienen configuracion de reintentos:
- `max_retries=3`
- `default_retry_delay`: 300 segundos (check_payment_reminders) o 600 segundos (escalate y auto_charge).

---

## 15. Seguridad

### 15.1 Rate Limiting

El `RateLimitMiddleware` aplica limites de peticiones por IP y usuario:

| Tipo de Endpoint | Limite | Ventana |
|-----------------|--------|---------|
| API (`/api/`) | 1,000 peticiones | 1 hora |
| Auth (`/api/v1/auth/`) | 100 peticiones | 15 minutos |
| Admin (`/admin/`) | 1,000 peticiones | 1 hora |
| Default (otros) | 100 peticiones | 1 hora |

Headers informativos en cada respuesta:
- `X-RateLimit-Limit`: Limite total.
- `X-RateLimit-Remaining`: Peticiones restantes.
- `X-RateLimit-Reset`: Timestamp de reset.

Al exceder el limite, el servidor retorna HTTP 429 con `retry_after`.

### 15.2 Security Headers

El `SecurityHeadersMiddleware` agrega automaticamente headers de seguridad a todas las respuestas HTTP, incluyendo protecciones contra XSS, clickjacking y content-type sniffing.

### 15.3 Formulario de Contacto

Rate limiting especifico: 5 mensajes por hora por IP (`ContactRateThrottle`).

### 15.4 CORS

Configurado en `verihome/settings.py` mediante `django-cors-headers`. En produccion, debe limitarse a origenes especificos:

```python
CORS_ALLOWED_ORIGINS = [
    "https://verihome.co",
    "https://www.verihome.co",
]
```

### 15.5 CSRF

Proteccion CSRF activa para todas las vistas que no sean API REST. Las vistas API usan autenticacion JWT que no requiere CSRF.

### 15.6 Auditoria de Impersonacion

Toda sesion de impersonacion queda registrada en `AdminImpersonationSession` con:

| Campo | Descripcion |
|-------|-------------|
| `admin_user` | Superusuario que inicia la impersonacion |
| `impersonated_user` | Usuario impersonado |
| `is_active` | Si la sesion esta activa |
| `ended_at` | Fecha/hora de finalizacion |

Cada accion durante la impersonacion se registra en `AdminActionLog` con datos antes/despues del cambio.

La respuesta HTTP incluye headers:
- `X-Impersonating: true`
- `X-Impersonated-User: {user_id}`

### 15.7 Proteccion de Datos Sensibles

- Las contrasenas nunca se registran en logs de actividad.
- Los tokens y secrets se excluyen de los metadatos de auditoria.
- Los campos sensibles de matching estan protegidos.
- Cumplimiento con Ley 1581 de 2012 (Proteccion de Datos Personales).

### 15.8 Fallback de Infraestructura

El sistema esta disenado para funcionar incluso con infraestructura degradada:

| Servicio Principal | Fallback | Impacto |
|-------------------|----------|---------|
| PostgreSQL | SQLite | Solo para desarrollo local |
| Redis | Local memory cache | WebSocket y cache funcionan con limitaciones |
| Celery | Manual execution | Las tareas programadas no se ejecutan automaticamente |

Los logs del sistema informan cuando se activa un fallback:
- `"Usando cache local como fallback - Redis no disponible"`
- `"Usando InMemoryChannelLayer - Redis no disponible"`

---

## Apendice A: Tabla Resumen de Endpoints Administrativos

| Endpoint | Metodo | Descripcion |
|----------|--------|-------------|
| `/admin/` | GET | Panel de administracion Django |
| `/api/v1/core/stats/overview/` | GET | Estadisticas generales del sistema |
| `/api/v1/core/dashboard/stats/` | GET | Dashboard de auditoria |
| `/api/v1/core/alerts/` | GET | Alertas del sistema |
| `/api/v1/core/tickets/` | GET/POST | CRUD de tickets |
| `/api/v1/core/tickets/{id}/assign/` | POST | Asignar ticket |
| `/api/v1/core/tickets/{id}/respond/` | POST | Responder ticket |
| `/api/v1/core/tickets/{id}/resolve/` | POST | Resolver ticket |
| `/api/v1/core/tickets/{id}/close/` | POST | Cerrar ticket |
| `/api/v1/core/tickets/stats/` | GET | Estadisticas de tickets |
| `/api/v1/core/faqs/` | GET | FAQs dinamicas |
| `/api/v1/core/maintenance/health/` | GET | Health check completo |
| `/api/v1/core/maintenance/clear-logs/` | POST | Limpiar logs |
| `/api/v1/core/maintenance/clear-cache/` | POST | Limpiar cache |
| `/api/v1/core/maintenance/clear-sessions/` | POST | Limpiar sesiones |
| `/api/v1/core/maintenance/optimize-db/` | POST | Optimizar DB |
| `/api/v1/core/audit/report/` | POST | Generar reporte auditoria |
| `/api/v1/core/audit/export/` | POST | Exportar logs |
| `/api/v1/core/audit/cleanup/` | POST | Limpieza de logs |
| `/api/v1/core/security/analysis/` | GET | Analisis de seguridad |
| `/api/v1/contracts/admin/pending/` | GET | Contratos pendientes revision |
| `/api/v1/contracts/admin/contracts/{id}/` | GET | Detalle contrato para revision |
| `/api/v1/contracts/admin/contracts/{id}/approve/` | POST | Aprobar contrato |
| `/api/v1/contracts/admin/contracts/{id}/reject/` | POST | Rechazar contrato |
| `/api/v1/contracts/admin/stats/` | GET | Estadisticas de contratos |
| `/api/v1/verification/agents/` | GET/POST | CRUD agentes |
| `/api/v1/verification/agents/available/` | GET | Agentes disponibles |
| `/api/v1/verification/agents/stats/` | GET | Estadisticas agentes |
| `/api/v1/verification/visits/` | GET/POST | CRUD visitas |
| `/api/v1/verification/visits/{id}/assign_agent/` | POST | Asignar agente |
| `/api/v1/verification/visits/{id}/start/` | POST | Iniciar visita |
| `/api/v1/verification/visits/{id}/complete/` | POST | Completar visita |
| `/api/v1/verification/visits/{id}/cancel/` | POST | Cancelar visita |
| `/api/v1/verification/reports/` | GET/POST | CRUD reportes |
| `/api/v1/verification/reports/{id}/approve/` | POST | Aprobar reporte |
| `/api/v1/ratings/moderation/` | GET/POST | Moderacion calificaciones |
| `/api/v1/users/interview/admin/codes/` | GET/POST | CRUD codigos entrevista |
| `/api/v1/users/interview/admin/codes/{id}/approve/` | POST | Aprobar codigo |
| `/api/v1/users/interview/admin/codes/{id}/revoke/` | POST | Revocar codigo |
| `/api/v1/users/interview/admin/contact-requests/` | GET/POST | Solicitudes contacto |
| `/api/v1/payments/webhook/stripe/` | POST | Webhook Stripe |
| `/api/v1/payments/webhook/wompi/` | POST | Webhook Wompi |
| `/api/v1/payments/webhook/paypal/` | POST | Webhook PayPal |

---

## Apendice B: Modelos Registrados en Django Admin

| App | Modelos |
|-----|---------|
| Users | User, LandlordProfile, TenantProfile, ServiceProviderProfile, PortfolioItem, UserResume, InterviewCode, EmailConfirmation |
| Properties | Property, PropertyImage, PropertyVideo, PropertyAmenity, PropertyFavorite, PropertyView, PropertyInquiry |
| Contracts | Contract, ContractTemplate, ContractSignature, ContractAmendment, ContractDocument, EditableContractClause, ClauseVersion, ContractTypeTemplate, TemplateClauseAssignment |
| Core | ContactMessage, SiteConfiguration, Notification, FAQ, SupportTicket |
| Verification | VerificationAgent, VerificationVisit, VerificationReport |
| Ratings | Rating, RatingCategory, RatingResponse, RatingReport, UserRatingProfile, RatingInvitation |
| Services | ServiceCategory, Service, ServiceImage, ServiceRequest, SubscriptionPlan, ServiceSubscription |
| Celery Beat | PeriodicTask, IntervalSchedule, CrontabSchedule, SolarSchedule, ClockedSchedule |
| Celery Results | TaskResult, GroupResult |

---

*Documento generado para VeriHome v1.0 - Plataforma Inmobiliaria Empresarial*
*Marzo 2026*
