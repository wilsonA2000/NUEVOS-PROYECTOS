#!/usr/bin/env python3
"""
Test automatizado para VeriHome
Prueba la funcionalidad completa del frontend y backend
"""

import requests
import json
import time
import subprocess
import sys
import os
from datetime import datetime

# Configuración
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"
API_BASE = f"{BASE_URL}/api"

# Colores para output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_status(message, status="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    if status == "SUCCESS":
        color = Colors.GREEN
        icon = "✅"
    elif status == "ERROR":
        color = Colors.RED
        icon = "❌"
    elif status == "WARNING":
        color = Colors.YELLOW
        icon = "⚠️"
    else:
        color = Colors.BLUE
        icon = "ℹ️"
    
    print(f"{color}{icon} [{timestamp}] {message}{Colors.ENDC}")

def test_backend_connection():
    """Test de conexión al backend"""
    print_status("Probando conexión al backend...")
    try:
        response = requests.get(f"{BASE_URL}/api/", timeout=5)
        if response.status_code == 200:
            print_status("Backend conectado correctamente", "SUCCESS")
            return True
        else:
            print_status(f"Backend respondió con código {response.status_code}", "ERROR")
            return False
    except requests.exceptions.RequestException as e:
        print_status(f"Error conectando al backend: {e}", "ERROR")
        return False

def test_frontend_connection():
    """Test de conexión al frontend"""
    print_status("Probando conexión al frontend...")
    try:
        response = requests.get(FRONTEND_URL, timeout=5)
        if response.status_code == 200:
            print_status("Frontend conectado correctamente", "SUCCESS")
            return True
        else:
            print_status(f"Frontend respondió con código {response.status_code}", "ERROR")
            return False
    except requests.exceptions.RequestException as e:
        print_status(f"Error conectando al frontend: {e}", "ERROR")
        return False

def create_test_user():
    """Crear usuario de prueba"""
    print_status("Creando usuario de prueba...")
    
    user_data = {
        "email": "test@example.com",
        "password1": "testpass123",
        "password2": "testpass123",
        "first_name": "Test",
        "last_name": "User"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/register/", json=user_data)
        if response.status_code in [201, 400]:  # 400 si el usuario ya existe
            if response.status_code == 201:
                print_status("Usuario de prueba creado", "SUCCESS")
            else:
                print_status("Usuario de prueba ya existe", "WARNING")
            return True
        else:
            print_status(f"Error creando usuario: {response.status_code}", "ERROR")
            return False
    except Exception as e:
        print_status(f"Error en registro: {e}", "ERROR")
        return False

def login_test_user():
    """Login del usuario de prueba"""
    print_status("Iniciando sesión con usuario de prueba...")
    
    login_data = {
        "email": "test@example.com",
        "password": "testpass123"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/login/", json=login_data)
        if response.status_code == 200:
            data = response.json()
            token = data.get('access')
            if token:
                print_status("Login exitoso", "SUCCESS")
                return token
            else:
                print_status("Token no encontrado en respuesta", "ERROR")
                return None
        else:
            print_status(f"Error en login: {response.status_code}", "ERROR")
            return None
    except Exception as e:
        print_status(f"Error en login: {e}", "ERROR")
        return None

def test_property_creation(token):
    """Test de creación de propiedades"""
    print_status("Probando creación de propiedad...")
    
    property_data = {
        "title": f"Propiedad Test {int(time.time())}",
        "description": "Propiedad de prueba automatizada",
        "price": 1500000,
        "bedrooms": 2,
        "bathrooms": 1,
        "area": 65,
        "property_type": "apartment",
        "status": "available",
        "address": "Calle Test 123",
        "city": "Bogotá",
        "state": "Cundinamarca",
        "country": "Colombia",
        "latitude": 4.7110,
        "longitude": -74.0721,
        "amenities": ["parking", "elevator"]
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        # Crear propiedad
        response = requests.post(f"{API_BASE}/properties/", json=property_data, headers=headers)
        if response.status_code == 201:
            created_property = response.json()
            property_id = created_property.get('id')
            print_status(f"Propiedad creada con ID: {property_id}", "SUCCESS")
            
            # Verificar que aparece en el listado
            time.sleep(1)  # Pequeña pausa para asegurar que se guarde
            list_response = requests.get(f"{API_BASE}/properties/", headers=headers)
            
            if list_response.status_code == 200:
                properties = list_response.json()
                property_list = properties.get('results', properties)
                
                # Buscar la propiedad creada
                found = any(p.get('id') == property_id for p in property_list)
                if found:
                    print_status("Propiedad aparece en el listado", "SUCCESS")
                    return True
                else:
                    print_status("Propiedad no aparece en el listado", "WARNING")
                    return False
            else:
                print_status(f"Error obteniendo listado: {list_response.status_code}", "ERROR")
                return False
        else:
            error_data = response.json() if response.content else {}
            print_status(f"Error creando propiedad: {response.status_code} - {error_data}", "ERROR")
            return False
    except Exception as e:
        print_status(f"Error en test de propiedades: {e}", "ERROR")
        return False

def test_property_listing(token):
    """Test del listado de propiedades"""
    print_status("Probando listado de propiedades...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{API_BASE}/properties/", headers=headers)
        if response.status_code == 200:
            data = response.json()
            properties = data.get('results', data)
            count = len(properties) if isinstance(properties, list) else 0
            print_status(f"Listado exitoso: {count} propiedades encontradas", "SUCCESS")
            return True
        else:
            print_status(f"Error en listado: {response.status_code}", "ERROR")
            return False
    except Exception as e:
        print_status(f"Error en listado: {e}", "ERROR")
        return False

def run_complete_test():
    """Ejecutar test completo"""
    print(f"{Colors.BOLD}{Colors.BLUE}🚀 INICIANDO TEST AUTOMATIZADO DE VERIHOME{Colors.ENDC}")
    print(f"{Colors.BLUE}{'=' * 50}{Colors.ENDC}")
    
    # Test 1: Conexión al backend
    if not test_backend_connection():
        print_status("Test falló: Backend no disponible", "ERROR")
        return False
    
    # Test 2: Conexión al frontend
    if not test_frontend_connection():
        print_status("Test falló: Frontend no disponible", "ERROR")
        return False
    
    # Test 3: Crear usuario de prueba
    if not create_test_user():
        print_status("Test falló: No se pudo crear usuario", "ERROR")
        return False
    
    # Test 4: Login
    token = login_test_user()
    if not token:
        print_status("Test falló: No se pudo hacer login", "ERROR")
        return False
    
    # Test 5: Listado de propiedades
    if not test_property_listing(token):
        print_status("Test falló: Error en listado", "ERROR")
        return False
    
    # Test 6: Creación de propiedad
    if not test_property_creation(token):
        print_status("Test falló: Error en creación", "ERROR")
        return False
    
    print(f"{Colors.BOLD}{Colors.GREEN}🎉 TEST COMPLETADO EXITOSAMENTE{Colors.ENDC}")
    print(f"{Colors.GREEN}{'=' * 50}{Colors.ENDC}")
    return True

if __name__ == "__main__":
    try:
        success = run_complete_test()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print_status("Test interrumpido por el usuario", "WARNING")
        sys.exit(1)
    except Exception as e:
        print_status(f"Error inesperado: {e}", "ERROR")
        sys.exit(1) 