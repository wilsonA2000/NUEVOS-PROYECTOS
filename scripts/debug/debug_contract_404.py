#!/usr/bin/env python3
"""
Script para debugging específico del contrato 404
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from contracts.models import LandlordControlledContract
from django.contrib.auth import get_user_model

User = get_user_model()

def main():
    print("=== DEBUG CONTRATO 404 ===\n")

    contract_id = "055e0039-fbaa-4d07-a2f9-5a6e3f1cc6f1"

    # Verificar si el contrato existe
    print(f"🔍 Buscando contrato: {contract_id}")
    try:
        contract = LandlordControlledContract.objects.get(id=contract_id)
        print("✅ Contrato encontrado!")
        print(f"   - ID: {contract.id}")
        print(f"   - Current State: {contract.current_state}")
        print(f"   - Landlord: {contract.landlord.email}")
        print(f"   - Tenant: {contract.tenant.email if contract.tenant else 'None'}")
        print(f"   - Property: {contract.property.title}")
        print(f"   - Created: {contract.created_at}")

        # Verificar usuario actual (tenant)
        tenant_email = "letefon100@gmail.com"
        try:
            tenant_user = User.objects.get(email=tenant_email)
            print(f"\n👤 Usuario tenant: {tenant_user.email}")
            print(f"   - ID: {tenant_user.id}")
            print(f"   - User Type: {tenant_user.user_type}")

            # Verificar si coincide con el tenant del contrato
            if contract.tenant and contract.tenant.id == tenant_user.id:
                print("✅ Usuario tiene acceso al contrato")
            else:
                print("❌ Usuario NO tiene acceso al contrato")
                print(f"   Contract tenant ID: {contract.tenant.id if contract.tenant else 'None'}")
                print(f"   Current user ID: {tenant_user.id}")

        except User.DoesNotExist:
            print(f"❌ Usuario {tenant_email} no encontrado")

    except LandlordControlledContract.DoesNotExist:
        print("❌ Contrato NO encontrado en la base de datos")

        # Listar todos los contratos disponibles
        print("\n📋 Contratos disponibles:")
        for contract in LandlordControlledContract.objects.all():
            print(f"   - ID: {contract.id}")
            print(f"     Tenant: {contract.tenant.email if contract.tenant else 'None'}")
            print(f"     Current State: {contract.current_state}")

if __name__ == "__main__":
    main()