#!/usr/bin/env python3
"""
Script para probar el endpoint de autenticación biométrica.
"""
import requests
import json
from datetime import datetime

# Configuración
BASE_URL = "http://localhost:8000"
CONTRACT_ID = "c6a04a99-c3da-468a-a514-5c9fba718ea3"

def test_biometric_endpoint():
    """Prueba el endpoint de autenticación biométrica."""

    # URL del endpoint
    url = f"{BASE_URL}/api/v1/contracts/{CONTRACT_ID}/start-biometric-authentication/"

    print(f"📍 Probando endpoint: {url}")
    print("-" * 50)

    # Primero, obtener un token de autenticación (simulado)
    # En un escenario real, esto vendría del login del usuario

    try:
        # Hacer la petición POST
        response = requests.post(
            url,
            headers={
                "Content-Type": "application/json",
                # Aquí normalmente iría el token de autenticación
                # "Authorization": "Bearer <token>"
            },
            json={},
            timeout=10
        )

        print(f"✅ Estado de respuesta: {response.status_code}")
        print(f"📝 Headers de respuesta: {dict(response.headers)}")

        if response.status_code == 200:
            print("✅ Respuesta exitosa:")
            print(json.dumps(response.json(), indent=2))
        elif response.status_code == 404:
            print("❌ Error 404: El endpoint no existe")
            print("📄 Respuesta HTML (primeras 500 caracteres):")
            print(response.text[:500])
        elif response.status_code == 401:
            print("⚠️ Error 401: No autorizado (esto es esperado sin token)")
        else:
            print(f"❌ Error {response.status_code}:")
            print(response.text[:500])

    except requests.exceptions.ConnectionError:
        print(f"❌ Error de conexión: El servidor no está respondiendo en {BASE_URL}")
    except requests.exceptions.Timeout:
        print("❌ Timeout: La petición tardó demasiado")
    except Exception as e:
        print(f"❌ Error inesperado: {str(e)}")

if __name__ == "__main__":
    print(f"🚀 Iniciando prueba del endpoint biométrico - {datetime.now()}")
    print("=" * 50)
    test_biometric_endpoint()
    print("=" * 50)
    print("✅ Prueba completada")