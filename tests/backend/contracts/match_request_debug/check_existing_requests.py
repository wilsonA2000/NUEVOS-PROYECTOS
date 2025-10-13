#!/usr/bin/env python
"""
Script para verificar solicitudes de match existentes
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "verihome.settings")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
django.setup()

from django.contrib.auth import get_user_model
from properties.models import Property
from matching.models import MatchRequest

User = get_user_model()

def main():
    print("\n" + "="*80)
    print("🔍 Verificar solicitudes de match existentes")
    print("="*80)
    
    # Buscar el usuario y la propiedad del error
    tenant_email = "letefon100@gmail.com"
    property_id = "ccdb7264-a289-4878-8a17-e25cac72ea1c"
    
    try:
        tenant = User.objects.get(email=tenant_email)
        property = Property.objects.get(id=property_id)
        
        print(f"✅ Tenant: {tenant.email} (ID: {tenant.id})")
        print(f"✅ Propiedad: {property.title} (ID: {property.id})")
        
        # Buscar solicitudes existentes
        existing_requests = MatchRequest.objects.filter(
            tenant=tenant,
            property=property
        ).order_by('-created_at')
        
        print(f"\n📋 Solicitudes encontradas: {existing_requests.count()}")
        
        for i, request in enumerate(existing_requests, 1):
            print(f"\n{i}. Match Request:")
            print(f"   - ID: {request.id}")
            print(f"   - Match Code: {request.match_code}")
            print(f"   - Status: {request.status}")
            print(f"   - Created: {request.created_at}")
            print(f"   - Priority: {request.priority}")
            print(f"   - Message: {request.tenant_message[:50]}...")
        
        # Buscar solicitudes en estados que bloquean nuevas solicitudes
        blocking_requests = existing_requests.filter(
            status__in=['pending', 'viewed', 'accepted']
        )
        
        print(f"\n🚫 Solicitudes que bloquean nuevas: {blocking_requests.count()}")
        
        if blocking_requests.exists():
            print("\n🔧 OPCIONES DE SOLUCIÓN:")
            print("1. Eliminar solicitudes duplicadas:")
            for req in blocking_requests:
                print(f"   - {req.match_code} ({req.status}) - Created: {req.created_at}")
            
            print("\n2. O modificar el frontend para:")
            print("   - Verificar si ya existe una solicitud antes de mostrar el formulario")
            print("   - Mostrar el estado de la solicitud existente")
            print("   - Permitir actualizar/cancelar la solicitud existente")
            
            # Preguntar si eliminar
            response = input("\n¿Eliminar solicitudes duplicadas? (y/N): ").lower().strip()
            if response == 'y':
                deleted_count = 0
                for req in blocking_requests:
                    print(f"Eliminando: {req.match_code}")
                    req.delete()
                    deleted_count += 1
                print(f"✅ {deleted_count} solicitudes eliminadas")
            else:
                print("❌ No se eliminaron solicitudes")
        else:
            print("✅ No hay solicitudes que bloqueen nuevas solicitudes")
    
    except User.DoesNotExist:
        print(f"❌ Usuario no encontrado: {tenant_email}")
    except Property.DoesNotExist:
        print(f"❌ Propiedad no encontrada: {property_id}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()