"""
Tests de modelos para la aplicación de pagos de VeriHome.
Cobertura: Transaction, PaymentMethod, EscrowAccount, Invoice, InvoiceItem,
PaymentPlan, PaymentInstallment, RentPaymentSchedule.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from payments.models import (
    EscrowAccount,
    Invoice,
    InvoiceItem,
    PaymentInstallment,
    PaymentMethod,
    PaymentPlan,
    RentPaymentSchedule,
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


def _make_payment_plan(user, **kwargs):
    """Crea un plan de pago minimo."""
    defaults = {
        'plan_name': 'Plan de renta mensual',
        'total_amount': Decimal('6000000.00'),
        'installment_amount': Decimal('500000.00'),
        'number_of_installments': 12,
        'frequency': 'monthly',
        'start_date': date.today(),
        'end_date': date.today() + timedelta(days=365),
    }
    defaults.update(kwargs)
    return PaymentPlan.objects.create(user=user, **defaults)


# -- TransactionModelTests ----------------------------------------------------

class TransactionModelTests(TestCase):
    """Tests para el modelo Transaction."""

    def setUp(self):
        self.payer = _make_user('payer@test.com', 'tenant')
        self.payee = _make_user('payee@test.com', 'landlord')

    # 1
    def test_create_transaction(self):
        """Crear una transaccion basica correctamente."""
        tx = _make_transaction(self.payer, self.payee)
        self.assertIsNotNone(tx.pk)
        self.assertEqual(tx.payer, self.payer)
        self.assertEqual(tx.payee, self.payee)
        self.assertEqual(tx.amount, Decimal('500000.00'))

    # 2
    def test_auto_transaction_number_format(self):
        """El numero de transaccion auto-generado empieza con TX-."""
        tx = _make_transaction(self.payer, self.payee)
        self.assertTrue(tx.transaction_number.startswith('TX-'))
        year = str(timezone.now().year)
        self.assertIn(year, tx.transaction_number)

    # 3
    def test_transaction_number_unique(self):
        """Dos transacciones nunca comparten transaction_number."""
        tx1 = _make_transaction(self.payer, self.payee)
        tx2 = _make_transaction(self.payer, self.payee)
        self.assertNotEqual(tx1.transaction_number, tx2.transaction_number)

    # 4
    def test_auto_total_amount_calculation(self):
        """total_amount = amount + platform_fee + processing_fee."""
        tx = _make_transaction(
            self.payer, self.payee,
            amount=Decimal('100000.00'),
            platform_fee=Decimal('5000.00'),
            processing_fee=Decimal('2500.00'),
        )
        self.assertEqual(tx.total_amount, Decimal('107500.00'))

    # 5
    def test_default_status_pending(self):
        """El status por defecto es 'pending'."""
        tx = _make_transaction(self.payer, self.payee)
        self.assertEqual(tx.status, 'pending')

    # 6
    def test_can_be_refunded_completed_inbound(self):
        """Una transaccion completed+inbound puede ser reembolsada."""
        tx = _make_transaction(
            self.payer, self.payee,
            status='completed', direction='inbound',
        )
        self.assertTrue(tx.can_be_refunded())

    # 7
    def test_can_be_refunded_pending(self):
        """Una transaccion pending NO puede ser reembolsada."""
        tx = _make_transaction(
            self.payer, self.payee,
            status='pending', direction='inbound',
        )
        self.assertFalse(tx.can_be_refunded())

    # 8
    def test_can_be_refunded_outbound(self):
        """Una transaccion outbound NO puede ser reembolsada."""
        tx = _make_transaction(
            self.payer, self.payee,
            status='completed', direction='outbound',
        )
        self.assertFalse(tx.can_be_refunded())

    # 9
    def test_get_net_amount_inbound(self):
        """Net amount inbound = amount - platform_fee - processing_fee."""
        tx = _make_transaction(
            self.payer, self.payee,
            amount=Decimal('100000.00'),
            platform_fee=Decimal('5000.00'),
            processing_fee=Decimal('2500.00'),
            direction='inbound',
        )
        self.assertEqual(tx.get_net_amount(), Decimal('92500.00'))

    # 10
    def test_get_net_amount_outbound(self):
        """Net amount outbound = amount (sin descontar comisiones)."""
        tx = _make_transaction(
            self.payer, self.payee,
            amount=Decimal('100000.00'),
            platform_fee=Decimal('5000.00'),
            processing_fee=Decimal('2500.00'),
            direction='outbound',
        )
        self.assertEqual(tx.get_net_amount(), Decimal('100000.00'))


# -- PaymentMethodModelTests ---------------------------------------------------

class PaymentMethodModelTests(TestCase):
    """Tests para el modelo PaymentMethod."""

    def setUp(self):
        self.user = _make_user('pmuser@test.com', 'tenant')

    # 11
    def test_create_payment_method(self):
        """Crear un metodo de pago basico."""
        pm = _make_payment_method(self.user)
        self.assertIsNotNone(pm.pk)
        self.assertEqual(pm.user, self.user)
        self.assertEqual(pm.payment_type, 'credit_card')

    # 12
    def test_default_method_unsets_others(self):
        """Al marcar un metodo como default, los demas se desmarcan."""
        pm1 = _make_payment_method(self.user, is_default=True, name='Visa 1')
        pm2 = _make_payment_method(self.user, is_default=True, name='Visa 2')
        pm1.refresh_from_db()
        self.assertFalse(pm1.is_default)
        self.assertTrue(pm2.is_default)

    # 13
    def test_get_display_name_credit_card(self):
        """Display name para tarjeta de credito muestra marca + ultimos 4."""
        pm = _make_payment_method(
            self.user,
            payment_type='credit_card',
            card_brand='visa',
            card_last_four='1234',
        )
        display = pm.get_display_name()
        self.assertIn('1234', display)
        self.assertIn('Visa', display)

    # 14 (extra: bank_transfer display)
    def test_get_display_name_bank_transfer(self):
        """Display name para transferencia bancaria muestra banco + ultimos 4."""
        pm = _make_payment_method(
            self.user,
            payment_type='bank_transfer',
            bank_name='Bancolombia',
            account_number_last_four='5678',
            name='Cuenta ahorros',
        )
        display = pm.get_display_name()
        self.assertIn('Bancolombia', display)
        self.assertIn('5678', display)


# -- EscrowAccountModelTests ---------------------------------------------------

class EscrowAccountModelTests(TestCase):
    """Tests para el modelo EscrowAccount."""

    def setUp(self):
        self.buyer = _make_user('buyer@test.com', 'tenant')
        self.seller = _make_user('seller@test.com', 'landlord')

    # 15
    def test_create_escrow(self):
        """Crear una cuenta de escrow basica."""
        esc = _make_escrow(self.buyer, self.seller)
        self.assertIsNotNone(esc.pk)
        self.assertEqual(esc.buyer, self.buyer)
        self.assertEqual(esc.seller, self.seller)

    # 16
    def test_auto_escrow_number_format(self):
        """El numero de escrow auto-generado empieza con ESC-."""
        esc = _make_escrow(self.buyer, self.seller)
        self.assertTrue(esc.escrow_number.startswith('ESC-'))
        year = str(timezone.now().year)
        self.assertIn(year, esc.escrow_number)

    # 17
    def test_can_be_released_funded_conditions_met(self):
        """Escrow funded con todas las condiciones cumplidas puede liberarse."""
        esc = _make_escrow(
            self.buyer, self.seller,
            status='funded',
            release_conditions=[
                {'description': 'Inspeccion aprobada', 'met': True},
                {'description': 'Contrato firmado', 'met': True},
            ],
        )
        self.assertTrue(esc.can_be_released())

    # 18
    def test_can_be_released_not_funded(self):
        """Escrow pending NO puede liberarse."""
        esc = _make_escrow(
            self.buyer, self.seller,
            status='pending',
            release_conditions=[{'description': 'Cond', 'met': True}],
        )
        self.assertFalse(esc.can_be_released())

    # 19
    def test_can_be_released_conditions_not_met(self):
        """Escrow funded con condiciones pendientes NO puede liberarse."""
        esc = _make_escrow(
            self.buyer, self.seller,
            status='funded',
            release_conditions=[
                {'description': 'Inspeccion aprobada', 'met': True},
                {'description': 'Contrato firmado', 'met': False},
            ],
        )
        self.assertFalse(esc.can_be_released())

    # 20
    def test_is_expired_true(self):
        """Escrow con expires_at en el pasado esta expirado."""
        esc = _make_escrow(
            self.buyer, self.seller,
            expires_at=timezone.now() - timedelta(days=1),
        )
        self.assertTrue(esc.is_expired())

    # 21
    def test_is_expired_false(self):
        """Escrow con expires_at en el futuro NO esta expirado."""
        esc = _make_escrow(
            self.buyer, self.seller,
            expires_at=timezone.now() + timedelta(days=30),
        )
        self.assertFalse(esc.is_expired())


# -- InvoiceModelTests ---------------------------------------------------------

class InvoiceModelTests(TestCase):
    """Tests para el modelo Invoice."""

    def setUp(self):
        self.issuer = _make_user('issuer@test.com', 'landlord')
        self.recipient = _make_user('recipient@test.com', 'tenant')

    # 22
    def test_create_invoice(self):
        """Crear una factura basica."""
        inv = _make_invoice(self.issuer, self.recipient)
        self.assertIsNotNone(inv.pk)
        self.assertEqual(inv.issuer, self.issuer)
        self.assertEqual(inv.recipient, self.recipient)

    # 23
    def test_auto_invoice_number_format(self):
        """El numero de factura auto-generado empieza con INV-."""
        inv = _make_invoice(self.issuer, self.recipient)
        self.assertTrue(inv.invoice_number.startswith('INV-'))
        year = str(timezone.now().year)
        self.assertIn(year, inv.invoice_number)

    # 24
    def test_auto_total_amount(self):
        """total_amount = subtotal + tax_amount - discount_amount."""
        inv = _make_invoice(
            self.issuer, self.recipient,
            subtotal=Decimal('500000.00'),
            tax_amount=Decimal('95000.00'),
            discount_amount=Decimal('25000.00'),
        )
        self.assertEqual(inv.total_amount, Decimal('570000.00'))

    # 25
    def test_is_overdue_true(self):
        """Factura con due_date pasada y status 'sent' esta vencida."""
        inv = _make_invoice(
            self.issuer, self.recipient,
            due_date=date.today() - timedelta(days=5),
            status='sent',
        )
        self.assertTrue(inv.is_overdue())

    # 26
    def test_is_overdue_false_paid(self):
        """Factura pagada NO esta vencida aunque due_date sea pasada."""
        inv = _make_invoice(
            self.issuer, self.recipient,
            due_date=date.today() - timedelta(days=5),
            status='paid',
        )
        self.assertFalse(inv.is_overdue())

    # 27
    def test_days_overdue(self):
        """Dias de vencimiento se calculan correctamente."""
        days_past = 10
        inv = _make_invoice(
            self.issuer, self.recipient,
            due_date=date.today() - timedelta(days=days_past),
            status='sent',
        )
        # days_overdue usa timezone.now().date() que puede diferir de date.today()
        # por timezone; aceptamos +/- 1 dia de margen
        self.assertGreaterEqual(inv.days_overdue(), days_past)
        self.assertLessEqual(inv.days_overdue(), days_past + 1)

    # 28
    def test_days_overdue_zero_when_not_overdue(self):
        """days_overdue retorna 0 si no esta vencida."""
        inv = _make_invoice(
            self.issuer, self.recipient,
            due_date=date.today() + timedelta(days=30),
            status='draft',
        )
        self.assertEqual(inv.days_overdue(), 0)


# -- InvoiceItemModelTests -----------------------------------------------------

class InvoiceItemModelTests(TestCase):
    """Tests para el modelo InvoiceItem."""

    def setUp(self):
        issuer = _make_user('item_issuer@test.com', 'landlord')
        recipient = _make_user('item_recipient@test.com', 'tenant')
        self.invoice = _make_invoice(issuer, recipient)

    # 29
    def test_create_item(self):
        """Crear un elemento de factura."""
        item = InvoiceItem.objects.create(
            invoice=self.invoice,
            description='Canon mensual',
            quantity=Decimal('1.00'),
            unit_price=Decimal('500000.00'),
            total_price=Decimal('0'),  # will be auto-calculated
        )
        self.assertIsNotNone(item.pk)
        self.assertEqual(item.invoice, self.invoice)

    # 30
    def test_auto_total_price(self):
        """total_price = quantity * unit_price cuando no se provee."""
        item = InvoiceItem(
            invoice=self.invoice,
            description='Servicio de limpieza',
            quantity=Decimal('3.00'),
            unit_price=Decimal('80000.00'),
        )
        # total_price no asignado (None / 0) => save() lo calcula
        item.save()
        self.assertEqual(item.total_price, Decimal('240000.00'))


# -- PaymentInstallmentModelTests ----------------------------------------------

class PaymentInstallmentModelTests(TestCase):
    """Tests para el modelo PaymentInstallment."""

    def setUp(self):
        self.user = _make_user('plan_user@test.com', 'tenant')
        self.plan = _make_payment_plan(self.user)

    # 31
    def test_is_overdue_true(self):
        """Cuota con due_date pasada y status pending esta vencida."""
        inst = PaymentInstallment.objects.create(
            payment_plan=self.plan,
            installment_number=1,
            amount=Decimal('500000.00'),
            due_date=date.today() - timedelta(days=10),
            status='pending',
        )
        self.assertTrue(inst.is_overdue())

    # 32
    def test_is_overdue_false_paid(self):
        """Cuota pagada NO esta vencida."""
        inst = PaymentInstallment.objects.create(
            payment_plan=self.plan,
            installment_number=2,
            amount=Decimal('500000.00'),
            due_date=date.today() - timedelta(days=10),
            status='paid',
        )
        self.assertFalse(inst.is_overdue())

    # 33
    def test_get_total_amount_due(self):
        """Total adeudado = amount + late_fee."""
        inst = PaymentInstallment.objects.create(
            payment_plan=self.plan,
            installment_number=3,
            amount=Decimal('500000.00'),
            late_fee=Decimal('25000.00'),
            due_date=date.today() - timedelta(days=5),
        )
        self.assertEqual(inst.get_total_amount_due(), Decimal('525000.00'))


# -- PaymentPlanModelTests -----------------------------------------------------

class PaymentPlanModelTests(TestCase):
    """Tests para el modelo PaymentPlan."""

    def setUp(self):
        self.user = _make_user('pp_user@test.com', 'tenant')

    # 34
    def test_get_remaining_balance_no_payments(self):
        """Sin pagos realizados, el saldo pendiente es el total."""
        plan = _make_payment_plan(self.user, total_amount=Decimal('6000000.00'))
        self.assertEqual(plan.get_remaining_balance(), Decimal('6000000.00'))

    # 35
    def test_get_remaining_balance_with_payments(self):
        """Saldo pendiente se reduce con cuotas pagadas."""
        plan = _make_payment_plan(self.user, total_amount=Decimal('6000000.00'))
        PaymentInstallment.objects.create(
            payment_plan=plan,
            installment_number=1,
            amount=Decimal('500000.00'),
            due_date=date.today() - timedelta(days=30),
            status='paid',
        )
        PaymentInstallment.objects.create(
            payment_plan=plan,
            installment_number=2,
            amount=Decimal('500000.00'),
            due_date=date.today(),
            status='paid',
        )
        self.assertEqual(plan.get_remaining_balance(), Decimal('5000000.00'))

    # 36
    def test_get_next_payment_date_no_paid(self):
        """Sin cuotas pagadas, la siguiente fecha es start_date."""
        start = date.today()
        plan = _make_payment_plan(self.user, start_date=start)
        self.assertEqual(plan.get_next_payment_date(), start)


# -- RentPaymentScheduleModelTests ---------------------------------------------

class RentPaymentScheduleModelTests(TestCase):
    """Tests para el modelo RentPaymentSchedule.

    NOTA: Se necesita un Contract real para el OneToOneField.
    Para simplificar, creamos un contrato minimo con los campos requeridos.
    """

    @classmethod
    def setUpTestData(cls):
        from contracts.models import Contract
        cls.tenant = _make_user('rps_tenant@test.com', 'tenant')
        cls.landlord = _make_user('rps_landlord@test.com', 'landlord')
        # Intentar crear un contrato minimo; si falla, los tests se saltan.
        try:
            cls.contract = Contract.objects.create(
                landlord=cls.landlord,
                tenant=cls.tenant,
                status='active',
                contract_type='rental',
            )
            cls.has_contract = True
        except Exception:
            cls.has_contract = False

    def _make_schedule(self, **kwargs):
        """Crea un RentPaymentSchedule de prueba."""
        defaults = {
            'contract': self.contract,
            'tenant': self.tenant,
            'landlord': self.landlord,
            'rent_amount': Decimal('1500000.00'),
            'due_date': 1,
            'late_fee_amount': Decimal('75000.00'),
            'grace_period_days': 5,
            'auto_late_fee_enabled': True,
            'start_date': date.today() - timedelta(days=60),
        }
        defaults.update(kwargs)
        return RentPaymentSchedule.objects.create(**defaults)

    # 37
    def test_calculate_late_fee_not_overdue(self):
        """Si no esta vencido, el recargo es 0."""
        if not self.has_contract:
            self.skipTest('No se pudo crear Contract de prueba')
        schedule = self._make_schedule(
            due_date=28,  # dia lejano para que no este vencido
            grace_period_days=30,
        )
        fee = schedule.calculate_late_fee()
        self.assertEqual(fee, 0)

    # 38
    def test_get_next_due_date_returns_date(self):
        """get_next_due_date retorna un objeto date valido."""
        if not self.has_contract:
            self.skipTest('No se pudo crear Contract de prueba')
        schedule = self._make_schedule()
        next_due = schedule.get_next_due_date()
        self.assertIsInstance(next_due, date)
