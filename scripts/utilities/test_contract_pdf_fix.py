#!/usr/bin/env python3
"""
Script para probar la corrección del endpoint de PDF de contratos
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from contracts.models import LandlordControlledContract
from contracts.pdf_generator import ContractPDFGenerator
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()

def test_pdf_generation():
    """Probar generación de PDF"""
    contract_id = uuid.UUID('055e0039-fbaa-4d07-a2f9-5a6e3f1cc6f1')

    try:
        # Obtener contrato
        contract = LandlordControlledContract.objects.get(id=contract_id)
        print(f"✅ Contrato encontrado: {contract.contract_number}")
        print(f"   Arrendador: {contract.landlord}")
        print(f"   Arrendatario: {contract.tenant}")

        # Obtener tenant
        tenant = contract.tenant
        if tenant:
            print(f"\n👤 Verificando permisos para tenant: {tenant.email}")
            print(f"   Full name: {tenant.get_full_name()}")
            print(f"   User type: {tenant.user_type}")

            # Verificar si el tenant está en allowed_users
            allowed_users = [contract.landlord]
            if contract.tenant:
                allowed_users.append(contract.tenant)

            if tenant in allowed_users:
                print(f"   ✅ Tenant TIENE permisos")
            else:
                print(f"   ❌ Tenant NO tiene permisos")

        # Intentar generar PDF
        print(f"\n📄 Generando PDF...")
        pdf_generator = ContractPDFGenerator()
        pdf_content = pdf_generator.generate_contract_pdf(contract)
        print(f"✅ PDF generado exitosamente: {len(pdf_content):,} bytes")

        # Guardar PDF de prueba
        output_file = "test_contract_output.pdf"
        with open(output_file, 'wb') as f:
            f.write(pdf_content)
        print(f"✅ PDF guardado en: {output_file}")

        return True

    except Exception as e:
        print(f"❌ ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("=" * 60)
    print("PRUEBA DE GENERACIÓN DE PDF DE CONTRATO")
    print("=" * 60)

    success = test_pdf_generation()

    print("\n" + "=" * 60)
    if success:
        print("✅ PRUEBA EXITOSA")
    else:
        print("❌ PRUEBA FALLIDA")
    print("=" * 60)
