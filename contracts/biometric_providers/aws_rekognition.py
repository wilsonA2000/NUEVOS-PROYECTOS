"""Proveedor facial basado en AWS Rekognition.

Cubre tres operaciones del SDK:

- `detect_faces(Attributes=['ALL'])` para análisis de una imagen.
- `compare_faces(SimilarityThreshold=...)` para similitud entre dos rostros.
- Una heurística local de liveness basada en EyesOpen + Sunglasses + Pose +
  Sharpness. El liveness "real" (Rekognition Face Liveness) requiere
  integración frontend con Amplify SDK y video stream — queda para una
  fase posterior.

El proveedor lanza `RuntimeError` al instanciar si faltan credenciales.
El factory captura esa excepción y cae a `DemoFacialProvider`.
"""

from __future__ import annotations

import base64
import logging
from typing import Any

import boto3
from django.conf import settings

from .base import FaceAnalysis, FacialProvider

logger = logging.getLogger(__name__)


class AWSRekognitionProvider(FacialProvider):
    name = "aws_rekognition"

    def __init__(self, client: Any | None = None) -> None:
        self.min_similarity = float(
            getattr(settings, "BIOMETRIC_MIN_FACE_SIMILARITY", 0.85)
        )
        self.similarity_threshold_pct = self.min_similarity * 100.0

        if client is not None:
            self._client = client
            return

        access_key = getattr(settings, "AWS_REKOGNITION_ACCESS_KEY_ID", "") or ""
        secret_key = getattr(settings, "AWS_REKOGNITION_SECRET_ACCESS_KEY", "") or ""
        region = getattr(settings, "AWS_REKOGNITION_REGION", "us-east-1") or "us-east-1"

        if not access_key or not secret_key:
            raise RuntimeError(
                "AWS Rekognition credentials missing "
                "(AWS_REKOGNITION_ACCESS_KEY_ID / AWS_REKOGNITION_SECRET_ACCESS_KEY)"
            )

        self._client = boto3.client(
            "rekognition",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )

    @staticmethod
    def _decode(image_data: str) -> bytes:
        """Acepta data-URL (`data:image/png;base64,...`) o base64 puro."""
        if not image_data:
            raise ValueError("image_data vacío")
        if "," in image_data and image_data.lstrip().startswith("data:"):
            _, image_data = image_data.split(",", 1)
        return base64.b64decode(image_data)

    def analyze_face(self, image_data: str, face_type: str) -> FaceAnalysis:
        image_bytes = self._decode(image_data)
        response = self._client.detect_faces(
            Image={"Bytes": image_bytes}, Attributes=["ALL"]
        )
        faces = response.get("FaceDetails", []) or []
        if not faces:
            return FaceAnalysis(
                face_detected=False,
                quality_score=0.0,
                liveness_score=0.0,
                provider=self.name,
                raw={"face_type": face_type, "reason": "no_face_detected"},
            )

        face = faces[0]
        quality = face.get("Quality", {}) or {}
        brightness = float(quality.get("Brightness", 0.0))
        sharpness = float(quality.get("Sharpness", 0.0))
        quality_score = max(0.0, min(1.0, (brightness + sharpness) / 200.0))

        pose = face.get("Pose", {}) or {}
        yaw = float(pose.get("Yaw", 0.0))
        pitch = float(pose.get("Pitch", 0.0))
        roll = float(pose.get("Roll", 0.0))

        eyes_open = bool((face.get("EyesOpen") or {}).get("Value", False))
        sunglasses = bool((face.get("Sunglasses") or {}).get("Value", False))
        liveness_score = self._heuristic_liveness(
            eyes_open=eyes_open,
            sunglasses=sunglasses,
            yaw=yaw,
            sharpness=sharpness,
        )

        landmarks = len(face.get("Landmarks", []) or [])

        return FaceAnalysis(
            face_detected=True,
            quality_score=quality_score,
            liveness_score=liveness_score,
            pose_estimation={"yaw": yaw, "pitch": pitch, "roll": roll},
            face_landmarks=landmarks,
            provider=self.name,
            raw={
                "face_type": face_type,
                "brightness": brightness,
                "sharpness": sharpness,
                "eyes_open": eyes_open,
                "sunglasses": sunglasses,
                "confidence": float(face.get("Confidence", 0.0)),
            },
        )

    @staticmethod
    def _heuristic_liveness(
        *, eyes_open: bool, sunglasses: bool, yaw: float, sharpness: float
    ) -> float:
        """Liveness heurístico 0.0-1.0 mientras no se integre Face Liveness.

        MVP únicamente: una foto-de-foto puede pasar. Documentado en el
        plan como deuda para fase P0.1.
        """
        if sunglasses or not eyes_open:
            return 0.3
        score = 0.5
        if abs(yaw) < 15:
            score += 0.25
        elif abs(yaw) < 30:
            score += 0.1
        if sharpness > 70:
            score += 0.2
        elif sharpness > 50:
            score += 0.1
        return max(0.0, min(1.0, score))

    def compare_faces(self, source_image: str, target_image: str) -> float:
        response = self._client.compare_faces(
            SourceImage={"Bytes": self._decode(source_image)},
            TargetImage={"Bytes": self._decode(target_image)},
            SimilarityThreshold=0.0,
        )
        matches = response.get("FaceMatches", []) or []
        if not matches:
            return 0.0
        similarity = float(matches[0].get("Similarity", 0.0))
        return max(0.0, min(1.0, similarity / 100.0))

    def check_coherence(
        self, front: FaceAnalysis, side: FaceAnalysis
    ) -> dict[str, float]:
        feature_consistency = min(front.quality_score, side.quality_score)

        front_bright = float(front.raw.get("brightness", 0.0))
        side_bright = float(side.raw.get("brightness", 0.0))
        lighting_consistency = max(
            0.0, min(1.0, 1.0 - abs(front_bright - side_bright) / 100.0)
        )

        if front.face_detected and side.face_detected:
            face_match_probability = min(front.liveness_score, side.liveness_score)
            same_person_confidence = (
                feature_consistency + lighting_consistency + face_match_probability
            ) / 3.0
        else:
            face_match_probability = 0.0
            same_person_confidence = 0.0

        return {
            "face_match_probability": face_match_probability,
            "feature_consistency": feature_consistency,
            "lighting_consistency": lighting_consistency,
            "same_person_confidence": same_person_confidence,
        }

    def is_demo(self) -> bool:
        return False
