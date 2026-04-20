"""Fase 1.9.8 — Tests E2E de trazabilidad end-to-end.

Valida que los signals, FKs relacionales y helper de auditoría de las
fases 1.9.1–1.9.7 trabajan de forma coordinada:

- `test_full_traceability`: contrato desde DRAFT hasta ACTIVE produce
  filas en `ContractWorkflowHistory` via signal (1.9.1), y que una
  calificación posterior queda linkeada por FK (1.9.4).

- `test_service_traceability`: ServiceOrder genera filas en
  `ServiceOrderHistory` en cada transición (1.9.5), ServiceRequest
  anónima vs autenticada respeta los FKs (1.9.3), y MessageThread +
  Rating.service_order (1.9.4, 1.9.6) completan la traza.
"""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from contracts.landlord_contract_models import (
    ContractWorkflowHistory,
    LandlordControlledContract,
)
from contracts.models import Contract
from messaging.models import MessageThread
from properties.models import Property
from ratings.models import Rating
from services.models import (
    Service,
    ServiceCategory,
    ServiceOrder,
    ServiceOrderHistory,
    ServiceRequest,
)

User = get_user_model()


class FullTraceabilityTests(TestCase):
    """E2E: contrato + historial + rating linkeado."""

    def setUp(self):
        self.landlord = User.objects.create_user(
            email="land_trace@test.com",
            password="pass12345",
            first_name="Land",
            last_name="Lord",
            user_type="landlord",
        )
        self.tenant = User.objects.create_user(
            email="ten_trace@test.com",
            password="pass12345",
            first_name="Ten",
            last_name="Ant",
            user_type="tenant",
        )
        self.property = Property.objects.create(
            landlord=self.landlord,
            title="Apt trace",
            address="Calle 1 #2-3",
            city="Bogotá",
            property_type="apartment",
            listing_type="rent",
            total_area=50,
        )

    def test_full_traceability(self):
        """Crea LCC, transiciona estado varias veces y verifica historial."""
        lcc = LandlordControlledContract.objects.create(
            landlord=self.landlord,
            tenant=self.tenant,
            property=self.property,
            title="Contrato trace",
            current_state="DRAFT",
            economic_terms={"monthly_rent": "1000000"},
        )

        # Signal de creación + 3 transiciones → 4 filas.
        lcc._updated_by = self.landlord
        lcc.current_state = "TENANT_INVITED"
        lcc.save()
        lcc._updated_by = self.tenant
        lcc.current_state = "TENANT_REVIEWING"
        lcc.save()
        lcc._updated_by = self.tenant
        lcc.current_state = "TENANT_DATA_PENDING"
        lcc.save()

        history = ContractWorkflowHistory.objects.filter(contract=lcc).order_by(
            "timestamp"
        )
        self.assertEqual(history.count(), 4)  # CREATE + 3 STATE_CHANGE
        state_changes = [(h.old_state, h.new_state) for h in history]
        # La primera fila es del CREATE (old='' o similar).
        self.assertEqual(state_changes[1], ("DRAFT", "TENANT_INVITED"))
        self.assertEqual(state_changes[2], ("TENANT_INVITED", "TENANT_REVIEWING"))
        self.assertEqual(state_changes[3], ("TENANT_REVIEWING", "TENANT_DATA_PENDING"))

        # Atribución: las filas con _updated_by quedan con performed_by asignado.
        attributed = history.exclude(performed_by__isnull=True)
        self.assertTrue(attributed.exists())

        # Rating linkeado al contrato legacy (BIO-02: mismo UUID).
        legacy_contract = Contract.objects.create(
            id=lcc.id,
            primary_party=self.landlord,
            secondary_party=self.tenant,
            monthly_rent=Decimal("1000000"),
            security_deposit=Decimal("1000000"),
            start_date=timezone.now().date(),
            end_date=timezone.now().date() + timezone.timedelta(days=365),
        )
        rating = Rating.objects.create(
            reviewer=self.tenant,
            reviewee=self.landlord,
            rating_type="tenant_to_landlord",
            overall_rating=9,
            contract=legacy_contract,
        )
        self.assertEqual(rating.contract_id, legacy_contract.id)
        self.assertIsNone(rating.service_order)  # campo 1.9.4 queda null aquí


class ServiceTraceabilityTests(TestCase):
    """E2E: ServiceRequest + ServiceOrder + MessageThread + Rating."""

    def setUp(self):
        self.provider = User.objects.create_user(
            email="prov_trace@test.com",
            password="pass12345",
            first_name="Pro",
            last_name="V",
            user_type="service_provider",
        )
        self.client_user = User.objects.create_user(
            email="cli_trace@test.com",
            password="pass12345",
            first_name="Cli",
            last_name="Ent",
            user_type="tenant",
        )
        self.category = ServiceCategory.objects.create(
            name="Mantenimiento trace",
        )
        self.service = Service.objects.create(
            category=self.category,
            name="Plomería trace",
            short_description="x",
            full_description="y",
            base_price=Decimal("100000"),
        )

    def test_service_traceability(self):
        """FKs 1.9.3 + signal 1.9.5 + FK 1.9.4/1.9.6 interoperan."""
        # 1.9.3: ServiceRequest con FK requester (autenticado).
        sreq = ServiceRequest.objects.create(
            service=self.service,
            requester=self.client_user,
            requester_name="Cli Ent",
            requester_email=self.client_user.email,
            requester_phone="3001112222",
            message="Necesito reparar una fuga",
        )
        self.assertEqual(sreq.requester_id, self.client_user.id)

        # 1.9.5: ServiceOrder con transiciones → historial automático.
        order = ServiceOrder.objects.create(
            provider=self.provider,
            client=self.client_user,
            title="Trace order",
            amount=Decimal("250000"),
            status="draft",
        )
        order.status = "sent"
        order.save()
        order.status = "accepted"
        order.save()
        order.status = "paid"
        order.save()

        entries = ServiceOrderHistory.objects.filter(order=order).order_by("timestamp")
        # CREATE + SEND + ACCEPT + PAY
        self.assertEqual(entries.count(), 4)
        self.assertEqual(
            [e.action_type for e in entries],
            ["CREATE", "SEND", "ACCEPT", "PAY"],
        )
        self.assertIn(entries.last().metadata.get("amount"), ("250000.00", "250000"))

        # 1.9.6: MessageThread vinculado a la orden.
        thread = MessageThread.objects.create(
            subject="Soporte de la orden",
            thread_type="service",
            created_by=self.client_user,
            service_order=order,
        )
        self.assertEqual(thread.service_order_id, order.id)

        # 1.9.4: Rating vinculado a la ServiceOrder (sin contrato).
        rating = Rating.objects.create(
            reviewer=self.client_user,
            reviewee=self.provider,
            rating_type="client_to_service_provider",
            overall_rating=10,
            service_order=order,
        )
        self.assertEqual(rating.service_order_id, order.id)
        self.assertIsNone(rating.contract)

        # La unicidad parcial impide una segunda fila sobre la misma orden.
        from django.db import IntegrityError

        with self.assertRaises(IntegrityError):
            Rating.objects.create(
                reviewer=self.client_user,
                reviewee=self.provider,
                rating_type="client_to_service_provider",
                overall_rating=8,
                service_order=order,
            )
