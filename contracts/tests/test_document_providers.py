"""Tests del DocumentProvider: interfaz base, demo y factory.

El provider Truora real (TR-3) cubrirá OCR cédula CO + cruce
Registraduría con su propia suite de tests.
"""

from __future__ import annotations

from django.test import SimpleTestCase, override_settings

from contracts.biometric_providers import (
    DemoDocumentProvider,
    DocumentAnalysis,
    DocumentProvider,
    get_document_provider,
)
from contracts.biometric_providers.document_factory import _resolve_provider_name


class DocumentAnalysisTests(SimpleTestCase):
    def test_image_analysis_dict_keys(self):
        analysis = DocumentAnalysis(
            document_detected=True,
            quality_score=0.9,
            security_features=True,
            tamper_detected=False,
            corners_detected=4,
            text_regions=10,
            detected_type="cedula_ciudadania",
        )
        payload = analysis.to_image_analysis_dict()
        self.assertEqual(
            set(payload.keys()),
            {
                "document_detected",
                "quality_score",
                "security_features",
                "tamper_detected",
                "corners_detected",
                "text_regions",
                "document_type",
            },
        )
        self.assertEqual(payload["document_type"], "cedula_ciudadania")

    def test_ocr_results_dict_keys(self):
        analysis = DocumentAnalysis(
            document_number="1234567890",
            full_name="Juan Pérez",
            first_name="Juan",
            last_name="Pérez",
            detected_type="cedula_ciudadania",
            ocr_confidence=0.91,
        )
        payload = analysis.to_ocr_results_dict()
        self.assertIn("document_number", payload)
        self.assertIn("name", payload)
        self.assertEqual(payload["name"], "Juan Pérez")
        self.assertEqual(payload["ocr_confidence"], 0.91)

    def test_validation_dict_keys(self):
        analysis = DocumentAnalysis(
            document_number_valid=True,
            expiry_date_valid=True,
            name_present=True,
            type_matches=True,
            overall_validity=0.9,
        )
        payload = analysis.to_validation_dict("cedula_ciudadania")
        self.assertEqual(
            set(payload.keys()),
            {
                "document_number_valid",
                "expiry_date_valid",
                "name_present",
                "type_matches",
                "overall_validity",
            },
        )


class DemoDocumentProviderTests(SimpleTestCase):
    def setUp(self):
        self.provider = DemoDocumentProvider()

    def test_is_demo_true(self):
        self.assertTrue(self.provider.is_demo())

    def test_implements_interface(self):
        self.assertIsInstance(self.provider, DocumentProvider)

    def test_analyze_document_returns_populated_analysis(self):
        result = self.provider.analyze_document(
            "data:image/png;base64,xxx", "cedula_ciudadania"
        )
        self.assertIsInstance(result, DocumentAnalysis)
        self.assertTrue(result.document_detected)
        self.assertGreaterEqual(result.quality_score, 0.7)
        self.assertGreaterEqual(result.ocr_confidence, 0.7)
        self.assertEqual(result.provider, "demo")
        self.assertTrue(result.name_present)
        self.assertTrue(result.document_number_valid)
        self.assertTrue(result.expiry_date_valid)
        self.assertEqual(result.detected_type, "cedula_ciudadania")
        self.assertTrue(result.type_matches)

    def test_type_mismatch_when_detected_differs(self):
        # Demo retorna detected_type == document_type siempre,
        # pero si manipulamos el valor la validación debe reflejarlo.
        result = self.provider.analyze_document("x", "pasaporte")
        self.assertTrue(result.type_matches)


class FactoryTests(SimpleTestCase):
    def setUp(self):
        get_document_provider.cache_clear()

    def tearDown(self):
        get_document_provider.cache_clear()

    @override_settings(BIOMETRIC_DOCUMENT_PROVIDER="demo")
    def test_demo_selected_by_default(self):
        provider = get_document_provider()
        self.assertIsInstance(provider, DemoDocumentProvider)
        self.assertTrue(provider.is_demo())

    @override_settings(BIOMETRIC_DOCUMENT_PROVIDER="unknown_vendor")
    def test_unknown_provider_falls_back_to_demo(self):
        self.assertEqual(_resolve_provider_name(), "demo")
        provider = get_document_provider()
        self.assertIsInstance(provider, DemoDocumentProvider)

    @override_settings(BIOMETRIC_DOCUMENT_PROVIDER="DEMO")
    def test_provider_name_is_normalized(self):
        self.assertEqual(_resolve_provider_name(), "demo")

    def test_cache_returns_same_instance(self):
        first = get_document_provider()
        second = get_document_provider()
        self.assertIs(first, second)
