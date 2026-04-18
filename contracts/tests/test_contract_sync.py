"""Fase 2 — Tests del comando `check_contract_sync` y la invariante
Contract ↔ LandlordControlledContract (comparten UUID).
"""
import json
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase

from contracts.landlord_contract_models import LandlordControlledContract
from contracts.models import Contract
from properties.models import Property

User = get_user_model()


class ContractSyncCommandTests(TestCase):
    """El comando detecta desincronizaciones entre los dos modelos."""

    def setUp(self):
        self.landlord = User.objects.create_user(
            email='sync_land@test.com', password='pass12345',
            user_type='landlord',
        )
        self.tenant = User.objects.create_user(
            email='sync_ten@test.com', password='pass12345',
            user_type='tenant',
        )
        self.property = Property.objects.create(
            landlord=self.landlord,
            title='Apt sync',
            address='Calle test',
            property_type='apartment',
            listing_type='rent',
            total_area=40,
            city='Bogotá',
        )

    def _run(self):
        buf = StringIO()
        call_command('check_contract_sync', '--json', stdout=buf)
        return json.loads(buf.getvalue())

    def test_all_in_sync_empty(self):
        report = self._run()
        self.assertEqual(report['lcc_total'], 0)
        self.assertEqual(report['contract_total'], 0)
        self.assertEqual(report['lcc_without_contract'], [])
        self.assertEqual(report['contract_without_lcc'], [])

    def test_lcc_without_contract_is_flagged(self):
        lcc = LandlordControlledContract.objects.create(
            landlord=self.landlord,
            tenant=self.tenant,
            property=self.property,
            title='LCC solo',
            current_state='DRAFT',
        )
        report = self._run()
        self.assertIn(str(lcc.id), report['lcc_without_contract'])
        self.assertEqual(report['contract_without_lcc'], [])

    def test_in_sync_when_same_uuid(self):
        """Cuando ambos existen con el mismo UUID, no hay incongruencia."""
        lcc = LandlordControlledContract.objects.create(
            landlord=self.landlord,
            tenant=self.tenant,
            property=self.property,
            title='LCC pareja',
            current_state='DRAFT',
        )
        from datetime import date, timedelta
        from decimal import Decimal
        Contract.objects.create(
            id=lcc.id,
            primary_party=self.landlord,
            secondary_party=self.tenant,
            monthly_rent=Decimal('1000000'),
            security_deposit=Decimal('1000000'),
            start_date=date.today(),
            end_date=date.today() + timedelta(days=365),
        )
        report = self._run()
        self.assertEqual(report['lcc_without_contract'], [])
        self.assertEqual(report['contract_without_lcc'], [])
        self.assertEqual(report['in_sync_count'], 1)
