#!/usr/bin/env python3
"""
Quick test para verificar el endpoint de registro
"""

import os
import sys
import json
from datetime import datetime

# Configuración del entorno Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')

import django
django.setup()

from django.test import Client
from django.contrib.auth.models import User
from allauth.account.models import EmailAddress, EmailConfirmation

def test_registration_endpoint():
    """
    Prueba el endpoint de registro directamente usando el cliente de Django
    """
    
    print("🧪 === QUICK REGISTRATION TEST ===")
    
    # Crear cliente de Django
    client = Client()
    
    # Datos de prueba
    test_email = f"quicktest.{datetime.now().strftime('%Y%m%d%H%M%S')}@example.com"
    test_data = {
        "email": test_email,
        "password": "TestPassword123!",
        "password2": "TestPassword123!",  # Campo requerido para confirmación
        "first_name": "Quick",
        "last_name": "Test",
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
    
    # Paso 1: Probar endpoint de registro
    print("🔍 PASO 1: Probar endpoint de registro")
    print("=" * 50)
    
    try:
        # Usar SimpleRegistrationView que no requiere interview_code
        response = client.post(
            '/api/v1/users/auth/register/',
            data=json.dumps(test_data),
            content_type='application/json'
        )
        
        print(f"📊 Status Code: {response.status_code}")
        
        if response.status_code == 201:
            response_data = response.json()
            print(f"✅ Registro exitoso!")
            print(f"📄 Response Data: {json.dumps(response_data, indent=2)}")
            
            # Verificar usuario en BD
            user = User.objects.filter(email=test_email).first()
            if user:
                print(f"✅ Usuario creado: {user.email}")
                print(f"🔒 Usuario activo: {user.is_active}")
                
                # Verificar EmailAddress
                email_address = EmailAddress.objects.filter(email=test_email).first()
                if email_address:
                    print(f"✅ EmailAddress creado: {email_address.email}")
                    print(f"🔐 Email verificado: {email_address.verified}")
                    
                    # Verificar EmailConfirmation
                    confirmation = EmailConfirmation.objects.filter(
                        email_address=email_address
                    ).first()
                    if confirmation:
                        print(f"✅ EmailConfirmation creado: {confirmation.key}")
                        print(f"📅 Creado: {confirmation.created}")
                        print(f"🕐 Expirado: {confirmation.key_expired()}")
                        
                        # Simular confirmación
                        print("\n🔍 PASO 2: Simular confirmación de email")
                        print("=" * 50)
                        
                        confirm_response = client.post(
                            f'/api/v1/users/auth/confirm-email/{confirmation.key}/'
                        )
                        
                        print(f"📊 Confirm Status: {confirm_response.status_code}")
                        
                        if confirm_response.status_code == 200:
                            print("✅ Email confirmado exitosamente")
                            confirm_data = confirm_response.json()
                            print(f"📄 Confirm Data: {json.dumps(confirm_data, indent=2)}")
                            
                            # Verificar que el usuario esté activo
                            user.refresh_from_db()
                            print(f"🔒 Usuario activo después de confirmación: {user.is_active}")
                            
                        else:
                            print(f"❌ Error en confirmación: {confirm_response.content}")
                            
                    else:
                        print("❌ EmailConfirmation no creado")
                        
                else:
                    print("❌ EmailAddress no creado")
                    
            else:
                print("❌ Usuario no creado")
                
        elif response.status_code == 400:
            print("❌ Error 400 - Bad Request")
            try:
                error_data = response.json()
                print(f"📄 Error Data: {json.dumps(error_data, indent=2)}")
            except:
                print(f"📄 Error Content: {response.content}")
        
        else:
            print(f"❌ Error {response.status_code}")
            print(f"📄 Response Content: {response.content}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    print("🎉 === QUICK TEST COMPLETADO ===")
    
    # Mostrar resumen de endpoints
    print()
    print("📋 ENDPOINTS DISPONIBLES:")
    print("=" * 50)
    
    try:
        from django.urls import reverse
        from rest_framework.test import APIClient
        
        api_client = APIClient()
        
        # Probar algunos endpoints básicos
        endpoints = [
            ('/api/v1/users/auth/register/', 'POST'),
            ('/api/v1/users/auth/login/', 'POST'),
            ('/api/v1/users/auth/logout/', 'POST'),
            ('/api/v1/users/auth/user/', 'GET'),
        ]
        
        for endpoint, method in endpoints:
            try:
                if method == 'GET':
                    response = api_client.get(endpoint)
                else:
                    response = api_client.post(endpoint)
                    
                print(f"✅ {method} {endpoint}: {response.status_code}")
                
            except Exception as e:
                print(f"❌ {method} {endpoint}: {e}")
        
    except Exception as e:
        print(f"❌ Error verificando endpoints: {e}")

if __name__ == "__main__":
    test_registration_endpoint()