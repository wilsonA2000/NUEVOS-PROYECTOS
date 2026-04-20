"""Tests del parser best-effort de documentos de identidad CO.

Funcionan sin Django DB ni AWS — parser 100 % puro.
"""

from __future__ import annotations

from datetime import date

from django.test import SimpleTestCase

from contracts.biometric_providers._colombian_id_parser import (
    ParsedColombianID,
    parse_colombian_id,
)


class TypeDetectionTests(SimpleTestCase):
    def test_detects_cedula_ciudadania(self):
        result = parse_colombian_id(
            [
                "REPUBLICA DE COLOMBIA",
                "CEDULA DE CIUDADANIA",
                "NUMERO 1012345678",
            ]
        )
        self.assertEqual(result.detected_type, "cedula_ciudadania")

    def test_detects_tarjeta_identidad(self):
        result = parse_colombian_id(
            ["REPUBLICA DE COLOMBIA", "TARJETA DE IDENTIDAD"]
        )
        self.assertEqual(result.detected_type, "tarjeta_identidad")

    def test_detects_cedula_extranjeria(self):
        result = parse_colombian_id(
            ["REPUBLICA DE COLOMBIA", "CEDULA DE EXTRANJERIA", "NUMERO CE 457896"]
        )
        self.assertEqual(result.detected_type, "cedula_extranjeria")

    def test_detects_pasaporte(self):
        result = parse_colombian_id(
            ["REPUBLICA DE COLOMBIA", "PASAPORTE", "AR123456"]
        )
        self.assertEqual(result.detected_type, "pasaporte")

    def test_empty_input_returns_empty_type(self):
        result = parse_colombian_id([])
        self.assertEqual(result.detected_type, "")
        self.assertIsNone(result.document_number)


class DocumentNumberTests(SimpleTestCase):
    def test_extracts_cedula_number(self):
        result = parse_colombian_id(
            ["CEDULA DE CIUDADANIA", "1012345678", "Juan Pérez"]
        )
        self.assertEqual(result.document_number, "1012345678")

    def test_extracts_ce_number_with_prefix(self):
        result = parse_colombian_id(
            ["CEDULA DE EXTRANJERIA", "NUMERO CE 123456", "CARLOS MENDEZ"]
        )
        self.assertEqual(result.document_number, "CE123456")

    def test_rejects_leading_zero(self):
        # Números colombianos no llevan cero inicial.
        result = parse_colombian_id(
            ["CEDULA DE CIUDADANIA", "0123456", "PEDRO GARCIA"]
        )
        # 0123456 no debe coincidir; si no hay otro número devuelve None.
        self.assertNotEqual(result.document_number, "0123456")

    def test_prefers_longer_candidate(self):
        result = parse_colombian_id(
            ["CEDULA", "123456", "numero real 1012345678"]
        )
        self.assertEqual(result.document_number, "1012345678")


class DateExtractionTests(SimpleTestCase):
    def test_extracts_birth_and_expiry_with_hints(self):
        result = parse_colombian_id(
            [
                "CEDULA DE CIUDADANIA",
                "FECHA DE NACIMIENTO 12/03/1990",
                "FECHA DE VENCIMIENTO 15/07/2030",
            ]
        )
        self.assertEqual(result.date_of_birth, date(1990, 3, 12))
        self.assertEqual(result.expiry_date, date(2030, 7, 15))

    def test_falls_back_to_chronological_order(self):
        # Sin hints, la fecha más temprana es nacimiento y la más tardía expiry.
        result = parse_colombian_id(
            ["CEDULA", "12/03/1990", "15/07/2030", "CARLOS GOMEZ"]
        )
        self.assertEqual(result.date_of_birth, date(1990, 3, 12))
        self.assertEqual(result.expiry_date, date(2030, 7, 15))

    def test_spanish_month_abbreviation(self):
        result = parse_colombian_id(
            ["CEDULA", "FECHA DE NACIMIENTO 12 ABR 1985"]
        )
        self.assertEqual(result.date_of_birth, date(1985, 4, 12))


class NameExtractionTests(SimpleTestCase):
    def test_extracts_two_token_name(self):
        result = parse_colombian_id(
            [
                "REPUBLICA DE COLOMBIA",
                "CEDULA DE CIUDADANIA",
                "NUMERO 1012345678",
                "JUAN PEREZ",
            ]
        )
        self.assertEqual(result.full_name, "JUAN PEREZ")
        self.assertEqual(result.first_name, "JUAN")
        self.assertEqual(result.last_name, "PEREZ")

    def test_extracts_four_token_name_splits_middle(self):
        result = parse_colombian_id(
            [
                "CEDULA DE CIUDADANIA",
                "1012345678",
                "JUAN CARLOS PEREZ GARCIA",
            ]
        )
        self.assertEqual(result.full_name, "JUAN CARLOS PEREZ GARCIA")
        self.assertEqual(result.first_name, "JUAN CARLOS")
        self.assertEqual(result.last_name, "PEREZ GARCIA")

    def test_ignores_non_uppercase_lines(self):
        result = parse_colombian_id(
            [
                "Cedula de Ciudadania",
                "Juan Perez",
                "1012345678",
            ]
        )
        self.assertIsNone(result.full_name)


class EndToEndTests(SimpleTestCase):
    def test_full_cedula_scenario(self):
        lines = [
            "REPUBLICA DE COLOMBIA",
            "IDENTIFICACION PERSONAL",
            "CEDULA DE CIUDADANIA",
            "NUMERO 1012345678",
            "APELLIDOS",
            "PEREZ GARCIA",
            "NOMBRES",
            "JUAN CARLOS",
            "FECHA DE NACIMIENTO 12/03/1990",
            "LUGAR DE NACIMIENTO BOGOTA",
            "FECHA DE EXPEDICION 15/07/2010",
        ]
        result = parse_colombian_id(lines)
        self.assertIsInstance(result, ParsedColombianID)
        self.assertEqual(result.detected_type, "cedula_ciudadania")
        self.assertEqual(result.document_number, "1012345678")
        self.assertEqual(result.date_of_birth, date(1990, 3, 12))
        self.assertIsNotNone(result.full_name)
