"""Proveedor OCR basado en AWS Textract.

Estrategia híbrida por tipo de documento:

- `pasaporte` y `cedula_extranjeria` → `analyze_id` (campos estructurados).
- `cedula_ciudadania` y `tarjeta_identidad` → `detect_document_text` +
  parser colombiano (AWS no los cubre oficialmente en `analyze_id`).
- Si `analyze_id` devuelve confianza < 0.5 se degrada a
  `detect_document_text` para no perder datos.

Tamper detection real queda fuera de alcance (Metamap / Onfido en P1).
Se reporta `tamper_detected=False` y se documenta como deuda.
"""

from __future__ import annotations

import base64
import logging
from datetime import datetime, date
from typing import Any

import boto3
from django.conf import settings
from django.utils import timezone

from ._colombian_id_parser import ParsedColombianID, parse_colombian_id
from .document_base import DocumentAnalysis, DocumentProvider

logger = logging.getLogger(__name__)

_STRUCTURED_DOC_TYPES = {"pasaporte", "cedula_extranjeria"}
_ANALYZE_ID_CONFIDENCE_FLOOR = 0.5


class AWSTextractProvider(DocumentProvider):
    name = "aws_textract"

    def __init__(self, client: Any | None = None) -> None:
        self.min_quality = float(getattr(settings, "BIOMETRIC_MIN_FACE_QUALITY", 0.7))
        if client is not None:
            self._client = client
            return

        access_key = getattr(settings, "AWS_TEXTRACT_ACCESS_KEY_ID", "") or ""
        secret_key = getattr(settings, "AWS_TEXTRACT_SECRET_ACCESS_KEY", "") or ""
        region = getattr(settings, "AWS_TEXTRACT_REGION", "us-east-1") or "us-east-1"

        if not access_key or not secret_key:
            raise RuntimeError(
                "AWS Textract credentials missing "
                "(AWS_TEXTRACT_ACCESS_KEY_ID / AWS_TEXTRACT_SECRET_ACCESS_KEY)"
            )

        self._client = boto3.client(
            "textract",
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )

    @staticmethod
    def _decode(image_data: str) -> bytes:
        if not image_data:
            raise ValueError("image_data vacío")
        if "," in image_data and image_data.lstrip().startswith("data:"):
            _, image_data = image_data.split(",", 1)
        return base64.b64decode(image_data)

    def analyze_document(self, image_data: str, document_type: str) -> DocumentAnalysis:
        image_bytes = self._decode(image_data)

        if document_type in _STRUCTURED_DOC_TYPES:
            structured = self._analyze_id(image_bytes, document_type)
            if structured and structured.ocr_confidence >= _ANALYZE_ID_CONFIDENCE_FLOOR:
                self._fill_validation(structured, expected_type=document_type)
                return structured
            logger.info(
                "analyze_id confianza baja (%.2f) — fallback a detect_document_text",
                structured.ocr_confidence if structured else 0.0,
            )

        return self._detect_and_parse(image_bytes, document_type)

    def _analyze_id(
        self, image_bytes: bytes, document_type: str
    ) -> DocumentAnalysis | None:
        try:
            response = self._client.analyze_id(DocumentPages=[{"Bytes": image_bytes}])
        except Exception as exc:  # ClientError, EndpointConnectionError...
            logger.warning("Textract analyze_id falló: %s", exc)
            return None

        identity_docs = response.get("IdentityDocuments", []) or []
        if not identity_docs:
            return None

        fields = identity_docs[0].get("IdentityDocumentFields", []) or []
        field_map: dict[str, tuple[str, float]] = {}
        for field in fields:
            key = (field.get("Type") or {}).get("Text", "")
            value = (field.get("ValueDetection") or {}).get("Text", "")
            confidence = float(
                (field.get("ValueDetection") or {}).get("Confidence", 0.0)
            )
            if key:
                field_map[key] = (value, confidence)

        if not field_map:
            return None

        confidences = [c for _, c in field_map.values() if c > 0]
        avg_confidence = (
            (sum(confidences) / len(confidences) / 100.0) if confidences else 0.0
        )

        first_name = field_map.get("FIRST_NAME", ("", 0))[0] or None
        last_name = field_map.get("LAST_NAME", ("", 0))[0] or None
        full_name = " ".join(n for n in (first_name, last_name) if n) or None
        document_number = field_map.get("DOCUMENT_NUMBER", ("", 0))[0] or None
        detected_type = field_map.get("ID_TYPE", ("", 0))[0].lower() or document_type

        analysis = DocumentAnalysis(
            document_detected=True,
            quality_score=avg_confidence,
            security_features=avg_confidence > 0.85,
            tamper_detected=False,
            corners_detected=4,
            text_regions=len(fields),
            document_number=document_number,
            full_name=full_name,
            first_name=first_name,
            last_name=last_name,
            date_of_birth=_parse_iso_or_slash(
                field_map.get("DATE_OF_BIRTH", ("", 0))[0]
            ),
            expiry_date=_parse_iso_or_slash(
                field_map.get("EXPIRATION_DATE", ("", 0))[0]
            ),
            detected_type=detected_type,
            ocr_confidence=avg_confidence,
            provider=self.name,
            raw={
                "api": "analyze_id",
                "field_keys": sorted(field_map.keys()),
                "avg_confidence": avg_confidence,
            },
        )
        return analysis

    def _detect_and_parse(
        self, image_bytes: bytes, document_type: str
    ) -> DocumentAnalysis:
        try:
            response = self._client.detect_document_text(
                Document={"Bytes": image_bytes}
            )
        except Exception as exc:
            logger.warning("Textract detect_document_text falló: %s", exc)
            return DocumentAnalysis(
                document_detected=False,
                quality_score=0.0,
                detected_type=document_type,
                provider=self.name,
                raw={"api": "detect_document_text", "error": str(exc)},
            )

        blocks = response.get("Blocks", []) or []
        line_blocks = [b for b in blocks if b.get("BlockType") == "LINE"]
        lines = [b.get("Text", "") for b in line_blocks if b.get("Text")]

        if not lines:
            return DocumentAnalysis(
                document_detected=False,
                quality_score=0.0,
                detected_type=document_type,
                provider=self.name,
                raw={"api": "detect_document_text", "reason": "no_text"},
            )

        confidences = [float(b.get("Confidence", 0.0)) for b in line_blocks]
        avg_confidence = (
            (sum(confidences) / len(confidences) / 100.0) if confidences else 0.0
        )

        parsed: ParsedColombianID = parse_colombian_id(lines)
        detected_type = parsed.detected_type or document_type

        analysis = DocumentAnalysis(
            document_detected=True,
            quality_score=avg_confidence,
            security_features=avg_confidence > 0.85 and len(lines) >= 5,
            tamper_detected=False,
            corners_detected=4 if len(lines) >= 5 else 0,
            text_regions=len(line_blocks),
            document_number=parsed.document_number,
            full_name=parsed.full_name,
            first_name=parsed.first_name,
            last_name=parsed.last_name,
            date_of_birth=parsed.date_of_birth,
            expiry_date=parsed.expiry_date,
            detected_type=detected_type,
            ocr_confidence=avg_confidence,
            provider=self.name,
            raw={
                "api": "detect_document_text",
                "line_count": len(lines),
                "avg_confidence": avg_confidence,
            },
        )
        self._fill_validation(analysis, expected_type=document_type)
        return analysis

    @staticmethod
    def _fill_validation(analysis: DocumentAnalysis, expected_type: str) -> None:
        today = timezone.now().date()
        analysis.document_number_valid = bool(
            analysis.document_number and len(analysis.document_number) >= 6
        )
        analysis.expiry_date_valid = bool(
            analysis.expiry_date and analysis.expiry_date > today
        )
        # Cédula CO no tiene vencimiento: si no hay expiry_date y el tipo
        # es cedula_ciudadania/tarjeta_identidad, se considera válido.
        if not analysis.expiry_date and analysis.detected_type in {
            "cedula_ciudadania",
            "tarjeta_identidad",
        }:
            analysis.expiry_date_valid = True
        analysis.name_present = bool(analysis.full_name)
        analysis.type_matches = analysis.detected_type == expected_type
        analysis.overall_validity = min(
            1.0,
            (
                (0.4 if analysis.document_number_valid else 0.0)
                + (0.2 if analysis.name_present else 0.0)
                + (0.2 if analysis.expiry_date_valid else 0.0)
                + (0.2 if analysis.type_matches else 0.0)
            ),
        )

    def is_demo(self) -> bool:
        return False


def _parse_iso_or_slash(value: str) -> date | None:
    if not value:
        return None
    value = value.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None
