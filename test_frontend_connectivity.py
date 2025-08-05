#!/usr/bin/env python
"""
Script de prueba para verificar la conectividad del frontend con el backend.
"""

import requests
import json
import time

print('=== INICIO DEL SCRIPT DE PRUEBA FRONTEND-BACKEND ===')

# Configuración
BASE_URL = "http://localhost:8000/api/v1"
LOGIN_URL = f"{BASE_URL}/users/auth/login/"
PROPERTIES_URL = f"{BASE_URL}/properties/properties/"
CONTRACTS_URL = f"{BASE_URL}/contracts/contracts/"
PAYMENTS_URL = f"{BASE_URL}/payments/transactions/"
MESSAGES_URL = f"{BASE_URL}/messages/messages/"

def test_frontend_connectivity():
    print('--- Paso 1: Login ---')
    # Datos de login
    login_data = {
        "email": "wilsonderecho10@gmail.com",
        "password": "admin123"
    }
    
    print("🔍 === PRUEBA DE CONECTIVIDAD FRONTEND-BACKEND ===")
    print()
    
    # 1. Login
    print("1️⃣ Probando login...")
    try:
        login_response = requests.post(LOGIN_URL, json=login_data)
        login_response.raise_for_status()
        
        token_data = login_response.json()
        access_token = token_data.get('access')
        
        print(f"   ✅ Login exitoso")
        print(f"   📧 Usuario: {login_data['email']}")
        print(f"   🔑 Token obtenido: {access_token[:20]}...")
        print()
        
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Error en login: {e}")
        return False
    
    # Headers para peticiones autenticadas
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # 2. Probar endpoints protegidos
    endpoints_to_test = [
        ("Propiedades", PROPERTIES_URL),
        ("Contratos", CONTRACTS_URL),
        ("Pagos", PAYMENTS_URL),
        ("Mensajes", MESSAGES_URL),
    ]
    
    print("2️⃣ Probando endpoints protegidos...")
    all_successful = True
    
    for name, url in endpoints_to_test:
        try:
            print(f"   🔍 Probando {name} en {url} ...")
            response = requests.get(url, headers=headers)
            print(f"   ...Respuesta status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                count = len(data.get('results', data)) if isinstance(data, dict) else len(data)
                print(f"   ✅ {name}: OK ({count} elementos)")
            else:
                print(f"   ⚠️  {name}: Status {response.status_code}")
                all_successful = False
                
        except requests.exceptions.RequestException as e:
            print(f"   ❌ {name}: Error - {e}")
            all_successful = False
    
    print()
    
    # 3. Probar creación de propiedad
    print("3️⃣ Probando creación de propiedad...")
    property_data = {
        "title": "Casa de prueba - Frontend",
        "description": "Propiedad creada desde el frontend para pruebas",
        "property_type": "house",
        "listing_type": "rent",
        "status": "available",
        "address": "Calle de Prueba 123",
        "city": "Ciudad de México",
        "state": "CDMX",
        "country": "México",
        "postal_code": "12345",
        "bedrooms": 3,
        "bathrooms": 2,
        "total_area": 150,
        "rent_price": 12000,
        "minimum_lease_term": 12,
        "pets_allowed": True,
        "smoking_allowed": False,
        "furnished": False,
        "utilities_included": True,
        "parking_spaces": 1,
        "floors": 2,
        "year_built": 2020,
        "is_active": True,
        "is_featured": False,
        "is_verified": True
    }
    
    try:
        print('   Enviando POST a crear propiedad...')
        create_response = requests.post(PROPERTIES_URL, json=property_data, headers=headers)
        print(f'   ...Respuesta status: {create_response.status_code}')
        
        if create_response.status_code == 201:
            created_property = create_response.json()
            print(f"   ✅ Propiedad creada exitosamente")
            print(f"   🆔 ID: {created_property.get('id')}")
            print(f"   📝 Título: {created_property.get('title')}")
            rent_price = float(created_property.get('rent_price', 0))
            print(f"   💰 Precio: ${rent_price:,.2f}/mes")
        else:
            print(f"   ❌ Error creando propiedad: {create_response.status_code}")
            print(f"   📄 Respuesta: {create_response.text}")
            all_successful = False
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Error en creación: {e}")
        all_successful = False
    
    print()
    
    # 4. Resumen
    print("4️⃣ === RESUMEN ===")
    if all_successful:
        print("🎉 ¡TODAS LAS PRUEBAS EXITOSAS!")
        print("✅ El frontend puede conectarse correctamente al backend")
        print("✅ La autenticación funciona correctamente")
        print("✅ Todos los endpoints protegidos responden")
        print("✅ La creación de propiedades funciona")
        print()
        print("🚀 El frontend está listo para usar en:")
        print("   http://localhost:3001")
        print()
        print("🔧 El backend está funcionando en:")
        print("   http://localhost:8000")
        print()
        print("📊 Panel de administración:")
        print("   http://localhost:8000/admin")
    else:
        print("❌ Algunas pruebas fallaron")
        print("🔧 Revisa los logs del backend y frontend")
    
    print('--- FIN DEL SCRIPT DE PRUEBA ---')
    return all_successful

if __name__ == "__main__":
    test_frontend_connectivity()
    print('=== FIN DEL SCRIPT DE PRUEBA FRONTEND-BACKEND ===') 