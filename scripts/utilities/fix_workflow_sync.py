import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "verihome.settings")
django.setup()

from matching.models import MatchRequest
from contracts.models import LandlordControlledContract

print("=" * 80)
print("🔄 SINCRONIZANDO WORKFLOW - ARRENDATARIO")
print("=" * 80)

# Buscar el match request y el contrato
match_id = "3df7c295-70e7-41b9-9b23-dc1b27106ad1"
contract_id = "075d21f8-249d-4b27-8be8-588d33a2ba33"

try:
    match = MatchRequest.objects.get(id=match_id)
    contract = LandlordControlledContract.objects.get(id=contract_id)

    print(f"\n✅ Match encontrado: {match.match_code}")
    print(f"   Status actual: {match.workflow_status}")
    print(f"   Stage actual: {match.workflow_stage}")

    print(f"\n✅ Contrato encontrado: {contract.contract_number}")
    print(f"   Status actual: {contract.status}")

    # Actualizar el workflow_data para que el arrendatario vea el contrato
    match.workflow_data["contract_created"] = {
        "contract_id": str(contract.id),
        "contract_number": contract.contract_number,
        "status": contract.status,
        "created_at": contract.created_at.isoformat(),
        "created_by": "Admin VeriHome",
        "title": f"Contrato de Arrendamiento - {contract.property.title}",
        "pending_tenant_approval": True,
    }

    # Actualizar status para que muestre "esperando aprobación del arrendatario"
    match.workflow_status = "contract_pending_tenant_approval"
    match.save()

    print("\n✅ WORKFLOW SINCRONIZADO")
    print(f"   Nuevo status: {match.workflow_status}")
    print(f"   Contract data: {match.workflow_data.get('contract_created')}")
    print("\n🎉 El arrendatario ahora podrá ver y aprobar el contrato!")

except MatchRequest.DoesNotExist:
    print(f"\n❌ Match request no encontrado: {match_id}")
except LandlordControlledContract.DoesNotExist:
    print(f"\n❌ Contrato no encontrado: {contract_id}")
except Exception as e:
    print(f"\n❌ Error: {e}")
    import traceback

    traceback.print_exc()

print("\n" + "=" * 80)
