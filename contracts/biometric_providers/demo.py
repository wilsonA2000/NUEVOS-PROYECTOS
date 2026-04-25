"""Proveedor facial de demostración.

Reproduce los scores simulados que el `biometric_service` venía
devolviendo en modo demo (BIO-002). Se usa como fallback cuando no
hay credenciales del proveedor real o cuando `BIOMETRIC_FACIAL_PROVIDER`
está en `"demo"` explícitamente (por defecto en tests y CI).
"""

from __future__ import annotations

from .base import FaceAnalysis, FacialProvider


class DemoFacialProvider(FacialProvider):
    name = "demo"

    def analyze_face(self, image_data: str, face_type: str) -> FaceAnalysis:
        return FaceAnalysis(
            face_detected=True,
            quality_score=0.85,
            liveness_score=0.92,
            pose_estimation={"yaw": 0.1, "pitch": 0.05, "roll": 0.02},
            face_landmarks=68,
            provider=self.name,
            raw={"face_type": face_type, "simulated": True},
        )

    def compare_faces(self, source_image: str, target_image: str) -> float:
        return 0.91

    def check_coherence(
        self, front: FaceAnalysis, side: FaceAnalysis
    ) -> dict[str, float]:
        return {
            "face_match_probability": 0.94,
            "feature_consistency": 0.89,
            "lighting_consistency": 0.87,
            "same_person_confidence": 0.91,
        }

    def is_demo(self) -> bool:
        return True
