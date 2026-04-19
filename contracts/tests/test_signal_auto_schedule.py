"""Tests para la señal de auto-generación de cronograma de pagos.

T1.3: cuando un LandlordControlledContract pasa a ACTIVE, el signal
genera automáticamente RentPaymentSchedule + PaymentInstallment + PaymentOrder.
"""

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from contracts.landlord_contract_models import LandlordControlledContract
from contracts.models import Contract
from payments.models import (
    RentPaymentSchedule, PaymentInstallment, PaymentOrder,
)
from properties.models import Property

User = get_user_model()


class AutoSchedulerSignalTests(TestCase):
    """Verifica el signal pre/post_save de LandlordControlledContract."""

    def _setup(self):
        landlord = User.objects.create_user(
            email='ll@test.com', password='test1234',
            first_name='LL', last_name='X', user_type='landlord',
        )
        tenant = User.objects.create_user(
            email='tt@test.com', password='test1234',
            first_name='TT', last_name='X', user_type='tenant',
        )
        prop = Property.objects.create(
            landlord=landlord, title='Apto', description='x',
            property_type='apartment', listing_type='rent',
            rent_price=Decimal('1500000'),
            total_area=60, bedrooms=2, bathrooms=1,
            city='Bucaramanga', state='Santander', address='X',
        )
        # Crear LandlordControlledContract en estado DRAFT
        lcc = LandlordControlledContract.objects.create(
            landlord=landlord,
            tenant=tenant,
            property=prop,
            current_state='DRAFT',
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            economic_terms={'monthly_rent': '1500000'},
        )
        # Crear Contract legacy con MISMO UUID (convención BIO-02)
        legacy = Contract.objects.create(
            id=lcc.id,
            primary_party=landlord,
            secondary_party=tenant,
            property=prop,
            contract_type='rental_urban',
            title='Test',
            monthly_rent=Decimal('1500000'),
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
        )
        return landlord, tenant, lcc, legacy

    def test_no_schedule_when_not_active(self):
        landlord, tenant, lcc, legacy = self._setup()
        # Estado DRAFT → no genera nada
        self.assertEqual(RentPaymentSchedule.objects.count(), 0)
        self.assertEqual(PaymentOrder.objects.count(), 0)

    def test_schedule_generated_on_activation(self):
        landlord, tenant, lcc, legacy = self._setup()
        # Cambiar a ACTIVE → debe generar schedule + installments + orders
        lcc.current_state = 'ACTIVE'
        lcc.save()

        self.assertEqual(RentPaymentSchedule.objects.filter(contract=legacy).count(), 1)
        # 12 meses entre 2026-01-01 y 2026-12-31
        self.assertEqual(PaymentInstallment.objects.count(), 12)
        self.assertEqual(PaymentOrder.objects.filter(rent_schedule__contract=legacy).count(), 12)

    def test_orders_have_correct_amounts_and_three_dates(self):
        landlord, tenant, lcc, legacy = self._setup()
        lcc.current_state = 'ACTIVE'
        lcc.save()

        first_order = PaymentOrder.objects.order_by('date_due').first()
        self.assertEqual(first_order.amount, Decimal('1500000'))
        self.assertEqual(first_order.order_type, 'rent')
        # 3 fechas correctamente calculadas
        self.assertEqual(first_order.date_due, date(2026, 1, 1))
        self.assertEqual(first_order.date_grace_end, date(2026, 1, 6))   # +5
        self.assertEqual(first_order.date_max_overdue, date(2026, 2, 5)) # +30 más

    def test_idempotent_does_not_duplicate(self):
        landlord, tenant, lcc, legacy = self._setup()
        lcc.current_state = 'ACTIVE'
        lcc.save()

        n_orders_first = PaymentOrder.objects.count()

        # Guardar de nuevo (sin cambio de estado)
        lcc.save()
        self.assertEqual(PaymentOrder.objects.count(), n_orders_first)

    def test_audit_log_includes_auto_generation_event(self):
        landlord, tenant, lcc, legacy = self._setup()
        lcc.current_state = 'ACTIVE'
        lcc.save()

        order = PaymentOrder.objects.first()
        self.assertTrue(any(e['type'] == 'auto_generated' for e in order.audit_log))

    def test_no_schedule_without_dates(self):
        landlord = User.objects.create_user(
            email='ll@test.com', password='test1234',
            first_name='X', last_name='Y', user_type='landlord',
        )
        tenant = User.objects.create_user(
            email='tt@test.com', password='test1234',
            first_name='X', last_name='Y', user_type='tenant',
        )
        prop = Property.objects.create(
            landlord=landlord, title='Apto', description='x',
            property_type='apartment', listing_type='rent',
            rent_price=Decimal('1500000'),
            total_area=60, bedrooms=2, bathrooms=1,
            city='Bucaramanga', state='Santander', address='X',
        )
        lcc = LandlordControlledContract.objects.create(
            landlord=landlord, tenant=tenant, property=prop,
            current_state='ACTIVE',
            economic_terms={'monthly_rent': '1500000'},
            # SIN start_date ni end_date
        )
        # No debe generar nada (warning en logs pero no crash)
        self.assertEqual(RentPaymentSchedule.objects.count(), 0)
