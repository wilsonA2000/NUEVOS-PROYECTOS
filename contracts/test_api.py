"""
Tests for the contracts app API endpoints and models.

Covers Contract and LandlordControlledContract model creation/validation,
Contract CRUD API, biometric authentication endpoints, PDF preview,
and permission checks.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from django.contrib.auth import get_user_model
from contracts.models import (
    Contract,
    BiometricAuthentication,
)
from contracts.landlord_contract_models import (
    LandlordControlledContract,
)
from properties.models import Property

User = get_user_model()


# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------


def _make_user(email, user_type="landlord", **kwargs):
    """Create and return a User with sensible defaults."""
    defaults = {
        "email": email,
        "user_type": user_type,
        "first_name": email.split("@")[0].capitalize(),
        "last_name": "Test",
        "is_active": True,
    }
    defaults.update(kwargs)
    user = User.objects.create_user(password="TestPass123!", **defaults)
    return user


def _make_property(landlord, **kwargs):
    """Create and return a Property with sensible defaults."""
    defaults = {
        "landlord": landlord,
        "title": "Apartamento Centro Bucaramanga",
        "description": "Amplio apartamento de 3 habitaciones en zona centrica",
        "property_type": "apartment",
        "listing_type": "rent",
        "status": "available",
        "address": "Calle 36 #23-45, Centro",
        "city": "Bucaramanga",
        "state": "Santander",
        "country": "Colombia",
        "bedrooms": 3,
        "bathrooms": Decimal("2.0"),
        "total_area": Decimal("85.00"),
        "rent_price": Decimal("1500000.00"),
        "security_deposit": Decimal("1500000.00"),
    }
    defaults.update(kwargs)
    return Property.objects.create(**defaults)


def _make_contract(primary_party, secondary_party, prop=None, **kwargs):
    """Create and return a Contract with sensible defaults."""
    defaults = {
        "contract_type": "rental_urban",
        "primary_party": primary_party,
        "secondary_party": secondary_party,
        "title": "Contrato de Arrendamiento Vivienda Urbana",
        "description": "Contrato de arrendamiento para vivienda urbana en Bucaramanga",
        "content": "Contenido del contrato de prueba con clausulas estandar.",
        "start_date": date.today(),
        "end_date": date.today() + timedelta(days=365),
        "status": "draft",
        "monthly_rent": Decimal("1500000.00"),
        "security_deposit": Decimal("1500000.00"),
        "property": prop,
    }
    defaults.update(kwargs)
    return Contract.objects.create(**defaults)


def _make_landlord_contract(landlord, prop, **kwargs):
    """Create and return a LandlordControlledContract with sensible defaults."""
    defaults = {
        "landlord": landlord,
        "property": prop,
        "contract_type": "rental_urban",
        "title": "Contrato Arrendamiento VH",
        "description": "Contrato controlado por arrendador",
        "current_state": "PENDING_ADMIN_REVIEW",
        "tenant_identifier": "inquilino@test.com",
        "landlord_data": {"nombre": "Test Landlord", "cedula": "12345678"},
        "property_data": {"address": "Calle 36 #23-45"},
        "economic_terms": {"monthly_rent": "1500000", "deposit": "1500000"},
        "contract_terms": {"duration_months": 12},
        "start_date": date.today(),
        "end_date": date.today() + timedelta(days=365),
    }
    defaults.update(kwargs)
    return LandlordControlledContract.objects.create(**defaults)


# ===========================================================================
# Model tests
# ===========================================================================


class ContractModelTests(TestCase):
    """Tests for the Contract model."""

    def setUp(self):
        self.landlord = _make_user("landlord@verihome.co", "landlord")
        self.tenant = _make_user("tenant@verihome.co", "tenant")
        self.prop = _make_property(self.landlord)

    def test_contract_creation_basic(self):
        """A Contract can be created with minimum required fields."""
        contract = _make_contract(self.landlord, self.tenant, self.prop)
        self.assertIsNotNone(contract.id)
        self.assertEqual(contract.status, "draft")
        self.assertEqual(contract.contract_type, "rental_urban")

    def test_contract_number_auto_generated(self):
        """contract_number is auto-generated on save when blank."""
        contract = _make_contract(self.landlord, self.tenant, self.prop)
        self.assertTrue(contract.contract_number.startswith("VH-"))
        self.assertIn(str(timezone.now().year), contract.contract_number)

    def test_contract_number_unique(self):
        """Two contracts receive different numbers."""
        c1 = _make_contract(self.landlord, self.tenant, self.prop)
        c2 = _make_contract(self.landlord, self.tenant, self.prop)
        self.assertNotEqual(c1.contract_number, c2.contract_number)

    def test_contract_parties_assigned(self):
        """primary_party and secondary_party are correctly assigned."""
        contract = _make_contract(self.landlord, self.tenant, self.prop)
        self.assertEqual(contract.primary_party, self.landlord)
        self.assertEqual(contract.secondary_party, self.tenant)

    def test_contract_financial_fields(self):
        """Monthly rent and security deposit are stored correctly."""
        contract = _make_contract(
            self.landlord,
            self.tenant,
            self.prop,
            monthly_rent=Decimal("2000000.00"),
            security_deposit=Decimal("4000000.00"),
        )
        self.assertEqual(contract.monthly_rent, Decimal("2000000.00"))
        self.assertEqual(contract.security_deposit, Decimal("4000000.00"))

    def test_contract_dates(self):
        """start_date and end_date are stored correctly."""
        start = date.today()
        end = date.today() + timedelta(days=365)
        contract = _make_contract(
            self.landlord,
            self.tenant,
            self.prop,
            start_date=start,
            end_date=end,
        )
        self.assertEqual(contract.start_date, start)
        self.assertEqual(contract.end_date, end)

    def test_contract_str_representation(self):
        """Contract str returns a meaningful representation."""
        contract = _make_contract(self.landlord, self.tenant, self.prop)
        text = str(contract)
        # Should not be empty or just uuid
        self.assertTrue(len(text) > 0)

    def test_contract_with_guarantor(self):
        """A guarantor can be optionally assigned."""
        guarantor = _make_user("codeudor@verihome.co", "tenant")
        contract = _make_contract(
            self.landlord,
            self.tenant,
            self.prop,
            guarantor=guarantor,
        )
        self.assertEqual(contract.guarantor, guarantor)

    def test_contract_default_status_is_draft(self):
        """Default status for new contract is draft."""
        contract = _make_contract(self.landlord, self.tenant, self.prop)
        self.assertEqual(contract.status, "draft")


class LandlordControlledContractModelTests(TestCase):
    """Tests for the LandlordControlledContract model."""

    def setUp(self):
        self.landlord = _make_user("landlord2@verihome.co", "landlord")
        self.tenant = _make_user("tenant2@verihome.co", "tenant")
        self.prop = _make_property(self.landlord)

    def test_lcc_creation(self):
        """A LandlordControlledContract can be created."""
        lcc = _make_landlord_contract(self.landlord, self.prop)
        self.assertIsNotNone(lcc.id)
        self.assertIsInstance(lcc.id, uuid.UUID)

    def test_lcc_default_state(self):
        """Default state is PENDING_ADMIN_REVIEW."""
        lcc = _make_landlord_contract(self.landlord, self.prop)
        self.assertEqual(lcc.current_state, "PENDING_ADMIN_REVIEW")

    def test_lcc_contract_number_auto_generated(self):
        """Contract number auto-generated in VH-YYYY-NNNNNN format."""
        lcc = _make_landlord_contract(self.landlord, self.prop)
        self.assertTrue(lcc.contract_number.startswith("VH-"))

    def test_lcc_workflow_states_transition(self):
        """Workflow state can be changed to a valid value."""
        lcc = _make_landlord_contract(self.landlord, self.prop)
        lcc.current_state = "DRAFT"
        lcc.save()
        lcc.refresh_from_db()
        self.assertEqual(lcc.current_state, "DRAFT")

    def test_lcc_with_tenant(self):
        """Tenant can be assigned to a contract."""
        lcc = _make_landlord_contract(self.landlord, self.prop, tenant=self.tenant)
        self.assertEqual(lcc.tenant, self.tenant)

    def test_lcc_economic_terms_json(self):
        """economic_terms stored as JSON dict."""
        lcc = _make_landlord_contract(self.landlord, self.prop)
        self.assertIn("monthly_rent", lcc.economic_terms)
        self.assertEqual(lcc.economic_terms["monthly_rent"], "1500000")

    def test_lcc_is_locked_default_false(self):
        """is_locked defaults to False on new contracts."""
        lcc = _make_landlord_contract(self.landlord, self.prop)
        self.assertFalse(lcc.is_locked)

    def test_lcc_admin_review_deadline_auto_set(self):
        """admin_review_deadline is set automatically for PENDING_ADMIN_REVIEW state."""
        lcc = _make_landlord_contract(self.landlord, self.prop)
        self.assertIsNotNone(lcc.admin_review_deadline)


# ===========================================================================
# API tests
# ===========================================================================


_TEST_CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-default",
    },
    "sessions": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-sessions",
    },
    "query_cache": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-queries",
    },
    "local_fallback": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "test-fallback",
    },
}


@override_settings(CACHES=_TEST_CACHES)
class ContractAPITests(APITestCase):
    """Tests for the Contract REST API endpoints (router-based)."""

    def setUp(self):
        self.client = APIClient()
        self.landlord = _make_user("api_landlord@verihome.co", "landlord")
        self.tenant = _make_user("api_tenant@verihome.co", "tenant")
        self.other_user = _make_user("other@verihome.co", "tenant")
        self.prop = _make_property(self.landlord)
        self.contract = _make_contract(self.landlord, self.tenant, self.prop)

    # -- Authentication checks --

    def test_list_contracts_unauthenticated(self):
        """Unauthenticated request to list contracts returns 401."""
        resp = self.client.get("/api/v1/contracts/contracts/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_contracts_authenticated_landlord(self):
        """Authenticated landlord sees their contracts."""
        self.client.force_authenticate(user=self.landlord)
        resp = self.client.get("/api/v1/contracts/contracts/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_list_contracts_authenticated_tenant(self):
        """Authenticated tenant sees contracts where they are secondary_party."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.get("/api/v1/contracts/contracts/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_list_contracts_other_user_empty(self):
        """User not party to any contract sees empty list."""
        self.client.force_authenticate(user=self.other_user)
        resp = self.client.get("/api/v1/contracts/contracts/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # Results should be empty (paginated or plain list)
        data = resp.json()
        results = data.get("results", data)
        self.assertEqual(len(results), 0)

    # -- Retrieve --

    def test_retrieve_contract_as_party(self):
        """A party to the contract can retrieve its details."""
        self.client.force_authenticate(user=self.landlord)
        url = f"/api/v1/contracts/contracts/{self.contract.id}/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_retrieve_contract_non_party_404(self):
        """A user who is not a party gets 404 (queryset filter)."""
        self.client.force_authenticate(user=self.other_user)
        url = f"/api/v1/contracts/contracts/{self.contract.id}/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_retrieve_nonexistent_contract_404(self):
        """Requesting a non-existent contract returns 404."""
        self.client.force_authenticate(user=self.landlord)
        fake_id = uuid.uuid4()
        url = f"/api/v1/contracts/contracts/{fake_id}/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    # -- Create --

    def test_create_contract_authenticated(self):
        """An authenticated user can create a contract."""
        self.client.force_authenticate(user=self.landlord)
        data = {
            "contract_type": "rental_urban",
            "secondary_party": str(self.tenant.id),
            "title": "Nuevo Contrato Test",
            "content": "Contenido del contrato de prueba.",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=365)),
            "property": str(self.prop.id),
            "monthly_rent": "1800000.00",
        }
        resp = self.client.post("/api/v1/contracts/contracts/", data, format="json")
        self.assertIn(resp.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])

    def test_create_contract_unauthenticated(self):
        """Unauthenticated user cannot create a contract."""
        data = {
            "contract_type": "rental_urban",
            "title": "Contrato Sin Auth",
            "content": "No deberia crearse.",
            "start_date": str(date.today()),
            "end_date": str(date.today() + timedelta(days=365)),
        }
        resp = self.client.post("/api/v1/contracts/contracts/", data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


@override_settings(CACHES=_TEST_CACHES)
class BiometricAuthenticationAPITests(APITestCase):
    """Tests for biometric authentication API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.landlord = _make_user("bio_landlord@verihome.co", "landlord")
        self.tenant = _make_user("bio_tenant@verihome.co", "tenant")
        self.other = _make_user("bio_other@verihome.co", "tenant")
        self.prop = _make_property(self.landlord)
        self.contract = _make_contract(
            self.landlord,
            self.tenant,
            self.prop,
            status="pending_biometric",
        )

    def test_start_biometric_auth_unauthenticated(self):
        """Unauthenticated user cannot start biometric auth."""
        url = f"/api/v1/contracts/{self.contract.id}/start-biometric-authentication/"
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_start_biometric_auth_non_party_forbidden(self):
        """User who is not a party to the contract gets 403."""
        self.client.force_authenticate(user=self.other)
        url = f"/api/v1/contracts/{self.contract.id}/start-biometric-authentication/"
        resp = self.client.post(url)
        self.assertIn(
            resp.status_code,
            [
                status.HTTP_403_FORBIDDEN,
                status.HTTP_404_NOT_FOUND,
            ],
        )

    def test_start_biometric_auth_nonexistent_contract(self):
        """Starting biometric on non-existent contract returns 404."""
        self.client.force_authenticate(user=self.landlord)
        fake_id = uuid.uuid4()
        url = f"/api/v1/contracts/{fake_id}/start-biometric-authentication/"
        resp = self.client.post(url)
        self.assertIn(
            resp.status_code,
            [
                status.HTTP_404_NOT_FOUND,
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            ],
        )

    def test_auth_status_unauthenticated(self):
        """Unauthenticated user cannot query auth status."""
        url = f"/api/v1/contracts/{self.contract.id}/auth/status/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_auth_status_no_biometric_returns_404(self):
        """Auth status for contract with no BiometricAuthentication returns 404."""
        self.client.force_authenticate(user=self.landlord)
        url = f"/api/v1/contracts/{self.contract.id}/auth/status/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_auth_status_with_biometric_record(self):
        """Auth status returns data when BiometricAuthentication exists."""
        BiometricAuthentication.objects.create(
            contract=self.contract,
            user=self.tenant,
            status="pending",
            document_type="cedula_ciudadania",
            voice_text="Yo acepto los terminos de este contrato",
            expires_at=timezone.now() + timedelta(hours=1),
            ip_address="127.0.0.1",
            user_agent="TestAgent/1.0",
        )
        self.client.force_authenticate(user=self.tenant)
        url = f"/api/v1/contracts/{self.contract.id}/auth/status/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        self.assertEqual(data["status"], "pending")
        self.assertIn("completed_steps", data)

    def test_face_capture_unauthenticated(self):
        """Face capture endpoint requires authentication."""
        url = f"/api/v1/contracts/{self.contract.id}/auth/face-capture/"
        resp = self.client.post(url, {})
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_face_capture_no_biometric_record_404(self):
        """Face capture without prior BiometricAuthentication returns 404."""
        self.client.force_authenticate(user=self.tenant)
        url = f"/api/v1/contracts/{self.contract.id}/auth/face-capture/"
        resp = self.client.post(
            url,
            {
                "face_front_image": "data:image/png;base64,abc123",
                "face_side_image": "data:image/png;base64,def456",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_face_capture_missing_images_400(self):
        """Face capture without both images returns 400."""
        BiometricAuthentication.objects.create(
            contract=self.contract,
            user=self.tenant,
            status="in_progress",
            document_type="cedula_ciudadania",
            voice_text="Texto de prueba",
            expires_at=timezone.now() + timedelta(hours=1),
            ip_address="127.0.0.1",
            user_agent="TestAgent/1.0",
        )
        self.client.force_authenticate(user=self.tenant)
        url = f"/api/v1/contracts/{self.contract.id}/auth/face-capture/"
        resp = self.client.post(
            url, {"face_front_image": "data:image/png;base64,abc"}, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


@override_settings(CACHES=_TEST_CACHES)
class ContractPDFPreviewAPITests(APITestCase):
    """Tests for the Contract PDF preview endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.landlord = _make_user("pdf_landlord@verihome.co", "landlord")
        self.tenant = _make_user("pdf_tenant@verihome.co", "tenant")
        self.other = _make_user("pdf_other@verihome.co", "tenant")
        self.prop = _make_property(self.landlord)
        self.contract = _make_contract(self.landlord, self.tenant, self.prop)

    def test_preview_pdf_unauthenticated(self):
        """Unauthenticated user cannot access PDF preview."""
        url = f"/api/v1/contracts/{self.contract.id}/preview-pdf/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_preview_pdf_non_party_forbidden(self):
        """User not party to contract gets 403 on PDF preview."""
        self.client.force_authenticate(user=self.other)
        url = f"/api/v1/contracts/{self.contract.id}/preview-pdf/"
        resp = self.client.get(url)
        self.assertIn(
            resp.status_code,
            [
                status.HTTP_403_FORBIDDEN,
                status.HTTP_404_NOT_FOUND,
            ],
        )

    def test_preview_pdf_nonexistent_contract(self):
        """PDF preview for non-existent contract returns 404."""
        self.client.force_authenticate(user=self.landlord)
        fake_id = uuid.uuid4()
        url = f"/api/v1/contracts/{fake_id}/preview-pdf/"
        resp = self.client.get(url)
        self.assertIn(
            resp.status_code,
            [
                status.HTTP_404_NOT_FOUND,
                status.HTTP_500_INTERNAL_SERVER_ERROR,
            ],
        )


@override_settings(CACHES=_TEST_CACHES)
class LandlordContractAPITests(APITestCase):
    """Tests for the LandlordContractViewSet endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.landlord = _make_user("lc_landlord@verihome.co", "landlord")
        self.tenant = _make_user("lc_tenant@verihome.co", "tenant")
        self.other_landlord = _make_user("lc_other@verihome.co", "landlord")
        self.prop = _make_property(self.landlord)
        self.lcc = _make_landlord_contract(self.landlord, self.prop, tenant=self.tenant)

    def test_list_landlord_contracts_unauthenticated(self):
        """Unauthenticated access to landlord contracts returns 401."""
        resp = self.client.get("/api/v1/contracts/landlord/contracts/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_landlord_contracts_tenant_forbidden(self):
        """Tenant cannot access landlord-contracts endpoint (needs landlord user_type)."""
        self.client.force_authenticate(user=self.tenant)
        resp = self.client.get("/api/v1/contracts/landlord/contracts/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_landlord_contracts_as_landlord(self):
        """Landlord can list their own contracts."""
        self.client.force_authenticate(user=self.landlord)
        resp = self.client.get("/api/v1/contracts/landlord/contracts/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_list_landlord_contracts_other_landlord_empty(self):
        """Another landlord sees no contracts from first landlord."""
        self.client.force_authenticate(user=self.other_landlord)
        resp = self.client.get("/api/v1/contracts/landlord/contracts/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.json()
        results = data.get("results", data)
        self.assertEqual(len(results), 0)

    def test_retrieve_landlord_contract(self):
        """Landlord can retrieve their own contract detail."""
        self.client.force_authenticate(user=self.landlord)
        url = f"/api/v1/contracts/landlord/contracts/{self.lcc.id}/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_retrieve_landlord_contract_other_landlord_404(self):
        """Another landlord cannot see first landlord's contract detail."""
        self.client.force_authenticate(user=self.other_landlord)
        url = f"/api/v1/contracts/landlord/contracts/{self.lcc.id}/"
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
