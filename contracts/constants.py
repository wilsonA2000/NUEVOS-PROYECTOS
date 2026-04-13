"""
UX-E2E-02: estados canónicos del contrato y workflow biométrico.

Este módulo centraliza el vocabulario de estados del sistema para evitar
el drift entre strings mágicos repartidos en múltiples archivos. Usar
estas constantes en:

- api_views.py (whitelists de StartBiometricAuthenticationAPIView,
  edit-before-auth, tenant-review, etc.)
- biometric_service.py (valid_states_for_auth, transiciones)
- frontend/src/pages/contracts/BiometricAuthenticationPage.tsx
  (validStatesForAuth - mantener en sync)

NOTA: los Contract.STATUS_CHOICES originales NO se cambian aún porque
requiere migración de datos. Este módulo provee los nombres lógicos que
el código y el frontend deben usar. Futuro refactor (UX-E2E-02 fase 2)
consolidará las choices del modelo.
"""
from django.db import models


class ContractState(models.TextChoices):
    """Estados del modelo Contract (legacy) y LandlordControlledContract (nuevo).

    Usar con `ContractState.ACTIVE.value` cuando se compare con DB, y
    `ContractState.ACTIVE.label` para UI.
    """

    # FASE 1: Creación y revisión
    DRAFT = 'draft', 'Borrador'
    PENDING_TENANT_REVIEW = 'pending_tenant_review', 'Pendiente Revisión Tenant'
    TENANT_CHANGES_REQUESTED = 'tenant_changes_requested', 'Cambios Solicitados'
    PDF_GENERATED = 'pdf_generated', 'PDF Generado'

    # FASE 2: Preparación para firma biométrica
    READY_FOR_AUTHENTICATION = 'ready_for_authentication', 'Listo para Firma'
    PENDING_AUTHENTICATION = 'pending_authentication', 'Autenticación en Proceso'
    PENDING_BIOMETRIC = 'pending_biometric', 'Pendiente Biométrica'

    # FASE 3: Firma biométrica secuencial (Tenant → Garante → Landlord)
    PENDING_TENANT_BIOMETRIC = 'pending_tenant_biometric', 'Esperando Tenant'
    PENDING_GUARANTOR_BIOMETRIC = 'pending_guarantor_biometric', 'Esperando Garante'
    PENDING_LANDLORD_BIOMETRIC = 'pending_landlord_biometric', 'Esperando Landlord'

    # FASE 4: Ejecución
    ACTIVE = 'active', 'Activo'
    EXPIRED = 'expired', 'Vencido'
    TERMINATED = 'terminated', 'Terminado'
    CANCELLED = 'cancelled', 'Cancelado'


class MatchWorkflowStatus(models.TextChoices):
    """Estados de MatchRequest.workflow_status tras el flujo biométrico."""

    PENDING = 'pending', 'Pendiente'
    ACCEPTED = 'accepted', 'Aceptada'
    CONTRACT_READY = 'contract_ready', 'Contrato Listo'
    PENDING_TENANT_BIOMETRIC = 'pending_tenant_biometric', 'Esperando Tenant'
    PENDING_GUARANTOR_BIOMETRIC = 'pending_guarantor_biometric', 'Esperando Garante'
    PENDING_LANDLORD_BIOMETRIC = 'pending_landlord_biometric', 'Esperando Landlord'
    ALL_BIOMETRICS_COMPLETED = 'all_biometrics_completed', 'Biometrías Completas'


# Agrupaciones útiles (usar en whitelists de los ApiViews)
STATES_READY_FOR_BIOMETRIC = frozenset([
    ContractState.PDF_GENERATED.value,
    ContractState.READY_FOR_AUTHENTICATION.value,
    ContractState.PENDING_BIOMETRIC.value,
    ContractState.PENDING_AUTHENTICATION.value,
    ContractState.PENDING_TENANT_BIOMETRIC.value,
    ContractState.PENDING_GUARANTOR_BIOMETRIC.value,
    ContractState.PENDING_LANDLORD_BIOMETRIC.value,
])

STATES_EDITABLE_BY_TENANT = frozenset([
    ContractState.DRAFT.value,
    ContractState.PENDING_TENANT_REVIEW.value,
    ContractState.TENANT_CHANGES_REQUESTED.value,
    ContractState.READY_FOR_AUTHENTICATION.value,
    ContractState.PENDING_BIOMETRIC.value,
    ContractState.PENDING_AUTHENTICATION.value,
    ContractState.PENDING_TENANT_BIOMETRIC.value,
    ContractState.PENDING_GUARANTOR_BIOMETRIC.value,
    ContractState.PENDING_LANDLORD_BIOMETRIC.value,
])

STATES_FINAL = frozenset([
    ContractState.ACTIVE.value,
    ContractState.EXPIRED.value,
    ContractState.TERMINATED.value,
    ContractState.CANCELLED.value,
])
