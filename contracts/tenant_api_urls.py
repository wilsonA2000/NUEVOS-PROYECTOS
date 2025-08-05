"""
URLs para las APIs del sistema de contratos desde la perspectiva del arrendatario.
Rutas organizadas para el workflow paso a paso del tenant.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .tenant_api_views import (
    TenantContractViewSet,
    TenantDashboardView
)

# Router para ViewSets del arrendatario
tenant_router = DefaultRouter()
tenant_router.register(r'contracts', TenantContractViewSet, basename='tenant-contracts')
tenant_router.register(r'dashboard', TenantDashboardView, basename='tenant-dashboard')

app_name = 'tenant_contracts'

urlpatterns = [
    # APIs principales del workflow para arrendatarios
    path('tenant/', include(tenant_router.urls)),
]

# Documentación completa de endpoints del arrendatario:
"""
TENANT CONTRACT WORKFLOW API ENDPOINTS:

=== OPERACIONES PRINCIPALES DEL ARRENDATARIO ===

1. ACEPTAR INVITACIÓN (Paso 4)
   POST /api/tenant/contracts/accept_invitation/
   Body: {
       "invitation_token": "token_from_email",
       "accept_terms": true
   }

2. COMPLETAR DATOS ARRENDATARIO (Paso 5)
   POST /api/tenant/contracts/{id}/complete_tenant_data/
   Body: TenantDataSerializer {
       "full_name": "Juan Pérez",
       "document_type": "CC",
       "document_number": "12345678",
       "birth_date": "1990-01-01",
       "phone": "3001234567",
       "email": "tenant@example.com",
       "current_address": "Calle 123 #45-67",
       "current_city": "Medellín",
       "current_department": "Antioquia",
       "time_at_current_address": 24,
       "employment_type": "employed",
       "employer_name": "Empresa ABC",
       "job_title": "Desarrollador",
       "monthly_income": 3000000,
       "employment_start_date": "2020-01-01",
       "reference_1_name": "María García",
       "reference_1_phone": "3007654321",
       "reference_1_relationship": "Amiga",
       "reference_2_name": "Carlos López",
       "reference_2_phone": "3009876543",
       "reference_2_relationship": "Compañero de trabajo",
       "marital_status": "single",
       "dependents_count": 0
   }

3. CREAR OBJECIÓN (Como Arrendatario)
   POST /api/tenant/contracts/{id}/create_objection/
   Body: {
       "field_name": "monthly_rent",
       "current_value": "1500000",
       "proposed_value": "1400000",
       "justification": "El canon está por encima del promedio del sector para propiedades similares",
       "priority": "MEDIUM",
       "affects_budget": true,
       "requires_negotiation": true
   }

4. RESPONDER OBJECIÓN DEL ARRENDADOR
   POST /api/tenant/contracts/{id}/respond_to_objection/
   Body: {
       "objection_id": "objection_uuid",
       "response": "ACCEPTED|REJECTED",
       "response_note": "Nota de respuesta"
   }

5. APROBAR CONTRATO (Como Arrendatario)
   POST /api/tenant/contracts/{id}/approve_contract/
   Body: {
       "approved": true,
       "tenant_notes": "Estoy de acuerdo con todos los términos",
       "confirm_understanding": true
   }

6. FIRMAR CONTRATO (Como Arrendatario)
   POST /api/tenant/contracts/{id}/sign_contract/
   Body: {
       "signature_data": {
           "timestamp": "2025-01-01T12:00:00Z",
           "user_agent": "...",
           "ip_address": "192.168.1.1"
       },
       "signature_image": file,
       "biometric_data": {...},
       "device_fingerprint": {...},
       "accept_legal_responsibility": true
   }

=== CONSULTAS DEL ARRENDATARIO ===

7. LISTAR MIS CONTRATOS
   GET /api/tenant/contracts/
   Filters: ?current_state=TENANT_REVIEWING&published=false
   Search: ?search=landlord_name
   Ordering: ?ordering=-created_at
   
   Response: Lista optimizada desde perspectiva del tenant con:
   - Información del arrendador
   - Estado del progreso personal
   - Acciones disponibles
   - Objeciones pendientes

8. DETALLE DE CONTRATO (Vista Tenant)
   GET /api/tenant/contracts/{id}/
   
   Response: Vista completa con:
   - Detalles del arrendador y propiedad
   - Progreso personal y próximas acciones
   - Mis objeciones vs objeciones del arrendador
   - Capacidades actuales (qué puedo hacer)
   - Estado de firmas y aprobaciones

9. MIS OBJECIONES EN UN CONTRATO
   GET /api/tenant/contracts/{id}/objections/
   Filters: ?status=PENDING&priority=HIGH
   
   Response: Objeciones filtradas del contrato específico

10. HISTORIAL DEL CONTRATO (Vista Tenant)
    GET /api/tenant/contracts/{id}/history/
    Pagination: ?limit=50&offset=0
    
    Response: Historial de actividades del contrato

11. VISTA PREVIA DEL CONTRATO
    GET /api/tenant/contracts/{id}/contract_preview/
    
    Response: {
        "contract_content": "contenido_html_del_contrato",
        "contract_data": {...},
        "can_sign": true,
        "is_published": false
    }

12. INVITACIONES PENDIENTES
    GET /api/tenant/contracts/pending_invitations/
    
    Response: Lista de contratos donde fui invitado pero no he aceptado

13. ESTADÍSTICAS DEL ARRENDATARIO
    GET /api/tenant/contracts/stats/
    
    Response: {
        "total_contracts": 5,
        "active_contracts": 2,
        "completed_contracts": 1,
        "pending_approval": 1,
        "pending_signature": 1,
        "waiting_for_landlord": 0,
        "monthly_rent_expenses": 2800000,
        "average_signing_days": 7.5,
        "total_objections_made": 3,
        "accepted_objections": 2,
        "rejected_objections": 1,
        "objection_success_rate": 66.67,
        "state_breakdown": {...},
        "property_types": {...}
    }

=== DASHBOARD DEL ARRENDATARIO ===

14. VISTA GENERAL DEL DASHBOARD
    GET /api/tenant/dashboard/overview/
    
    Response: {
        "active_contracts_count": 2,
        "total_monthly_rent": 2800000,
        "pending_actions": [
            {
                "type": "invitation",
                "count": 1,
                "message": "1 invitación pendiente",
                "action_url": "/tenant/contracts/pending-invitations/"
            },
            {
                "type": "complete_data",
                "count": 1,
                "message": "1 contrato esperando tus datos",
                "action_url": "/tenant/contracts/?current_state=TENANT_REVIEWING"
            }
        ],
        "upcoming_expirations": [...],
        "recent_activity": [...]
    }

=== ESTADOS DEL WORKFLOW (Perspectiva Tenant) ===

TENANT_INVITED (10%) -> TENANT_REVIEWING (25%) -> LANDLORD_REVIEWING (50%)
-> OBJECTIONS_PENDING (60%) -> BOTH_REVIEWING (75%) -> READY_TO_SIGN (85%)
-> FULLY_SIGNED (95%) -> PUBLISHED (100%)

=== ACCIONES DISPONIBLES POR ESTADO ===

TENANT_INVITED:
- accept_invitation ✅

TENANT_REVIEWING:
- complete_tenant_data ✅
- create_objection ✅

LANDLORD_REVIEWING:
- create_objection ✅
- respond_to_objection (si hay objeciones del landlord) ✅

OBJECTIONS_PENDING:
- create_objection ✅
- respond_to_objection ✅

BOTH_REVIEWING:
- approve_contract ✅
- create_objection ✅

READY_TO_SIGN:
- sign_contract ✅

FULLY_SIGNED:
- contract_preview (solo lectura) ✅

PUBLISHED:
- contract_preview (solo lectura) ✅
- Todas las consultas históricas ✅

=== PERMISOS ===

- Todas las operaciones requieren autenticación (IsAuthenticated)
- Operaciones de contratos requieren IsTenantPermission
- Los arrendatarios solo pueden ver/editar contratos donde son parte
- Los arrendatarios NO pueden crear contratos (solo participar)
- Los arrendatarios NO pueden publicar contratos

=== NOTIFICACIONES AUTOMÁTICAS ===

El sistema enviará notificaciones automáticas al arrendatario cuando:
- Reciba una invitación de contrato
- El arrendador presente objeciones
- El contrato esté listo para aprobación
- El contrato esté listo para firma
- El contrato sea publicado
- Haya cambios en el estado del contrato

=== DIFERENCIAS CON LANDLORD APIs ===

1. **Solo Lectura/Participación**: Los tenants no crean contratos, solo participan
2. **Vista Filtrada**: Solo ven información relevante para su rol
3. **Estadísticas Diferentes**: Enfocadas en gastos y experiencia como arrendatario
4. **Dashboard Específico**: Acciones pendientes y próximos vencimientos
5. **Capacidades Limitadas**: No pueden publicar ni tomar decisiones finales

=== CÓDIGOS DE RESPUESTA ===

200: OK - Operación exitosa
201: Created - Recurso creado (objeciones)
400: Bad Request - Error de validación
401: Unauthorized - No autenticado
403: Forbidden - Sin permisos para este contrato
404: Not Found - Contrato no encontrado
500: Internal Server Error - Error interno
"""