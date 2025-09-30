#!/usr/bin/env python
"""
Script para resetear el proceso de match y contratos
Elimina el match actual y el contrato asociado para empezar limpio
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from matching.models import MatchRequest
from contracts.models import Contract
from requests.models import PropertyInterestRequest

def reset_match_process():
    """Resetea el proceso de match eliminando registros problemáticos"""
    
    print("🔄 Iniciando proceso de limpieza...")
    
    # 1. Eliminar el contrato problemático
    try:
        contract = Contract.objects.get(id='48937b33-14d7-494b-99b6-e1b08819bc7d')
        print(f"❌ Eliminando contrato: {contract.id}")
        contract.delete()
        print("   ✅ Contrato eliminado")
    except Contract.DoesNotExist:
        print("   ℹ️ Contrato no encontrado (ya eliminado)")
    except Exception as e:
        print(f"   ⚠️ Error eliminando contrato: {e}")
    
    # 2. Eliminar el MatchRequest problemático
    try:
        match_request = MatchRequest.objects.get(id='8883d794-00f4-407a-ae8f-ffb0d2393fb1')
        print(f"❌ Eliminando MatchRequest: {match_request.id}")
        match_request.delete()
        print("   ✅ MatchRequest eliminado")
    except MatchRequest.DoesNotExist:
        print("   ℹ️ MatchRequest no encontrado (ya eliminado)")
    except Exception as e:
        print(f"   ⚠️ Error eliminando MatchRequest: {e}")
    
    # 3. Eliminar PropertyInterestRequest relacionado
    try:
        property_requests = PropertyInterestRequest.objects.filter(
            id='f21dfbbe-b9b6-47d1-803a-0f93a0f89cdf'
        )
        if property_requests.exists():
            print(f"❌ Eliminando {property_requests.count()} PropertyInterestRequest(s)")
            property_requests.delete()
            print("   ✅ PropertyInterestRequest(s) eliminados")
        else:
            print("   ℹ️ No hay PropertyInterestRequest para eliminar")
    except Exception as e:
        print(f"   ⚠️ Error eliminando PropertyInterestRequest: {e}")
    
    # 4. Verificar que todo se eliminó
    print("\n📊 Verificación final:")
    
    contract_exists = Contract.objects.filter(
        id='48937b33-14d7-494b-99b6-e1b08819bc7d'
    ).exists()
    print(f"   Contrato existe: {'❌ SÍ' if contract_exists else '✅ NO'}")
    
    match_exists = MatchRequest.objects.filter(
        id='8883d794-00f4-407a-ae8f-ffb0d2393fb1'
    ).exists()
    print(f"   MatchRequest existe: {'❌ SÍ' if match_exists else '✅ NO'}")
    
    if not contract_exists and not match_exists:
        print("\n✅ ¡Limpieza completada exitosamente!")
        print("   Ahora puedes empezar el proceso desde cero:")
        print("   1. El arrendatario puede enviar una nueva solicitud de match")
        print("   2. El arrendador puede aceptarla")
        print("   3. Continuar con el workflow normal")
    else:
        print("\n⚠️ Algunos registros no se pudieron eliminar")
        print("   Por favor, verifica manualmente en el admin de Django")
    
    # 5. Mostrar estadísticas actuales
    print("\n📈 Estadísticas actuales:")
    
    from users.models import User
    
    # Arrendador
    try:
        landlord = User.objects.get(email='admin@verihome.com')
        landlord_matches = MatchRequest.objects.filter(landlord=landlord).count()
        print(f"   Arrendador (admin@verihome.com): {landlord_matches} matches activos")
    except:
        pass
    
    # Arrendatario
    try:
        tenant = User.objects.get(email='letefon100@gmail.com')
        tenant_matches = MatchRequest.objects.filter(tenant=tenant).count()
        print(f"   Arrendatario (letefon100@gmail.com): {tenant_matches} matches activos")
    except:
        pass
    
    total_contracts = Contract.objects.filter(
        status__in=['draft', 'pending_tenant_review', 'ready_for_authentication', 'pending_biometric']
    ).count()
    print(f"   Total contratos activos en el sistema: {total_contracts}")

if __name__ == "__main__":
    reset_match_process()