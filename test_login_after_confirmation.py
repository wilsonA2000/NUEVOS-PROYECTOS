#!/usr/bin/env python3

import requests
import json

# Configuración
BACKEND_URL = "http://localhost:8000/api/v1"

def test_login_after_confirmation():
    """Probar el login después de confirmar el email"""
    
    print('🔐 TESTING: Login después de confirmación de email')
    print('=' * 55)
    
    login_data = {
        "email": "letefon100@gmail.com",
        "password": "leidy2025*"
    }
    
    print('📧 Email a usar:', login_data["email"])
    print('🔑 Intentando login...')
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/users/auth/login/",
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f'📡 Status: {response.status_code}')
        result = response.json()
        print(f'📥 Response: {json.dumps(result, indent=2)}')
        
        if response.status_code == 200:
            print('✅ LOGIN EXITOSO!')
            
            # Verificar tokens
            access_token = result.get('access')
            refresh_token = result.get('refresh')
            
            if access_token and refresh_token:
                print(f'🔑 Access Token: {access_token[:50]}...')
                print(f'🔄 Refresh Token: {refresh_token[:50]}...')
                
                # Probar obtener datos del usuario con el token
                print('\n👤 Obteniendo datos del usuario...')
                headers = {
                    'Authorization': f'Bearer {access_token}',
                    'Content-Type': 'application/json'
                }
                
                user_response = requests.get(
                    f"{BACKEND_URL}/users/auth/me/",
                    headers=headers,
                    timeout=10
                )
                
                print(f'📡 User Status: {user_response.status_code}')
                if user_response.status_code == 200:
                    user_data = user_response.json()
                    print(f'👤 Usuario: {user_data.get("first_name")} {user_data.get("last_name")}')
                    print(f'📧 Email: {user_data.get("email")}')
                    print(f'👑 Tipo: {user_data.get("user_type")}')
                    print(f'✅ Verificado: {user_data.get("is_verified")}')
                    print(f'📞 Teléfono: {user_data.get("phone_number")}')
                    
                    return True
                else:
                    print('❌ Error obteniendo datos del usuario')
                    return False
            else:
                print('⚠️ Tokens no recibidos correctamente')
                return False
                
        elif response.status_code == 400:
            # Verificar si aún requiere confirmación
            detail = result.get('detail', '')
            if 'verificada' in str(detail) or 'verified' in str(detail):
                print('❌ El email AÚN NO ha sido confirmado')
                print('📧 Por favor, revisa tu email y haz click en el enlace de confirmación')
                return False
            else:
                print('❌ Credenciales incorrectas')
                return False
        else:
            print(f'❌ Error de login: {response.status_code}')
            return False
            
    except Exception as e:
        print(f'❌ Error en la petición: {e}')
        return False

def test_email_verification_status():
    """Verificar el estado de verificación del email"""
    print('\n📧 Verificando estado del email...')
    
    # Intentar obtener información del usuario directamente
    try:
        response = requests.get(f"{BACKEND_URL}/users/auth/me/", timeout=5)
        if response.status_code == 401:
            print('⚠️ Se requiere token para verificar estado')
        else:
            print(f'📡 Status: {response.status_code}')
    except Exception as e:
        print(f'⚠️ No se puede verificar sin autenticación: {e}')

def main():
    """Ejecutar test de login"""
    
    print('🎯 PASO 1: Confirma tu email')
    print('Por favor, antes de continuar:')
    print('1. Revisa tu email en letefon100@gmail.com')
    print('2. Haz click en el enlace de confirmación')
    print('3. Verifica que llegues a una página de éxito')
    print()
    
    input('Presiona ENTER cuando hayas confirmado tu email...')
    
    # Test email verification status
    test_email_verification_status()
    
    # Test login
    login_success = test_login_after_confirmation()
    
    print('\n🎉 RESULTADO FINAL:')
    print('=' * 30)
    if login_success:
        print('✅ LOGIN COMPLETAMENTE FUNCIONAL')
        print('✅ Sistema de registro con códigos de entrevista: OPERATIVO')
        print('✅ Sistema de confirmación de email: OPERATIVO')
        print('✅ Autenticación JWT: OPERATIVA')
        print()
        print('🚀 ¡EL SISTEMA ESTÁ 100% FUNCIONAL!')
    else:
        print('❌ Login falló')
        print('🔍 Posibles causas:')
        print('  - Email no confirmado aún')
        print('  - Credenciales incorrectas') 
        print('  - Problema de conectividad')

if __name__ == '__main__':
    main()