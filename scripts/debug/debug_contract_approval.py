#!/usr/bin/env python3
"""
Script para debuggear el problema de aprobación de contratos por inquilinos
"""

import os
import sys
import django

# Configurar Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from contracts.models import Contract
from matching.models import MatchRequest
from django.contrib.auth import get_user_model

User = get_user_model()

def debug_contract_approval():
    """Debug el estado actual del contrato y matching"""

    print("🔍 DEBUGGING CONTRACT APPROVAL ISSUE")
    print("=" * 50)

    # 1. Buscar el contrato VH-2025-000001
    try:
        contract = Contract.objects.get(contract_number='VH-2025-000001')
        print(f"📄 Contract found: {contract.contract_number}")
        print(f"   - ID: {contract.id}")
        print(f"   - Status: {contract.status}")
        print(f"   - Primary party (Landlord): {contract.primary_party}")
        print(f"   - Secondary party (Tenant): {contract.secondary_party}")
        print(f"   - Created: {contract.created_at}")
        print(f"   - Updated: {contract.updated_at}")

        # 2. Verificar MatchRequest relacionado
        print(f"\n🔗 Looking for related MatchRequest...")
        match_requests = MatchRequest.objects.filter(
            workflow_data__contract_created__contract_id=str(contract.id)
        )

        if match_requests.exists():
            for mr in match_requests:
                print(f"   - MatchRequest ID: {mr.id}")
                print(f"   - Status: {mr.status}")
                print(f"   - Stage: {mr.workflow_stage}")
                print(f"   - Requester: {mr.requester}")
                print(f"   - Property Owner: {mr.property.landlord}")

                # Verificar workflow data
                contract_data = mr.workflow_data.get('contract_created', {})
                print(f"   - Contract Data: {contract_data}")
        else:
            print("   ❌ No MatchRequest found for this contract")

        # 3. Verificar users
        print(f"\n👥 USER VERIFICATION:")
        users = User.objects.filter(user_type__in=['tenant', 'candidate'])

        for user in users:
            print(f"   - User: {user.email} ({user.get_full_name()})")
            print(f"     Type: {user.user_type}")
            print(f"     ID: {user.id}")

            # Verificar si este user es secondary_party del contrato
            if contract.secondary_party and contract.secondary_party.id == user.id:
                print(f"     ✅ This user IS the secondary party of the contract")
            else:
                print(f"     ❌ This user is NOT the secondary party")

        # 4. Sugerir fix si es necesario
        print(f"\n🔧 POSSIBLE FIXES:")

        if not contract.secondary_party:
            print("   1. Contract has no secondary_party - need to assign tenant")
            # Buscar un tenant para asignar
            tenant_user = users.first()
            if tenant_user:
                print(f"   → Suggest assigning: {tenant_user.email}")

                # Fix automático
                response = input(f"   🤖 Auto-fix: Assign {tenant_user.email} as secondary_party? (y/N): ")
                if response.lower() == 'y':
                    contract.secondary_party = tenant_user
                    contract.save()
                    print(f"   ✅ Contract updated with secondary_party: {tenant_user.email}")

                    # También actualizar el MatchRequest
                    if match_requests.exists():
                        mr = match_requests.first()
                        if 'contract_created' in mr.workflow_data:
                            mr.workflow_data['contract_created']['tenant_assigned'] = True
                            mr.workflow_data['contract_created']['tenant_email'] = tenant_user.email
                            mr.save()
                            print(f"   ✅ MatchRequest updated with tenant assignment")

        print(f"\n✅ DEBUG COMPLETE")

    except Contract.DoesNotExist:
        print("❌ Contract VH-2025-000001 not found")

        # Listar todos los contratos disponibles
        contracts = Contract.objects.all()
        print(f"\n📋 Available contracts ({contracts.count()}):")
        for c in contracts:
            print(f"   - {c.contract_number}: {c.status} (Primary: {c.primary_party}, Secondary: {c.secondary_party})")

if __name__ == "__main__":
    debug_contract_approval()