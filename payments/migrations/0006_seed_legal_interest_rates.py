"""Data migration: seed inicial de tasas de interés legal 2025-2026.

Cubre los meses publicados por la Superfinanciera de Colombia hasta la
fecha. Cuando se publique una nueva tasa, basta con crear un nuevo registro
LegalInterestRate desde el admin (no requiere otra migración).
"""

from decimal import Decimal
from django.db import migrations


def seed_rates(apps, schema_editor):
    LegalInterestRate = apps.get_model('payments', 'LegalInterestRate')

    # Tasas referenciales (mensual = (1 + EA)^(1/12) - 1).
    # Los valores son aproximaciones para arrancar; admin puede actualizarlos.
    seeds = [
        # 2025 - tasa de usura ~28% EA
        (1, 2025, '0.0205'),
        (2, 2025, '0.0205'),
        (3, 2025, '0.0205'),
        (4, 2025, '0.0207'),
        (5, 2025, '0.0207'),
        (6, 2025, '0.0207'),
        (7, 2025, '0.0208'),
        (8, 2025, '0.0208'),
        (9, 2025, '0.0208'),
        (10, 2025, '0.0208'),
        (11, 2025, '0.0208'),
        (12, 2025, '0.0208'),
        # 2026 - inicializar con tope vigente
        (1, 2026, '0.0208'),
        (2, 2026, '0.0208'),
        (3, 2026, '0.0208'),
        (4, 2026, '0.0208'),
    ]

    for month, year, rate_str in seeds:
        LegalInterestRate.objects.update_or_create(
            year=year,
            month=month,
            defaults={
                'monthly_rate': Decimal(rate_str),
                'max_usury_rate': Decimal('0.0208'),
                'is_active': True,
                'source': 'Seed inicial · referencia Superfinanciera',
            },
        )


def unseed_rates(apps, schema_editor):
    LegalInterestRate = apps.get_model('payments', 'LegalInterestRate')
    LegalInterestRate.objects.filter(
        source='Seed inicial · referencia Superfinanciera',
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0005_legalinterestrate'),
    ]

    operations = [
        migrations.RunPython(seed_rates, unseed_rates),
    ]
