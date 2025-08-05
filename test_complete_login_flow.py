#!/usr/bin/env python3

import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

import requests
import json

def test_complete_login_flow():
    """Test completo del flujo de login como el frontend."""
    
    base_url = "http://localhost:8000/api/v1"
    
    print("🧪 === TEST COMPLETO DEL FLUJO DE LOGIN ===")
    
    # Credenciales de prueba
    credentials = {
        'email': 'landlord@test.com',
        'password': 'test123'
    }
    
    print(f"🔐 Testing login con: {credentials['email']}")
    
    try:
        # 1. Hacer login
        login_url = f"{base_url}/users/auth/login/"
        print(f"📡 POST {login_url}")
        
        login_response = requests.post(login_url, json=credentials)
        print(f"📊 Login Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            access_token = login_data.get('access')
            refresh_token = login_data.get('refresh')
            
            print(f"✅ Login exitoso!")
            print(f"🔑 Access token: {access_token[:30]}...")
            print(f"🔄 Refresh token: {refresh_token[:30]}...")
            
            # 2. Obtener datos del usuario
            headers = {'Authorization': f'Bearer {access_token}'}
            me_url = f"{base_url}/users/auth/me/"
            print(f"📡 GET {me_url}")
            
            me_response = requests.get(me_url, headers=headers)
            print(f"📊 Me Status: {me_response.status_code}")
            
            if me_response.status_code == 200:
                user_data = me_response.json()
                print(f"✅ Datos de usuario obtenidos!")
                print(f"👤 Usuario: {user_data.get('first_name', '')} {user_data.get('last_name', '')}")
                print(f"📧 Email: {user_data.get('email')}")
                print(f"🏷️ Role: {user_data.get('role')}")
                print(f"✅ Verificado: {user_data.get('is_verified')}")
                
                # 3. Test de endpoint protegido (propiedades)
                props_url = f"{base_url}/properties/"
                print(f"📡 GET {props_url}")
                
                props_response = requests.get(props_url, headers=headers)
                print(f"📊 Properties Status: {props_response.status_code}")
                
                if props_response.status_code == 200:
                    props_data = props_response.json()
                    print(f"🏠 Propiedades encontradas: {len(props_data.get('results', []))}")
                    print(f"✅ FLUJO COMPLETO EXITOSO! 🎉")
                    return True
                else:
                    print(f"❌ Error accediendo propiedades: {props_response.text[:200]}")
                
            else:
                print(f"❌ Error obteniendo datos usuario: {me_response.text[:200]}")
                
        else:
            print(f"❌ Error en login: {login_response.text[:200]}")
            
            # Si el error es de cuenta no verificada, verificar
            if login_response.status_code == 400:
                error_data = login_response.json()
                if 'not verified' in str(error_data).lower():
                    print("⚠️ Cuenta no verificada - Verificando automáticamente...")
                    return verify_user_and_retry(credentials)
            
    except requests.exceptions.ConnectionError:
        print("❌ Error de conexión - ¿Está corriendo el servidor Django?")
        print("   Ejecuta: python3 manage.py runserver")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False
    
    return False

def verify_user_and_retry(credentials):
    """Verificar usuario y reintentar login."""
    from django.contrib.auth import get_user_model
    from allauth.account.models import EmailAddress
    
    User = get_user_model()
    
    try:
        user = User.objects.get(email=credentials['email'])
        print(f"🔧 Verificando usuario {user.email}...")
        
        # Marcar como verificado
        user.is_verified = True
        user.save()
        
        # Verificar email address en allauth
        email_address, created = EmailAddress.objects.get_or_create(
            user=user,
            email=user.email,
            defaults={'verified': True, 'primary': True}
        )
        if not email_address.verified:
            email_address.verified = True
            email_address.save()
        
        print(f"✅ Usuario verificado manualmente")
        
        # Reintentar login
        print(f"🔄 Reintentando login...")
        return test_complete_login_flow()
        
    except Exception as e:
        print(f"❌ Error verificando usuario: {e}")
        return False

if __name__ == '__main__':
    success = test_complete_login_flow()
    if success:
        print("\n🎉 === LOGIN FLOW COMPLETAMENTE FUNCIONAL ===")
        print("✅ Tu aplicación está lista para usar desde el frontend!")
        print("🌐 Ve a http://localhost:5173/ y haz login con:")
        print("   📧 Email: landlord@test.com")
        print("   🔒 Password: test123")
    else:
        print("\n❌ === PROBLEMAS EN LOGIN FLOW ===")
        print("🔧 Revisa los errores arriba para más detalles.")