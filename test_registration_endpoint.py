#!/usr/bin/env python
"""
Script para probar el endpoint de registro y diagnosticar errores.
"""

import os
import sys
import django
import requests
import json
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from users.models import InterviewCode
from users.utils import create_interview_code

def test_registration_endpoint():
    """Prueba el endpoint de registro con diferentes escenarios."""
    
    print("🧪 Probando endpoint de registro...")
    
    # URL del endpoint
    url = "http://localhost:8000/api/v1/auth/register/"
    
    # Crear un código de entrevista válido para la prueba
    test_email = "test_registration@example.com"
    
    try:
        # Crear código de entrevista
        interview_code = create_interview_code(
            email=test_email,
            initial_rating=8,
            notes="Código de prueba para testing"
        )
        print(f"✅ Código creado: {interview_code.code}")
        
        # Datos de prueba para el registro
        registration_data = {
            "email": test_email,
            "password": "testpass123",
            "password2": "testpass123",
            "first_name": "Usuario",
            "last_name": "Prueba",
            "user_type": "tenant",
            "phone_number": "+573001234567",
            "terms_accepted": True,
            "privacy_policy_accepted": True,
            "interview_code": interview_code.code
        }
        
        print(f"📤 Enviando datos de registro:")
        print(json.dumps(registration_data, indent=2))
        
        # Realizar petición POST
        response = requests.post(url, json=registration_data)
        
        print(f"\n📥 Respuesta del servidor:")
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        
        try:
            response_data = response.json()
            print(f"Response JSON: {json.dumps(response_data, indent=2)}")
        except json.JSONDecodeError:
            print(f"Response Text: {response.text}")
        
        # Analizar la respuesta
        if response.status_code == 201:
            print("✅ Registro exitoso")
        elif response.status_code == 400:
            print("❌ Error 400 - Bad Request")
            if 'interview_code' in response_data:
                print("🔍 Error relacionado con el código de entrevista")
            elif 'email' in response_data:
                print("🔍 Error relacionado con el email")
            elif 'password' in response_data:
                print("🔍 Error relacionado con la contraseña")
            else:
                print("🔍 Otros errores de validación")
        else:
            print(f"❌ Error inesperado: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error durante la prueba: {str(e)}")
        import traceback
        traceback.print_exc()

def test_without_interview_code():
    """Prueba el registro sin código de entrevista."""
    
    print("\n🧪 Probando registro SIN código de entrevista...")
    
    url = "http://localhost:8000/api/v1/auth/register/"
    
    registration_data = {
        "email": "test_no_code@example.com",
        "password": "testpass123",
        "password2": "testpass123",
        "first_name": "Usuario",
        "last_name": "Sin Codigo",
        "user_type": "tenant",
        "phone_number": "+573001234567",
        "terms_accepted": True,
        "privacy_policy_accepted": True
        # Sin interview_code
    }
    
    response = requests.post(url, json=registration_data)
    
    print(f"Status Code: {response.status_code}")
    try:
        response_data = response.json()
        print(f"Response: {json.dumps(response_data, indent=2)}")
    except:
        print(f"Response: {response.text}")

def test_invalid_interview_code():
    """Prueba con código de entrevista inválido."""
    
    print("\n🧪 Probando con código de entrevista inválido...")
    
    url = "http://localhost:8000/api/v1/auth/register/"
    
    registration_data = {
        "email": "test_invalid@example.com",
        "password": "testpass123",
        "password2": "testpass123",
        "first_name": "Usuario",
        "last_name": "Invalido",
        "user_type": "tenant",
        "phone_number": "+573001234567",
        "terms_accepted": True,
        "privacy_policy_accepted": True,
        "interview_code": "INVALID123"  # Código inválido
    }
    
    response = requests.post(url, json=registration_data)
    
    print(f"Status Code: {response.status_code}")
    try:
        response_data = response.json()
        print(f"Response: {json.dumps(response_data, indent=2)}")
    except:
        print(f"Response: {response.text}")

def cleanup_test_data():
    """Limpia los datos de prueba."""
    
    print("\n🧹 Limpiando datos de prueba...")
    
    test_emails = [
        "test_registration@example.com",
        "test_no_code@example.com", 
        "test_invalid@example.com"
    ]
    
    # Eliminar códigos de prueba
    deleted_codes = InterviewCode.objects.filter(email__in=test_emails).delete()
    print(f"Códigos eliminados: {deleted_codes[0]}")
    
    # Eliminar usuarios de prueba
    from django.contrib.auth import get_user_model
    User = get_user_model()
    deleted_users = User.objects.filter(email__in=test_emails).delete()
    print(f"Usuarios eliminados: {deleted_users[0]}")

if __name__ == '__main__':
    print("🚀 Iniciando pruebas del endpoint de registro...")
    
    try:
        test_registration_endpoint()
        test_without_interview_code()
        test_invalid_interview_code()
        
        # Preguntar si limpiar datos
        response = input("\n¿Deseas limpiar los datos de prueba? (s/n): ")
        if response.lower() in ['s', 'si', 'sí', 'y', 'yes']:
            cleanup_test_data()
            print("✅ Datos de prueba limpiados")
            
    except Exception as e:
        print(f"❌ Error durante las pruebas: {str(e)}")
        import traceback
        traceback.print_exc()
    
    print("\n🎉 Pruebas completadas") 