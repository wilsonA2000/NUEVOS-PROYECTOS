"""
URLs para las APIs del sistema de contratos controlado por arrendador.
Rutas organizadas para el workflow paso a paso.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .landlord_api_views import (
    LandlordContractViewSet,
    ContractObjectionViewSet,
    ContractGuaranteeViewSet,
    ContractWorkflowHistoryViewSet
)

# Router para ViewSets
router = DefaultRouter()
router.register(r'contracts', LandlordContractViewSet, basename='landlord-contracts')
router.register(r'objections', ContractObjectionViewSet, basename='contract-objections')
router.register(r'guarantees', ContractGuaranteeViewSet, basename='contract-guarantees')
router.register(r'history', ContractWorkflowHistoryViewSet, basename='contract-history')

app_name = 'landlord_contracts'

urlpatterns = [
    # APIs principales del workflow
    path('landlord/', include(router.urls)),
    
    # URLs específicas del workflow (si se necesitan rutas adicionales)
    # path('landlord/contracts/<uuid:pk>/custom-action/', view_name, name='custom-action'),
]

# Documentación de endpoints disponibles:
"""
LANDLORD CONTRACT WORKFLOW API ENDPOINTS:

=== OPERACIONES PRINCIPALES ===

1. CREAR CONTRATO (Paso 1)
   POST /api/v1/contracts/landlord/contracts/
   Body: {
       "property": "property_uuid",
       "contract_template": "default", 
       "monthly_rent": 1500000,
       "security_deposit": 1500000,
       "contract_duration_months": 12,
       "utilities_included": false,
       "pets_allowed": false,
       "smoking_allowed": false
   }

2. COMPLETAR DATOS ARRENDADOR (Paso 2)
   POST /api/landlord/contracts/{id}/complete_landlord_data/
   Body: LandlordDataSerializer

3. ENVIAR INVITACIÓN A ARRENDATARIO (Paso 3)
   POST /api/landlord/contracts/{id}/send_tenant_invitation/
   Body: {
       "tenant_email": "tenant@example.com",
       "personal_message": "Mensaje opcional"
   }

4. CREAR OBJECIÓN
   POST /api/landlord/contracts/{id}/create_objection/
   Body: {
       "field_name": "monthly_rent",
       "current_value": "1500000",
       "proposed_value": "1400000", 
       "justification": "Razón de la objeción",
       "priority": "MEDIUM"
   }

5. RESPONDER OBJECIÓN
   POST /api/landlord/contracts/{id}/respond_to_objection/
   Body: {
       "objection_id": "objection_uuid",
       "response": "ACCEPTED|REJECTED",
       "response_note": "Nota opcional"
   }

6. APROBAR CONTRATO
   POST /api/landlord/contracts/{id}/approve_contract/
   Body: {
       "approved": true,
       "notes": "Notas opcionales"
   }

7. FIRMAR CONTRATO
   POST /api/landlord/contracts/{id}/sign_contract/
   Body: {
       "signature_data": {
           "timestamp": "2025-01-01T12:00:00Z",
           "user_agent": "...",
           "ip_address": "192.168.1.1"
       },
       "signature_image": file,
       "biometric_data": {...},
       "device_fingerprint": {...}
   }

8. PUBLICAR CONTRATO (Paso Final)
   POST /api/landlord/contracts/{id}/publish_contract/
   Body: {} (empty)

=== CONSULTAS ===

9. LISTAR CONTRATOS
   GET /api/landlord/contracts/
   Filters: ?current_state=DRAFT&published=false
   Search: ?search=contract_number
   Ordering: ?ordering=-created_at

10. DETALLE DE CONTRATO
    GET /api/landlord/contracts/{id}/

11. OBJECIONES DEL CONTRATO
    GET /api/landlord/contracts/{id}/objections/
    Filters: ?status=PENDING&priority=HIGH

12. HISTORIAL DEL CONTRATO
    GET /api/landlord/contracts/{id}/history/
    Pagination: ?limit=50&offset=0

13. ESTADÍSTICAS DEL ARRENDADOR
    GET /api/landlord/contracts/stats/

14. AGREGAR GARANTÍA
    POST /api/landlord/contracts/{id}/add_guarantee/
    Body: LandlordContractGuaranteeSerializer

=== GESTIÓN DE OBJECIONES ===

15. LISTAR TODAS LAS OBJECIONES
    GET /api/landlord/objections/

16. DETALLE DE OBJECIÓN
    GET /api/landlord/objections/{id}/

=== GESTIÓN DE GARANTÍAS ===

17. LISTAR GARANTÍAS
    GET /api/landlord/guarantees/

18. CREAR/EDITAR GARANTÍA
    POST/PUT /api/landlord/guarantees/
    Body: LandlordContractGuaranteeSerializer

=== HISTORIAL GENERAL ===

19. HISTORIAL COMPLETO
    GET /api/landlord/history/
    Filters disponibles por contrato, usuario, fecha, etc.

=== ESTADOS DEL WORKFLOW ===

DRAFT -> TENANT_INVITED -> TENANT_REVIEWING -> LANDLORD_REVIEWING 
-> OBJECTIONS_PENDING -> BOTH_REVIEWING -> READY_TO_SIGN 
-> FULLY_SIGNED -> PUBLISHED

=== CÓDIGOS DE RESPUESTA ===

200: OK - Operación exitosa
201: Created - Recurso creado
400: Bad Request - Error de validación
401: Unauthorized - No autenticado
403: Forbidden - Sin permisos
404: Not Found - Recurso no encontrado
500: Internal Server Error - Error interno

=== PERMISOS ===

- Todas las operaciones requieren autenticación (IsAuthenticated)
- Operaciones de contratos requieren IsLandlordPermission
- Los usuarios solo pueden ver/editar contratos donde son parte
- Solo el arrendador puede publicar contratos
"""