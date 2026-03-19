# Analisis Quirurgico - VeriHome

**Fecha**: 19 de marzo de 2026
**Alcance**: Revision completa de cada componente, boton, ruta, API y flujo de trabajo

---

## TABLA DE CONTENIDOS

1. [Bugs Criticos Encontrados](#1-bugs-criticos)
2. [Bugs Menores y Inconsistencias](#2-bugs-menores)
3. [Flujo Completo: Landing a Dashboard](#3-flujo-landing)
4. [Flujo Completo: Arrendador](#4-flujo-arrendador)
5. [Flujo Completo: Inquilino](#5-flujo-inquilino)
6. [Flujo Completo: Autenticacion Biometrica](#6-flujo-biometrico)
7. [Flujo Completo: Pagos](#7-flujo-pagos)
8. [Flujo Completo: Mensajeria](#8-flujo-mensajeria)
9. [Flujo Completo: Mantenimiento](#9-flujo-mantenimiento)
10. [Flujo Completo: Admin](#10-flujo-admin)
11. [Mapa Completo de Rutas](#11-mapa-rutas)
12. [Mapa Completo de Botones por Componente](#12-mapa-botones)

---

## 1. BUGS CRITICOS ENCONTRADOS

Estos requieren correccion antes de produccion:

### BUG-001: Biometrico usa datos del inquilino para el arrendador
**Archivo**: `frontend/src/pages/contracts/BiometricAuthenticationPage.tsx` linea ~311
**Problema**: `userInfo` siempre pasa `contract.tenant` (nombre, documento, fecha expedicion) independientemente de quien este autenticando. Cuando el arrendador hace su autenticacion biometrica, se le pide que recite el nombre y documento DEL INQUILINO, no el suyo.
**Impacto**: CRITICO - invalida la autenticacion biometrica del arrendador
**Solucion**: Detectar el rol del usuario actual y pasar sus propios datos

### BUG-002: markAsRead llama a markAsUnread
**Archivo**: `frontend/src/hooks/useMessages.ts` linea ~167
**Problema**: La mutacion `markAsRead` internamente llama a `messageService.markAsUnread()` en vez de `messageService.markAsRead()`
**Impacto**: CRITICO - marcar como leido hace lo contrario

### BUG-003: Fotos de mantenimiento no se envian al backend
**Archivo**: `frontend/src/components/maintenance/MaintenanceRequestForm.tsx`
**Problema**: El componente recolecta fotos via `UniversalFileUpload` y las guarda en estado `photos`, pero el payload enviado al API NUNCA incluye las fotos
**Impacto**: ALTO - funcionalidad core de mantenimiento rota

### BUG-004: Ruta de PaymentDetail no existe
**Archivo**: `frontend/src/routes/payments.tsx`
**Problema**: Solo define rutas `/`, `/new`, `/:id/edit`. No hay ruta para `/:id`. Pero `PaymentList` navega a `/app/payments/${id}` al hacer clic en "Ver Detalles" -> 404
**Impacto**: ALTO - no se puede ver detalle de un pago

### BUG-005: PSECheckout usa URL hardcodeada
**Archivo**: `frontend/src/components/payments/PSECheckout.tsx`
**Problema**: Usa `fetch('http://localhost:8000/api/v1/payments/...')` directamente en vez de la instancia `api` de axios. Rompe en produccion
**Impacto**: ALTO - pagos PSE no funcionaran en produccion

### BUG-006: Conflicto de redirect en registro
**Archivo**: `frontend/src/pages/auth/RegisterWithCode.tsx` + `AuthContext.tsx`
**Problema**: `AuthContext.handleRegistrationSuccess` navega a `/email-verification` via mutation `onSuccess`. Pero `RegisterWithCode.handleSubmit` tambien muestra un `SuccessModal` despues de `mutateAsync`. Ambos disparan - la navegacion ocurre primero, el modal puede no mostrarse
**Impacto**: MEDIO - UX confusa pero registro funciona

---

## 2. BUGS MENORES E INCONSISTENCIAS

### BUG-007: Dead links en footer
**Archivo**: `frontend/src/components/layout/LandingFooter.tsx`
- `/terms` - no tiene ruta definida -> redirect a `/`
- `/privacy` - no tiene ruta definida -> redirect a `/`
- `/security` - no tiene ruta definida -> redirect a `/`

### BUG-008: Iconos sociales sin funcionalidad
**Archivo**: `frontend/src/components/layout/LandingFooter.tsx`
- Facebook, Twitter, LinkedIn, Instagram - IconButtons sin `href` ni `onClick`

### BUG-009: Tooltip dice "pesos mexicanos"
**Archivo**: `frontend/src/components/properties/PropertyForm.tsx`
- Campo `security_deposit`: tooltip "pesos mexicanos" -> debe ser "pesos colombianos"
- Campo `maintenance_fee`: mismo error

### BUG-010: Tipo de propiedad duplicado
**Archivo**: `frontend/src/components/properties/PropertyForm.tsx`
- `room` -> "Habitacion" Y `habitacion` -> "Habitacion" (duplicado)

### BUG-011: API de favoritos inconsistente
- `propertyService.toggleFavorite()` usa `POST /properties/${id}/toggle-favorite/`
- `PropertyDetail.tsx` usa `POST/DELETE /properties/${id}/favorite/`
- Dos contratos de API diferentes para la misma funcionalidad

### BUG-012: Rating hardcodeado en PropertyDetail
**Archivo**: `frontend/src/components/properties/PropertyDetail.tsx`
- Muestra "4.5 (12 resenas)" para TODOS los arrendadores - no es dinamico

### BUG-013: Sub-ratings sin UI en RatingForm
**Archivo**: `frontend/src/components/ratings/RatingForm.tsx`
- Estados para `communication`, `serviceQuality`, `cleanliness`, `value`, `location` existen pero no se renderizan campos de input

### BUG-014: Rating API path inconsistente
- `RatingForm` posta a `/ratings/`
- `ratingService` usa `/ratings/ratings/`
- `ReviewsList` usa `/ratings/` directamente
- Posible 404 dependiendo del routing del backend

### BUG-015: Campo half_bathrooms nunca renderizado
**Archivo**: `frontend/src/components/properties/PropertyForm.tsx`
- Definido en `PropertyFormData` y valores default, pero nunca se renderiza en el formulario

### BUG-016: Mobile landing sin hamburger menu
**Archivo**: `frontend/src/components/layout/LandingNavbar.tsx`
- Los 4 botones de navegacion (Propiedades, Servicios, Nosotros, Contacto) se ocultan en mobile con `display: { xs: 'none', md: 'flex' }` pero no hay menu hamburguesa alternativo

### BUG-017: Error handling silencioso
- `PaymentForm.handleSubmit` - catch vacio
- `PaymentList.handleDelete` - catch vacio
- `PropertyDetail` delete - catch vacio

### BUG-018: Contact info no clickeable en footer
- Email y telefono son `<Typography>` plano, no `<a>` tags

### BUG-019: "Previsualizar Contrato" crea contrato como efecto secundario
**Archivo**: `frontend/src/components/contracts/LandlordContractForm.tsx`
- Si no existe contrato previo, el boton "Previsualizar Contrato" CREA un draft real en la BD antes de mostrar el PDF. El usuario podria no darse cuenta.

### BUG-020: TenantContractsDashboard usa fetch hardcodeado
**Archivo**: `frontend/src/components/contracts/TenantContractsDashboard.tsx`
- `fetch('http://localhost:8000/api/v1/contracts/tenant-processes/')` en vez de usar instancia `api`
- `fetch('http://localhost:8000/api/v1/contracts/tenant/contracts/${id}/approve_contract/')` hardcodeado

---

## 3. FLUJO LANDING -> REGISTRO -> LOGIN -> DASHBOARD

### 3.1 Landing Page (/)

**Navbar:**
| Boton | Ruta | Visible en |
|-------|------|-----------|
| "VeriHome" (logo) | `/` | Siempre |
| "Propiedades" | `/properties` | Solo desktop |
| "Servicios" | `/services` | Solo desktop |
| "Nosotros" | `/about` | Solo desktop |
| "Contacto" | `/contact` | Solo desktop |
| "Iniciar Sesion" | `/login` | Siempre |
| "Registrarse" | `/register` | Siempre |

**Hero:**
| Boton | Ruta |
|-------|------|
| "Comenzar" | `/login` |

**Features:** 3 tarjetas informativas (sin links)

### 3.2 Registro (/register)

1. Usuario ingresa codigo de entrevista (8 chars)
2. Sistema valida: `POST /api/v1/users/auth/validate-interview-code/`
3. Si valido: pre-llena email y tipo de usuario
4. Formulario con 5 secciones accordion:
   - Informacion Personal (nombre, email, telefono, contrasena, tipo usuario)
   - Ubicacion (departamento, ciudad, direccion)
   - Informacion de Verificacion (fecha nacimiento, genero, WhatsApp, estado civil)
   - Informacion Laboral (empleo, empresa, ingresos, familiares)
   - Seccion condicional segun tipo:
     - **Inquilino**: presupuesto, fecha ingreso, mascotas, historial
     - **Arrendador**: num propiedades, experiencia, tipo arrendador
     - **Proveedor**: negocio, categoria, tarifa, experiencia
5. Acepta terminos y privacidad
6. "Crear cuenta" -> `POST /users/auth/register/`
7. Redirige a `/email-verification`
8. Usuario confirma email -> puede hacer login

### 3.3 Login (/login)

1. Email + Contrasena
2. "Iniciar Sesion" -> `POST /users/auth/login/` + `GET /users/auth/me/`
3. Exito: guarda tokens en localStorage, redirige a `/app/dashboard`
4. Errores con acciones contextuales:
   - `user_not_found` -> boton "Registrarse"
   - `invalid_password` -> boton "Recuperar Contrasena"
   - `email_not_verified` -> boton "Reenviar Email"
   - `account_disabled` -> boton "Contactar Soporte"

### 3.4 Layout Autenticado (/app/*)

**Menu lateral (TODOS los roles ven los mismos 8 items):**
| Item | Icono | Ruta |
|------|-------|------|
| Panel de Control | Dashboard | `/app/dashboard` |
| Propiedades | Home | `/app/properties` |
| Contratos | Description | `/app/contracts` |
| Pagos | Payment | `/app/payments` |
| Mensajes | Message | `/app/messages` |
| Calificaciones | Star | `/app/ratings` |
| Servicios | Build | `/app/services` |
| Solicitudes | Assessment | `/app/requests` |

**Menu perfil (avatar arriba-derecha):**
| Item | Ruta | Condicion |
|------|------|-----------|
| Perfil | `/app/profile` | Todos |
| Hoja de Vida | `/app/resume` | Todos |
| Configuracion | `/app/settings` | Todos |
| Admin Legal | `/app/admin` | Solo staff/superuser |
| Cerrar Sesion | `/` (logout) | Todos |

**Navegacion inferior mobile:** Dashboard, Propiedades, Contratos, Pagos (4 items)

---

## 4. FLUJO ARRENDADOR

### 4.1 Crear Propiedad

**Ruta**: `/app/properties/new`
**Boton visible solo para**: `user_type === 'landlord'`

**Campos del formulario (orden exacto):**
1. Titulo* | Tipo de Propiedad* | Tipo de Listado* | Estado | Descripcion
2. Direccion (con mapa Mapbox) | Ciudad | Estado | Codigo Postal
3. Habitaciones | Banos | Area Total* | Area Construida | Area Terreno
4. Parqueaderos | Pisos | Numero de Piso | Ano de Construccion
5. Precio Renta* (si listing=rent) | Precio Venta* (si listing=sale)
6. Deposito | Cuota Mantenimiento | Plazo Min/Max
7. Mascotas | Fumar | Amueblada
8. Servicios Incluidos | Caracteristicas | Comodidades | Transporte
9. Disponible Desde
10. Imagenes (drag-drop, max 10, compresion automatica)
11. Videos (max 5, archivo o YouTube)

**Botones:**
- "Cancelar" -> `/app/properties`
- "Crear Propiedad" / "Actualizar Propiedad" -> submit

**Exito:** Modal con 3 botones: "Ver Propiedad", "Crear Otra", "Ver Todas"

### 4.2 Recibir y Gestionar Solicitudes de Match

**Ruta**: `/app/contracts` -> redirige a `MatchesDashboard` si hay solicitudes, o muestra `ContractList`

**Pestanas arrendador (4):**
| Pestana | Filtro |
|---------|--------|
| Pendientes | status in ['pending', 'viewed'] |
| Aceptadas | status === 'accepted' |
| Rechazadas | status === 'rejected' |
| Canceladas | status === 'cancelled' |

**Botones por solicitud pendiente:**
| Boton | API | Confirmacion |
|-------|-----|-------------|
| "Ver Detalles" | Abre modal | No |
| "Aceptar" | `POST /matching/requests/{id}/accept/` | No (inmediato) |
| "Rechazar" | `POST /matching/requests/{id}/reject/` | Si (`window.confirm`) |

### 4.3 Workflow de 5 Etapas (MatchedCandidatesView)

**Ruta**: `/app/contracts/matched-candidates`

#### Etapa 1: Visita
- Sin visita: "Programar Visita" (abre modal) + "Rechazar"
- Con visita: "Evaluar Visita" (abre modal, aprobar/rechazar) + "Rechazar Candidato"

#### Etapa 2: Documentos
- "Revisar Documentos" (abre `LandlordDocumentReview`)
- "Continuar a Creacion de Contrato" (`POST /matching/requests/{id}/advance-to-contract-stage/`)
- "Rechazar"

#### Etapa 3: Contrato
- Sin contrato: "Generar Contrato Automaticamente" (`POST /matching/match-requests/{id}/generate-contract/`) o "Crear Manualmente" (navega a `/app/contracts/new?property=X&tenant=Y&match=Z`)
- Con contrato: "Ver Contrato PDF" + "Aprobar Contrato" (`POST /contracts/landlord/contracts/{id}/approve_contract/`)

#### Etapa 4: Biometrico
- Inquilino no autenticado: "Esperando..." (deshabilitado) + "Recordar al Arrendatario"
- Inquilino autenticado: "Completar Mi Autenticacion" (navega a `/app/contracts/{id}/authenticate`)
- Ambos autenticados: "Avanzar a Entrega de Llaves!"

#### Etapa 5: Ejecucion
- "Confirmar Entrega de Llaves" -> "Iniciar Ejecucion del Contrato" -> "Ver Contrato Activo"

### 4.4 Crear Contrato (8 pasos)

**Ruta**: `/app/contracts/new`

| Paso | Titulo | Campos clave |
|------|--------|-------------|
| 0 | Informacion del Arrendador | Nombre*, Doc*, Expedicion*, Telefono*, Email*, Direccion*, Ciudad* |
| 1 | Informacion del Arrendatario | Auto-llenado desde matching. Nombre*, Doc*, Telefono*, Email*, Direccion*, Ciudad* |
| 2 | Detalles de la Propiedad | Selector de propiedad*, Direccion*, Tipo*, Area*, Template de contrato (4 opciones) |
| 3 | Condiciones Economicas | Canon Mensual*, Deposito, Duracion*, Tipo Incremento, Dia de Pago |
| 4 | Terminos del Contrato | Servicios incluidos, Politicas, Huespedes, Ocupantes, Codeudor, Mantenimiento |
| 5 | Garantias del Contrato | Sin garantia / Codeudor salario / Codeudor finca raiz (datos extensos) |
| 6 | Clausulas Especiales | Clausulas del template + adicionales |
| 7 | Revision y Creacion | Resumen + "Previsualizar Contrato" + "Crear Borrador" |

**Despues de crear:**
1. Se llama `completeLandlordData` (avanza DRAFT -> TENANT_INVITED)
2. Se envia invitacion al inquilino por email
3. Se sincroniza workflow si viene de match

---

## 5. FLUJO INQUILINO

### 5.1 Buscar y Aplicar a Propiedad

**Ruta**: `/app/properties` -> click en propiedad -> `/app/properties/{id}`

**Boton "Enviar Solicitud"** (solo inquilinos, no propietarios) abre MatchRequestForm:

| Paso | Campos |
|------|--------|
| 0 - Info Personal | Telefono, Email, Ocupantes, Fecha mudanza, Duracion arriendo |
| 1 - Situacion Financiera | Ingresos mensuales (con indicador color), Tipo empleo, 3 checkboxes |
| 2 - Preferencias | Mascotas, Fumador, Prioridad |
| 3 - Mensaje | Carta al arrendador (10-1000 chars) |

"Enviar Solicitud" -> `POST /matching/requests/`

### 5.2 Dashboard del Inquilino (TenantContractsDashboard)

**Ruta**: `/app/contracts` (detecta rol tenant automaticamente)

**Botones segun estado del contrato:**

| Estado | Botones |
|--------|---------|
| Contrato listo para revision | "Ver Contrato PDF" + "APROBAR Y CONTINUAR" + "SOLICITAR MODIFICACION" + "RECHAZAR CONTRATO" |
| Contrato aprobado | "Esperando aprobacion del arrendador" (sin accion) |
| Biometrico pendiente | "INICIAR MI AUTENTICACION BIOMETRICA" (navega a `/app/contracts/{id}/authenticate`) |
| Etapa documentos | Componente `EnhancedTenantDocumentUpload` embebido |

**Aprobar**: Dialog de confirmacion -> `POST .../approve_contract/`
**Rechazar**: Sin confirmacion (inmediato) -> `POST .../reject_contract/`
**Modificar**: Abre `ModificationRequestModal`

---

## 6. FLUJO AUTENTICACION BIOMETRICA

**Ruta**: `/app/contracts/{id}/authenticate`

### Orden obligatorio: Inquilino -> Codeudor (si aplica) -> Arrendador

### Deteccion de turno
1. `POST /contracts/{id}/start-biometric-authentication/`
2. HTTP 200 = es tu turno -> muestra flujo
3. HTTP 423 = no es tu turno -> muestra pagina de espera
4. HTTP 409 = ambas partes completaron -> mensaje de exito

### Los 4 pasos biometricos (NO 5 - combinado fue fusionado con documento)

| Paso | Titulo | Componente | Que hace |
|------|--------|-----------|----------|
| 0 | Captura Facial | EnhancedFaceCapture | Foto frontal con camara en vivo |
| 1 | Verificacion de Documento | EnhancedDocumentVerification | Tipo doc + numero + PDF + foto frente con rostro + foto reverso con rostro |
| 2 | Grabacion de Voz | EnhancedVoiceRecording | 2 grabaciones: identificacion + frase cultural anti-bot |
| 3 | Firma Digital | EnhancedDigitalSignature | Canvas de firma + checkboxes de terminos/privacidad |

### Documentos soportados (4, no 5)
- Cedula de Ciudadania (6-10 digitos)
- Cedula de Extranjeria (6-10 digitos)
- Pasaporte (6-20 alfanumericos)
- Licencia de Conducir (6-15 digitos)

### Post-completacion
- Inquilino: navega a `/app/contracts/tenant` con mensaje de espera
- Arrendador: navega a `/app/contracts` con mensaje de contrato activo
- Confianza minima requerida: >= 70%

---

## 7. FLUJO PAGOS

**Ruta**: `/app/payments`

### Metodos disponibles
1. **Stripe** (tarjetas internacionales) - `StripePaymentForm`
2. **PSE** (transferencia bancaria colombiana) - `PSECheckout` (3 pasos: banco, datos, confirmar)
3. **PayPal** - `PayPalPaymentButton`
4. **Formulario tradicional** - registro manual

### PaymentList
- Tarjetas de transacciones con: monto, descripcion, estado, tipo, fecha
- Menu: "Ver Detalles" (ROTO - ruta no existe), "Eliminar"
- "Nuevo Pago" -> `/app/payments/new`

### PaymentForm
- Switch "Procesamiento Real" para alternar entre formulario tradicional y pasarelas reales
- Tab 0: Stripe, Tab 1: PayPal, Tab 2: Formulario Tradicional

---

## 8. FLUJO MENSAJERIA

**Ruta**: `/app/messages`

### Layout split-pane (sidebar 280px + contenido principal)

**Sidebar:**
- Bandeja de entrada (con badge no leidos)
- Enviados, Destacados, Archivados
- Carpetas personalizadas
- Plantillas, Configuracion

**5 tabs principales:**
| Tab | Contenido |
|-----|-----------|
| Mensajes | Lista de mensajes por carpeta |
| Conversaciones | Chat en tiempo real (WebSocket) |
| Carpetas | Gestion de carpetas |
| Plantillas | Plantillas pre-escritas |
| Estadisticas | Metricas de mensajeria |

**"Nuevo" boton** -> `/app/messages/new`

---

## 9. FLUJO MANTENIMIENTO

**Ruta**: `/app/maintenance` (accesible desde menu Solicitudes)

### Dashboard
- 4 tarjetas: Total, Pendientes, En Progreso, Completadas
- Lista con filtro por tabs + expansion de detalles

### Crear solicitud (modal)
| Campo | Tipo | Requerido |
|-------|------|-----------|
| Propiedad | Select | Si |
| Tipo de Mantenimiento | 5 cards clickeables | Si |
| Titulo | Texto (max 200) | Si |
| Area Afectada | Select (20 opciones) | Si |
| Prioridad | Select (4 niveles) | No (default: media) |
| Descripcion | Textarea (max 2000) | Si |
| Fotos | Upload (max 10) | No (NOTA: no se envian al API) |
| Instrucciones acceso | Textarea | No |
| Duracion estimada | Numero (0.5-100 hrs) | No |
| Presencia requerida | Checkbox | No |

### Acciones en lista
- Solicitudes `pending`: boton "Cancelar Solicitud" con confirmacion

---

## 10. FLUJO ADMIN

**Ruta**: `/app/admin` (requiere is_staff o is_superuser)

### 8 paginas admin

| Pagina | Ruta | Funcion |
|--------|------|---------|
| Dashboard | `/app/admin/` | KPIs: pendientes, urgentes, aprobados hoy, rechazados hoy |
| Contratos | `/app/admin/contracts` | Lista de contratos pendientes de revision |
| Revision | `/app/admin/contracts/{id}` | Detalle con aprobar/rechazar |
| Auditoria | `/app/admin/audit` | Logs de actividad |
| Seguridad | `/app/admin/security` | Analisis de seguridad |
| Logs | `/app/admin/logs` | Visor de logs del sistema |
| Configuracion | `/app/admin/settings` | Biometria, clausulas, notificaciones |
| Mantenimiento | `/app/admin/maintenance` | Health check, limpiar cache/logs/sesiones, optimizar BD |

### Revision de contrato admin
- Informacion de propiedad, partes, clausulas
- "Aprobar Contrato" -> `AdminService.approveContract(id, payload)`
- "Rechazar / Solicitar Cambios" -> `AdminService.rejectContract(id, payload)`
- "Ver PDF del Contrato" -> abre preview-pdf en nueva pestana

---

## 11. MAPA COMPLETO DE RUTAS

### Rutas Publicas
| Ruta | Componente |
|------|-----------|
| `/` | LandingPage |
| `/login` | Login |
| `/register` | RegisterWithCode |
| `/email-verification` | EmailVerification |
| `/resend-verification` | ResendVerification |
| `/confirm-email/:key` | ConfirmEmail |
| `/forgot-password` | ForgotPassword |
| `/reset-password` | ResetPassword |
| `/properties` | PropertyList (publica) |
| `/services` | ServicesOverviewPage |
| `/about` | AboutPage |
| `/contact` | ContactPage |
| `/help` | SupportPage |
| `/blog` | CommunityPage |
| `/events` | CommunityPage |
| `/partners` | CommunityPage |
| `/careers` | CommunityPage |
| `/tenant/invitation/:token` | TenantInvitationLanding |

### Rutas Protegidas (/app/*)
| Ruta | Componente | Restriccion |
|------|-----------|-------------|
| `/app/dashboard` | NewDashboard | Todos |
| `/app/properties` | PropertyList | Todos |
| `/app/properties/new` | PropertyFormPage | Todos (boton solo landlord) |
| `/app/properties/:id` | PropertyDetail | Todos |
| `/app/properties/:id/edit` | PropertyFormPage | Todos (boton solo owner) |
| `/app/contracts` | ContractList / TenantContractsDashboard | Segun rol |
| `/app/contracts/matched-candidates` | MatchedCandidatesView | Solo landlord |
| `/app/contracts/my-processes` | TenantContractView | Solo tenant |
| `/app/contracts/new` | ContractForm | Solo landlord |
| `/app/contracts/:id` | ContractDetail | Todos |
| `/app/contracts/:id/edit` | ContractForm | Solo landlord |
| `/app/contracts/renewal` | ContractRenewalWizard | Solo landlord |
| `/app/contracts/:id/renewal` | ContractRenewalWizard | Solo landlord |
| `/app/contracts/:id/authenticate` | BiometricAuthenticationPage | Todos |
| `/app/contracts/:id/sign` | DigitalSignaturePage | Todos |
| `/app/payments` | PaymentList | Todos |
| `/app/payments/new` | PaymentForm | Todos |
| `/app/payments/:id/edit` | PaymentForm | Todos |
| `/app/messages` | MessengerMain | Todos |
| `/app/messages/new` | MessageForm | Todos |
| `/app/ratings` | RatingList | Todos |
| `/app/ratings/new` | RatingForm | Todos |
| `/app/ratings/:id` | RatingDetail | Todos |
| `/app/requests` | RequestsPage | Todos |
| `/app/services` | ServicesOverviewPage | Todos |
| `/app/service-requests` | ServiceRequestsPage | Todos |
| `/app/maintenance` | MaintenancePage | Todos |
| `/app/profile` | Profile | Todos |
| `/app/settings` | Settings | Todos |
| `/app/resume` | Resume | Todos |
| `/app/resume/edit` | ResumeEdit | Todos |

### Rutas Admin (/app/admin/*)
| Ruta | Componente |
|------|-----------|
| `/app/admin/` | AdminDashboard |
| `/app/admin/contracts` | AdminContractsList |
| `/app/admin/contracts/:contractId` | AdminContractReview |
| `/app/admin/audit` | AdminAuditDashboard |
| `/app/admin/security` | AdminSecurityPanel |
| `/app/admin/logs` | AdminLogsViewer |
| `/app/admin/settings` | AdminSettings |
| `/app/admin/maintenance` | AdminMaintenance |

### Rutas que FALTAN (dead links o navegacion rota)
| Ruta esperada | Origen | Estado |
|---------------|--------|--------|
| `/terms` | LandingFooter | NO EXISTE |
| `/privacy` | LandingFooter | NO EXISTE |
| `/security` | LandingFooter | NO EXISTE |
| `/app/payments/:id` | PaymentList "Ver Detalles" | NO EXISTE |
| `/app/maintenance` | Menu lateral (Solicitudes) | Existe pero no tiene ruta directa en sidebar |

---

## 12. RESUMEN DE PRIORIDADES DE CORRECCION

### Prioridad 1 (Bloquean funcionalidad core)
1. **BUG-001**: Biometrico pasa datos del inquilino al arrendador
2. **BUG-002**: markAsRead llama markAsUnread
3. **BUG-003**: Fotos de mantenimiento no se envian
4. **BUG-004**: Ruta PaymentDetail faltante
5. **BUG-005**: PSECheckout URL hardcodeada
6. **BUG-020**: TenantContractsDashboard fetch hardcodeado

### Prioridad 2 (UX/Produccion)
7. **BUG-006**: Conflicto redirect registro
8. **BUG-007**: Dead links footer
9. **BUG-009**: "pesos mexicanos" en tooltips
10. **BUG-010**: Tipo propiedad duplicado
11. **BUG-011**: API favoritos inconsistente
12. **BUG-016**: Mobile landing sin hamburger
13. **BUG-019**: Preview crea contrato sin avisar

### Prioridad 3 (Mejoras menores)
14. **BUG-008**: Iconos sociales sin href
15. **BUG-012**: Rating hardcodeado
16. **BUG-013**: Sub-ratings sin UI
17. **BUG-014**: Rating API path inconsistente
18. **BUG-015**: half_bathrooms sin renderizar
19. **BUG-017**: Error handling silencioso
20. **BUG-018**: Contact info no clickeable

---

*Documento generado el 19 de marzo de 2026 mediante analisis quirurgico de 6 agentes paralelos leyendo cada componente linea por linea*
