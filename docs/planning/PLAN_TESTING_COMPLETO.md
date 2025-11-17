# 🧪 PLAN DE TESTING COMPLETO - VERIHOME PLATFORM

## 📋 CHECKLIST EXHAUSTIVO DE TESTING

---

## 🔐 MÓDULO 1: USERS & AUTHENTICATION

### Backend APIs
- [ ] POST /api/v1/auth/register/ - Registro con código de invitación
- [ ] POST /api/v1/auth/login/ - Login con JWT
- [ ] POST /api/v1/auth/logout/ - Logout
- [ ] POST /api/v1/auth/token/refresh/ - Refresh token
- [ ] GET /api/v1/users/me/ - Obtener perfil actual
- [ ] PUT /api/v1/users/me/ - Actualizar perfil
- [ ] POST /api/v1/auth/password/reset/ - Reset password
- [ ] POST /api/v1/auth/verify-email/ - Verificar email

### Frontend Components
- [ ] Login.tsx - Formulario de login funciona
- [ ] RegisterWithCode.tsx - Registro con validación
- [ ] Profile.tsx - Ver y editar perfil
- [ ] ForgotPassword.tsx - Recuperación de contraseña
- [ ] EmailVerification.tsx - Verificación de email

### Funcionalidades Críticas
- [ ] JWT tokens se guardan correctamente en localStorage
- [ ] Auto-refresh de tokens funciona
- [ ] Logout limpia tokens y redirige
- [ ] Roles (landlord/tenant/service_provider) funcionan
- [ ] Navegación protegida por autenticación

---

## 🏠 MÓDULO 2: PROPERTIES

### Backend APIs
- [ ] GET /api/v1/properties/ - Listar propiedades con filtros
- [ ] POST /api/v1/properties/ - Crear propiedad
- [ ] GET /api/v1/properties/{id}/ - Detalle de propiedad
- [ ] PUT /api/v1/properties/{id}/ - Actualizar propiedad
- [ ] DELETE /api/v1/properties/{id}/ - Eliminar propiedad
- [ ] POST /api/v1/properties/{id}/images/ - Subir imágenes
- [ ] DELETE /api/v1/properties/{id}/images/{image_id}/ - Eliminar imagen
- [ ] POST /api/v1/properties/{id}/videos/ - Subir video
- [ ] GET /api/v1/properties/search/ - Búsqueda avanzada

### Frontend Components
- [ ] PropertyList.tsx - Lista con tabla/cards responsive
- [ ] PropertyForm.tsx - Crear/editar con validación
- [ ] PropertyDetail.tsx - Vista detallada
- [ ] PropertyImageUpload.tsx - Drag & drop, compresión
- [ ] PropertyFilters.tsx - Filtros avanzados
- [ ] PropertyMap.tsx - Mapbox integration

### Funcionalidades Críticas
- [ ] Subir múltiples imágenes (drag & drop)
- [ ] Compresión automática de imágenes
- [ ] Reordenar imágenes (drag & drop)
- [ ] Seleccionar imagen principal
- [ ] Filtros por precio, tipo, ubicación
- [ ] Búsqueda por texto
- [ ] Paginación funciona
- [ ] Vista de mapa con markers
- [ ] Botón "Contact Landlord" funciona

---

## 📄 MÓDULO 3: CONTRACTS

### Backend APIs
- [ ] GET /api/v1/contracts/ - Listar contratos del usuario
- [ ] POST /api/v1/contracts/ - Crear borrador de contrato
- [ ] GET /api/v1/contracts/{id}/ - Detalle de contrato
- [ ] PUT /api/v1/contracts/{id}/ - Editar contrato
- [ ] POST /api/v1/contracts/{id}/generate-pdf/ - Generar PDF
- [ ] POST /api/v1/contracts/{id}/start-authentication/ - Iniciar biométrico
- [ ] POST /api/v1/contracts/{id}/face-capture/ - Captura facial
- [ ] POST /api/v1/contracts/{id}/document-capture/ - Captura documento
- [ ] POST /api/v1/contracts/{id}/combined-capture/ - Foto combinada
- [ ] POST /api/v1/contracts/{id}/voice-capture/ - Grabación de voz
- [ ] POST /api/v1/contracts/{id}/complete-auth/ - Completar autenticación
- [ ] GET /api/v1/contracts/{id}/auth-status/ - Estado de autenticación
- [ ] GET /api/v1/contracts/{id}/preview-pdf/ - Preview PDF
- [ ] POST /api/v1/tenant/contracts/{id}/approve_contract/ - Aprobar contrato

### Frontend Components
- [ ] LandlordContractForm.tsx - Formulario multi-step
- [ ] TenantContractsDashboard.tsx - Dashboard del tenant
- [ ] BiometricAuthenticationFlow.tsx - Flujo de 5 pasos
- [ ] CameraCapture.tsx - Captura de cámara
- [ ] DocumentVerification.tsx - Verificación de documentos
- [ ] VoiceRecorder.tsx - Grabación de voz
- [ ] DigitalSignaturePad.tsx - Firma digital
- [ ] ContractPDFViewer.tsx - Visualizador de PDF

### Funcionalidades Críticas
- [ ] Crear contrato con property selector
- [ ] Generar PDF con diseño notarial
- [ ] Flujo biométrico secuencial (Tenant → Guarantor → Landlord)
- [ ] Captura facial funciona (front + side)
- [ ] Verificación de documentos colombianos (CC, CE, Pasaporte, etc.)
- [ ] Grabación de voz con transcripción simulada
- [ ] Firma digital en canvas
- [ ] Confidence scores se calculan correctamente
- [ ] Estados de contrato cambian correctamente
- [ ] PDF se puede descargar
- [ ] Notificaciones de cambio de estado

---

## 🤝 MÓDULO 4: MATCHING

### Backend APIs
- [ ] GET /api/v1/matching/requests/ - Listar solicitudes
- [ ] POST /api/v1/matching/requests/ - Crear solicitud de match
- [ ] GET /api/v1/matching/requests/{id}/ - Detalle de solicitud
- [ ] PUT /api/v1/matching/requests/{id}/accept/ - Aceptar solicitud
- [ ] PUT /api/v1/matching/requests/{id}/reject/ - Rechazar solicitud
- [ ] PUT /api/v1/matching/requests/{id}/cancel/ - Cancelar solicitud
- [ ] GET /api/v1/landlord/matched-candidates/ - Candidatos para arrendador
- [ ] POST /api/v1/landlord/schedule-visit/ - Programar visita

### Frontend Components
- [ ] MatchRequestForm.tsx - Formulario de solicitud
- [ ] MatchesDashboard.tsx - Dashboard con tabs (tenant/landlord)
- [ ] MatchedCandidatesView.tsx - Vista de candidatos para arrendador
- [ ] EnhancedTenantDocumentUpload.tsx - Subir documentos del tenant
- [ ] LandlordDocumentReview.tsx - Revisar documentos

### Funcionalidades Críticas
- [ ] Tenant puede enviar solicitud de match
- [ ] Landlord ve solicitudes pendientes
- [ ] Landlord puede aceptar/rechazar solicitudes
- [ ] Tenant puede cancelar solicitudes
- [ ] Programar visita funciona
- [ ] Subir documentos del tenant funciona
- [ ] Landlord puede revisar y aprobar documentos
- [ ] Estados de workflow se actualizan correctamente
- [ ] Tabs muestran correctamente (Pendientes/Aceptadas/Rechazadas/Canceladas)
- [ ] Contador de monthly income se muestra correctamente

---

## 💬 MÓDULO 5: MESSAGING

### Backend APIs (WebSocket)
- [ ] WS /ws/messaging/ - Conexión general de mensajes
- [ ] WS /ws/messaging/thread/{id}/ - Conexión a thread específico
- [ ] WS /ws/notifications/ - Notificaciones push
- [ ] WS /ws/user-status/ - Estado online/offline

### Backend APIs (REST)
- [ ] GET /api/v1/messages/threads/ - Listar conversaciones
- [ ] POST /api/v1/messages/threads/ - Crear conversación
- [ ] GET /api/v1/messages/threads/{id}/messages/ - Mensajes de thread
- [ ] POST /api/v1/messages/threads/{id}/messages/ - Enviar mensaje
- [ ] PUT /api/v1/messages/{id}/read/ - Marcar como leído

### Frontend Components
- [ ] MessagesMain.tsx - Interfaz principal de chat
- [ ] Conversations.tsx - Lista de conversaciones
- [ ] ThreadDetail.tsx - Detalle de conversación
- [ ] MessageComposer.tsx - Composer de mensajes

### Funcionalidades Críticas
- [ ] WebSocket se conecta correctamente
- [ ] Mensajes se envían en tiempo real
- [ ] Mensajes se reciben en tiempo real
- [ ] Notificaciones push funcionan
- [ ] Estado online/offline se actualiza
- [ ] Indicador "typing..." funciona
- [ ] Mensajes no leídos se marcan
- [ ] Búsqueda de conversaciones funciona
- [ ] Adjuntar archivos funciona

---

## 💳 MÓDULO 6: PAYMENTS

### Backend APIs - Wompi/PSE
- [ ] POST /api/v1/payments/wompi/initiate/ - Iniciar pago PSE
- [ ] GET /api/v1/payments/pse/banks/ - Lista de bancos PSE
- [ ] GET /api/v1/payments/wompi/status/{id}/ - Estado de transacción
- [ ] POST /api/v1/payments/webhooks/wompi/ - Webhook de Wompi

### Backend APIs - Stripe
- [ ] POST /api/v1/payments/process/ - Procesar pago Stripe
- [ ] GET /api/v1/payments/transactions/ - Listar transacciones
- [ ] GET /api/v1/payments/balance/ - Balance del usuario

### Frontend Components
- [ ] PSECheckout.tsx - Checkout PSE (NUEVO)
- [ ] StripePaymentForm.tsx - Formulario Stripe
- [ ] PaymentList.tsx - Lista de pagos
- [ ] PaymentDetail.tsx - Detalle de pago

### Funcionalidades Críticas
- [ ] Seleccionar banco PSE funciona
- [ ] Validación de documento colombiano funciona
- [ ] Validación de teléfono (10 dígitos) funciona
- [ ] Wizard de 3 pasos navega correctamente
- [ ] Redirección a banco funciona
- [ ] Webhook actualiza estado de transacción
- [ ] Pago Stripe funciona
- [ ] Lista de transacciones se muestra correctamente
- [ ] Balance se calcula correctamente

---

## 🏪 MÓDULO 7: SERVICES

### Backend APIs
- [ ] GET /api/v1/services/ - Listar servicios
- [ ] GET /api/v1/services/{id}/ - Detalle de servicio
- [ ] GET /api/v1/services/categories/ - Categorías de servicios
- [ ] POST /api/v1/services/service-requests/ - Solicitar servicio
- [ ] GET /api/v1/services/featured/ - Servicios destacados
- [ ] GET /api/v1/services/most-requested/ - Más solicitados

### Frontend Components
- [ ] ServicesMarketplace.tsx - Marketplace principal (NUEVO)
- [ ] ServiceCard.tsx - Card de servicio
- [ ] ServiceDetail.tsx - Detalle de servicio

### Funcionalidades Críticas
- [ ] Tabs (Todos/Destacados/Más Solicitados) funcionan
- [ ] Filtro por búsqueda funciona
- [ ] Filtro por categoría funciona
- [ ] Filtro por tipo de precio funciona
- [ ] Filtro por dificultad funciona
- [ ] Cards muestran información correcta
- [ ] Modal de detalles abre correctamente
- [ ] Formulario de solicitud funciona
- [ ] Sistema de favoritos (local) funciona
- [ ] Contador de resultados se actualiza

---

## ⭐ MÓDULO 8: RATINGS

### Backend APIs
- [ ] GET /api/v1/ratings/ - Listar calificaciones
- [ ] POST /api/v1/ratings/ - Crear calificación
- [ ] GET /api/v1/ratings/{id}/ - Detalle de calificación
- [ ] PUT /api/v1/ratings/{id}/ - Actualizar calificación
- [ ] GET /api/v1/ratings/stats/ - Estadísticas de ratings

### Frontend Components
- [ ] RatingForm.tsx - Formulario de calificación (NUEVO)
- [ ] ReviewsList.tsx - Lista de reviews (NUEVO)
- [ ] RatingStars.tsx - Componente de estrellas

### Funcionalidades Críticas
- [ ] Formulario de rating funciona
- [ ] Calificación general (obligatoria) funciona
- [ ] Calificaciones específicas por tipo funcionan
- [ ] Comentario opcional funciona
- [ ] Lista de reviews se carga
- [ ] Estadísticas de rating se muestran
- [ ] Distribución de ratings (barras) funciona
- [ ] Paginación de reviews funciona
- [ ] Badges de verificación se muestran

---

## 📊 MÓDULO 9: DASHBOARD

### Backend APIs
- [ ] GET /api/v1/dashboard/stats/ - Estadísticas generales
- [ ] GET /api/v1/dashboard/widgets/ - Datos de widgets
- [ ] GET /api/v1/dashboard/analytics/ - Analytics avanzados
- [ ] GET /api/v1/dashboard/recent-activity/ - Actividad reciente

### Frontend Components
- [ ] NewDashboard.tsx - Dashboard principal
- [ ] StatsCards.tsx - Cards de estadísticas
- [ ] ChartsSection.tsx - Sección de gráficos
- [ ] RecentActivity.tsx - Actividad reciente
- [ ] QuickActions.tsx - Acciones rápidas

### Funcionalidades Críticas
- [ ] Dashboard carga datos correctamente
- [ ] Stats cards muestran números correctos
- [ ] Gráficos renderizan correctamente
- [ ] Actividad reciente se muestra
- [ ] Quick actions funcionan (navegan correctamente)
- [ ] Dashboard es responsive (mobile)
- [ ] Widgets se actualizan en tiempo real
- [ ] Filtros de fecha funcionan

---

## 🔗 FLUJOS E2E CRÍTICOS

### Flujo 1: Registro → Login → Explorar Propiedades
- [ ] Usuario se registra con código de invitación
- [ ] Verifica email
- [ ] Hace login
- [ ] Ve dashboard inicial
- [ ] Navega a lista de propiedades
- [ ] Filtra propiedades
- [ ] Ve detalle de propiedad

### Flujo 2: Landlord crea propiedad → Tenant solicita match
- [ ] Landlord crea propiedad nueva
- [ ] Sube imágenes
- [ ] Publica propiedad
- [ ] Tenant busca propiedad
- [ ] Tenant envía solicitud de match
- [ ] Landlord recibe notificación
- [ ] Landlord acepta solicitud
- [ ] Workflow avanza a documentos

### Flujo 3: Match Request → Documentos → Contrato → Biométrico
- [ ] Tenant sube documentos
- [ ] Landlord revisa y aprueba documentos
- [ ] Landlord crea contrato
- [ ] Genera PDF
- [ ] Tenant recibe invitación
- [ ] Tenant completa flujo biométrico (5 pasos)
- [ ] Guarantor completa flujo biométrico (si aplica)
- [ ] Landlord completa flujo biométrico
- [ ] Contrato se activa

### Flujo 4: Pago PSE End-to-End
- [ ] Usuario navega a payments
- [ ] Selecciona PSE como método
- [ ] Selecciona banco
- [ ] Completa datos (documento, teléfono)
- [ ] Confirma pago
- [ ] Es redirigido a banco (simulado)
- [ ] Webhook actualiza estado
- [ ] Usuario ve confirmación

### Flujo 5: Marketplace de Servicios
- [ ] Usuario navega a services
- [ ] Filtra por categoría
- [ ] Ve detalles de servicio
- [ ] Envía solicitud de servicio
- [ ] Recibe confirmación

### Flujo 6: Chat en Tiempo Real
- [ ] Usuario A envía mensaje a Usuario B
- [ ] Usuario B recibe mensaje en tiempo real
- [ ] Usuario B responde
- [ ] Usuario A recibe respuesta en tiempo real
- [ ] Notificaciones funcionan

---

## 🐛 ERRORES CONOCIDOS A VERIFICAR

- [ ] Fix: Property selector en contract form (ya implementado)
- [ ] Fix: Monthly income display en match requests (ya implementado)
- [ ] Fix: Tab navigation en MatchesDashboard (ya implementado)
- [ ] Fix: Workflow state update en contracts (ya implementado)
- [ ] Fix: Biometric flow 404 errors (ya implementado)
- [ ] Verificar: Node_modules en git (ya ignorado)
- [ ] Verificar: GitHub Actions CI/CD failures

---

## 📱 RESPONSIVE & UX

- [ ] Todas las páginas son responsive (mobile/tablet/desktop)
- [ ] Navegación mobile funciona
- [ ] Menú hamburguesa funciona
- [ ] Touch gestures funcionan en mobile
- [ ] Modales son responsive
- [ ] Formularios son usables en mobile
- [ ] Cámara funciona en mobile
- [ ] Firma digital funciona en touch

---

## ⚡ PERFORMANCE

- [ ] Páginas cargan en < 3 segundos
- [ ] Imágenes se comprimen automáticamente
- [ ] Lazy loading funciona
- [ ] Infinite scroll funciona (si aplica)
- [ ] No hay memory leaks en WebSockets
- [ ] API response times < 500ms

---

## 🔐 SEGURIDAD

- [ ] JWT tokens expiran correctamente
- [ ] Refresh token funciona
- [ ] Endpoints protegidos requieren autenticación
- [ ] CORS configurado correctamente
- [ ] XSS protection funciona
- [ ] CSRF protection funciona
- [ ] Rate limiting funciona
- [ ] Webhook signatures se validan

---

**TOTAL ITEMS A TESTEAR: 200+**

**PRIORIDAD**:
1. 🔴 CRÍTICO: Flujos E2E principales
2. 🟠 ALTO: APIs core y componentes principales
3. 🟡 MEDIO: Funcionalidades secundarias
4. 🟢 BAJO: Edge cases y optimizaciones
