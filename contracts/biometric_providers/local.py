"""Proveedor facial local — sistema propio corriendo en el servidor (2.7).

Reconocimiento facial real sin SaaS externos, alineado con Ley 1581
(las imágenes biométricas nunca salen del servidor):

- `face_recognition` (dlib): detección HOG, landmarks de 68 puntos y
  embeddings de 128 dimensiones para comparar rostros por distancia
  euclidiana (umbral estándar de dlib: 0.6).
- OpenCV (headless): métricas de calidad de imagen — nitidez por
  varianza del Laplaciano, brillo medio y tamaño relativo del rostro.
- Liveness HEURÍSTICO: nitidez/textura del rostro + saturación de color
  + brillo no extremo. Detecta los casos burdos (foto borrosa, pantalla
  muy oscura/quemada), pero NO es anti-deepfake ni anti-spoofing
  robusto; liveness por challenge (parpadeo/giro) requiere video
  multi-frame y queda como mejora futura.

Los embeddings se guardan en `FaceAnalysis.raw["encoding"]` (lista de
floats, JSON-serializable) para que `check_coherence` pueda comparar
frontal vs lateral sin re-procesar las imágenes.
"""

from __future__ import annotations

import base64
import logging
import math
from typing import Any

import cv2
import face_recognition
import numpy as np

from .base import FaceAnalysis, FacialProvider

logger = logging.getLogger(__name__)

# Distancia euclidiana entre embeddings: <= 0.6 es "misma persona" para
# dlib. El mapeo a similitud 0-1 ancla ese umbral en 0.65 para que un
# match típico (d≈0.35-0.45) quede en 0.74-0.80 y un impostor
# (d≈0.7-0.9) quede por debajo de 0.5.
_DLIB_MATCH_THRESHOLD = 0.6
_SIMILARITY_AT_THRESHOLD = 0.65

# La varianza del Laplaciano de una foto nítida de webcam/celular suele
# superar 100-300; por debajo de ~50 está visiblemente borrosa.
_SHARPNESS_SATURATION = 250.0


def distance_to_similarity(distance: float) -> float:
    """Mapea distancia euclidiana de dlib a similitud 0.0-1.0.

    Lineal por tramos, anclada en el umbral 0.6 de dlib para que el
    punto de corte misma-persona/impostor caiga en 0.65.
    """
    distance = max(0.0, float(distance))
    if distance <= _DLIB_MATCH_THRESHOLD:
        slope = (1.0 - _SIMILARITY_AT_THRESHOLD) / _DLIB_MATCH_THRESHOLD
        return 1.0 - distance * slope
    slope = _SIMILARITY_AT_THRESHOLD / (1.0 - _DLIB_MATCH_THRESHOLD)
    return max(0.0, _SIMILARITY_AT_THRESHOLD - (distance - _DLIB_MATCH_THRESHOLD) * slope)


def _sharpness_score(gray: np.ndarray) -> float:
    """Nitidez 0-1 por varianza del Laplaciano (0 = totalmente borrosa)."""
    variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    return min(1.0, variance / _SHARPNESS_SATURATION)


def _brightness_score(gray: np.ndarray) -> tuple[float, float]:
    """(score 0-1, brillo medio 0-255). Ideal: 80-180; penaliza extremos."""
    mean = float(gray.mean())
    if 80.0 <= mean <= 180.0:
        return 1.0, mean
    if mean < 80.0:
        return max(0.0, mean / 80.0), mean
    return max(0.0, (255.0 - mean) / 75.0), mean


class LocalFacialProvider(FacialProvider):
    name = "local"

    # ------------------------------------------------------------------
    # Decodificación
    # ------------------------------------------------------------------

    @staticmethod
    def _decode_image(image_data: str) -> np.ndarray | None:
        """Decodifica base64/data-url a imagen BGR; None si es inválida."""
        try:
            if "," in image_data and image_data.strip().startswith("data:"):
                image_data = image_data.split(",", 1)[1]
            buffer = np.frombuffer(base64.b64decode(image_data), dtype=np.uint8)
            image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
            if image is None or image.size == 0:
                return None
            return image
        except Exception as exc:
            logger.warning("LocalFacialProvider: imagen indecodificable: %s", exc)
            return None

    @staticmethod
    def _largest_face(rgb: np.ndarray, face_type: str) -> tuple[int, int, int, int] | None:
        """Bounding box (top, right, bottom, left) del rostro más grande.

        HOG de dlib es frontal; para `lateral` cae al cascade de perfil
        de OpenCV (probando también la imagen espejada, porque el
        cascade sólo detecta perfiles mirando a la izquierda).
        """
        locations = face_recognition.face_locations(rgb, model="hog")
        if locations:
            return max(locations, key=lambda b: (b[2] - b[0]) * (b[1] - b[3]))

        if face_type != "lateral":
            return None

        cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_profileface.xml"
        )
        gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
        width = gray.shape[1]
        for flipped in (False, True):
            frame = cv2.flip(gray, 1) if flipped else gray
            detections = cascade.detectMultiScale(frame, 1.1, 5, minSize=(60, 60))
            if len(detections):
                x, y, w, h = max(detections, key=lambda d: d[2] * d[3])
                if flipped:
                    x = width - x - w
                return (y, x + w, y + h, x)
        return None

    # ------------------------------------------------------------------
    # Interfaz FacialProvider
    # ------------------------------------------------------------------

    def analyze_face(self, image_data: str, face_type: str) -> FaceAnalysis:
        image = self._decode_image(image_data)
        if image is None:
            return self._not_detected(face_type, reason="undecodable_image")

        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        box = self._largest_face(rgb, face_type)
        if box is None:
            return self._not_detected(face_type, reason="no_face_found")

        top, right, bottom, left = box
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        face_gray = gray[max(0, top):bottom, max(0, left):right]
        if face_gray.size == 0:
            return self._not_detected(face_type, reason="empty_face_crop")

        sharpness = _sharpness_score(face_gray)
        brightness_score, brightness_mean = _brightness_score(face_gray)
        face_ratio = (bottom - top) * (right - left) / float(gray.size)
        # Un rostro útil ocupa >= 5% del frame; saturado en ese punto.
        size_score = min(1.0, face_ratio / 0.05)
        quality = round(
            0.45 * sharpness + 0.30 * brightness_score + 0.25 * size_score, 4
        )

        landmarks = face_recognition.face_landmarks(rgb, [box])
        landmark_points = sum(len(v) for v in landmarks[0].values()) if landmarks else 0
        pose = self._estimate_pose(landmarks[0]) if landmarks else {}

        encodings = face_recognition.face_encodings(rgb, [box])
        encoding = [round(float(v), 6) for v in encodings[0]] if len(encodings) else None

        liveness = self._liveness_heuristic(image, face_gray, sharpness, brightness_score)

        return FaceAnalysis(
            face_detected=True,
            quality_score=quality,
            liveness_score=liveness,
            pose_estimation=pose,
            face_landmarks=landmark_points,
            provider=self.name,
            raw={
                "face_type": face_type,
                "encoding": encoding,
                "face_box": list(box),
                "sharpness": round(sharpness, 4),
                "brightness_mean": round(brightness_mean, 2),
                "face_area_ratio": round(face_ratio, 4),
                "liveness_method": "heuristic_v1",
            },
        )

    def compare_faces(self, source_image: str, target_image: str) -> float:
        encodings = []
        for label, data in (("source", source_image), ("target", target_image)):
            image = self._decode_image(data)
            if image is None:
                logger.warning("compare_faces: imagen %s indecodificable", label)
                return 0.0
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            box = self._largest_face(rgb, "frontal")
            found = face_recognition.face_encodings(rgb, [box]) if box else []
            if not len(found):
                logger.warning("compare_faces: sin rostro en imagen %s", label)
                return 0.0
            encodings.append(found[0])

        distance = float(face_recognition.face_distance([encodings[0]], encodings[1])[0])
        return round(distance_to_similarity(distance), 4)

    def check_coherence(
        self, front: FaceAnalysis, side: FaceAnalysis
    ) -> dict[str, float]:
        front_enc = front.raw.get("encoding")
        side_enc = side.raw.get("encoding")

        if not front.face_detected or not side.face_detected:
            return {
                "face_match_probability": 0.0,
                "feature_consistency": 0.0,
                "lighting_consistency": 0.0,
                "same_person_confidence": 0.0,
            }

        if front_enc and side_enc:
            distance = float(
                np.linalg.norm(np.asarray(front_enc) - np.asarray(side_enc))
            )
            # Frontal vs lateral del mismo sujeto da distancias mayores
            # que frontal vs frontal; se relaja 15% antes de mapear.
            similarity = distance_to_similarity(distance * 0.85)
        else:
            # Sin embedding lateral (perfil puro): no se puede afirmar
            # identidad, sólo que ambas tomas tienen un rostro real.
            similarity = 0.5

        feature_consistency = round(
            min(1.0, (front.face_landmarks + side.face_landmarks) / 144.0), 4
        )
        front_brightness = front.raw.get("brightness_mean")
        side_brightness = side.raw.get("brightness_mean")
        if front_brightness is not None and side_brightness is not None:
            lighting = max(0.0, 1.0 - abs(front_brightness - side_brightness) / 120.0)
        else:
            lighting = 0.5

        return {
            "face_match_probability": round(similarity, 4),
            "feature_consistency": feature_consistency,
            "lighting_consistency": round(lighting, 4),
            "same_person_confidence": round(similarity, 4),
        }

    # ------------------------------------------------------------------
    # Heurísticas internas
    # ------------------------------------------------------------------

    def _not_detected(self, face_type: str, reason: str) -> FaceAnalysis:
        return FaceAnalysis(
            face_detected=False,
            quality_score=0.0,
            liveness_score=0.0,
            provider=self.name,
            raw={"face_type": face_type, "reason": reason},
        )

    @staticmethod
    def _estimate_pose(landmarks: dict[str, list[tuple[int, int]]]) -> dict[str, float]:
        """Pose aproximada (radianes) desde los landmarks de 68 puntos.

        - roll: ángulo de la línea entre los centros de ambos ojos.
        - yaw: desplazamiento horizontal de la punta de la nariz respecto
          al punto medio interocular, normalizado por la distancia
          interocular.
        - pitch: desplazamiento vertical análogo (aproximación gruesa).
        """
        try:
            left_eye = np.mean(landmarks["left_eye"], axis=0)
            right_eye = np.mean(landmarks["right_eye"], axis=0)
            nose_tip = np.mean(landmarks["nose_tip"], axis=0)
        except (KeyError, ValueError):
            return {}

        eye_mid = (left_eye + right_eye) / 2.0
        interocular = float(np.linalg.norm(right_eye - left_eye)) or 1.0
        roll = math.atan2(
            float(right_eye[1] - left_eye[1]), float(right_eye[0] - left_eye[0])
        )
        yaw = math.atan(float(nose_tip[0] - eye_mid[0]) / interocular)
        # En una frontal neutra la nariz queda ~0.55 interoculares bajo
        # los ojos; la desviación de esa proporción aproxima el pitch.
        pitch = math.atan(
            (float(nose_tip[1] - eye_mid[1]) / interocular) - 0.55
        )
        return {
            "yaw": round(yaw, 4),
            "pitch": round(pitch, 4),
            "roll": round(roll, 4),
        }

    @staticmethod
    def _liveness_heuristic(
        image_bgr: np.ndarray,
        face_gray: np.ndarray,
        sharpness: float,
        brightness_score: float,
    ) -> float:
        """Liveness heurístico 0-1 (ver caveats en el docstring del módulo).

        Señales: nitidez del rostro, textura local (desviación estándar
        del Laplaciano — piel real tiene micro-textura, una pantalla o
        impresión re-fotografiada tiende a aplanarla) y saturación de
        color natural (pantallas: sobresaturada o azulada; B/N: ~0).
        """
        laplacian = cv2.Laplacian(face_gray, cv2.CV_64F)
        texture = min(1.0, float(laplacian.std()) / 12.0)

        hsv = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2HSV)
        saturation_mean = float(hsv[:, :, 1].mean())
        if 25.0 <= saturation_mean <= 160.0:
            color_naturalness = 1.0
        elif saturation_mean < 25.0:
            color_naturalness = saturation_mean / 25.0
        else:
            color_naturalness = max(0.0, (255.0 - saturation_mean) / 95.0)

        score = (
            0.40 * sharpness
            + 0.30 * texture
            + 0.15 * color_naturalness
            + 0.15 * brightness_score
        )
        return round(min(1.0, score), 4)
