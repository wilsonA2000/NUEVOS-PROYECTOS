#!/usr/bin/env python3
"""
Script para probar el registro de usuarios desde el frontend
"""

import requests
import json
import time

# Configuración
API_BASE_URL = "http://localhost:8000/api/v1"

def test_registration_endpoint():
    """Prueba el endpoint de registro"""
    print("🔍 Probando endpoint de registro...")
    
    # Datos de prueba para registro
    registration_data = {
        "email": f"test_landlord_{int(time.time())}@example.com",
        "password": "testpass123",
        "first_name": "Usuario",
        "last_name": "Arrendador",
        "user_type": "landlord"
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/register/", 
            json=registration_data,
            timeout=10
        )
        
        print(f"📡 Status Code: {response.status_code}")
        print(f"📡 Response Headers: {dict(response.headers)}")
        print(f"📡 Response Body: {response.text}")
        
        if response.status_code == 201:
            print("✅ Registro exitoso")
            return response.json()
        else:
            print(f"❌ Error en registro: {response.status_code}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error de conexión: {e}")
        return None

def test_login_after_registration(email, password):
    """Prueba el login después del registro"""
    print(f"🔐 Probando login con usuario recién creado: {email}")
    
    login_data = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/auth/login/", 
            json=login_data,
            timeout=10
        )
        
        if response.status_code == 200:
            token = response.json().get('access')
            print("✅ Login exitoso después del registro")
            return token
        else:
            print(f"❌ Error en login: {response.status_code} - {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error de conexión en login: {e}")
        return None

def test_property_creation_with_new_user(token):
    """Prueba la creación de propiedad con el usuario recién registrado"""
    print("🏠 Probando creación de propiedad con usuario arrendador...")
    
    property_data = {
        "title": "Propiedad de Prueba - Arrendador",
        "description": "Propiedad creada por usuario arrendador recién registrado",
        "property_type": "apartment",
        "listing_type": "rent",
        "status": "available",
        "address": "Calle de Prueba 789",
        "city": "Ciudad de Prueba",
        "state": "Estado de Prueba",
        "country": "México",
        "postal_code": "54321",
        "latitude": 19.4326,
        "longitude": -99.1332,
        "bedrooms": 2,
        "bathrooms": 1,
        "total_area": 80,
        "rent_price": 8000,
        "pets_allowed": True,
        "smoking_allowed": False,
        "furnished": False
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/properties/properties/", 
            json=property_data,
            headers=headers,
            timeout=10
        )
        
        if response.status_code == 201:
            print("✅ Propiedad creada exitosamente por usuario arrendador")
            return True
        else:
            print(f"❌ Error creando propiedad: {response.status_code}")
            print(f"   Respuesta: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error de conexión: {e}")
        return False

def main():
    """Función principal de pruebas"""
    print("🚀 Iniciando pruebas de registro desde frontend")
    print("=" * 60)
    
    # Prueba 1: Registro
    registration_result = test_registration_endpoint()
    
    if not registration_result:
        print("❌ El registro falló. Revisa el backend.")
        return
    
    # Extraer email del resultado
    email = registration_result.get('email', f"test_landlord_{int(time.time())}@example.com")
    password = "testpass123"
    
    # Prueba 2: Login después del registro
    token = test_login_after_registration(email, password)
    
    if not token:
        print("❌ El login después del registro falló.")
        return
    
    # Prueba 3: Creación de propiedad
    property_created = test_property_creation_with_new_user(token)
    
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS:")
    print(f"   Registro: {'✅' if registration_result else '❌'}")
    print(f"   Login post-registro: {'✅' if token else '❌'}")
    print(f"   Creación de propiedad: {'✅' if property_created else '❌'}")
    
    if registration_result and token and property_created:
        print("\n✅ Todas las pruebas pasaron. El flujo completo funciona.")
        print("   El problema puede estar en el frontend (React).")
    else:
        print("\n❌ Algunas pruebas fallaron. Revisa el backend.")

if __name__ == "__main__":
    main() 