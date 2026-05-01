"""
Generador de PDF para `FieldVisitAct` con ReportLab.

Renderiza las 10 secciones del acta VeriHome ID
(`docs/strategy/VERIHOME_ID_FIELD_VISIT_FLOW.md` líneas 161-221) y
calcula el SHA-256 sobre los bytes del PDF para anclarlo a la cadena
de hashes.
"""

from __future__ import annotations

import hashlib
import io

from django.core.files.base import ContentFile
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def _build_styles():
    base = getSampleStyleSheet()
    base.add(
        ParagraphStyle(
            name="ActTitle",
            parent=base["Heading1"],
            alignment=TA_CENTER,
            fontSize=16,
            spaceAfter=14,
        )
    )
    base.add(
        ParagraphStyle(
            name="ActSection",
            parent=base["Heading2"],
            fontSize=12,
            spaceBefore=10,
            spaceAfter=6,
            textColor=colors.HexColor("#0A2540"),
        )
    )
    base.add(
        ParagraphStyle(
            name="ActBody",
            parent=base["BodyText"],
            fontSize=10,
            alignment=TA_JUSTIFY,
            leading=14,
        )
    )
    return base


def _kv_table(rows):
    """Crea tabla 2 columnas con etiqueta + valor."""
    safe_rows = [[Paragraph(k, _SHARED_STYLES["ActBody"]),
                  Paragraph(str(v) if v is not None else "—",
                            _SHARED_STYLES["ActBody"])]
                 for k, v in rows]
    table = Table(safe_rows, colWidths=[2.0 * inch, 4.4 * inch])
    table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LINEBELOW", (0, 0), (-1, -1), 0.25, colors.lightgrey),
            ]
        )
    )
    return table


_SHARED_STYLES = _build_styles()


def render_act_pdf(act) -> bytes:
    """
    Renderiza el acta a PDF y devuelve los bytes. NO toca `act` ni
    persiste — el caller decide cómo guardar (`save_act_pdf` adjunto).
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.8 * inch,
        rightMargin=0.8 * inch,
        topMargin=0.8 * inch,
        bottomMargin=0.8 * inch,
        title=f"Acta {act.act_number}",
    )

    payload = act.payload or {}
    elements = []
    s = _SHARED_STYLES

    elements.append(
        Paragraph("ACTA DE VERIFICACIÓN DE IDENTIDAD VERIHOME ID", s["ActTitle"])
    )
    elements.append(
        Paragraph(
            f"Acta N°: <b>{act.act_number}</b> · "
            f"Estado: <b>{act.get_status_display()}</b>",
            s["ActBody"],
        )
    )
    elements.append(
        Paragraph(
            f"Fecha de creación: {act.created_at.strftime('%Y-%m-%d %H:%M:%S %Z')}",
            s["ActBody"],
        )
    )
    if act.geolocation_lat and act.geolocation_lng:
        elements.append(
            Paragraph(
                f"GPS: {act.geolocation_lat}, {act.geolocation_lng}",
                s["ActBody"],
            )
        )
    elements.append(Spacer(1, 0.2 * inch))

    section_i = payload.get("section_i", {})
    elements.append(Paragraph("I. Identificación del verificado", s["ActSection"]))
    elements.append(
        _kv_table(
            [
                ("Nombre", section_i.get("name", act.field_request.full_name_declared)),
                (
                    "Documento",
                    section_i.get(
                        "document",
                        f"{act.field_request.get_document_type_declared_display()} "
                        f"{act.field_request.document_number_declared}",
                    ),
                ),
                ("Membresía", section_i.get("membership", "—")),
            ]
        )
    )

    section_ii = payload.get("section_ii", {})
    agent = act.visit.agent
    elements.append(Paragraph("II. Agente verificador", s["ActSection"]))
    elements.append(
        _kv_table(
            [
                (
                    "Nombre",
                    section_ii.get(
                        "name",
                        agent.user.get_full_name() if agent else "—",
                    ),
                ),
                (
                    "Carnet VeriHome",
                    section_ii.get("carnet", agent.agent_code if agent else "—"),
                ),
            ]
        )
    )

    section_iii = payload.get("section_iii", {})
    elements.append(Paragraph("III. Consentimiento informado", s["ActSection"]))
    elements.append(
        _kv_table(
            [
                ("Hash documento firmado", section_iii.get("consent_hash", "—")),
                ("Fecha-hora firma", section_iii.get("signed_at", "—")),
            ]
        )
    )

    section_iv = payload.get("section_iv", act.field_request.face_match_data or {})
    elements.append(Paragraph("IV. Validación biométrica", s["ActSection"]))
    elements.append(
        _kv_table(
            [
                (
                    "Match facial cédula↔selfie",
                    section_iv.get("similarity", "—"),
                ),
                ("Liveness", section_iv.get("liveness", "—")),
                (
                    "Cédula auténtica",
                    section_iv.get("cedula_real", "—"),
                ),
                (
                    "Observaciones del agente",
                    section_iv.get("agent_obs", "—"),
                ),
            ]
        )
    )

    section_v = payload.get("section_v", {})
    elements.append(Paragraph("V. Cruces con fuentes oficiales", s["ActSection"]))
    elements.append(
        _kv_table(
            [
                ("ADRES BDUA", section_v.get("adres", "Pendiente derecho de petición")),
                ("RUAF", section_v.get("ruaf", "—")),
                ("RUNT", section_v.get("runt", "—")),
                ("Procuraduría", section_v.get("procuraduria", "—")),
                ("Contraloría", section_v.get("contraloria", "—")),
                ("Policía", section_v.get("policia", "—")),
                ("DAFP (PEP)", section_v.get("dafp", "—")),
            ]
        )
    )

    section_vi = payload.get("section_vi", {})
    elements.append(Paragraph("VI. Validación documental", s["ActSection"]))
    elements.append(
        _kv_table(
            [
                ("Recibo público", section_vi.get("recibo", "—")),
                ("Comprobante laboral", section_vi.get("laboral", "—")),
                ("Email verificado", section_vi.get("email", "—")),
                ("Teléfono verificado", section_vi.get("phone", "—")),
            ]
        )
    )

    section_vii = payload.get("section_vii", {})
    if section_vii:
        elements.append(Paragraph("VII. Verificación inmueble", s["ActSection"]))
        elements.append(
            _kv_table(
                [
                    ("Tradición y libertad", section_vii.get("tradicion", "—")),
                    ("IGAC", section_vii.get("igac", "—")),
                    ("Estado físico", section_vii.get("estado", "—")),
                ]
            )
        )

    section_viii = payload.get("section_viii", {})
    elements.append(Paragraph("VIII. Score compuesto VeriHome ID", s["ActSection"]))
    elements.append(
        _kv_table(
            [
                ("Score total", section_viii.get("score_total", "—")),
                ("Decisión", section_viii.get("verdict", act.field_request.digital_verdict)),
                ("Razones", section_viii.get("reasons", "—")),
            ]
        )
    )

    elements.append(Paragraph("IX. Firmas", s["ActSection"]))
    elements.append(
        _kv_table(
            [
                (
                    "Verificado",
                    f"Firmado el {act.verified_signed_at}" if act.verified_signed_at
                    else "Pendiente",
                ),
                (
                    "Agente",
                    f"Firmado el {act.agent_signed_at}" if act.agent_signed_at
                    else "Pendiente",
                ),
                (
                    "Abogado certificador",
                    f"{act.lawyer_full_name} (T.P. {act.lawyer_tp_number}, "
                    f"CC {act.lawyer_cc}) — {act.lawyer_signed_at}"
                    if act.lawyer_signed_at
                    else "Pendiente",
                ),
            ]
        )
    )
    elements.append(Spacer(1, 0.05 * inch))
    elements.append(
        Paragraph(
            "Firmas conforme a Ley 527 de 1999 (mensajes de datos), "
            "Ley 1581 de 2012 (datos personales) y Ley 820 de 2003 "
            "(arrendamiento).",
            s["ActBody"],
        )
    )

    elements.append(Paragraph("X. Cadena de integridad", s["ActSection"]))
    elements.append(
        _kv_table(
            [
                ("Bloque #", act.block_number or "Pendiente de sellado"),
                ("Hash anterior", act.prev_hash or "—"),
                ("Hash payload+PDF", act.payload_hash or "—"),
                ("Hash final", act.final_hash or "—"),
            ]
        )
    )

    doc.build(elements)
    return buffer.getvalue()


def save_act_pdf(act) -> str:
    """
    Renderiza, calcula sha256 y persiste en `act.pdf_file` + `pdf_sha256`.
    Devuelve el sha256.
    """
    pdf_bytes = render_act_pdf(act)
    sha256 = hashlib.sha256(pdf_bytes).hexdigest()
    filename = f"{act.act_number}.pdf"
    act.pdf_file.save(filename, ContentFile(pdf_bytes), save=False)
    act.pdf_sha256 = sha256
    act.save(update_fields=["pdf_file", "pdf_sha256", "updated_at"])
    return sha256
