#!/usr/bin/env python3
"""
Script de prueba para verificar las APIs de contratos y mensajes.
"""

import requests
import json
import os
from datetime import datetime

# Configuración
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpass123"

def test_auth():
    """Probar autenticación"""
    print("🔐 === PROBANDO AUTENTICACIÓN ===")
    
    # Intentar login
    login_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/login/", json=login_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            token = response.json().get('access')
            print("✅ Login exitoso")
            return token
        else:
            print(f"❌ Login falló: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Error en login: {e}")
        return None

def test_contracts_api(token):
    """Probar API de contratos"""
    print("\n📋 === PROBANDO API DE CONTRATOS ===")
    
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    # Probar obtener contratos
    try:
        response = requests.get(f"{API_BASE_URL}/contracts/contracts/", headers=headers)
        print(f"GET /contracts/contracts/ - Status: {response.status_code}")
        
        if response.status_code == 200:
            contracts = response.json()
            print(f"✅ Contratos obtenidos: {len(contracts)}")
            if contracts:
                print(f"   Primer contrato: {contracts[0].get('id', 'N/A')}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error al obtener contratos: {e}")
    
    # Probar estadísticas
    try:
        response = requests.get(f"{API_BASE_URL}/contracts/stats/", headers=headers)
        print(f"GET /contracts/stats/ - Status: {response.status_code}")
        
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Estadísticas obtenidas: {stats}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error al obtener estadísticas: {e}")

def test_messages_api(token):
    """Probar API de mensajes"""
    print("\n💬 === PROBANDO API DE MENSAJES ===")
    
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    # Probar obtener mensajes
    try:
        response = requests.get(f"{API_BASE_URL}/messages/messages/", headers=headers)
        print(f"GET /messages/messages/ - Status: {response.status_code}")
        
        if response.status_code == 200:
            messages = response.json()
            print(f"✅ Mensajes obtenidos: {len(messages)}")
            if messages:
                print(f"   Primer mensaje: {messages[0].get('id', 'N/A')}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error al obtener mensajes: {e}")
    
    # Probar conteo de no leídos
    try:
        response = requests.get(f"{API_BASE_URL}/messages/unread-count/", headers=headers)
        print(f"GET /messages/unread-count/ - Status: {response.status_code}")
        
        if response.status_code == 200:
            unread = response.json()
            print(f"✅ No leídos: {unread.get('count', 0)}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error al obtener no leídos: {e}")
    
    # Probar hilos
    try:
        response = requests.get(f"{API_BASE_URL}/messages/threads/", headers=headers)
        print(f"GET /messages/threads/ - Status: {response.status_code}")
        
        if response.status_code == 200:
            threads = response.json()
            print(f"✅ Hilos obtenidos: {len(threads)}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error al obtener hilos: {e}")
    
    # Probar carpetas
    try:
        response = requests.get(f"{API_BASE_URL}/messages/folders/", headers=headers)
        print(f"GET /messages/folders/ - Status: {response.status_code}")
        
        if response.status_code == 200:
            folders = response.json()
            print(f"✅ Carpetas obtenidas: {len(folders)}")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error al obtener carpetas: {e}")

def test_health_check():
    """Probar health check del servidor"""
    print("\n🏥 === PROBANDO HEALTH CHECK ===")
    
    try:
        response = requests.get("http://localhost:8000/")
        print(f"GET / - Status: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Servidor respondiendo")
        else:
            print(f"❌ Servidor con problemas: {response.status_code}")
    except Exception as e:
        print(f"❌ No se puede conectar al servidor: {e}")

def main():
    """Función principal"""
    print("🚀 === INICIANDO PRUEBAS DE MÓDULOS ===")
    print(f"📅 Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🌐 API Base URL: {API_BASE_URL}")
    
    # Probar health check
    test_health_check()
    
    # Probar autenticación
    token = test_auth()
    
    # Probar APIs
    test_contracts_api(token)
    test_messages_api(token)
    
    print("\n✅ === PRUEBAS COMPLETADAS ===")

if __name__ == "__main__":
    main() 