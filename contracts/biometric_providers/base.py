"""Interfaz abstracta de los proveedores biométricos faciales."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class FaceAnalysis:
    """Resultado normalizado del análisis de una imagen facial.

    Todos los scores están en rango 0.0-1.0 para que el servicio
    orquestador pueda promediarlos sin mapear por proveedor.
    """

    face_detected: bool
    quality_score: float
    liveness_score: float
    pose_estimation: dict[str, float] = field(default_factory=dict)
    face_landmarks: int = 0
    provider: str = "unknown"
    raw: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "face_detected": self.face_detected,
            "quality_score": self.quality_score,
            "liveness_score": self.liveness_score,
            "pose_estimation": self.pose_estimation,
            "face_landmarks": self.face_landmarks,
            "provider": self.provider,
        }


class FacialProvider(ABC):
    """Contrato que deben cumplir los proveedores faciales.

    Los stubs internos de `BiometricAuthenticationService` se apoyan en
    estos cuatro métodos. Se documentan rangos/semántica aquí para que
    los proveedores reales puedan mapear sus APIs a una interfaz uniforme.
    """

    name: str = "base"

    @abstractmethod
    def analyze_face(self, image_data: str, face_type: str) -> FaceAnalysis:
        """Analiza una imagen facial (base64 o data-url).

        `face_type` es `"frontal"` o `"lateral"`. El proveedor decide
        si lo usa (heurísticas de pose por ejemplo).
        """

    @abstractmethod
    def compare_faces(self, source_image: str, target_image: str) -> float:
        """Devuelve la similitud 0.0-1.0 entre dos rostros."""

    @abstractmethod
    def check_coherence(
        self, front: FaceAnalysis, side: FaceAnalysis
    ) -> dict[str, float]:
        """Coherencia entre la toma frontal y la lateral.

        Debe devolver al menos `same_person_confidence`,
        `feature_consistency`, `lighting_consistency` y
        `face_match_probability`, todos en 0.0-1.0.
        """

    def is_demo(self) -> bool:
        """True cuando el proveedor devuelve scores simulados."""
        return False
