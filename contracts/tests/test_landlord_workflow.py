"""
Tests para el workflow de LandlordControlledContract.
Verifica transiciones de estado, inmutabilidad y flujo biométrico.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta

from contracts.landlord_contract_models import (
    ContractWorkflowHistory,
    LandlordControlledContract,
)
from properties.models import Property

User = get_user_model()


class LandlordContractWorkflowTest(TestCase):
    """Tests para el workflow de estados del contrato controlado por arrendador."""

    def setUp(self):
        """Crear datos de prueba: usuarios, propiedad y contrato borrador."""
        self.landlord = User.objects.create_user(
            email='landlord_workflow@test.com',
            password='testpass123',
            user_type='landlord',
            first_name='Carlos',
            last_name='Arrendador',
        )
        self.tenant = User.objects.create_user(
            email='tenant_workflow@test.com',
            password='testpass123',
            user_type='tenant',
            first_name='Maria',
            last_name='Arrendataria',
        )
        self.admin_user = User.objects.create_superuser(
            email='admin_workflow@test.com',
            password='adminpass123',
            user_type='landlord',
            first_name='Admin',
            last_name='VeriHome',
        )
        self.property = Property.objects.create(
            title='Apartamento Test Workflow',
            description='Apartamento para pruebas de workflow',
            property_type='apartment',
            rent_price=2000000,
            landlord=self.landlord,
            address='Calle 100 #15-20',
            city='Bogota',
            country='Colombia',
            bedrooms=3,
            bathrooms=2,
            total_area=85,
        )

    def _create_contract(self, state='PENDING_ADMIN_REVIEW', **kwargs):
        """Helper para crear un contrato en un estado determinado."""
        defaults = {
            'landlord': self.landlord,
            'tenant': self.tenant,
            'property': self.property,
            'contract_type': 'rental_urban',
            'title': 'Contrato de Prueba Workflow',
            'current_state': state,
            'tenant_identifier': self.tenant.email,
            'landlord_data': {'full_name': 'Carlos Arrendador', 'cedula': '1098765432'},
            'economic_terms': {'monthly_rent': '2000000', 'deposit': '2000000'},
            'contract_terms': {'duration_months': 12},
        }
        defaults.update(kwargs)
        return LandlordControlledContract.objects.create(**defaults)

    # ------------------------------------------------------------------
    # Test: Creación en estado DRAFT/PENDING_ADMIN_REVIEW
    # ------------------------------------------------------------------

    def test_create_draft_contract(self):
        """Test que un contrato nuevo se crea en estado PENDING_ADMIN_REVIEW por defecto."""
        contract = LandlordControlledContract(
            landlord=self.landlord,
            tenant=self.tenant,
            property=self.property,
            contract_type='rental_urban',
            title='Contrato Nuevo',
            tenant_identifier=self.tenant.email,
        )
        contract.save()

        self.assertEqual(contract.current_state, 'PENDING_ADMIN_REVIEW')
        self.assertIsNotNone(contract.contract_number)
        self.assertTrue(contract.contract_number.startswith('VH-'))
        self.assertFalse(contract.is_locked)

    def test_contract_number_auto_generated(self):
        """Test que el numero de contrato se genera automaticamente."""
        contract = self._create_contract()
        self.assertRegex(contract.contract_number, r'^VH-\d{4}-\d{6}$')

    def test_contract_unique_numbers(self):
        """Test que cada contrato recibe un numero unico."""
        c1 = self._create_contract()
        c2 = self._create_contract()
        self.assertNotEqual(c1.contract_number, c2.contract_number)

    # ------------------------------------------------------------------
    # Test: Transiciones validas de estado
    # ------------------------------------------------------------------

    def test_transition_pending_admin_to_draft(self):
        """Test transicion PENDING_ADMIN_REVIEW -> DRAFT (admin aprueba)."""
        contract = self._create_contract(state='PENDING_ADMIN_REVIEW')
        self.assertTrue(contract.can_transition_to('DRAFT'))

    def test_transition_draft_to_landlord_completing(self):
        """Test transicion DRAFT -> LANDLORD_COMPLETING."""
        contract = self._create_contract(state='DRAFT')
        self.assertTrue(contract.can_transition_to('LANDLORD_COMPLETING'))

    def test_transition_landlord_completing_to_tenant_invited(self):
        """Test transicion LANDLORD_COMPLETING -> TENANT_INVITED."""
        contract = self._create_contract(state='LANDLORD_COMPLETING')
        self.assertTrue(contract.can_transition_to('TENANT_INVITED'))

    def test_transition_tenant_reviewing_to_tenant_data_pending(self):
        """Test transicion TENANT_REVIEWING -> TENANT_DATA_PENDING (aprobacion)."""
        contract = self._create_contract(state='TENANT_REVIEWING')
        self.assertTrue(contract.can_transition_to('TENANT_DATA_PENDING'))

    # ------------------------------------------------------------------
    # Test: Flujo biometrico completo
    # ------------------------------------------------------------------

    def test_biometric_workflow_states(self):
        """Test secuencia biometrica: TENANT_DATA_PENDING -> TENANT_AUTH -> TENANT_SIGNED -> LANDLORD_AUTH -> LANDLORD_SIGNED."""
        contract = self._create_contract(state='TENANT_DATA_PENDING')

        # Tenant authentication
        self.assertTrue(contract.can_transition_to('TENANT_AUTHENTICATION'))
        contract.current_state = 'TENANT_AUTHENTICATION'
        contract.save()

        # Tenant signed
        self.assertTrue(contract.can_transition_to('TENANT_SIGNED'))
        contract.current_state = 'TENANT_SIGNED'
        contract.save()

        # Landlord authentication
        self.assertTrue(contract.can_transition_to('LANDLORD_AUTHENTICATION'))
        contract.current_state = 'LANDLORD_AUTHENTICATION'
        contract.save()

        # Landlord signed
        self.assertTrue(contract.can_transition_to('LANDLORD_SIGNED'))
        contract.current_state = 'LANDLORD_SIGNED'
        contract.save()

        # Ready to publish
        self.assertTrue(contract.can_transition_to('READY_TO_PUBLISH'))
        contract.current_state = 'READY_TO_PUBLISH'
        contract.save()

        # Published
        self.assertTrue(contract.can_transition_to('PUBLISHED'))
        contract.current_state = 'PUBLISHED'
        contract.save()

        # Active
        self.assertTrue(contract.can_transition_to('ACTIVE'))

    # ------------------------------------------------------------------
    # Test: Transiciones invalidas
    # ------------------------------------------------------------------

    def test_invalid_state_transition_draft_to_published(self):
        """Test que DRAFT no puede saltar directamente a PUBLISHED."""
        contract = self._create_contract(state='DRAFT')
        self.assertFalse(contract.can_transition_to('PUBLISHED'))

    def test_invalid_state_transition_pending_to_active(self):
        """Test que PENDING_ADMIN_REVIEW no puede saltar a ACTIVE."""
        contract = self._create_contract(state='PENDING_ADMIN_REVIEW')
        self.assertFalse(contract.can_transition_to('ACTIVE'))

    def test_invalid_state_transition_tenant_reviewing_to_landlord_signed(self):
        """Test que TENANT_REVIEWING no puede saltar a LANDLORD_SIGNED."""
        contract = self._create_contract(state='TENANT_REVIEWING')
        self.assertFalse(contract.can_transition_to('LANDLORD_SIGNED'))

    def test_terminated_has_no_transitions(self):
        """Test que TERMINATED es un estado final sin transiciones."""
        contract = self._create_contract(state='TERMINATED')
        for state_code, _ in LandlordControlledContract.WORKFLOW_STATES:
            self.assertFalse(
                contract.can_transition_to(state_code),
                f"TERMINATED no deberia poder transicionar a {state_code}",
            )

    def test_cancelled_has_no_transitions(self):
        """Test que CANCELLED es un estado final sin transiciones."""
        contract = self._create_contract(state='CANCELLED')
        for state_code, _ in LandlordControlledContract.WORKFLOW_STATES:
            self.assertFalse(
                contract.can_transition_to(state_code),
                f"CANCELLED no deberia poder transicionar a {state_code}",
            )

    # ------------------------------------------------------------------
    # Test: Flujo circular (devolucion del arrendatario)
    # ------------------------------------------------------------------

    def test_circular_workflow_tenant_returns(self):
        """Test flujo circular: TENANT_REVIEWING -> TENANT_RETURNED -> LANDLORD_CORRECTING -> RE_PENDING_ADMIN -> DRAFT."""
        contract = self._create_contract(state='TENANT_REVIEWING')

        # Tenant devuelve
        self.assertTrue(contract.can_transition_to('TENANT_RETURNED'))
        contract.current_state = 'TENANT_RETURNED'
        contract.save()

        # Landlord corrige
        self.assertTrue(contract.can_transition_to('LANDLORD_CORRECTING'))
        contract.current_state = 'LANDLORD_CORRECTING'
        contract.save()

        # Re-envio a admin
        self.assertTrue(contract.can_transition_to('RE_PENDING_ADMIN'))
        contract.current_state = 'RE_PENDING_ADMIN'
        contract.save()

        # Admin re-aprueba a DRAFT
        self.assertTrue(contract.can_transition_to('DRAFT'))

    # ------------------------------------------------------------------
    # Test: Inmutabilidad
    # ------------------------------------------------------------------

    def test_locked_contract_cannot_modify_critical_fields(self):
        """Test que un contrato bloqueado no permite modificar campos criticos."""
        contract = self._create_contract(state='PUBLISHED')
        contract.is_locked = True
        contract.locked_at = timezone.now()
        contract.locked_reason = 'biometric_complete'
        contract.save()

        # Intentar modificar datos economicos
        contract.economic_terms = {'monthly_rent': '5000000'}
        with self.assertRaises(ValidationError):
            contract.save()

    def test_locked_contract_allows_state_transition(self):
        """Test que un contrato bloqueado si permite cambios de estado permitidos."""
        contract = self._create_contract(state='PUBLISHED')
        contract.is_locked = True
        contract.locked_at = timezone.now()
        contract.locked_reason = 'biometric_complete'
        contract.save()

        # Cambiar solo el estado (campo permitido)
        contract.current_state = 'ACTIVE'
        contract.save(update_fields=['current_state'])
        contract.refresh_from_db()
        self.assertEqual(contract.current_state, 'ACTIVE')

    # ------------------------------------------------------------------
    # Test: Responsable actual
    # ------------------------------------------------------------------

    def test_responsible_party_admin_states(self):
        """Test que los estados de admin retornan 'admin'."""
        contract = self._create_contract(state='PENDING_ADMIN_REVIEW')
        self.assertEqual(contract.get_current_responsible_party(), 'admin')

        contract.current_state = 'RE_PENDING_ADMIN'
        self.assertEqual(contract.get_current_responsible_party(), 'admin')

    def test_responsible_party_landlord_states(self):
        """Test que los estados de arrendador retornan 'landlord'."""
        for state in ['DRAFT', 'LANDLORD_COMPLETING', 'LANDLORD_CORRECTING']:
            contract = self._create_contract(state=state)
            self.assertEqual(
                contract.get_current_responsible_party(), 'landlord',
                f"Estado {state} deberia tener responsable 'landlord'",
            )

    def test_responsible_party_tenant_states(self):
        """Test que los estados de arrendatario retornan 'tenant'."""
        for state in ['TENANT_REVIEWING', 'TENANT_DATA_PENDING']:
            contract = self._create_contract(state=state)
            self.assertEqual(
                contract.get_current_responsible_party(), 'tenant',
                f"Estado {state} deberia tener responsable 'tenant'",
            )

    # ------------------------------------------------------------------
    # Test: Editabilidad
    # ------------------------------------------------------------------

    def test_editable_by_landlord_in_draft(self):
        """Test que el arrendador puede editar en estado DRAFT."""
        contract = self._create_contract(state='DRAFT')
        self.assertTrue(contract.is_editable_by_landlord())

    def test_not_editable_by_landlord_when_locked(self):
        """Test que el arrendador NO puede editar un contrato bloqueado."""
        contract = self._create_contract(state='DRAFT')
        contract.is_locked = True
        self.assertFalse(contract.is_editable_by_landlord())

    def test_not_editable_in_published_state(self):
        """Test que nadie puede editar un contrato en estado PUBLISHED."""
        contract = self._create_contract(state='PUBLISHED')
        self.assertFalse(contract.is_editable())

    def test_not_editable_in_active_state(self):
        """Test que nadie puede editar un contrato ACTIVE."""
        contract = self._create_contract(state='ACTIVE')
        self.assertFalse(contract.is_editable())

    # ------------------------------------------------------------------
    # Test: Historial de workflow
    # ------------------------------------------------------------------

    def test_add_workflow_entry(self):
        """Test que se pueden agregar entradas al historial de workflow.

        1.9.2: add_workflow_entry ahora persiste en ContractWorkflowHistory.
        """
        contract = self._create_contract(state='DRAFT')
        entries_before = ContractWorkflowHistory.objects.filter(contract=contract).count()

        contract.add_workflow_entry(
            action='STATE_CHANGE',
            user=self.landlord,
            details={'new_state': 'LANDLORD_COMPLETING', 'description': 'test'},
        )

        entries_after = ContractWorkflowHistory.objects.filter(contract=contract).count()
        self.assertEqual(entries_after - entries_before, 1)
        entry = ContractWorkflowHistory.objects.filter(
            contract=contract
        ).order_by('-timestamp').first()
        self.assertEqual(entry.action_type, 'STATE_CHANGE')
        self.assertEqual(entry.performed_by_id, self.landlord.id)
        self.assertEqual(entry.old_state, 'DRAFT')
        self.assertEqual(entry.new_state, 'LANDLORD_COMPLETING')

    def test_workflow_history_preserves_entries(self):
        """Test que multiples entradas se preservan en ContractWorkflowHistory."""
        contract = self._create_contract(state='DRAFT')
        entries_before = ContractWorkflowHistory.objects.filter(contract=contract).count()

        contract.add_workflow_entry(action='APPROVE', user=self.landlord)
        contract.add_workflow_entry(action='SIGN', user=self.tenant)

        entries_after = ContractWorkflowHistory.objects.filter(contract=contract).count()
        self.assertEqual(entries_after - entries_before, 2)
        action_types = list(
            ContractWorkflowHistory.objects.filter(
                contract=contract,
                action_type__in=['APPROVE', 'SIGN'],
            ).values_list('action_type', flat=True)
        )
        self.assertIn('APPROVE', action_types)
        self.assertIn('SIGN', action_types)

    # ------------------------------------------------------------------
    # Test: Cancelacion desde cualquier estado editable
    # ------------------------------------------------------------------

    def test_cancel_from_editable_states(self):
        """Test que se puede cancelar desde la mayoria de estados editables."""
        cancellable_states = [
            'PENDING_ADMIN_REVIEW', 'DRAFT', 'LANDLORD_COMPLETING',
            'TENANT_INVITED', 'TENANT_REVIEWING',
        ]
        for state in cancellable_states:
            contract = self._create_contract(state=state)
            self.assertTrue(
                contract.can_transition_to('CANCELLED'),
                f"Deberia poder cancelar desde {state}",
            )
