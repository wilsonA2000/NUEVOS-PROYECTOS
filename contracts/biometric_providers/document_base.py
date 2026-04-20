"""Interfaz abstracta de los proveedores OCR / análisis de documentos.

Espeja el patrón de `base.py` (facial). `DocumentAnalysis` conserva
todos los campos que el servicio biométrico consume vía
`auth.document_analysis` (image_analysis + ocr_results + validation
_results) para no romper la shape al conectar proveedores reales.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date
from typing import Any


@dataclass
class DocumentAnalysis:
    """Resultado normalizado del análisis de un documento de identidad.

    Agrupa tres cosas que el stub original exponía por separado:
    métricas de imagen, campos extraídos por OCR y validaciones.
    El servicio los re-divide en dicts para preservar el contrato
    previo con el frontend.
    """

    # Análisis de imagen
    document_detected: bool = False
    quality_score: float = 0.0
    security_features: bool = False
    tamper_detected: bool = False
    corners_detected: int = 0
    text_regions: int = 0

    # Campos extraídos (OCR)
    document_number: str | None = None
    full_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: date | None = None
    expiry_date: date | None = None
    detected_type: str = ""
    ocr_confidence: float = 0.0

    # Validaciones derivadas
    document_number_valid: bool = False
    expiry_date_valid: bool = False
    name_present: bool = False
    type_matches: bool = False
    overall_validity: float = 0.0

    provider: str = "unknown"
    raw: dict[str, Any] = field(default_factory=dict)

    def to_image_analysis_dict(self) -> dict[str, Any]:
        """Shape consumida por `auth.document_analysis['image_analysis']`."""
        return {
            "document_detected": self.document_detected,
            "quality_score": self.quality_score,
            "security_features": self.security_features,
            "tamper_detected": self.tamper_detected,
            "corners_detected": self.corners_detected,
            "text_regions": self.text_regions,
            "document_type": self.detected_type,
        }

    def to_ocr_results_dict(self) -> dict[str, Any]:
        """Shape consumida por `auth.document_analysis['ocr_results']`."""
        return {
            "document_number": self.document_number or "",
            "name": self.full_name or "",
            "first_name": self.first_name or "",
            "last_name": self.last_name or "",
            "date_of_birth": self.date_of_birth,
            "expiry_date": self.expiry_date,
            "detected_type": self.detected_type,
            "ocr_confidence": self.ocr_confidence,
        }

    def to_validation_dict(self, expected_type: str) -> dict[str, Any]:
        return {
            "document_number_valid": self.document_number_valid,
            "expiry_date_valid": self.expiry_date_valid,
            "name_present": self.name_present,
            "type_matches": self.type_matches,
            "overall_validity": self.overall_validity,
        }


class DocumentProvider(ABC):
    """Contrato para proveedores de análisis de documentos de identidad."""

    name: str = "base"

    @abstractmethod
    def analyze_document(
        self, image_data: str, document_type: str
    ) -> DocumentAnalysis:
        """Procesa una imagen del documento y devuelve un análisis completo.

        El proveedor debe poblar tanto las métricas de imagen como los
        campos extraídos por OCR y las validaciones derivadas en un
        solo llamado para evitar doble costo / doble latencia.
        """

    def is_demo(self) -> bool:
        return False
