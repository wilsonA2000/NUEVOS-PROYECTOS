"""Tests para T3.3: send_payment_order_reminder + generate_payment_order_receipt.

Cubre:
- Email reminder upcoming/overdue/late_fee con consecutivo incluido
- Audit log registra el evento reminder_sent_{type}
- Receipt PDF se genera con bytes válidos
- Endpoint /orders/<id>/receipt/ con permisos por rol
"""

from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status as http_status
from rest_framework.test import APIClient

from payments.models import PaymentOrder
from payments.reminder_service import send_payment_order_reminder
from payments.receipt_generator import generate_payment_order_receipt

User = get_user_model()


def _user(email, user_type="tenant", is_staff=False):
    return User.objects.create_user(
        email=email,
        password="test1234",
        first_name="X",
        last_name="Y",
        user_type=user_type,
        is_staff=is_staff,
    )


def _order(payer, payee, **kw):
    defaults = dict(
        order_type="rent",
        amount=Decimal("1500000"),
        date_due=date.today() + timedelta(days=15),
        date_grace_end=date.today() + timedelta(days=20),
        date_max_overdue=date.today() + timedelta(days=50),
        created_by=payee,
    )
    defaults.update(kw)
    return PaymentOrder.objects.create(payer=payer, payee=payee, **defaults)


class SendPaymentOrderReminderTests(TestCase):
    """Pruebas del reminder con consecutivo."""

    def setUp(self):
        self.landlord = _user("ll@test.com", "landlord")
        self.tenant = _user("tt@test.com", "tenant")
        self.order = _order(payer=self.tenant, payee=self.landlord)

    @patch("payments.reminder_service.send_mail")
    def test_upcoming_reminder_sent_with_consecutivo(self, mock_send):
        mock_send.return_value = 1
        result = send_payment_order_reminder(self.order, "upcoming")
        self.assertTrue(result)
        mock_send.assert_called_once()
        call_kwargs = mock_send.call_args.kwargs
        # Subject debe incluir consecutivo
        self.assertIn(self.order.order_number, call_kwargs["subject"])
        self.assertIn("próximo", call_kwargs["subject"].lower())

    @patch("payments.reminder_service.send_mail")
    def test_overdue_reminder_includes_interest(self, mock_send):
        mock_send.return_value = 1
        self.order.interest_amount = Decimal("25000")
        self.order.save()
        result = send_payment_order_reminder(self.order, "overdue")
        self.assertTrue(result)
        body = mock_send.call_args.kwargs["message"]
        self.assertIn("25,000", body)
        self.assertIn(self.order.order_number, body)

    @patch("payments.reminder_service.send_mail")
    def test_late_fee_reminder_mentions_superfinanciera(self, mock_send):
        mock_send.return_value = 1
        self.order.interest_amount = Decimal("50000")
        self.order.save()
        send_payment_order_reminder(self.order, "late_fee")
        body = mock_send.call_args.kwargs["message"]
        self.assertIn("Superintendencia Financiera", body)

    @patch("payments.reminder_service.send_mail")
    def test_reminder_records_audit_event(self, mock_send):
        mock_send.return_value = 1
        send_payment_order_reminder(self.order, "upcoming")
        self.order.refresh_from_db()
        self.assertTrue(
            any(e["type"] == "reminder_sent_upcoming" for e in self.order.audit_log)
        )

    def test_reminder_skipped_without_email(self):
        # Crear orden con payer sin email (improbable, pero defensivo)
        orphan = _user("orphan@test.com")
        orphan.email = ""
        orphan.save()
        order = _order(payer=orphan, payee=self.landlord)
        result = send_payment_order_reminder(order, "upcoming")
        self.assertFalse(result)


class GenerateReceiptPDFTests(TestCase):
    """PDF generator produce bytes válidos con consecutivo."""

    def setUp(self):
        self.landlord = _user("ll@test.com", "landlord")
        self.tenant = _user("tt@test.com", "tenant")

    def test_receipt_pdf_returns_bytes(self):
        order = _order(payer=self.tenant, payee=self.landlord)
        pdf = generate_payment_order_receipt(order)
        self.assertIsInstance(pdf, bytes)
        # PDF magic number
        self.assertTrue(pdf.startswith(b"%PDF"))

    def test_receipt_with_interest_breakdown(self):
        order = _order(
            payer=self.tenant,
            payee=self.landlord,
            interest_amount=Decimal("25000"),
        )
        pdf = generate_payment_order_receipt(order)
        self.assertTrue(pdf.startswith(b"%PDF"))
        self.assertGreater(len(pdf), 1000)  # PDF no-trivial


class PaymentOrderReceiptEndpointTests(TestCase):
    """Endpoint GET /payments/orders/<id>/receipt/."""

    def setUp(self):
        self.client = APIClient()
        self.landlord = _user("ll@test.com", "landlord")
        self.tenant = _user("tt@test.com", "tenant")
        self.other = _user("other@test.com", "tenant")
        self.admin = _user("admin@test.com", "landlord", is_staff=True)
        self.order = _order(payer=self.tenant, payee=self.landlord)

    def test_payer_can_download_receipt(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get(f"/api/v1/payments/orders/{self.order.id}/receipt/")
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/pdf")
        self.assertIn(self.order.order_number, response["Content-Disposition"])

    def test_payee_can_download_receipt(self):
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get(f"/api/v1/payments/orders/{self.order.id}/receipt/")
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_admin_can_download_receipt(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f"/api/v1/payments/orders/{self.order.id}/receipt/")
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_stranger_gets_403(self):
        self.client.force_authenticate(user=self.other)
        response = self.client.get(f"/api/v1/payments/orders/{self.order.id}/receipt/")
        self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_gets_401(self):
        response = self.client.get(f"/api/v1/payments/orders/{self.order.id}/receipt/")
        self.assertEqual(response.status_code, http_status.HTTP_401_UNAUTHORIZED)
