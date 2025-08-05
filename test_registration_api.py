#!/usr/bin/env python
"""
Script simple para probar la API de registro.
"""

import requests
import json

def test_registration_api():
    """Probar la API de registro."""
    print("🌐 Probando API de registro...")
    
    # URL de la API de registro
    api_url = "http://127.0.0.1:8000/api/v1/auth/register/"
    
    # Datos de registro (sin código de entrevista por ahora)
    registration_data = {
        "email": "letefon100@gmail.com",
        "password1": "testpass123",
        "password2": "testpass123",
        "first_name": "Usuario",
        "last_name": "Prueba",
        "user_type": "tenant",
        "terms_accepted": True,
        "privacy_policy_accepted": True
    }
    
    try:
        # Hacer petición POST
        response = requests.post(
            api_url,
            json=registration_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Registro exitoso via API")
            return True
        else:
            print("❌ Error en registro via API")
            return False
            
    except Exception as e:
        print(f"❌ Error conectando a la API: {e}")
        return False

def test_simple_registration():
    """Probar registro simple sin código de entrevista."""
    print("\n🔧 Probando registro simple...")
    
    # URL de la API de registro
    api_url = "http://127.0.0.1:8000/api/v1/users/auth/register/"
    
    # Datos de registro con código de entrevista
    registration_data = {
        "email": "letefon100@gmail.com",
        "password1": "testpass123",
        "password2": "testpass123",
        "first_name": "Usuario",
        "last_name": "Prueba",
        "user_type": "tenant",
        "interview_code": "TEST1234",  # Código de prueba
        "terms_accepted": True,
        "privacy_policy_accepted": True
    }
    
    try:
        # Hacer petición POST
        response = requests.post(
            api_url,
            json=registration_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Registro exitoso via API")
            return True
        else:
            print("❌ Error en registro via API")
            return False
            
    except Exception as e:
        print(f"❌ Error conectando a la API: {e}")
        return False

def create_test_interview_code():
    """Crear un código de entrevista de prueba."""
    print("\n🔑 Creando código de entrevista de prueba...")
    
    import os
    import sys
    import django
    
    # Configurar Django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
    django.setup()
    
    from users.models import InterviewCode
    
    # Eliminar código existente si existe
    try:
        existing_code = InterviewCode.objects.get(email="letefon100@gmail.com")
        existing_code.delete()
        print("🗑️ Código existente eliminado")
    except InterviewCode.DoesNotExist:
        pass
    
    # Crear nuevo código
    interview_code = InterviewCode.objects.create(
        code="TEST1234",
        email="letefon100@gmail.com",
        initial_rating=5,
        notes="Código de prueba para testing"
    )
    
    print(f"✅ Código creado: {interview_code.code} para {interview_code.email}")
    return interview_code

def main():
    """Función principal."""
    print("🚀 Iniciando pruebas de API de registro")
    print("=" * 50)
    
    # Crear código de entrevista de prueba
    create_test_interview_code()
    
    # Probar API de registro
    test_registration_api()
    
    # Probar registro con código de entrevista
    test_simple_registration()
    
    print("\n🎯 Próximos pasos:")
    print("1. Revisa la consola del servidor para errores")
    print("2. Verifica que el correo llegue a letefon100@gmail.com")
    print("3. Intenta registrar desde el frontend")

if __name__ == "__main__":
    main() 