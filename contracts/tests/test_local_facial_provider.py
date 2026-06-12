"""Tests del LocalFacialProvider (sistema facial propio, 2.7).

Se saltan en entornos sin opencv/face_recognition (la suite CI corre
con el provider demo). Las rutas de detección real se prueban con
imágenes sintéticas: ruido y fondos planos NO deben detectar rostro
(eso valida que la detección es real y no un score fijo).
"""

from __future__ import annotations

import base64
import unittest

from django.test import SimpleTestCase, override_settings

from contracts.biometric_providers import DemoFacialProvider, get_facial_provider
from contracts.biometric_providers.base import FaceAnalysis
from contracts.biometric_providers.factory import _resolve_provider_name

try:
    import cv2
    import numpy as np

    from contracts.biometric_providers.local import (
        LocalFacialProvider,
        distance_to_similarity,
    )

    LIBS_AVAILABLE = True
except ImportError:
    LIBS_AVAILABLE = False


def _png_b64(image) -> str:
    ok, buffer = cv2.imencode(".png", image)
    assert ok
    return base64.b64encode(buffer.tobytes()).decode()


@unittest.skipUnless(LIBS_AVAILABLE, "requiere opencv + face_recognition")
class DistanceMappingTests(SimpleTestCase):
    def test_identical_encodings_give_perfect_similarity(self):
        self.assertEqual(distance_to_similarity(0.0), 1.0)

    def test_dlib_threshold_anchored(self):
        self.assertAlmostEqual(distance_to_similarity(0.6), 0.65, places=6)

    def test_typical_match_scores_high(self):
        self.assertGreaterEqual(distance_to_similarity(0.40), 0.75)

    def test_typical_impostor_scores_low(self):
        self.assertLessEqual(distance_to_similarity(0.85), 0.30)

    def test_far_distance_clamps_to_zero(self):
        self.assertEqual(distance_to_similarity(2.5), 0.0)

    def test_monotonically_decreasing(self):
        points = [distance_to_similarity(d / 10) for d in range(0, 13)]
        self.assertEqual(points, sorted(points, reverse=True))


@unittest.skipUnless(LIBS_AVAILABLE, "requiere opencv + face_recognition")
class LocalFacialProviderTests(SimpleTestCase):
    def setUp(self):
        self.provider = LocalFacialProvider()

    def test_is_not_demo(self):
        self.assertFalse(self.provider.is_demo())

    def test_invalid_base64_returns_not_detected(self):
        result = self.provider.analyze_face("esto-no-es-base64!!", "frontal")
        self.assertFalse(result.face_detected)
        self.assertEqual(result.quality_score, 0.0)
        self.assertEqual(result.liveness_score, 0.0)
        self.assertEqual(result.raw["reason"], "undecodable_image")

    def test_noise_image_has_no_face(self):
        rng = np.random.default_rng(42)
        noise = rng.integers(0, 255, size=(240, 320, 3), dtype=np.uint8)
        result = self.provider.analyze_face(_png_b64(noise), "frontal")
        self.assertFalse(result.face_detected)
        self.assertEqual(result.raw["reason"], "no_face_found")

    def test_flat_image_has_no_face(self):
        flat = np.full((240, 320, 3), 128, dtype=np.uint8)
        result = self.provider.analyze_face(_png_b64(flat), "frontal")
        self.assertFalse(result.face_detected)

    def test_data_url_prefix_is_stripped(self):
        flat = np.full((100, 100, 3), 128, dtype=np.uint8)
        data_url = "data:image/png;base64," + _png_b64(flat)
        result = self.provider.analyze_face(data_url, "frontal")
        # Decodifica bien (llega a "no_face_found", no "undecodable_image")
        self.assertEqual(result.raw["reason"], "no_face_found")

    def test_compare_faces_without_faces_is_zero(self):
        rng = np.random.default_rng(7)
        a = rng.integers(0, 255, size=(200, 200, 3), dtype=np.uint8)
        b = rng.integers(0, 255, size=(200, 200, 3), dtype=np.uint8)
        self.assertEqual(self.provider.compare_faces(_png_b64(a), _png_b64(b)), 0.0)

    def test_compare_faces_invalid_input_is_zero(self):
        self.assertEqual(self.provider.compare_faces("x", "y"), 0.0)


@unittest.skipUnless(LIBS_AVAILABLE, "requiere opencv + face_recognition")
class CheckCoherenceTests(SimpleTestCase):
    def setUp(self):
        self.provider = LocalFacialProvider()

    @staticmethod
    def _analysis(encoding, brightness=120.0, detected=True):
        return FaceAnalysis(
            face_detected=detected,
            quality_score=0.8,
            liveness_score=0.8,
            face_landmarks=72,
            provider="local",
            raw={"encoding": encoding, "brightness_mean": brightness},
        )

    def test_undetected_faces_give_zero_coherence(self):
        front = self._analysis([0.0] * 128, detected=False)
        side = self._analysis([0.0] * 128)
        coherence = self.provider.check_coherence(front, side)
        self.assertEqual(coherence["same_person_confidence"], 0.0)
        self.assertEqual(coherence["face_match_probability"], 0.0)

    def test_identical_encodings_give_high_confidence(self):
        encoding = list(np.random.default_rng(3).normal(0, 0.1, 128))
        coherence = self.provider.check_coherence(
            self._analysis(encoding), self._analysis(encoding)
        )
        self.assertGreaterEqual(coherence["same_person_confidence"], 0.95)
        self.assertEqual(
            coherence["same_person_confidence"], coherence["face_match_probability"]
        )

    def test_distant_encodings_give_low_confidence(self):
        rng = np.random.default_rng(5)
        a = list(rng.normal(0, 0.5, 128))
        b = list(rng.normal(1.0, 0.5, 128))
        coherence = self.provider.check_coherence(
            self._analysis(a), self._analysis(b)
        )
        self.assertLessEqual(coherence["same_person_confidence"], 0.4)

    def test_missing_side_encoding_gives_neutral_confidence(self):
        encoding = [0.1] * 128
        coherence = self.provider.check_coherence(
            self._analysis(encoding), self._analysis(None)
        )
        self.assertEqual(coherence["same_person_confidence"], 0.5)

    def test_similar_lighting_scores_high(self):
        encoding = [0.1] * 128
        coherence = self.provider.check_coherence(
            self._analysis(encoding, brightness=120.0),
            self._analysis(encoding, brightness=130.0),
        )
        self.assertGreaterEqual(coherence["lighting_consistency"], 0.9)

    def test_required_keys_and_ranges(self):
        encoding = [0.1] * 128
        coherence = self.provider.check_coherence(
            self._analysis(encoding), self._analysis(encoding)
        )
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


class LocalProviderFactoryTests(SimpleTestCase):
    def setUp(self):
        get_facial_provider.cache_clear()

    def tearDown(self):
        get_facial_provider.cache_clear()

    @override_settings(BIOMETRIC_FACIAL_PROVIDER="local")
    def test_local_is_a_valid_provider_name(self):
        self.assertEqual(_resolve_provider_name(), "local")

    @override_settings(BIOMETRIC_FACIAL_PROVIDER="local")
    def test_factory_returns_local_or_demo_fallback(self):
        provider = get_facial_provider()
        if LIBS_AVAILABLE:
            self.assertIsInstance(provider, LocalFacialProvider)
        else:
            # Sin libs nativas el factory cae a demo sin romper Django.
            self.assertIsInstance(provider, DemoFacialProvider)
