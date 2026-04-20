"""VoiceProvider de demostración.

Reproduce los valores simulados de los stubs originales de voz. Se
usa como default en dev, CI y fallback cuando el provider real no
esté configurado (P0.3b — Google STT / AWS Transcribe async).
"""

from __future__ import annotations

from .voice_base import VoiceAnalysis, VoiceProvider


class DemoVoiceProvider(VoiceProvider):
    name = "demo"

    _DEMO_TRANSCRIPT = (
        "He firmado digitalmente el contrato número VH-2025-000123 "
        "el día 4 de agosto de 2025"
    )

    def analyze_voice(
        self, audio_data: str, expected_text: str | None = None
    ) -> VoiceAnalysis:
        transcription = expected_text or self._DEMO_TRANSCRIPT
        return VoiceAnalysis(
            duration=8.5,
            sample_rate=44100,
            channels=1,
            format="wav",
            file_size=150_000,
            quality_score=0.84,
            clarity_score=0.88,
            noise_level=0.15,
            transcription=transcription,
            transcription_confidence=0.92,
            language_detected="es-CO",
            pitch_average=150.5,
            tone_stability=0.87,
            speech_rate=4.2,
            voice_uniqueness=0.89,
            biometric_score=0.85,
            provider=self.name,
            raw={"simulated": True, "expected_text": expected_text or ""},
        )

    def is_demo(self) -> bool:
        return True
