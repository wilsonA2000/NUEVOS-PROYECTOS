#!/usr/bin/env python
"""
Test simplificado para verificar el error 400 en match request
"""

import os
import sys
import django
import json

# Configurar Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "verihome.settings")
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
django.setup()

from django.contrib.auth import get_user_model
from properties.models import Property
from matching.models import MatchRequest
from matching.serializers import CreateMatchRequestSerializer

User = get_user_model()

def main():
    print("\n" + "="*80)
    print("🔍 Match Request Error 400 - Debug")
    print("="*80)
    
    # 1. Obtener tenant
    tenant = User.objects.filter(user_type='tenant').first()
    if not tenant:
        print("❌ No hay tenants disponibles")
        return
    
    print(f"✅ Tenant: {tenant.email}")
    
    # 2. Obtener propiedad disponible
    property = Property.objects.filter(
        is_active=True, 
        status='available'
    ).exclude(landlord=tenant).first()
    
    if not property:
        print("❌ No hay propiedades disponibles")
        return
        
    print(f"✅ Propiedad: {property.title} (ID: {property.id})")
    print(f"   Landlord: {property.landlord.email}")
    
    # 3. Verificar si ya existe solicitud
    existing = MatchRequest.objects.filter(
        tenant=tenant,
        property=property,
        status__in=['pending', 'viewed', 'accepted']
    ).first()
    
    if existing:
        print(f"\n⚠️ YA EXISTE una solicitud para esta propiedad:")
        print(f"   - Match Code: {existing.match_code}")
        print(f"   - Status: {existing.status}")
        print(f"   - Created: {existing.created_at}")
        print("\n🔧 SOLUCIÓN: El frontend debe verificar si ya existe una solicitud antes de permitir crear otra")
        return
    
    # 4. Preparar datos como los envía el frontend
    data = {
        'property': str(property.id),
        'tenant_message': 'Estoy muy interesado en esta propiedad',
        'tenant_phone': '',  # El frontend envía string vacío
        'tenant_email': tenant.email,
        'monthly_income': 5000000,
        'employment_type': 'other',  # El frontend usa 'other' por defecto
        'preferred_move_in_date': '2025-09-15',
        'lease_duration_months': 12,
        'has_rental_references': True,
        'has_employment_proof': True,
        'has_credit_check': False,
        'number_of_occupants': 2,
        'has_pets': False,
        'pet_details': '',
        'smoking_allowed': False,
        'priority': 'medium'  # ERROR: El frontend envía 'medium' pero debe ser 'normal'
    }
    
    print("\n📋 Datos enviados (como el frontend):")
    for key, value in data.items():
        print(f"   {key}: {value} ({type(value).__name__})")
    
    # 5. Validar con el serializer
    serializer = CreateMatchRequestSerializer(data=data)
    
    if serializer.is_valid():
        print("\n✅ Datos válidos")
    else:
        print("\n❌ ERRORES DE VALIDACIÓN:")
        for field, errors in serializer.errors.items():
            print(f"   - {field}: {errors}")
            
        # Identificar el problema específico
        if 'priority' in serializer.errors:
            print("\n🔧 PROBLEMA IDENTIFICADO: El campo 'priority'")
            print("   Frontend envía: 'medium'")
            print("   Valores válidos: 'low', 'normal', 'high', 'urgent'")
            print("\n📌 SOLUCIÓN: Cambiar 'medium' por 'normal' en el frontend")

if __name__ == "__main__":
    main()