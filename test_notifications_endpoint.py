#!/usr/bin/env python3

import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

import requests
import json

def test_notifications_endpoint():
    """Test específico para el endpoint de notificaciones."""
    
    base_url = "http://localhost:8000/api/v1"
    
    print("🧪 === TEST ENDPOINT NOTIFICACIONES ===")
    
    # Credenciales de prueba
    credentials = {
        'email': 'landlord@test.com',
        'password': 'test123'
    }
    
    try:
        # 1. Hacer login
        login_url = f"{base_url}/users/auth/login/"
        login_response = requests.post(login_url, json=credentials)
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            access_token = login_data.get('access')
            print(f"✅ Login exitoso, token obtenido")
            
            # 2. Test notifications endpoint
            headers = {'Authorization': f'Bearer {access_token}'}
            notifications_url = f"{base_url}/users/notifications/"
            print(f"📡 GET {notifications_url}")
            
            notifications_response = requests.get(notifications_url, headers=headers)
            print(f"📊 Notifications Status: {notifications_response.status_code}")
            
            if notifications_response.status_code == 200:
                notifications_data = notifications_response.json()
                print(f"✅ Notificaciones obtenidas correctamente!")
                print(f"📋 Cantidad de notificaciones: {len(notifications_data.get('results', []))}")
                return True
            else:
                print(f"❌ Error en notificaciones:")
                print(f"   Status: {notifications_response.status_code}")
                print(f"   Content: {notifications_response.text[:200]}")
                return False
                
        else:
            print(f"❌ Error en login: {login_response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    success = test_notifications_endpoint()
    if success:
        print("\n✅ Endpoint de notificaciones funcionando")
    else:
        print("\n❌ Endpoint de notificaciones tiene problemas")