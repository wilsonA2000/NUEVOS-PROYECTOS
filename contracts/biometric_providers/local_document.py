"""DocumentProvider REAL con OCR local (pytesseract + parser CO).

Espeja a LocalFacialProvider: corre en el servidor, sin APIs pagas. Decodifica
la imagen de la cédula, extrae texto con Tesseract (español) y lo pasa al parser
`parse_colombian_id` para obtener número de documento, nombre y fechas.

Robusto: si Tesseract no está instalado o la imagen es indecodificable, devuelve
un análisis "no detectado" (no lanza), para que el onboarding no se caiga.
Requiere el paquete de SO `tesseract-ocr` + `tesseract-ocr-spa` (ver Dockerfile).
"""

from __future__ import annotations

import base64
import logging

import cv2
import numpy as np

from ._colombian_id_parser import parse_colombian_id
from .document_base import DocumentAnalysis, DocumentProvider

logger = logging.getLogger(__name__)


class LocalDocumentProvider(DocumentProvider):
    name = "local"

    @staticmethod
    def _decode_image(image_data: str) -> np.ndarray | None:
        """base64/data-url → imagen BGR; None si es inválida."""
        try:
            if "," in image_data and image_data.strip().startswith("data:"):
                image_data = image_data.split(",", 1)[1]
            buffer = np.frombuffer(base64.b64decode(image_data), dtype=np.uint8)
            image = cv2.imdecode(buffer, cv2.IMREAD_COLOR)
            if image is None or image.size == 0:
                return None
            return image
        except Exception as exc:  # noqa: BLE001
            logger.warning("LocalDocumentProvider: imagen indecodificable: %s", exc)
            return None

    @staticmethod
    def _ocr_lines(image: np.ndarray) -> list[str]:
        """Texto de la imagen con Tesseract (español). Lista de líneas."""
        import pytesseract  # import perezoso: solo cuando se usa el provider real
        from PIL import Image

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        # Umbral adaptativo ayuda con iluminación despareja de fotos de cédula.
        gray = cv2.bilateralFilter(gray, 9, 75, 75)
        text = pytesseract.image_to_string(Image.fromarray(gray), lang="spa")
        return [ln.strip() for ln in text.splitlines() if ln.strip()]

    def analyze_document(
        self, image_data: str, document_type: str
    ) -> DocumentAnalysis:
        image = self._decode_image(image_data)
        if image is None:
            return DocumentAnalysis(
                document_detected=False,
                provider=self.name,
                raw={"reason": "undecodable_image"},
            )

        try:
            lines = self._ocr_lines(image)
        except Exception as exc:  # noqa: BLE001 - tesseract ausente / error OCR
            logger.warning("LocalDocumentProvider: OCR falló: %s", exc)
            return DocumentAnalysis(
                document_detected=True,
                provider=self.name,
                raw={"reason": "ocr_error", "error": str(exc)},
            )

        parsed = parse_colombian_id(lines)

        # Calidad simple de imagen (nitidez por Laplaciano).
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        quality = max(0.0, min(1.0, sharpness / 500.0))

        has_number = bool(parsed.document_number)
        has_name = bool(parsed.full_name)
        type_matches = (
            not document_type
            or not parsed.detected_type
            or parsed.detected_type == document_type
        )
        # Confianza OCR heurística: cuántos campos clave se extrajeron.
        extracted = sum(
            1 for v in (parsed.document_number, parsed.full_name, parsed.date_of_birth) if v
        )
        ocr_confidence = round(extracted / 3.0, 4)

        return DocumentAnalysis(
            document_detected=True,
            quality_score=round(quality, 4),
            text_regions=len(lines),
            document_number=parsed.document_number,
            full_name=parsed.full_name,
            first_name=parsed.first_name,
            last_name=parsed.last_name,
            date_of_birth=parsed.date_of_birth,
            expiry_date=parsed.expiry_date,
            detected_type=parsed.detected_type,
            ocr_confidence=ocr_confidence,
            document_number_valid=has_number,
            name_present=has_name,
            type_matches=type_matches,
            overall_validity=round(
                (0.5 if has_number else 0.0)
                + (0.3 if has_name else 0.0)
                + (0.2 if type_matches else 0.0),
                4,
            ),
            provider=self.name,
            raw={"lines": lines[:25]},
        )
