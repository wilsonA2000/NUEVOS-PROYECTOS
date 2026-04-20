"""API Views de la integración Matching → Contrato.

Expone dos endpoints:

- `POST /matching/requests/{match_id}/validate-contract/` — valida si el match
  puede convertirse en contrato.
- `POST /matching/requests/{match_id}/create-contract/` — crea (o recupera) el
  par `Contract` + `LandlordControlledContract` asociado al match.

La creación real vive en `MatchRequest._ensure_contract_exists()`. El resto
del antiguo `MatchContractViewSet` (sign_contract, download_pdf, milestones,
etc.) se retiró: esas acciones viven hoy en `/api/v1/contracts/`.
"""

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404

from matching.models import MatchRequest
from matching.contract_integration import MatchContractIntegrationService


class ValidateMatchForContractAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, match_id):
        match_request = get_object_or_404(MatchRequest, id=match_id)

        if request.user not in [match_request.tenant, match_request.property.landlord]:
            return Response(
                {"error": "No tienes permisos para esta operación"},
                status=status.HTTP_403_FORBIDDEN,
            )

        result = MatchContractIntegrationService.validate_match_for_contract(
            match_request
        )
        return Response(result)


class CreateContractFromMatchAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, match_id):
        match_request = get_object_or_404(MatchRequest, id=match_id)

        if request.user != match_request.property.landlord:
            return Response(
                {"error": "Solo el arrendador puede crear el contrato"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            contract = MatchContractIntegrationService.create_contract_from_match(
                match_request=match_request,
                contract_type=request.data.get("contract_type"),
                additional_data=request.data.get("additional_data", {}),
            )
        except ValidationError as exc:
            return Response(
                {"errors": exc.messages}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            {
                "match_id": str(match_request.id),
                "contract_id": str(contract.id),
                "landlord_controlled_contract_id": str(contract.id),
                "status": contract.status,
                "shared_uuid": True,
                "next_step": "biometric_authentication",
            },
            status=status.HTTP_201_CREATED,
        )
