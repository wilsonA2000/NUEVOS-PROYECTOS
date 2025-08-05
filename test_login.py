#!/usr/bin/env python
"""Script para probar el login."""

import requests
import json

def test_login(email, password):
    """Probar el login de un usuario."""
    url = "http://localhost:8000/api/v1/users/auth/login/"
    
    data = {
        "email": email,
        "password": password
    }
    
    print(f"\n=== Probando login ===")
    print(f"URL: {url}")
    print(f"Datos: {json.dumps(data, indent=2)}")
    
    try:
        response = requests.post(url, json=data)
        print(f"\nStatus Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        if response.status_code == 200:
            print("\n[OK] Login exitoso!")
            tokens = response.json()
            if 'access' in tokens:
                print(f"Access Token: {tokens['access'][:50]}...")
            if 'refresh' in tokens:
                print(f"Refresh Token: {tokens['refresh'][:50]}...")
        else:
            print("\n[ERROR] Error en login")
            
    except Exception as e:
        print(f"\n[ERROR] Error al hacer la petición: {str(e)}")

if __name__ == "__main__":
    # Probar con el usuario wilsonderecho10
    print("=== PRUEBA 1: Usuario wilsonderecho10 ===")
    test_login("wilsonderecho10@gmail.com", "TestPassword123!")
    
    print("\n\n=== PRUEBA 2: Usuario letefon100 ===")
    test_login("letefon100@gmail.com", "TestPassword123!")