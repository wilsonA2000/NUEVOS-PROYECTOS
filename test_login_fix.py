#!/usr/bin/env python3
"""
Script para probar que el login ahora funciona correctamente con CustomTokenObtainPairView
"""

import requests
import json
import time
from datetime import datetime

# Configuración
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/api/v1"

def print_header(title):
    """Imprime un encabezado formateado"""
    print("\n" + "="*60)
    print(f"🧪 {title}")
    print("="*60)

def print_success(message):
    """Imprime un mensaje de éxito"""
    print(f"✅ {message}")

def print_error(message):
    """Imprime un mensaje de error"""
    print(f"❌ {message}")

def print_info(message):
    """Imprime un mensaje informativo"""
    print(f"ℹ️  {message}")

def test_login_with_unverified_user():
    """Prueba el login con un usuario no verificado"""
    print_header("PRUEBA: Login con usuario no verificado")
    
    # Primero crear un usuario no verificado
    user_data = {
        "email": f"test_unverified_{int(time.time())}@example.com",
        "password": "TestPassword123!",
        "password2": "TestPassword123!",
        "first_name": "Usuario",
        "last_name": "No Verificado",
        "user_type": "tenant",
        "phone_number": "3001234567",
        "interview_code": "TEST123",
        "terms_accepted": True,
        "privacy_policy_accepted": True
    }
    
    try:
        # Crear usuario
        print("📝 Creando usuario no verificado...")
        register_response = requests.post(
            f"{API_BASE}/auth/register/",
            json=user_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if register_response.status_code == 201:
            print_success("✅ Usuario creado exitosamente")
            
            # Intentar hacer login con el usuario no verificado
            print("🔐 Intentando login con usuario no verificado...")
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"]
            }
            
            login_response = requests.post(
                f"{API_BASE}/auth/login/",
                json=login_data,
                headers={'Content-Type': 'application/json'}
            )
            
            print(f"   Status: {login_response.status_code}")
            print(f"   Response: {login_response.text}")
            
            if login_response.status_code == 401:
                response_data = login_response.json()
                if "No está autorizada" in response_data.get("detail", ""):
                    print_success("✅ Mensaje de autorización correcto - CustomTokenObtainPairView funcionando")
                else:
                    print_error("❌ Mensaje de error inesperado")
            else:
                print_error(f"❌ Status inesperado: {login_response.status_code}")
                
        else:
            print_error(f"❌ Error creando usuario: {register_response.status_code}")
            print(f"   Response: {register_response.text}")
            
    except Exception as e:
        print_error(f"Error en la prueba: {e}")

def test_login_with_invalid_credentials():
    """Prueba el login con credenciales inválidas"""
    print_header("PRUEBA: Login con credenciales inválidas")
    
    test_cases = [
        {
            "name": "Email inexistente",
            "data": {
                "email": "usuario_inexistente@test.com",
                "password": "password123"
            }
        },
        {
            "name": "Contraseña incorrecta",
            "data": {
                "email": "test@example.com",
                "password": "contraseña_incorrecta"
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\n📝 Probando: {test_case['name']}")
        try:
            response = requests.post(
                f"{API_BASE}/auth/login/",
                json=test_case['data'],
                headers={'Content-Type': 'application/json'}
            )
            
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.text[:200]}...")
            
            if response.status_code == 401:
                print_success("✅ Error 401 recibido correctamente")
            else:
                print_error(f"❌ Status inesperado: {response.status_code}")
                
        except Exception as e:
            print_error(f"Error en la petición: {e}")

def main():
    """Función principal"""
    print_header("INICIANDO PRUEBAS DE LOGIN CON CUSTOMTOKENOBTAINPAIRVIEW")
    print_info(f"Servidor: {BASE_URL}")
    print_info(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # Probar conexión al servidor
        print("\n🔗 Probando conexión al servidor...")
        response = requests.get(f"{BASE_URL}/")
        if response.status_code == 200:
            print_success("✅ Servidor respondiendo correctamente")
        else:
            print_error("❌ Servidor no responde correctamente")
            return
    except Exception as e:
        print_error(f"❌ No se puede conectar al servidor: {e}")
        return
    
    # Ejecutar pruebas
    test_login_with_invalid_credentials()
    test_login_with_unverified_user()
    
    print_header("PRUEBAS COMPLETADAS")
    print_success("🎉 Todas las pruebas han sido ejecutadas")
    print_info("Si ves 'CustomTokenObtainPairView funcionando', el fix está aplicado correctamente")

if __name__ == "__main__":
    main() 