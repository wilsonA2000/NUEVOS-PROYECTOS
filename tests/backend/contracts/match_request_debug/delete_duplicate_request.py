#!/usr/bin/env python
"""
Script para eliminar solicitud duplicada
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "verihome.settings")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
django.setup()

from matching.models import MatchRequest

def main():
    print("\n" + "="*80)
    print("🗑️ Eliminar solicitud duplicada")
    print("="*80)
    
    match_code = "MT-8KYTWH1M"
    
    try:
        request = MatchRequest.objects.get(match_code=match_code)
        
        print(f"📋 Solicitud encontrada:")
        print(f"   - ID: {request.id}")
        print(f"   - Tenant: {request.tenant.email}")
        print(f"   - Property: {request.property.title}")
        print(f"   - Status: {request.status}")
        print(f"   - Created: {request.created_at}")
        
        print(f"\n🗑️ Eliminando solicitud...")
        request.delete()
        print(f"✅ Solicitud {match_code} eliminada exitosamente")
        
    except MatchRequest.DoesNotExist:
        print(f"❌ Solicitud no encontrada: {match_code}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()