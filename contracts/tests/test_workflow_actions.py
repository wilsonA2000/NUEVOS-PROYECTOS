"""
Tests comprehensivos para el módulo de contratos.
Incluye tests para workflow-action endpoint y sistema de eliminación completa.
"""

from django.test import TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from unittest.mock import patch
import uuid

from contracts.models import Contract, LandlordControlledContract
from matching.models import MatchRequest
from requests.models import TenantDocument
from properties.models import Property

User = get_user_model()


class WorkflowActionEndpointTests(APITestCase):
    """Tests para el endpoint /api/v1/contracts/workflow-action/"""

    def setUp(self):
        """Setup inicial para cada test"""
        # Crear usuarios
        self.landlord = User.objects.create_user(
            email="landlord@test.com",
            password="testpass123",
            user_type="landlord",
            first_name="Landlord",
            last_name="Test",
        )
        self.tenant = User.objects.create_user(
            email="tenant@test.com",
            password="testpass123",
            user_type="tenant",
            first_name="Tenant",
            last_name="Test",
        )

        # Crear propiedad
        self.property = Property.objects.create(
            title="Test Property",
            description="Test Description",
            property_type="apartment",
            rent_price=1000000,
            landlord=self.landlord,
            address="Test Address",
            city="Bogotá",
            country="Colombia",
            bedrooms=2,
            bathrooms=1,
            total_area=50,
        )

        # Crear MatchRequest
        self.match_request = MatchRequest.objects.create(
            property=self.property,
            tenant=self.tenant,
            landlord=self.landlord,
            status="accepted",
            workflow_stage=1,
            workflow_data={"visit_scheduled": None},
        )

        # Autenticar como landlord
        self.client = APIClient()
        self.client.force_authenticate(user=self.landlord)

    def test_visit_schedule_action(self):
        """Test: Programar visita actualiza workflow_data correctamente"""
        url = "/api/v1/contracts/workflow-action/"
        data = {
            "match_request_id": str(self.match_request.id),
            "action": "visit_schedule",
            "visit_data": {
                "date": "2025-10-20",
                "time": "14:00",
                "notes": "Visita programada para prueba",
            },
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("success", response.data)
        self.assertTrue(response.data["success"])

        # Verificar que workflow_data se actualizó
        self.match_request.refresh_from_db()
        self.assertIsNotNone(self.match_request.workflow_data.get("visit_scheduled"))
        self.assertEqual(
            self.match_request.workflow_data["visit_scheduled"]["date"], "2025-10-20"
        )

    def test_visit_completed_action(self):
        """Test: Aprobar visita avanza a etapa 2 (documentos)"""
        # Pre-condición: visita ya programada
        self.match_request.workflow_data = {
            "visit_scheduled": {"date": "2025-10-15", "time": "10:00"}
        }
        self.match_request.save()

        url = "/api/v1/contracts/workflow-action/"
        data = {
            "match_request_id": str(self.match_request.id),
            "action": "visit_completed",
            "evaluation_notes": "Visita exitosa",
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.match_request.refresh_from_db()
        self.assertEqual(self.match_request.workflow_stage, 2)

    def test_reject_action_deletes_completely(self):
        """Test: Rechazar candidato elimina MatchRequest y cascades a TenantDocuments"""
        # Crear TenantDocument asociado
        TenantDocument.objects.create(
            uploaded_by=self.tenant,
            match_request=self.match_request,
            document_type="cedula",
            document_file="test.pdf",
            file_size=1024,
        )

        match_code = self.match_request.match_code
        match_id = str(self.match_request.id)

        url = "/api/v1/contracts/workflow-action/"
        data = {
            "match_request_id": match_id,
            "action": "reject",
            "rejection_reason": "Test rejection",
        }

        response = self.client.post(url, data, format="json")

        # Verificar respuesta
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("deleted"))
        self.assertTrue(response.data.get("tenant_can_reapply"))
        self.assertEqual(response.data.get("match_code"), match_code)

        # Verificar eliminación completa
        self.assertFalse(MatchRequest.objects.filter(id=match_id).exists())
        self.assertFalse(
            TenantDocument.objects.filter(match_request_id=match_id).exists()
        )

    def test_reject_action_deletes_contracts(self):
        """Test: Rechazar elimina Contracts y LandlordControlledContracts relacionados"""
        # Crear contratos relacionados
        contract = Contract.objects.create(
            property=self.property,
            primary_party=self.landlord,
            secondary_party=self.tenant,
            start_date="2025-11-01",
            end_date="2026-11-01",
            monthly_rent=1000000,
            security_deposit=1000000,
        )

        landlord_contract = LandlordControlledContract.objects.create(
            id=contract.id,
            property=self.property,
            landlord=self.landlord,
            tenant=self.tenant,
            tenant_identifier=self.tenant.email,
            contract_type="rental_urban",
            title="Test Contract",
        )

        # Actualizar workflow_data con contract_id
        self.match_request.workflow_stage = 3
        self.match_request.workflow_data = {
            "contract_created": {"contract_id": str(contract.id)}
        }
        self.match_request.save()

        url = "/api/v1/contracts/workflow-action/"
        data = {
            "match_request_id": str(self.match_request.id),
            "action": "reject",
            "rejection_reason": "Test rejection with contracts",
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Verificar eliminación de contratos
        self.assertFalse(Contract.objects.filter(id=contract.id).exists())
        self.assertFalse(
            LandlordControlledContract.objects.filter(id=landlord_contract.id).exists()
        )

    def test_cancel_action_same_as_reject(self):
        """Test: Acción 'cancel' tiene el mismo comportamiento que 'reject'"""
        match_id = str(self.match_request.id)

        url = "/api/v1/contracts/workflow-action/"
        data = {
            "match_request_id": match_id,
            "action": "cancel",
            "rejection_reason": "Cancelled by landlord",
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("deleted"))
        self.assertFalse(MatchRequest.objects.filter(id=match_id).exists())

    def test_documents_approved_action(self):
        """Test: Aprobar documentos avanza a etapa 3 (contrato)"""
        self.match_request.workflow_stage = 2
        self.match_request.save()

        url = "/api/v1/contracts/workflow-action/"
        data = {
            "match_request_id": str(self.match_request.id),
            "action": "documents_approved",
            "documents_data": {"approved": True, "notes": "Documentos verificados"},
        }

        response = self.client.post(url, data, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.match_request.refresh_from_db()
        self.assertEqual(self.match_request.workflow_stage, 3)

    def test_unauthorized_access_denied(self):
        """Test: Usuario no autenticado no puede acceder al endpoint"""
        self.client.logout()

        url = "/api/v1/contracts/workflow-action/"
        data = {"match_request_id": str(self.match_request.id), "action": "reject"}

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_nonexistent_match_request_returns_404(self):
        """Test: MatchRequest inexistente retorna 404"""
        fake_id = str(uuid.uuid4())

        url = "/api/v1/contracts/workflow-action/"
        data = {"match_request_id": fake_id, "action": "reject"}

        response = self.client.post(url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ContractCascadeDeletionTests(TransactionTestCase):
    """Tests para verificar eliminación en cascada correcta"""

    def setUp(self):
        self.landlord = User.objects.create_user(
            email="landlord2@test.com", password="testpass123", user_type="landlord"
        )
        self.tenant = User.objects.create_user(
            email="tenant2@test.com", password="testpass123", user_type="tenant"
        )
        self.property = Property.objects.create(
            title="Test Property 2",
            description="Test",
            property_type="apartment",
            rent_price=1500000,
            landlord=self.landlord,
            address="Test Address 2",
            city="Medellín",
            country="Colombia",
            bedrooms=3,
            bathrooms=2,
            total_area=80,
        )

    def test_match_request_deletion_cascades_to_documents(self):
        """Test: Eliminar MatchRequest elimina automáticamente TenantDocuments"""
        match_request = MatchRequest.objects.create(
            property=self.property,
            tenant=self.tenant,
            landlord=self.landlord,
            status="accepted",
            workflow_stage=2,
        )

        # Crear múltiples documentos
        doc1 = TenantDocument.objects.create(
            uploaded_by=self.tenant,
            match_request=match_request,
            document_type="cedula",
            document_file="cedula.pdf",
            file_size=1024,
        )
        doc2 = TenantDocument.objects.create(
            uploaded_by=self.tenant,
            match_request=match_request,
            document_type="recibo_servicios",
            document_file="recibo.pdf",
            file_size=2048,
        )

        doc1_id = doc1.id
        doc2_id = doc2.id

        # Eliminar MatchRequest
        match_request.delete()

        # Verificar cascade
        self.assertFalse(TenantDocument.objects.filter(id=doc1_id).exists())
        self.assertFalse(TenantDocument.objects.filter(id=doc2_id).exists())


class WorkflowStageProgressionTests(APITestCase):
    """Tests para verificar progresión correcta entre etapas del workflow"""

    def setUp(self):
        self.landlord = User.objects.create_user(
            email="landlord3@test.com", password="testpass123", user_type="landlord"
        )
        self.tenant = User.objects.create_user(
            email="tenant3@test.com", password="testpass123", user_type="tenant"
        )
        self.property = Property.objects.create(
            title="Workflow Test Property",
            description="Test",
            property_type="house",
            rent_price=2000000,
            landlord=self.landlord,
            address="Test St",
            city="Cali",
            country="Colombia",
            bedrooms=4,
            bathrooms=3,
            total_area=120,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.landlord)

    def test_complete_workflow_stage_progression(self):
        """Test: Verificar progresión completa stage 1 → 2 → 3"""
        match = MatchRequest.objects.create(
            property=self.property,
            tenant=self.tenant,
            landlord=self.landlord,
            status="accepted",
            workflow_stage=1,
        )

        url = "/api/v1/contracts/workflow-action/"

        # ETAPA 1 → 2: Visita completada
        response = self.client.post(
            url,
            {"match_request_id": str(match.id), "action": "visit_completed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        match.refresh_from_db()
        self.assertEqual(match.workflow_stage, 2)

        # ETAPA 2 → 3: Documentos aprobados
        response = self.client.post(
            url,
            {
                "match_request_id": str(match.id),
                "action": "documents_approved",
                "documents_data": {"approved": True},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        match.refresh_from_db()
        self.assertEqual(match.workflow_stage, 3)

    def test_reject_available_at_any_stage_before_execution(self):
        """Test: Rechazo disponible en etapas 1-4, no en etapa 5"""
        url = "/api/v1/contracts/workflow-action/"

        # Test etapa 1
        match1 = MatchRequest.objects.create(
            property=self.property,
            tenant=self.tenant,
            landlord=self.landlord,
            workflow_stage=1,
        )
        response = self.client.post(
            url, {"match_request_id": str(match1.id), "action": "reject"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("deleted"))

        # Test etapa 2
        match2 = MatchRequest.objects.create(
            property=self.property,
            tenant=self.tenant,
            landlord=self.landlord,
            workflow_stage=2,
        )
        response = self.client.post(
            url, {"match_request_id": str(match2.id), "action": "reject"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("deleted"))

        # Test etapa 3
        match3 = MatchRequest.objects.create(
            property=self.property,
            tenant=self.tenant,
            landlord=self.landlord,
            workflow_stage=3,
        )
        response = self.client.post(
            url, {"match_request_id": str(match3.id), "action": "reject"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("deleted"))

        # Test etapa 4
        match4 = MatchRequest.objects.create(
            property=self.property,
            tenant=self.tenant,
            landlord=self.landlord,
            workflow_stage=4,
        )
        response = self.client.post(
            url, {"match_request_id": str(match4.id), "action": "reject"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("deleted"))


class ActivityLogTests(APITestCase):
    """Tests para verificar logging de actividades de workflow"""

    def setUp(self):
        self.landlord = User.objects.create_user(
            email="landlord4@test.com", password="testpass123", user_type="landlord"
        )
        self.tenant = User.objects.create_user(
            email="tenant4@test.com", password="testpass123", user_type="tenant"
        )
        self.property = Property.objects.create(
            title="Log Test Property",
            description="Test",
            property_type="apartment",
            rent_price=1200000,
            landlord=self.landlord,
            address="Log St",
            city="Barranquilla",
            country="Colombia",
            bedrooms=2,
            bathrooms=1,
            total_area=60,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.landlord)

    @patch("users.models.UserActivityLog")
    def test_rejection_logs_activity_before_deletion(self, mock_activity_log):
        """Test: Rechazo registra actividad ANTES de eliminar"""
        match = MatchRequest.objects.create(
            property=self.property,
            tenant=self.tenant,
            landlord=self.landlord,
            workflow_stage=2,
        )

        url = "/api/v1/contracts/workflow-action/"
        data = {
            "match_request_id": str(match.id),
            "action": "reject",
            "rejection_reason": "Test logging",
        }

        self.client.post(url, data, format="json")

        # Verificar que se intentó crear log
        self.assertTrue(mock_activity_log.objects.create.called)
        call_kwargs = mock_activity_log.objects.create.call_args[1]
        self.assertEqual(call_kwargs["activity_type"], "workflow_match_deleted")
        self.assertEqual(call_kwargs["user"], self.landlord)
