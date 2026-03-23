"""
Servicio de Facturación Electrónica DIAN para VeriHome.

Implementa la generación de facturas electrónicas conforme a la
Resolución 000042 de 2020 de la DIAN (Colombia).

NOTA: Este es el esquema base. La integración real con el web service
de la DIAN requiere certificado digital de firma electrónica y
habilitación como facturador electrónico. Los XML se generan en formato
UBL 2.1 estándar colombiano.
"""

import logging
import uuid
from decimal import Decimal
from datetime import datetime
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)

# Configuración DIAN (se lee de settings o .env)
DIAN_CONFIG = {
    'nit_emisor': getattr(settings, 'DIAN_NIT_EMISOR', '901234567'),
    'razon_social': getattr(settings, 'DIAN_RAZON_SOCIAL', 'VeriHome S.A.S.'),
    'regimen': 'Responsable de IVA',
    'tipo_documento': 'NIT',
    'direccion': 'Calle 13 #28-42, San Alonso',
    'ciudad': 'Bucaramanga',
    'departamento': 'Santander',
    'pais': 'CO',
    'telefono': '+57 (7) 123-4567',
    'email': 'facturacion@verihome.com',
    'prefijo_factura': 'VH',
    'resolucion_dian': '',  # Número de resolución de habilitación
    'rango_desde': 1,
    'rango_hasta': 999999,
    'ambiente': 'test',  # 'test' o 'production'
}


class DIANInvoiceData:
    """Estructura de datos para una factura electrónica DIAN."""

    def __init__(self):
        self.invoice_number = ''
        self.issue_date = timezone.now()
        self.due_date = None
        self.currency = 'COP'

        # Emisor (VeriHome)
        self.issuer = DIAN_CONFIG.copy()

        # Receptor
        self.recipient_nit = ''
        self.recipient_name = ''
        self.recipient_address = ''
        self.recipient_city = ''
        self.recipient_email = ''
        self.recipient_phone = ''

        # Líneas
        self.items = []  # List of dicts: {description, quantity, unit_price, tax_rate, total}

        # Totales
        self.subtotal = Decimal('0')
        self.tax_total = Decimal('0')
        self.total = Decimal('0')

        # Referencia
        self.contract_number = ''
        self.payment_reference = ''
        self.notes = ''


def generate_invoice_number():
    """Genera número de factura secuencial con prefijo VeriHome."""
    from payments.models import Invoice
    year = timezone.now().year
    count = Invoice.objects.filter(created_at__year=year).count() + 1
    return f"{DIAN_CONFIG['prefijo_factura']}-{year}-{count:06d}"


def create_dian_invoice_from_transaction(transaction):
    """
    Crea una factura electrónica a partir de una transacción completada.

    Args:
        transaction: Transaction model instance con status='completed'

    Returns:
        Invoice model instance con datos DIAN
    """
    from payments.models import Invoice, InvoiceItem

    if transaction.status != 'completed':
        raise ValueError('Solo se pueden facturar transacciones completadas')

    invoice_number = generate_invoice_number()

    # Determinar emisor y receptor
    issuer = transaction.payee or None
    recipient = transaction.payer or None

    invoice = Invoice.objects.create(
        invoice_number=invoice_number,
        invoice_type='rent' if transaction.transaction_type == 'rent_payment' else 'commission',
        issuer=issuer,
        recipient=recipient,
        subtotal=transaction.amount,
        tax_rate=Decimal('0'),  # Arrendamiento residencial exento de IVA en Colombia
        tax_amount=Decimal('0'),
        total_amount=transaction.amount,
        status='sent',
        notes=f'Factura generada automáticamente. Ref: {transaction.id}',
        metadata={
            'dian_format': 'UBL_2.1',
            'transaction_id': str(transaction.id),
            'contract_id': str(transaction.contract_id) if transaction.contract_id else None,
            'ambiente': DIAN_CONFIG['ambiente'],
            'nit_emisor': DIAN_CONFIG['nit_emisor'],
            'resolucion': DIAN_CONFIG['resolucion_dian'],
        },
    )

    # Crear línea de factura
    description = f'Canon de arrendamiento' if transaction.transaction_type == 'rent_payment' else f'{transaction.get_transaction_type_display()}'
    if transaction.contract:
        description += f' - Contrato {transaction.contract.contract_number if hasattr(transaction.contract, "contract_number") else transaction.contract_id}'

    InvoiceItem.objects.create(
        invoice=invoice,
        description=description,
        quantity=1,
        unit_price=transaction.amount,
        total_price=transaction.amount,
        tax_rate=Decimal('0'),
        discount_rate=Decimal('0'),
    )

    logger.info(f"DIAN invoice {invoice_number} created for transaction {transaction.id}")
    return invoice


def generate_dian_xml(invoice):
    """
    Genera XML en formato UBL 2.1 para envío a la DIAN.

    NOTA: Este es un esquema base. La implementación completa requiere:
    - Certificado digital de firma electrónica
    - Habilitación como facturador electrónico ante la DIAN
    - Validación con el web service de la DIAN (ambiente de pruebas/producción)

    Returns:
        str: XML string en formato UBL 2.1
    """
    meta = invoice.metadata or {}
    items = invoice.items.all()

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ID>{invoice.invoice_number}</cbc:ID>
  <cbc:IssueDate>{invoice.created_at.strftime('%Y-%m-%d')}</cbc:IssueDate>
  <cbc:IssueTime>{invoice.created_at.strftime('%H:%M:%S')}-05:00</cbc:IssueTime>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>

  <!-- Emisor -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID>{meta.get('nit_emisor', DIAN_CONFIG['nit_emisor'])}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>{DIAN_CONFIG['razon_social']}</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Receptor -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>{invoice.recipient.get_full_name() if invoice.recipient else 'N/A'}</cbc:Name>
      </cac:PartyName>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Totales -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">{invoice.subtotal}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">{invoice.subtotal}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">{invoice.total_amount}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">{invoice.total_amount}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Líneas -->"""

    for i, item in enumerate(items, 1):
        xml += f"""
  <cac:InvoiceLine>
    <cbc:ID>{i}</cbc:ID>
    <cbc:InvoicedQuantity>{item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">{item.total_price}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>{item.description}</cbc:Description>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="COP">{item.unit_price}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>"""

    xml += """
</Invoice>"""

    return xml


def auto_invoice_rent_payment(transaction):
    """
    Genera factura automáticamente cuando se confirma un pago de arriendo.
    Se llama desde el reconciliation_service después de confirmar pago.
    """
    if transaction.transaction_type != 'rent_payment':
        return None

    if transaction.status != 'completed':
        return None

    try:
        invoice = create_dian_invoice_from_transaction(transaction)
        logger.info(f"Auto-invoice {invoice.invoice_number} for rent payment {transaction.id}")
        return invoice
    except Exception as e:
        logger.error(f"Failed to auto-invoice transaction {transaction.id}: {e}")
        return None
