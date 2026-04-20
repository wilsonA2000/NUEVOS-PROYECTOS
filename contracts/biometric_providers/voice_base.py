"""Interfaz abstracta de los proveedores de análisis de voz.

Espeja el patrón de `base.py` (facial) y `document_base.py`.
`VoiceAnalysis` unifica tres cosas que el stub original exponía por
separado: métricas del audio, transcripción y características vocales
biométricas. El servicio las re-divide en dicts al poblar
`auth.voice_analysis` para no romper el contrato con el frontend.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class VoiceAnalysis:
    # Métricas de audio
    duration: float = 0.0
    sample_rate: int = 0
    channels: int = 0
    format: str = ""
    file_size: int = 0
    quality_score: float = 0.0
    clarity_score: float = 0.0
    noise_level: float = 0.0

    # Transcripción
    transcription: str = ""
    transcription_confidence: float = 0.0
    language_detected: str = ""

    # Características vocales (biometric voice features)
    pitch_average: float = 0.0
    tone_stability: float = 0.0
    speech_rate: float = 0.0
    voice_uniqueness: float = 0.0
    biometric_score: float = 0.0

    provider: str = "unknown"
    raw: dict[str, Any] = field(default_factory=dict)

    def to_audio_analysis_dict(self) -> dict[str, Any]:
        """Shape consumida por `auth.voice_analysis['audio_analysis']`."""
        return {
            "duration": self.duration,
            "sample_rate": self.sample_rate,
            "channels": self.channels,
            "format": self.format,
            "file_size": self.file_size,
        }

    def to_quality_dict(self) -> dict[str, Any]:
        return {
            "score": self.quality_score,
            "clarity": self.clarity_score,
            "noise_level": self.noise_level,
            "acceptable": self.quality_score >= 0.6,
        }

    def to_transcription_dict(self) -> dict[str, Any]:
        return {
            "text": self.transcription,
            "confidence": self.transcription_confidence,
            "language_detected": self.language_detected,
        }

    def to_characteristics_dict(self) -> dict[str, Any]:
        return {
            "features": {
                "pitch_average": self.pitch_average,
                "tone_stability": self.tone_stability,
                "speech_rate": self.speech_rate,
                "voice_uniqueness": self.voice_uniqueness,
            },
            "biometric_score": self.biometric_score,
        }


class VoiceProvider(ABC):
    name: str = "base"

    @abstractmethod
    def analyze_voice(
        self, audio_data: str, expected_text: str | None = None
    ) -> VoiceAnalysis:
        """Procesa una grabación en base64 o data-URL.

        El proveedor debe poblar las 3 secciones (audio, transcripción,
        biométrica) en un solo llamado. `expected_text` es una pista
        opcional para optimizar la transcripción contra vocabulario
        conocido (si el provider lo soporta).
        """

    def is_demo(self) -> bool:
        return False
