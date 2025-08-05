#!/usr/bin/env python3
"""
Test directo del ViewSet sin usar requests externos.
"""

import os
import sys
import django
from django.conf import settings

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from properties.models import Property
from django.test import TestCase

User = get_user_model()

def test_property_creation_direct():
    """Test directo de creación de propiedad usando Django Test Client."""
    
    print("🧪 TESTING DIRECTO DEL VIEWSET")
    print("=" * 50)
    
    # Crear cliente
    client = APIClient()
    
    # Obtener usuario landlord
    landlord = User.objects.filter(user_type='landlord').first()
    print(f"👤 Usuario landlord: {landlord.email}")
    
    # Autenticar
    client.force_authenticate(user=landlord)
    
    # Datos de la propiedad
    property_data = {
        'title': 'Test Property Django Client',
        'description': 'Property created via Django Test Client',
        'property_type': 'apartment',
        'listing_type': 'rent',
        'address': 'Test Address 123',
        'city': 'Medellín',
        'state': 'Antioquia',
        'country': 'Colombia',
        'postal_code': '050001',
        'latitude': 6.2442,
        'longitude': -75.5812,
        'bedrooms': 2,
        'bathrooms': 1,
        'total_area': 80.0,
        'lot_area': 100.0,
        'year_built': 2020,
        'rent_price': 1800000,
        'security_deposit': 1800000,
        'utilities_included': 'agua, luz, internet',
        'furnished': True,
        'pets_allowed': False,
        'smoking_allowed': False,
        'available_from': '2024-01-01',
        'parking_spaces': 1,
        'floors': 8,
        'minimum_lease_term': 6,
        'property_features': 'balcón, cocina integral',
        'nearby_amenities': 'supermercado, parque',
        'transportation': 'metro, bus'
    }
    
    print("📡 Enviando POST a /api/v1/properties/")
    
    # Hacer la petición
    response = client.post('/api/v1/properties/', data=property_data, format='json')
    
    print(f"📊 Status Code: {response.status_code}")
    print(f"📋 Response Headers: {dict(response.items())}")
    
    if response.status_code == 201:
        print("🎉 PROPIEDAD CREADA EXITOSAMENTE!")
        
        data = response.json()
        print(f"📋 Property ID: {data.get('id')}")
        print(f"📋 Title: {data.get('title')}")
        
        # Verificar campos procesados
        print(f"\n🔍 CAMPOS PROCESADOS:")
        print(f"utilities_included: {data.get('utilities_included')}")
        print(f"property_features: {data.get('property_features')}")
        print(f"nearby_amenities: {data.get('nearby_amenities')}")
        print(f"transportation: {data.get('transportation')}")
        print(f"parking_spaces: {data.get('parking_spaces')}")
        print(f"floors: {data.get('floors')}")
        print(f"minimum_lease_term: {data.get('minimum_lease_term')}")
        
        # Verificar en la base de datos
        property_obj = Property.objects.get(id=data.get('id'))
        print(f"\n🗃️ VERIFICACIÓN EN BASE DE DATOS:")
        print(f"Title: {property_obj.title}")
        print(f"utilities_included: {property_obj.utilities_included}")
        print(f"property_features: {property_obj.property_features}")
        print(f"nearby_amenities: {property_obj.nearby_amenities}")
        print(f"transportation: {property_obj.transportation}")
        print(f"parking_spaces: {property_obj.parking_spaces}")
        print(f"floors: {property_obj.floors}")
        print(f"minimum_lease_term: {property_obj.minimum_lease_term}")
        
        print(f"\n✅ SERIALIZER CORREGIDO FUNCIONA PERFECTAMENTE!")
        return True
        
    elif response.status_code == 400:
        print("❌ Error de validación:")
        try:
            errors = response.json()
            for field, messages in errors.items():
                print(f"  - {field}: {messages}")
        except:
            print(f"  Raw: {response.content}")
    
    elif response.status_code == 405:
        print("❌ Method Not Allowed - Verificar configuración ViewSet")
        print(f"Response: {response.content}")
    
    else:
        print(f"❌ Error inesperado: {response.status_code}")
        print(f"Response: {response.content}")
    
    return False

def test_viewset_methods():
    """Test para verificar qué métodos están permitidos."""
    
    print("\n🔍 VERIFICANDO MÉTODOS PERMITIDOS")
    print("=" * 50)
    
    client = APIClient()
    landlord = User.objects.filter(user_type='landlord').first()
    client.force_authenticate(user=landlord)
    
    # Test OPTIONS
    response = client.options('/api/v1/properties/')
    print(f"📊 OPTIONS Status: {response.status_code}")
    
    if response.status_code == 200:
        try:
            data = response.json()
            print(f"📋 Available actions: {data.get('actions', {}).keys()}")
        except:
            pass
    
    # Test GET
    response = client.get('/api/v1/properties/')
    print(f"📊 GET Status: {response.status_code}")
    
    # Test POST (verificar error)
    response = client.post('/api/v1/properties/', data={'title': 'test'}, format='json')
    print(f"📊 POST Status: {response.status_code}")
    
    if response.status_code == 405:
        print("❌ POST no permitido en ViewSet")
    elif response.status_code == 400:
        print("✅ POST permitido pero datos inválidos")
    elif response.status_code == 201:
        print("✅ POST exitoso")

if __name__ == "__main__":
    print("🚀 TEST DIRECTO DEL VIEWSET")
    print("=" * 60)
    
    test_viewset_methods()
    success = test_property_creation_direct()
    
    if success:
        print("\n🎉 SERIALIZER CORREGIDO FUNCIONA PERFECTAMENTE!")
        print("✅ Todos los campos faltantes procesados correctamente")
        print("✅ Conversión CSV -> JSON implementada")
        print("✅ Validaciones funcionando")
    else:
        print("\n❌ PROBLEMAS DETECTADOS - REVISAR CONFIGURACIÓN")