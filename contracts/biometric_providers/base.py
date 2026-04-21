"""Interfaz abstracta de los proveedores biométricos faciales."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class LivenessSession:
    """Handle opaco de una sesión de Face Liveness en curso.

    `session_id` se devuelve al frontend para que Amplify lo use con
    `FaceLivenessDetector`. `client_region` indica la región AWS donde
    vive la sesión (Amplify necesita saberla para apuntar al endpoint
    correcto).

    El proveedor demo devuelve un session_id fake; AWS Rekognition
    devuelve el SessionId real de `create_face_liveness_session`.
    """

    session_id: str
    provider: str = "unknown"
    client_region: str = "us-east-1"


@dataclass
class LivenessResult:
    """Resultado final de una sesión de Face Liveness.

    `confidence` es el score oficial del servicio (0.0-1.0; en
    Rekognition viene 0-100, se normaliza). `status` es el estado
    crudo ('SUCCEEDED', 'FAILED', 'EXPIRED'). `is_live` derivado:
    status=='SUCCEEDED' AND confidence>=threshold.
    """

    session_id: str
    is_live: bool
    confidence: float
    status: str
    provider: str = "unknown"
    audit_images: list[bytes] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "session_id": self.session_id,
            "is_live": self.is_live,
            "confidence": self.confidence,
            "status": self.status,
            "provider": self.provider,
            "audit_image_count": len(self.audit_images),
        }


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
    los proveedores reales (AWS, Azure, Google) puedan mapear sus APIs
    a una interfaz uniforme.
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

    def supports_liveness(self) -> bool:
        """True si el proveedor implementa Face Liveness real.

        Los proveedores que devuelvan False usan la heurística local
        (EyesOpen + Pose + Sharpness) de `analyze_face.liveness_score`,
        que se burla con foto-de-foto. Documentar la limitación al
        usuario final es responsabilidad de la UI (Ley 1581 TDI).
        """
        return False

    def create_liveness_session(self) -> "LivenessSession":
        """Crea una sesión de Face Liveness y devuelve su handle.

        El `session_id` se entrega al frontend (Amplify SDK) que
        corre el detector en el navegador con video stream. Al
        terminar, el backend llama `get_liveness_results` para
        recoger el veredicto.

        Implementación default: raise — los proveedores que
        devuelvan `supports_liveness()=True` deben sobreescribirlo.
        """
        raise NotImplementedError(
            f"{type(self).__name__} no soporta Face Liveness real"
        )

    def get_liveness_results(self, session_id: str) -> "LivenessResult":
        """Obtiene el resultado de una sesión de Face Liveness.

        El frontend señaliza al backend cuando el usuario completa
        el challenge; este método consulta al proveedor y devuelve
        confidence + status.
        """
        raise NotImplementedError(
            f"{type(self).__name__} no soporta Face Liveness real"
        )
