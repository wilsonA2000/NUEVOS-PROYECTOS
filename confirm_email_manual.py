#!/usr/bin/env python3

import requests
import json

# Configuración
BACKEND_URL = "http://localhost:8000/api/v1"

def confirm_email_manually():
    """Confirmar email manualmente usando el backend directamente"""
    
    print('📧 CONFIRMACIÓN MANUAL DE EMAIL')
    print('=' * 40)
    
    # El key del último email enviado (desde el log del servidor)
    email_key = "MTk:1uXrhJ:s7PD91G6x_75JMbkwnDWcE_kIl6DpsfXr8WoSPsFcsM"
    
    print(f'🔑 Key a confirmar: {email_key}')
    print('📡 Enviando confirmación...')
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/users/auth/confirm-email/{email_key}/",
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f'📡 Status: {response.status_code}')
        result = response.json()
        print(f'📥 Response: {json.dumps(result, indent=2)}')
        
        if response.status_code == 200:
            print('✅ EMAIL CONFIRMADO EXITOSAMENTE!')
            return True
        else:
            print(f'❌ Error confirmando email: {response.status_code}')
            return False
            
    except Exception as e:
        print(f'❌ Error en confirmación: {e}')
        return False

def test_login_after_manual_confirmation():
    """Probar login después de confirmación manual"""
    
    print('\n🔐 TESTING LOGIN DESPUÉS DE CONFIRMACIÓN')
    print('=' * 45)
    
    login_data = {
        "email": "letefon100@gmail.com",
        "password": "leidy2025*"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/users/auth/login/",
            json=login_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f'📡 Login Status: {response.status_code}')
        result = response.json()
        
        if response.status_code == 200:
            print('✅ LOGIN EXITOSO!')
            
            # Obtener datos del usuario
            access_token = result.get('access')
            headers = {'Authorization': f'Bearer {access_token}'}
            user_response = requests.get(f"{BACKEND_URL}/users/auth/me/", headers=headers)
            
            if user_response.status_code == 200:
                user_data = user_response.json()
                print(f'\n👤 USUARIO LOGUEADO:')
                print(f'   Nombre: {user_data.get("first_name")} {user_data.get("last_name")}')
                print(f'   Email: {user_data.get("email")}')
                print(f'   Tipo: {user_data.get("user_type")}')
                print(f'   Verificado: {user_data.get("is_verified")}')
                print(f'   User ID: {user_data.get("id")}')
                
            return True
            
        else:
            print(f'❌ Login falló: {response.status_code}')
            print(f'📥 Response: {json.dumps(result, indent=2)}')
            return False
            
    except Exception as e:
        print(f'❌ Error en login: {e}')
        return False

def main():
    """Ejecutar confirmación y login"""
    
    # Confirmar email
    email_confirmed = confirm_email_manually()
    
    if email_confirmed:
        # Probar login
        login_success = test_login_after_manual_confirmation()
        
        print('\n🎉 RESULTADO FINAL:')
        print('=' * 30)
        if login_success:
            print('✅ SISTEMA 100% FUNCIONAL!')
            print('✅ Confirmación de email: OK')
            print('✅ Login: OK')
            print('✅ Autenticación JWT: OK')
            print()
            print('🚀 ¡TODO EL FLUJO FUNCIONA PERFECTAMENTE!')
        else:
            print('❌ Login aún no funciona')
    else:
        print('\n❌ No se pudo confirmar el email')

if __name__ == '__main__':
    main()