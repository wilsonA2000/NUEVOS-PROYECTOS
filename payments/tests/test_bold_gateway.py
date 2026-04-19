"""
Tests para BoldGateway — no toca API real (mocks).

Cubre:
- Validación de config
- create_payment éxito y errores
- confirm_payment
- refund_payment (no soportado)
- handle_webhook válido e inválido
"""

import json
import hashlib
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.test import TestCase

from payments.gateways.bold_gateway import BoldGateway

CONFIG = {
    'api_key': 'test_api_key_123',
    'integrity_secret': 'test_integrity_secret',
    'sandbox_mode': True,
}


def _make_gateway(**overrides) -> BoldGateway:
    cfg = {**CONFIG, **overrides}
    return BoldGateway(cfg)


class BoldConfigTests(TestCase):
    def test_validate_config_ok(self):
        gw = _make_gateway()
        self.assertEqual(gw.sandbox_mode, True)
        self.assertEqual(gw.integrity_secret, 'test_integrity_secret')

    def test_validate_config_missing_api_key(self):
        with self.assertRaises(ValueError):
            BoldGateway({'sandbox_mode': True})

    def test_validates_non_cop_currency(self):
        gw = _make_gateway()
        result = gw.create_payment(
            amount=Decimal('100000'),
            currency='USD',
            customer_email='test@test.com',
            customer_name='Test User',
            description='Test',
            reference='REF-001',
        )
        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'INVALID_CURRENCY')


class BoldCreatePaymentTests(TestCase):
    @patch('payments.gateways.bold_gateway.requests.post')
    def test_create_payment_success(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {
            'payload': {
                'payment_link': 'https://checkout.bold.co/payment/LNK_TEST',
                'payment_link_id': 'LNK_TEST',
            }
        }
        mock_post.return_value = mock_resp

        gw = _make_gateway()
        result = gw.create_payment(
            amount=Decimal('500000'),
            currency='COP',
            customer_email='tenant@test.com',
            customer_name='Juan Pérez',
            description='Canon arrendamiento Mayo 2026',
            reference='PO-2026-00000001',
        )

        self.assertTrue(result.success)
        self.assertEqual(result.transaction_id, 'PO-2026-00000001')
        self.assertEqual(result.gateway_reference, 'LNK_TEST')
        self.assertEqual(result.status, 'pending')
        self.assertIn('checkout_url', result.metadata)
        self.assertEqual(result.metadata['checkout_url'], 'https://checkout.bold.co/payment/LNK_TEST')

    @patch('payments.gateways.bold_gateway.requests.post')
    def test_create_payment_api_error(self, mock_post):
        import requests as req_lib
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = req_lib.HTTPError(response=mock_resp)
        mock_resp.json.return_value = {'errors': [{'message': 'API key inválido'}]}
        mock_post.return_value = mock_resp

        gw = _make_gateway()
        result = gw.create_payment(
            amount=Decimal('100000'),
            currency='COP',
            customer_email='t@t.com',
            customer_name='T',
            description='Test',
            reference='REF-ERR',
        )

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'BOLD_API_ERROR')
        self.assertIn('API key inválido', result.error_message)

    @patch('payments.gateways.bold_gateway.requests.post')
    def test_create_payment_network_error(self, mock_post):
        import requests as req_lib
        mock_post.side_effect = req_lib.ConnectionError('No route to host')

        gw = _make_gateway()
        result = gw.create_payment(
            amount=Decimal('200000'),
            currency='COP',
            customer_email='t@t.com',
            customer_name='T',
            description='Test',
            reference='REF-NET',
        )

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'NETWORK_ERROR')

    @patch('payments.gateways.bold_gateway.requests.post')
    def test_payload_uses_integer_pesos(self, mock_post):
        """Bold espera monto en pesos enteros, no centavos."""
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {'payload': {'payment_link': 'url', 'payment_link_id': 'L1'}}
        mock_post.return_value = mock_resp

        gw = _make_gateway()
        gw.create_payment(
            amount=Decimal('850000'),
            currency='COP',
            customer_email='e@e.com',
            customer_name='E',
            description='D',
            reference='R1',
        )

        sent_body = mock_post.call_args.kwargs.get('json') or mock_post.call_args.args[1]
        # 850000 pesos — NOT 85000000 centavos
        self.assertEqual(sent_body['amount'], 850000)
        self.assertEqual(sent_body['amount_type'], 'CLOSE')
        self.assertEqual(sent_body['currency'], 'COP')


class BoldConfirmPaymentTests(TestCase):
    @patch('payments.gateways.bold_gateway.requests.get')
    def test_confirm_approved(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {
            'payload': {
                'status': 'APPROVED',
                'reference': 'PO-2026-00000001',
                'amount': 500000,
                'payment_method': 'PSE',
            }
        }
        mock_get.return_value = mock_resp

        gw = _make_gateway()
        result = gw.confirm_payment('LNK_TEST')

        self.assertTrue(result.success)
        self.assertEqual(result.status, 'completed')
        self.assertEqual(result.amount, Decimal('500000'))

    @patch('payments.gateways.bold_gateway.requests.get')
    def test_confirm_pending(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {'payload': {'status': 'PENDING', 'amount': 100000}}
        mock_get.return_value = mock_resp

        gw = _make_gateway()
        result = gw.confirm_payment('LNK_PEND')

        self.assertFalse(result.success)
        self.assertEqual(result.status, 'pending')


class BoldRefundTests(TestCase):
    def test_refund_not_supported(self):
        gw = _make_gateway()
        result = gw.refund_payment('LNK_TEST')
        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'REFUND_NOT_SUPPORTED')


class BoldWebhookTests(TestCase):
    def _make_signature(self, payload: dict) -> str:
        payload_str = json.dumps(payload, separators=(',', ':'), sort_keys=True)
        return hashlib.sha256(
            f'{payload_str}{CONFIG["integrity_secret"]}'.encode('utf-8')
        ).hexdigest()

    def test_webhook_valid_signature_approved(self):
        payload = {
            'type': 'PAYMENT',
            'data': {
                'reference': 'PO-2026-00000001',
                'status': 'APPROVED',
                'order_id': 'ORD_001',
                'amount': 500000,
                'currency': 'COP',
                'payment_method': 'PSE',
            }
        }
        sig = self._make_signature(payload)
        gw = _make_gateway()
        result = gw.handle_webhook(payload, {'x-bold-signature': sig})

        self.assertTrue(result.success)
        self.assertEqual(result.status, 'completed')
        self.assertEqual(result.transaction_id, 'PO-2026-00000001')
        self.assertEqual(result.amount, Decimal('500000'))

    def test_webhook_invalid_signature_rejected(self):
        payload = {'type': 'PAYMENT', 'data': {'reference': 'R1', 'status': 'APPROVED', 'amount': 0}}
        gw = _make_gateway()
        result = gw.handle_webhook(payload, {'x-bold-signature': 'bad_sig'})

        self.assertFalse(result.success)
        self.assertEqual(result.error_code, 'INVALID_SIGNATURE')

    def test_webhook_no_secret_skips_validation(self):
        """Si no hay integrity_secret configurado, no se valida firma."""
        payload = {
            'type': 'PAYMENT',
            'data': {'reference': 'R2', 'status': 'DECLINED', 'amount': 100000, 'currency': 'COP'}
        }
        gw = _make_gateway(integrity_secret='')
        result = gw.handle_webhook(payload, {'x-bold-signature': 'any'})

        # Sin secreto no rechaza por firma — solo procesa el status
        self.assertFalse(result.success)   # DECLINED → failed
        self.assertEqual(result.status, 'failed')

    def test_webhook_declined_maps_to_failed(self):
        payload = {
            'type': 'PAYMENT',
            'data': {'reference': 'R3', 'status': 'DECLINED', 'amount': 200000, 'currency': 'COP'}
        }
        sig = self._make_signature(payload)
        gw = _make_gateway()
        result = gw.handle_webhook(payload, {'x-bold-signature': sig})

        self.assertFalse(result.success)
        self.assertEqual(result.status, 'failed')
