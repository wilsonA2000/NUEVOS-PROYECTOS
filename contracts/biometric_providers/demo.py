"""Proveedor facial de demostración.

Reproduce los scores simulados que el `biometric_service` venía
devolviendo en modo demo (BIO-002). Se usa como fallback cuando no
hay credenciales del proveedor real o cuando `BIOMETRIC_FACIAL_PROVIDER`
está en `"demo"` explícitamente (por defecto en tests y CI).
"""

from __future__ import annotations

import uuid

from .base import FaceAnalysis, FacialProvider, LivenessResult, LivenessSession


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

    def supports_liveness(self) -> bool:
        """Demo expone la API para que frontend + tests puedan
        ejercitar el flujo sin credenciales AWS. El veredicto es
        siempre `is_live=True` con confidence 0.95.
        """
        return True

    def create_liveness_session(self) -> LivenessSession:
        return LivenessSession(
            session_id=f"demo-{uuid.uuid4()}",
            provider=self.name,
            client_region="us-east-1",
        )

    def get_liveness_results(self, session_id: str) -> LivenessResult:
        return LivenessResult(
            session_id=session_id,
            is_live=True,
            confidence=0.95,
            status="SUCCEEDED",
            provider=self.name,
            raw={"simulated": True},
        )
