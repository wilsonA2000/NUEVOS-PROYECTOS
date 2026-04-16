"""Tests para LegalInterestRate y la constante MAX_USURY_MONTHLY_RATE.

Cubre:
- Validación del tope de usura (no acepta tasa > MAX_USURY_MONTHLY_RATE)
- get_rate_for() devuelve la tasa activa del período o fallback
- unique_together (year, month) impide duplicados
- Seed inicial cargó tasas 2025-2026
"""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db.utils import IntegrityError
from django.test import TestCase

from payments.models import LegalInterestRate, MAX_USURY_MONTHLY_RATE


class LegalInterestRateModelTests(TestCase):
    """Tests del modelo LegalInterestRate."""

    def test_seed_loaded_2025_2026_rates(self):
        """La data migration sembró tasas para 2025-2026."""
        self.assertGreater(LegalInterestRate.objects.filter(year=2025).count(), 0)
        self.assertGreater(LegalInterestRate.objects.filter(year=2026).count(), 0)

    def test_max_usury_constant_matches_seed(self):
        """Las tasas seed no exceden el tope de usura."""
        for rate in LegalInterestRate.objects.all():
            self.assertLessEqual(rate.monthly_rate, MAX_USURY_MONTHLY_RATE)

    def test_create_valid_rate(self):
        """Tasa dentro del tope se guarda OK."""
        # Usar mes/año fuera del seed para no chocar
        rate = LegalInterestRate.objects.create(
            year=2030,
            month=1,
            monthly_rate=Decimal('0.018'),
            source='Test',
        )
        self.assertEqual(rate.monthly_rate, Decimal('0.018'))

    def test_reject_rate_above_usury_cap(self):
        """Tasa > MAX_USURY_MONTHLY_RATE rechazada por clean()."""
        with self.assertRaises(ValidationError) as ctx:
            LegalInterestRate.objects.create(
                year=2030,
                month=2,
                monthly_rate=Decimal('0.05'),  # 5% mensual > tope
            )
        self.assertIn('monthly_rate', ctx.exception.message_dict)

    def test_reject_negative_rate(self):
        """Tasa negativa rechazada."""
        with self.assertRaises(ValidationError):
            LegalInterestRate.objects.create(
                year=2030,
                month=3,
                monthly_rate=Decimal('-0.01'),
            )

    def test_unique_year_month(self):
        """unique_together (year, month) impide duplicados."""
        LegalInterestRate.objects.create(
            year=2030, month=4, monthly_rate=Decimal('0.018'),
        )
        with self.assertRaises((IntegrityError, ValidationError)):
            LegalInterestRate.objects.create(
                year=2030, month=4, monthly_rate=Decimal('0.019'),
            )

    def test_get_rate_for_returns_active_rate(self):
        """get_rate_for() devuelve la tasa activa del mes/año pedido."""
        seeded = LegalInterestRate.objects.filter(year=2025, month=6).first()
        self.assertIsNotNone(seeded)
        result = LegalInterestRate.get_rate_for(2025, 6)
        self.assertEqual(result.id, seeded.id)

    def test_get_rate_for_fallback_to_previous(self):
        """Si no hay tasa para el período pedido, devuelve la última activa."""
        # Pedir un período futuro sin seed (2050) → debe caer a 2026/04 o lo último seedeado
        result = LegalInterestRate.get_rate_for(2050, 12)
        self.assertIsNotNone(result)
        # Debe ser el más reciente activo
        latest = LegalInterestRate.objects.filter(is_active=True).order_by('-year', '-month').first()
        self.assertEqual(result.id, latest.id)

    def test_inactive_rate_excluded_from_get(self):
        """get_rate_for() ignora tasas inactivas."""
        rate = LegalInterestRate.objects.create(
            year=2031, month=1, monthly_rate=Decimal('0.018'), is_active=False,
        )
        # Pedir su período debe caer al fallback (último activo)
        result = LegalInterestRate.get_rate_for(2031, 1)
        self.assertNotEqual(result.id, rate.id)

    def test_str_representation(self):
        rate = LegalInterestRate.objects.filter(year=2025, month=1).first()
        self.assertIn('01/2025', str(rate))
        self.assertIn('%', str(rate))
