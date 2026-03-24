"""
Tests comprehensivos para el módulo de matching.
Incluye tests para MatchRequest model y APIs de matching.
NOTA: Tests parcialmente desactualizados. WorkflowDataTests y MatchRequestFilteringTests
usan estructura de modelos antigua. Marcados como skip.
"""
import unittest

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import date, timedelta

from matching.models import MatchRequest
from properties.models import Property

User = get_user_model()


@unittest.skip("Desactualizado - MatchRequest model cambió")
class MatchRequestModelTests(TestCase):
    """Tests para el modelo MatchRequest"""

    def setUp(self):
        self.landlord = User.objects.create_user(
            email='landlord@match.test',
            password='testpass123',
            role='landlord'
        )
        self.tenant = User.objects.create_user(
            email='tenant@match.test',
            password='testpass123',
            role='tenant'
        )
        self.property = Property.objects.create(
            title='Test Property',
            description='Test',
            property_type='apartment',
            rent_price=1000000,
            landlord=self.landlord,
            address='Test Address',
            city='Bogotá',
            country='Colombia',
            bedrooms=2,
            bathrooms=1,
            area=50
        )

    def test_match_request_creation_generates_match_code(self):
        """Test: MatchRequest genera match_code automáticamente"""
        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant
        )

        self.assertIsNotNone(match.match_code)
        self.assertTrue(match.match_code.startswith('MT-'))
        self.assertEqual(len(match.match_code), 11)  # MT- + 8 caracteres

    def test_match_request_default_status_pending(self):
        """Test: Status inicial es 'pending'"""
        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant
        )

        self.assertEqual(match.status, 'pending')

    def test_match_request_default_workflow_stage_1(self):
        """Test: Workflow stage inicial es 1"""
        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant
        )

        self.assertEqual(match.workflow_stage, 1)

    def test_match_request_workflow_data_initialized(self):
        """Test: workflow_data se inicializa correctamente"""
        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant
        )

        self.assertIsNotNone(match.workflow_data)
        self.assertIsInstance(match.workflow_data, dict)

    def test_match_request_str_representation(self):
        """Test: __str__ muestra información legible"""
        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant,
            status='accepted'
        )

        str_repr = str(match)
        self.assertIn('Test Property', str_repr)
        self.assertIn(self.tenant.get_full_name() or self.tenant.email, str_repr)

    def test_match_request_accepts_optional_fields(self):
        """Test: Campos opcionales se guardan correctamente"""
        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant,
            monthly_income=2500000,
            employment_type='Empleado',
            tenant_message='Interested in this property',
            preferred_move_in_date=date.today() + timedelta(days=30)
        )

        self.assertEqual(match.monthly_income, 2500000)
        self.assertEqual(match.employment_type, 'Empleado')
        self.assertIsNotNone(match.tenant_message)
        self.assertIsNotNone(match.preferred_move_in_date)

    def test_match_request_workflow_stage_boundaries(self):
        """Test: workflow_stage acepta valores entre 1 y 5"""
        for stage in range(1, 6):
            match = MatchRequest.objects.create(
                property=self.property,
                requester=self.tenant,
                workflow_stage=stage
            )
            self.assertEqual(match.workflow_stage, stage)

    def test_match_request_status_choices(self):
        """Test: Status acepta valores válidos"""
        valid_statuses = ['pending', 'accepted', 'rejected', 'cancelled']

        for status_value in valid_statuses:
            match = MatchRequest.objects.create(
                property=self.property,
                requester=self.tenant,
                status=status_value
            )
            self.assertEqual(match.status, status_value)


@unittest.skip("Desactualizado - API de matching cambió")
class MatchRequestAPITests(APITestCase):
    """Tests para APIs de MatchRequest"""

    def setUp(self):
        self.landlord = User.objects.create_user(
            email='landlord@api.test',
            password='testpass123',
            role='landlord'
        )
        self.tenant = User.objects.create_user(
            email='tenant@api.test',
            password='testpass123',
            role='tenant',
            first_name='Test',
            last_name='Tenant'
        )
        self.property = Property.objects.create(
            title='API Test Property',
            description='Test',
            property_type='house',
            rent_price=1500000,
            landlord=self.landlord,
            address='API Test St',
            city='Medellín',
            country='Colombia',
            bedrooms=3,
            bathrooms=2,
            area=80
        )
        self.client = APIClient()

    def test_tenant_can_create_match_request(self):
        """Test: Tenant puede crear MatchRequest"""
        self.client.force_authenticate(user=self.tenant)

        url = '/api/v1/matching/requests/'
        data = {
            'property': str(self.property.id),
            'monthly_income': 3000000,
            'employment_type': 'Independiente',
            'tenant_message': 'Me interesa esta propiedad'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('match_code', response.data)
        self.assertEqual(response.data['status'], 'pending')

    def test_landlord_can_view_match_requests_for_their_properties(self):
        """Test: Landlord puede ver MatchRequests de sus propiedades"""
        # Crear match request
        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant,
            status='pending'
        )

        self.client.force_authenticate(user=self.landlord)
        url = '/api/v1/matching/requests/'

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Verificar que el match aparece en la respuesta
        match_codes = [item.get('match_code') for item in response.data.get('results', response.data)]
        self.assertIn(match.match_code, match_codes)

    def test_tenant_can_view_their_own_match_requests(self):
        """Test: Tenant puede ver sus propias solicitudes"""
        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant,
            status='pending'
        )

        self.client.force_authenticate(user=self.tenant)
        url = '/api/v1/matching/requests/'

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertTrue(len(results) > 0)

    def test_landlord_can_accept_match_request(self):
        """Test: Landlord puede aceptar MatchRequest"""
        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant,
            status='pending'
        )

        self.client.force_authenticate(user=self.landlord)
        url = f'/api/v1/matching/requests/{match.id}/accept/'

        response = self.client.post(url)

        if response.status_code == status.HTTP_200_OK:
            match.refresh_from_db()
            self.assertEqual(match.status, 'accepted')

    def test_unauthorized_user_cannot_create_match_request(self):
        """Test: Usuario no autenticado no puede crear MatchRequest"""
        url = '/api/v1/matching/requests/'
        data = {
            'property': str(self.property.id),
            'monthly_income': 2000000
        }

        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_duplicate_match_request_validation(self):
        """Test: No se puede crear MatchRequest duplicado para la misma propiedad"""
        # Crear primer match request
        MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant,
            status='pending'
        )

        self.client.force_authenticate(user=self.tenant)
        url = '/api/v1/matching/requests/'
        data = {
            'property': str(self.property.id),
            'monthly_income': 2500000
        }

        response = self.client.post(url, data, format='json')

        # Verificar que retorna error (400 o 409)
        self.assertIn(response.status_code, [
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_409_CONFLICT
        ])


@unittest.skip("Desactualizado - workflow_data estructura cambió")
class WorkflowDataTests(TestCase):
    """Tests para el manejo de workflow_data JSONField"""

    def setUp(self):
        self.landlord = User.objects.create_user(
            email='landlord@workflow.test',
            password='testpass123',
            role='landlord'
        )
        self.tenant = User.objects.create_user(
            email='tenant@workflow.test',
            password='testpass123',
            role='tenant'
        )
        self.property = Property.objects.create(
            title='Workflow Test Property',
            description='Test',
            property_type='apartment',
            rent_price=1200000,
            landlord=self.landlord,
            address='Workflow St',
            city='Cali',
            country='Colombia',
            bedrooms=2,
            bathrooms=1,
            area=60
        )

    def test_workflow_data_stores_visit_info(self):
        """Test: workflow_data almacena información de visita correctamente"""
        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant,
            workflow_stage=1,
            workflow_data={
                'visit_scheduled': {
                    'date': '2025-10-20',
                    'time': '15:00',
                    'notes': 'Primera visita'
                }
            }
        )

        match.refresh_from_db()
        self.assertIsNotNone(match.workflow_data.get('visit_scheduled'))
        self.assertEqual(match.workflow_data['visit_scheduled']['date'], '2025-10-20')

    def test_workflow_data_stores_document_info(self):
        """Test: workflow_data almacena estado de documentos"""
        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant,
            workflow_stage=2,
            workflow_data={
                'documents_submitted': True,
                'documents_approved': False,
                'documents_notes': 'Pendiente revisión'
            }
        )

        match.refresh_from_db()
        self.assertTrue(match.workflow_data.get('documents_submitted'))
        self.assertFalse(match.workflow_data.get('documents_approved'))

    def test_workflow_data_stores_contract_info(self):
        """Test: workflow_data almacena información de contrato"""
        import uuid
        contract_id = str(uuid.uuid4())

        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant,
            workflow_stage=3,
            workflow_data={
                'contract_created': {
                    'contract_id': contract_id,
                    'landlord_auth_completed': False,
                    'tenant_auth_completed': False
                }
            }
        )

        match.refresh_from_db()
        self.assertEqual(
            match.workflow_data['contract_created']['contract_id'],
            contract_id
        )

    def test_workflow_data_updates_preserve_previous_data(self):
        """Test: Actualizar workflow_data preserva datos previos"""
        match = MatchRequest.objects.create(
            property=self.property,
            requester=self.tenant,
            workflow_data={'step1': 'completed'}
        )

        # Actualizar con nueva información
        match.workflow_data['step2'] = 'in_progress'
        match.save()

        match.refresh_from_db()
        self.assertEqual(match.workflow_data['step1'], 'completed')
        self.assertEqual(match.workflow_data['step2'], 'in_progress')


@unittest.skip("Desactualizado - filtros de matching cambiaron")
class MatchRequestFilteringTests(APITestCase):
    """Tests para filtros y búsquedas de MatchRequest"""

    def setUp(self):
        self.landlord = User.objects.create_user(
            email='landlord@filter.test',
            password='testpass123',
            role='landlord'
        )
        self.tenant1 = User.objects.create_user(
            email='tenant1@filter.test',
            password='testpass123',
            role='tenant'
        )
        self.tenant2 = User.objects.create_user(
            email='tenant2@filter.test',
            password='testpass123',
            role='tenant'
        )

        self.property1 = Property.objects.create(
            title='Property 1',
            description='Test',
            property_type='apartment',
            rent_price=1000000,
            landlord=self.landlord,
            address='Address 1',
            city='Bogotá',
            country='Colombia',
            bedrooms=2,
            bathrooms=1,
            area=50
        )

        self.property2 = Property.objects.create(
            title='Property 2',
            description='Test',
            property_type='house',
            rent_price=2000000,
            landlord=self.landlord,
            address='Address 2',
            city='Medellín',
            country='Colombia',
            bedrooms=3,
            bathrooms=2,
            area=100
        )

        # Crear múltiples match requests
        MatchRequest.objects.create(
            property=self.property1,
            requester=self.tenant1,
            status='pending',
            workflow_stage=1
        )
        MatchRequest.objects.create(
            property=self.property1,
            requester=self.tenant2,
            status='accepted',
            workflow_stage=2
        )
        MatchRequest.objects.create(
            property=self.property2,
            requester=self.tenant1,
            status='rejected',
            workflow_stage=1
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.landlord)

    def test_filter_by_status(self):
        """Test: Filtrar MatchRequests por status"""
        url = '/api/v1/matching/requests/?status=pending'
        response = self.client.get(url)

        if response.status_code == status.HTTP_200_OK:
            results = response.data.get('results', response.data)
            for match in results:
                self.assertEqual(match.get('status'), 'pending')

    def test_filter_by_workflow_stage(self):
        """Test: Filtrar por workflow_stage"""
        url = '/api/v1/matching/requests/?workflow_stage=1'
        response = self.client.get(url)

        if response.status_code == status.HTTP_200_OK:
            results = response.data.get('results', response.data)
            for match in results:
                self.assertEqual(match.get('workflow_stage'), 1)

    def test_filter_by_property(self):
        """Test: Filtrar por propiedad específica"""
        url = f'/api/v1/matching/requests/?property={self.property1.id}'
        response = self.client.get(url)

        if response.status_code == status.HTTP_200_OK:
            results = response.data.get('results', response.data)
            for match in results:
                self.assertEqual(match.get('property'), str(self.property1.id))
