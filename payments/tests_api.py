"""
Tests de API REST para la aplicacion de pagos de VeriHome.
Cobertura: Transaction, PaymentMethod, Invoice, EscrowAccount,
Stats/Balance, Tenant/Landlord portals, permisos.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from payments.models import (
    EscrowAccount,
    Invoice,
    PaymentMethod,
    Transaction,
)

User = get_user_model()


# -- Helpers -------------------------------------------------------------------

def _make_user(email, user_type='tenant', **kwargs):
    """Crea un usuario de prueba con email-based auth."""
    return User.objects.create_user(
        email=email,
        password='testpass123',
        first_name=email.split('@')[0].title(),
        last_name='Test',
        user_type=user_type,
        **kwargs,
    )


def _make_transaction(payer, payee, **kwargs):
    """Crea una transaccion minima."""
    defaults = {
        'transaction_type': 'rent_payment',
        'direction': 'inbound',
        'amount': Decimal('500000.00'),
        'description': 'Pago de renta test',
    }
    defaults.update(kwargs)
    return Transaction.objects.create(payer=payer, payee=payee, **defaults)


def _make_payment_method(user, **kwargs):
    """Crea un metodo de pago minimo."""
    defaults = {
        'payment_type': 'credit_card',
        'name': 'Visa personal',
        'card_brand': 'visa',
        'card_last_four': '4242',
    }
    defaults.update(kwargs)
    return PaymentMethod.objects.create(user=user, **defaults)


def _make_escrow(buyer, seller, **kwargs):
    """Crea una cuenta de escrow minima."""
    defaults = {
        'escrow_type': 'security_deposit',
        'amount': Decimal('1000000.00'),
        'description': 'Deposito de garantia test',
    }
    defaults.update(kwargs)
    return EscrowAccount.objects.create(buyer=buyer, seller=seller, **defaults)


def _make_invoice(issuer, recipient, **kwargs):
    """Crea una factura minima."""
    defaults = {
        'invoice_type': 'rent',
        'title': 'Factura de renta',
        'subtotal': Decimal('500000.00'),
        'due_date': date.today() + timedelta(days=30),
    }
    defaults.update(kwargs)
    return Invoice.objects.create(issuer=issuer, recipient=recipient, **defaults)


def _get_results(response_data):
    """Extrae la lista de resultados de una respuesta paginada o plana."""
    if isinstance(response_data, dict) and 'results' in response_data:
        return response_data['results']
    if isinstance(response_data, list):
        return response_data
    return response_data


# -- TransactionAPITests -------------------------------------------------------

class TransactionAPITests(APITestCase):
    """Tests para los endpoints de transacciones."""

    def setUp(self):
        self.user = _make_user('txapi@test.com', 'tenant')
        self.other = _make_user('txother@test.com', 'landlord')

    # 1
    def test_list_transactions_authenticated(self):
        """Usuario autenticado puede listar sus transacciones."""
        _make_transaction(self.user, self.other)
        self.client.force_authenticate(user=self.user)
        url = reverse('payments_api:transaction-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _get_results(resp.data)
        self.assertGreaterEqual(len(results), 1)

    # 2
    def test_list_transactions_unauthenticated_401(self):
        """Usuario no autenticado recibe 401."""
        url = reverse('payments_api:transaction-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    # 3
    def test_create_transaction(self):
        """Crear una transaccion via API."""
        self.client.force_authenticate(user=self.user)
        url = reverse('payments_api:transaction-list')
        data = {
            'payee': str(self.other.pk),
            'transaction_type': 'rent_payment',
            'direction': 'outbound',
            'amount': '500000.00',
            'description': 'Pago renta mayo',
        }
        resp = self.client.post(url, data, format='json')
        self.assertIn(resp.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])

    # 4
    def test_user_sees_only_own_transactions(self):
        """Un usuario solo ve transacciones donde es payer o payee."""
        third = _make_user('third@test.com', 'tenant')
        _make_transaction(self.other, third)  # tx donde self.user no participa
        _make_transaction(self.user, self.other)  # tx propia

        self.client.force_authenticate(user=self.user)
        url = reverse('payments_api:transaction-list')
        resp = self.client.get(url)
        results = _get_results(resp.data)
        user_pk = str(self.user.pk)
        for tx in results:
            payer_pk = str(tx.get('payer', ''))
            payee_pk = str(tx.get('payee', ''))
            self.assertTrue(
                payer_pk == user_pk or payee_pk == user_pk,
                'El usuario ve una transaccion ajena',
            )


# -- PaymentMethodAPITests -----------------------------------------------------

class PaymentMethodAPITests(APITestCase):
    """Tests para los endpoints de metodos de pago."""

    def setUp(self):
        self.user = _make_user('pmapi@test.com', 'tenant')
        self.other = _make_user('pmother@test.com', 'landlord')

    # 5
    def test_list_payment_methods(self):
        """Listar metodos de pago del usuario autenticado."""
        _make_payment_method(self.user)
        self.client.force_authenticate(user=self.user)
        url = reverse('payments_api:payment-method-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _get_results(resp.data)
        self.assertGreaterEqual(len(results), 1)

    # 6
    def test_create_payment_method(self):
        """Crear un metodo de pago via API."""
        self.client.force_authenticate(user=self.user)
        url = reverse('payments_api:payment-method-list')
        data = {
            'payment_type': 'debit_card',
            'name': 'Mastercard debito',
            'card_brand': 'mastercard',
            'card_last_four': '9876',
        }
        resp = self.client.post(url, data, format='json')
        self.assertIn(resp.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])

    # 7
    def test_verify_payment_method(self):
        """Verificar un metodo de pago marca is_verified=True."""
        pm = _make_payment_method(self.user)
        self.client.force_authenticate(user=self.user)
        url = reverse('payments_api:api_verify_payment_method', kwargs={'pk': pm.pk})
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        pm.refresh_from_db()
        self.assertTrue(pm.is_verified)

    # 8
    def test_set_default_payment_method(self):
        """Establecer un metodo de pago como predeterminado."""
        pm = _make_payment_method(self.user)
        self.client.force_authenticate(user=self.user)
        url = reverse('payments_api:api_set_default_payment_method', kwargs={'pk': pm.pk})
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        pm.refresh_from_db()
        self.assertTrue(pm.is_default)

    # 9
    def test_user_sees_only_own_methods(self):
        """Un usuario solo ve sus propios metodos de pago."""
        _make_payment_method(self.user, name='Mia')
        _make_payment_method(self.other, name='Ajena')
        self.client.force_authenticate(user=self.user)
        url = reverse('payments_api:payment-method-list')
        resp = self.client.get(url)
        results = _get_results(resp.data)
        for pm in results:
            self.assertEqual(str(pm.get('user', '')), str(self.user.pk))


# -- InvoiceAPITests -----------------------------------------------------------

class InvoiceAPITests(APITestCase):
    """Tests para los endpoints de facturas."""

    def setUp(self):
        self.issuer = _make_user('invissuer@test.com', 'landlord')
        self.recipient = _make_user('invrecip@test.com', 'tenant')

    # 10
    def test_list_invoices(self):
        """Listar facturas del usuario."""
        _make_invoice(self.issuer, self.recipient)
        self.client.force_authenticate(user=self.issuer)
        url = reverse('payments_api:invoice-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _get_results(resp.data)
        self.assertGreaterEqual(len(results), 1)

    # 11
    def test_create_invoice(self):
        """Crear una factura via ViewSet."""
        self.client.force_authenticate(user=self.issuer)
        url = reverse('payments_api:invoice-list')
        data = {
            'recipient': str(self.recipient.pk),
            'invoice_type': 'rent',
            'title': 'Renta junio',
            'subtotal': '500000.00',
            'due_date': (date.today() + timedelta(days=30)).isoformat(),
        }
        resp = self.client.post(url, data, format='json')
        self.assertIn(resp.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])

    # 12
    def test_pay_invoice(self):
        """Pagar una factura cambia su status a 'paid'."""
        inv = _make_invoice(self.issuer, self.recipient, status='sent')
        self.client.force_authenticate(user=self.recipient)
        url = reverse('payments_api:api_pay_invoice', kwargs={'pk': str(inv.pk)})
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        inv.refresh_from_db()
        self.assertEqual(inv.status, 'paid')

    # 13
    def test_send_invoice(self):
        """Enviar una factura cambia su status a 'sent'."""
        inv = _make_invoice(self.issuer, self.recipient, status='draft')
        self.client.force_authenticate(user=self.issuer)
        url = reverse('payments_api:api_send_invoice', kwargs={'pk': str(inv.pk)})
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        inv.refresh_from_db()
        self.assertEqual(inv.status, 'sent')


# -- EscrowAPITests ------------------------------------------------------------

class EscrowAPITests(APITestCase):
    """Tests para los endpoints de escrow."""

    def setUp(self):
        self.buyer = _make_user('escbuyer@test.com', 'tenant')
        self.seller = _make_user('escseller@test.com', 'landlord')

    # 14
    def test_list_escrow_accounts(self):
        """Listar cuentas de escrow del usuario."""
        _make_escrow(self.buyer, self.seller)
        self.client.force_authenticate(user=self.buyer)
        url = reverse('payments_api:escrow-account-list')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = _get_results(resp.data)
        self.assertGreaterEqual(len(results), 1)

    # 15
    def test_fund_escrow(self):
        """Fondear una cuenta de escrow pendiente."""
        esc = _make_escrow(self.buyer, self.seller, status='pending')
        self.client.force_authenticate(user=self.buyer)
        url = reverse('payments_api:api_fund_escrow', kwargs={'pk': str(esc.pk)})
        resp = self.client.post(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        esc.refresh_from_db()
        self.assertEqual(esc.status, 'funded')


# -- StatsAPITests -------------------------------------------------------------

class StatsAPITests(APITestCase):
    """Tests para los endpoints de estadisticas y balance."""

    def setUp(self):
        self.user = _make_user('statsuser@test.com', 'tenant')

    # 16
    def test_balance_endpoint(self):
        """El endpoint de balance retorna datos validos."""
        self.client.force_authenticate(user=self.user)
        url = reverse('payments_api:api_balance')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('available_balance', resp.data)
        self.assertIn('total_balance', resp.data)

    # 17
    def test_dashboard_stats(self):
        """El endpoint de dashboard stats retorna datos validos."""
        self.client.force_authenticate(user=self.user)
        url = reverse('payments_api:api_payment_dashboard_stats')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# -- PortalAPITests ------------------------------------------------------------

class PortalAPITests(APITestCase):
    """Tests para los portales de tenant y landlord."""

    def setUp(self):
        self.tenant = _make_user('porttenant@test.com', 'tenant')
        self.landlord = _make_user('portlandlord@test.com', 'landlord')

    # 18
    def test_tenant_portal(self):
        """El portal del arrendatario retorna 200."""
        self.client.force_authenticate(user=self.tenant)
        url = reverse('payments_api:api_tenant_portal')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    # 19
    def test_landlord_dashboard(self):
        """El dashboard del arrendador retorna 200."""
        self.client.force_authenticate(user=self.landlord)
        url = reverse('payments_api:api_landlord_dashboard')
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)


# -- PermissionTests -----------------------------------------------------------

class PermissionTests(APITestCase):
    """Tests de permisos generales."""

    # 20
    def test_unauthenticated_access_401(self):
        """Todos los endpoints principales rechazan acceso sin auth."""
        endpoints = [
            reverse('payments_api:transaction-list'),
            reverse('payments_api:payment-method-list'),
            reverse('payments_api:invoice-list'),
            reverse('payments_api:escrow-account-list'),
            reverse('payments_api:api_balance'),
            reverse('payments_api:api_tenant_portal'),
            reverse('payments_api:api_landlord_dashboard'),
        ]
        for url in endpoints:
            resp = self.client.get(url)
            self.assertEqual(
                resp.status_code,
                status.HTTP_401_UNAUTHORIZED,
                f'{url} no rechaza acceso sin autenticacion',
            )
