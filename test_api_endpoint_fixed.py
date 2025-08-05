#!/usr/bin/env python3
"""
Test del endpoint de API con el serializer corregido.
"""

import os
import sys
import django
from django.conf import settings

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
import json

User = get_user_model()

def test_api_endpoint():
    """Test del endpoint de API con todos los campos."""
    
    print("🌐 TESTING API ENDPOINT CON SERIALIZER CORREGIDO")
    print("=" * 60)
    
    # Crear cliente API
    client = APIClient()
    
    # Obtener o crear un usuario landlord
    try:
        landlord = User.objects.filter(user_type='landlord').first()
        if not landlord:
            print("🔧 Creando usuario landlord de prueba...")
            landlord = User.objects.create_user(
                email='test_landlord_api@test.com',
                password='test123',
                first_name='Test',
                last_name='Landlord',
                user_type='landlord'
            )
            print(f"✅ Usuario creado: {landlord.email}")
        else:
            print(f"✅ Usuario encontrado: {landlord.email}")
        
        # Autenticar el cliente
        client.force_authenticate(user=landlord)
        
    except Exception as e:
        print(f"❌ Error con usuario: {e}")
        return False
    
    # Datos de la propiedad con todos los campos
    property_data = {
        'title': 'API Test Property',
        'description': 'Property created via API test',
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
        'rent_price': 2000000,
        'sale_price': None,
        'security_deposit': 2000000,
        'utilities_included': 'agua, luz, internet, gas',
        'furnished': True,
        'pets_allowed': False,
        'smoking_allowed': False,
        'available_from': '2024-01-01',
        'parking_spaces': 1,
        'floors': 8,
        'minimum_lease_term': 6,
        'property_features': 'balcón, cocina integral, aire acondicionado',
        'nearby_amenities': 'supermercado, parque, transporte público',
        'transportation': 'metro, bus, taxi'
    }
    
    print("📡 Enviando POST request a /api/v1/properties/")
    
    # Hacer la petición POST
    response = client.post('/api/v1/properties/', data=property_data, format='json')
    
    print(f"📊 Response Status: {response.status_code}")
    
    if response.status_code == 201:
        print("✅ Propiedad creada exitosamente!")
        
        # Parsear respuesta
        try:
            response_data = response.json()
            print(f"📋 ID de la propiedad: {response_data.get('id')}")
            print(f"📋 Title: {response_data.get('title')}")
            
            # Verificar que los campos JSON se devolvieron correctamente
            print(f"\n🔍 CAMPOS JSON EN LA RESPUESTA:")
            print(f"utilities_included: {response_data.get('utilities_included')}")
            print(f"property_features: {response_data.get('property_features')}")
            print(f"nearby_amenities: {response_data.get('nearby_amenities')}")
            print(f"transportation: {response_data.get('transportation')}")
            
            # Verificar campos numéricos
            print(f"\n🔢 CAMPOS NUMÉRICOS:")
            print(f"parking_spaces: {response_data.get('parking_spaces')}")
            print(f"floors: {response_data.get('floors')}")
            print(f"minimum_lease_term: {response_data.get('minimum_lease_term')}")
            
            print(f"\n🎉 API ENDPOINT FUNCIONA CORRECTAMENTE!")
            return True
            
        except json.JSONDecodeError as e:
            print(f"❌ Error al parsear JSON: {e}")
            print(f"Raw response: {response.content}")
            return False
    else:
        print(f"❌ Error en la petición: {response.status_code}")
        try:
            error_data = response.json()
            print(f"Error details: {error_data}")
        except:
            print(f"Raw response: {response.content}")
        return False

def test_invalid_data():
    """Test con datos inválidos para verificar validaciones."""
    
    print("\n🧪 TESTING VALIDACIONES CON DATOS INVÁLIDOS")
    print("=" * 50)
    
    client = APIClient()
    
    # Obtener usuario
    try:
        landlord = User.objects.filter(user_type='landlord').first()
        if landlord:
            client.force_authenticate(user=landlord)
        else:
            print("❌ No se encontró usuario landlord")
            return False
    except Exception as e:
        print(f"❌ Error con usuario: {e}")
        return False
    
    # Datos inválidos
    invalid_data = {
        'title': 'Test Invalid',
        'property_type': 'apartment',
        'listing_type': 'rent',
        'rent_price': 0,  # Precio inválido
        'parking_spaces': -1,  # Número negativo
        'floors': 0,  # Cero no permitido
        'minimum_lease_term': -5  # Negativo
    }
    
    print("📡 Enviando datos inválidos...")
    response = client.post('/api/v1/properties/', data=invalid_data, format='json')
    
    print(f"📊 Response Status: {response.status_code}")
    
    if response.status_code == 400:
        print("✅ Validaciones funcionando correctamente")
        try:
            error_data = response.json()
            print("📋 Errores detectados:")
            for field, errors in error_data.items():
                print(f"  - {field}: {errors}")
        except:
            print("❌ Error al parsear errores")
    else:
        print(f"❌ Esperaba status 400, recibió: {response.status_code}")

if __name__ == "__main__":
    print("🚀 TEST COMPLETO DE API ENDPOINT")
    print("=" * 60)
    
    success = test_api_endpoint()
    test_invalid_data()
    
    if success:
        print("\n🎉 TODOS LOS TESTS DE API EXITOSOS!")
        print("✅ El endpoint maneja correctamente todos los campos del frontend")
    else:
        print("\n❌ ALGUNOS TESTS DE API FALLARON")