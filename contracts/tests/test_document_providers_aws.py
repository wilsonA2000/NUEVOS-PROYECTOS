"""Tests del AWSTextractProvider con MagicMock sobre boto3.client('textract').

No llama AWS real: todos los tests inyectan `client=MagicMock()` directo
o mockean `boto3.client` en el módulo.
"""

from __future__ import annotations

import base64
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from contracts.biometric_providers import (
    DemoDocumentProvider,
    get_document_provider,
)
from contracts.biometric_providers.aws_textract import AWSTextractProvider

SAMPLE_IMG_B64 = base64.b64encode(b"\x89PNG\r\nfake").decode()
SAMPLE_DATAURL = f"data:image/png;base64,{SAMPLE_IMG_B64}"


def _analyze_id_response(
    *, first="JUAN", last="PEREZ", number="AR123456", doc_type="PASSPORT",
    dob="1990-03-12", expiry="2030-07-15", confidence=95.0
) -> dict:
    return {
        "IdentityDocuments": [
            {
                "IdentityDocumentFields": [
                    {
                        "Type": {"Text": "FIRST_NAME"},
                        "ValueDetection": {"Text": first, "Confidence": confidence},
                    },
                    {
                        "Type": {"Text": "LAST_NAME"},
                        "ValueDetection": {"Text": last, "Confidence": confidence},
                    },
                    {
                        "Type": {"Text": "DOCUMENT_NUMBER"},
                        "ValueDetection": {"Text": number, "Confidence": confidence},
                    },
                    {
                        "Type": {"Text": "ID_TYPE"},
                        "ValueDetection": {"Text": doc_type, "Confidence": confidence},
                    },
                    {
                        "Type": {"Text": "DATE_OF_BIRTH"},
                        "ValueDetection": {"Text": dob, "Confidence": confidence},
                    },
                    {
                        "Type": {"Text": "EXPIRATION_DATE"},
                        "ValueDetection": {"Text": expiry, "Confidence": confidence},
                    },
                ]
            }
        ]
    }


def _detect_text_response(lines: list[str], confidence: float = 92.0) -> dict:
    return {
        "Blocks": [
            {"BlockType": "LINE", "Text": text, "Confidence": confidence}
            for text in lines
        ]
    }


class AnalyzeIdTests(SimpleTestCase):
    def test_pasaporte_happy_path(self):
        client = MagicMock()
        client.analyze_id.return_value = _analyze_id_response()
        provider = AWSTextractProvider(client=client)

        result = provider.analyze_document(SAMPLE_DATAURL, "pasaporte")

        self.assertTrue(result.document_detected)
        self.assertEqual(result.first_name, "JUAN")
        self.assertEqual(result.last_name, "PEREZ")
        self.assertEqual(result.full_name, "JUAN PEREZ")
        self.assertEqual(result.document_number, "AR123456")
        self.assertEqual(result.provider, "aws_textract")
        self.assertGreater(result.ocr_confidence, 0.9)
        self.assertTrue(result.security_features)
        client.analyze_id.assert_called_once()
        client.detect_document_text.assert_not_called()

    def test_falls_back_to_detect_text_when_confidence_low(self):
        client = MagicMock()
        client.analyze_id.return_value = _analyze_id_response(confidence=30.0)
        client.detect_document_text.return_value = _detect_text_response(
            [
                "REPUBLICA DE COLOMBIA",
                "PASAPORTE",
                "NUMERO AR987654",
                "CARLOS LOPEZ",
            ]
        )
        provider = AWSTextractProvider(client=client)
        result = provider.analyze_document(SAMPLE_DATAURL, "pasaporte")

        client.analyze_id.assert_called_once()
        client.detect_document_text.assert_called_once()
        self.assertTrue(result.document_detected)
        self.assertEqual(result.provider, "aws_textract")
        self.assertEqual(result.raw.get("api"), "detect_document_text")

    def test_empty_identity_documents_falls_back(self):
        client = MagicMock()
        client.analyze_id.return_value = {"IdentityDocuments": []}
        client.detect_document_text.return_value = _detect_text_response(
            ["PASAPORTE", "AR111222", "PEDRO RUIZ"]
        )
        provider = AWSTextractProvider(client=client)
        result = provider.analyze_document(SAMPLE_DATAURL, "pasaporte")
        self.assertTrue(result.document_detected)
        client.detect_document_text.assert_called_once()

    def test_client_error_on_analyze_id_falls_back(self):
        client = MagicMock()
        client.analyze_id.side_effect = RuntimeError("network down")
        client.detect_document_text.return_value = _detect_text_response(
            ["PASAPORTE", "AR333444", "MARIA LOPEZ"]
        )
        provider = AWSTextractProvider(client=client)
        result = provider.analyze_document(SAMPLE_DATAURL, "pasaporte")
        self.assertTrue(result.document_detected)


class DetectDocumentTextTests(SimpleTestCase):
    def test_cedula_ciudadania_uses_detect_text_directly(self):
        client = MagicMock()
        client.detect_document_text.return_value = _detect_text_response(
            [
                "REPUBLICA DE COLOMBIA",
                "CEDULA DE CIUDADANIA",
                "NUMERO 1012345678",
                "JUAN PEREZ",
                "FECHA DE NACIMIENTO 12/03/1990",
            ]
        )
        provider = AWSTextractProvider(client=client)
        result = provider.analyze_document(SAMPLE_DATAURL, "cedula_ciudadania")

        client.analyze_id.assert_not_called()
        client.detect_document_text.assert_called_once()
        self.assertEqual(result.detected_type, "cedula_ciudadania")
        self.assertEqual(result.document_number, "1012345678")
        self.assertTrue(result.document_number_valid)
        self.assertTrue(result.type_matches)
        # Cédula CO no vence: expiry_date_valid debe ser True igualmente.
        self.assertTrue(result.expiry_date_valid)

    def test_no_text_returns_not_detected(self):
        client = MagicMock()
        client.detect_document_text.return_value = {"Blocks": []}
        provider = AWSTextractProvider(client=client)
        result = provider.analyze_document(SAMPLE_DATAURL, "cedula_ciudadania")
        self.assertFalse(result.document_detected)
        self.assertEqual(result.quality_score, 0.0)

    def test_detect_text_client_error_returns_empty(self):
        client = MagicMock()
        client.detect_document_text.side_effect = RuntimeError("aws down")
        provider = AWSTextractProvider(client=client)
        result = provider.analyze_document(SAMPLE_DATAURL, "cedula_ciudadania")
        self.assertFalse(result.document_detected)
        self.assertEqual(result.provider, "aws_textract")

    def test_type_mismatch_detected(self):
        client = MagicMock()
        client.detect_document_text.return_value = _detect_text_response(
            [
                "REPUBLICA DE COLOMBIA",
                "TARJETA DE IDENTIDAD",
                "1012345678",
                "JUAN PEREZ",
            ]
        )
        provider = AWSTextractProvider(client=client)
        result = provider.analyze_document(SAMPLE_DATAURL, "cedula_ciudadania")
        self.assertEqual(result.detected_type, "tarjeta_identidad")
        self.assertFalse(result.type_matches)

    def test_rejects_empty_input(self):
        client = MagicMock()
        provider = AWSTextractProvider(client=client)
        with self.assertRaises(ValueError):
            provider.analyze_document("", "cedula_ciudadania")


class InitAndFactoryTests(SimpleTestCase):
    @override_settings(
        AWS_TEXTRACT_ACCESS_KEY_ID="",
        AWS_TEXTRACT_SECRET_ACCESS_KEY="",
    )
    def test_init_without_credentials_raises(self):
        with self.assertRaises(RuntimeError):
            AWSTextractProvider()

    @override_settings(
        AWS_TEXTRACT_ACCESS_KEY_ID="AKIAFAKE",
        AWS_TEXTRACT_SECRET_ACCESS_KEY="fake-secret",
        AWS_TEXTRACT_REGION="us-east-1",
    )
    def test_init_with_credentials_builds_boto3_client(self):
        with patch("contracts.biometric_providers.aws_textract.boto3") as boto_mock:
            boto_mock.client.return_value = MagicMock()
            provider = AWSTextractProvider()
            self.assertFalse(provider.is_demo())
            boto_mock.client.assert_called_once_with(
                "textract",
                aws_access_key_id="AKIAFAKE",
                aws_secret_access_key="fake-secret",
                region_name="us-east-1",
            )

    def setUp(self):
        get_document_provider.cache_clear()

    def tearDown(self):
        get_document_provider.cache_clear()

    @override_settings(BIOMETRIC_DOCUMENT_PROVIDER="aws_textract")
    def test_factory_falls_back_when_init_raises(self):
        with patch(
            "contracts.biometric_providers.aws_textract.AWSTextractProvider.__init__",
            side_effect=RuntimeError("credentials missing"),
        ):
            provider = get_document_provider()
            self.assertIsInstance(provider, DemoDocumentProvider)

    @override_settings(
        BIOMETRIC_DOCUMENT_PROVIDER="aws_textract",
        AWS_TEXTRACT_ACCESS_KEY_ID="AKIAFAKE",
        AWS_TEXTRACT_SECRET_ACCESS_KEY="fake-secret",
    )
    def test_factory_builds_aws_when_credentials_present(self):
        with patch("contracts.biometric_providers.aws_textract.boto3") as boto_mock:
            boto_mock.client.return_value = MagicMock()
            provider = get_document_provider()
            self.assertIsInstance(provider, AWSTextractProvider)
            self.assertFalse(provider.is_demo())
