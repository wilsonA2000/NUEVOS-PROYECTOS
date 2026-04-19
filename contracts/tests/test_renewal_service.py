"""
Tests para el servicio de renovación de contratos.
Verifica cálculo de IPC, detección de contratos venciendo, y creación de borradores.
Referencia legal: Artículo 20, Ley 820 de 2003.
"""

from decimal import Decimal
from datetime import date, timedelta

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from contracts.renewal_service import RenewalAlertService, ALERT_THRESHOLDS
from contracts.landlord_contract_models import LandlordControlledContract
from properties.models import Property

User = get_user_model()


class IPCAdjustmentTest(TestCase):
    """Tests para el cálculo de incremento IPC (Art. 20 Ley 820 de 2003)."""

    def test_calculate_ipc_adjustment_basic(self):
        """Test cálculo básico: IPC de 5% sobre canon de 2,500,000 COP."""
        result = RenewalAlertService.calculate_ipc_adjustment(2500000, 5.0)

        self.assertEqual(result['current_rent'], Decimal('2500000'))
        self.assertEqual(result['ipc_rate'], Decimal('5.0'))
        self.assertEqual(result['max_increment'], Decimal('125000.00'))
        self.assertEqual(result['new_rent'], Decimal('2625000.00'))

    def test_calculate_ipc_adjustment_with_decimal_rate(self):
        """Test cálculo con IPC decimal: 5.62% sobre 1,800,000 COP."""
        result = RenewalAlertService.calculate_ipc_adjustment(1800000, 5.62)

        expected_increment = Decimal('101160.00')
        self.assertEqual(result['max_increment'], expected_increment)
        self.assertEqual(result['new_rent'], Decimal('1800000') + expected_increment)

    def test_ipc_zero_rate(self):
        """Test que IPC de 0% no genera incremento."""
        result = RenewalAlertService.calculate_ipc_adjustment(2000000, 0)

        self.assertEqual(result['max_increment'], Decimal('0.00'))
        self.assertEqual(result['new_rent'], Decimal('2000000'))

    def test_ipc_cap_at_100_percent(self):
        """Test que el incremento es exactamente el IPC (nunca mayor al 100% del IPC)."""
        # Con IPC de 10%, el incremento máximo es 10% del canon
        result = RenewalAlertService.calculate_ipc_adjustment(3000000, 10.0)

        self.assertEqual(result['max_increment'], Decimal('300000.00'))
        self.assertEqual(result['new_rent'], Decimal('3300000.00'))

    def test_ipc_negative_rent_raises_error(self):
        """Test que canon negativo lanza ValueError."""
        with self.assertRaises(ValueError) as ctx:
            RenewalAlertService.calculate_ipc_adjustment(-1000000, 5.0)
        self.assertIn('negativo', str(ctx.exception))

    def test_ipc_negative_rate_raises_error(self):
        """Test que tasa IPC negativa lanza ValueError."""
        with self.assertRaises(ValueError) as ctx:
            RenewalAlertService.calculate_ipc_adjustment(2000000, -3.0)
        self.assertIn('negativa', str(ctx.exception))

    def test_ipc_result_keys(self):
        """Test que el resultado contiene todas las claves esperadas."""
        result = RenewalAlertService.calculate_ipc_adjustment(1500000, 4.5)

        expected_keys = {'current_rent', 'ipc_rate', 'max_increment', 'new_rent', 'ipc_source'}
        self.assertEqual(set(result.keys()), expected_keys)

    def test_ipc_with_string_inputs(self):
        """Test que acepta strings como entrada y los convierte a Decimal."""
        result = RenewalAlertService.calculate_ipc_adjustment('2500000', '5.0')

        self.assertIsInstance(result['new_rent'], Decimal)
        self.assertEqual(result['new_rent'], Decimal('2625000.00'))

    def test_ipc_rounding(self):
        """Test que el incremento se redondea a 2 decimales (HALF_UP)."""
        # 1,000,003 * 3.33% = 33,300.0999 -> debería redondearse
        result = RenewalAlertService.calculate_ipc_adjustment(1000003, 3.33)

        # Verificar que max_increment tiene exactamente 2 decimales
        self.assertEqual(result['max_increment'], result['max_increment'].quantize(Decimal('0.01')))


class ExpiringContractsTest(TestCase):
    """Tests para detección de contratos próximos a vencer."""

    def setUp(self):
        """Crear datos de prueba."""
        self.landlord = User.objects.create_user(
            email='landlord_renewal@test.com',
            password='testpass123',
            user_type='landlord',
            first_name='Pedro',
            last_name='Arrendador',
        )
        self.tenant = User.objects.create_user(
            email='tenant_renewal@test.com',
            password='testpass123',
            user_type='tenant',
            first_name='Ana',
            last_name='Arrendataria',
        )
        self.property = Property.objects.create(
            title='Propiedad Renovacion',
            description='Para pruebas de renovacion',
            property_type='apartment',
            rent_price=2000000,
            landlord=self.landlord,
            address='Calle 50 #10-20',
            city='Bogota',
            country='Colombia',
            bedrooms=2,
            bathrooms=1,
            total_area=60,
        )

    def test_check_expiring_contracts_empty(self):
        """Test que no hay contratos venciendo cuando no hay contratos activos."""
        results = RenewalAlertService.check_expiring_contracts()

        self.assertIsInstance(results, dict)
        for days in ALERT_THRESHOLDS:
            self.assertIn(days, results)
            self.assertEqual(results[days]['legacy'], 0)
            self.assertEqual(results[days]['landlord'], 0)

    def test_check_expiring_landlord_contract_60_days(self):
        """Test detección de contrato LandlordControlled venciendo en 60 días."""
        target_date = (timezone.now() + timedelta(days=60)).date()
        LandlordControlledContract.objects.create(
            landlord=self.landlord,
            tenant=self.tenant,
            property=self.property,
            contract_type='rental_urban',
            title='Contrato Vencimiento 60',
            current_state='ACTIVE',
            tenant_identifier=self.tenant.email,
            start_date=target_date - timedelta(days=365),
            end_date=target_date,
        )

        results = RenewalAlertService.check_expiring_contracts()
        self.assertEqual(results[60]['landlord'], 1)

    def test_check_expiring_contracts_30_and_15_days(self):
        """Test detección en umbrales de 30 y 15 días."""
        for days in [30, 15]:
            target_date = (timezone.now() + timedelta(days=days)).date()
            LandlordControlledContract.objects.create(
                landlord=self.landlord,
                tenant=self.tenant,
                property=self.property,
                contract_type='rental_urban',
                title=f'Contrato Vencimiento {days}',
                current_state='ACTIVE',
                tenant_identifier=self.tenant.email,
                start_date=target_date - timedelta(days=365),
                end_date=target_date,
            )

        results = RenewalAlertService.check_expiring_contracts()
        self.assertEqual(results[30]['landlord'], 1)
        self.assertEqual(results[15]['landlord'], 1)

    def test_inactive_contracts_not_detected(self):
        """Test que contratos no activos no son detectados como venciendo."""
        target_date = (timezone.now() + timedelta(days=60)).date()
        LandlordControlledContract.objects.create(
            landlord=self.landlord,
            tenant=self.tenant,
            property=self.property,
            contract_type='rental_urban',
            title='Contrato Cancelado',
            current_state='CANCELLED',
            tenant_identifier=self.tenant.email,
            start_date=target_date - timedelta(days=365),
            end_date=target_date,
        )

        results = RenewalAlertService.check_expiring_contracts()
        self.assertEqual(results[60]['landlord'], 0)

    def test_alert_thresholds_constant(self):
        """Test que los umbrales de alerta son 60, 30 y 15 días."""
        self.assertEqual(ALERT_THRESHOLDS, [60, 30, 15])


class PriorityTest(TestCase):
    """Tests para la asignación de prioridad según días restantes."""

    def test_priority_15_days_is_urgent(self):
        """Test que 15 días o menos es prioridad urgente."""
        self.assertEqual(RenewalAlertService._priority_for_days(15), 'urgent')
        self.assertEqual(RenewalAlertService._priority_for_days(10), 'urgent')
        self.assertEqual(RenewalAlertService._priority_for_days(1), 'urgent')

    def test_priority_30_days_is_high(self):
        """Test que 16-30 días es prioridad alta."""
        self.assertEqual(RenewalAlertService._priority_for_days(30), 'high')
        self.assertEqual(RenewalAlertService._priority_for_days(16), 'high')

    def test_priority_60_days_is_normal(self):
        """Test que más de 30 días es prioridad normal."""
        self.assertEqual(RenewalAlertService._priority_for_days(60), 'normal')
        self.assertEqual(RenewalAlertService._priority_for_days(31), 'normal')


class RenewalDraftTest(TestCase):
    """Tests para creación de borradores de renovación."""

    def setUp(self):
        """Crear datos de prueba."""
        self.landlord = User.objects.create_user(
            email='landlord_draft@test.com',
            password='testpass123',
            user_type='landlord',
            first_name='Jorge',
            last_name='Propietario',
        )
        self.tenant = User.objects.create_user(
            email='tenant_draft@test.com',
            password='testpass123',
            user_type='tenant',
            first_name='Laura',
            last_name='Inquilina',
        )
        self.property = Property.objects.create(
            title='Propiedad Draft',
            description='Para pruebas de borrador de renovacion',
            property_type='house',
            rent_price=3000000,
            landlord=self.landlord,
            address='Carrera 15 #80-10',
            city='Medellin',
            country='Colombia',
            bedrooms=3,
            bathrooms=2,
            total_area=120,
        )

    def test_create_renewal_draft_from_landlord_contract(self):
        """Test creación de borrador de renovación desde LandlordControlledContract."""
        original = LandlordControlledContract.objects.create(
            landlord=self.landlord,
            tenant=self.tenant,
            property=self.property,
            contract_type='rental_urban',
            title='Contrato Original',
            current_state='ACTIVE',
            tenant_identifier=self.tenant.email,
            economic_terms={'monthly_rent': '3000000'},
            start_date=date.today() - timedelta(days=365),
            end_date=date.today() + timedelta(days=30),
        )

        renewal = RenewalAlertService.create_renewal_draft(str(original.pk))

        self.assertIsNotNone(renewal)
        self.assertEqual(renewal.current_state, 'DRAFT')
        self.assertEqual(renewal.landlord, self.landlord)
        self.assertEqual(renewal.tenant, self.tenant)
        self.assertEqual(renewal.property, self.property)
        self.assertIn('Renovación', renewal.title)

    def test_create_renewal_draft_nonexistent_contract(self):
        """Test que renovar un contrato inexistente lanza ValueError."""
        import uuid
        fake_id = str(uuid.uuid4())

        with self.assertRaises(ValueError) as ctx:
            RenewalAlertService.create_renewal_draft(fake_id)
        self.assertIn('No se encontr', str(ctx.exception))

    def test_create_renewal_draft_with_new_rent(self):
        """Test que se puede especificar un nuevo canon en la renovación."""
        original = LandlordControlledContract.objects.create(
            landlord=self.landlord,
            tenant=self.tenant,
            property=self.property,
            contract_type='rental_urban',
            title='Contrato Canon Nuevo',
            current_state='ACTIVE',
            tenant_identifier=self.tenant.email,
            economic_terms={'monthly_rent': '2500000'},
            start_date=date.today() - timedelta(days=365),
            end_date=date.today() + timedelta(days=30),
        )

        renewal = RenewalAlertService.create_renewal_draft(
            str(original.pk),
            new_terms={'monthly_rent': 2625000},
        )

        self.assertEqual(renewal.economic_terms['monthly_rent'], '2625000')

    def test_renewal_dates_follow_original(self):
        """Test que las fechas de renovación empiezan donde termina el original."""
        original_end = date.today() + timedelta(days=30)
        original = LandlordControlledContract.objects.create(
            landlord=self.landlord,
            tenant=self.tenant,
            property=self.property,
            contract_type='rental_urban',
            title='Contrato Fechas',
            current_state='ACTIVE',
            tenant_identifier=self.tenant.email,
            start_date=original_end - timedelta(days=365),
            end_date=original_end,
        )

        renewal = RenewalAlertService.create_renewal_draft(str(original.pk))

        expected_start = original_end + timedelta(days=1)
        self.assertEqual(renewal.start_date, expected_start)
        self.assertIsNotNone(renewal.end_date)
        self.assertGreater(renewal.end_date, renewal.start_date)
