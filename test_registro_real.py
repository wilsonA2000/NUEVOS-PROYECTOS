#!/usr/bin/env python
"""
Script para simular registro real de usuario usando la API
"""
import requests
import json

def test_registro_completo():
    """Probar el registro completo usando la API real"""
    print("🧪 PROBANDO REGISTRO REAL VIA API")
    print("=" * 50)
    
    # URL de la API
    base_url = "http://localhost:8000"
    register_url = f"{base_url}/api/v1/users/auth/register/"
    
    # Datos del usuario de prueba
    usuario_test = {
        "email": "test_api_real@gmail.com",
        "password": "test123456",
        "password2": "test123456",
        "first_name": "Test",
        "last_name": "API Real",
        "user_type": "tenant",
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
        print(f"📋 Headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            data = response.json()
            print("✅ REGISTRO EXITOSO")
            print(f"   📧 Email: {data.get('email')}")
            print(f"   🆔 User ID: {data.get('user_id')}")
            print(f"   📬 Email enviado: {data.get('email_sent')}")
            print(f"   💬 Mensaje: {data.get('message')}")
            return True
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

def test_login_sin_verificar():
    """Probar login con usuario no verificado"""
    print("\n🔐 PROBANDO LOGIN SIN VERIFICAR")
    print("=" * 50)
    
    login_url = "http://localhost:8000/api/v1/users/auth/login/"
    
    login_data = {
        "email": "test_api_real@gmail.com",
        "password": "test123456"
    }
    
    try:
        response = requests.post(
            login_url,
            json=login_data,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout=30
        )
        
        print(f"📡 Status Code: {response.status_code}")
        
        if response.status_code == 400:
            data = response.json()
            print("✅ LOGIN BLOQUEADO CORRECTAMENTE")
            print(f"   💬 Mensaje: {data.get('detail')}")
            print(f"   📧 Email verificado: {data.get('email_verified')}")
            print(f"   📧 Email usuario: {data.get('user_email')}")
            return True
        else:
            print("❌ LOGIN NO BLOQUEADO")
            print(f"   📋 Respuesta: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_reenvio_confirmacion():
    """Probar reenvío de email de confirmación"""
    print("\n📬 PROBANDO REENVÍO DE CONFIRMACIÓN")
    print("=" * 50)
    
    resend_url = "http://localhost:8000/api/v1/users/auth/resend-confirmation/"
    
    resend_data = {
        "email": "test_api_real@gmail.com"
    }
    
    try:
        response = requests.post(
            resend_url,
            json=resend_data,
            headers={
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout=30
        )
        
        print(f"📡 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ REENVÍO EXITOSO")
            print(f"   💬 Mensaje: {data.get('message')}")
            return True
        else:
            print("❌ ERROR EN REENVÍO")
            print(f"   📋 Respuesta: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    """Ejecutar todas las pruebas"""
    print("🚀 PRUEBAS COMPLETAS DE REGISTRO Y EMAIL")
    print("=" * 60)
    
    # Probar registro
    registro_ok = test_registro_completo()
    
    # Probar login sin verificar
    login_bloqueado = test_login_sin_verificar()
    
    # Probar reenvío
    reenvio_ok = test_reenvio_confirmacion()
    
    print("\n🎯 RESULTADOS FINALES")
    print("=" * 60)
    print(f"📝 Registro: {'✅ FUNCIONA' if registro_ok else '❌ FALLA'}")
    print(f"🔐 Login bloqueado: {'✅ FUNCIONA' if login_bloqueado else '❌ FALLA'}")
    print(f"📬 Reenvío: {'✅ FUNCIONA' if reenvio_ok else '❌ FALLA'}")
    
    if registro_ok and login_bloqueado and reenvio_ok:
        print("\n🎉 TODOS LOS SISTEMAS FUNCIONANDO")
        print("📧 Revisa los correos enviados en verihomeadmi@gmail.com")
        print("📥 Revisa la bandeja de test_api_real@gmail.com")
    else:
        print("\n❌ ALGUNOS SISTEMAS FALLAN")
        
    print("\n📋 PRÓXIMOS PASOS:")
    print("1. Verificar logs de Django durante el registro")
    print("2. Revisar correos enviados en Gmail")
    print("3. Probar con email real tuyo")

if __name__ == '__main__':
    main()