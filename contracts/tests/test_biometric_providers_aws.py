"""Tests del proveedor AWS Rekognition (mocks boto3 client).

No se llama AWS real: todos los tests inyectan un `client` manual via
`AWSRekognitionProvider(client=...)` o mockean `boto3.client` cuando se
valida la construcción desde settings.
"""

from __future__ import annotations

import base64
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings

from contracts.biometric_providers import DemoFacialProvider, get_facial_provider
from contracts.biometric_providers.aws_rekognition import AWSRekognitionProvider

SAMPLE_IMG_B64 = base64.b64encode(b"\x89PNG\r\n fake bytes").decode()
SAMPLE_DATAURL = f"data:image/png;base64,{SAMPLE_IMG_B64}"


def _mock_face(
    *,
    brightness: float = 90.0,
    sharpness: float = 80.0,
    yaw: float = 5.0,
    pitch: float = 2.0,
    roll: float = 1.0,
    eyes_open: bool = True,
    sunglasses: bool = False,
    landmarks: int = 68,
    confidence: float = 99.0,
) -> dict:
    return {
        "Quality": {"Brightness": brightness, "Sharpness": sharpness},
        "Pose": {"Yaw": yaw, "Pitch": pitch, "Roll": roll},
        "EyesOpen": {"Value": eyes_open, "Confidence": 95.0},
        "Sunglasses": {"Value": sunglasses, "Confidence": 95.0},
        "Landmarks": [{"Type": "eyeLeft"}] * landmarks,
        "Confidence": confidence,
    }


class AWSRekognitionProviderAnalyzeTests(SimpleTestCase):
    def test_analyze_face_high_quality(self):
        client = MagicMock()
        client.detect_faces.return_value = {"FaceDetails": [_mock_face()]}
        provider = AWSRekognitionProvider(client=client)

        result = provider.analyze_face(SAMPLE_DATAURL, "frontal")

        self.assertTrue(result.face_detected)
        self.assertAlmostEqual(result.quality_score, (90 + 80) / 200.0, places=3)
        self.assertGreater(result.liveness_score, 0.8)
        self.assertEqual(result.provider, "aws_rekognition")
        self.assertEqual(result.face_landmarks, 68)
        self.assertEqual(result.raw["face_type"], "frontal")
        client.detect_faces.assert_called_once()
        payload = client.detect_faces.call_args.kwargs
        self.assertEqual(payload["Attributes"], ["ALL"])
        self.assertIn("Bytes", payload["Image"])

    def test_analyze_face_no_face_detected(self):
        client = MagicMock()
        client.detect_faces.return_value = {"FaceDetails": []}
        provider = AWSRekognitionProvider(client=client)

        result = provider.analyze_face(SAMPLE_IMG_B64, "frontal")

        self.assertFalse(result.face_detected)
        self.assertEqual(result.quality_score, 0.0)
        self.assertEqual(result.liveness_score, 0.0)
        self.assertEqual(result.raw["reason"], "no_face_detected")

    def test_analyze_face_sunglasses_low_liveness(self):
        client = MagicMock()
        client.detect_faces.return_value = {
            "FaceDetails": [_mock_face(sunglasses=True)]
        }
        provider = AWSRekognitionProvider(client=client)

        result = provider.analyze_face(SAMPLE_DATAURL, "frontal")
        self.assertLess(result.liveness_score, 0.5)

    def test_analyze_face_eyes_closed_low_liveness(self):
        client = MagicMock()
        client.detect_faces.return_value = {
            "FaceDetails": [_mock_face(eyes_open=False)]
        }
        provider = AWSRekognitionProvider(client=client)
        result = provider.analyze_face(SAMPLE_DATAURL, "frontal")
        self.assertLess(result.liveness_score, 0.5)

    def test_analyze_face_rejects_empty_input(self):
        client = MagicMock()
        provider = AWSRekognitionProvider(client=client)
        with self.assertRaises(ValueError):
            provider.analyze_face("", "frontal")

    def test_analyze_face_accepts_plain_base64(self):
        client = MagicMock()
        client.detect_faces.return_value = {"FaceDetails": [_mock_face()]}
        provider = AWSRekognitionProvider(client=client)
        result = provider.analyze_face(SAMPLE_IMG_B64, "lateral")
        self.assertTrue(result.face_detected)


class AWSRekognitionProviderCompareTests(SimpleTestCase):
    def test_compare_faces_high_similarity(self):
        client = MagicMock()
        client.compare_faces.return_value = {
            "FaceMatches": [{"Similarity": 95.2}],
        }
        provider = AWSRekognitionProvider(client=client)

        score = provider.compare_faces(SAMPLE_DATAURL, SAMPLE_DATAURL)

        self.assertAlmostEqual(score, 0.952, places=3)

    def test_compare_faces_no_match(self):
        client = MagicMock()
        client.compare_faces.return_value = {"FaceMatches": []}
        provider = AWSRekognitionProvider(client=client)
        score = provider.compare_faces(SAMPLE_DATAURL, SAMPLE_DATAURL)
        self.assertEqual(score, 0.0)

    def test_compare_faces_clamps_over_1(self):
        # Defensa contra respuestas malformadas (nunca debería pasar).
        client = MagicMock()
        client.compare_faces.return_value = {
            "FaceMatches": [{"Similarity": 150.0}],
        }
        provider = AWSRekognitionProvider(client=client)
        score = provider.compare_faces(SAMPLE_DATAURL, SAMPLE_DATAURL)
        self.assertEqual(score, 1.0)


class AWSRekognitionProviderCoherenceTests(SimpleTestCase):
    def test_check_coherence_both_faces_detected(self):
        client = MagicMock()
        provider = AWSRekognitionProvider(client=client)

        client.detect_faces.side_effect = [
            {"FaceDetails": [_mock_face(brightness=90, sharpness=80)]},
            {"FaceDetails": [_mock_face(brightness=85, sharpness=75)]},
        ]
        front = provider.analyze_face(SAMPLE_DATAURL, "frontal")
        side = provider.analyze_face(SAMPLE_DATAURL, "lateral")

        coherence = provider.check_coherence(front, side)

        self.assertEqual(
            set(coherence.keys()),
            {
                "face_match_probability",
                "feature_consistency",
                "lighting_consistency",
                "same_person_confidence",
            },
        )
        for key, value in coherence.items():
            self.assertGreaterEqual(value, 0.0, f"{key} < 0")
            self.assertLessEqual(value, 1.0, f"{key} > 1")
        # Brillos similares (90 vs 85) → lighting_consistency alto.
        self.assertGreater(coherence["lighting_consistency"], 0.9)

    def test_check_coherence_missing_face_returns_zero(self):
        client = MagicMock()
        provider = AWSRekognitionProvider(client=client)

        client.detect_faces.side_effect = [
            {"FaceDetails": []},
            {"FaceDetails": [_mock_face()]},
        ]
        front = provider.analyze_face(SAMPLE_DATAURL, "frontal")
        side = provider.analyze_face(SAMPLE_DATAURL, "lateral")

        coherence = provider.check_coherence(front, side)
        self.assertEqual(coherence["face_match_probability"], 0.0)
        self.assertEqual(coherence["same_person_confidence"], 0.0)


class AWSRekognitionProviderInitTests(SimpleTestCase):
    @override_settings(
        AWS_REKOGNITION_ACCESS_KEY_ID="",
        AWS_REKOGNITION_SECRET_ACCESS_KEY="",
    )
    def test_init_without_credentials_raises(self):
        with self.assertRaises(RuntimeError):
            AWSRekognitionProvider()

    @override_settings(
        AWS_REKOGNITION_ACCESS_KEY_ID="AKIAFAKE",
        AWS_REKOGNITION_SECRET_ACCESS_KEY="fake-secret",
        AWS_REKOGNITION_REGION="us-east-1",
    )
    def test_init_with_credentials_builds_boto3_client(self):
        with patch("contracts.biometric_providers.aws_rekognition.boto3") as boto3_mock:
            boto3_mock.client.return_value = MagicMock()
            provider = AWSRekognitionProvider()
            self.assertFalse(provider.is_demo())
            boto3_mock.client.assert_called_once_with(
                "rekognition",
                aws_access_key_id="AKIAFAKE",
                aws_secret_access_key="fake-secret",
                region_name="us-east-1",
            )


class FactoryAWSFallbackTests(SimpleTestCase):
    def setUp(self):
        get_facial_provider.cache_clear()

    def tearDown(self):
        get_facial_provider.cache_clear()

    @override_settings(BIOMETRIC_FACIAL_PROVIDER="aws_rekognition")
    def test_factory_falls_back_when_aws_init_raises(self):
        with patch(
            "contracts.biometric_providers.aws_rekognition.AWSRekognitionProvider.__init__",
            side_effect=RuntimeError("credentials missing"),
        ):
            provider = get_facial_provider()
            self.assertIsInstance(provider, DemoFacialProvider)

    @override_settings(
        BIOMETRIC_FACIAL_PROVIDER="aws_rekognition",
        AWS_REKOGNITION_ACCESS_KEY_ID="AKIAFAKE",
        AWS_REKOGNITION_SECRET_ACCESS_KEY="fake-secret",
    )
    def test_factory_builds_aws_when_credentials_present(self):
        with patch("contracts.biometric_providers.aws_rekognition.boto3") as boto3_mock:
            boto3_mock.client.return_value = MagicMock()
            provider = get_facial_provider()
            self.assertIsInstance(provider, AWSRekognitionProvider)
            self.assertFalse(provider.is_demo())
