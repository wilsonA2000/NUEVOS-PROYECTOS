#!/usr/bin/env python3
"""
Verificar el estado del contrato y el flujo biométrico.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from contracts.models import Contract
from django.contrib.auth import get_user_model

User = get_user_model()

def check_contract_status():
    contract_id = "c6a04a99-c3da-468a-a514-5c9fba718ea3"

    try:
        # Buscar el contrato
        contract = Contract.objects.get(id=contract_id)

        print("=" * 80)
        print("📄 ESTADO DEL CONTRATO")
        print("=" * 80)
        print(f"ID: {contract.id}")
        print(f"Número: {contract.contract_number}")
        print(f"Estado: {contract.status}")
        print(f"Título: {contract.title}")
        print(f"Arrendador (primary_party): {contract.primary_party.email if contract.primary_party else 'None'}")
        print(f"Arrendatario (secondary_party): {contract.secondary_party.email if contract.secondary_party else 'None'}")
        print(f"Estado biométrico: {contract.biometric_state}")
        print(f"Fecha creación: {contract.created_at}")
        print(f"Última actualización: {contract.updated_at}")

        # Verificar datos del workflow
        if hasattr(contract, 'workflow_data'):
            print(f"\n📊 Workflow Data:")
            import json
            print(json.dumps(contract.workflow_data, indent=2))

        # Verificar si el contrato está en un estado válido para autenticación
        print("\n" + "=" * 80)
        print("🔍 VALIDACIÓN DE ESTADO PARA AUTENTICACIÓN")
        print("=" * 80)

        valid_states = ['pdf_generated', 'ready_for_authentication']
        print(f"Estados válidos para autenticación: {valid_states}")
        print(f"Estado actual del contrato: {contract.status}")
        print(f"✅ ¿Estado válido?: {'SÍ' if contract.status in valid_states else 'NO'}")

        # Verificar usuarios
        print("\n" + "=" * 80)
        print("👥 USUARIOS DEL CONTRATO")
        print("=" * 80)

        if contract.primary_party:
            user = contract.primary_party
            print(f"\nArrendador (primary_party):")
            print(f"  - Email: {user.email}")
            print(f"  - ID: {user.id}")
            print(f"  - Tipo: {user.user_type}")
            print(f"  - Nombre: {user.get_full_name()}")

        if contract.secondary_party:
            user = contract.secondary_party
            print(f"\nArrendatario (secondary_party):")
            print(f"  - Email: {user.email}")
            print(f"  - ID: {user.id}")
            print(f"  - Tipo: {user.user_type}")
            print(f"  - Nombre: {user.get_full_name()}")

        # Verificar el estado biométrico y determinar quién debe actuar
        print("\n" + "=" * 80)
        print("🔐 ESTADO BIOMÉTRICO Y TURNO")
        print("=" * 80)
        print(f"Estado biométrico actual: {contract.biometric_state}")

        if contract.biometric_state == 'none' or not contract.biometric_state:
            print("➡️ Próximo: El ARRENDADOR debe iniciar la autenticación biométrica")
        elif contract.biometric_state == 'landlord_completed':
            print("➡️ Próximo: El ARRENDATARIO debe completar su autenticación biométrica")
        elif contract.biometric_state == 'tenant_completed':
            print("➡️ Próximo: El ARRENDADOR debe completar su autenticación biométrica")
        elif contract.biometric_state == 'both_completed':
            print("✅ Ambos han completado la autenticación biométrica")

        return contract

    except Contract.DoesNotExist:
        print(f"❌ ERROR: Contrato con ID {contract_id} no encontrado en la base de datos")

        # Listar todos los contratos
        print("\n📋 Contratos existentes en la base de datos:")
        contracts = Contract.objects.all()
        for c in contracts:
            print(f"  - {c.id}: {c.contract_number} - {c.title} (Estado: {c.status})")

        return None

if __name__ == "__main__":
    print("🚀 Verificando estado del contrato para autenticación biométrica")
    print()
    contract = check_contract_status()

    if contract:
        print("\n" + "=" * 80)
        print("📌 RESUMEN")
        print("=" * 80)
        if contract.status not in ['pdf_generated', 'ready_for_authentication']:
            print(f"⚠️ El contrato NO está en un estado válido para autenticación.")
            print(f"   Estado actual: {contract.status}")
            print(f"   Cambiar a: 'ready_for_authentication' o 'pdf_generated'")
        else:
            print(f"✅ El contrato está listo para autenticación biométrica")
            print(f"   Estado: {contract.status}")