#!/usr/bin/env python
"""
Test del fix de registro - verificar que funciona con password2
"""
import requests
import json

def test_registration_fix():
    print("PRUEBA DEL FIX DE REGISTRO")
    print("=" * 35)
    
    # Datos de registro de prueba
    registration_data = {
        "email": "testfix@gmail.com",
        "password": "TestPass123!",
        "password2": "TestPass123!",  # El fix agrega este campo
        "first_name": "Usuario",
        "last_name": "PruebaFix",
        "user_type": "tenant",
        "phone_number": "3001234567",
        "interview_code": "VH-HERY-3578",  # Codigo valido creado
        "country": "Colombia",
        "state": "Bogotá",
        "city": "Bogotá",
        "terms_accepted": True,
        "privacy_policy_accepted": True
    }
    
    print(f"Datos de registro:")
    print(f"- Email: {registration_data['email']}")
    print(f"- Usuario: {registration_data['first_name']} {registration_data['last_name']}")
    print(f"- Tipo: {registration_data['user_type']}")
    print(f"- Codigo entrevista: {registration_data['interview_code']}")
    print(f"- Password2 incluido: {'password2' in registration_data}")
    
    try:
        # Hacer la petición al endpoint de registro
        url = "http://127.0.0.1:8000/api/v1/auth/register/"
        headers = {"Content-Type": "application/json"}
        
        print(f"\nEnviando petición a: {url}")
        response = requests.post(url, data=json.dumps(registration_data), headers=headers)
        
        print(f"Estado de respuesta: {response.status_code}")
        
        if response.status_code == 200 or response.status_code == 201:
            print("OK REGISTRO EXITOSO!")
            print("El fix funciona - backend acepta password2")
            print("Response:", response.json())
            return True
        else:
            print(f"Error {response.status_code}")
            print("Response:", response.text)
            
            if response.status_code == 400:
                print("\nPosibles causas:")
                print("- Codigo de entrevista invalido")
                print("- Datos faltantes o incorrectos")
                print("- Validaciones adicionales")
            
            return False
            
    except Exception as e:
        print(f"ERROR en la peticion: {e}")
        return False

if __name__ == "__main__":
    test_registration_fix()