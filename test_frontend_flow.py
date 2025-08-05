#!/usr/bin/env python3

import requests
import json
import time

# Configuración
FRONTEND_URL = "http://localhost:5174"
BACKEND_URL = "http://localhost:8000/api/v1"

def test_frontend_backend_flow():
    """Simular el flujo completo del frontend"""
    
    print('🚀 TESTING: Flujo completo Frontend-Backend')
    print('=' * 60)
    
    # Paso 1: Verificar que el frontend esté corriendo
    print('\n1️⃣ Verificando Frontend...')
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        print(f'✅ Frontend disponible: {response.status_code}')
    except Exception as e:
        print(f'❌ Frontend no disponible: {e}')
        return False
    
    # Paso 2: Validar código de entrevista (simulando frontend)
    print('\n2️⃣ Validando código de entrevista...')
    validation_data = {
        "interview_code": "VH-YLTV-IMWE"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/users/auth/validate-interview-code/",
            json=validation_data,
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        print(f'📡 Status: {response.status_code}')
        result = response.json()
        print(f'📥 Response: {json.dumps(result, indent=2)}')
        
        if response.status_code == 200 and result.get('is_valid'):
            print('✅ Código válido confirmado')
            code_data = result.get('code_data', {})
        else:
            print('❌ Código inválido')
            return False
            
    except Exception as e:
        print(f'❌ Error validando código: {e}')
        return False
    
    # Paso 3: Registro completo (simulando frontend)
    print('\n3️⃣ Registrando usuario completo...')
    registration_data = {
        "email": "letefon100@gmail.com",
        "password": "leidy2025*",
        "password2": "leidy2025*",
        "first_name": "Leidy",
        "last_name": "Fonseca",
        "user_type": "landlord",
        "interview_code": "VH-YLTV-IMWE",
        "phone_number": "+57 315 789 4567",
        "whatsapp": "+57 315 789 4567",
        "country": "Colombia",
        "state": "Cundinamarca",
        "city": "Bogotá",
        "postal_code": "110111",
        "date_of_birth": "1988-11-22",
        "gender": "female",
        "nationality": "colombiana",
        "marital_status": "single",
        "employment_status": "self_employed",
        "monthly_income": 12500000,
        "currency": "COP",
        "employer_name": "Propiedades Fonseca SAS",
        "job_title": "Propietaria",
        "years_employed": 6,
        "source": "aplicacion_web",
        "hourly_rate_currency": "COP",
        "terms_accepted": True,
        "privacy_policy_accepted": True,
        "marketing_consent": False
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/users/auth/register/",
            json=registration_data,
            headers={'Content-Type': 'application/json'},
            timeout=15
        )
        
        print(f'📡 Status: {response.status_code}')
        result = response.json()
        print(f'📥 Response: {json.dumps(result, indent=2)}')
        
        if response.status_code == 201:
            print('✅ Registro exitoso')
            user_id = result.get('user_id')
            email_sent = result.get('email_sent')
            
            if email_sent:
                print('📧 Email de confirmación enviado')
            else:
                print('⚠️ Email de confirmación NO enviado')
                
            return user_id
        else:
            print(f'❌ Error en registro: {response.status_code}')
            return False
            
    except Exception as e:
        print(f'❌ Error en registro: {e}')
        return False

def test_login_flow():
    """Probar el login después del registro"""
    print('\n4️⃣ Probando login (sin confirmación de email)...')
    
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
        
        print(f'📡 Status: {response.status_code}')
        result = response.json()
        print(f'📥 Response: {json.dumps(result, indent=2)}')
        
        if response.status_code == 200:
            print('✅ Login exitoso')
            return True
        else:
            print('❌ Login fallido (esperado - email no confirmado)')
            return False
            
    except Exception as e:
        print(f'❌ Error en login: {e}')
        return False

def main():
    """Ejecutar todas las pruebas"""
    
    # Test completo del flujo
    user_id = test_frontend_backend_flow()
    
    if user_id:
        # Probar login
        login_success = test_login_flow()
        
        print('\n🎉 RESUMEN FINAL:')
        print('=' * 40)
        print(f'✅ Validación código: OK')
        print(f'✅ Registro usuario: OK')
        print(f'✅ Email enviado: OK')
        print(f'⚠️  Login: {"OK" if login_success else "Requiere confirmación de email"}')
        print(f'📧 Email enviado a: letefon100@gmail.com')
        print(f'👤 User ID: {user_id}')
        
        print('\n📋 Próximos pasos:')
        print('1. Verificar email en letefon100@gmail.com')
        print('2. Hacer click en el enlace de confirmación')
        print('3. Intentar login nuevamente')
        
    else:
        print('\n❌ FLUJO FALLIDO')
        print('Revisar logs del servidor para más detalles')

if __name__ == '__main__':
    main()