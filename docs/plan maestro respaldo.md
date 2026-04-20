 PLAN MAESTRO: Dashboard de Administración Legal VeriHome

 Autor: Claude (Asesor de Arquitectura)
 Cliente: Wilson Arguello (Abogado - Ingeniero Legal)
 Fecha: 8 de Diciembre de 2025
 Versión: 2.0 - FLUJO CIRCULAR + INMUTABILIDAD

 ---
 DECISIONES DEL USUARIO

 | Decisión          | Selección             | Implicación                                                        |
 |-------------------|-----------------------|--------------------------------------------------------------------|
 | Permisos          | Staff + Superuser     | is_staff=True OR is_superuser=True                                 |
 | Prioridad         | Revisión de Contratos | Implementar Fases 1+3 primero                                      |
 | WebSocket         | Completo              | Reutilizar websocketService.ts existente                           |
 | Flujo Revisiones  | Circular              | Abogado → DRAFT → Arrendatario → (devuelve) → Arrendador → Abogado |
 | Inmutabilidad     | Post-Biométrico       | Contrato NO editable después de autenticación biométrica           |
 | Documentos Anexos | Solo Lectura          | Consultables por partes, nunca editables                           |

 ---
 RESUMEN EJECUTIVO

 Implementación de un Dashboard de Administración Híbrido que permite al abogado/administrador revisar contratos, gestionar el flujo de aprobación,
  y mantener auditoría completa para cumplimiento legal colombiano.

 Arquitectura Propuesta:
 - Django Admin → Configuración legal profunda + Auditoría forense
 - Frontend React → Operaciones diarias + UX optimizada
 - WebSocket → Notificaciones en tiempo real (reutilizando infraestructura existente)

 ---
 ESTADO ACTUAL DEL SISTEMA

 Backend (100% Implementado)

 | Componente           | Estado     | Archivo                         |
 |----------------------|------------|---------------------------------|
 | APIs de Aprobación   | ✅ Completo | contracts/admin_approval_api.py |
 | AuditService         | ✅ Completo | core/audit_service.py           |
 | Sistema de Alertas   | ✅ Completo | core/api_views.py               |
 | Estadísticas Pagos   | ✅ Completo | payments/payment_stats_api.py   |
 | SimpleHistory        | ✅ Completo | contracts/clause_models.py      |
 | Permisos IsAdminUser | ✅ Completo | users/permissions.py            |

 Frontend (0% Implementado)

 | Componente          | Estado      | Notas                      |
 |---------------------|-------------|----------------------------|
 | AdminProtectedRoute | ❌ No existe | Verificar is_superuser     |
 | AdminLayout         | ❌ No existe | Menú especializado         |
 | AdminDashboard      | ❌ No existe | Overview del sistema       |
 | AdminContractReview | ❌ No existe | Aprobar/Rechazar contratos |
 | AdminAuditDashboard | ❌ No existe | Reportes para autoridades  |
 | adminService.ts     | ❌ No existe | Consumir APIs admin        |

 ---
 ARQUITECTURA DE IMPLEMENTACIÓN

 ┌─────────────────────────────────────────────────────────────────────────────┐
 │                    FLUJO DE GOBERNANZA VERIHOME (LINEAL ANTIGUO)            │
 └─────────────────────────────────────────────────────────────────────────────┘

 ---
 🔄 NUEVO: FLUJO CIRCULAR DE REVISIONES (REQUISITO USUARIO)

 ┌─────────────────────────────────────────────────────────────────────────────────────┐
 │                     FLUJO CIRCULAR DE REVISIÓN DE CONTRATOS                          │
 ├─────────────────────────────────────────────────────────────────────────────────────┤
 │                                                                                      │
 │  ┌──────────────┐                                                                    │
 │  │  ARRENDADOR  │                                                                    │
 │  │  Crea/Edita  │                                                                    │
 │  │  Contrato    │                                                                    │
 │  └──────┬───────┘                                                                    │
 │         │                                                                            │
 │         ▼                                                                            │
 │  ┌──────────────────┐                                                                │
 │  │ PENDING_ADMIN    │◀───────────────────────────────────────────┐                  │
 │  │ _REVIEW          │        (CICLO SE REINICIA)                 │                  │
 │  │ Estado Inicial   │                                            │                  │
 │  └──────┬───────────┘                                            │                  │
 │         │                                                        │                  │
 │         ▼                                                        │                  │
 │  ┌──────────────────┐                                            │                  │
 │  │   ABOGADO/ADMIN  │                                            │                  │
 │  │   Revisa         │                                            │                  │
 │  └──────┬───────────┘                                            │                  │
 │         │                                                        │                  │
 │    ┌────┴────┐                                                   │                  │
 │    ▼         ▼                                                   │                  │
 │ ┌──────┐ ┌────────┐                                              │                  │
 │ │APRUEBA│ │RECHAZA │                                              │                  │
 │ └──┬───┘ └───┬────┘                                              │                  │
 │    │         │                                                   │                  │
 │    │         └─────▶ Vuelve a ARRENDADOR con notas ──────────────┘                  │
 │    │                                                                                │
 │    ▼                                                                                │
 │  ┌──────────────────┐                                                               │
 │  │     DRAFT        │◀──────────────────────────────────────────┐                   │
 │  │ Borrador listo   │          (CICLO DE OBJECIONES)           │                   │
 │  └──────┬───────────┘                                          │                   │
 │         │                                                       │                   │
 │         ▼                                                       │                   │
 │  ┌──────────────────┐                                          │                   │
 │  │  ARRENDATARIO    │                                          │                   │
 │  │  Revisa borrador │                                          │                   │
 │  └──────┬───────────┘                                          │                   │
 │         │                                                       │                   │
 │    ┌────┴────┐                                                  │                   │
 │    ▼         ▼                                                  │                   │
 │ ┌──────┐ ┌────────┐                                             │                   │
 │ │APRUEBA│ │DEVUELVE│                                             │                   │
 │ └──┬───┘ └───┬────┘                                             │                   │
 │    │         │                                                  │                   │
 │    │         └─────▶ Vuelve a ARRENDADOR ─────▶ PENDING_ADMIN ──┘                   │
 │    │                 (arrendador modifica)      (abogado re-revisa)                 │
 │    │                                                                                │
 │    ▼                                                                                │
 │  ┌──────────────────┐                                                               │
 │  │ AUTENTICACIÓN    │                                                               │
 │  │ BIOMÉTRICA       │ Tenant → Codeudor → Landlord                                  │
 │  │ (5 PASOS)        │ ⚠️ PUNTO DE NO RETORNO                                        │
 │  └──────┬───────────┘                                                               │
 │         │                                                                           │
 │         ▼                                                                           │
 │  ┌──────────────────────────────────────────────────────────────────────────────┐   │
 │  │                        🔒 CONTRATO INMUTABLE 🔒                               │   │
 │  │                                                                              │   │
 │  │  Estado: PUBLISHED → ACTIVE                                                  │   │
 │  │  - PDF final generado y almacenado                                          │   │
 │  │  - Documentos anexos bloqueados                                             │   │
 │  │  - NO SE PUEDE EDITAR                                                       │   │
 │  │  - Consultable por ambas partes                                             │   │
 │  │                                                                              │   │
 │  │  🗄️ UBICACIÓN: /media/landlord_contracts/pdfs/published/                   │
 │  │                                                                              │   │
 │  └──────────────────────────────────────────────────────────────────────────────┘   │
 │                                                                                      │
 │  ┌───────────────────────────────────────────────────────────────────────────────┐  │
 │  │                           AUDIT TRAIL COMPLETO                                │  │
 │  │  ────────────────────────────────────────────────────────────────────────     │  │
 │  │  • Cada transición de estado → timestamp + user_id + ip_address               │  │
 │  │  • Cada aprobación/rechazo → notas + hash de integridad                       │  │
 │  │  • Documentos subidos → checksum SHA-256                                      │  │
 │  │  • Ciclos de revisión contados y numerados                                    │  │
 │  │  • workflow_history JSON inmutable                                            │  │
 │  └───────────────────────────────────────────────────────────────────────────────┘  │
 │                                                                                      │
 └─────────────────────────────────────────────────────────────────────────────────────┘

 ---
 📦 SISTEMA DE INMUTABILIDAD Y ARCHIVO

 Estados del Ciclo de Vida Legal

 | Estado                  | Fase                  | Editable     | Quién Puede Modificar                 |
 |-------------------------|-----------------------|--------------|---------------------------------------|
 | PENDING_ADMIN_REVIEW    | Pre-Borrador          | ✅ Sí         | Arrendador (con notas admin)          |
 | DRAFT                   | Borrador Aprobado     | ✅ Sí         | Arrendador (si arrendatario devuelve) |
 | TENANT_REVIEWING        | Revisión Inquilino    | ⚠️ Parcial   | Arrendatario puede objetar            |
 | TENANT_AUTHENTICATION   | Biométrico Inquilino  | ❌ No         | Sistema biométrico                    |
 | LANDLORD_AUTHENTICATION | Biométrico Arrendador | ❌ No         | Sistema biométrico                    |
 | PUBLISHED               | Nace Vida Jurídica    | 🔒 INMUTABLE | Nadie                                 |
 | ACTIVE                  | En Ejecución          | 🔒 INMUTABLE | Nadie                                 |
 | EXPIRED                 | Vencido               | 🔒 Archivo   | Solo lectura                          |
 | TERMINATED              | Terminado             | 🔒 Archivo   | Solo lectura                          |

 Punto de No Retorno

 # El contrato se vuelve INMUTABLE después de:
 if biometric_authentication.status == 'completed':
     contract.is_locked = True
     contract.locked_at = timezone.now()
     contract.locked_reason = 'biometric_authentication_complete'

 Almacenamiento de Contratos por Estado

 /media/
 ├── landlord_contracts/
 │   ├── drafts/                    # Borradores (eliminables)
 │   │   └── {contract_id}/
 │   │       ├── draft_v1.pdf
 │   │       └── draft_v2.pdf       # Versiones de borrador
 │   │
 │   ├── published/                 # 🔒 NACIDOS A VIDA JURÍDICA
 │   │   └── {year}/
 │   │       └── {month}/
 │   │           └── VH-2025-000001.pdf
 │   │
 │   ├── active/                    # 🔒 EN EJECUCIÓN
 │   │   └── {contract_id}.pdf      # Symlink a published
 │   │
 │   └── archive/                   # 🔒 ARCHIVO HISTÓRICO
 │       └── {year}/
 │           ├── expired/
 │           └── terminated/
 │
 ├── tenant_documents/              # Documentos del arrendatario
 │   └── {year}/{month}/
 │       └── {document_id}.pdf      # 🔒 INMUTABLES post-aprobación
 │
 └── biometric/                     # Datos biométricos
     ├── faces/                     # 🔒 NUNCA editables
     ├── documents/                 # 🔒 NUNCA editables
     └── voice/                     # 🔒 NUNCA editables

 ---
 📄 DOCUMENTOS ANEXOS (Solo Lectura)

 Modelo de Control de Acceso

 class TenantDocument(models.Model):
     # Estados de documento
     STATUS_CHOICES = [
         ('pending', 'Pendiente Revisión'),      # Editable por inquilino
         ('approved', 'Aprobado'),               # 🔒 INMUTABLE
         ('rejected', 'Rechazado'),              # Inquilino puede re-subir
         ('requires_correction', 'Requiere Corrección'),  # Inquilino puede re-subir
     ]

     # Control de inmutabilidad
     is_locked = models.BooleanField(default=False)
     locked_at = models.DateTimeField(null=True)
     locked_by = models.ForeignKey(User, null=True)

     def save(self, *args, **kwargs):
         if self.is_locked:
             raise PermissionError("Documento bloqueado - no se puede modificar")
         super().save(*args, **kwargs)

 Permisos de Consulta (Nuevo Endpoint Seguro)

 # NUEVO ENDPOINT: Descarga segura de documentos
 # /api/v1/documents/{id}/secure-download/

 class SecureDocumentDownloadView(APIView):
     permission_classes = [IsAuthenticated]

     def get(self, request, document_id):
         document = get_object_or_404(TenantDocument, id=document_id)

         # Verificar que el usuario puede ver este documento
         if not self._can_access(request.user, document):
             return Response({'error': 'Acceso denegado'}, status=403)

         # Registrar acceso para auditoría
         DocumentAccessLog.objects.create(
             document=document,
             user=request.user,
             action='download',
             ip_address=request.META.get('REMOTE_ADDR'),
             timestamp=timezone.now()
         )

         # Servir archivo de forma segura
         return FileResponse(document.file, as_attachment=True)

     def _can_access(self, user, document):
         # Arrendatario que subió el documento
         if document.uploaded_by == user:
             return True
         # Arrendador de la propiedad relacionada
         if document.match_request.property.landlord == user:
             return True
         # Admin/Staff
         if user.is_staff or user.is_superuser:
             return True
         return False

 ---
 FASES DE IMPLEMENTACIÓN MOLECULAR

 ⚠️ FASE 0: Backend - Flujo Circular e Inmutabilidad (PRERREQUISITO)

 Objetivo: Implementar el ciclo de revisiones y sistema de bloqueo en backend

 0.1 Nuevos Estados de Workflow

 Archivo: contracts/landlord_contract_models.py
 - Agregar estados para ciclo de devolución:
   - TENANT_RETURNED → Arrendatario devuelve para corrección
   - LANDLORD_CORRECTING → Arrendador corrigiendo
   - RE_PENDING_ADMIN → Re-enviado a revisión admin
 - Agregar campo review_cycle_count para tracking

 0.2 Sistema de Inmutabilidad

 Archivo: contracts/landlord_contract_models.py
 - Agregar campos de bloqueo:
 is_locked = models.BooleanField(default=False)
 locked_at = models.DateTimeField(null=True)
 locked_by = models.ForeignKey(User, null=True)
 locked_reason = models.CharField(max_length=100)
 - Sobrescribir save() para prevenir edición si is_locked=True

 0.3 Endpoint de Devolución (Arrendatario → Arrendador)

 Archivo: contracts/tenant_api_views.py
 # POST /api/v1/tenant/contracts/{id}/return_to_landlord/
 def return_to_landlord(request, contract_id):
     contract = get_object_or_404(LandlordControlledContract, id=contract_id)

     # Solo permitido en estado TENANT_REVIEWING
     if contract.current_state != 'TENANT_REVIEWING':
         return Response({'error': 'Solo puede devolver en estado de revisión'}, status=400)

     # Cambiar estado
     contract.current_state = 'TENANT_RETURNED'
     contract.tenant_return_notes = request.data.get('notes')
     contract.save()

     # Log de auditoría
     contract.add_workflow_entry('TENANT_RETURN', request.user, {
         'notes': request.data.get('notes'),
         'cycle': contract.review_cycle_count
     })

     return Response({'status': 'Devuelto al arrendador'})

 0.4 Endpoint de Re-envío a Admin (Arrendador corrige → Admin)

 Archivo: contracts/landlord_api_views.py
 # POST /api/v1/landlord/contracts/{id}/resubmit_for_review/
 def resubmit_for_review(request, contract_id):
     contract = get_object_or_404(LandlordControlledContract, id=contract_id)

     # Solo permitido en estado LANDLORD_CORRECTING
     if contract.current_state != 'LANDLORD_CORRECTING':
         return Response({'error': 'Solo puede re-enviar en estado de corrección'}, status=400)

     # Incrementar ciclo
     contract.review_cycle_count += 1
     contract.current_state = 'RE_PENDING_ADMIN'
     contract.save()

     # Log de auditoría
     contract.add_workflow_entry('RESUBMIT_FOR_REVIEW', request.user, {
         'cycle': contract.review_cycle_count
     })

     return Response({'status': f'Re-enviado para revisión (ciclo {contract.review_cycle_count})'})

 0.5 Bloqueo Post-Biométrico

 Archivo: contracts/biometric_service.py
 - En complete_authentication():
 def complete_authentication(contract, user):
     # ... lógica existente ...

     # Si todos han completado biométrico
     if contract.all_parties_authenticated():
         contract.is_locked = True
         contract.locked_at = timezone.now()
         contract.locked_by = user
         contract.locked_reason = 'biometric_complete'
         contract.current_state = 'PUBLISHED'
         contract.save()

         # Bloquear todos los documentos anexos
         TenantDocument.objects.filter(
             match_request=contract.match_request
         ).update(is_locked=True, locked_at=timezone.now())

 0.6 Endpoint de Descarga Segura de Documentos

 Archivo: requests/document_api_views.py (NUEVO ENDPOINT)
 - GET /api/v1/documents/{id}/secure-download/
 - Verificar permisos (arrendatario propietario o arrendador de la propiedad)
 - Registrar acceso en auditoría
 - Servir archivo con FileResponse

 0.7 Migración de Base de Datos

 Archivo: contracts/migrations/0020_circular_workflow.py
 - Agregar campos: is_locked, locked_at, locked_by, locked_reason
 - Agregar campo: review_cycle_count
 - Agregar estados nuevos al choice field

 Archivos a modificar:
 - contracts/landlord_contract_models.py (estados + campos de bloqueo)
 - contracts/tenant_api_views.py (endpoint de devolución)
 - contracts/landlord_api_views.py (endpoint de re-envío)
 - contracts/biometric_service.py (bloqueo post-autenticación)
 - requests/document_api_views.py (descarga segura)
 - requests/models.py (campos is_locked en TenantDocument)

 ---
 FASE 1: Infraestructura Base (Fundamentos)

 Objetivo: Establecer la estructura de archivos y routing para admin

 1.1 Crear Servicio Admin Frontend

 Archivo: frontend/src/services/adminService.ts
 - Consumir endpoints /api/v1/contracts/admin/*
 - Consumir endpoints /api/v1/core/* para auditoría
 - Implementar interceptores con token admin
 - Auditoría: Log de cada llamada API

 1.2 Crear Hook de Autenticación Admin

 Archivo: frontend/src/hooks/useAdminAuth.ts
 - Verificar user.is_superuser === true
 - Redirigir si no es admin
 - Proveer estado de permisos admin

 1.3 Crear Ruta Protegida Admin

 Archivo: frontend/src/components/auth/AdminProtectedRoute.tsx
 - Wrapper de ProtectedRoute existente
 - Verificación adicional de is_superuser
 - Mensaje de acceso denegado elegante

 1.4 Registrar Rutas Admin

 Archivo: frontend/src/routes/admin.tsx (NUEVO)
 Modificar: frontend/src/routes/index.tsx
 - Ruta base: /app/admin/*
 - Sub-rutas: dashboard, contracts, audit, settings

 Archivos a crear/modificar:
 - frontend/src/services/adminService.ts (NUEVO)
 - frontend/src/hooks/useAdminAuth.ts (NUEVO)
 - frontend/src/components/auth/AdminProtectedRoute.tsx (NUEVO)
 - frontend/src/routes/admin.tsx (NUEVO)
 - frontend/src/routes/index.tsx (MODIFICAR)
 - frontend/src/types/admin.ts (NUEVO)

 ---
 FASE 2: Dashboard Principal Admin

 Objetivo: Vista general del sistema con métricas clave

 2.1 Layout Admin Especializado

 Archivo: frontend/src/components/admin/AdminLayout.tsx
 - Menú lateral con items admin
 - Header con badge de pendientes
 - Notificación de contratos urgentes

 2.2 Dashboard Overview

 Archivo: frontend/src/pages/admin/AdminDashboard.tsx
 - Cards de estadísticas:
   - Contratos pendientes (con alerta si > 5)
   - Contratos aprobados hoy
   - Contratos rechazados hoy
   - Risk score de seguridad
 - Lista rápida de contratos pendientes
 - Alertas activas del sistema

 Archivos a crear:
 - frontend/src/components/admin/AdminLayout.tsx
 - frontend/src/pages/admin/AdminDashboard.tsx
 - frontend/src/components/admin/AdminStatsCard.tsx
 - frontend/src/components/admin/PendingContractsWidget.tsx
 - frontend/src/components/admin/SecurityAlertWidget.tsx

 ---
 FASE 3: Sistema de Revisión de Contratos

 Objetivo: Aprobar/Rechazar contratos con workflow completo

 3.1 Lista de Contratos Pendientes

 Archivo: frontend/src/pages/admin/AdminContractsList.tsx
 - Tabla con filtros (días pendientes, arrendador, propiedad)
 - Indicador visual de urgencia (> 3 días = amarillo, > 7 días = rojo)
 - Acciones rápidas en línea

 3.2 Detalle de Contrato para Revisión

 Archivo: frontend/src/pages/admin/AdminContractReview.tsx
 - Vista completa del contrato
 - Preview de cláusulas que se aplicarán
 - Datos del arrendador y propiedad
 - Historial de revisiones previas (si rechazado antes)
 - Botones: Aprobar / Rechazar / Solicitar Cambios

 3.3 Modal de Aprobación/Rechazo

 Archivo: frontend/src/components/admin/ContractApprovalModal.tsx
 - Campo de notas (obligatorio en rechazo)
 - Confirmación con resumen de acción
 - Preview de email que se enviará al arrendador
 - Auditoría: Log completo de la decisión

 Archivos a crear:
 - frontend/src/pages/admin/AdminContractsList.tsx
 - frontend/src/pages/admin/AdminContractReview.tsx
 - frontend/src/components/admin/ContractApprovalModal.tsx
 - frontend/src/components/admin/ContractRejectionModal.tsx
 - frontend/src/components/admin/ClausesPreviewCard.tsx

 ---
 FASE 4: Sistema de Auditoría y Reportes

 Objetivo: Generar reportes para autoridades y compliance

 4.1 Dashboard de Auditoría

 Archivo: frontend/src/pages/admin/AdminAuditDashboard.tsx
 - Selector de rango de fechas
 - Checkboxes de secciones a incluir
 - Botón generar reporte
 - Preview del reporte antes de exportar

 4.2 Visualizador de Logs

 Archivo: frontend/src/pages/admin/AdminLogsViewer.tsx
 - Tabla de actividades con filtros
 - Filtrar por: usuario, acción, fecha, éxito/error
 - Detalles expandibles por fila
 - Exportar a CSV/JSON

 4.3 Panel de Seguridad

 Archivo: frontend/src/pages/admin/AdminSecurityPanel.tsx
 - Risk score visual (gauge chart)
 - Top 10 IPs sospechosas
 - Logins fallidos recientes
 - Alertas de seguridad activas

 Archivos a crear:
 - frontend/src/pages/admin/AdminAuditDashboard.tsx
 - frontend/src/pages/admin/AdminLogsViewer.tsx
 - frontend/src/pages/admin/AdminSecurityPanel.tsx
 - frontend/src/components/admin/AuditReportGenerator.tsx
 - frontend/src/components/admin/SecurityGauge.tsx
 - frontend/src/components/admin/ActivityLogTable.tsx

 ---
 FASE 5: Notificaciones en Tiempo Real

 Objetivo: Alertas instantáneas para el admin

 5.1 Integración WebSocket Admin

 Archivo: frontend/src/hooks/useAdminNotifications.ts
 - Suscripción a canal admin
 - Notificación cuando llega nuevo contrato
 - Alerta de seguridad en tiempo real

 5.2 Badge de Notificaciones Admin

 Archivo: frontend/src/components/admin/AdminNotificationBell.tsx
 - Contador de pendientes
 - Dropdown con lista rápida
 - Sonido opcional para urgentes

 Archivos a crear:
 - frontend/src/hooks/useAdminNotifications.ts
 - frontend/src/components/admin/AdminNotificationBell.tsx
 - frontend/src/components/admin/AdminNotificationDrawer.tsx

 ---
 FASE 6: Configuración y Mantenimiento

 Objetivo: Gestión del sistema

 6.1 Panel de Configuración Admin

 Archivo: frontend/src/pages/admin/AdminSettings.tsx
 - Configurar días de retención de logs
 - Umbrales de alertas de seguridad
 - Preferencias de notificación

 6.2 Limpieza de Logs

 Archivo: frontend/src/pages/admin/AdminMaintenance.tsx
 - Dry-run antes de eliminar
 - Confirmación con estadísticas
 - Historial de limpiezas realizadas

 Archivos a crear:
 - frontend/src/pages/admin/AdminSettings.tsx
 - frontend/src/pages/admin/AdminMaintenance.tsx

 ---
 ESTRUCTURA FINAL DE ARCHIVOS

 frontend/src/
 ├── components/
 │   ├── admin/                          # NUEVO DIRECTORIO
 │   │   ├── AdminLayout.tsx
 │   │   ├── AdminStatsCard.tsx
 │   │   ├── AdminNotificationBell.tsx
 │   │   ├── AdminNotificationDrawer.tsx
 │   │   ├── PendingContractsWidget.tsx
 │   │   ├── SecurityAlertWidget.tsx
 │   │   ├── SecurityGauge.tsx
 │   │   ├── ContractApprovalModal.tsx
 │   │   ├── ContractRejectionModal.tsx
 │   │   ├── ClausesPreviewCard.tsx
 │   │   ├── AuditReportGenerator.tsx
 │   │   └── ActivityLogTable.tsx
 │   └── auth/
 │       └── AdminProtectedRoute.tsx     # NUEVO
 ├── hooks/
 │   ├── useAdminAuth.ts                 # NUEVO
 │   └── useAdminNotifications.ts        # NUEVO
 ├── pages/
 │   └── admin/                          # NUEVO DIRECTORIO
 │       ├── AdminDashboard.tsx
 │       ├── AdminContractsList.tsx
 │       ├── AdminContractReview.tsx
 │       ├── AdminAuditDashboard.tsx
 │       ├── AdminLogsViewer.tsx
 │       ├── AdminSecurityPanel.tsx
 │       ├── AdminSettings.tsx
 │       └── AdminMaintenance.tsx
 ├── routes/
 │   └── admin.tsx                       # NUEVO
 ├── services/
 │   └── adminService.ts                 # NUEVO
 └── types/
     └── admin.ts                        # NUEVO

 ---
 ENDPOINTS A CONSUMIR (Ya implementados en Backend)

 Contratos Admin

 | Método | Endpoint                                        | Descripción                |
 |--------|-------------------------------------------------|----------------------------|
 | GET    | /api/v1/contracts/admin/pending/                | Lista contratos pendientes |
 | GET    | /api/v1/contracts/admin/stats/                  | Estadísticas de contratos  |
 | GET    | /api/v1/contracts/admin/contracts/{id}/         | Detalle para revisión      |
 | POST   | /api/v1/contracts/admin/contracts/{id}/approve/ | Aprobar contrato           |
 | POST   | /api/v1/contracts/admin/contracts/{id}/reject/  | Rechazar contrato          |

 Auditoría y Seguridad

 | Método | Endpoint                        | Descripción           |
 |--------|---------------------------------|-----------------------|
 | GET    | /api/v1/core/stats/overview/    | Overview del sistema  |
 | POST   | /api/v1/core/audit/report/      | Generar reporte       |
 | GET    | /api/v1/core/security/analysis/ | Análisis de seguridad |
 | POST   | /api/v1/core/logs/cleanup/      | Limpiar logs          |
 | POST   | /api/v1/core/logs/export/       | Exportar logs         |

 ---
 CRITERIOS DE AUDITORÍA POR ACCIÓN

 | Acción                   | Datos a Registrar                                            |
 |--------------------------|--------------------------------------------------------------|
 | Acceso a dashboard admin | user_id, timestamp, ip_address                               |
 | Ver contrato pendiente   | user_id, contract_id, timestamp                              |
 | Aprobar contrato         | user_id, contract_id, notes, timestamp, ip_address           |
 | Rechazar contrato        | user_id, contract_id, rejection_notes, timestamp, ip_address |
 | Generar reporte          | user_id, date_range, sections, timestamp                     |
 | Exportar logs            | user_id, format, date_range, timestamp                       |
 | Limpiar logs             | user_id, retention_days, records_deleted, timestamp          |

 ---
 PATRONES UI A SEGUIR (Consistencia)

 1. Loading States: <LoadingSpinner message="..." />
 2. Empty States: Avatar 80x80 + Typography h6 + body2
 3. Error States: <Alert severity="error" />
 4. Modales: Dialog maxWidth="sm" fullWidth
 5. Notificaciones: Snackbar top-right con CustomNotification
 6. Tablas: TableContainer + hover effect
 7. Estadísticas: Card con Avatar icon + Typography
 8. Espaciado: mb: 3 entre secciones, spacing={3} en grids

 ---
 MÉTRICAS DE ÉXITO

 | Métrica                    | Objetivo                       |
 |----------------------------|--------------------------------|
 | Tiempo de aprobación       | < 2 clicks desde dashboard     |
 | Cobertura de auditoría     | 100% de acciones admin         |
 | Disponibilidad de reportes | < 5 segundos para generar      |
 | Notificaciones             | < 1 segundo latencia WebSocket |
 | Compliance                 | Exportable para autoridades    |

 ---
 RIESGOS Y MITIGACIONES

 | Riesgo                 | Mitigación                                 |
 |------------------------|--------------------------------------------|
 | Acceso no autorizado   | AdminProtectedRoute + verificación backend |
 | Pérdida de audit trail | Doble registro (frontend + backend)        |
 | UI inconsistente       | Seguir patrones documentados               |
 | Sobrecarga de logs     | Limpieza automática configurable           |

 ---
 ORDEN DE IMPLEMENTACIÓN RECOMENDADO

 Prioridad Alta (Requisitos Usuario)

 0. Fase 0 - Backend: Flujo Circular + Inmutabilidad (1-2 sesiones) PRERREQUISITO
 1. Fase 1 - Infraestructura Base Frontend (1 sesión)
 2. Fase 3 - Sistema de Revisión Admin (2 sesiones) PRIORIDAD USUARIO

 Prioridad Media

 2. Fase 2 - Dashboard Principal Admin (1 sesión)
 3. Fase 4 - Auditoría y Reportes (1-2 sesiones)

 Prioridad Baja

 5. Fase 5 - Notificaciones Real-time (1 sesión)
 6. Fase 6 - Configuración (1 sesión)

 Total estimado: 8-11 sesiones de desarrollo

 ---
 🗂️ UBICACIÓN FINAL DE CONTRATO

 Contratos "Nacidos a la Vida Jurídica"

 | Categoría            | Ubicación                                                | Acceso                                          |
 |----------------------|----------------------------------------------------------|-------------------------------------------------|
 | PDF Publicado        | /media/landlord_contracts/pdfs/published/{year}/{month}/ | Arrendador + Arrendatario + Admin               |
 | PDF Activo           | Symlink a published                                      | Ambas partes                                    |
 | Documentos Inquilino | /media/tenant_documents/{year}/{month}/                  | Arrendatario (propietario) + Arrendador + Admin |
 | Datos Biométricos    | /media/biometric/                                        | Solo Admin (auditoría)                          |
 | Archivo Histórico    | /media/landlord_contracts/archive/{year}/                | Admin + Autoridades                             |

 Frontend: Donde se Muestran

 | Vista                  | Archivo                        | Filtro de Estados                         |
 |------------------------|--------------------------------|-------------------------------------------|
 | Contratos Activos      | ActiveContractsView.tsx        | PUBLISHED, ACTIVE                         |
 | Lista General          | ContractList.tsx               | fully_signed, active, expired, terminated |
 | Dashboard Arrendador   | LandlordContractsDashboard.tsx | Todos los estados                         |
 | Dashboard Arrendatario | TenantContractsDashboard.tsx   | Estados visibles para tenant              |
 | Dashboard Admin        | AdminContractsList.tsx (NUEVO) | PENDING_ADMIN_REVIEW, RE_PENDING_ADMIN    |

 ---
 PRÓXIMO PASO INMEDIATO

 Fase 0.1: Modificar landlord_contract_models.py

 Agregar los nuevos estados de workflow y campos de bloqueo. Esta es la base de todo el sistema de flujo circular e inmutabilidad.

 # Nuevos estados a agregar:
 ('TENANT_RETURNED', 'Devuelto por Arrendatario'),
 ('LANDLORD_CORRECTING', 'Arrendador Corrigiendo'),
 ('RE_PENDING_ADMIN', 'Re-enviado a Revisión Admin'),

 # Nuevos campos:
 is_locked = models.BooleanField(default=False)
 locked_at = models.DateTimeField(null=True, blank=True)
 locked_by = models.ForeignKey(User, null=True, blank=True)
 locked_reason = models.CharField(max_length=100, blank=True)
 review_cycle_count = models.PositiveIntegerField(default=1)
 tenant_return_notes = models.TextField(blank=True)

 ---
 RESUMEN DE CAMBIOS V2.0

 | Aspecto                 | V1.1            | V2.0                                         |
 |-------------------------|-----------------|----------------------------------------------|
 | Flujo                   | Lineal          | Circular (Admin → Tenant → Landlord → Admin) |
 | Edición Post-Biométrico | No definido     | 🔒 INMUTABLE                                 |
 | Documentos Anexos       | Editables       | 🔒 Solo lectura post-aprobación              |
 | Ciclos de Revisión      | No tracking     | Contador review_cycle_count                  |
 | Descarga Documentos     | Directa /media/ | Endpoint seguro con auditoría                |
 | Fases                   | 6 fases         | 7 fases (+ Fase 0 Backend)                   |

 ---
 Aprobación requerida antes de proceder con implementación.