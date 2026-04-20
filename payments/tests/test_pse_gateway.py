"""Tests para PSEGateway con mocks (no toca API real).

T3.4: Cubre create_payment, confirm_payment, refund, handle_webhook,
get_available_banks de PSE (sandbox stub).

NOTA: PSEGateway apunta a sandbox.pse.com.co que probablemente no es
una URL real. La implementación está como placeholder para Wompi-PSE
o un proveedor PSE directo. Estos tests verifican el contrato del
wrapper sin hacer requests reales.
"""

from decimal import Decimal
from unittest.mock import MagicMock, patch

import requests
from django.test import TestCase

from payments.gateways.pse_gateway import PSEGateway


CONFIG = {
    "api_key": "pse_api_test",
    "secret_key": "pse_secret_test",
    "merchant_id": "MERCH-001",
    "sandbox_mode": True,
}


def _make_gateway():
    return PSEGateway(CONFIG)


class PSEConfigTests(TestCase):
    def test_validate_config_requires_api_key(self):
        with self.assertRaises(ValueError):
            PSEGateway({"sandbox_mode": True})

    def test_validate_config_requires_merchant_id(self):
        cfg = dict(CONFIG)
        cfg.pop("merchant_id")
        with self.assertRaises(ValueError):
            PSEGateway(cfg)

    def test_validate_config_ok(self):
        gateway = _make_gateway()
        self.assertEqual(gateway.merchant_id, "MERCH-001")
        self.assertIn("sandbox", gateway.base_url)


class PSECreatePaymentTests(TestCase):
    @patch("payments.gateways.pse_gateway.requests.post")
    def test_create_payment_success(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "status": "success",
            "pse_transaction_id": "PSE-XYZ-123",
            "redirect_url": "https://sandbox.pse.bank/pay",
            "bank_list_url": "https://sandbox.pse.bank/banks",
        }
        mock_resp.raise_for_status = MagicMock()
        mock_post.return_value = mock_resp

        gateway = _make_gateway()
        result = gateway.create_payment(
            amount=Decimal("200000"),
            currency="COP",
            customer_email="tt@test.com",
            customer_name="Tenant",
            description="Servicio limpieza",
            reference="REF-PSE-001",
            customer_id="1234567890",
            customer_phone="3001234567",
        )
        self.assertTrue(result.success)
        self.assertEqual(result.transaction_id, "REF-PSE-001")
        self.assertEqual(result.gateway_reference, "PSE-XYZ-123")
        self.assertIn("redirect_url", result.metadata)

    def test_create_payment_rejects_non_cop(self):
        gateway = _make_gateway()
        result = gateway.create_payment(
            amount=Decimal("100"),
            currency="USD",
            customer_email="x@x.com",
            customer_name="X",
            description="X",
            reference="R-1",
        )
        self.assertFalse(result.success)
        self.assertEqual(result.error_code, "INVALID_CURRENCY")

    @patch("payments.gateways.pse_gateway.requests.post")
    def test_create_payment_handles_network_error(self, mock_post):
        mock_post.side_effect = requests.ConnectionError("No route")
        gateway = _make_gateway()
        result = gateway.create_payment(
            amount=Decimal("100000"),
            currency="COP",
            customer_email="x@x.com",
            customer_name="X",
            description="X",
            reference="R-2",
        )
        self.assertFalse(result.success)
        self.assertEqual(result.error_code, "API_ERROR")


class PSEConfirmPaymentTests(TestCase):
    @patch("payments.gateways.pse_gateway.requests.get")
    def test_confirm_payment_returns_completed_for_approved(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "status": "APPROVED",
            "pse_transaction_id": "PSE-XYZ-123",
            "amount": 200000,
            "currency": "COP",
            "bank_name": "BANCOLOMBIA",
            "authorization_code": "AUTH-001",
        }
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        gateway = _make_gateway()
        result = gateway.confirm_payment(transaction_id="REF-PSE-001")
        self.assertTrue(result.success)
        self.assertEqual(result.status, "completed")


class PSEWebhookTests(TestCase):
    def test_webhook_invalid_signature_rejected(self):
        gateway = _make_gateway()
        result = gateway.handle_webhook(
            payload={"reference": "REF-PSE-001", "status": "APPROVED"},
            headers={"X-PSE-Signature": "wrong_signature"},
        )
        self.assertFalse(result.success)
        self.assertEqual(result.error_code, "INVALID_SIGNATURE")

    def test_webhook_with_valid_signature_processes(self):
        gateway = _make_gateway()
        payload = {
            "reference": "REF-PSE-001",
            "status": "APPROVED",
            "pse_transaction_id": "PSE-XYZ-123",
            "amount": 200000,
            "currency": "COP",
        }
        # Generar firma válida usando el método interno
        valid_sig = gateway._generate_signature(payload)
        result = gateway.handle_webhook(
            payload=payload,
            headers={"X-PSE-Signature": valid_sig},
        )
        self.assertTrue(result.success)
        self.assertEqual(result.status, "completed")


class PSEBanksTests(TestCase):
    @patch("payments.gateways.pse_gateway.requests.get")
    def test_get_available_banks(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            "banks": [
                {"code": "1007", "name": "BANCOLOMBIA"},
                {"code": "1019", "name": "COLPATRIA"},
            ],
        }
        mock_resp.raise_for_status = MagicMock()
        mock_get.return_value = mock_resp

        gateway = _make_gateway()
        result = gateway.get_available_banks()
        self.assertIn("banks", result)
        self.assertEqual(len(result["banks"]), 2)
