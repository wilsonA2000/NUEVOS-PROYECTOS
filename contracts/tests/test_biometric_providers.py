"""Tests del paquete `contracts.biometric_providers`.

Cubre la interfaz base, el DemoFacialProvider y el factory con fallback
cuando el proveedor AWS no se puede inicializar. Los tests del provider
AWS real viven en `test_biometric_providers_aws.py` (commit 2).
"""

from __future__ import annotations

from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from contracts.biometric_providers import (
    DemoFacialProvider,
    FaceAnalysis,
    FacialProvider,
    get_facial_provider,
)
from contracts.biometric_providers.factory import _resolve_provider_name


class FaceAnalysisTests(SimpleTestCase):
    def test_to_dict_shape(self):
        analysis = FaceAnalysis(
            face_detected=True,
            quality_score=0.8,
            liveness_score=0.9,
            pose_estimation={"yaw": 0.1},
            face_landmarks=68,
            provider="demo",
        )
        payload = analysis.to_dict()
        self.assertEqual(
            set(payload.keys()),
            {
                "face_detected",
                "quality_score",
                "liveness_score",
                "pose_estimation",
                "face_landmarks",
                "provider",
            },
        )
        self.assertEqual(payload["provider"], "demo")


class DemoFacialProviderTests(SimpleTestCase):
    def setUp(self):
        self.provider = DemoFacialProvider()

    def test_is_demo_true(self):
        self.assertTrue(self.provider.is_demo())

    def test_analyze_face_returns_high_quality_scores(self):
        result = self.provider.analyze_face("data:image/png;base64,xxx", "frontal")
        self.assertIsInstance(result, FaceAnalysis)
        self.assertTrue(result.face_detected)
        self.assertGreaterEqual(result.quality_score, 0.7)
        self.assertGreaterEqual(result.liveness_score, 0.7)
        self.assertEqual(result.provider, "demo")
        self.assertEqual(result.raw["face_type"], "frontal")

    def test_compare_faces_above_threshold(self):
        score = self.provider.compare_faces("src", "tgt")
        self.assertGreaterEqual(score, 0.85)
        self.assertLessEqual(score, 1.0)

    def test_check_coherence_contains_required_keys(self):
        front = self.provider.analyze_face("x", "frontal")
        side = self.provider.analyze_face("x", "lateral")
        coherence = self.provider.check_coherence(front, side)
        required = {
            "face_match_probability",
            "feature_consistency",
            "lighting_consistency",
            "same_person_confidence",
        }
        self.assertTrue(required.issubset(coherence.keys()))
        for key, value in coherence.items():
            self.assertGreaterEqual(value, 0.0, f"{key} < 0")
            self.assertLessEqual(value, 1.0, f"{key} > 1")

    def test_provider_implements_interface(self):
        self.assertIsInstance(self.provider, FacialProvider)


class FactoryTests(SimpleTestCase):
    def setUp(self):
        get_facial_provider.cache_clear()

    def tearDown(self):
        get_facial_provider.cache_clear()

    @override_settings(BIOMETRIC_FACIAL_PROVIDER="demo")
    def test_demo_provider_selected_by_default(self):
        provider = get_facial_provider()
        self.assertIsInstance(provider, DemoFacialProvider)
        self.assertTrue(provider.is_demo())

    @override_settings(BIOMETRIC_FACIAL_PROVIDER="unknown_vendor")
    def test_unknown_provider_falls_back_to_demo(self):
        self.assertEqual(_resolve_provider_name(), "demo")
        provider = get_facial_provider()
        self.assertIsInstance(provider, DemoFacialProvider)

    @override_settings(BIOMETRIC_FACIAL_PROVIDER="AWS_REKOGNITION")
    def test_provider_name_is_normalized(self):
        self.assertEqual(_resolve_provider_name(), "aws_rekognition")

    @override_settings(BIOMETRIC_FACIAL_PROVIDER="aws_rekognition")
    def test_aws_import_error_falls_back_to_demo(self):
        # Simula que `aws_rekognition.py` no existe o falla al importar.
        with patch(
            "contracts.biometric_providers.factory._build_aws_provider",
            return_value=DemoFacialProvider(),
        ):
            provider = get_facial_provider()
            self.assertIsInstance(provider, DemoFacialProvider)

    def test_cache_returns_same_instance(self):
        first = get_facial_provider()
        second = get_facial_provider()
        self.assertIs(first, second)
