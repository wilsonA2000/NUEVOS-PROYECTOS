"""
Script para limpiar datos de workflow y permitir comenzar de cero.
Elimina todos los MatchRequest, TenantDocuments y Contracts relacionados.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "verihome.settings")
django.setup()

from matching.models import MatchRequest
from requests.models import TenantDocument
from contracts.models import Contract, LandlordControlledContract


def clean_all_workflow_data():
    """Limpia todos los datos de workflow existentes."""

    print("🧹 Iniciando limpieza completa de datos de workflow...\n")

    # 1. Contar registros antes
    match_count = MatchRequest.objects.count()
    doc_count = TenantDocument.objects.count()
    contract_count = Contract.objects.count()
    landlord_contract_count = LandlordControlledContract.objects.count()

    print("📊 Estado actual:")
    print(f"  - MatchRequests: {match_count}")
    print(f"  - TenantDocuments: {doc_count}")
    print(f"  - Contracts: {contract_count}")
    print(f"  - LandlordControlledContracts: {landlord_contract_count}\n")

    if (
        match_count == 0
        and doc_count == 0
        and contract_count == 0
        and landlord_contract_count == 0
    ):
        print("✅ La base de datos ya está limpia. No hay datos para eliminar.")
        return

    # Confirmar acción
    confirm = input(
        "⚠️  ¿Estás seguro de eliminar TODOS los datos de workflow? (escribe 'SI' para confirmar): "
    )
    if confirm != "SI":
        print("❌ Operación cancelada por el usuario.")
        return

    # 2. Eliminar TenantDocuments (tienen FK a MatchRequest con CASCADE)
    print("\n🗑️  Eliminando TenantDocuments...")
    deleted_docs = TenantDocument.objects.all().delete()
    print(f"   ✅ {deleted_docs[0]} TenantDocuments eliminados")

    # 3. Eliminar Contracts (pueden tener referencias a MatchRequest)
    print("\n🗑️  Eliminando Contracts...")
    deleted_contracts = Contract.objects.all().delete()
    print(f"   ✅ {deleted_contracts[0]} Contracts eliminados")

    # 4. Eliminar LandlordControlledContracts
    print("\n🗑️  Eliminando LandlordControlledContracts...")
    deleted_landlord_contracts = LandlordControlledContract.objects.all().delete()
    print(
        f"   ✅ {deleted_landlord_contracts[0]} LandlordControlledContracts eliminados"
    )

    # 5. Eliminar MatchRequests (el padre de todo)
    print("\n🗑️  Eliminando MatchRequests...")
    deleted_matches = MatchRequest.objects.all().delete()
    print(f"   ✅ {deleted_matches[0]} MatchRequests eliminados")

    print("\n✅ ¡Limpieza completa exitosa!")
    print("🎉 La base de datos está lista para comenzar de cero.")


if __name__ == "__main__":
    clean_all_workflow_data()
