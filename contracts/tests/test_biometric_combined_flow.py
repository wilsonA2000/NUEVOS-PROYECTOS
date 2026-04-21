"""P0.5 — refactor del combined flow a provider real.

Antes de esta fase `_compare_faces` devolvía `0.91` hardcoded y
`_extract_face_from_combined` devolvía coordenadas simuladas. Estos
tests garantizan que:

1. `_extract_face_from_combined` delega en `facial_provider.analyze_face`
   y propaga `face_detected / quality / liveness_score`.
2. `_compare_faces` delega en `facial_provider.compare_faces` con las dos
   imágenes pasadas como base64.
3. Si el provider falla, el servicio no crashea: `face_detected=False`
   para extract, `0.0` para compare (verificación caerá por threshold).
4. `_read_image_as_base64` lee un FileField y devuelve base64 ascii.
"""

from __future__ import annotations

import base64
from unittest.mock import MagicMock

from django.test import SimpleTestCase

from contracts.biometric_providers import FaceAnalysis
from contracts.biometric_service import BiometricAuthenticationService


def _make_service_with_mock_provider() -> tuple[BiometricAuthenticationService, MagicMock]:
    mock_provider = MagicMock()
    mock_provider.name = "mock"
    service = BiometricAuthenticationService(facial_provider=mock_provider)
    return service, mock_provider


class ExtractFaceFromCombinedTests(SimpleTestCase):
    def test_delegates_to_facial_provider_analyze_face(self):
        service, provider = _make_service_with_mock_provider()
        provider.analyze_face.return_value = FaceAnalysis(
            face_detected=True,
            quality_score=0.82,
            liveness_score=0.76,
            pose_estimation={"yaw": 1.1},
            provider="mock",
        )

        result = service._extract_face_from_combined("data:image/png;base64,xxx")

        provider.analyze_face.assert_called_once_with(
            "data:image/png;base64,xxx", "combined"
        )
        self.assertTrue(result["face_detected"])
        self.assertAlmostEqual(result["quality"], 0.82)
        self.assertAlmostEqual(result["liveness_score"], 0.76)
        self.assertEqual(result["provider"], "mock")

    def test_returns_not_detected_when_provider_raises(self):
        service, provider = _make_service_with_mock_provider()
        provider.analyze_face.side_effect = RuntimeError("rekognition boom")

        result = service._extract_face_from_combined("data:image/png;base64,xxx")

        self.assertFalse(result["face_detected"])
        self.assertEqual(result["quality"], 0.0)
        self.assertEqual(result["liveness_score"], 0.0)


class CompareFacesTests(SimpleTestCase):
    def test_delegates_to_provider_with_both_images(self):
        service, provider = _make_service_with_mock_provider()
        provider.compare_faces.return_value = 0.93

        score = service._compare_faces("base64_source", "base64_target")

        provider.compare_faces.assert_called_once_with(
            "base64_source", "base64_target"
        )
        self.assertAlmostEqual(score, 0.93)

    def test_returns_zero_when_source_missing(self):
        service, provider = _make_service_with_mock_provider()

        score = service._compare_faces(None, "base64_target")

        self.assertEqual(score, 0.0)
        provider.compare_faces.assert_not_called()

    def test_returns_zero_when_target_missing(self):
        service, provider = _make_service_with_mock_provider()

        score = service._compare_faces("base64_source", None)

        self.assertEqual(score, 0.0)
        provider.compare_faces.assert_not_called()

    def test_returns_zero_when_provider_raises(self):
        service, provider = _make_service_with_mock_provider()
        provider.compare_faces.side_effect = RuntimeError("rekognition boom")

        score = service._compare_faces("base64_source", "base64_target")

        self.assertEqual(score, 0.0)


class ReadImageAsBase64Tests(SimpleTestCase):
    def test_returns_none_when_file_field_falsy(self):
        service, _ = _make_service_with_mock_provider()
        self.assertIsNone(service._read_image_as_base64(None))

    def test_reads_bytes_and_encodes_base64(self):
        service, _ = _make_service_with_mock_provider()
        raw_bytes = b"\x89PNG\r\n\x1a\nfakebytes"

        class _FakeFile:
            def open(self, _mode: str):
                return self

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return raw_bytes

        encoded = service._read_image_as_base64(_FakeFile())
        self.assertEqual(
            encoded, base64.b64encode(raw_bytes).decode("ascii")
        )

    def test_returns_none_when_open_raises(self):
        service, _ = _make_service_with_mock_provider()

        class _BrokenFile:
            def open(self, _mode):
                raise OSError("file gone")

        self.assertIsNone(service._read_image_as_base64(_BrokenFile()))
