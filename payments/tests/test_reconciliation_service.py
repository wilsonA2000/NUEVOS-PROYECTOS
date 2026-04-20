"""Tests para reconciliation_service.

T2.3: Cubre que reconcile_payment marque correctamente:
- PaymentOrder de tipo rent → status='paid' cuando llega Transaction
  rent_payment confirmada (RentPaymentSchedule actualiza last_payment_date).
- PaymentOrder de tipo service → status='paid', ServiceOrder→paid,
  ServicePayment creado cuando llega Transaction service_payment.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from payments.models import (
    PaymentOrder,
    RentPaymentSchedule,
    Transaction,
)
from payments.reconciliation_service import reconcile_payment
from contracts.models import Contract
from properties.models import Property
from services.models import ServiceOrder, ServicePayment

User = get_user_model()


def _user(email, user_type="tenant"):
    return User.objects.create_user(
        email=email,
        password="test1234",
        first_name="X",
        last_name="Y",
        user_type=user_type,
    )


class RentReconciliationTests(TestCase):
    """Reconciliación de pagos de canon."""

    def _setup(self):
        landlord = _user("ll@test.com", "landlord")
        tenant = _user("tt@test.com", "tenant")
        prop = Property.objects.create(
            landlord=landlord,
            title="Apto",
            description="x",
            property_type="apartment",
            listing_type="rent",
            rent_price=Decimal("1500000"),
            total_area=60,
            bedrooms=2,
            bathrooms=1,
            city="X",
            state="Y",
            address="Z",
        )
        contract = Contract.objects.create(
            primary_party=landlord,
            secondary_party=tenant,
            property=prop,
            contract_type="rental_urban",
            title="Test",
            monthly_rent=Decimal("1500000"),
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
        )
        schedule = RentPaymentSchedule.objects.create(
            contract=contract,
            tenant=tenant,
            landlord=landlord,
            rent_amount=Decimal("1500000"),
            due_date=1,
            grace_period_days=5,
            legal_grace_days_max=30,
            start_date=date(2026, 1, 1),
        )
        order = PaymentOrder.objects.create(
            order_type="rent",
            payer=tenant,
            payee=landlord,
            created_by=landlord,
            amount=Decimal("1500000"),
            date_due=date(2026, 5, 1),
            rent_schedule=schedule,
            status="pending",
        )
        tx = Transaction.objects.create(
            payer=tenant,
            payee=landlord,
            transaction_type="rent_payment",
            amount=Decimal("1500000"),
            total_amount=Decimal("1500000"),
            status="completed",
            contract=contract,
        )
        return landlord, tenant, contract, schedule, order, tx

    def test_rent_payment_marks_order_as_paid(self):
        landlord, tenant, contract, schedule, order, tx = self._setup()
        result = reconcile_payment(tx)
        self.assertTrue(result)
        order.refresh_from_db()
        self.assertEqual(order.status, "paid")
        self.assertEqual(order.paid_amount, order.total_amount)
        self.assertEqual(order.transaction_id, tx.id)
        self.assertIsNotNone(order.paid_at)

    def test_rent_payment_updates_schedule_last_payment(self):
        landlord, tenant, contract, schedule, order, tx = self._setup()
        reconcile_payment(tx)
        schedule.refresh_from_db()
        self.assertEqual(schedule.last_payment_date, date.today())

    def test_audit_log_records_webhook_event(self):
        landlord, tenant, contract, schedule, order, tx = self._setup()
        reconcile_payment(tx)
        order.refresh_from_db()
        self.assertTrue(any(e["type"] == "paid_via_webhook" for e in order.audit_log))


class ServiceReconciliationTests(TestCase):
    """Reconciliación de pagos de servicios."""

    def _setup(self):
        provider = _user("prov@svc.com", "service_provider")
        client_user = _user("cli@svc.com", "tenant")
        # PaymentOrder de tipo service
        po = PaymentOrder.objects.create(
            order_type="service",
            payer=client_user,
            payee=provider,
            created_by=provider,
            amount=Decimal("300000"),
            date_due=date.today() + timedelta(days=15),
            status="pending",
        )
        # ServiceOrder enlazada
        so = ServiceOrder.objects.create(
            provider=provider,
            client=client_user,
            title="Limpieza",
            amount=Decimal("300000"),
            status="accepted",
            payment_order=po,
        )
        tx = Transaction.objects.create(
            payer=client_user,
            payee=provider,
            transaction_type="service_payment",
            amount=Decimal("300000"),
            total_amount=Decimal("300000"),
            status="completed",
        )
        return provider, client_user, po, so, tx

    def test_service_payment_marks_order_paid(self):
        provider, client_user, po, so, tx = self._setup()
        result = reconcile_payment(tx)
        self.assertTrue(result)
        so.refresh_from_db()
        self.assertEqual(so.status, "paid")
        self.assertIsNotNone(so.paid_at)

    def test_service_payment_marks_payment_order_paid(self):
        provider, client_user, po, so, tx = self._setup()
        reconcile_payment(tx)
        po.refresh_from_db()
        self.assertEqual(po.status, "paid")
        self.assertEqual(po.transaction_id, tx.id)

    def test_service_payment_creates_servicepayment_record(self):
        provider, client_user, po, so, tx = self._setup()
        reconcile_payment(tx)
        sp = ServicePayment.objects.filter(order=so).first()
        self.assertIsNotNone(sp)
        self.assertEqual(sp.amount_paid, Decimal("300000"))
        self.assertEqual(sp.transaction_id, tx.id)

    def test_no_match_returns_false(self):
        provider, client_user, po, so, tx = self._setup()
        # Cambiar el monto para que no haya match
        tx.amount = Decimal("999999")
        tx.save()
        result = reconcile_payment(tx)
        self.assertFalse(result)

    def test_uncompleted_transaction_skipped(self):
        provider, client_user, po, so, tx = self._setup()
        tx.status = "pending"
        tx.save()
        result = reconcile_payment(tx)
        self.assertFalse(result)
