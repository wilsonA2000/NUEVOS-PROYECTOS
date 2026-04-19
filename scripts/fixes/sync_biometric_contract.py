#!/usr/bin/env python3
"""
Script para sincronizar contrato específico para autenticación biométrica
"""

import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from contracts.models import Contract, LandlordControlledContract
from matching.models import MatchRequest

def sync_contract_for_biometric():
    """Sincronizar el contrato específico para permitir autenticación biométrica"""

    contract_id = "055e0039-fbaa-4d07-a2f9-5a6e3f1cc6f1"

    print(f"🔍 Buscando contrato: {contract_id}")

    # 1. Verificar si existe en LandlordControlledContract
    try:
        landlord_contract = LandlordControlledContract.objects.get(id=contract_id)
        print("✅ Contrato encontrado en LandlordControlledContract:")
        print(f"   - Estado: {landlord_contract.current_state}")
        print(f"   - Título: {landlord_contract.title}")
        print(f"   - Arrendador: {landlord_contract.landlord.get_full_name()}")
        print(f"   - Arrendatario: {landlord_contract.tenant.get_full_name()}")
    except LandlordControlledContract.DoesNotExist:
        print("❌ Contrato NO encontrado en LandlordControlledContract")
        return

    # 2. Verificar si existe en Contract (sistema viejo)
    try:
        old_contract = Contract.objects.get(id=contract_id)
        print("✅ Contrato YA existe en sistema viejo:")
        print(f"   - Estado: {old_contract.status}")
    except Contract.DoesNotExist:
        print("⚠️ Contrato NO existe en sistema viejo - Creando...")

        # Crear el contrato en el sistema viejo
        old_contract = Contract.objects.create(
            id=contract_id,
            title=landlord_contract.title,
            content=landlord_contract.contract_content or "Contrato generado",
            primary_party=landlord_contract.landlord,
            secondary_party=landlord_contract.tenant,
            status='ready_for_authentication',  # Estado para permitir autenticación biométrica
            start_date=landlord_contract.start_date,
            end_date=landlord_contract.end_date,
            rent_amount=landlord_contract.rent_amount,
            deposit_amount=landlord_contract.deposit_amount or 0,
            created_at=landlord_contract.created_at
        )
        print(f"✅ Contrato creado en sistema viejo con ID: {old_contract.id}")

    # 3. Actualizar estado para permitir autenticación biométrica
    if old_contract.status not in ['ready_for_authentication', 'pending_biometric']:
        old_contract.status = 'ready_for_authentication'
        old_contract.save()
        print(f"✅ Estado actualizado a: {old_contract.status}")

    # 4. Verificar usuarios involucrados
    print("\n👥 Usuarios involucrados:")
    print(f"   - Arrendador: {old_contract.primary_party.get_full_name()} ({old_contract.primary_party.email})")
    print(f"   - Arrendatario: {old_contract.secondary_party.get_full_name()} ({old_contract.secondary_party.email})")

    # 5. Verificar MatchRequest relacionado
    try:
        match_request = MatchRequest.objects.filter(
            tenant=landlord_contract.tenant,
            property__landlord=landlord_contract.landlord
        ).first()

        if match_request:
            print("\n📋 MatchRequest encontrado:")
            print(f"   - ID: {match_request.id}")
            print(f"   - Workflow Stage: {match_request.workflow_stage}")
            print(f"   - Workflow Status: {match_request.workflow_status}")
        else:
            print("⚠️ No se encontró MatchRequest relacionado")

    except Exception as e:
        print(f"❌ Error buscando MatchRequest: {e}")

    print("\n🎉 Sincronización completada!")
    print(f"✅ El contrato {contract_id} ahora está listo para autenticación biométrica")

    return old_contract

if __name__ == "__main__":
    sync_contract_for_biometric()