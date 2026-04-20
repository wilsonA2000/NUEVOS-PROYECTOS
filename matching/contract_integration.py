"""
Servicio de integración entre Matching y Contratos.
Solo permite crear contratos cuando existe un match aceptado.

NOTA: la creación real del contrato se delega a
`MatchRequest._ensure_contract_exists()`, que es el único camino vivo del
flujo match→contrato (crea `Contract` + `LandlordControlledContract` con
UUID compartido). El modelo `ColombianContract` persiste sólo como soporte
de `payments.escrow_integration`; este servicio ya no lo usa directamente.
"""

from typing import Optional, Dict
from django.db import transaction
from django.core.exceptions import ValidationError

from matching.models import MatchRequest


class MatchContractIntegrationService:
    """Servicio para crear contratos desde matches aceptados"""

    @staticmethod
    def validate_match_for_contract(match_request: MatchRequest) -> Dict[str, any]:
        """Valida que un match puede convertirse en contrato"""
        errors = []
        warnings = []

        # Validación 1: Match debe estar aceptado
        if match_request.status != "accepted":
            errors.append("El match debe estar aceptado por ambas partes")

        # Validación 2: Verificar identidades
        tenant = match_request.tenant
        landlord = match_request.property.landlord

        if not tenant.is_verified:
            errors.append("El inquilino debe tener identidad verificada")

        if not landlord.is_verified:
            errors.append("El arrendador debe tener identidad verificada")

        # Validación 3: Propiedad debe estar disponible
        if (
            match_request.property.status != "available"
            or not match_request.property.is_active
        ):
            errors.append("La propiedad no está disponible")

        # Validación 4: Documentos requeridos

        # Aquí verificarías los documentos subidos

        # Validación 5: Información financiera
        if match_request.monthly_income < match_request.property.rent_price * 3:
            warnings.append("Ingresos del inquilino menores a 3x el arriendo")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "match_data": {
                "tenant": {
                    "id": str(tenant.id),
                    "name": tenant.get_full_name(),
                    "email": tenant.email,
                    "is_verified": tenant.is_verified,
                },
                "landlord": {
                    "id": str(landlord.id),
                    "name": landlord.get_full_name(),
                    "email": landlord.email,
                    "is_verified": landlord.is_verified,
                },
                "property": {
                    "id": str(match_request.property.id),
                    "title": match_request.property.title,
                    "address": match_request.property.address,
                    "city": match_request.property.city,
                    "state": match_request.property.state,
                    "rent_price": float(match_request.property.rent_price),
                    "status": match_request.property.status,
                },
                "financial_info": {
                    "monthly_rent": float(match_request.property.rent_price),
                    "tenant_income": float(match_request.monthly_income)
                    if match_request.monthly_income
                    else None,
                    "lease_duration": match_request.lease_duration_months,
                },
            },
        }

    @staticmethod
    @transaction.atomic
    def create_contract_from_match(
        match_request: MatchRequest,
        contract_type: Optional[str] = None,
        additional_data: Optional[Dict] = None,
    ):
        """Crea (o recupera) el par Contract + LandlordControlledContract a partir del match.

        Delega en `MatchRequest._ensure_contract_exists()` para preservar una única
        fuente de verdad del flujo match→contrato (mismo UUID en ambos modelos,
        requisito del flujo biométrico).
        """
        from contracts.models import Contract

        validation = MatchContractIntegrationService.validate_match_for_contract(
            match_request
        )
        if not validation["valid"]:
            raise ValidationError(
                f"No se puede crear contrato: {', '.join(validation['errors'])}"
            )

        match_request._ensure_contract_exists()
        contract = Contract.objects.get(match_request=match_request)

        if not match_request.has_contract:
            match_request.has_contract = True
            match_request.save(update_fields=["has_contract"])

        return contract
