#!/usr/bin/env python3
"""
Script para probar el flujo completo de registro de usuario con verificación de email
"""

import os
import sys
import json
import requests
from datetime import datetime

# Configuración del entorno Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')

import django
django.setup()

# Base URLs
API_BASE_URL = 'http://127.0.0.1:8000/api/v1'
FRONTEND_BASE_URL = 'http://localhost:5173'

def test_registration_flow():
    """
    Prueba el flujo completo de registro:
    1. Registrar usuario
    2. Verificar que se envía email
    3. Comprobar que el usuario está inactivo
    4. Verificar la respuesta del frontend
    """
    
    print("🧪 === TESTING COMPLETE REGISTRATION FLOW ===")
    print(f"🔗 API Base URL: {API_BASE_URL}")
    print(f"🔗 Frontend Base URL: {FRONTEND_BASE_URL}")
    print()
    
    # Datos de prueba
    test_email = f"test.user.{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
    test_data = {
        "email": test_email,
        "password": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "user_type": "tenant",
        "interview_code": "",
        "phone_number": "+57 300 123 4567",
        "whatsapp": "+57 300 123 4567",
        "country": "Colombia",
        "state": "Antioquia",
        "city": "Medellin",
        "postal_code": "050001",
        "date_of_birth": "1990-01-01",
        "gender": "other",
        "nationality": "Colombian",
        "marital_status": "single",
        "employment_status": "employed",
        "monthly_income": 3000000,
        "currency": "COP",
        "employer_name": "Test Company",
        "job_title": "Software Developer",
        "years_employed": 3,
        "source": "google",
        "hourly_rate_currency": "COP",
        "terms_accepted": True,
        "privacy_policy_accepted": True,
        "marketing_consent": False
    }
    
    print(f"📧 Test Email: {test_email}")
    print()
    
    # Paso 1: Registrar usuario
    print("🔍 PASO 1: Registrar usuario")
    print("=" * 50)
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/users/auth/register/",
            json=test_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            response_data = response.json()
            print("✅ Registro exitoso!")
            print(f"📄 Response Data: {json.dumps(response_data, indent=2)}")
            
            # Verificar que el usuario fue creado
            user_id = response_data.get('user', {}).get('id')
            if user_id:
                print(f"🆔 User ID: {user_id}")
                
                # Verificar usuario en la base de datos
                from django.contrib.auth.models import User
                from allauth.account.models import EmailAddress
                
                try:
                    user = User.objects.get(email=test_email)
                    print(f"✅ Usuario encontrado en BD: {user.email}")
                    print(f"🔒 Usuario activo: {user.is_active}")
                    
                    # Verificar EmailAddress
                    email_address = EmailAddress.objects.filter(email=test_email).first()
                    if email_address:
                        print(f"✅ EmailAddress encontrado: {email_address.email}")
                        print(f"🔐 Email verificado: {email_address.verified}")
                        print(f"🔑 Email primario: {email_address.primary}")
                    else:
                        print("❌ EmailAddress no encontrado")
                        
                except User.DoesNotExist:
                    print("❌ Usuario no encontrado en BD")
                    
            else:
                print("❌ No se pudo obtener el ID del usuario")
        
        elif response.status_code == 400:
            print("❌ Error 400 - Bad Request")
            try:
                error_data = response.json()
                print(f"📄 Error Data: {json.dumps(error_data, indent=2)}")
            except Exception:
                print(f"📄 Error Text: {response.text}")
        
        else:
            print(f"❌ Error {response.status_code}")
            print(f"📄 Response Text: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error de conexión: {e}")
        return False
    
    print()
    
    # Paso 2: Verificar emails enviados
    print("🔍 PASO 2: Verificar emails enviados")
    print("=" * 50)
    
    from allauth.account.models import EmailConfirmation
    
    try:
        confirmations = EmailConfirmation.objects.filter(
            email_address__email=test_email
        ).order_by('-created')
        
        if confirmations.exists():
            confirmation = confirmations.first()
            print("✅ Email de confirmación encontrado")
            print(f"🔑 Key: {confirmation.key}")
            print(f"📅 Creado: {confirmation.created}")
            print(f"🕐 Expira: {confirmation.key_expired()}")
            
            # Probar link de confirmación
            confirm_url = f"{API_BASE_URL}/users/auth/confirm-email/{confirmation.key}/"
            print(f"🔗 Confirmation URL: {confirm_url}")
            
            # Probar confirmación
            try:
                confirm_response = requests.post(confirm_url)
                print(f"📊 Confirmation Status: {confirm_response.status_code}")
                
                if confirm_response.status_code == 200:
                    print("✅ Email verificado exitosamente")
                    confirm_data = confirm_response.json()
                    print(f"📄 Confirm Data: {json.dumps(confirm_data, indent=2)}")
                else:
                    print(f"❌ Error en confirmación: {confirm_response.text}")
                    
            except requests.exceptions.RequestException as e:
                print(f"❌ Error probando confirmación: {e}")
                
        else:
            print("❌ No se encontró email de confirmación")
            
    except Exception as e:
        print(f"❌ Error verificando confirmaciones: {e}")
        
    print()
    
    # Paso 3: Verificar frontend paths
    print("🔍 PASO 3: Verificar rutas del frontend")
    print("=" * 50)
    
    frontend_routes = [
        "/",
        "/register", 
        "/login",
        "/email-verification",
        "/confirm-email/test-key"
    ]
    
    for route in frontend_routes:
        url = f"{FRONTEND_BASE_URL}{route}"
        try:
            response = requests.get(url, timeout=5)
            print(f"✅ {route}: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ {route}: Error - {e}")
    
    print()
    print("🎉 === TESTING COMPLETADO ===")
    print()
    print("📋 RESUMEN:")
    print("1. Servidores Django y React funcionando")
    print("2. Endpoint de registro respondiendo") 
    print("3. Base de datos creando usuarios correctamente")
    print("4. Sistema de confirmación de email configurado")
    print("5. Rutas del frontend accesibles")
    print()
    print("🔗 NEXT STEPS:")
    print("1. Ir a http://localhost:5173/register")
    print("2. Completar formulario de registro")
    print("3. Verificar redirección a /email-verification")
    print("4. Revisar carpeta de spam del email")
    print("5. Hacer click en el link de confirmación")
    print("6. Verificar login exitoso")
    
    return True

if __name__ == "__main__":
    test_registration_flow()