#!/usr/bin/env python3
"""
Script para verificar el estado de los servicios de VeriHome
"""

import requests
import subprocess
import sys
import time
from urllib.parse import urljoin

def check_backend():
    """Verificar si el backend está corriendo"""
    print("🔍 Verificando backend...")
    
    try:
        # Probar health check
        response = requests.get('http://localhost:8000/api/v1/core/health/', timeout=5)
        if response.status_code == 200:
            print("✅ Backend está corriendo en http://localhost:8000")
            print(f"📄 Respuesta: {response.json()}")
            return True
        else:
            print(f"❌ Backend respondió con status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ No se puede conectar al backend en http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error verificando backend: {e}")
        return False

def check_frontend():
    """Verificar si el frontend está corriendo"""
    print("🔍 Verificando frontend...")
    
    try:
        response = requests.get('http://localhost:3000', timeout=5)
        if response.status_code == 200:
            print("✅ Frontend está corriendo en http://localhost:3000")
            return True
        else:
            print(f"❌ Frontend respondió con status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ No se puede conectar al frontend en http://localhost:3000")
        return False
    except Exception as e:
        print(f"❌ Error verificando frontend: {e}")
        return False

def check_api_endpoints():
    """Verificar endpoints específicos de la API"""
    print("🔍 Verificando endpoints de la API...")
    
    base_url = 'http://localhost:8000/api/v1'
    endpoints = [
        '/core/health/',
        '/core/test/',
        '/auth/login/',
        '/auth/me/',
    ]
    
    for endpoint in endpoints:
        try:
            url = urljoin(base_url, endpoint)
            response = requests.get(url, timeout=5)
            print(f"📡 {endpoint}: {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint}: Error - {e}")

def main():
    print("🚀 === VERIFICACIÓN DE SERVICIOS VERIHOME ===\n")
    
    # Verificar backend
    backend_ok = check_backend()
    print()
    
    # Verificar frontend
    frontend_ok = check_frontend()
    print()
    
    # Verificar endpoints si el backend está corriendo
    if backend_ok:
        check_api_endpoints()
        print()
    
    # Resumen
    print("📊 === RESUMEN ===")
    print(f"Backend: {'✅ OK' if backend_ok else '❌ ERROR'}")
    print(f"Frontend: {'✅ OK' if frontend_ok else '❌ ERROR'}")
    
    if not backend_ok:
        print("\n💡 Para iniciar el backend:")
        print("   python manage.py runserver")
    
    if not frontend_ok:
        print("\n💡 Para iniciar el frontend:")
        print("   cd frontend && npm run dev")

if __name__ == "__main__":
    main() 