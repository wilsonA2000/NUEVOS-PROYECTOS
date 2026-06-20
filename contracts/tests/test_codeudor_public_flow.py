"""
Spec del flujo PÚBLICO de codeudor por token (D29).

Cubre los endpoints sin login que usa el codeudor al recibir el link por
email: validación del token, expiración/uso, y consulta de estado. Es la
parte sensible a seguridad (un token válido da acceso a datos del contrato
sin autenticación), antes sin tests dedicados.
"""

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from contracts.landlord_contract_models import (
    LandlordControlledContract,
    CodeudorAuthToken,
)
from properties.models import Property

User = get_user_model()


class CodeudorPublicFlowTests(APITestCase):
    """Endpoints públicos /api/v1/public/codeudor/*."""

    def setUp(self):
        self.landlord = User.objects.create_user(
            email="land_codeudor@test.com",
            password="pass12345",
            first_name="Land",
            last_name="Lord",
            user_type="landlord",
        )
        self.tenant = User.objects.create_user(
            email="ten_codeudor@test.com",
            password="pass12345",
            first_name="Ten",
            last_name="Ant",
            user_type="tenant",
        )
        self.property = Property.objects.create(
            landlord=self.landlord,
            title="Apt codeudor",
            address="Calle 9 #8-7",
            city="Bogotá",
            property_type="apartment",
            listing_type="rent",
            total_area=60,
        )
        self.contract = LandlordControlledContract.objects.create(
            landlord=self.landlord,
            tenant=self.tenant,
            property=self.property,
            title="Contrato codeudor",
            current_state="DRAFT",
            economic_terms={"monthly_rent": "1500000"},
        )

    def _make_token(self, **overrides):
        defaults = dict(
            contract=self.contract,
            codeudor_name="Carlos Codeudor",
            codeudor_email="carlos.codeudor@test.com",
            codeudor_document_number="123456789",
            codeudor_type="codeudor_salario",
            status="sent",
            created_by=self.landlord,
        )
        defaults.update(overrides)
        return CodeudorAuthToken.objects.create(**defaults)

    def _validate_url(self, token):
        return f"/api/v1/contracts/public/codeudor/validate/{token}/"

    def _status_url(self, token):
        return f"/api/v1/contracts/public/codeudor/status/{token}/"

    # -- validación ---------------------------------------------------------

    def test_validate_token_valido(self):
        """Token vigente → 200, valid=True, datos del codeudor y contrato."""
        tok = self._make_token()
        resp = self.client.get(self._validate_url(tok.token))

        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["valid"])
        self.assertEqual(resp.data["codeudor_info"]["name"], "Carlos Codeudor")
        self.assertEqual(
            resp.data["contract_info"]["id"], str(self.contract.id)
        )
        # Acceder marca el token como "accessed".
        tok.refresh_from_db()
        self.assertEqual(tok.status, "accessed")

    def test_validate_token_inexistente(self):
        """Token basura → 400, valid=False, error_code INVALID_TOKEN."""
        resp = self.client.get(self._validate_url("token-que-no-existe"))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(resp.data["valid"])
        self.assertEqual(resp.data["error_code"], "INVALID_TOKEN")

    def test_validate_token_expirado(self):
        """Token con expires_at en el pasado → inválido (400)."""
        tok = self._make_token()
        tok.expires_at = timezone.now() - timedelta(days=1)
        tok.save(update_fields=["expires_at"])

        self.assertTrue(tok.is_expired)
        resp = self.client.get(self._validate_url(tok.token))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(resp.data["valid"])

    def test_validate_token_ya_completado_rechazado(self):
        """Un token ya 'completed' no se puede reutilizar (is_valid=False)."""
        tok = self._make_token(status="completed")
        self.assertFalse(tok.is_valid)
        resp = self.client.get(self._validate_url(tok.token))
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(resp.data["valid"])

    # -- estado -------------------------------------------------------------

    def test_status_token_valido(self):
        """status/<token> de un token real → 200, valid=True, status."""
        tok = self._make_token()
        resp = self.client.get(self._status_url(tok.token))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data["valid"])
        self.assertIn("status", resp.data)

    def test_status_token_inexistente(self):
        """status/<token> de un token que no existe → 404."""
        resp = self.client.get(self._status_url("no-existe"))
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(resp.data["valid"])

    # -- modelo -------------------------------------------------------------

    def test_token_y_hash_se_autogeneran(self):
        """save() genera token urlsafe + hash sha256 + expiración a 7 días."""
        tok = self._make_token()
        self.assertTrue(tok.token)
        self.assertEqual(len(tok.token_hash), 64)  # sha256 hex
        self.assertTrue(tok.expires_at > timezone.now())
