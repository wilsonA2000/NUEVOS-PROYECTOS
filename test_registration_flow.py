#\!/usr/bin/env python3
"""
Script completo para probar el flujo de registro con código de entrevista en VeriHome.
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1"

def test_interview_code_validation():
    """Probar endpoint de validación de código de entrevista."""
    print("🧪 TESTING: Validación de código de entrevista")
    print("=" * 50)
    
    # Código válido
    url = f"{BASE_URL}/users/auth/validate-interview-code/"
    data = {"interview_code": "VH-OSZI-4918"}
    
    try:
        response = requests.post(url, json=data)
        print(f"📡 URL: {url}")
        print(f"📤 Request: {json.dumps(data, indent=2)}")
        print(f"📥 Status: {response.status_code}")
        print(f"📥 Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('is_valid'):
                print("✅ Código válido confirmado")
                return result.get('code_data')
            else:
                print("❌ Código no válido")
                return None
        else:
            print(f"❌ Error en validación: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error en request: {e}")
        return None

def test_registration_with_code():
    """Probar registro con código de entrevista."""
    print("\n🧪 TESTING: Registro con código de entrevista")
    print("=" * 50)
    
    url = f"{BASE_URL}/users/auth/register/"
    data = {
        "email": "maria.gonzalez@email.com",
        "password": "testpass123",
        "password2": "testpass123",
        "first_name": "María",
        "last_name": "González",
        "user_type": "landlord",
        "interview_code": "VH-YCOG-8752",
        "phone_number": "+57 301 234 5678"
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"📡 URL: {url}")
        print(f"📤 Request: {json.dumps(data, indent=2)}")
        print(f"📥 Status: {response.status_code}")
        print(f"📥 Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 201:
            print("✅ Registro exitoso")
            return response.json()
        else:
            print(f"❌ Error en registro: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"❌ Error en request: {e}")
        return None

def main():
    """Ejecutar tests principales."""
    print("🚀 INICIANDO TESTING DEL FLUJO DE REGISTRO")
    print("=" * 60)
    
    # Test 1: Validar código
    code_data = test_interview_code_validation()
    
    # Test 2: Registro con código
    if code_data:
        registration_result = test_registration_with_code()
        if registration_result:
            print("\n🎉 ¡FLUJO COMPLETO EXITOSO\!")
        else:
            print("\n❌ Error en el registro")
    else:
        print("\n❌ No se pudo validar el código")

if __name__ == '__main__':
    main()
