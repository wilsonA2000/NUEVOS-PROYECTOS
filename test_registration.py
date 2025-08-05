#!/usr/bin/env python
"""Script para probar el registro de usuario."""

import os
import sys
import django
import requests
import json

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

def test_registration():
    """Probar el registro de un usuario."""
    url = "http://localhost:8000/api/v1/users/auth/register/"
    
    data = {
        "email": "letefon100@gmail.com",
        "password": "TestPassword123!",
        "password2": "TestPassword123!",
        "first_name": "Test",
        "last_name": "User",
        "user_type": "tenant",
        "phone_number": "+573001234567"
    }
    
    print(f"\n=== Probando registro de usuario ===")
    print(f"URL: {url}")
    print(f"Datos: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, json=data)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 201:
            print("\n[OK] Usuario registrado exitosamente!")
            print("Verificar si se envió el email de confirmación")
        else:
            print("\n[ERROR] Error al registrar usuario")
            
    except Exception as e:
        print(f"\n[ERROR] Error al hacer la petición: {str(e)}")

if __name__ == "__main__":
    test_registration()