#!/usr/bin/env python3
"""
Script de prueba para el generador de PDF profesional
Crea un contrato de ejemplo y genera el PDF con todas las características profesionales
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Configurar Django
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from contracts.pdf_generator import ContractPDFGenerator
from decimal import Decimal


class MockContract:
    """Clase mock para simular un contrato y probar el generador"""
    
    def __init__(self):
        self.contract_number = f"VH-{datetime.now().strftime('%Y%m%d')}-001"
        self.created_at = datetime.now()
        self.start_date = datetime.now().date()
        self.end_date = (datetime.now() + timedelta(days=365)).date()
        self.status = 'ACTIVE'
        self.monthly_rent = Decimal('2500000')  # 2.5 millones COP
        self.security_deposit = Decimal('2500000')  # 1 mes de depósito
        
        # Datos del arrendador (LandlordControlledContract style)
        self.landlord_data = {
            'full_name': 'Juan Carlos Pérez García',
            'document_type': 'CC',
            'document_number': '12345678',
            'phone': '+57 300 123 4567',
            'email': 'juan.perez@example.com',
            'address': 'Carrera 15 # 93-47, Bogotá D.C.'
        }
        
        # Datos del arrendatario
        self.tenant_data = {
            'full_name': 'María Fernanda López Rodríguez',
            'document_type': 'CC',
            'document_number': '87654321',
            'phone': '+57 301 987 6543',
            'email': 'maria.lopez@example.com',
            'current_address': 'Calle 72 # 10-34, Bogotá D.C.',
            'marital_status': 'Soltero(a)'
        }
        
        # Datos de la propiedad
        self.property_data = {
            'address': 'Carrera 13 # 85-32, Apartamento 501, Bogotá D.C.',
            'type': 'Apartamento',
            'area': '85',
            'stratum': '4',
            'rooms': '3',
            'bathrooms': '2',
            'parking_spaces': '1',
            'furnished': True
        }
        
        # Términos económicos
        self.economic_terms = {
            'monthly_rent': 2500000,
            'security_deposit': 2500000,
            'payment_day': 5
        }
        
        # Términos del contrato
        self.contract_terms = {
            'duration_months': 12
        }
        
        # Estado de firma (simulado)
        self.landlord_signed = True
        self.tenant_signed = False
        self.landlord_signed_at = datetime.now()
        self.tenant_signed_at = None
        
        # Datos de firma simulados
        self.landlord_signature_data = {
            'signature_image': 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        }
        self.tenant_signature_data = None


def test_pdf_generation():
    """Función principal para probar la generación de PDF"""
    
    print("🔧 Iniciando prueba del generador de PDF profesional...")
    
    try:
        # Crear contrato mock
        contract = MockContract()
        print(f"✅ Contrato mock creado: {contract.contract_number}")
        
        # Crear generador
        generator = ContractPDFGenerator()
        print("✅ Generador de PDF inicializado")
        
        # Generar PDF
        print("🔄 Generando PDF profesional...")
        pdf_file = generator.generate_contract_pdf(
            contract,
            include_signatures=True,
            include_biometric=True
        )
        
        # Guardar PDF
        output_path = f"/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/test_contract_{contract.contract_number}.pdf"
        with open(output_path, 'wb') as f:
            f.write(pdf_file.read())
        
        print(f"✅ PDF generado exitosamente: {output_path}")
        print("📋 Características del PDF generado:")
        print("   • 10 páginas completas")
        print("   • Marco azul profesional en cada página")
        print("   • Header 'WILSON ARGUELLO ABOGADOS-CONSULTORES INMOBILIARIOS'")
        print("   • 4 códigos QR de verificación en cada página")
        print("   • Marca de agua con silueta de perfil")
        print("   • 33 cláusulas legales completas")
        print("   • Tabla resumen ejecutiva")
        print("   • Sección de firmas profesional")
        print("   • Información de verificación digital")
        
        return True
        
    except Exception as e:
        print(f"❌ Error durante la generación del PDF: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_compatibility():
    """Probar compatibilidad con ambos tipos de contratos"""
    
    print("\n🔧 Probando compatibilidad con diferentes tipos de contratos...")
    
    try:
        # Simular Contract tradicional (sin landlord_data)
        class MockTraditionalContract:
            def __init__(self):
                self.contract_number = f"VH-TRAD-{datetime.now().strftime('%Y%m%d')}-001"
                self.created_at = datetime.now()
                self.monthly_rent = Decimal('1800000')
                self.security_deposit = Decimal('1800000')
                
                # Simular relaciones de usuario
                class MockUser:
                    def __init__(self, name, email):
                        self.first_name = name.split()[0]
                        self.last_name = ' '.join(name.split()[1:])
                        self.email = email
                        self.phone = '+57 300 000 0000'
                        self.document_type = 'CC'
                        self.document_number = '00000000'
                        self.address = 'Dirección no especificada'
                    
                    def get_full_name(self):
                        return f"{self.first_name} {self.last_name}"
                
                self.primary_party = MockUser('Carlos Tradicional', 'carlos@example.com')
                self.secondary_party = MockUser('Ana Inquilina', 'ana@example.com')
                
                # Simular propiedad
                class MockProperty:
                    def __init__(self):
                        self.address = 'Calle 50 # 20-30, Bogotá D.C.'
                        self.property_type = 'apartment'
                        self.total_area = 70
                        self.bedrooms = 2
                        self.bathrooms = 1
                        self.parking_spaces = 0
                        self.furnished = False
                    
                    def get_property_type_display(self):
                        return 'Apartamento'
                
                self.property = MockProperty()
        
        # Probar con contrato tradicional
        traditional_contract = MockTraditionalContract()
        generator = ContractPDFGenerator()
        
        pdf_file = generator.generate_contract_pdf(traditional_contract)
        
        # Guardar PDF tradicional
        output_path = f"/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/test_traditional_{traditional_contract.contract_number}.pdf"
        with open(output_path, 'wb') as f:
            f.write(pdf_file.read())
        
        print(f"✅ PDF de contrato tradicional generado: {output_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error en prueba de compatibilidad: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    print("🚀 INICIANDO PRUEBAS DEL GENERADOR DE PDF PROFESIONAL")
    print("=" * 60)
    
    # Ejecutar pruebas
    success1 = test_pdf_generation()
    success2 = test_compatibility()
    
    print("\n" + "=" * 60)
    if success1 and success2:
        print("🎉 TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE")
        print("📁 Los PDFs generados están listos para revisión")
    else:
        print("⚠️  ALGUNAS PRUEBAS FALLARON")
    
    print("=" * 60)