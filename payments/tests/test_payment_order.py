"""Tests para PaymentOrder model + ViewSet con filtros por rol.

Cubre:
- order_number consecutivo PO-YYYY-NNNNNNNN auto-generado
- total_amount = amount + interest_amount, balance correcto
- audit_log estructurado
- Endpoints filtrados por rol (admin ve todo, partes ven las suyas)
- Filtros query: order_type, status, overdue
- Action cancel + summary
"""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from payments.models import PaymentOrder

User = get_user_model()


def _user(email, user_type='tenant', is_staff=False):
    return User.objects.create_user(
        email=email, password='test1234',
        first_name='X', last_name='Y',
        user_type=user_type, is_staff=is_staff,
    )


def _order(payer, payee, **kw):
    defaults = dict(
        order_type='rent',
        amount=Decimal('1500000'),
        date_due=date.today() + timedelta(days=15),
        created_by=payee,
    )
    defaults.update(kw)
    return PaymentOrder.objects.create(payer=payer, payee=payee, **defaults)


class PaymentOrderModelTests(TestCase):
    """Tests del modelo PaymentOrder."""

    def test_order_number_auto_generated(self):
        landlord = _user('ll1@test.com', 'landlord')
        tenant = _user('tt1@test.com', 'tenant')
        order = _order(payer=tenant, payee=landlord)
        self.assertTrue(order.order_number.startswith('PO-'))
        self.assertEqual(len(order.order_number.split('-')[-1]), 8)  # 8 dígitos

    def test_consecutive_numbers(self):
        landlord = _user('ll2@test.com', 'landlord')
        tenant = _user('tt2@test.com', 'tenant')
        o1 = _order(payer=tenant, payee=landlord)
        o2 = _order(payer=tenant, payee=landlord)
        n1 = int(o1.order_number.split('-')[-1])
        n2 = int(o2.order_number.split('-')[-1])
        self.assertEqual(n2, n1 + 1)

    def test_total_amount_includes_interest(self):
        landlord = _user('ll3@test.com', 'landlord')
        tenant = _user('tt3@test.com', 'tenant')
        order = _order(
            payer=tenant, payee=landlord,
            amount=Decimal('1000000'),
            interest_amount=Decimal('25000'),
        )
        self.assertEqual(order.total_amount, Decimal('1025000'))
        self.assertEqual(order.balance, Decimal('1025000'))

    def test_balance_after_partial_payment(self):
        landlord = _user('ll4@test.com', 'landlord')
        tenant = _user('tt4@test.com', 'tenant')
        order = _order(payer=tenant, payee=landlord, amount=Decimal('1000000'))
        order.paid_amount = Decimal('400000')
        order.save()
        self.assertEqual(order.balance, Decimal('600000'))

    def test_audit_log_appends_event(self):
        landlord = _user('ll5@test.com', 'landlord')
        tenant = _user('tt5@test.com', 'tenant')
        order = _order(payer=tenant, payee=landlord)
        order.add_audit_event('test_event', 'mensaje de prueba', actor=tenant)
        order.refresh_from_db()
        self.assertEqual(len(order.audit_log), 1)
        self.assertEqual(order.audit_log[0]['type'], 'test_event')
        self.assertEqual(order.audit_log[0]['actor_id'], str(tenant.id))


class PaymentOrderViewSetPermissionsTests(TestCase):
    """Tests de filtros por rol en ViewSet."""

    def setUp(self):
        self.client = APIClient()
        self.admin = _user('admin@test.com', is_staff=True)
        self.landlord = _user('ll@test.com', 'landlord')
        self.tenant = _user('tt@test.com', 'tenant')
        self.other = _user('other@test.com', 'tenant')

        # Una orden donde tenant paga a landlord
        self.order_self = _order(payer=self.tenant, payee=self.landlord)
        # Una orden ajena (no involucra a tenant)
        self.order_other = _order(payer=self.other, payee=self.landlord)

    def test_unauthenticated_returns_401(self):
        response = self.client.get('/api/v1/payments/orders/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_admin_sees_all_orders(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/payments/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['results'] if 'results' in response.data else response.data
        self.assertEqual(len(data), 2)

    def test_tenant_sees_only_own_orders(self):
        self.client.force_authenticate(user=self.tenant)
        response = self.client.get('/api/v1/payments/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['results'] if 'results' in response.data else response.data
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['order_number'], self.order_self.order_number)

    def test_landlord_sees_orders_where_payee(self):
        self.client.force_authenticate(user=self.landlord)
        response = self.client.get('/api/v1/payments/orders/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['results'] if 'results' in response.data else response.data
        # Landlord es payee en ambas
        self.assertEqual(len(data), 2)


class PaymentOrderFiltersTests(TestCase):
    """Tests de filtros por query string."""

    def setUp(self):
        self.client = APIClient()
        self.admin = _user('admin2@test.com', is_staff=True)
        self.landlord = _user('ll@test.com', 'landlord')
        self.tenant = _user('tt@test.com', 'tenant')
        self.client.force_authenticate(user=self.admin)

        _order(payer=self.tenant, payee=self.landlord, order_type='rent', status='pending')
        _order(payer=self.tenant, payee=self.landlord, order_type='service', status='paid')
        _order(
            payer=self.tenant, payee=self.landlord, order_type='rent', status='pending',
            date_due=date.today() - timedelta(days=10),
        )

    def test_filter_by_order_type(self):
        response = self.client.get('/api/v1/payments/orders/?order_type=service')
        data = response.data['results'] if 'results' in response.data else response.data
        self.assertEqual(len(data), 1)

    def test_filter_by_status(self):
        response = self.client.get('/api/v1/payments/orders/?status=paid')
        data = response.data['results'] if 'results' in response.data else response.data
        self.assertEqual(len(data), 1)

    def test_filter_overdue(self):
        response = self.client.get('/api/v1/payments/orders/?overdue=true')
        data = response.data['results'] if 'results' in response.data else response.data
        self.assertEqual(len(data), 1)

    def test_summary_endpoint(self):
        response = self.client.get('/api/v1/payments/orders/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total', response.data)
        self.assertIn('overdue', response.data)
        self.assertEqual(response.data['total'], 3)

    def test_cancel_action(self):
        order = PaymentOrder.objects.filter(status='pending').first()
        # admin sí puede cancelar
        response = self.client.post(f'/api/v1/payments/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, 'cancelled')

    def test_cancel_paid_order_rejected(self):
        order = PaymentOrder.objects.filter(status='paid').first()
        response = self.client.post(f'/api/v1/payments/orders/{order.id}/cancel/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
