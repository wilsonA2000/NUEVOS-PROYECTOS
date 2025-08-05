#!/usr/bin/env python3
"""
Script para probar exactamente los datos que el frontend está enviando
y reproducir el error 400 Bad Request.
"""

import os
import sys
import django
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

import requests
from django.contrib.auth import get_user_model
from django.test import Client
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import json

User = get_user_model()

def test_exact_frontend_data():
    """Prueba los datos exactos que envía el frontend."""
    
    print("🧪 TESTING EXACT FRONTEND DATA")
    print("=" * 50)
    
    # Obtener usuario landlord
    try:
        user = User.objects.get(email='landlord@test.com')
        print(f"✅ Usuario encontrado: {user.email}")
    except User.DoesNotExist:
        print("❌ Usuario no encontrado")
        return
    
    # Crear token JWT
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)
    
    print(f"🔑 Token JWT: {access_token[:20]}...")
    
    # Datos exactos del FormData del frontend (basados en logs)
    formdata_exact = {
        'title': 'bucaramanga casa',
        'description': 'casa hermosa bucarmnga',
        'property_type': 'house',
        'listing_type': 'rent',
        'address': 'calle 123',
        'city': 'bucaramanga',
        'state': 'santander',
        'country': 'colombia',
        'postal_code': '680001',
        'bedrooms': '3',
        'bathrooms': '2.0',
        'total_area': '150.50',
        'lot_area': '200.00',
        'year_built': '2020',
        'rent_price': '1200000',
        'security_deposit': '1200000',
        'utilities_included': 'agua,luz, telefono, internet',
        'furnished': 'false',
        'pets_allowed': 'false',
        'smoking_allowed': 'false',
        'property_features': 'jardin amplio',
        'nearby_amenities': 'zona verde',
        'transportation': 'metrolinea',
        'available_from': '2024-01-15',
        'latitude': '7.119349',
        'longitude': '-73.122742',
        'parking_spaces': '1',
        'floors': '2',
        'minimum_lease_term': '12'
    }
    
    print("\n📋 DATOS EXACTOS DEL FRONTEND:")
    for key, value in formdata_exact.items():
        print(f"  {key}: {value}")
    
    print("\n🧪 PRUEBA 1: Usando APIClient (simulando frontend)")
    
    # Crear cliente API
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    
    # Hacer request POST como lo haría el frontend
    response = client.post('/api/v1/properties/properties/', formdata_exact, format='multipart')
    
    print(f"📊 Response Status: {response.status_code}")
    print(f"📊 Response Data: {response.data}")
    
    if response.status_code != 201:
        print("❌ REQUEST FALLÓ")
        print(f"🚨 Error Details: {response.data}")
        
        # Analizar qué campos están causando el error
        if 'errors' in response.data:
            print("\n🔍 ANÁLISIS DE ERRORES:")
            for field, errors in response.data['errors'].items():
                print(f"  ❌ Campo '{field}': {errors}")
        elif isinstance(response.data, dict):
            print("\n🔍 ANÁLISIS DE ERRORES:")
            for field, errors in response.data.items():
                print(f"  ❌ Campo '{field}': {errors}")
    else:
        print("✅ REQUEST EXITOSO")
        print(f"🎉 Propiedad creada: {response.data.get('id')}")
    
    print("\n🧪 PRUEBA 2: Usando requests directamente")
    
    # Test con requests directamente
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # Convertir FormData a JSON
    json_data = {}
    for key, value in formdata_exact.items():
        if key in ['utilities_included', 'property_features', 'nearby_amenities', 'transportation']:
            # Convertir strings a arrays
            if isinstance(value, str):
                json_data[key] = [item.strip() for item in value.split(',') if item.strip()]
            else:
                json_data[key] = value
        elif key in ['furnished', 'pets_allowed', 'smoking_allowed']:
            json_data[key] = value.lower() == 'true' if isinstance(value, str) else bool(value)
        else:
            json_data[key] = value
    
    print("\n📋 DATOS CONVERTIDOS A JSON:")
    for key, value in json_data.items():
        print(f"  {key}: {value} (type: {type(value)})")
    
    try:
        response2 = requests.post(
            'http://localhost:8000/api/v1/properties/properties/',
            json=json_data,
            headers=headers
        )
        
        print(f"\n📊 Requests Response Status: {response2.status_code}")
        print(f"📊 Requests Response Data: {response2.json()}")
        
        if response2.status_code != 201:
            print("❌ REQUESTS FALLÓ")
            error_data = response2.json()
            print(f"🚨 Error Details: {error_data}")
        else:
            print("✅ REQUESTS EXITOSO")
            
    except requests.exceptions.ConnectionError:
        print("❌ NO SE PUDO CONECTAR AL SERVIDOR")
        print("   Asegúrate de que el servidor Django esté ejecutándose en localhost:8000")
    except Exception as e:
        print(f"❌ ERROR EN REQUESTS: {e}")
    
    print("\n🧪 PRUEBA 3: Analizando el serializer actual")
    
    # Importar el serializer
    from properties.optimized_serializers import OptimizedCreatePropertySerializer
    
    # Campos disponibles en el serializer
    serializer_fields = list(OptimizedCreatePropertySerializer().fields.keys())
    print(f"\n📋 CAMPOS DEL SERIALIZER: {serializer_fields}")
    
    # Campos faltantes
    formdata_keys = set(formdata_exact.keys())
    serializer_keys = set(serializer_fields)
    
    missing_in_serializer = formdata_keys - serializer_keys
    missing_in_formdata = serializer_keys - formdata_keys
    
    print(f"\n🔍 CAMPOS FALTANTES EN SERIALIZER: {missing_in_serializer}")
    print(f"🔍 CAMPOS FALTANTES EN FORMDATA: {missing_in_formdata}")
    
    print("\n" + "=" * 50)
    print("🏁 TESTING COMPLETO")

if __name__ == "__main__":
    test_exact_frontend_data()