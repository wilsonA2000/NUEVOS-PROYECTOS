"""P0.4a · Face Liveness real — backend.

Cubre:
1. Interface `FacialProvider` expone `supports_liveness /
   create_liveness_session / get_liveness_results`.
2. `DemoFacialProvider` responde con session fake + is_live=True.
3. `AWSRekognitionProvider` llama al SDK correcto y normaliza 0-100
   a 0.0-1.0; umbral `is_live` consistente con `min_similarity`.
4. `BiometricAuthenticationService.create_liveness_session` persiste
   metadata en `auth.facial_analysis["liveness_session"]`.
5. `verify_liveness` persiste resultado en `auth.facial_analysis["liveness"]`.
6. Ambos métodos levantan RuntimeError si el provider no soporta liveness.
"""

from __future__ import annotations

from unittest.mock import MagicMock

from django.test import SimpleTestCase, override_settings

from contracts.biometric_providers import (
    DemoFacialProvider,
    LivenessResult,
    LivenessSession,
)
from contracts.biometric_providers.aws_rekognition import AWSRekognitionProvider
from contracts.biometric_service import BiometricAuthenticationService


class DemoLivenessTests(SimpleTestCase):
    def setUp(self):
        self.provider = DemoFacialProvider()

    def test_supports_liveness_true(self):
        self.assertTrue(self.provider.supports_liveness())

    def test_create_liveness_session_returns_handle(self):
        session = self.provider.create_liveness_session()
        self.assertIsInstance(session, LivenessSession)
        self.assertTrue(session.session_id.startswith("demo-"))
        self.assertEqual(session.provider, "demo")

    def test_get_liveness_results_succeeded(self):
        result = self.provider.get_liveness_results("demo-xxx")
        self.assertIsInstance(result, LivenessResult)
        self.assertTrue(result.is_live)
        self.assertEqual(result.status, "SUCCEEDED")
        self.assertGreaterEqual(result.confidence, 0.9)


@override_settings(
    AWS_REKOGNITION_ACCESS_KEY_ID="test-key",
    AWS_REKOGNITION_SECRET_ACCESS_KEY="test-secret",
    AWS_REKOGNITION_REGION="us-east-1",
    BIOMETRIC_MIN_FACE_SIMILARITY=0.85,
)
class AWSRekognitionLivenessTests(SimpleTestCase):
    def _make_provider(self, client: MagicMock) -> AWSRekognitionProvider:
        return AWSRekognitionProvider(client=client)

    def test_supports_liveness_true(self):
        provider = self._make_provider(MagicMock())
        self.assertTrue(provider.supports_liveness())

    def test_create_liveness_session_returns_real_session_id(self):
        client = MagicMock()
        client.create_face_liveness_session.return_value = {
            "SessionId": "aws-abc-123",
        }
        provider = self._make_provider(client)

        session = provider.create_liveness_session()

        client.create_face_liveness_session.assert_called_once_with()
        self.assertEqual(session.session_id, "aws-abc-123")
        self.assertEqual(session.provider, "aws_rekognition")
        self.assertEqual(session.client_region, "us-east-1")

    def test_create_liveness_session_raises_when_no_session_id(self):
        client = MagicMock()
        client.create_face_liveness_session.return_value = {}
        provider = self._make_provider(client)
        with self.assertRaisesMessage(RuntimeError, "SessionId"):
            provider.create_liveness_session()

    def test_get_liveness_results_succeeded_above_threshold(self):
        client = MagicMock()
        client.get_face_liveness_session_results.return_value = {
            "SessionId": "aws-abc-123",
            "Status": "SUCCEEDED",
            "Confidence": 92.7,
            "AuditImages": [],
        }
        provider = self._make_provider(client)

        result = provider.get_liveness_results("aws-abc-123")

        client.get_face_liveness_session_results.assert_called_once_with(
            SessionId="aws-abc-123"
        )
        self.assertTrue(result.is_live)
        self.assertAlmostEqual(result.confidence, 0.927, places=3)
        self.assertEqual(result.status, "SUCCEEDED")

    def test_get_liveness_results_succeeded_below_threshold_is_not_live(self):
        client = MagicMock()
        client.get_face_liveness_session_results.return_value = {
            "Status": "SUCCEEDED",
            "Confidence": 70.0,  # por debajo del 85% threshold
        }
        provider = self._make_provider(client)

        result = provider.get_liveness_results("session-low")

        self.assertFalse(result.is_live)
        self.assertAlmostEqual(result.confidence, 0.70)

    def test_get_liveness_results_failed_is_not_live(self):
        client = MagicMock()
        client.get_face_liveness_session_results.return_value = {
            "Status": "FAILED",
            "Confidence": 95.0,  # confidence alto pero Status=FAILED
        }
        provider = self._make_provider(client)

        result = provider.get_liveness_results("session-failed")

        self.assertFalse(result.is_live)
        self.assertEqual(result.status, "FAILED")

    def test_get_liveness_results_extracts_audit_images(self):
        client = MagicMock()
        client.get_face_liveness_session_results.return_value = {
            "Status": "SUCCEEDED",
            "Confidence": 90.0,
            "AuditImages": [
                {"Bytes": b"image1-bytes"},
                {"Bytes": b"image2-bytes"},
            ],
        }
        provider = self._make_provider(client)

        result = provider.get_liveness_results("session-audit")

        self.assertEqual(len(result.audit_images), 2)


class ProviderWithoutLivenessSupport(SimpleTestCase):
    """Providers que no sobreescriben deben levantar NotImplementedError."""

    def test_base_raises_not_implemented(self):
        from contracts.biometric_providers.base import FacialProvider

        # Subclase mínima que no implementa liveness.
        class _MinimalProvider(FacialProvider):
            name = "minimal"

            def analyze_face(self, image_data, face_type):
                return None

            def compare_faces(self, source_image, target_image):
                return 0.0

            def check_coherence(self, front, side):
                return {}

        provider = _MinimalProvider()
        self.assertFalse(provider.supports_liveness())
        with self.assertRaises(NotImplementedError):
            provider.create_liveness_session()
        with self.assertRaises(NotImplementedError):
            provider.get_liveness_results("x")


class ServiceLivenessTests(SimpleTestCase):
    """`BiometricAuthenticationService.create/verify_liveness`.

    Usa mocks para el provider y para el ORM — no toca la BD.
    """

    def _make_service_and_provider(self):
        provider = MagicMock()
        provider.name = "mock"
        provider.supports_liveness.return_value = True
        provider.create_liveness_session.return_value = LivenessSession(
            session_id="sess-1",
            provider="mock",
            client_region="us-east-1",
        )
        provider.get_liveness_results.return_value = LivenessResult(
            session_id="sess-1",
            is_live=True,
            confidence=0.91,
            status="SUCCEEDED",
            provider="mock",
        )
        service = BiometricAuthenticationService(facial_provider=provider)
        return service, provider

    def _patched_auth(self, facial_analysis=None):
        auth = MagicMock()
        auth.facial_analysis = facial_analysis or {}
        auth.id = "auth-1"
        return auth

    def test_create_liveness_session_persists_metadata(self):
        service, _ = self._make_service_and_provider()
        auth = self._patched_auth(facial_analysis={"existing": "keep"})

        with MockObjectsGet(auth):
            payload = service.create_liveness_session("auth-1")

        self.assertEqual(payload["session_id"], "sess-1")
        self.assertEqual(auth.facial_analysis["existing"], "keep")
        self.assertEqual(
            auth.facial_analysis["liveness_session"]["session_id"], "sess-1"
        )
        auth.save.assert_called_once_with(update_fields=["facial_analysis"])

    def test_create_liveness_session_raises_501_when_unsupported(self):
        service, provider = self._make_service_and_provider()
        provider.supports_liveness.return_value = False

        with self.assertRaisesMessage(RuntimeError, "no soporta Face Liveness"):
            service.create_liveness_session("auth-1")

    def test_verify_liveness_persists_result(self):
        service, _ = self._make_service_and_provider()
        auth = self._patched_auth()

        with MockObjectsGet(auth):
            payload = service.verify_liveness("auth-1", "sess-1")

        self.assertTrue(payload["is_live"])
        self.assertAlmostEqual(payload["confidence"], 0.91)
        self.assertTrue(auth.facial_analysis["liveness"]["is_live"])

    def test_verify_liveness_raises_501_when_unsupported(self):
        service, provider = self._make_service_and_provider()
        provider.supports_liveness.return_value = False

        with self.assertRaisesMessage(RuntimeError, "no soporta Face Liveness"):
            service.verify_liveness("auth-1", "sess-1")


class MockObjectsGet:
    """Context manager que parcha `BiometricAuthentication.objects.get`."""

    def __init__(self, auth):
        self.auth = auth
        self._patcher = None

    def __enter__(self):
        from unittest.mock import patch

        self._patcher = patch(
            "contracts.biometric_service.BiometricAuthentication.objects.get",
            return_value=self.auth,
        )
        self._patcher.start()
        return self

    def __exit__(self, *args):
        self._patcher.stop()
        return False
