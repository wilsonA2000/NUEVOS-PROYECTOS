#!/usr/bin/env python
"""
Script para probar registro desde frontend con URL corregida
"""
import requests
import json

def test_registro_url_corregida():
    """Probar el registro con la URL corregida"""
    print("🧪 PROBANDO REGISTRO CON URL CORREGIDA")
    print("=" * 50)
    
    # URL corregida
    base_url = "http://localhost:8000"
    register_url = f"{base_url}/api/v1/users/auth/register/"
    
    # Datos del usuario de prueba
    usuario_test = {
        "email": "letefon100@gmail.com",
        "password": "6561132wilsonA",
        "password2": "6561132wilsonA",
        "first_name": "leidy tehany",
        "last_name": "fonseca amorocho",
        "user_type": "landlord",
        "phone_number": "+573001234567"
    }
    
    print(f"📧 Registrando usuario: {usuario_test['email']}")
    print(f"🔗 URL: {register_url}")
    
    try:
        # Hacer la petición POST
        response = requests.post(
            register_url,
            json=usuario_test,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout=30
        )
        
        print(f"📡 Status Code: {response.status_code}")
        print(f"📋 Response Text: {response.text}")
        
        if response.status_code == 201:
            data = response.json()
            print("✅ REGISTRO EXITOSO")
            print(f"   📧 Email: {data.get('email')}")
            print(f"   🆔 User ID: {data.get('user_id')}")
            print(f"   📬 Email enviado: {data.get('email_sent')}")
            print(f"   💬 Mensaje: {data.get('message')}")
            return True
        elif response.status_code == 400:
            try:
                error_data = response.json()
                print("❌ ERROR 400 - BAD REQUEST")
                print(f"   📋 Error: {error_data}")
                if 'email' in error_data:
                    print(f"   📧 Error de email: {error_data['email']}")
                return False
            except:
                print("❌ ERROR 400 - No se pudo parsear la respuesta JSON")
                return False
        else:
            print("❌ ERROR EN REGISTRO")
            print(f"   📋 Respuesta: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: No se puede conectar a Django")
        print("   🚀 Asegúrate de que Django esté corriendo en localhost:8000")
        print("   💡 Ejecuta: python manage.py runserver")
        return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_url_actual_frontend():
    """Probar con la URL que usa actualmente el frontend"""
    print("\n🌐 PROBANDO URL QUE USA EL FRONTEND")
    print("=" * 50)
    
    # URL incorrecta que usaba el frontend
    base_url = "http://localhost:8000"
    register_url_old = f"{base_url}/api/v1/auth/register/"
    
    print(f"🔗 URL anterior (incorrecta): {register_url_old}")
    
    try:
        response = requests.post(
            register_url_old,
            json={"test": "data"},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        print(f"📡 Status Code: {response.status_code}")
        if response.status_code == 404:
            print("✅ CONFIRMADO: URL anterior da 404 (era incorrecta)")
        else:
            print(f"❓ Respuesta inesperada: {response.text}")
    except Exception as e:
        print(f"❌ Error probando URL anterior: {e}")

def main():
    """Ejecutar todas las pruebas"""
    print("🔧 PRUEBAS DE URL DE REGISTRO")
    print("=" * 60)
    
    # Probar URL incorrecta anterior
    test_url_actual_frontend()
    
    # Probar URL corregida
    registro_ok = test_registro_url_corregida()
    
    print("\n🎯 RESULTADO FINAL")
    print("=" * 60)
    if registro_ok:
        print("🎉 REGISTRO FUNCIONA CON URL CORREGIDA")
        print("📧 Ahora revisa:")
        print("   1. Logs de Django en la consola del servidor")
        print("   2. Correos enviados en verihomeadmi@gmail.com")
        print("   3. Bandeja de letefon100@gmail.com (incluir spam)")
    else:
        print("❌ REGISTRO SIGUE FALLANDO")
        print("🔍 Revisa logs de Django para más detalles")

if __name__ == '__main__':
    main()