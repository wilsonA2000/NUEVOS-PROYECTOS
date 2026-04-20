"""DocumentProvider de demostración.

Reproduce los valores que los stubs de `biometric_service` venían
retornando antes de la integración real. Se usa como default en dev,
CI y como fallback cuando el proveedor AWS no puede inicializarse.
"""

from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from .document_base import DocumentAnalysis, DocumentProvider


class DemoDocumentProvider(DocumentProvider):
    name = "demo"

    def analyze_document(self, image_data: str, document_type: str) -> DocumentAnalysis:
        today = timezone.now().date()
        analysis = DocumentAnalysis(
            document_detected=True,
            quality_score=0.88,
            security_features=True,
            tamper_detected=False,
            corners_detected=4,
            text_regions=12,
            document_number="1234567890",
            full_name="Juan Pérez García",
            first_name="Juan",
            last_name="Pérez García",
            date_of_birth=today - timedelta(days=30 * 365),
            expiry_date=today + timedelta(days=5 * 365),
            detected_type=document_type,
            ocr_confidence=0.91,
            provider=self.name,
            raw={"simulated": True, "input_document_type": document_type},
        )
        self._fill_validation(analysis, expected_type=document_type)
        return analysis

    @staticmethod
    def _fill_validation(analysis: DocumentAnalysis, expected_type: str) -> None:
        today = timezone.now().date()
        analysis.document_number_valid = bool(
            analysis.document_number and len(analysis.document_number) >= 8
        )
        analysis.expiry_date_valid = bool(
            analysis.expiry_date and analysis.expiry_date > today
        )
        analysis.name_present = bool(analysis.full_name)
        analysis.type_matches = analysis.detected_type == expected_type
        analysis.overall_validity = 0.89

    def is_demo(self) -> bool:
        return True
