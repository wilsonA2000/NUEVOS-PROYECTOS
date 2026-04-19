"""
Generador de recibos de pago en PDF para VeriHome.
Produce recibos profesionales con branding de VeriHome usando ReportLab.
"""

import io
import logging

from django.utils import timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
)

logger = logging.getLogger('payments')


# Colores de marca VeriHome
VERIHOME_PRIMARY = colors.HexColor('#1A237E')      # Azul oscuro
VERIHOME_SECONDARY = colors.HexColor('#283593')    # Azul medio
VERIHOME_ACCENT = colors.HexColor('#4CAF50')       # Verde
VERIHOME_LIGHT_BG = colors.HexColor('#F5F5F5')     # Gris claro
VERIHOME_BORDER = colors.HexColor('#E0E0E0')       # Gris borde


def generate_payment_receipt(payment):
    """
    Genera un recibo de pago en formato PDF.

    Args:
        payment: Instancia de Transaction (payments.models.Transaction).

    Returns:
        bytes: Contenido del PDF generado.
    """
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"Recibo de Pago - {payment.transaction_number}",
        author="VeriHome Platform",
    )

    styles = getSampleStyleSheet()

    # Estilos personalizados
    styles.add(ParagraphStyle(
        name='ReceiptTitle',
        parent=styles['Title'],
        fontSize=22,
        textColor=VERIHOME_PRIMARY,
        spaceAfter=6,
        alignment=TA_CENTER,
    ))

    styles.add(ParagraphStyle(
        name='ReceiptSubtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=VERIHOME_SECONDARY,
        alignment=TA_CENTER,
        spaceAfter=20,
    ))

    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading2'],
        fontSize=13,
        textColor=VERIHOME_PRIMARY,
        spaceBefore=16,
        spaceAfter=8,
        borderPadding=(0, 0, 4, 0),
    ))

    styles.add(ParagraphStyle(
        name='FieldLabel',
        parent=styles['Normal'],
        fontSize=9,
        textColor=colors.grey,
    ))

    styles.add(ParagraphStyle(
        name='FieldValue',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.black,
        spaceBefore=2,
        spaceAfter=6,
    ))

    styles.add(ParagraphStyle(
        name='AmountLarge',
        parent=styles['Normal'],
        fontSize=18,
        textColor=VERIHOME_PRIMARY,
        alignment=TA_CENTER,
        spaceBefore=8,
        spaceAfter=8,
        fontName='Helvetica-Bold',
    ))

    styles.add(ParagraphStyle(
        name='Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER,
    ))

    # Construir elementos del PDF
    elements = []

    # --- ENCABEZADO ---
    elements.append(Paragraph("VERIHOME", styles['ReceiptTitle']))
    elements.append(Paragraph(
        "Plataforma Inmobiliaria - Recibo de Pago",
        styles['ReceiptSubtitle']
    ))

    # Línea separadora
    elements.append(_separator_line())
    elements.append(Spacer(1, 8))

    # --- INFORMACIÓN DEL RECIBO ---
    receipt_number = payment.transaction_number
    payment_date = _format_date(payment.completed_at or payment.created_at)
    status_display = _get_status_display(payment.status)

    receipt_info_data = [
        [
            Paragraph("<b>Número de Recibo</b>", styles['FieldLabel']),
            Paragraph("<b>Fecha de Pago</b>", styles['FieldLabel']),
            Paragraph("<b>Estado</b>", styles['FieldLabel']),
        ],
        [
            Paragraph(receipt_number, styles['FieldValue']),
            Paragraph(payment_date, styles['FieldValue']),
            Paragraph(status_display, styles['FieldValue']),
        ],
    ]

    receipt_table = Table(receipt_info_data, colWidths=[6.5 * cm, 6.5 * cm, 5 * cm])
    receipt_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    elements.append(receipt_table)
    elements.append(Spacer(1, 12))

    # --- MONTO ---
    amount_display = f"${payment.amount:,.2f} {payment.currency}"
    elements.append(Paragraph("MONTO PAGADO", styles['FieldLabel']))
    elements.append(Paragraph(amount_display, styles['AmountLarge']))

    if payment.platform_fee > 0 or payment.processing_fee > 0:
        fee_details = []
        if payment.platform_fee > 0:
            fee_details.append(
                f"Comisión plataforma: ${payment.platform_fee:,.2f}"
            )
        if payment.processing_fee > 0:
            fee_details.append(
                f"Tarifa procesamiento: ${payment.processing_fee:,.2f}"
            )
        fee_details.append(f"Total: ${payment.total_amount:,.2f} {payment.currency}")
        elements.append(Paragraph(
            " | ".join(fee_details),
            styles['Footer']
        ))

    elements.append(Spacer(1, 8))
    elements.append(_separator_line())

    # --- DETALLES DEL PAGO ---
    elements.append(Paragraph("Detalles del Pago", styles['SectionHeader']))

    detail_rows = [
        ["Tipo de Transacción", payment.get_transaction_type_display()],
        ["Método de Pago", _get_payment_method_display(payment)],
        ["Descripción", payment.description or 'N/A'],
    ]

    if payment.due_date:
        detail_rows.append([
            "Fecha de Vencimiento",
            payment.due_date.strftime('%d/%m/%Y')
        ])

    if payment.gateway_provider:
        detail_rows.append(["Proveedor de Pago", payment.gateway_provider])

    if payment.gateway_transaction_id:
        detail_rows.append(["ID de Transacción Gateway", payment.gateway_transaction_id])

    detail_table = Table(
        [[Paragraph(f"<b>{row[0]}</b>", styles['Normal']),
          Paragraph(str(row[1]), styles['Normal'])]
         for row in detail_rows],
        colWidths=[7 * cm, 11 * cm],
    )
    detail_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, VERIHOME_BORDER),
        ('BACKGROUND', (0, 0), (0, -1), VERIHOME_LIGHT_BG),
    ]))
    elements.append(detail_table)
    elements.append(Spacer(1, 8))

    # --- PARTES INVOLUCRADAS ---
    elements.append(Paragraph("Partes Involucradas", styles['SectionHeader']))

    tenant_name = payment.payer.get_full_name() or payment.payer.email
    tenant_email = payment.payer.email

    landlord_name = payment.payee.get_full_name() or payment.payee.email
    landlord_email = payment.payee.email

    parties_data = [
        [
            Paragraph("<b>Arrendatario (Pagador)</b>", styles['FieldLabel']),
            Paragraph("<b>Arrendador (Beneficiario)</b>", styles['FieldLabel']),
        ],
        [
            Paragraph(tenant_name, styles['FieldValue']),
            Paragraph(landlord_name, styles['FieldValue']),
        ],
        [
            Paragraph(tenant_email, styles['Footer']),
            Paragraph(landlord_email, styles['Footer']),
        ],
    ]

    parties_table = Table(parties_data, colWidths=[9 * cm, 9 * cm])
    parties_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('LINEBELOW', (0, 0), (-1, 0), 0.5, VERIHOME_BORDER),
    ]))
    elements.append(parties_table)
    elements.append(Spacer(1, 8))

    # --- CONTRATO Y PROPIEDAD ---
    if payment.contract or payment.property:
        elements.append(Paragraph("Referencia de Contrato y Propiedad", styles['SectionHeader']))

        ref_rows = []
        if payment.contract:
            contract = payment.contract
            ref_rows.append([
                "Contrato",
                contract.title or f"#{contract.id}"
            ])

        if payment.property:
            prop = payment.property
            ref_rows.append(["Propiedad", prop.title or 'N/A'])
            if prop.address:
                ref_rows.append(["Dirección", prop.address])

        if ref_rows:
            ref_table = Table(
                [[Paragraph(f"<b>{row[0]}</b>", styles['Normal']),
                  Paragraph(str(row[1]), styles['Normal'])]
                 for row in ref_rows],
                colWidths=[7 * cm, 11 * cm],
            )
            ref_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('LINEBELOW', (0, 0), (-1, -2), 0.5, VERIHOME_BORDER),
                ('BACKGROUND', (0, 0), (0, -1), VERIHOME_LIGHT_BG),
            ]))
            elements.append(ref_table)

    elements.append(Spacer(1, 20))
    elements.append(_separator_line())
    elements.append(Spacer(1, 12))

    # --- PIE DE PÁGINA ---
    generation_time = timezone.now().strftime('%d/%m/%Y %H:%M:%S')
    elements.append(Paragraph(
        f"Documento generado el {generation_time} por la plataforma VeriHome.",
        styles['Footer']
    ))
    elements.append(Paragraph(
        "Este recibo es un comprobante digital de pago. "
        "Conserve este documento para sus registros.",
        styles['Footer']
    ))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph(
        "VeriHome - Plataforma Inmobiliaria | www.verihome.com",
        styles['Footer']
    ))

    # Construir PDF
    doc.build(elements)
    pdf_bytes = buffer.getvalue()
    buffer.close()

    logger.info(
        f"Recibo PDF generado para transacción {payment.transaction_number} "
        f"({len(pdf_bytes)} bytes)"
    )

    return pdf_bytes


def _separator_line():
    """Crea una línea separadora como tabla de una celda."""
    line = Table([['']], colWidths=[18 * cm], rowHeights=[1])
    line.setStyle(TableStyle([
        ('LINEABOVE', (0, 0), (-1, 0), 1, VERIHOME_PRIMARY),
    ]))
    return line


def _format_date(dt):
    """Formatea un datetime para mostrar en el recibo."""
    if dt is None:
        return 'N/A'
    if hasattr(dt, 'strftime'):
        return dt.strftime('%d/%m/%Y %H:%M')
    return str(dt)


def _get_status_display(status):
    """Devuelve el estado legible en español."""
    status_map = {
        'pending': 'Pendiente',
        'processing': 'Procesando',
        'completed': 'Completada',
        'failed': 'Fallida',
        'cancelled': 'Cancelada',
        'refunded': 'Reembolsada',
        'disputed': 'En disputa',
        'on_hold': 'En espera',
    }
    return status_map.get(status, status)


def _get_payment_method_display(payment):
    """Obtiene la descripción del método de pago."""
    if payment.payment_method:
        return payment.payment_method.get_display_name()
    if payment.gateway_provider:
        return payment.gateway_provider.title()
    return 'No especificado'


# T3.3 · Receipt PDF para PaymentOrder con consecutivo + desglose intereses

def generate_payment_order_receipt(order):
    """
    Genera un recibo PDF de una PaymentOrder pagada.

    A diferencia de generate_payment_receipt (que se basa en Transaction),
    este recibo destaca:
    - El consecutivo único PO-YYYY-NNNNNNNN como referencia auditable
    - El desglose de monto base + intereses moratorios (cuando aplica)
    - Las 3 fechas legales (vencimiento, fin gracia, tope mora)

    Args:
        order: instancia de payments.models.PaymentOrder

    Returns:
        bytes: contenido del PDF generado.
    """
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"Recibo Orden de Pago - {order.order_number}",
        author="VeriHome Platform",
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'POTitle', parent=styles['Title'], fontSize=22,
        textColor=VERIHOME_PRIMARY, alignment=TA_CENTER, spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        'POSubtitle', parent=styles['Normal'], fontSize=10,
        textColor=VERIHOME_SECONDARY, alignment=TA_CENTER, spaceAfter=18,
    )
    section_style = ParagraphStyle(
        'POSection', parent=styles['Heading2'], fontSize=12,
        textColor=VERIHOME_PRIMARY, spaceBefore=14, spaceAfter=6,
    )
    value_style = ParagraphStyle(
        'POValue', parent=styles['Normal'], fontSize=11, textColor=colors.black,
        spaceAfter=4,
    )

    elements = []

    # Encabezado con consecutivo destacado
    elements.append(Paragraph("VERIHOME", title_style))
    elements.append(Paragraph(
        f"Recibo de pago · Orden {order.order_number}",
        subtitle_style,
    ))

    # Caja con info principal
    info_rows = [
        ['Consecutivo:', order.order_number],
        ['Tipo:', order.get_order_type_display()],
        ['Estado:', order.get_status_display()],
        ['Pagador:', order.payer.get_full_name() or order.payer.email],
        ['Beneficiario:', order.payee.get_full_name() or order.payee.email],
    ]
    info_table = Table(info_rows, colWidths=[5 * cm, 11 * cm])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(info_table)

    # Sección de fechas legales (3 fechas)
    elements.append(Paragraph("Fechas legales (Ley 820/2003)", section_style))
    dates_rows = [
        ['Vencimiento del canon:', _format_simple_date(order.date_due)],
        ['Fin del período de gracia:', _format_simple_date(order.date_grace_end)],
        ['Tope legal de mora:', _format_simple_date(order.date_max_overdue)],
    ]
    dates_table = Table(dates_rows, colWidths=[6 * cm, 10 * cm])
    dates_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(dates_table)

    # Desglose de montos
    elements.append(Paragraph("Desglose del monto", section_style))
    money_rows = [
        ['Monto base del canon:', _format_money(order.amount)],
    ]
    if order.interest_amount and order.interest_amount > 0:
        money_rows.append(['Intereses moratorios:', _format_money(order.interest_amount)])
    money_rows.append(['Total cobrado:', _format_money(order.total_amount)])
    money_rows.append(['Pagado:', _format_money(order.paid_amount)])
    money_rows.append(['Saldo:', _format_money(order.balance)])

    money_table = Table(money_rows, colWidths=[6 * cm, 10 * cm])
    money_table.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 11),
        ('FONTNAME', (0, -3), (-1, -3), 'Helvetica-Bold'),  # Total
        ('LINEABOVE', (0, -3), (-1, -3), 0.5, colors.grey),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(money_table)

    # Descripción
    if order.description:
        elements.append(Paragraph("Descripción", section_style))
        elements.append(Paragraph(order.description, value_style))

    # Footer
    elements.append(Spacer(1, 1 * cm))
    elements.append(Paragraph(
        f"Generado automáticamente por VeriHome el "
        f"{_format_simple_date(timezone.now().date())}. "
        f"Este recibo tiene validez auditable; consérvelo para sus registros.",
        ParagraphStyle('POFooter', parent=styles['Normal'], fontSize=8,
                       textColor=colors.grey, alignment=TA_CENTER),
    ))

    doc.build(elements)
    pdf = buffer.getvalue()
    buffer.close()
    return pdf


def _format_simple_date(d):
    """Formatea una fecha (date, datetime o None) en formato es-CO."""
    if d is None:
        return '—'
    if hasattr(d, 'date'):
        d = d.date()
    return d.strftime('%d/%m/%Y')


def _format_money(amount):
    """Formato dinero COP."""
    from decimal import Decimal
    if amount is None:
        return '$0'
    try:
        n = Decimal(str(amount))
    except Exception:
        return f'${amount}'
    return f'${n:,.0f}'
