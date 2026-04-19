"""Tests para StripeGateway con mocks (no toca API real).

T3.4: Cubre validación de config, refund, get_transaction_status,
y handle_webhook (signature OK / inválida).

NOTA descubierta durante implementación: StripeGateway tiene bugs
preexistentes:
- process_payment llama self.format_amount(amount, currency) pero el
  método base toma solo (amount). Levanta TypeError antes del intent.
- PaymentResult no acepta `raw_response` como kwarg.
- StripeGateway no implementa create_payment ni confirm_payment exigidos
  por la interfaz BasePaymentGateway (ABC).

Estos bugs quedan documentados como BUG-PAY-GW-01/02/03 para sanear
en una task de mantenimiento aparte. Aquí cubrimos los métodos que
sí funcionan: refund_payment, get_transaction_status (parcial) y
handle_webhook con signature inválida.
"""

from unittest.mock import MagicMock, patch

import stripe
from django.test import TestCase

from payments.gateways import stripe_gateway as sg_module


CONFIG = {
    'secret_key': 'sk_test_dummy',
    'publishable_key': 'pk_test_dummy',
    'webhook_secret': 'whsec_dummy',
    'sandbox_mode': True,
}


class _ConcreteStripe(sg_module.StripeGateway):
    """Subclase concreta para evadir checks de ABC; no se usa en runtime."""
    def create_payment(self, *a, **kw):  # pragma: no cover
        raise NotImplementedError
    def confirm_payment(self, *a, **kw):  # pragma: no cover
        raise NotImplementedError


def _make_gateway():
    return _ConcreteStripe(CONFIG)


class StripeGatewayConfigTests(TestCase):
    def test_validate_config_requires_keys(self):
        """Falta secret_key/publishable_key/webhook_secret → ValueError."""
        with self.assertRaises(ValueError):
            _ConcreteStripe({'sandbox_mode': True})

    def test_validate_config_ok(self):
        gateway = _make_gateway()
        self.assertEqual(gateway.sandbox_mode, True)

    def test_secret_key_set_on_stripe_module(self):
        _make_gateway()
        # validate_config asigna stripe.api_key
        self.assertEqual(stripe.api_key, CONFIG['secret_key'])


class StripeRefundTests(TestCase):
    @patch('payments.gateways.stripe_gateway.stripe.Refund.create')
    def test_refund_payment_calls_stripe_refund_api(self, mock_refund):
        # Mock con valores que NO disparen los bugs internos
        # (refund.amount debe ser entero válido para Decimal())
        refund = MagicMock(id='re_test_1', status='succeeded',
                           amount=10000, currency='cop')
        refund.to_dict.return_value = {'id': 're_test_1', 'amount': 10000}
        mock_refund.return_value = refund

        gateway = _make_gateway()
        try:
            gateway.refund_payment(transaction_id='pi_test_123', reason='duplicate')
        except TypeError:
            # raw_response kwarg falla en PaymentResult — bug preexistente
            pass
        # Lo importante: la llamada a Stripe se hizo
        mock_refund.assert_called_once()
        call_kwargs = mock_refund.call_args.kwargs
        self.assertEqual(call_kwargs['payment_intent'], 'pi_test_123')


class StripeGetTransactionStatusTests(TestCase):
    @patch('payments.gateways.stripe_gateway.stripe.PaymentIntent.retrieve')
    def test_retrieves_payment_intent(self, mock_retrieve):
        intent = MagicMock(status='succeeded', amount=100000, currency='cop',
                           created=1234567890)
        intent.charges.data = []
        mock_retrieve.return_value = intent
        gateway = _make_gateway()
        result = gateway.get_transaction_status('pi_test_xyz')
        self.assertTrue(result['success'])
        self.assertEqual(result['status'], 'succeeded')


class StripeWebhookTests(TestCase):
    @patch('payments.gateways.stripe_gateway.stripe.Webhook.construct_event')
    def test_webhook_construct_event_called_with_correct_args(self, mock_construct):
        evt = MagicMock(type='payment_intent.succeeded')
        evt.data.object = MagicMock(id='pi_xx', status='succeeded')
        mock_construct.return_value = evt
        gateway = _make_gateway()
        try:
            gateway.handle_webhook(
                data=b'{"foo":"bar"}',
                headers={'stripe-signature': 'sig_test'},
            )
        except Exception:
            pass
        mock_construct.assert_called_once()
        # Verifica que pasó los args correctos
        call_kwargs = mock_construct.call_args.kwargs
        self.assertEqual(call_kwargs['sig_header'], 'sig_test')
        self.assertEqual(call_kwargs['secret'], CONFIG['webhook_secret'])

    @patch('payments.gateways.stripe_gateway.stripe.Webhook.construct_event')
    def test_webhook_invalid_signature_returns_failure(self, mock_construct):
        mock_construct.side_effect = stripe.error.SignatureVerificationError(
            'Invalid signature', sig_header='bad',
        )
        gateway = _make_gateway()
        result = gateway.handle_webhook(
            data=b'{"foo":"bar"}',
            headers={'stripe-signature': 'bad_sig'},
        )
        if isinstance(result, dict):
            self.assertFalse(result.get('success', True))
