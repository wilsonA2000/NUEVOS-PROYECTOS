"""
Tests for the payments app.

Covers models (PaymentMethod, Transaction, EscrowAccount, Invoice, PaymentPlan),
API endpoints for transactions, payment methods, invoices, and permission checks.
"""

from decimal import Decimal
from datetime import date, timedelta

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from .models import (
    PaymentMethod, Transaction, EscrowAccount, Invoice,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Helper factories
# ---------------------------------------------------------------------------

def _make_user(email='payer@verihome.co', password='SecurePass123!', **kwargs):
    defaults = {
        'first_name': 'Test',
        'last_name': 'User',
        'user_type': 'tenant',
    }
    defaults.update(kwargs)
    return User.objects.create_user(email=email, password=password, **defaults)


def _make_payment_method(user, **kwargs):
    defaults = {
        'user': user,
        'payment_type': 'credit_card',
        'name': 'Visa principal',
        'card_brand': 'visa',
        'card_last_four': '4242',
    }
    defaults.update(kwargs)
    return PaymentMethod.objects.create(**defaults)


def _make_transaction(payer, payee, **kwargs):
    defaults = {
        'payer': payer,
        'payee': payee,
        'transaction_type': 'rent_payment',
        'direction': 'outbound',
        'amount': Decimal('500000.00'),
        'total_amount': Decimal('500000.00'),
        'description': 'Pago de renta mensual',
    }
    defaults.update(kwargs)
    return Transaction.objects.create(**defaults)


# ===========================================================================
# Model tests
# ===========================================================================


class PaymentMethodModelTests(TestCase):
    """Tests for the PaymentMethod model."""

    def setUp(self):
        self.user = _make_user()

    def test_create_payment_method(self):
        pm = _make_payment_method(self.user)
        self.assertIsNotNone(pm.pk)
        self.assertEqual(pm.payment_type, 'credit_card')
        self.assertEqual(pm.user, self.user)

    def test_str_representation(self):
        pm = _make_payment_method(self.user)
        self.assertIn('Visa principal', str(pm))

    def test_default_is_active(self):
        pm = _make_payment_method(self.user)
        self.assertTrue(pm.is_active)
        self.assertFalse(pm.is_verified)

    def test_set_default_unsets_others(self):
        pm1 = _make_payment_method(self.user, name='Card 1', is_default=True)
        pm2 = _make_payment_method(self.user, name='Card 2', is_default=True)
        pm1.refresh_from_db()
        self.assertFalse(pm1.is_default)
        self.assertTrue(pm2.is_default)

    def test_display_name_credit_card(self):
        pm = _make_payment_method(self.user, card_brand='mastercard', card_last_four='1234')
        display = pm.get_display_name()
        self.assertIn('1234', display)

    def test_display_name_bank_transfer(self):
        pm = _make_payment_method(
            self.user,
            payment_type='bank_transfer',
            bank_name='Bancolombia',
            account_number_last_four='9876',
        )
        display = pm.get_display_name()
        self.assertIn('Bancolombia', display)
        self.assertIn('9876', display)


class TransactionModelTests(TestCase):
    """Tests for the Transaction model."""

    def setUp(self):
        self.payer = _make_user(email='payer@test.co')
        self.payee = _make_user(email='payee@test.co', user_type='landlord')

    def test_create_transaction(self):
        tx = _make_transaction(self.payer, self.payee)
        self.assertIsNotNone(tx.pk)
        self.assertTrue(str(tx.transaction_number).startswith('TX-'))

    def test_auto_generate_transaction_number(self):
        tx = _make_transaction(self.payer, self.payee)
        self.assertRegex(tx.transaction_number, r'^TX-\d{4}-\d{8}$')

    def test_auto_calculate_total_amount(self):
        Transaction.objects.create(
            payer=self.payer,
            payee=self.payee,
            transaction_type='rent_payment',
            direction='outbound',
            amount=Decimal('1000.00'),
            platform_fee=Decimal('50.00'),
            processing_fee=Decimal('10.00'),
            total_amount=Decimal('0'),
            description='Test',
        )
        # total_amount was explicitly set to 0, so it stays 0 (only auto-calc if falsy)
        # Let's test with no total_amount set
        tx2 = Transaction(
            payer=self.payer,
            payee=self.payee,
            transaction_type='rent_payment',
            direction='outbound',
            amount=Decimal('1000.00'),
            platform_fee=Decimal('50.00'),
            processing_fee=Decimal('10.00'),
            description='Test auto calc',
        )
        tx2.save()
        self.assertEqual(tx2.total_amount, Decimal('1060.00'))

    def test_default_status_pending(self):
        tx = _make_transaction(self.payer, self.payee)
        self.assertEqual(tx.status, 'pending')

    def test_can_be_refunded(self):
        tx = _make_transaction(self.payer, self.payee, status='completed', direction='inbound')
        self.assertTrue(tx.can_be_refunded())

    def test_cannot_refund_outbound(self):
        tx = _make_transaction(self.payer, self.payee, status='completed', direction='outbound')
        self.assertFalse(tx.can_be_refunded())

    def test_str_representation(self):
        tx = _make_transaction(self.payer, self.payee)
        self.assertIn('TX-', str(tx))

    def test_get_net_amount_inbound(self):
        tx = _make_transaction(
            self.payer, self.payee,
            direction='inbound',
            amount=Decimal('1000.00'),
            platform_fee=Decimal('50.00'),
            processing_fee=Decimal('10.00'),
        )
        self.assertEqual(tx.get_net_amount(), Decimal('940.00'))


class EscrowAccountModelTests(TestCase):
    """Tests for the EscrowAccount model."""

    def setUp(self):
        self.buyer = _make_user(email='buyer@test.co')
        self.seller = _make_user(email='seller@test.co', user_type='landlord')

    def test_create_escrow(self):
        escrow = EscrowAccount.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            escrow_type='security_deposit',
            amount=Decimal('2000000.00'),
            description='Deposito de garantia',
        )
        self.assertIsNotNone(escrow.pk)
        self.assertTrue(str(escrow.escrow_number).startswith('ESC-'))

    def test_default_status_pending(self):
        escrow = EscrowAccount.objects.create(
            buyer=self.buyer,
            seller=self.seller,
            escrow_type='rent_payment',
            amount=Decimal('500000.00'),
            description='Escrow test',
        )
        self.assertEqual(escrow.status, 'pending')


class InvoiceModelTests(TestCase):
    """Tests for the Invoice model."""

    def setUp(self):
        self.issuer = _make_user(email='issuer@test.co', user_type='landlord')
        self.recipient = _make_user(email='recipient@test.co')

    def test_create_invoice(self):
        inv = Invoice.objects.create(
            issuer=self.issuer,
            recipient=self.recipient,
            invoice_type='rent',
            title='Renta Marzo 2026',
            subtotal=Decimal('1000000.00'),
            total_amount=Decimal('1000000.00'),
            due_date=date.today() + timedelta(days=30),
        )
        self.assertIsNotNone(inv.pk)
        self.assertTrue(str(inv.invoice_number).startswith('INV-'))

    def test_is_overdue(self):
        inv = Invoice.objects.create(
            issuer=self.issuer,
            recipient=self.recipient,
            invoice_type='rent',
            title='Renta vencida',
            subtotal=Decimal('500000.00'),
            total_amount=Decimal('500000.00'),
            due_date=date.today() - timedelta(days=10),
        )
        self.assertTrue(inv.is_overdue())

    def test_not_overdue_when_paid(self):
        inv = Invoice.objects.create(
            issuer=self.issuer,
            recipient=self.recipient,
            invoice_type='rent',
            title='Renta pagada',
            subtotal=Decimal('500000.00'),
            total_amount=Decimal('500000.00'),
            due_date=date.today() - timedelta(days=10),
            status='paid',
        )
        self.assertFalse(inv.is_overdue())


# ===========================================================================
# API / Endpoint tests
# ===========================================================================


class TransactionAPITests(APITestCase):
    """Tests for Transaction API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.payer = _make_user(email='payer@api.co')
        self.payee = _make_user(email='payee@api.co', user_type='landlord')
        self.tx = _make_transaction(self.payer, self.payee)

    def test_list_requires_auth(self):
        response = self.client.get('/api/v1/payments/transactions/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_authenticated(self):
        self.client.force_authenticate(user=self.payer)
        response = self.client.get('/api/v1/payments/transactions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_list_only_own_transactions(self):
        other_user = _make_user(email='other@api.co')
        self.client.force_authenticate(user=other_user)
        response = self.client.get('/api/v1/payments/transactions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_retrieve_own_transaction(self):
        self.client.force_authenticate(user=self.payer)
        response = self.client.get(f'/api/v1/payments/transactions/{self.tx.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_payee_can_see_transaction(self):
        self.client.force_authenticate(user=self.payee)
        response = self.client.get('/api/v1/payments/transactions/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertGreaterEqual(len(results), 1)


class PaymentMethodAPITests(APITestCase):
    """Tests for PaymentMethod API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = _make_user(email='pmuser@api.co')
        self.pm = _make_payment_method(self.user)

    def test_list_requires_auth(self):
        response = self.client.get('/api/v1/payments/payment-methods/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/payments/payment-methods/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_payment_method(self):
        self.client.force_authenticate(user=self.user)
        data = {
            'payment_type': 'debit_card',
            'name': 'Tarjeta debito',
            'card_brand': 'mastercard',
            'card_last_four': '5678',
        }
        response = self.client.post('/api/v1/payments/payment-methods/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Tarjeta debito')

    def test_other_user_cannot_see_my_methods(self):
        other = _make_user(email='other@api.co')
        self.client.force_authenticate(user=other)
        response = self.client.get('/api/v1/payments/payment-methods/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_delete_payment_method(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/v1/payments/payment-methods/{self.pm.pk}/')
        self.assertIn(response.status_code, [status.HTTP_204_NO_CONTENT, status.HTTP_200_OK])


class PaymentViewSetAPITests(APITestCase):
    """Tests for the Payment ViewSet (payments/ router)."""

    def setUp(self):
        self.client = APIClient()
        self.user = _make_user(email='payuser@api.co')
        self.payee = _make_user(email='landlord@api.co', user_type='landlord')
        self.tx = _make_transaction(self.user, self.payee)

    def test_payments_list_requires_auth(self):
        response = self.client.get('/api/v1/payments/payments/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_payments_list_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/payments/payments/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_payments_detail(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f'/api/v1/payments/payments/{self.tx.pk}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class InvoiceAPITests(APITestCase):
    """Tests for Invoice API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = _make_user(email='invuser@api.co', user_type='landlord')

    def test_invoices_require_auth(self):
        response = self.client.get('/api/v1/payments/invoices/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invoices_list_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/payments/invoices/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class BalanceAPITests(APITestCase):
    """Tests for balance and stats endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = _make_user(email='balance@api.co')

    def test_balance_requires_auth(self):
        response = self.client.get('/api/v1/payments/stats/balance/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_balance_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/payments/stats/balance/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dashboard_stats_requires_auth(self):
        response = self.client.get('/api/v1/payments/stats/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_stats_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/payments/stats/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
