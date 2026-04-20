"""Tests de CUFE + stub XAdES para DIAN (Resolución 000042/2020).

El CUFE (Código Único de Facturación Electrónica) es un hash
determinístico que la DIAN exige en cada factura electrónica.
Estos tests validan:
- determinismo de `calculate_cufe`
- cambios en cualquier input producen hashes distintos
- el stub de firma inyecta el placeholder cuando no hay certificado
"""

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from payments.dian_invoice_service import (
    calculate_cufe,
    sign_invoice_xml,
)
from payments.models import Invoice

User = get_user_model()


def _make_invoice(**kwargs) -> Invoice:
    issuer = User.objects.create_user(
        email=f"issuer_{timezone.now().timestamp()}@test.com",
        password="pass12345",
        user_type="landlord",
    )
    recipient = User.objects.create_user(
        email=f"recipient_{timezone.now().timestamp()}@test.com",
        password="pass12345",
        user_type="tenant",
    )
    defaults = {
        "invoice_number": "VH-2026-000001",
        "issuer": issuer,
        "recipient": recipient,
        "invoice_type": "rent",
        "title": "Canon abril",
        "subtotal": Decimal("1500000.00"),
        "tax_amount": Decimal("0.00"),
        "total_amount": Decimal("1500000.00"),
        "status": "sent",
        "issue_date": date(2026, 4, 1),
        "due_date": date(2026, 4, 10),
    }
    defaults.update(kwargs)
    return Invoice.objects.create(**defaults)


class CUFECalculationTests(TestCase):
    """`calculate_cufe` debe ser determinístico y sensible a cada input."""

    def test_is_deterministic(self):
        inv = _make_invoice()
        hash_a = calculate_cufe(inv, technical_key="key-test")
        hash_b = calculate_cufe(inv, technical_key="key-test")
        self.assertEqual(hash_a, hash_b)
        # SHA-384 = 96 hex chars
        self.assertEqual(len(hash_a), 96)

    def test_changes_with_invoice_number(self):
        inv = _make_invoice(invoice_number="VH-2026-000001")
        hash_a = calculate_cufe(inv, technical_key="same-key")

        inv2 = _make_invoice(invoice_number="VH-2026-000002")
        hash_b = calculate_cufe(inv2, technical_key="same-key")
        self.assertNotEqual(hash_a, hash_b)

    def test_changes_with_total_amount(self):
        inv_a = _make_invoice(
            invoice_number="VH-2026-000010",
            subtotal=Decimal("1000000"),
            total_amount=Decimal("1000000"),
        )
        inv_b = _make_invoice(
            invoice_number="VH-2026-000011",
            subtotal=Decimal("2000000"),
            total_amount=Decimal("2000000"),
        )
        self.assertNotEqual(
            calculate_cufe(inv_a, technical_key="k"),
            calculate_cufe(inv_b, technical_key="k"),
        )

    def test_changes_with_technical_key(self):
        inv = _make_invoice(invoice_number="VH-2026-000020")
        self.assertNotEqual(
            calculate_cufe(inv, technical_key="key-A"),
            calculate_cufe(inv, technical_key="key-B"),
        )

    @override_settings(DIAN_TECHNICAL_KEY="settings-key-42")
    def test_technical_key_from_settings(self):
        inv = _make_invoice(invoice_number="VH-2026-000030")
        # Sin parámetro explícito lee de settings.
        hash_from_settings = calculate_cufe(inv)
        hash_explicit = calculate_cufe(inv, technical_key="settings-key-42")
        self.assertEqual(hash_from_settings, hash_explicit)


class InvoiceXMLSigningStubTests(TestCase):
    """`sign_invoice_xml` en modo stub inserta placeholder explicativo."""

    def test_without_certificate_inserts_placeholder(self):
        xml = "<Invoice><cbc:ID>VH-1</cbc:ID></Invoice>"
        signed = sign_invoice_xml(xml)
        self.assertIn("XAdES-BES signature pending", signed)
        self.assertIn("DIAN_CERTIFICATE_PATH", signed)
        # Idempotente sobre la tag de cierre.
        self.assertTrue(signed.strip().endswith("</Invoice>"))

    @override_settings(
        DIAN_CERTIFICATE_PATH="/fake/path/cert.p12",
        DIAN_CERTIFICATE_PASSWORD="password",
    )
    def test_with_settings_cert_does_not_insert_placeholder(self):
        """Cuando hay cert en settings el stub no inserta placeholder.

        En producción aquí se invocaría signxml; en este test sólo
        validamos que el modo stub cede a ese path.
        """
        xml = "<Invoice><cbc:ID>VH-2</cbc:ID></Invoice>"
        result = sign_invoice_xml(xml)
        # El stub devuelve el XML sin modificar (TODO real pending).
        self.assertNotIn("XAdES-BES signature pending", result)
        self.assertEqual(result, xml)
