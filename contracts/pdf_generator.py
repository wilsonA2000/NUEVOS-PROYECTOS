"""
Generador de PDF Profesional para Contratos de Arrendamiento
Genera PDFs con diseño profesional notarial, marcos dorados, códigos QR y marca de agua de la Diosa Temis
Incluye las 34 cláusulas completas según legislación colombiana (Ley 820 de 2003)

Características:
- Sincronización completa de datos del formulario (landlord_data, tenant_data, property_data)
- Formateo de fechas en español
- Diseño notarial con bordes de laurel y silueta de la Diosa Temis
- Número de páginas dinámico
"""

import os
import io
import base64
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from decimal import Decimal

from django.conf import settings
from django.template.loader import render_to_string
from django.utils import timezone
from django.core.files.base import ContentFile

# Importar modelos de cláusulas editables (Sistema Control Molecular)
try:
    from .clause_models import EditableContractClause, ContractTypeTemplate
    EDITABLE_CLAUSES_AVAILABLE = True
except ImportError:
    EDITABLE_CLAUSES_AVAILABLE = False

# Importar librerías para PDF
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch, cm, mm
    from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_RIGHT, TA_LEFT
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        PageBreak, Image, KeepTogether, Frame, PageTemplate,
        BaseDocTemplate, Flowable, NextPageTemplate, FrameBreak
    )
    from reportlab.pdfgen import canvas
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.graphics.shapes import Drawing, Circle, Line, Polygon
    from reportlab.graphics import renderPDF
except ImportError:
    raise ImportError("reportlab es requerido. Instalar con: pip install reportlab")

try:
    import qrcode
    from PIL import Image as PILImage
except ImportError:
    raise ImportError("qrcode y Pillow son requeridos. Instalar con: pip install qrcode pillow")


# Meses en español para formateo de fechas
MESES_ES = {
    1: 'enero', 2: 'febrero', 3: 'marzo', 4: 'abril',
    5: 'mayo', 6: 'junio', 7: 'julio', 8: 'agosto',
    9: 'septiembre', 10: 'octubre', 11: 'noviembre', 12: 'diciembre'
}


def formato_fecha_es(fecha):
    """Formatear fecha en español: '07 de diciembre de 2025'"""
    if fecha is None:
        return '[Fecha por definir]'
    return f"{fecha.day} de {MESES_ES.get(fecha.month, '')} de {fecha.year}"


class NotarialTemisWatermark(Flowable):
    """Marca de agua notarial con silueta de la diosa Temis"""
    
    def __init__(self, width=300, height=400):
        Flowable.__init__(self)
        self.width = width
        self.height = height
    
    def draw(self):
        """Dibujar marca de agua con silueta de la diosa Temis y balanza de la justicia"""
        self.canv.saveState()
        
        # Color muy tenue para marca de agua
        watermark_color = colors.HexColor('#f8fafc')
        self.canv.setFillColor(watermark_color)
        self.canv.setStrokeColor(colors.HexColor('#f1f5f9'))
        self.canv.setLineWidth(0.5)
        
        # === SILUETA DE LA DIOSA TEMIS ===
        center_x, center_y = 150, 250
        
        # Cabeza (círculo)
        head_radius = 15
        self.canv.circle(center_x, center_y + 100, head_radius, fill=1, stroke=0)
        
        # Cuerpo (túnica griega - simplificada con rectángulos)
        # Torso superior
        self.canv.rect(center_x - 12, center_y + 40, 24, 45, fill=1, stroke=0)
        
        # Falda de la túnica (más amplia)
        self.canv.rect(center_x - 35, center_y - 20, 70, 60, fill=1, stroke=0)
        
        # === BALANZA DE LA JUSTICIA ===
        # Brazo izquierdo sosteniendo balanza
        arm_left_x = center_x - 25
        arm_left_y = center_y + 70
        
        # Brazo (línea)
        self.canv.line(center_x - 10, center_y + 80, arm_left_x, arm_left_y)
        
        # Base de la balanza (línea horizontal)
        balance_width = 40
        balance_y = arm_left_y
        self.canv.setLineWidth(1.5)
        self.canv.line(arm_left_x - balance_width//2, balance_y, arm_left_x + balance_width//2, balance_y)
        
        # Platos de la balanza (pequeños semicírculos)
        plate_radius = 8
        # Plato izquierdo
        self.canv.circle(arm_left_x - balance_width//2, balance_y - 5, plate_radius, fill=1, stroke=0)
        # Plato derecho
        self.canv.circle(arm_left_x + balance_width//2, balance_y - 5, plate_radius, fill=1, stroke=0)
        
        # Cadenas de la balanza (líneas verticales)
        self.canv.setLineWidth(0.5)
        self.canv.line(arm_left_x - balance_width//2, balance_y, arm_left_x - balance_width//2, balance_y - 5)
        self.canv.line(arm_left_x + balance_width//2, balance_y, arm_left_x + balance_width//2, balance_y - 5)
        
        # Brazo derecho sosteniendo espada de la justicia
        arm_right_x = center_x + 25
        arm_right_y = center_y + 60
        self.canv.line(center_x + 10, center_y + 80, arm_right_x, arm_right_y)
        
        # Espada (línea vertical)
        sword_length = 50
        self.canv.setLineWidth(2)
        self.canv.line(arm_right_x, arm_right_y, arm_right_x, arm_right_y - sword_length)
        
        # Empuñadura de la espada (línea horizontal pequeña)
        self.canv.setLineWidth(1.5)
        self.canv.line(arm_right_x - 8, arm_right_y - 5, arm_right_x + 8, arm_right_y - 5)
        
        # === TEXTO LEGAL DECORATIVO ===
        self.canv.setFont("Times-Roman", 16)
        self.canv.setFillColor(colors.HexColor('#f1f5f9'))
        self.canv.drawCentredString(center_x, center_y - 50, "⚖")  # Símbolo de balanza Unicode
        
        self.canv.setFont("Times-Roman", 12)
        self.canv.drawCentredString(center_x, center_y - 70, "JUSTICIA")
        self.canv.drawCentredString(center_x, center_y - 85, "VERDAD")
        self.canv.drawCentredString(center_x, center_y - 100, "LEY")
        
        # === BRANDING VERIHOME ===
        self.canv.setFont("Times-Bold", 18)
        self.canv.setFillColor(colors.HexColor('#f8fafc'))
        self.canv.drawCentredString(center_x, center_y - 130, "VeriHome")
        self.canv.setFont("Times-Roman", 10)
        self.canv.drawCentredString(center_x, center_y - 145, "Plataforma Digital Inmobiliaria")
        
        self.canv.restoreState()


class ProfessionalPageTemplate(PageTemplate):
    """Template de página profesional con marcos azules y códigos QR"""
    
    def __init__(self, id, contract_number, **kwargs):
        self.contract_number = contract_number
        frames = [Frame(
            54, 54,  # x, y (0.75 inch margins optimized)
            letter[0] - 108, letter[1] - 180,  # width, height optimized
            leftPadding=0, bottomPadding=0, rightPadding=0, topPadding=0
        )]
        super().__init__(id, frames, **kwargs)
    
    def beforeDrawPage(self, canvas, doc):
        """Dibujar elementos antes del contenido de la página"""
        # Marco azul profesional
        self._draw_professional_frame(canvas)
        
        # Header con nombre de la firma
        self._draw_header(canvas)
        
        # Códigos QR en las 4 esquinas
        self._draw_corner_qr_codes(canvas)
        
        # Marca de agua
        self._draw_watermark(canvas)
        
        # Número de página
        self._draw_page_number(canvas, doc)
    
    def _draw_professional_frame(self, canvas):
        """Dibujar marco notarial solemne con bordes de laurel"""
        canvas.saveState()
        
        # === FONDO PERGAMINO SUTIL ===
        canvas.setFillColor(colors.HexColor('#FFFEF5'))  # Color crema muy sutil
        canvas.rect(0, 0, letter[0], letter[1], fill=1, stroke=0)
        
        # === MARCO PRINCIPAL CON BORDES DE LAUREL ===
        # Marco exterior principal (más grueso)
        canvas.setStrokeColor(colors.HexColor('#8B4513'))  # Color dorado oscuro tipo bronce
        canvas.setLineWidth(4)
        canvas.rect(20, 20, letter[0] - 40, letter[1] - 40, fill=0, stroke=1)
        
        # Marco interior ornamental
        canvas.setStrokeColor(colors.HexColor('#DAA520'))  # Color dorado
        canvas.setLineWidth(2)  
        canvas.rect(30, 30, letter[0] - 60, letter[1] - 60, fill=0, stroke=1)
        
        # === BORDES DE LAUREL ORNAMENTALES ===
        self._draw_laurel_borders(canvas)
        
        # === DECORACIONES NOTARIALES EN ESQUINAS ===
        self._draw_notarial_corner_decorations(canvas)
        
        canvas.restoreState()
    
    def _draw_corner_decorations(self, canvas):
        """Dibujar decoraciones en las esquinas"""
        corner_size = 20
        # Esquina superior izquierda
        canvas.line(27, letter[1] - 27 - corner_size, 27 + corner_size, letter[1] - 27)
        # Esquina superior derecha  
        canvas.line(letter[0] - 27, letter[1] - 27 - corner_size, letter[0] - 27 - corner_size, letter[1] - 27)
        # Esquina inferior izquierda
        canvas.line(27, 27 + corner_size, 27 + corner_size, 27)
        # Esquina inferior derecha
        canvas.line(letter[0] - 27, 27 + corner_size, letter[0] - 27 - corner_size, 27)
    
    def _draw_laurel_borders(self, canvas):
        """Dibujar bordes ornamentales de laurel usando patrones de texto"""
        canvas.saveState()
        
        # Color dorado para los laureles
        canvas.setFillColor(colors.HexColor('#DAA520'))
        canvas.setFont("Times-Roman", 8)
        
        # === BORDE SUPERIOR ===
        laurel_pattern = "❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦"
        try:
            # Intento con caracteres Unicode de laurel
            canvas.drawCentredString(letter[0]/2, letter[1] - 15, laurel_pattern[:80])
        except:
            # Fallback con caracteres simples
            simple_pattern = "* ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~"
            canvas.drawCentredString(letter[0]/2, letter[1] - 15, simple_pattern[:80])
        
        # === BORDE INFERIOR ===
        try:
            canvas.drawCentredString(letter[0]/2, 10, laurel_pattern[:80])
        except:
            canvas.drawCentredString(letter[0]/2, 10, simple_pattern[:80])
        
        # === BORDES LATERALES (VERTICALES) ===
        canvas.rotate(90)  # Rotar para texto vertical
        
        # Borde izquierdo (rotado)
        lateral_pattern = "❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦ ⚘ ❦"
        try:
            canvas.drawCentredString(letter[1]/2, -8, lateral_pattern[:60])
        except:
            simple_lateral = "* ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~ * ~"
            canvas.drawCentredString(letter[1]/2, -8, simple_lateral[:60])
        
        canvas.rotate(-180)  # Rotar al otro lado
        
        # Borde derecho (rotado al revés)
        try:
            canvas.drawCentredString(-letter[1]/2, letter[0] - 8, lateral_pattern[:60])
        except:
            canvas.drawCentredString(-letter[1]/2, letter[0] - 8, simple_lateral[:60])
        
        canvas.restoreState()
    
    def _draw_notarial_corner_decorations(self, canvas):
        """Dibujar decoraciones notariales clásicas en las esquinas"""
        canvas.saveState()
        
        # Color dorado clásico
        canvas.setStrokeColor(colors.HexColor('#DAA520'))
        canvas.setFillColor(colors.HexColor('#DAA520'))
        canvas.setLineWidth(1)
        
        corner_size = 25
        
        # === ESQUINA SUPERIOR IZQUIERDA ===
        # Roseta ornamental
        center_x, center_y = 35, letter[1] - 35
        # Círculo central
        canvas.circle(center_x, center_y, 5, fill=1, stroke=0)
        # Pétalos (líneas radiales)
        for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
            import math
            rad = math.radians(angle)
            start_x = center_x + 6 * math.cos(rad)
            start_y = center_y + 6 * math.sin(rad)
            end_x = center_x + 12 * math.cos(rad)
            end_y = center_y + 12 * math.sin(rad)
            canvas.line(start_x, start_y, end_x, end_y)
        
        # === ESQUINA SUPERIOR DERECHA ===
        center_x, center_y = letter[0] - 35, letter[1] - 35
        canvas.circle(center_x, center_y, 5, fill=1, stroke=0)
        for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
            import math
            rad = math.radians(angle)
            start_x = center_x + 6 * math.cos(rad)
            start_y = center_y + 6 * math.sin(rad)
            end_x = center_x + 12 * math.cos(rad)
            end_y = center_y + 12 * math.sin(rad)
            canvas.line(start_x, start_y, end_x, end_y)
        
        # === ESQUINA INFERIOR IZQUIERDA ===
        center_x, center_y = 35, 35
        canvas.circle(center_x, center_y, 5, fill=1, stroke=0)
        for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
            import math
            rad = math.radians(angle)
            start_x = center_x + 6 * math.cos(rad)
            start_y = center_y + 6 * math.sin(rad)
            end_x = center_x + 12 * math.cos(rad)
            end_y = center_y + 12 * math.sin(rad)
            canvas.line(start_x, start_y, end_x, end_y)
        
        # === ESQUINA INFERIOR DERECHA ===
        center_x, center_y = letter[0] - 35, 35
        canvas.circle(center_x, center_y, 5, fill=1, stroke=0)
        for angle in [0, 45, 90, 135, 180, 225, 270, 315]:
            import math
            rad = math.radians(angle)
            start_x = center_x + 6 * math.cos(rad)
            start_y = center_y + 6 * math.sin(rad)
            end_x = center_x + 12 * math.cos(rad)
            end_y = center_y + 12 * math.sin(rad)
            canvas.line(start_x, start_y, end_x, end_y)
        
        canvas.restoreState()
    
    def _draw_header(self, canvas):
        """Dibujar header profesional dinámico según tipo de contrato"""
        canvas.saveState()
        
        # Determinar el header según el tipo de contrato
        header_text = self._get_dynamic_header()
        
        # Fondo del header
        canvas.setFillColor(colors.HexColor('#1565C0'))  # Azul oscuro profesional
        canvas.rect(45, letter[1] - 120, letter[0] - 90, 60, fill=1, stroke=0)
        
        # Texto del header dinámico
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 12)
        canvas.drawCentredString(letter[0]/2, letter[1] - 85, header_text)
        canvas.setFont("Helvetica", 8)
        canvas.drawCentredString(letter[0]/2, letter[1] - 100, "WILSON ARGUELLO - ABOGADOS CONSULTORES INMOBILIARIOS")
        
        canvas.restoreState()
    
    def _get_dynamic_header(self):
        """Obtener header dinámico según tipo de contrato"""
        try:
            # Usar el generador PDF si está disponible
            if hasattr(self, 'pdf_generator') and self.pdf_generator:
                property_data = self.pdf_generator._get_property_data(self.pdf_generator._current_contract)
                property_type = property_data.get('type', '').lower()
                
                # Detectar si es comercial o de vivienda
                if any(word in property_type for word in ['comercial', 'oficina', 'local', 'negocio', 'commercial']):
                    return "VeriHome - CONTRATO DE ARRENDAMIENTO COMERCIAL"
                else:
                    return "VeriHome - CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA"
            else:
                return "VeriHome - CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA"
        except:
            return "VeriHome - CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA"
    
    def _draw_corner_qr_codes(self, canvas):
        """Dibujar UN SOLO código QR en esquina inferior derecha centrado"""
        qr_size = 45
        verification_url = f"https://verihome.com/verify/{self.contract_number}"
        
        # Generar QR code
        qr_img = self._generate_mini_qr(verification_url, size=qr_size)
        
        if qr_img:
            # UN SOLO QR en esquina inferior derecha, perfectamente centrado
            qr_x = letter[0] - 45 - qr_size/2  # Centrado en su posición
            qr_y = 45 - qr_size/2  # Centrado en su posición
            canvas.drawInlineImage(qr_img, qr_x, qr_y, qr_size, qr_size)
    
    def _generate_mini_qr(self, data, size=40):
        """Generar código QR pequeño"""
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=2,
                border=1,
            )
            qr.add_data(data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Redimensionar si es necesario
            if hasattr(img, 'resize'):
                img = img.resize((size, size))
            
            # Devolver la imagen PIL directamente
            return img
        except Exception as e:
            print(f"Error generando QR: {e}")
            return None
    
    def _draw_watermark(self, canvas):
        """Dibujar marca de agua notarial con silueta de la Diosa Temis"""
        canvas.saveState()
        canvas.translate(letter[0]/2 - 150, letter[1]/2 - 150)
        
        watermark = NotarialTemisWatermark()
        watermark.canv = canvas
        watermark.draw()
        
        canvas.restoreState()
    
    def _draw_page_number(self, canvas, doc):
        """Dibujar número de página profesional con conteo dinámico"""
        canvas.saveState()
        canvas.setFont('Helvetica-Bold', 10)
        canvas.setFillColor(colors.HexColor('#1565C0'))

        page_num = canvas.getPageNumber()
        # Usar el número real de páginas del documento
        # Note: doc.page es el contador actual durante la construcción
        total_pages = getattr(doc, '_total_pages', page_num)
        text = f"Página {page_num}"

        # Agregar fondo blanco semitransparente para legibilidad
        canvas.setFillColor(colors.white)
        canvas.rect(letter[0]/2 - 40, 35, 80, 15, fill=1, stroke=0)

        # Dibujar numeración más arriba para evitar superposición (y=42 en lugar de y=25)
        canvas.setFillColor(colors.HexColor('#1565C0'))
        canvas.drawCentredString(letter[0]/2, 42, text)
        canvas.restoreState()


class ContractPDFGenerator:
    """
    Generador de PDF profesional para contratos de arrendamiento
    Genera documentos de 10 páginas con diseño profesional y todas las cláusulas legales
    """
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._register_fonts()
        self._setup_custom_styles()
        
    def _register_fonts(self):
        """Registrar fuentes profesionales con Helvetica-Narrow como prioridad"""
        try:
            # Intentar usar Helvetica-Narrow si está disponible
            # Si no, se usará Helvetica por defecto (siempre disponible en ReportLab)
            font_dir = os.path.join(settings.BASE_DIR, 'static', 'fonts')
            if os.path.exists(font_dir):
                # Registrar fuentes si existen
                for font_file in ['HelveticaNeue-Thin.ttf', 'Helvetica-Narrow.ttf']:
                    font_path = os.path.join(font_dir, font_file)
                    if os.path.exists(font_path):
                        font_name = font_file.replace('.ttf', '')
                        pdfmetrics.registerFont(TTFont(font_name, font_path))
        except Exception:
            # Si no se pueden registrar fuentes personalizadas, usar Helvetica (siempre disponible)
            pass
        
        # Asegurar que tenemos una fuente profesional disponible
        self.professional_font = 'Helvetica-Narrow' if self._font_available('Helvetica-Narrow') else 'Helvetica'
    
    def _font_available(self, font_name):
        """Verificar si una fuente está disponible"""
        try:
            from reportlab.pdfbase import pdfmetrics
            pdfmetrics.getFont(font_name)
            return True
        except:
            return False
    
    def _setup_custom_styles(self):
        """Configurar estilos personalizados para el PDF"""
        # Estilo para título principal
        self.styles.add(ParagraphStyle(
            name='ContractTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1e293b'),
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        # Estilo para subtítulos
        self.styles.add(ParagraphStyle(
            name='ContractSubtitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#334155'),
            spaceBefore=15,
            spaceAfter=10,
            fontName='Helvetica-Bold'
        ))
        
        # Estilo para texto normal justificado
        self.styles.add(ParagraphStyle(
            name='ContractNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
            leading=14,
            fontName=self.professional_font
        ))
        
        # Estilo para cláusulas
        self.styles.add(ParagraphStyle(
            name='ContractClause',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_JUSTIFY,
            leftIndent=20,
            spaceAfter=6,
            leading=13,
            fontName=self.professional_font
        ))
        
        # Estilo para información importante
        self.styles.add(ParagraphStyle(
            name='ContractImportant',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#dc2626'),
            fontName='Helvetica-Bold',
            spaceAfter=8
        ))
        
        # Estilo para footer
        self.styles.add(ParagraphStyle(
            name='ContractFooter',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.HexColor('#64748b'),
            alignment=TA_CENTER
        ))
    
    def generate_contract_pdf(self, contract, include_signatures=True, include_biometric=True):
        """
        Generar PDF profesional completo de 10 páginas con todas las cláusulas
        
        Args:
            contract: Instancia de Contract o LandlordControlledContract
            include_signatures: Incluir imágenes de firmas digitales
            include_biometric: Incluir información biométrica de verificación
            
        Returns:
            ContentFile con el PDF generado
        """
        # Crear buffer para el PDF
        buffer = io.BytesIO()
        
        # Guardar referencia del contrato para header dinámico
        self._current_contract = contract
        
        # Crear documento con template profesional
        doc = BaseDocTemplate(
            buffer,
            pagesize=letter,
            title=f"Contrato de Arrendamiento - {contract.contract_number}",
            author="WILSON ARGUELLO - ABOGADOS CONSULTORES INMOBILIARIOS",
            subject="Contrato de Arrendamiento Profesional",
            creator="VeriHome Professional PDF Generator"
        )
        
        # Configurar template profesional
        professional_template = ProfessionalPageTemplate(
            'professional',
            contract.contract_number
        )
        # Pasar referencia del generador para header dinámico
        professional_template.pdf_generator = self
        doc.addPageTemplates([professional_template])
        
        # Construir contenido completo del PDF con todas las 34 cláusulas legales
        # FIX: Se eliminaron PageBreaks fijos para evitar espacios vacíos excesivos
        # El contenido ahora fluye naturalmente entre páginas
        story = []

        # Página 1: Portada y tabla resumen
        story.extend(self._build_cover_page(contract))
        story.append(PageBreak())  # Mantener PageBreak después de portada

        # Información de las partes
        story.extend(self._build_parties_detailed_info(contract))
        # REMOVIDO: PageBreak - permite que contenido fluya naturalmente

        # Términos del contrato
        story.extend(self._build_contract_terms_detailed(contract))

        # ==========================================================================
        # SISTEMA CONTROL MOLECULAR: Intentar leer cláusulas desde BD
        # Si no hay cláusulas en BD, usar los métodos hardcodeados como fallback
        # ==========================================================================
        db_clauses_story = self._build_legal_clauses_from_db(contract)

        if db_clauses_story:
            # Usar cláusulas de base de datos (Sistema Control Molecular activo)
            story.extend(db_clauses_story)
        else:
            # Fallback: Usar cláusulas hardcodeadas (comportamiento anterior)
            # Primeras cláusulas (PRIMERA a SEXTA)
            story.extend(self._build_legal_clauses_part1(contract))
            # REMOVIDO: PageBreak - permite que contenido fluya naturalmente

            # Cláusulas principales (SÉPTIMA a DÉCIMA QUINTA)
            story.extend(self._build_legal_clauses_part2(contract))
            # REMOVIDO: PageBreak - permite que contenido fluya naturalmente

            # Cláusulas de responsabilidad y terminación (DÉCIMA SEXTA a VIGÉSIMA QUINTA)
            story.extend(self._build_legal_clauses_part3(contract))
            # REMOVIDO: PageBreak - permite que contenido fluya naturalmente

            # Cláusulas finales (VIGÉSIMA SEXTA a TRIGÉSIMA TERCERA)
            story.extend(self._build_legal_clauses_part4(contract))

        # Cláusula #34 de garantías (dinámica según tipo de garantía)
        # NOTA: La cláusula 34 siempre usa el método dinámico especial
        story.extend(self._build_dynamic_guarantee_clause_34(contract))

        story.append(PageBreak())  # Mantener PageBreak antes de firmas

        # Página final: Firmas y verificación biométrica
        story.extend(self._build_signatures_section_professional(contract, include_signatures, include_biometric))
        story.extend(self._build_verification_section_professional(contract))
        
        # Construir PDF con template profesional
        doc.build(story)
        
        # Obtener PDF generado
        pdf_value = buffer.getvalue()
        buffer.close()
        
        # Limpiar referencia temporal
        self._current_contract = None
        
        return ContentFile(pdf_value, name=f"contrato_{contract.contract_number}.pdf")
    
    def _build_cover_page(self, contract):
        """Construir página de portada profesional con tabla resumen"""
        story = []
        
        # Espaciado inicial para acomodar el header
        story.append(Spacer(1, 0.2*inch))
        
        # Título dinámico del contrato según tipo de propiedad
        contract_title = self._get_contract_title(contract)
        story.append(Paragraph(
            contract_title,
            self.styles['ContractTitle']
        ))
        
        # Número de contrato y fecha
        story.append(Paragraph(
            f"Contrato No. {contract.contract_number}",
            self.styles['ContractSubtitle']
        ))
        
        story.append(Paragraph(
            f"Bogotá D.C., {formato_fecha_es(contract.created_at)}",
            self.styles['ContractNormal']
        ))
        
        story.append(Spacer(1, 0.15*inch))
        
        # Tabla resumen con datos clave del contrato
        story.append(Paragraph("RESUMEN EJECUTIVO DEL CONTRATO", self.styles['ContractSubtitle']))
        
        # Obtener datos usando helpers
        landlord_data = self._get_landlord_data(contract)
        tenant_data = self._get_tenant_data(contract)
        property_data = self._get_property_data(contract)
        contract_terms = self._get_contract_terms(contract)
        
        # Calcular fecha de inicio y vencimiento
        start_date = getattr(contract, 'start_date', None)
        if not start_date:
            # Intentar obtener de contract_terms
            start_date_str = contract_terms.get('start_date', '')
            if start_date_str:
                try:
                    start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
                except (ValueError, TypeError):
                    start_date = datetime.now()
            else:
                start_date = datetime.now()

        # Calcular fecha de vencimiento automáticamente basado en duración
        duration_months = contract_terms.get('contract_duration_months', 12)
        end_date = getattr(contract, 'end_date', None)
        if not end_date:
            # Calcular automáticamente: start_date + duration_months
            from dateutil.relativedelta import relativedelta
            end_date = start_date + relativedelta(months=duration_months)

        # Datos para la tabla resumen
        summary_data = [
            ['CONCEPTO', 'DETALLE'],
            ['Arrendador:', landlord_data.get('full_name', 'Por definir')],
            ['Arrendatario:', tenant_data.get('full_name', 'Por definir') if tenant_data else 'Por definir'],
            ['Inmueble:', property_data.get('address', 'Dirección no especificada')],
            ['Tipo de Inmueble:', property_data.get('type', 'No especificado')],
            ['Canon Mensual:', self._format_currency(contract_terms.get('monthly_rent', 0))],
            ['Depósito de Garantía:', self._format_currency(contract_terms.get('security_deposit', 0))],
            ['Duración:', f"{duration_months} meses"],
            ['Fecha de Inicio:', start_date.strftime('%d/%m/%Y') if isinstance(start_date, datetime) else start_date],
            ['Fecha de Vencimiento:', end_date.strftime('%d/%m/%Y') if isinstance(end_date, datetime) else end_date],
            ['Estado:', 'ACTIVO' if getattr(contract, 'status', '') == 'ACTIVE' else 'PENDIENTE'],
        ]
        
        # Usar Paragraph para texto largo que pueda necesitar wrap
        from reportlab.platypus import Paragraph as Para
        summary_data_wrapped = []
        for row in summary_data:
            wrapped_row = []
            for cell in row:
                if isinstance(cell, str) and len(cell) > 40:
                    # Wrap long text using Paragraph
                    wrapped_row.append(Paragraph(cell, self.styles['ContractNormal']))
                else:
                    wrapped_row.append(cell)
            summary_data_wrapped.append(wrapped_row)

        summary_table = Table(summary_data_wrapped, colWidths=[1.8*inch, 4.2*inch])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('TOPPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#f8fafc')),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
            ('WORDWRAP', (0, 0), (-1, -1), True),
        ]))
        
        story.append(summary_table)
        story.append(Spacer(1, 0.15*inch))
        
        # Texto legal introductorio
        # Construir información de expedición del documento del arrendador
        landlord_expedition_parts = []
        if landlord_data.get('document_expedition_place'):
            landlord_expedition_parts.append(f"expedida en {landlord_data.get('document_expedition_place')}")
        if landlord_data.get('document_expedition_date'):
            # Formatear fecha si es string ISO (YYYY-MM-DD)
            exp_date = landlord_data.get('document_expedition_date')
            if isinstance(exp_date, str) and len(exp_date) == 10:
                try:
                    date_obj = datetime.strptime(exp_date, '%Y-%m-%d')
                    exp_date = formato_fecha_es(date_obj)
                except Exception:
                    pass
            landlord_expedition_parts.append(f"el día {exp_date}")
        landlord_expedition_text = ", ".join(landlord_expedition_parts) if landlord_expedition_parts else ""

        # Construir información de expedición del documento del arrendatario
        tenant_expedition_parts = []
        if tenant_data and tenant_data.get('document_expedition_place'):
            tenant_expedition_parts.append(f"expedida en {tenant_data.get('document_expedition_place')}")
        if tenant_data and tenant_data.get('document_expedition_date'):
            # Formatear fecha si es string ISO (YYYY-MM-DD)
            exp_date_tenant = tenant_data.get('document_expedition_date')
            if isinstance(exp_date_tenant, str) and len(exp_date_tenant) == 10:
                try:
                    date_obj = datetime.strptime(exp_date_tenant, '%Y-%m-%d')
                    exp_date_tenant = formato_fecha_es(date_obj)
                except Exception:
                    pass
            tenant_expedition_parts.append(f"el día {exp_date_tenant}")
        tenant_expedition_text = ", ".join(tenant_expedition_parts) if tenant_expedition_parts else ""

        intro_text = """
        Entre los suscritos, a saber: <b>{landlord_name}</b>, mayor de edad, identificado con
        {landlord_doc_type} número {landlord_doc_number}{landlord_expedition}, quien obra en calidad de <b>ARRENDADOR</b>,
        y <b>{tenant_name}</b>, mayor de edad, identificado con {tenant_doc_type} número {tenant_doc_number}{tenant_expedition},
        quien obra en calidad de <b>ARRENDATARIO</b>, hemos celebrado el presente CONTRATO DE ARRENDAMIENTO
        DE VIVIENDA URBANA, que se regirá por las siguientes cláusulas y las disposiciones legales vigentes,
        especialmente la Ley 820 de 2003.
        """.format(
            landlord_name=landlord_data.get('full_name', '[ARRENDADOR]'),
            landlord_doc_type=landlord_data.get('document_type', 'CC'),
            landlord_doc_number=landlord_data.get('document_number', '[NÚMERO]'),
            landlord_expedition=f" ({landlord_expedition_text})" if landlord_expedition_text else "",
            tenant_name=tenant_data.get('full_name', '[ARRENDATARIO]') if tenant_data else '[ARRENDATARIO]',
            tenant_doc_type=tenant_data.get('document_type', 'CC') if tenant_data else 'CC',
            tenant_doc_number=tenant_data.get('document_number', '[NÚMERO]') if tenant_data else '[NÚMERO]',
            tenant_expedition=f" ({tenant_expedition_text})" if tenant_expedition_text else ""
        )
        
        story.append(Paragraph(intro_text, self.styles['ContractNormal']))
        
        return story
    
    def _build_parties_detailed_info(self, contract):
        """Construir información detallada de las partes"""
        story = []

        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph("INFORMACIÓN DETALLADA DE LAS PARTES", self.styles['ContractTitle']))
        
        # Obtener datos
        landlord_data = self._get_landlord_data(contract)
        tenant_data = self._get_tenant_data(contract)
        
        # Información del Arrendador
        story.append(Paragraph("EL ARRENDADOR", self.styles['ContractSubtitle']))
        
        # Combinar documento con lugar y fecha de expedición si están disponibles
        doc_info = f"{landlord_data.get('document_type', 'CC')} {landlord_data.get('document_number', '')}"
        expedition_info = []
        if landlord_data.get('document_expedition_place'):
            expedition_info.append(f"expedido en {landlord_data.get('document_expedition_place')}")
        if landlord_data.get('document_expedition_date'):
            # Formatear fecha si es string ISO (YYYY-MM-DD)
            exp_date = landlord_data.get('document_expedition_date')
            if isinstance(exp_date, str) and len(exp_date) == 10:
                try:
                    date_obj = datetime.strptime(exp_date, '%Y-%m-%d')
                    exp_date = formato_fecha_es(date_obj)
                except Exception:
                    pass
            expedition_info.append(f"el día {exp_date}")
        if expedition_info:
            doc_info += f", {', '.join(expedition_info)}"

        landlord_info_data = [
            ['Nombre Completo:', landlord_data.get('full_name', '')],
            ['Documento:', doc_info],
            ['Dirección de Correspondencia:', landlord_data.get('address', '')],
            ['Ciudad:', landlord_data.get('city', '')],
            ['Teléfono:', landlord_data.get('phone', '')],
            ['Correo Electrónico:', landlord_data.get('email', '')],
            ['Calidad:', 'PROPIETARIO DEL INMUEBLE'],
        ]

        # FIX: Aplicar word wrap para direcciones y emails largos
        landlord_info_wrapped = self._wrap_table_data(landlord_info_data, max_length=45)

        landlord_table = Table(landlord_info_wrapped, colWidths=[2.2*inch, 3.8*inch])
        landlord_table.setStyle(self._get_info_table_style())
        story.append(landlord_table)
        
        story.append(Spacer(1, 0.2*inch))

        # Información del Arrendatario
        story.append(Paragraph("EL ARRENDATARIO", self.styles['ContractSubtitle']))
        
        if tenant_data:
            # Combinar documento con lugar y fecha de expedición si están disponibles
            doc_type_display = tenant_data.get('document_type_display') or tenant_data.get('document_type', 'CC')
            tenant_doc_info = f"{doc_type_display} {tenant_data.get('document_number', '')}"
            tenant_expedition_info = []
            if tenant_data.get('document_expedition_place'):
                tenant_expedition_info.append(f"expedido en {tenant_data.get('document_expedition_place')}")
            if tenant_data.get('document_expedition_date'):
                tenant_expedition_info.append(f"el {tenant_data.get('document_expedition_date')}")
            if tenant_expedition_info:
                tenant_doc_info += f", {', '.join(tenant_expedition_info)}"

            # Construir dirección completa
            address_parts = [tenant_data.get('current_address', '')]
            if tenant_data.get('city'):
                address_parts.append(tenant_data.get('city'))
            if tenant_data.get('department'):
                address_parts.append(tenant_data.get('department'))
            if tenant_data.get('country') and tenant_data.get('country') != 'Colombia':
                address_parts.append(tenant_data.get('country'))
            full_address = ', '.join([p for p in address_parts if p])

            tenant_info_data = [
                ['Nombre Completo:', tenant_data.get('full_name', '')],
                ['Documento:', tenant_doc_info],
                ['Dirección Residencia:', full_address or 'Pendiente'],
                ['Ciudad:', tenant_data.get('city', '') or 'Pendiente'],
                ['Teléfono:', tenant_data.get('phone', '')],
                ['Email:', tenant_data.get('email', '')],
            ]

            # Agregar información laboral si está disponible
            if tenant_data.get('company_name') or tenant_data.get('position'):
                employment_type = tenant_data.get('employment_type', 'employee')
                employment_display = {
                    'employee': 'Empleado',
                    'self_employed': 'Independiente',
                    'business_owner': 'Empresario',
                    'retired': 'Pensionado',
                    'student': 'Estudiante',
                    'unemployed': 'Desempleado'
                }.get(employment_type, employment_type)

                work_info = []
                if tenant_data.get('position'):
                    work_info.append(tenant_data.get('position'))
                if tenant_data.get('company_name'):
                    work_info.append(f"en {tenant_data.get('company_name')}")

                tenant_info_data.append(['Ocupación:', f"{employment_display} - {' '.join(work_info)}" if work_info else employment_display])

                if tenant_data.get('monthly_income'):
                    tenant_info_data.append(['Ingresos Mensuales:', self._format_currency(tenant_data.get('monthly_income', 0))])

            # Agregar contacto de emergencia si está disponible
            if tenant_data.get('emergency_contact_name') or tenant_data.get('emergency_contact_phone'):
                emergency_info = tenant_data.get('emergency_contact_name', '')
                if tenant_data.get('emergency_contact_relationship'):
                    emergency_info += f" ({tenant_data.get('emergency_contact_relationship')})"
                if tenant_data.get('emergency_contact_phone'):
                    emergency_info += f" - Tel: {tenant_data.get('emergency_contact_phone')}"
                tenant_info_data.append(['Contacto de Emergencia:', emergency_info])
        else:
            tenant_info_data = [
                ['Nombre Completo:', 'Pendiente de asignación'],
                ['Documento:', 'Pendiente'],
                ['Dirección Residencia:', 'Pendiente'],
                ['Ciudad:', 'Pendiente'],
                ['Teléfono:', 'Pendiente'],
                ['Email:', 'Pendiente'],
            ]

        # FIX: Aplicar word wrap para direcciones y textos largos del arrendatario
        tenant_info_wrapped = self._wrap_table_data(tenant_info_data, max_length=45)

        tenant_table = Table(tenant_info_wrapped, colWidths=[2.2*inch, 3.8*inch])
        tenant_table.setStyle(self._get_info_table_style())
        story.append(tenant_table)

        story.append(Spacer(1, 0.2*inch))

        # Información del Inmueble
        story.append(Paragraph("INFORMACIÓN DEL INMUEBLE", self.styles['ContractSubtitle']))

        property_data = self._get_property_data(contract)
        contract_terms = self._get_contract_terms(contract)

        # Formatear política de huéspedes - IMPORTANTE: Leer de contract_terms directamente del contrato
        raw_guests_policy = contract_terms.get('guests_policy', 'limited')
        guests_policy_display = {
            'no_guests': 'NO SE PERMITEN',
            'limited': 'LIMITADO (máximo 3 noches)',
            'no_overnight': 'SIN PERNOCTA (solo visitas diurnas)',
            'unlimited': 'SIN RESTRICCIONES',
        }.get(raw_guests_policy, f'{raw_guests_policy.upper() if raw_guests_policy else "LIMITADO"}')

        property_info_data = [
            ['Dirección Completa:', property_data.get('address', 'No especificada')],
            ['Tipo de Inmueble:', property_data.get('type', 'No especificado')],
            ['Área Total:', f"{property_data.get('area', '')} m²" if property_data.get('area') else 'No especificada'],
            ['Estrato Socioeconómico:', property_data.get('stratum', 'No especificado')],
            ['Número de Habitaciones:', property_data.get('rooms', 'No especificado')],
            ['Número de Baños:', property_data.get('bathrooms', 'No especificado')],
            ['Parqueaderos:', property_data.get('parking_spaces', '0')],
            ['Estado del Mobiliario:', 'AMOBLADO' if property_data.get('furnished') else 'SIN AMOBLAR'],
            ['Uso Autorizado:', 'VIVIENDA FAMILIAR'],
            # Políticas del inmueble (digitadas por el arrendador)
            ['Máximo de Ocupantes:', str(contract_terms.get('max_occupants', 4))],
            ['Mascotas Permitidas:', 'SÍ' if contract_terms.get('pets_allowed') else 'NO'],
            ['Fumar Permitido:', 'SÍ' if contract_terms.get('smoking_allowed') else 'NO'],
            ['Política de Huéspedes:', guests_policy_display],
        ]

        # FIX: Aplicar word wrap para direcciones largas que se salen de la tabla
        property_info_wrapped = self._wrap_table_data(property_info_data, max_length=45)

        property_table = Table(property_info_wrapped, colWidths=[2.2*inch, 3.8*inch])
        property_table.setStyle(self._get_info_table_style())
        story.append(property_table)

        return story

    def _get_info_table_style(self):
        """Estilo para tablas de información"""
        return TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8fafc')),
        ])

    def _wrap_table_data(self, table_data, max_length=50):
        """Wrap largo texto en celdas de tabla usando Paragraph para evitar overflow.

        CRITICAL: Este método previene que el texto se salga de las celdas de las tablas.
        Convierte strings largos en objetos Paragraph que permiten word wrap.
        """
        wrapped_data = []
        for row in table_data:
            wrapped_row = []
            for cell in row:
                if isinstance(cell, str) and len(cell) > max_length:
                    # Wrap long text using Paragraph con estilo que permite wrapping
                    wrapped_row.append(Paragraph(cell, self.styles['ContractNormal']))
                else:
                    wrapped_row.append(cell)
            wrapped_data.append(wrapped_row)
        return wrapped_data
    
    def _build_contract_terms_detailed(self, contract):
        """Construir términos detallados del contrato"""
        story = []
        
        story.append(Spacer(1, 0.15*inch))
        story.append(Paragraph("TÉRMINOS ECONÓMICOS Y DE DURACIÓN", self.styles['ContractTitle']))
        
        contract_terms = self._get_contract_terms(contract)
        
        # Términos económicos detallados
        economic_data = [
            ['CONCEPTO', 'VALOR', 'OBSERVACIONES'],
            ['Canon de Arrendamiento Mensual', 
             self._format_currency(contract_terms.get('monthly_rent', 0)),
             'Pagadero por anticipado'],
            ['Depósito de Garantía', 
             self._format_currency(contract_terms.get('security_deposit', 0)),
             f"{contract_terms.get('security_deposit', 0) / contract_terms.get('monthly_rent', 1):.1f} meses de canon"],
            ['Día Límite de Pago', 
             f"Día {contract_terms.get('payment_day', 5)} de cada mes",
             'Calendario colombiano'],
            ['Incremento Anual', 
             'Según IPC certificado por DANE',
             'Ley 820 de 2003'],
        ]
        
        economic_table = Table(economic_data, colWidths=[2.2*inch, 2.2*inch, 2.1*inch])
        economic_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        story.append(economic_table)
        story.append(Spacer(1, 0.3*inch))

        return story

    def _calculate_end_date(self, contract, contract_terms):
        """Calcular fecha de vencimiento basada en start_date + duration_months"""
        try:
            from dateutil.relativedelta import relativedelta

            # Obtener fecha de inicio
            start_date = getattr(contract, 'start_date', None)
            if not start_date:
                start_date = datetime.now()

            # Obtener duración en meses
            duration_months = contract_terms.get('contract_duration_months', 12)

            # Calcular fecha de vencimiento
            end_date = start_date + relativedelta(months=duration_months)
            return end_date
        except Exception:
            # Fallback: usar end_date del contrato o fecha actual
            return getattr(contract, 'end_date', None) or datetime.now()

    def _build_legal_clauses_part1(self, contract):
        """Construir primeras cláusulas legales (PRIMERA a SEXTA)"""
        story = []
        
        story.append(Paragraph("CLÁUSULAS DEL CONTRATO", self.styles['ContractTitle']))
        
        # Obtener datos necesarios
        property_data = self._get_property_data(contract)
        contract_terms = self._get_contract_terms(contract)
        
        clauses_part1 = [
            {
                'number': 'PRIMERA',
                'title': 'OBJETO',
                'content': f"""El ARRENDADOR entrega al ARRENDATARIO, y éste recibe a su entera 
                satisfacción, el inmueble ubicado en {property_data.get('address', '[DIRECCIÓN]')}, 
                para destinarlo exclusivamente a vivienda familiar, en las condiciones que se 
                establecen en el presente contrato."""
            },
            {
                'number': 'SEGUNDA',
                'title': 'DESTINACIÓN',
                'content': """El inmueble objeto del presente contrato será destinado exclusivamente 
                para vivienda del ARRENDATARIO y su núcleo familiar. Queda expresamente prohibido 
                darle un uso diferente, comercial, industrial o profesional, subarrendar total o 
                parcialmente, o ceder el contrato sin autorización previa y escrita del ARRENDADOR."""
            },
            {
                'number': 'TERCERA',
                'title': 'PRECIO',
                'content': f"""El ARRENDATARIO pagará al ARRENDADOR por concepto de canon de 
                arrendamiento la suma de {self._format_currency(contract_terms.get('monthly_rent', 0))} 
                mensuales, pagaderos por anticipado dentro de los primeros 
                {contract_terms.get('payment_day', 5)} días de cada mes, en el domicilio del 
                ARRENDADOR o donde éste indique por escrito."""
            },
            {
                'number': 'CUARTA',
                'title': 'REAJUSTE',
                'content': """El canon de arrendamiento podrá ser incrementado anualmente en un 
                porcentaje que no exceda el 100% del IPC certificado por el DANE para el año 
                inmediatamente anterior, de conformidad con lo establecido en el artículo 20 de la 
                Ley 820 de 2003."""
            },
            {
                'number': 'QUINTA',
                'title': 'ENTREGA',
                'content': """El ARRENDADOR hace entrega del inmueble al ARRENDATARIO en perfectas 
                condiciones de aseo, funcionamiento de servicios públicos, instalaciones y 
                elementos que lo conforman. El ARRENDATARIO declara recibir el inmueble a su entera 
                satisfacción, comprometiéndose a mantenerlo en igual estado."""
            },
            {
                'number': 'SEXTA',
                'title': 'TÉRMINO',
                'content': f"""El presente contrato tendrá una duración de
                {contract_terms.get('contract_duration_months', 12)} meses, contados a partir del
                {formato_fecha_es(getattr(contract, 'start_date', None) or datetime.now())},
                y vencerá el {formato_fecha_es(self._calculate_end_date(contract, contract_terms))}.
                El contrato se prorrogará automáticamente por períodos iguales, salvo que alguna de las
                partes manifieste su intención de terminarlo con una antelación mínima de tres (3) meses."""
            },
            {
                'number': 'SÉPTIMA',
                'title': 'DEPÓSITO DE GARANTÍA (Art. 9, Ley 820 de 2003)',
                'content': f"""EL ARRENDATARIO entrega en este acto a EL ARRENDADOR, a título de depósito
                de garantía, la suma de {self._number_to_words(contract_terms.get('security_deposit', 0))}
                ({self._format_currency(contract_terms.get('security_deposit', 0))} pesos m/cte), equivalente
                a {contract_terms.get('security_deposit', 0) / max(contract_terms.get('monthly_rent', 1), 1):.1f}
                mes(es) de canon. El depósito garantiza el cumplimiento de las obligaciones del contrato,
                incluyendo cánones insolutos, servicios públicos pendientes y daños al inmueble no imputables
                al uso normal. PARÁGRAFO PRIMERO: El depósito no podrá imputarse como canon de arrendamiento
                en ningún momento de la vigencia del contrato. PARÁGRAFO SEGUNDO: EL ARRENDADOR devolverá el
                depósito dentro de los treinta (30) días hábiles siguientes a la restitución del inmueble en
                buen estado, previa verificación del cumplimiento de todas las obligaciones del ARRENDATARIO.
                PARÁGRAFO TERCERO: En caso de incumplimiento, EL ARRENDADOR podrá aplicar el depósito a la
                satisfacción de las deudas, debiendo rendir cuentas documentadas al ARRENDATARIO."""
            },
        ]
        
        # Agregar cada cláusula
        for clause in clauses_part1:
            story.append(Paragraph(
                f"<b>CLÁUSULA {clause['number']} - {clause['title']}:</b> {clause['content']}",
                self.styles['ContractClause']
            ))
            story.append(Spacer(1, 0.15*inch))
        
        return story
    
    def _build_legal_clauses_part2(self, contract):
        """Construir cláusulas SÉPTIMA a DÉCIMA QUINTA"""
        story = []
        
        story.append(Spacer(1, 0.15*inch))
        
        clauses_part2 = [
            {
                'number': 'OCTAVA',
                'title': 'OBLIGACIONES DEL ARRENDATARIO',
                'content': """El ARRENDATARIO se obliga a: a) Pagar cumplidamente el canon de 
                arrendamiento en la fecha convenida; b) Cuidar el inmueble como un buen padre 
                de familia y mantenerlo en buen estado; c) Pagar oportunamente los servicios 
                públicos domiciliarios; d) No subarrendar total o parcialmente el inmueble; 
                e) Permitir al ARRENDADOR la inspección del inmueble en cualquier momento, previa 
                cita; f) Restituir el inmueble al terminar el contrato en las mismas condiciones 
                que lo recibió, salvo el deterioro natural por el uso legítimo."""
            },
            {
                'number': 'NOVENA',
                'title': 'OBLIGACIONES DEL ARRENDADOR',
                'content': """El ARRENDADOR se obliga a: a) Entregar el inmueble en condiciones de 
                servir para el fin convenido; b) Mantener el inmueble en condiciones de servir 
                para el fin convenido durante todo el tiempo del contrato; c) Realizar las 
                reparaciones necesarias para conservar el inmueble en buen estado, excepto 
                aquellas que por ley correspondan al ARRENDATARIO; d) No perturbar al ARRENDATARIO 
                en el uso legítimo del inmueble."""
            },
            {
                'number': 'DÉCIMA',
                'title': 'SERVICIOS PÚBLICOS',
                'content': """Los servicios públicos domiciliarios (energía eléctrica, acueducto, 
                alcantarillado, gas natural, teléfono e internet) serán por cuenta del 
                ARRENDATARIO, quien deberá cancelar oportunamente las facturas correspondientes. 
                El ARRENDATARIO se obliga a no permitir la suspensión de ningún servicio durante 
                la vigencia del contrato."""
            },
            {
                'number': 'DÉCIMA PRIMERA',
                'title': 'LÍNEA TELEFÓNICA',
                'content': """Si el inmueble cuenta con línea telefónica, el ARRENDATARIO podrá hacer 
                uso de ella, asumiendo todos los gastos que se generen. Al terminar el contrato, 
                deberá entregar la línea telefónica libre de deudas."""
            },
            {
                'number': 'DÉCIMA SEGUNDA',
                'title': 'REPARACIONES LOCATIVAS',
                'content': """Estarán a cargo del ARRENDATARIO las reparaciones locativas que según 
                la ley y la costumbre son de su responsabilidad, tales como: el mantenimiento 
                de pisos, pintura interior, enchapes, aparatos sanitarios, llaves, chapas, 
                vidrios, cerraduras y en general el mantenimiento de elementos que se deterioren 
                por el uso normal."""
            },
            {
                'number': 'DÉCIMA TERCERA',
                'title': 'REPARACIONES NECESARIAS',
                'content': """Las reparaciones necesarias para conservar el inmueble en buen estado 
                que no sean locativas, serán por cuenta del ARRENDADOR. El ARRENDATARIO deberá 
                dar aviso inmediato al ARRENDADOR de cualquier daño o deterioro que requiera 
                reparación."""
            },
            {
                'number': 'DÉCIMA CUARTA',
                'title': 'MEJORAS Y REFORMAS',
                'content': """El ARRENDATARIO no podrá hacer mejoras, modificaciones o reformas al 
                inmueble sin autorización previa y escrita del ARRENDADOR. Las mejoras que se 
                hagan sin autorización quedarán a beneficio del inmueble sin derecho a 
                reembolso alguno."""
            },
            {
                'number': 'DÉCIMA QUINTA',
                'title': 'FIJACIÓN DE AVISOS',
                'content': """El ARRENDATARIO no podrá fijar avisos, carteles, leyendas o hacer 
                inscripciones en las paredes exteriores del inmueble, ni en las áreas comunes 
                si las hubiere, sin previa autorización escrita del ARRENDADOR."""
            },
            {
                'number': 'DÉCIMA SEXTA',
                'title': 'DEVOLUCIÓN SATISFACTORIA',
                'content': """Al término del contrato, cualquiera que sea la causa, el ARRENDATARIO 
                se obliga a restituir el inmueble en perfecto estado de aseo y conservación, 
                salvo el deterioro natural causado por el tiempo y el uso legítimo del inmueble. 
                La entrega se hará mediante acta suscrita por las partes."""
            },
        ]
        
        # Agregar cada cláusula
        for clause in clauses_part2:
            story.append(Paragraph(
                f"<b>CLÁUSULA {clause['number']} - {clause['title']}:</b> {clause['content']}",
                self.styles['ContractClause']
            ))
            story.append(Spacer(1, 0.15*inch))
        
        return story
    
    def _build_legal_clauses_part3(self, contract):
        """Construir cláusulas DÉCIMA SEXTA a VIGÉSIMA QUINTA"""
        story = []
        
        story.append(Spacer(1, 0.15*inch))
        
        clauses_part3 = [
            {
                'number': 'DÉCIMA SÉPTIMA',
                'title': 'EFECTOS DEL INCUMPLIMIENTO (Art. 16, Ley 820 de 2003)',
                'content': """El incumplimiento de cualquiera de las obligaciones contraídas por el
                ARRENDATARIO, dará derecho al ARRENDADOR para exigir, conforme al artículo 16 de la
                Ley 820 de 2003, la terminación del contrato y la restitución del inmueble, con un plazo
                de treinta (30) días para cumplir la obligación incumplida antes de proceder a la demanda.
                Lo anterior sin perjuicio de la indemnización de perjuicios a que haya lugar."""
            },
            {
                'number': 'DÉCIMA OCTAVA',
                'title': 'EXENCIÓN DE RESPONSABILIDAD',
                'content': """El ARRENDADOR no será responsable por daños o pérdidas que sufran las 
                personas o los bienes que se encuentren en el inmueble arrendado, salvo cuando 
                tales daños o pérdidas provengan de su culpa o dolo."""
            },
            {
                'number': 'DÉCIMA NOVENA',
                'title': 'EXTINCIÓN DEL DERECHO DEL PROPIETARIO',
                'content': """Si durante la vigencia del contrato el ARRENDADOR enajena el inmueble, 
                el nuevo propietario no podrá alegar extinción del derecho del ARRENDATARIO 
                durante el tiempo que falta para el vencimiento del contrato."""
            },
            {
                'number': 'VIGÉSIMA',
                'title': 'CLÁUSULA PENAL',
                'content': """En caso de incumplimiento de las obligaciones por parte del ARRENDATARIO, 
                éste pagará al ARRENDADOR, a título de cláusula penal, una suma equivalente a 
                dos (2) meses del valor del canon vigente al momento del incumplimiento, sin 
                perjuicio de las demás acciones legales."""
            },
            {
                'number': 'VIGÉSIMA PRIMERA',
                'title': 'AUTORIZACIONES',
                'content': """El ARRENDADOR se obliga a obtener y mantener vigentes todas las
                autorizaciones, licencias y permisos que sean necesarios para el uso del
                inmueble como vivienda familiar."""
            },
            {
                'number': 'VIGÉSIMA SEGUNDA',
                'title': 'ABANDONO DEL INMUEBLE',
                'content': """Se considera abandono del inmueble cuando el ARRENDATARIO no lo habite 
                por un período superior a treinta (30) días consecutivos sin causa justificada 
                y sin previo aviso al ARRENDADOR. El abandono será causal de terminación 
                inmediata del contrato."""
            },
            {
                'number': 'VIGÉSIMA TERCERA',
                'title': 'COBRO EXTRAJUDICIAL Y SERVICIOS (Art. 22, Ley 820 de 2003)',
                'content': """Para el cobro extrajudicial de las sumas adeudadas, el ARRENDADOR
                podrá acudir a centrales de riesgo crediticio y cobranza extrajudicial, previa
                comunicación al ARRENDATARIO con quince (15) días de anticipación. PARÁGRAFO PRIMERO
                (Cobro de Servicios, Art. 22 Ley 820/2003): Si el ARRENDATARIO incurriere en mora en
                el pago de los servicios públicos domiciliarios, el ARRENDADOR podrá asumir directamente
                el pago de los servicios en mora para evitar su suspensión. Las sumas pagadas por el
                ARRENDADOR se convertirán en deuda exigible al ARRENDATARIO dentro de los cinco (5) días
                hábiles siguientes a la notificación del pago. PARÁGRAFO SEGUNDO: La mora reiterada en
                el pago de servicios en dos (2) o más períodos consecutivos constituirá causal autónoma
                de terminación del contrato por parte del ARRENDADOR."""
            },
            {
                'number': 'VIGÉSIMA CUARTA',
                'title': 'DEUDORES SOLIDARIOS (Arts. 13-15, Ley 820 de 2003)',
                'content': """Los codeudores y deudores solidarios que firmen este contrato responden
                solidariamente con el ARRENDATARIO por todas las obligaciones derivadas del presente
                contrato, de conformidad con los artículos 13 a 15 de la Ley 820 de 2003. PARÁGRAFO
                PRIMERO: La solidaridad de los codeudores no se extingue por la renovación automática
                del contrato ni por sus prórrogas, y se mantiene vigente por el mismo período del
                contrato renovado. PARÁGRAFO SEGUNDO: La responsabilidad del codeudor solidario
                subsistirá por un período de seis (6) meses contados desde la terminación del contrato,
                para responder por las obligaciones pendientes que se liquiden dentro de dicho término.
                PARÁGRAFO TERCERO: Toda acción judicial o extrajudicial contra el ARRENDATARIO podrá
                extenderse simultáneamente contra los codeudores solidarios sin necesidad de beneficio
                de excusión."""
            },
            {
                'number': 'VIGÉSIMA QUINTA',
                'title': 'MÉRITO EJECUTIVO',
                'content': """Este contrato presta mérito ejecutivo para el cobro de todas las 
                obligaciones que emanen del mismo, de conformidad con lo establecido en el 
                artículo 422 del Código de Procedimiento Civil."""
            },
            {
                'number': 'VIGÉSIMA SEXTA',
                'title': 'CESIÓN Y SUBARRIENDO',
                'content': """El ARRENDATARIO no podrá ceder este contrato ni subarrendar el inmueble 
                en todo o en parte, sin autorización previa y escrita del ARRENDADOR. La 
                violación de esta cláusula será causal de terminación inmediata del contrato."""
            },
        ]
        
        # Agregar cada cláusula
        for clause in clauses_part3:
            story.append(Paragraph(
                f"<b>CLÁUSULA {clause['number']} - {clause['title']}:</b> {clause['content']}",
                self.styles['ContractClause']
            ))
            story.append(Spacer(1, 0.15*inch))
        
        return story
    
    def _build_legal_clauses_part4(self, contract):
        """Construir cláusulas finales VIGÉSIMA SEXTA a TRIGÉSIMA TERCERA"""
        story = []
        
        story.append(Spacer(1, 0.15*inch))
        
        clauses_part4 = [
            {
                'number': 'VIGÉSIMA SÉPTIMA',
                'title': 'CESIÓN POR EL ARRENDADOR',
                'content': """El ARRENDADOR podrá ceder libremente sus derechos derivados de este 
                contrato, caso en el cual deberá informar por escrito al ARRENDATARIO sobre 
                la persona del nuevo acreedor."""
            },
            {
                'number': 'VIGÉSIMA OCTAVA',
                'title': 'CAUSALES DE TERMINACIÓN POR EL ARRENDADOR (Arts. 16-17, Ley 820 de 2003)',
                'content': """El ARRENDADOR podrá dar por terminado este contrato en cualquiera de los
                siguientes casos, de conformidad con el artículo 16 de la Ley 820 de 2003: a) Falta de
                pago del canon o de los servicios públicos por más de dos (2) meses; b) Violación de
                cualquiera de las obligaciones del ARRENDATARIO consagradas en este contrato; c) Subarriendo
                total o parcial del inmueble sin autorización; d) Cambio de destinación del inmueble;
                e) Destrucción o deterioro grave del inmueble por culpa del ARRENDATARIO. PARÁGRAFO (Art. 17,
                Ley 820 de 2003): Para la terminación sin justa causa por parte del ARRENDADOR, éste deberá
                dar al ARRENDATARIO un preaviso escrito con una antelación mínima de tres (3) meses, so pena
                de indemnización equivalente a tres (3) meses de canon vigente al momento de la terminación."""
            },
            {
                'number': 'VIGÉSIMA NOVENA',
                'title': 'CAUSALES DE TERMINACIÓN POR EL ARRENDATARIO',
                'content': """El ARRENDATARIO podrá dar por terminado este contrato en cualquiera 
                de los siguientes casos: a) Cuando el ARRENDADOR no cumpla con las reparaciones 
                necesarias que le corresponden; b) Cuando sea privado o perturbado en el goce 
                del inmueble; c) Por vicios ocultos del inmueble que lo hagan inadecuado para 
                el fin del contrato."""
            },
            {
                'number': 'TRIGÉSIMA',
                'title': 'GASTOS',
                'content': """Los gastos de escrituración, registro y timbre de este contrato serán 
                por cuenta del ARRENDADOR. Los gastos de terminación del contrato, restitución 
                del inmueble y demás que se generen serán por cuenta de quien los ocasione."""
            },
            {
                'number': 'TRIGÉSIMA PRIMERA',
                'title': 'COPIA DEL CONTRATO',
                'content': """Cada una de las partes recibirá una copia de este contrato debidamente 
                firmada. Para efectos probatorios, cualquiera de las copias tendrá el mismo 
                valor legal."""
            },
            {
                'number': 'TRIGÉSIMA SEGUNDA',
                'title': 'VISITAS E INSPECCIONES',
                'content': """El ARRENDADOR tendrá derecho a inspeccionar el inmueble con una
                frecuencia máxima de una (1) vez por trimestre, previa notificación escrita al
                ARRENDATARIO con una antelación mínima de veinticuatro (24) horas. De cada visita
                de inspección se levantará un acta suscrita por ambas partes, o por testigos si
                alguna parte se niega a firmar. PARÁGRAFO: En casos de emergencia que impliquen riesgo
                para la integridad del inmueble o de sus ocupantes (incendio, inundación, daño estructural
                o similares), el ARRENDADOR podrá ingresar sin previo aviso, dejando constancia escrita
                de los hechos dentro de las veinticuatro (24) horas siguientes al ingreso."""
            },
            {
                'number': 'TRIGÉSIMA TERCERA',
                'title': 'NOTIFICACIONES',
                'content': """Todas las comunicaciones relacionadas con este contrato se harán por 
                escrito a las direcciones señaladas por las partes en este documento, o a 
                las que posteriormente se informen por escrito. También serán válidas las 
                notificaciones enviadas a los correos electrónicos registrados."""
            },
            {
                'number': 'TRIGÉSIMA CUARTA',
                'title': 'VALIDEZ',
                'content': """Este contrato reemplaza y deja sin efecto cualquier acuerdo verbal o 
                escrito anterior entre las partes sobre el mismo objeto. Las modificaciones 
                a este contrato deberán constar por escrito y ser firmadas por ambas partes. 
                Si alguna de las cláusulas de este contrato fuere declarada inexequible, 
                las demás continuarán vigentes."""
            },
        ]
        
        # Agregar cada cláusula
        for clause in clauses_part4:
            story.append(Paragraph(
                f"<b>CLÁUSULA {clause['number']} - {clause['title']}:</b> {clause['content']}",
                self.styles['ContractClause']
            ))
            story.append(Spacer(1, 0.15*inch))
        
        return story
    
    def _build_dynamic_guarantee_clause_34(self, contract):
        """Construir cláusula dinámica #34 de garantías"""
        story = []
        
        story.append(Spacer(1, 0.3*inch))
        
        # Obtener datos de garantías del contrato
        guarantee_data = self._get_guarantee_data(contract)
        guarantee_type = guarantee_data.get('guarantee_type', 'none')
        
        # Generar contenido de la cláusula según el tipo de garantía
        clause_content = self._generate_guarantee_clause_content(guarantee_type, guarantee_data)
        
        # Agregar la cláusula TRIGÉSIMA QUINTA
        story.append(Paragraph(
            f"<b>CLÁUSULA TRIGÉSIMA QUINTA - GARANTÍAS DEL CONTRATO:</b> {clause_content}",
            self.styles['ContractClause']
        ))
        
        # Si hay codeudor con datos específicos, agregar información adicional
        if guarantee_type in ['codeudor_salario', 'codeudor_finca_raiz'] and guarantee_data.get('codeudor_full_name'):
            story.extend(self._build_cosigner_details(guarantee_data))
        
        return story
    
    def _get_guarantee_data(self, contract):
        """Extraer datos de garantías del contrato incluyendo información completa del codeudor"""
        guarantee_data = {'guarantee_type': 'none'}

        # Para LandlordControlledContract - usar datos de contract_terms
        if hasattr(contract, 'contract_terms') and isinstance(contract.contract_terms, dict):
            # Verificar si hay datos de garantías en contract_terms
            # Soporta tanto 'guarantor_required' como 'guarantee_type' directamente
            has_guarantee = (
                contract.contract_terms.get('guarantor_required') or
                contract.contract_terms.get('guarantee_type') not in [None, '', 'none']
            )
            if has_guarantee:
                guarantee_data.update({
                    'guarantee_type': contract.contract_terms.get('guarantee_type', 'codeudor'),
                    'guarantee_amount': contract.contract_terms.get('guarantee_amount', 0),
                    'guarantor_required': True
                })

                # Extraer datos completos del codeudor
                codeudor_data = contract.contract_terms.get('codeudor_data', {})
                if codeudor_data:
                    guarantee_data.update({
                        # Datos personales del codeudor
                        'codeudor_full_name': codeudor_data.get('codeudor_full_name', ''),
                        'codeudor_document_type': codeudor_data.get('codeudor_document_type', ''),
                        'codeudor_document_number': codeudor_data.get('codeudor_document_number', ''),
                        'codeudor_phone': codeudor_data.get('codeudor_phone', ''),
                        'codeudor_email': codeudor_data.get('codeudor_email', ''),
                        'codeudor_address': codeudor_data.get('codeudor_address', ''),
                        'codeudor_city': codeudor_data.get('codeudor_city', ''),
                        'codeudor_department': codeudor_data.get('codeudor_department', ''),
                        'codeudor_occupation': codeudor_data.get('codeudor_occupation', ''),
                        'codeudor_monthly_income': codeudor_data.get('codeudor_monthly_income', ''),
                        'codeudor_company_name': codeudor_data.get('codeudor_company_name', ''),
                        'codeudor_company_phone': codeudor_data.get('codeudor_company_phone', ''),
                        'codeudor_relationship': codeudor_data.get('codeudor_relationship', ''),
                        'codeudor_marital_status': codeudor_data.get('codeudor_marital_status', ''),
                        'codeudor_spouse_name': codeudor_data.get('codeudor_spouse_name', ''),
                        'codeudor_spouse_document': codeudor_data.get('codeudor_spouse_document', ''),
                        'codeudor_property_address': codeudor_data.get('codeudor_property_address', ''),
                        'codeudor_property_value': codeudor_data.get('codeudor_property_value', ''),
                        'codeudor_references': codeudor_data.get('codeudor_references', []),
                        # Datos del codeudor_salario (empleador)
                        'codeudor_employer_name': codeudor_data.get('codeudor_employer', ''),
                        'codeudor_position': codeudor_data.get('codeudor_position', ''),
                        'codeudor_work_phone': codeudor_data.get('codeudor_work_phone', ''),
                        # Datos de garantía inmobiliaria (codeudor_finca_raiz)
                        'guarantee_property_matricula': codeudor_data.get('property_matricula', ''),
                        'guarantee_property_area': codeudor_data.get('property_area_guarantee', ''),
                        'guarantee_property_address': codeudor_data.get('property_address_guarantee', ''),
                        'guarantee_property_city': codeudor_data.get('property_city_guarantee', ''),
                        'guarantee_property_department': codeudor_data.get('property_department_guarantee', ''),
                        'guarantee_property_predial': codeudor_data.get('property_predial_number', ''),
                        'guarantee_property_catastral': codeudor_data.get('property_catastral_number', ''),
                        'guarantee_property_linderos': codeudor_data.get('property_linderos', ''),
                    })

        # Para contratos regulares con guarantees relationship
        elif hasattr(contract, 'guarantees'):
            guarantees = contract.guarantees.filter(status='ACTIVE').first()
            if guarantees:
                guarantee_data = {
                    'guarantee_type': 'codeudor_salario' if guarantees.guarantee_type == 'CO_SIGNER' else 'none',
                    'codeudor_full_name': guarantees.co_signer_data.get('name', '') if guarantees.co_signer_data else '',
                    'amount': str(guarantees.amount) if guarantees.amount else ''
                }
        
        return guarantee_data
    
    def _generate_guarantee_clause_content(self, guarantee_type, guarantee_data):
        """Generar contenido de la cláusula según el tipo de garantía"""
        
        if guarantee_type == 'none' or not guarantee_type:
            return """Para el cumplimiento de todas las obligaciones derivadas del presente 
            contrato, el ARRENDATARIO no constituye garantía adicional, siendo suficiente 
            el depósito de garantía establecido en la cláusula correspondiente. El ARRENDATARIO 
            responde con su patrimonio por el cumplimiento de todas las obligaciones contractuales."""
        
        elif guarantee_type == 'codeudor_salario':
            codeudor_name = guarantee_data.get('codeudor_full_name', '[NOMBRE DEL CODEUDOR]')
            codeudor_doc = f"{guarantee_data.get('codeudor_document_type', 'CC')} {guarantee_data.get('codeudor_document_number', '[NÚMERO]')}"
            codeudor_employer = guarantee_data.get('codeudor_employer_name', '[EMPLEADOR]')
            codeudor_income = guarantee_data.get('codeudor_monthly_income', '0')
            
            if codeudor_income and float(codeudor_income) > 0:
                income_text = f" con ingresos mensuales de {self._format_currency(float(codeudor_income))}"
            else:
                income_text = ""
            
            return f"""Para garantizar el cumplimiento de todas las obligaciones derivadas 
            del presente contrato, se constituye <b>GARANTÍA PERSONAL</b> mediante codeudor solidario. 
            Actúa como CODEUDOR SOLIDARIO el señor(a) <b>{codeudor_name}</b>, identificado(a) con 
            {codeudor_doc}, empleado(a) de {codeudor_employer}{income_text}. El codeudor responde 
            solidariamente con el ARRENDATARIO por todas las obligaciones pecuniarias y no pecuniarias 
            derivadas del contrato, incluyendo cánones de arrendamiento, servicios públicos, daños, 
            mejoras no autorizadas y cláusula penal. Esta garantía personal se mantendrá vigente 
            durante toda la duración del contrato y hasta la entrega satisfactoria del inmueble."""
        
        elif guarantee_type == 'codeudor_finca_raiz':
            codeudor_name = guarantee_data.get('codeudor_full_name', '[NOMBRE DEL CODEUDOR]')
            codeudor_doc = f"{guarantee_data.get('codeudor_document_type', 'CC')} {guarantee_data.get('codeudor_document_number', '[NÚMERO]')}"

            # Datos del inmueble de garantía
            matricula = guarantee_data.get('guarantee_property_matricula', '[MATRÍCULA INMOBILIARIA]')
            predial = guarantee_data.get('guarantee_property_predial', '[NÚMERO PREDIAL]')
            catastral = guarantee_data.get('guarantee_property_catastral', '[NÚMERO CATASTRAL]')
            address = guarantee_data.get('guarantee_property_address', '[DIRECCIÓN DEL INMUEBLE]')
            city = guarantee_data.get('guarantee_property_city', '')
            department = guarantee_data.get('guarantee_property_department', '')
            area = guarantee_data.get('guarantee_property_area', '')
            linderos = guarantee_data.get('guarantee_property_linderos', '')

            area_text = f" con un área de {area} metros cuadrados" if area else ""
            location_text = f", {city}, {department}" if city and department else ""
            linderos_text = f" Los linderos del inmueble son: {linderos}." if linderos else ""

            return f"""Para garantizar el cumplimiento de todas las obligaciones derivadas
            del presente contrato, se constituye <b>GARANTÍA REAL INMOBILIARIA</b> mediante codeudor
            con bien raíz. Actúa como CODEUDOR SOLIDARIO el señor(a) <b>{codeudor_name}</b>,
            identificado(a) con {codeudor_doc}, quien ofrece como garantía real el inmueble ubicado en
            <b>{address}</b>{location_text}{area_text}, identificado con matrícula inmobiliaria número <b>{matricula}</b>,
            número predial <b>{predial}</b> y número catastral <b>{catastral}</b>.{linderos_text} El codeudor responde
            solidariamente con el ARRENDATARIO por todas las obligaciones del contrato, y en caso de
            incumplimiento, el ARRENDADOR podrá hacer efectiva la garantía real sobre el inmueble
            ofrecido según los procedimientos legales vigentes. Esta garantía real se mantendrá
            vigente durante toda la duración del contrato."""
        
        else:
            return """El presente contrato cuenta con garantías adicionales según lo acordado 
            entre las partes, las cuales se especifican en los documentos anexos correspondientes."""
    
    def _build_cosigner_details(self, guarantee_data):
        """Construir detalles adicionales del codeudor si están disponibles"""
        story = []
        
        codeudor_name = guarantee_data.get('codeudor_full_name')
        if not codeudor_name:
            return story
        
        story.append(Spacer(1, 0.1*inch))
        
        # Información completa del codeudor - HEADER EN FILA SEPARADA
        cosigner_details = [
            ['Nombre completo:', codeudor_name],
            ['Documento:', f"{guarantee_data.get('codeudor_document_type', 'CC')} {guarantee_data.get('codeudor_document_number', '')}"],
            ['Dirección residencia:', guarantee_data.get('codeudor_address', '')],
            ['Ciudad:', guarantee_data.get('codeudor_city', '')],
            ['Teléfono:', guarantee_data.get('codeudor_phone', '')],
            ['Email:', guarantee_data.get('codeudor_email', '')],
        ]

        # Información laboral y financiera
        if guarantee_data.get('codeudor_company_name'):
            cosigner_details.extend([
                ['Empresa:', guarantee_data.get('codeudor_company_name', '')],
                ['Teléfono empresa:', guarantee_data.get('codeudor_company_phone', '')],
                ['Ingresos mensuales:', f"${guarantee_data.get('codeudor_monthly_income', '')}"],
            ])

        # Información del cónyuge si está casado
        if guarantee_data.get('codeudor_spouse_name'):
            cosigner_details.extend([
                ['Nombre del cónyuge:', guarantee_data.get('codeudor_spouse_name', '')],
                ['Documento del cónyuge:', guarantee_data.get('codeudor_spouse_document', '')],
            ])

        # Información de propiedad si la tiene
        if guarantee_data.get('codeudor_property_address'):
            cosigner_details.extend([
                ['Dirección propiedad:', guarantee_data.get('codeudor_property_address', '')],
                ['Valor propiedad:', f"${guarantee_data.get('codeudor_property_value', '')}"],
            ])

        # Agregar información específica según tipo de garantía
        guarantee_type = guarantee_data.get('guarantee_type')
        if guarantee_type == 'codeudor_salario':
            cosigner_details.extend([
                ['Empleador:', guarantee_data.get('codeudor_employer_name', guarantee_data.get('codeudor_company_name', ''))],
                ['Cargo:', guarantee_data.get('codeudor_job_title', guarantee_data.get('codeudor_occupation', ''))],
                ['Ingresos mensuales:', self._format_currency(float(guarantee_data.get('codeudor_monthly_income', 0)))],
            ])
        elif guarantee_type == 'codeudor_finca_raiz':
            cosigner_details.extend([
                ['INFORMACIÓN DEL INMUEBLE EN GARANTÍA', ''],
                ['Dirección del inmueble:', guarantee_data.get('guarantee_property_address', '')],
                ['Ciudad:', guarantee_data.get('guarantee_property_city', '')],
                ['Departamento:', guarantee_data.get('guarantee_property_department', '')],
                ['Área:', f"{guarantee_data.get('guarantee_property_area', '')} m²" if guarantee_data.get('guarantee_property_area') else ''],
                ['Matrícula inmobiliaria:', guarantee_data.get('guarantee_property_matricula', '')],
                ['Número predial:', guarantee_data.get('guarantee_property_predial', '')],
                ['Número catastral:', guarantee_data.get('guarantee_property_catastral', '')],
                ['Linderos:', guarantee_data.get('guarantee_property_linderos', '')],
            ])
        
        # Filtrar filas vacías (verificar que value es string antes de strip)
        cosigner_details = [[label, value] for label, value in cosigner_details if isinstance(value, str) and value.strip()]

        if len(cosigner_details) >= 1:  # Solo crear tabla si hay datos
            cosigner_table = Table(cosigner_details, colWidths=[2.2*inch, 3.8*inch])
            cosigner_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f8fafc')),
                ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('LEFTPADDING', (0, 0), (-1, -1), 8),
                ('RIGHTPADDING', (0, 0), (-1, -1), 8),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))

            story.append(cosigner_table)
        
        return story
    
    def _build_signatures_section_professional(self, contract, include_signatures=True, include_biometric=True):
        """Construir sección profesional de firmas"""
        story = []
        
        story.append(Spacer(1, 0.15*inch))
        story.append(Paragraph("FIRMAS Y ACEPTACIÓN", self.styles['ContractTitle']))
        
        # Obtener datos de las partes
        landlord_data = self._get_landlord_data(contract)
        tenant_data = self._get_tenant_data(contract)
        
        # Texto de aceptación
        acceptance_text = f"""En constancia de conformidad y aceptación de todas las cláusulas
        anteriores, las partes suscriben el presente contrato en la ciudad de Bogotá D.C.,
        el día {formato_fecha_es(contract.created_at)}."""
        
        story.append(Paragraph(acceptance_text, self.styles['ContractNormal']))
        story.append(Spacer(1, 0.15*inch))
        
        # Obtener datos del codeudor si existe
        guarantee_data = self._get_guarantee_data(contract)
        has_codeudor = guarantee_data.get('guarantee_type') in ['codeudor_salario', 'codeudor_finca_raiz'] and guarantee_data.get('codeudor_full_name')

        # Espacio para firmas - dos columnas (Arrendador y Arrendatario)
        # Incluir fecha/hora de autenticación (placeholder si es previsualización, real cuando autentica)
        landlord_auth_date = landlord_data.get('authentication_date', '[Pendiente autenticación]')
        tenant_auth_date = tenant_data.get('authentication_date', '[Pendiente autenticación]') if tenant_data else '[Pendiente autenticación]'

        signatures_data = [
            ['EL ARRENDADOR', 'EL ARRENDATARIO'],
            ['', ''],
            ['', ''],
            ['_' * 28, '_' * 28],
            [landlord_data.get('full_name', '[NOMBRE ARRENDADOR]'),
             tenant_data.get('full_name', '[NOMBRE ARRENDATARIO]') if tenant_data else '[NOMBRE ARRENDATARIO]'],
            [f"{landlord_data.get('document_type', 'CC')} {landlord_data.get('document_number', '[NÚMERO]')}",
             f"{tenant_data.get('document_type', 'CC')} {tenant_data.get('document_number', '[NÚMERO]')}" if tenant_data else 'CC [NÚMERO]'],
            [f"Autenticado: {landlord_auth_date}", f"Autenticado: {tenant_auth_date}"],
        ]

        signatures_table = Table(signatures_data, colWidths=[3*inch, 3*inch])
        signatures_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('FONTNAME', (0, 3), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 3), (-1, -1), 9),
            ('TOPPADDING', (0, 1), (-1, 2), 15),
            ('BOTTOMPADDING', (0, 1), (-1, 2), 15),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))

        story.append(signatures_table)

        # Si hay codeudor, agregar espacio de firma para el codeudor
        if has_codeudor:
            story.append(Spacer(1, 0.2*inch))
            codeudor_name = guarantee_data.get('codeudor_full_name', '[NOMBRE CODEUDOR]')
            codeudor_doc = f"{guarantee_data.get('codeudor_document_type', 'CC')} {guarantee_data.get('codeudor_document_number', '[NÚMERO]')}"
            codeudor_auth_date = guarantee_data.get('authentication_date', '[Pendiente autenticación]')

            codeudor_signature_data = [
                ['EL CODEUDOR SOLIDARIO'],
                [''],
                [''],
                ['_' * 28],
                [codeudor_name],
                [codeudor_doc],
                [f"Autenticado: {codeudor_auth_date}"],
            ]

            codeudor_table = Table(codeudor_signature_data, colWidths=[3*inch])
            codeudor_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 11),
                ('FONTNAME', (0, 3), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 3), (-1, -1), 9),
                ('TOPPADDING', (0, 1), (-1, 2), 15),
                ('BOTTOMPADDING', (0, 1), (-1, 2), 15),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))

            story.append(codeudor_table)
        
        # Información de verificación biométrica si está incluida
        if include_biometric:
            story.append(Spacer(1, 0.15*inch))
            story.append(Paragraph("VERIFICACIÓN DIGITAL", self.styles['ContractSubtitle']))
            
            biometric_info = """Este contrato ha sido generado y verificado mediante el sistema 
            VeriHome, que incluye verificación biométrica de identidad, firma digital certificada 
            y trazabilidad completa del proceso. Los códigos QR presentes en cada página permiten 
            verificar la autenticidad del documento."""
            
            story.append(Paragraph(biometric_info, self.styles['ContractNormal']))
        
        return story
    
    def _build_verification_section_professional(self, contract):
        """Construir sección profesional de verificación - Compacta para una sola página"""
        verification_elements = []

        # Título de la sección
        verification_elements.append(Paragraph("INFORMACIÓN DE VERIFICACIÓN", self.styles['ContractSubtitle']))
        verification_elements.append(Spacer(1, 0.1*inch))

        # Generar código QR para verificación final
        verification_url = f"https://verihome.com/verify/{contract.contract_number}"
        qr_code = self._generate_qr_code(verification_url)

        if qr_code:
            # Información de verificación en tabla compacta
            verification_info = [
                ['Concepto', 'Detalle'],
                ['Número de Contrato:', contract.contract_number],
                ['Fecha de Generación:', contract.created_at.strftime('%d/%m/%Y %H:%M:%S')],
                ['Plataforma:', 'VeriHome - Gestión Inmobiliaria'],
                ['Firma Legal:', 'WILSON ARGUELLO - Abogado'],
                ['Verificación en Línea:', verification_url],
                ['Estado del Documento:', 'VÁLIDO Y VERIFICABLE'],
            ]

            # Tabla más compacta con padding reducido
            verification_table = Table(verification_info, colWidths=[1.5*inch, 3.5*inch])
            verification_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e40af')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),  # Fuente más pequeña
                ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('LEFTPADDING', (0, 0), (-1, -1), 5),  # Padding reducido
                ('RIGHTPADDING', (0, 0), (-1, -1), 5),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))

            # Combinar QR y tabla lado a lado
            combined_data = [[qr_code, verification_table]]
            combined_table = Table(combined_data, colWidths=[1.4*inch, 3.6*inch])
            combined_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('LEFTPADDING', (1, 0), (1, 0), 10),
            ]))

            verification_elements.append(combined_table)

        # Footer legal profesional compacto
        verification_elements.append(Spacer(1, 0.1*inch))

        footer_text = """<b>WILSON ARGUELLO - ABOGADOS CONSULTORES INMOBILIARIOS</b><br/>
        Tarjeta Profesional: [NÚMERO] - Consejo Superior de la Judicatura<br/>
        Bogotá D.C., Colombia<br/><br/>
        Este documento ha sido generado electrónicamente por VeriHome y tiene plena validez
        legal según la Ley 527 de 1999 sobre firma digital y comercio electrónico."""

        verification_elements.append(Paragraph(footer_text, self.styles['ContractFooter']))

        # Envolver todo en KeepTogether para mantener en una sola página
        return [KeepTogether(verification_elements)]
    
    def _build_header(self, contract):
        """Construir header del contrato (método original mantenido para compatibilidad)"""
        story = []
        
        # Logo de VeriHome (si existe)
        logo_path = os.path.join(settings.STATIC_ROOT, 'images', 'logo.png')
        if os.path.exists(logo_path):
            logo = Image(logo_path, width=2*inch, height=0.75*inch)
            logo.hAlign = 'CENTER'
            story.append(logo)
            story.append(Spacer(1, 0.25*inch))
        
        # Título principal
        story.append(Paragraph(
            "CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA",
            self.styles['ContractTitle']
        ))
        
        # Número de contrato
        story.append(Paragraph(
            f"Contrato No. {contract.contract_number}",
            self.styles['ContractSubtitle']
        ))
        
        # Fecha
        story.append(Paragraph(
            f"Fecha: {formato_fecha_es(contract.created_at)}",
            self.styles['ContractNormal']
        ))
        
        story.append(Spacer(1, 0.15*inch))
        
        return story
    
    def _get_landlord_data(self, contract):
        """Extraer datos del arrendador con manejo robusto de datos faltantes"""
        if hasattr(contract, 'landlord_data') and contract.landlord_data:
            # LandlordControlledContract - usar datos del formulario
            data = contract.landlord_data.copy()

            # Enriquecer con datos del usuario autenticado SOLO si están realmente faltantes
            if hasattr(contract, 'landlord') and contract.landlord:
                user = contract.landlord
                if not data.get('full_name') or data.get('full_name').strip() == '':
                    data['full_name'] = user.get_full_name()
                if not data.get('email') or data.get('email').strip() == '':
                    data['email'] = user.email
                if not data.get('phone') or data.get('phone').strip() == '':
                    data['phone'] = getattr(user, 'phone_number', '') or getattr(user, 'whatsapp', '')

            # Formatear datos para el PDF con campos completos del formulario
            return {
                'full_name': data.get('full_name', ''),
                'email': data.get('email', ''),
                'phone': data.get('phone', ''),
                'document_type': data.get('document_type_display', data.get('document_type', 'CC')),
                'document_number': data.get('document_number', ''),
                'document_expedition_place': data.get('document_expedition_place', ''),
                'document_expedition_date': data.get('document_expedition_date', ''),
                'address': data.get('full_address', data.get('address', '')),
                'city': data.get('city', ''),
                'department': data.get('department', ''),
                'postal_code': data.get('postal_code', ''),
                'emergency_contact_name': data.get('emergency_contact_name', ''),
                'emergency_contact_phone': data.get('emergency_contact_phone', ''),
                'emergency_contact_relationship': data.get('emergency_contact_relationship', ''),
                'bank_name': data.get('bank_name', ''),
                'bank_account_type': data.get('bank_account_type', ''),
                'bank_account_number': data.get('bank_account_number', ''),
                'profession': data.get('profession', ''),
            }
        elif hasattr(contract, 'primary_party') or hasattr(contract, 'landlord'):
            # Regular Contract - usar datos del primary_party (arrendador) o landlord
            user = getattr(contract, 'primary_party', None) or getattr(contract, 'landlord', None)
            data = {
                'full_name': user.get_full_name() if user else '',
                'email': user.email if user else '',
                'phone': getattr(user, 'phone_number', '') or getattr(user, 'whatsapp', ''),
                'document_type': getattr(user, 'document_type', ''),
                'document_number': getattr(user, 'document_number', ''),
                'address': getattr(user, 'current_address', '') or getattr(user, 'address', ''),
            }
        else:
            data = {}

        # Buscar datos biométricos si faltan document_type o document_number
        if not data.get('document_type') or not data.get('document_number'):
            biometric_data = self._get_biometric_auth_data(contract, 'landlord')
            if biometric_data:
                data['document_type'] = data.get('document_type') or biometric_data.get('document_type', 'CC')
                data['document_number'] = data.get('document_number') or biometric_data.get('document_number', '')

        # Valores por defecto profesionales para campos vacíos
        return {
            'full_name': data.get('full_name') or '[ARRENDADOR - Nombre por definir]',
            'email': data.get('email') or '[email@ejemplo.com]',
            'phone': data.get('phone') or '[Teléfono por definir]',
            'document_type': data.get('document_type') or 'Cédula de Ciudadanía',
            'document_number': data.get('document_number') or '[Documento por definir]',
            'address': data.get('address') or '[Dirección por definir]',
        }
    
    def _get_tenant_data(self, contract):
        """Extraer datos del arrendatario con manejo robusto de datos faltantes"""
        data = None

        # 1. Primero intentar obtener de tenant_data JSONField (LandlordControlledContract)
        if hasattr(contract, 'tenant_data') and contract.tenant_data:
            data = contract.tenant_data

        # 2. Si tenant_data está vacío pero hay un ForeignKey tenant, usar datos del usuario
        if (not data or not data.get('full_name')) and hasattr(contract, 'tenant') and contract.tenant:
            user = contract.tenant
            user_data = {
                'full_name': user.get_full_name() if hasattr(user, 'get_full_name') else f"{getattr(user, 'first_name', '')} {getattr(user, 'last_name', '')}".strip(),
                'email': getattr(user, 'email', ''),
                'phone': getattr(user, 'phone_number', '') or getattr(user, 'whatsapp', '') or getattr(user, 'phone', ''),
                'document_type': getattr(user, 'document_type', 'CC'),
                'document_number': getattr(user, 'document_number', ''),
                'current_address': getattr(user, 'current_address', '') or getattr(user, 'address', ''),
                'city': getattr(user, 'city', ''),
            }
            # Combinar: preferir datos de tenant_data si existen, sino usar datos del usuario
            if data:
                for key, value in user_data.items():
                    if not data.get(key) and value:
                        data[key] = value
            else:
                data = user_data

        # 3. Regular Contract - usar datos del secondary_party (arrendatario)
        if not data and hasattr(contract, 'secondary_party'):
            user = contract.secondary_party
            if user:
                data = {
                    'full_name': user.get_full_name(),
                    'email': user.email,
                    'phone': getattr(user, 'phone_number', '') or getattr(user, 'whatsapp', ''),
                    'document_type': getattr(user, 'document_type', ''),
                    'document_number': getattr(user, 'document_number', ''),
                    'current_address': getattr(user, 'current_address', '') or getattr(user, 'address', ''),
                }

        if not data:
            return {
                'full_name': 'Pendiente de asignación',
                'email': 'Pendiente',
                'phone': 'Pendiente',
                'document_type': 'CC',
                'document_number': 'Pendiente',
                'current_address': 'Pendiente',
            }
        
        # Buscar datos biométricos si faltan document_type o document_number
        if not data.get('document_type') or not data.get('document_number'):
            biometric_data = self._get_biometric_auth_data(contract, 'tenant')
            if biometric_data:
                data['document_type'] = data.get('document_type') or biometric_data.get('document_type', 'CC')
                data['document_number'] = data.get('document_number') or biometric_data.get('document_number', '')
        
        # Valores por defecto profesionales para campos vacíos
        # Incluye campos del nuevo formulario de arrendatario
        return {
            # Datos personales básicos
            'full_name': data.get('full_name') or 'Pendiente de asignación',
            'email': data.get('email') or 'Pendiente',
            'phone': data.get('phone') or 'Pendiente',
            'document_type': data.get('document_type') or 'CC',
            'document_type_display': data.get('document_type_display') or self._get_document_type_display(data.get('document_type', 'CC')),
            'document_number': data.get('document_number') or 'Pendiente',
            'document_expedition_place': data.get('document_expedition_place') or '',
            'document_expedition_date': data.get('document_expedition_date') or '',

            # Dirección completa
            'current_address': data.get('current_address') or 'Pendiente',
            'city': data.get('city') or '',
            'department': data.get('department') or '',
            'country': data.get('country') or 'Colombia',

            # Datos laborales
            'employment_type': data.get('employment_type') or 'employee',
            'company_name': data.get('company_name') or '',
            'position': data.get('position') or '',
            'monthly_income': data.get('monthly_income') or 0,

            # Contacto de emergencia
            'emergency_contact_name': data.get('emergency_contact_name') or data.get('emergency_contact') or '',
            'emergency_contact_phone': data.get('emergency_contact_phone') or data.get('emergency_phone') or '',
            'emergency_contact_relationship': data.get('emergency_contact_relationship') or data.get('emergency_relationship') or '',

            # Otros campos
            'marital_status': data.get('marital_status') or 'Pendiente',
        }

    def _get_document_type_display(self, doc_type):
        """Obtener nombre legible del tipo de documento"""
        doc_types = {
            'CC': 'Cédula de Ciudadanía',
            'CE': 'Cédula de Extranjería',
            'NIT': 'NIT',
            'PP': 'Pasaporte',
            'TI': 'Tarjeta de Identidad',
        }
        return doc_types.get(doc_type, 'Cédula de Ciudadanía')
    
    def _get_property_data(self, contract):
        """Extraer datos de la propiedad según el tipo de contrato"""
        if hasattr(contract, 'property_data') and contract.property_data:
            # LandlordControlledContract - usar datos del formulario
            data = contract.property_data.copy()

            # Enriquecer con datos de la propiedad del modelo si están disponibles
            if hasattr(contract, 'property') and contract.property:
                prop = contract.property
                # Completar campos faltantes con datos del modelo
                if not data.get('property_address'):
                    data['property_address'] = prop.address
                if not data.get('property_type'):
                    data['property_type'] = prop.get_property_type_display()
                if not data.get('property_area'):
                    data['property_area'] = prop.total_area
                if not data.get('property_bedrooms'):
                    data['property_bedrooms'] = prop.bedrooms
                if not data.get('property_bathrooms'):
                    data['property_bathrooms'] = prop.bathrooms

            # Formatear datos para el PDF
            return {
                'address': data.get('property_address', ''),
                'type': data.get('property_type_display', data.get('property_type', '')),
                'area': str(data.get('property_area', '')),
                'area_formatted': data.get('area_formatted', f"{data.get('property_area', '')} m²"),
                'stratum': str(data.get('property_stratum', '')),
                'rooms': str(data.get('property_bedrooms', '')),
                'bathrooms': str(data.get('property_bathrooms', '')),
                'parking_spaces': str(data.get('property_parking_spaces', '')),
                'amenities': data.get('property_amenities', ''),
                'description': data.get('property_description', ''),
                'floor': str(data.get('property_floor', '')),
                'building_name': data.get('property_building_name', ''),
                'neighborhood': data.get('property_neighborhood', ''),
                'city': data.get('property_city', ''),
                'department': data.get('property_department', ''),
                'postal_code': data.get('property_postal_code', '')
            }
        elif hasattr(contract, 'property') and contract.property:
            # Regular Contract
            prop = contract.property
            return {
                'address': prop.address if prop else '',
                'type': prop.get_property_type_display() if prop else '',
                'area': str(prop.total_area) if prop and prop.total_area else '',
                'stratum': str(getattr(prop, 'stratum', '')) if prop else '',  # stratum might not exist
                'rooms': str(prop.bedrooms) if prop and prop.bedrooms else '',
                'bathrooms': str(prop.bathrooms) if prop and prop.bathrooms else '',
                'parking_spaces': str(prop.parking_spaces) if prop and prop.parking_spaces else '',
                'furnished': prop.furnished if prop else False,
            }
        return {}
    
    def _get_contract_terms(self, contract):
        """Extraer términos del contrato según el tipo - INCLUYE TODOS LOS CAMPOS DEL FORMULARIO"""
        if hasattr(contract, 'economic_terms') and contract.economic_terms:
            # LandlordControlledContract - combinar economic_terms y contract_terms
            contract_terms_data = contract.contract_terms if hasattr(contract, 'contract_terms') and contract.contract_terms else {}

            return {
                # Datos económicos básicos
                'monthly_rent': contract.economic_terms.get('monthly_rent', 0),
                'security_deposit': contract.economic_terms.get('security_deposit', 0),
                'payment_day': contract_terms_data.get('payment_due_day', contract.economic_terms.get('payment_day', 5)),

                # Duración del contrato
                'contract_duration_months': contract_terms_data.get('contract_duration_months', 12),
                'start_date': contract_terms_data.get('start_date', ''),
                'end_date': contract_terms_data.get('end_date', ''),

                # Incremento de renta
                'rent_increase_type': contract_terms_data.get('rent_increase_type', 'ipc'),
                'grace_period_days': contract_terms_data.get('grace_period_days', 5),

                # Servicios incluidos
                'utilities_included': contract_terms_data.get('utilities_included', False),
                'internet_included': contract_terms_data.get('internet_included', False),

                # Políticas de uso
                'pets_allowed': contract_terms_data.get('pets_allowed', False),
                'smoking_allowed': contract_terms_data.get('smoking_allowed', False),
                'guests_policy': contract_terms_data.get('guests_policy', 'limited'),
                'max_occupants': contract_terms_data.get('max_occupants', 4),

                # Responsabilidades
                'maintenance_responsibility': contract_terms_data.get('maintenance_responsibility', 'tenant'),
                'guarantor_required': contract_terms_data.get('guarantor_required', False),
                'guarantor_type': contract_terms_data.get('guarantor_type', 'personal'),
                'guarantee_type': contract_terms_data.get('guarantee_type', 'none'),
            }
        else:
            # Regular Contract
            return {
                'monthly_rent': contract.monthly_rent or 0,
                'security_deposit': contract.security_deposit or 0,
                'contract_duration_months': 12,  # Default
                'payment_day': 5,  # Default
                'utilities_included': False,
                'internet_included': False,
                'pets_allowed': False,
                'smoking_allowed': False,
                'guests_policy': 'limited',
                'max_occupants': 4,
                'maintenance_responsibility': 'tenant',
            }

    # ==========================================================================
    # SISTEMA CONTROL MOLECULAR - Métodos para leer cláusulas desde BD
    # ==========================================================================

    def _get_contract_type_key(self, contract) -> str:
        """
        Determinar el tipo de contrato para buscar plantilla en BD.

        Returns:
            str: 'rental_urban', 'rental_commercial', 'rental_room', o 'rental_rural'
        """
        # Intentar obtener del property_data o del property
        property_data = self._get_property_data(contract)
        property_type = property_data.get('type', '').lower()

        # Mapeo de tipos de propiedad a tipos de contrato
        type_mapping = {
            'apartment': 'rental_urban',
            'apartamento': 'rental_urban',
            'house': 'rental_urban',
            'casa': 'rental_urban',
            'studio': 'rental_urban',
            'estudio': 'rental_urban',
            'commercial': 'rental_commercial',
            'local comercial': 'rental_commercial',
            'local': 'rental_commercial',
            'oficina': 'rental_commercial',
            'office': 'rental_commercial',
            'room': 'rental_room',
            'habitación': 'rental_room',
            'habitacion': 'rental_room',
            'rural': 'rental_rural',
            'finca': 'rental_rural',
            'lote': 'rental_rural',
        }

        return type_mapping.get(property_type, 'rental_urban')

    def _get_clauses_from_db(self, contract) -> List[Dict[str, Any]]:
        """
        Obtener cláusulas desde la base de datos según el tipo de contrato.

        SISTEMA CONTROL MOLECULAR: Este método lee las cláusulas editables
        desde la BD en lugar de usar las hardcodeadas.

        Returns:
            List of clause dicts con 'number', 'ordinal', 'title', 'content'
            Returns None si no hay cláusulas en BD (fallback a hardcoded)
        """
        if not EDITABLE_CLAUSES_AVAILABLE:
            return None

        try:
            contract_type = self._get_contract_type_key(contract)

            # Buscar plantilla para este tipo de contrato
            template = ContractTypeTemplate.objects.filter(
                contract_type=contract_type,
                is_active=True
            ).first()

            if not template:
                # Intentar plantilla urbana como fallback
                template = ContractTypeTemplate.objects.filter(
                    contract_type='rental_urban',
                    is_active=True
                ).first()

            if not template:
                return None

            # Obtener cláusulas ordenadas (excluyendo la 34 que es dinámica)
            clauses = template.get_ordered_clauses().filter(
                clause_number__lt=34
            )

            if not clauses.exists():
                return None

            # Convertir a formato compatible con los métodos existentes
            clause_list = []
            for clause in clauses:
                clause_list.append({
                    'number': clause.clause_number,
                    'ordinal': clause.ordinal_text,
                    'title': clause.title,
                    'content': clause.content,
                    'category': clause.category,
                    'legal_reference': clause.legal_reference,
                })

            return clause_list

        except Exception as e:
            # En caso de error, retornar None para usar fallback
            import logging
            logging.getLogger(__name__).warning(
                f"Error leyendo cláusulas de BD: {e}. Usando cláusulas hardcoded."
            )
            return None

    def _build_clause_context(self, contract) -> Dict[str, str]:
        """
        Construir diccionario de variables para interpolar en cláusulas.

        Este método recopila todos los datos dinámicos que pueden usarse
        en las cláusulas editables con formato {variable}.

        Returns:
            Dict con todas las variables disponibles para interpolación
        """
        # Obtener datos usando métodos existentes
        property_data = self._get_property_data(contract)
        contract_terms = self._get_contract_terms(contract)
        landlord_data = self._get_landlord_data(contract)
        tenant_data = self._get_tenant_data(contract)
        guarantee_data = self._get_guarantee_data(contract)

        # Calcular fecha de vencimiento
        end_date = self._calculate_end_date(contract, contract_terms)
        start_date = getattr(contract, 'start_date', None) or datetime.now()

        context = {
            # === PROPIEDAD ===
            'property_address': property_data.get('address', '[DIRECCIÓN]'),
            'property_city': property_data.get('city', '[CIUDAD]'),
            'property_department': property_data.get('department', '[DEPARTAMENTO]'),
            'property_type': property_data.get('type', '[TIPO DE INMUEBLE]'),
            'property_area': property_data.get('area', '[ÁREA]'),
            'property_stratum': property_data.get('stratum', '[ESTRATO]'),
            'property_rooms': property_data.get('rooms', '[HABITACIONES]'),
            'property_bathrooms': property_data.get('bathrooms', '[BAÑOS]'),
            'property_neighborhood': property_data.get('neighborhood', '[BARRIO]'),

            # === ECONÓMICOS ===
            'monthly_rent': self._format_currency(contract_terms.get('monthly_rent', 0)),
            'monthly_rent_words': self._number_to_words(contract_terms.get('monthly_rent', 0)),
            'security_deposit': self._format_currency(contract_terms.get('security_deposit', 0)),
            'payment_day': str(contract_terms.get('payment_day', 5)),

            # === DURACIÓN ===
            'contract_duration_months': str(contract_terms.get('contract_duration_months', 12)),
            'start_date': formato_fecha_es(start_date),
            'end_date': formato_fecha_es(end_date),

            # === ARRENDADOR ===
            'landlord_name': landlord_data.get('name', '[NOMBRE ARRENDADOR]'),
            'landlord_document': f"{landlord_data.get('document_type', 'CC')} {landlord_data.get('document_number', '[DOCUMENTO]')}",
            'landlord_document_type': landlord_data.get('document_type', 'CC'),
            'landlord_document_number': landlord_data.get('document_number', '[DOCUMENTO]'),
            'landlord_address': landlord_data.get('address', '[DIRECCIÓN ARRENDADOR]'),
            'landlord_phone': landlord_data.get('phone', '[TELÉFONO]'),
            'landlord_email': landlord_data.get('email', '[EMAIL]'),

            # === ARRENDATARIO ===
            'tenant_name': tenant_data.get('name', '[NOMBRE ARRENDATARIO]'),
            'tenant_document': f"{tenant_data.get('document_type', 'CC')} {tenant_data.get('document_number', '[DOCUMENTO]')}",
            'tenant_document_type': tenant_data.get('document_type', 'CC'),
            'tenant_document_number': tenant_data.get('document_number', '[DOCUMENTO]'),
            'tenant_address': tenant_data.get('address', '[DIRECCIÓN ARRENDATARIO]'),
            'tenant_phone': tenant_data.get('phone', '[TELÉFONO]'),
            'tenant_email': tenant_data.get('email', '[EMAIL]'),

            # === CODEUDOR / GARANTÍAS ===
            'codeudor_full_name': guarantee_data.get('codeudor_full_name', '[NOMBRE CODEUDOR]'),
            'codeudor_document_type': guarantee_data.get('codeudor_document_type', 'CC'),
            'codeudor_document_number': guarantee_data.get('codeudor_document_number', '[DOCUMENTO]'),
            'codeudor_address': guarantee_data.get('codeudor_address', '[DIRECCIÓN CODEUDOR]'),
            'codeudor_phone': guarantee_data.get('codeudor_phone', '[TELÉFONO]'),
            'codeudor_email': guarantee_data.get('codeudor_email', '[EMAIL]'),
            'codeudor_occupation': guarantee_data.get('codeudor_occupation', '[OCUPACIÓN]'),
            'codeudor_monthly_income': self._format_currency(float(guarantee_data.get('codeudor_monthly_income', 0) or 0)),
            'codeudor_employer': guarantee_data.get('codeudor_employer_name', '[EMPLEADOR]'),
            'guarantee_type': guarantee_data.get('guarantee_type', 'none'),

            # === OTROS ===
            'current_date': formato_fecha_es(datetime.now()),
            'contract_number': getattr(contract, 'contract_number', '[NÚMERO]'),
            'admin_fee': self._format_currency(contract_terms.get('admin_fee', 0)),
        }

        return context

    def _interpolate_clause_content(self, content: str, context: Dict[str, str]) -> str:
        """
        Interpolar variables en el contenido de una cláusula.

        Args:
            content: Texto de la cláusula con variables {variable}
            context: Diccionario de variables y sus valores

        Returns:
            Texto con variables reemplazadas
        """
        try:
            # Intentar interpolación directa
            return content.format(**context)
        except KeyError as e:
            # Si falta una variable, marcarla como pendiente
            import re
            missing_var = str(e).strip("'")
            # Reemplazar solo la variable faltante
            result = content
            pattern = r'\{' + re.escape(missing_var) + r'\}'
            result = re.sub(pattern, f'[FALTA: {missing_var}]', result)
            # Intentar de nuevo con el resto
            try:
                return result.format(**context)
            except KeyError:
                # Si siguen faltando variables, usar regex para reemplazar todas
                def replace_var(match):
                    var_name = match.group(1)
                    return context.get(var_name, f'[FALTA: {var_name}]')
                return re.sub(r'\{(\w+)\}', replace_var, content)

    def _build_legal_clauses_from_db(self, contract):
        """
        Construir todas las cláusulas legales leyendo desde base de datos.

        SISTEMA CONTROL MOLECULAR: Este es el método principal que reemplaza
        los 4 métodos hardcodeados (_build_legal_clauses_part1/2/3/4).

        Returns:
            List of Paragraph elements con las cláusulas formateadas
        """
        story = []

        # Intentar obtener cláusulas de BD
        db_clauses = self._get_clauses_from_db(contract)

        if not db_clauses:
            # Fallback a métodos hardcodeados
            return None

        # Construir contexto de variables
        context = self._build_clause_context(contract)

        # Título de sección
        story.append(Paragraph("CLÁUSULAS DEL CONTRATO", self.styles['ContractTitle']))

        # Generar cada cláusula
        for clause in db_clauses:
            # Interpolar variables en el contenido
            interpolated_content = self._interpolate_clause_content(
                clause['content'],
                context
            )

            # Formatear con HTML para negrita
            clause_html = f"<b>CLÁUSULA {clause['ordinal']} - {clause['title']}:</b> {interpolated_content}"

            story.append(Paragraph(clause_html, self.styles['ContractClause']))
            story.append(Spacer(1, 0.15*inch))

        return story

    def _number_to_words(self, number) -> str:
        """Convertir número a palabras en español (para el canon)"""
        try:
            # Importar librería si está disponible
            from num2words import num2words
            return num2words(int(number), lang='es').upper() + ' PESOS M/CTE'
        except ImportError:
            # Fallback simple
            return f"{int(number):,} PESOS M/CTE".replace(',', '.')

    # ==========================================================================
    # FIN SISTEMA CONTROL MOLECULAR
    # ==========================================================================

    def _build_parties_info(self, contract):
        """Construir información de las partes"""
        story = []
        
        story.append(Paragraph("PARTES DEL CONTRATO", self.styles['ContractSubtitle']))
        
        # Obtener datos usando helpers
        landlord_data = self._get_landlord_data(contract)
        tenant_data = self._get_tenant_data(contract)
        
        # Tabla con información de las partes
        parties_data = [
            ['', 'ARRENDADOR', 'ARRENDATARIO'],
            ['Nombre:', landlord_data.get('full_name', ''), 
             tenant_data.get('full_name', '') if tenant_data else 'Por definir'],
            ['Documento:', 
             f"{landlord_data.get('document_type', '')} {landlord_data.get('document_number', '')}",
             f"{tenant_data.get('document_type', '')} {tenant_data.get('document_number', '')}" if tenant_data else 'Por definir'],
            ['Teléfono:', landlord_data.get('phone', ''), 
             tenant_data.get('phone', '') if tenant_data else 'Por definir'],
            ['Email:', landlord_data.get('email', ''), 
             tenant_data.get('email', '') if tenant_data else 'Por definir'],
            ['Dirección:', landlord_data.get('address', ''), 
             tenant_data.get('current_address', '') if tenant_data else 'Por definir'],
        ]
        
        parties_table = Table(parties_data, colWidths=[1.5*inch, 2.5*inch, 2.5*inch])
        parties_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (0, -1), colors.HexColor('#f8fafc')),
            ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ]))
        
        story.append(parties_table)
        story.append(Spacer(1, 0.15*inch))
        
        return story
    
    def _build_contract_terms(self, contract):
        """Construir términos del contrato"""
        story = []
        
        story.append(Paragraph("TÉRMINOS Y CONDICIONES", self.styles['ContractSubtitle']))
        
        # Información del inmueble
        story.append(Paragraph("1. DEL INMUEBLE", self.styles['ContractSubtitle']))
        
        # Obtener datos de la propiedad
        property_data = self._get_property_data(contract)
        property_address = property_data.get('address', 'Dirección no especificada')
        
        property_info = f"""
        El ARRENDADOR entrega al ARRENDATARIO, y este recibe a su entera satisfacción, 
        el inmueble ubicado en <b>{property_address}</b>, el cual consta de:
        """
        story.append(Paragraph(property_info, self.styles['ContractNormal']))
        
        # Detalles del inmueble
        property_details = []
        property_details.append(['Tipo de inmueble:', property_data.get('type', '')])
        if property_data.get('area'):
            property_details.append(['Área:', f"{property_data.get('area')} m²"])
        if property_data.get('stratum'):
            property_details.append(['Estrato:', property_data.get('stratum')])
        if property_data.get('rooms'):
            property_details.append(['Habitaciones:', property_data.get('rooms')])
        if property_data.get('bathrooms'):
            property_details.append(['Baños:', property_data.get('bathrooms')])
        if property_data.get('parking_spaces'):
            property_details.append(['Parqueaderos:', property_data.get('parking_spaces')])
        property_details.append(['Amoblado:', 'Sí' if property_data.get('furnished') else 'No'])
        
        property_table = Table(property_details, colWidths=[2*inch, 4*inch])
        property_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('LEFTPADDING', (0, 0), (-1, -1), 20),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        
        story.append(property_table)
        story.append(Spacer(1, 0.25*inch))
        
        # Términos económicos
        story.append(Paragraph("2. CANON DE ARRENDAMIENTO", self.styles['ContractSubtitle']))
        
        # Obtener términos económicos
        contract_terms = self._get_contract_terms(contract)
        
        rent_info = f"""
        El ARRENDATARIO pagará al ARRENDADOR por concepto de canon de arrendamiento 
        la suma de <b>{self._format_currency(contract_terms.get('monthly_rent', 0))}</b> mensuales, 
        pagaderos por anticipado dentro de los primeros <b>{contract_terms.get('payment_day', 5)}</b> 
        días de cada mes.
        """
        story.append(Paragraph(rent_info, self.styles['ContractNormal']))
        
        # Depósito
        security_deposit = contract_terms.get('security_deposit', 0)
        monthly_rent = contract_terms.get('monthly_rent', 1)
        if security_deposit > 0:
            story.append(Paragraph("3. DEPÓSITO DE GARANTÍA", self.styles['ContractSubtitle']))
            deposit_info = f"""
            El ARRENDATARIO entrega al ARRENDADOR la suma de 
            <b>{self._format_currency(security_deposit)}</b> como depósito 
            de garantía, equivalente a {security_deposit / monthly_rent:.1f} 
            meses de arrendamiento, el cual será devuelto al finalizar el contrato, 
            previo descuento de cualquier suma adeudada o daño causado al inmueble.
            """
            story.append(Paragraph(deposit_info, self.styles['ContractNormal']))
        
        # Duración
        story.append(Paragraph("4. DURACIÓN DEL CONTRATO", self.styles['ContractSubtitle']))
        duration_months = contract_terms.get('contract_duration_months', 12)
        start_date = getattr(contract, 'start_date', None)
        end_date = getattr(contract, 'end_date', None)
        
        duration_info = f"""
        El presente contrato tendrá una duración de <b>{duration_months} meses</b>,
        contados a partir del <b>{formato_fecha_es(start_date) if start_date else 'fecha de inicio'}</b>
        hasta el <b>{formato_fecha_es(end_date) if end_date else 'fecha de finalización'}</b>.
        """
        story.append(Paragraph(duration_info, self.styles['ContractNormal']))
        
        story.append(Spacer(1, 0.15*inch))
        
        return story
    
    def _build_legal_clauses(self, contract):
        """Construir cláusulas legales estándar"""
        story = []
        
        story.append(Paragraph("CLÁUSULAS", self.styles['ContractSubtitle']))
        
        # Cláusulas estándar basadas en Ley 820 de 2003
        standard_clauses = [
            {
                'title': 'DESTINACIÓN',
                'content': """El inmueble objeto del presente contrato será destinado 
                exclusivamente para vivienda del ARRENDATARIO y su núcleo familiar. 
                Queda prohibido darle un uso diferente, subarrendar total o parcialmente, 
                o ceder el contrato sin autorización escrita del ARRENDADOR."""
            },
            {
                'title': 'OBLIGACIONES DEL ARRENDATARIO',
                'content': """El ARRENDATARIO se obliga a: a) Pagar cumplidamente el canon 
                de arrendamiento; b) Cuidar el inmueble y mantenerlo en buen estado; 
                c) Pagar oportunamente los servicios públicos; d) Restituir el inmueble 
                al terminar el contrato en las mismas condiciones que lo recibió, 
                salvo el deterioro natural por el uso legítimo."""
            },
            {
                'title': 'OBLIGACIONES DEL ARRENDADOR',
                'content': """El ARRENDADOR se obliga a: a) Entregar el inmueble en buen 
                estado; b) Mantener el inmueble en condiciones de servir para el fin 
                convenido; c) Realizar las reparaciones necesarias, excepto aquellas 
                que correspondan al ARRENDATARIO por el uso normal del inmueble."""
            },
            {
                'title': 'TERMINACIÓN DEL CONTRATO',
                'content': """El presente contrato terminará por: a) Vencimiento del 
                término pactado; b) Mutuo acuerdo entre las partes; c) Incumplimiento 
                de cualquiera de las obligaciones por parte del ARRENDATARIO; 
                d) Las demás causales establecidas en la ley."""
            },
            {
                'title': 'RESTITUCIÓN',
                'content': """Al terminar el contrato por cualquier causa, el ARRENDATARIO 
                deberá restituir el inmueble desocupado y en el mismo estado en que lo 
                recibió, salvo el deterioro natural. La no restitución oportuna causará 
                una indemnización equivalente al doble del canon mensual por cada mes 
                de retardo."""
            }
        ]
        
        # Agregar cláusulas estándar
        for i, clause in enumerate(standard_clauses, 1):
            story.append(Paragraph(
                f"<b>CLÁUSULA {i}ª - {clause['title']}:</b> {clause['content']}",
                self.styles['ContractClause']
            ))
            story.append(Spacer(1, 0.1*inch))
        
        # Agregar cláusulas especiales si existen
        special_clauses = getattr(contract, 'special_clauses', None)
        if special_clauses:
            story.append(Paragraph(
                f"<b>CLÁUSULAS ESPECIALES:</b>",
                self.styles['ContractNormal']
            ))
            for clause in special_clauses:
                story.append(Paragraph(f"• {clause}", self.styles['ContractClause']))
            story.append(Spacer(1, 0.1*inch))
        
        story.append(Spacer(1, 0.15*inch))
        
        return story
    
    def _build_guarantees_section(self, contract):
        """Construir sección de garantías"""
        story = []
        
        story.append(Paragraph("GARANTÍAS", self.styles['ContractSubtitle']))
        
        guarantees = getattr(contract, 'guarantees', None)
        if guarantees:
            guarantees = guarantees.filter(status='approved')
        else:
            guarantees = []
        
        if guarantees:
            for i, guarantee in enumerate(guarantees, 1):
                guarantee_text = f"""
                <b>Garantía {i}:</b> {guarantee.get_guarantee_type_display()} 
                por valor de {self._format_currency(guarantee.amount)}
                """
                
                if guarantee.guarantor_name:
                    guarantee_text += f", otorgada por {guarantee.guarantor_name}"
                
                if guarantee.insurance_company:
                    guarantee_text += f", emitida por {guarantee.insurance_company}"
                
                story.append(Paragraph(guarantee_text, self.styles['ContractNormal']))
        
        story.append(Spacer(1, 0.15*inch))
        
        return story
    
    def _build_signatures_section(self, contract, include_biometric=True):
        """Construir sección de firmas"""
        story = []
        
        story.append(Paragraph("FIRMAS", self.styles['ContractSubtitle']))
        
        # Obtener datos de las partes para las firmas
        landlord_data = self._get_landlord_data(contract)
        tenant_data = self._get_tenant_data(contract)
        
        # Preparar datos para tabla de firmas
        signatures_data = []
        
        # Fila de encabezados
        signatures_data.append(['ARRENDADOR', 'ARRENDATARIO'])
        
        # Fila de nombres
        signatures_data.append([
            landlord_data.get('full_name', ''),
            tenant_data.get('full_name', '') if tenant_data else ''
        ])
        
        # Fila de documentos
        signatures_data.append([
            f"{landlord_data.get('document_type', '')} {landlord_data.get('document_number', '')}",
            f"{tenant_data.get('document_type', '')} {tenant_data.get('document_number', '')}" if tenant_data else ''
        ])
        
        # Crear tabla de firmas
        signatures_table = Table(signatures_data, colWidths=[3*inch, 3*inch])
        signatures_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 20),
            ('TOPPADDING', (0, 1), (-1, 1), 40),
            ('BOTTOMPADDING', (0, 1), (-1, 1), 10),
            ('LINEABOVE', (0, 1), (-1, 1), 1, colors.black),
        ]))
        
        story.append(signatures_table)
        
        # Agregar imágenes de firmas si existen
        landlord_signed = getattr(contract, 'landlord_signed', False)
        tenant_signed = getattr(contract, 'tenant_signed', False)
        landlord_signature_data = getattr(contract, 'landlord_signature_data', None)
        tenant_signature_data = getattr(contract, 'tenant_signature_data', None)
        landlord_signed_at = getattr(contract, 'landlord_signed_at', None)
        tenant_signed_at = getattr(contract, 'tenant_signed_at', None)
        
        if landlord_signed and landlord_signature_data:
            story.extend(self._add_signature_image(
                landlord_signature_data,
                "Firma Digital del Arrendador",
                landlord_signed_at
            ))
        
        if tenant_signed and tenant_signature_data:
            story.extend(self._add_signature_image(
                tenant_signature_data,
                "Firma Digital del Arrendatario",
                tenant_signed_at
            ))
        
        # Información biométrica si está incluida
        if include_biometric and (landlord_signed or tenant_signed):
            story.append(Spacer(1, 0.15*inch))
            story.append(Paragraph("VERIFICACIÓN BIOMÉTRICA", self.styles['ContractSubtitle']))
            
            biometric_info = """
            Las firmas digitales de este contrato han sido verificadas mediante 
            autenticación biométrica que incluye reconocimiento facial, verificación 
            de documentos y análisis de voz, garantizando la identidad de los firmantes.
            """
            story.append(Paragraph(biometric_info, self.styles['ContractNormal']))
        
        return story
    
    def _add_signature_image(self, signature_data, title, signed_at):
        """Agregar imagen de firma digital"""
        story = []
        
        story.append(Spacer(1, 0.25*inch))
        story.append(Paragraph(title, self.styles['Normal']))
        
        # Si hay imagen de firma
        if signature_data and 'signature_image' in signature_data:
            try:
                # Decodificar imagen base64
                image_data = signature_data['signature_image']
                if image_data.startswith('data:image'):
                    image_data = image_data.split(',')[1]
                
                image_binary = base64.b64decode(image_data)
                image_buffer = io.BytesIO(image_binary)
                
                # Crear imagen para el PDF
                img = Image(image_buffer, width=2*inch, height=1*inch)
                img.hAlign = 'LEFT'
                story.append(img)
            except Exception:
                # Si falla la imagen, mostrar texto
                story.append(Paragraph("[Firma Digital Aplicada]", self.styles['Normal']))
        
        # Fecha y hora de firma
        if signed_at:
            story.append(Paragraph(
                f"Firmado el: {signed_at.strftime('%d/%m/%Y a las %H:%M')}",
                self.styles['ContractFooter']
            ))
        
        return story
    
    def _build_verification_section(self, contract):
        """Construir sección de verificación con código QR"""
        story = []
        
        story.append(PageBreak())
        story.append(Paragraph("VERIFICACIÓN DEL CONTRATO", self.styles['ContractSubtitle']))
        
        # Generar código QR con información de verificación
        verification_url = f"https://verihome.com/verify/{contract.contract_number}"
        qr_code = self._generate_qr_code(verification_url)
        
        if qr_code:
            # Crear tabla con QR y texto
            verification_data = [[
                qr_code,
                Paragraph(f"""
                <b>Código de Verificación:</b><br/>
                {contract.contract_number}<br/><br/>
                <b>Verificar en línea:</b><br/>
                {verification_url}<br/><br/>
                Este código QR permite verificar la autenticidad 
                del contrato y las firmas digitales.
                """, self.styles['Normal'])
            ]]
            
            verification_table = Table(verification_data, colWidths=[2*inch, 4*inch])
            verification_table.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (1, 0), (1, 0), 20),
            ]))
            
            story.append(verification_table)
        
        # Footer legal
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph(
            "Este documento ha sido generado electrónicamente por VeriHome y tiene plena validez legal según la Ley 527 de 1999.",
            self.styles['ContractFooter']
        ))
        
        return story
    
    def _generate_qr_code(self, data):
        """Generar código QR"""
        try:
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=4,
                border=1,
            )
            qr.add_data(data)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Convertir a formato compatible con ReportLab
            img_buffer = io.BytesIO()
            img.save(img_buffer, format='PNG')
            img_buffer.seek(0)
            
            # Usar la imagen desde el buffer
            from reportlab.platypus import Image as ReportLabImage
            return ReportLabImage(img_buffer, width=1.5*inch, height=1.5*inch)
        except Exception as e:
            print(f"Error generando QR grande: {e}")
            return None
    
    def _format_currency(self, amount):
        """Formatear moneda colombiana"""
        return f"${amount:,.0f} COP"
    
    def _add_page_number(self, canvas, doc):
        """Agregar número de página (método legacy para compatibilidad)"""
        # Este método se mantiene para compatibilidad con el sistema anterior
        # En el nuevo sistema profesional, la numeración se maneja en ProfessionalPageTemplate
        canvas.saveState()
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.HexColor('#64748b'))
        
        page_num = canvas.getPageNumber()
        text = f"Página {page_num}"
        
        canvas.drawCentredString(
            doc.pagesize[0] / 2,
            0.5 * inch,
            text
        )
        
        canvas.restoreState()
    
    def _get_contract_title(self, contract):
        """Obtener título dinámico del contrato según tipo de propiedad"""
        try:
            property_data = self._get_property_data(contract)
            property_type = property_data.get('type', '').lower()
            
            # Detectar si es comercial o de vivienda basándose en property_type
            if any(word in property_type for word in ['comercial', 'oficina', 'local', 'negocio', 'commercial']):
                return "CONTRATO DE ARRENDAMIENTO COMERCIAL"
            else:
                return "CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA"
        except:
            return "CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA"
    
    def _get_biometric_auth_data(self, contract, party_type):
        """Obtener datos de autenticación biométrica para completar información faltante"""
        try:
            # Intentar obtener datos de BiometricAuthentication si existe
            from contracts.models import BiometricAuthentication
            
            if party_type == 'landlord':
                auth = BiometricAuthentication.objects.filter(
                    contract=contract, user_type='landlord'
                ).first()
            else:
                auth = BiometricAuthentication.objects.filter(
                    contract=contract, user_type='tenant'
                ).first()
            
            if auth and hasattr(auth, 'document_data'):
                return auth.document_data
        except Exception:
            pass
        return {}


# Función helper para usar en vistas
def generate_contract_pdf(contract, **kwargs):
    """
    Función helper para generar PDF de contrato profesional
    
    Args:
        contract: Instancia de Contract o LandlordControlledContract
        **kwargs: Argumentos adicionales para el generador
                 - include_signatures: bool (default True)
                 - include_biometric: bool (default True)
        
    Returns:
        ContentFile con el PDF profesional de 10 páginas generado
        
    Features:
        - Diseño profesional con marcos azules
        - Header "WILSON ARGUELLO ABOGADOS-CONSULTORES INMOBILIARIOS"
        - 4 códigos QR de verificación en cada página
        - Marca de agua con silueta de perfil
        - 33 cláusulas legales completas
        - Tabla resumen ejecutiva
        - Compatible con ambos tipos de contrato
    """
    generator = ContractPDFGenerator()
    return generator.generate_contract_pdf(contract, **kwargs)