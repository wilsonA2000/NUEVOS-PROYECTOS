"""Tests para el sistema de 3 fechas y cálculo de mora proporcional
en RentPaymentSchedule.

Cubre:
- get_three_dates() devuelve vencimiento + fin gracia + tope mora
- overdue_days() respeta período de gracia y se capa en legal_grace_days_max
- calculate_late_fee() usa tasa diaria de LegalInterestRate
- Fallback a late_fee_amount cuando no hay tasa legal
- auto_late_fee_enabled=False → 0
"""

from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from contracts.models import Contract
from payments.models import (
    LegalInterestRate, RentPaymentSchedule,
)
from properties.models import Property

User = get_user_model()


def _make_contract():
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
    contract = Contract.objects.create(
        primary_party=landlord,
        secondary_party=tenant,
        property=prop,
        contract_type='rental_urban',
        title='Contrato test',
        monthly_rent=Decimal('1500000'),
        start_date=date(2026, 1, 1),
        end_date=date(2026, 12, 31),
    )
    return landlord, tenant, contract


def _make_schedule(rent=Decimal('1500000'), due_day=1, grace=5, max_days=30):
    landlord, tenant, contract = _make_contract()
    return RentPaymentSchedule.objects.create(
        contract=contract,
        tenant=tenant,
        landlord=landlord,
        rent_amount=rent,
        due_date=due_day,
        grace_period_days=grace,
        legal_grace_days_max=max_days,
        auto_late_fee_enabled=True,
        start_date=date(2026, 1, 1),
    )


class ThreeDatesTests(TestCase):
    """get_three_dates() devuelve vencimiento + fin gracia + tope mora."""

    def test_returns_three_dates_with_correct_offsets(self):
        sched = _make_schedule(due_day=10, grace=5, max_days=30)
        # Forzar fecha de referencia mockeando get_next_due_date
        with patch.object(sched, 'get_next_due_date', return_value=date(2026, 5, 10)):
            dates = sched.get_three_dates()
        self.assertEqual(dates['date_due'], date(2026, 5, 10))
        self.assertEqual(dates['date_grace_end'], date(2026, 5, 15))
        self.assertEqual(dates['date_max_overdue'], date(2026, 6, 14))


class OverdueDaysTests(TestCase):
    """overdue_days() capa días de mora al tope legal."""

    def test_within_grace_period_returns_zero(self):
        sched = _make_schedule(due_day=1, grace=5, max_days=30)
        with patch.object(sched, 'get_next_due_date', return_value=date(2026, 5, 1)):
            # Día 4 (dentro de gracia: 1+5=6)
            self.assertEqual(sched.overdue_days(date(2026, 5, 4)), 0)
            # Día 6 (último de gracia)
            self.assertEqual(sched.overdue_days(date(2026, 5, 6)), 0)

    def test_after_grace_returns_days_overdue(self):
        sched = _make_schedule(due_day=1, grace=5, max_days=30)
        with patch.object(sched, 'get_next_due_date', return_value=date(2026, 5, 1)):
            # Día 20 = 14 días después del fin de gracia
            self.assertEqual(sched.overdue_days(date(2026, 5, 20)), 14)

    def test_capped_at_legal_max(self):
        sched = _make_schedule(due_day=1, grace=5, max_days=30)
        with patch.object(sched, 'get_next_due_date', return_value=date(2026, 5, 1)):
            # Día 100 días después del fin de gracia → capa en 30
            self.assertEqual(sched.overdue_days(date(2026, 5, 1) + timedelta(days=100)), 30)


class CalculateLateFeeTests(TestCase):
    """calculate_late_fee() usa tasa proporcional de LegalInterestRate."""

    def test_no_overdue_returns_zero(self):
        sched = _make_schedule(due_day=1, grace=5)
        with patch.object(sched, 'get_next_due_date', return_value=date(2026, 5, 1)):
            self.assertEqual(sched.calculate_late_fee(date(2026, 5, 4)), Decimal('0.00'))

    def test_disabled_returns_zero(self):
        sched = _make_schedule()
        sched.auto_late_fee_enabled = False
        sched.save()
        with patch.object(sched, 'get_next_due_date', return_value=date(2026, 5, 1)):
            self.assertEqual(
                sched.calculate_late_fee(date(2026, 5, 30)),
                Decimal('0.00'),
            )

    def test_uses_legal_rate_proportionally(self):
        """Cálculo: 1.500.000 * (0.0208/30) * 14 = $14.560 aprox."""
        # Asegurar que hay tasa para 2026/05 (seed la incluye)
        rate = LegalInterestRate.objects.get(year=2026, month=4)
        # Igualamos tasa a 0.0208 para cálculo predictible
        rate.monthly_rate = Decimal('0.0208')
        rate.save()

        sched = _make_schedule(rent=Decimal('1500000'), due_day=1, grace=5)
        with patch.object(sched, 'get_next_due_date', return_value=date(2026, 4, 1)):
            # Día 20 = 14 días después del fin de gracia (día 6)
            fee = sched.calculate_late_fee(date(2026, 4, 20))
        # 1500000 * 0.0208/30 * 14 = 14560.00
        expected = (Decimal('1500000') * Decimal('0.0208') / Decimal('30') * Decimal('14')).quantize(Decimal('0.01'))
        self.assertEqual(fee, expected)

    def test_capped_at_legal_max_in_fee(self):
        """Después de 30 días + gracia, el interés se congela."""
        rate = LegalInterestRate.objects.get(year=2026, month=4)
        rate.monthly_rate = Decimal('0.0208')
        rate.save()

        sched = _make_schedule(rent=Decimal('1000000'), due_day=1, grace=5, max_days=30)
        with patch.object(sched, 'get_next_due_date', return_value=date(2026, 4, 1)):
            # Día 200 días después → debe capar en 30 días
            very_late = date(2026, 4, 1) + timedelta(days=200)
            fee = sched.calculate_late_fee(very_late)
        expected = (Decimal('1000000') * Decimal('0.0208') / Decimal('30') * Decimal('30')).quantize(Decimal('0.01'))
        self.assertEqual(fee, expected)

    def test_fallback_to_legacy_amount_when_no_rate(self):
        """Si no existe LegalInterestRate, usa late_fee_amount fijo."""
        # Limpiar todas las tasas
        LegalInterestRate.objects.all().delete()

        sched = _make_schedule()
        sched.late_fee_amount = Decimal('50000')
        sched.save()
        with patch.object(sched, 'get_next_due_date', return_value=date(2026, 4, 1)):
            fee = sched.calculate_late_fee(date(2026, 4, 20))
        self.assertEqual(fee, Decimal('50000'))

    def test_principal_override(self):
        """Pasar principal explícito calcula sobre ese monto, no rent_amount."""
        rate = LegalInterestRate.objects.get(year=2026, month=4)
        rate.monthly_rate = Decimal('0.0208')
        rate.save()

        sched = _make_schedule(rent=Decimal('1000000'))
        with patch.object(sched, 'get_next_due_date', return_value=date(2026, 4, 1)):
            fee = sched.calculate_late_fee(
                date(2026, 4, 20),
                principal=Decimal('500000'),
            )
        expected = (Decimal('500000') * Decimal('0.0208') / Decimal('30') * Decimal('14')).quantize(Decimal('0.01'))
        self.assertEqual(fee, expected)
