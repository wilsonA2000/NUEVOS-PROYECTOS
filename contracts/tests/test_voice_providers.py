"""Tests del VoiceProvider: interfaz base, demo y factory."""

from __future__ import annotations

from django.test import SimpleTestCase, override_settings

from contracts.biometric_providers import (
    DemoVoiceProvider,
    VoiceAnalysis,
    VoiceProvider,
    get_voice_provider,
)
from contracts.biometric_providers.voice_factory import _resolve_provider_name


class VoiceAnalysisTests(SimpleTestCase):
    def test_audio_analysis_dict_keys(self):
        analysis = VoiceAnalysis(
            duration=8.5,
            sample_rate=44100,
            channels=1,
            format="wav",
            file_size=100_000,
        )
        payload = analysis.to_audio_analysis_dict()
        self.assertEqual(
            set(payload.keys()),
            {"duration", "sample_rate", "channels", "format", "file_size"},
        )
        self.assertEqual(payload["duration"], 8.5)

    def test_quality_dict_includes_acceptable_flag(self):
        analysis = VoiceAnalysis(quality_score=0.8)
        payload = analysis.to_quality_dict()
        self.assertTrue(payload["acceptable"])
        self.assertEqual(payload["score"], 0.8)

    def test_quality_below_threshold_not_acceptable(self):
        analysis = VoiceAnalysis(quality_score=0.3)
        payload = analysis.to_quality_dict()
        self.assertFalse(payload["acceptable"])

    def test_transcription_dict_shape(self):
        analysis = VoiceAnalysis(
            transcription="hola",
            transcription_confidence=0.9,
            language_detected="es-CO",
        )
        payload = analysis.to_transcription_dict()
        self.assertEqual(payload["text"], "hola")
        self.assertEqual(payload["language_detected"], "es-CO")

    def test_characteristics_dict_shape(self):
        analysis = VoiceAnalysis(
            pitch_average=150.0,
            tone_stability=0.8,
            speech_rate=4.0,
            voice_uniqueness=0.9,
            biometric_score=0.85,
        )
        payload = analysis.to_characteristics_dict()
        self.assertIn("features", payload)
        self.assertEqual(
            set(payload["features"].keys()),
            {"pitch_average", "tone_stability", "speech_rate", "voice_uniqueness"},
        )
        self.assertEqual(payload["biometric_score"], 0.85)


class DemoVoiceProviderTests(SimpleTestCase):
    def setUp(self):
        self.provider = DemoVoiceProvider()

    def test_is_demo_true(self):
        self.assertTrue(self.provider.is_demo())

    def test_implements_interface(self):
        self.assertIsInstance(self.provider, VoiceProvider)

    def test_analyze_voice_returns_populated_scores(self):
        result = self.provider.analyze_voice("data:audio/wav;base64,xxx")
        self.assertIsInstance(result, VoiceAnalysis)
        self.assertGreater(result.duration, 0)
        self.assertGreaterEqual(result.quality_score, 0.7)
        self.assertGreaterEqual(result.biometric_score, 0.7)
        self.assertEqual(result.provider, "demo")
        self.assertEqual(result.language_detected, "es-CO")
        self.assertTrue(result.transcription)

    def test_analyze_voice_uses_expected_text_when_provided(self):
        result = self.provider.analyze_voice("xxx", expected_text="texto custom")
        self.assertEqual(result.transcription, "texto custom")
        self.assertEqual(result.raw["expected_text"], "texto custom")


class FactoryTests(SimpleTestCase):
    def setUp(self):
        get_voice_provider.cache_clear()

    def tearDown(self):
        get_voice_provider.cache_clear()

    @override_settings(BIOMETRIC_VOICE_PROVIDER="demo")
    def test_demo_selected_by_default(self):
        provider = get_voice_provider()
        self.assertIsInstance(provider, DemoVoiceProvider)

    @override_settings(BIOMETRIC_VOICE_PROVIDER="google_stt")
    def test_unimplemented_provider_falls_back_to_demo(self):
        self.assertEqual(_resolve_provider_name(), "demo")
        provider = get_voice_provider()
        self.assertIsInstance(provider, DemoVoiceProvider)

    def test_cache_returns_same_instance(self):
        first = get_voice_provider()
        second = get_voice_provider()
        self.assertIs(first, second)
