#!/usr/bin/env python3
"""
Script para simular exactamente las requests del frontend.
"""

import os
import sys
import django
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

import requests
import json
from django.contrib.auth import get_user_model
from django.test import Client

User = get_user_model()

def test_frontend_properties_requests():
    """Test que simula exactamente las requests del frontend."""
    print("🔍 Testing Frontend Properties Requests...")
    
    try:
        # Crear cliente con headers HTTP adecuados
        client = Client(
            HTTP_ACCEPT='application/json',
            HTTP_CONTENT_TYPE='application/json'
        )
        
        # Login con usuario admin
        user = User.objects.filter(email='admin@verihome.com').first()
        if not user:
            print("❌ No se encontró usuario admin")
            return False
            
        client.force_login(user)
        
        # Test 1: Lista básica de propiedades (lo que hace el frontend)
        print("📋 Test 1: Basic properties list...")
        response = client.get('/api/v1/properties/properties/', {
            'page': 1,
            'page_size': 20,
        })
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                properties_count = len(data)
            else:
                properties_count = len(data.get('results', []))
            print(f"   ✅ Found {properties_count} properties")
        else:
            print(f"   ❌ Error: {response.content.decode()[:200]}")
            return False
        
        # Test 2: Propiedades con filtros
        print("🔍 Test 2: Properties with filters...")
        response = client.get('/api/v1/properties/properties/', {
            'search': 'casa',
            'ordering': '-created_at',
        })
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   ✅ Search and ordering working")
        else:
            print(f"   ❌ Filter Error: {response.content.decode()[:200]}")
        
        # Test 3: Property detail (random property)
        if properties_count > 0:
            print("📄 Test 3: Property detail...")
            data = client.get('/api/v1/properties/properties/').json()
            if isinstance(data, list):
                first_property = data[0]
            else:
                first_property = data.get('results', [])[0]
            
            property_id = first_property['id']
            response = client.get(f'/api/v1/properties/properties/{property_id}/')
            
            print(f"   Status: {response.status_code}")
            if response.status_code == 200:
                detail_data = response.json()
                print(f"   ✅ Property detail: {detail_data.get('title', 'No title')}")
            else:
                print(f"   ❌ Detail Error: {response.content.decode()[:200]}")
        
        # Test 4: Filters endpoint
        print("⚙️ Test 4: Filters endpoint...")
        response = client.get('/api/v1/properties/filters/')
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            filters_data = response.json()
            print(f"   ✅ Filters available: {list(filters_data.keys())}")
        else:
            print(f"   ❌ Filters Error: {response.content.decode()[:200]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Frontend Test Error: {e}")
        import traceback
        print(traceback.format_exc())
        return False

def test_performance():
    """Test de performance de las requests."""
    print("⚡ Testing Performance...")
    
    import time
    
    try:
        client = Client()
        user = User.objects.filter(email='admin@verihome.com').first()
        client.force_login(user)
        
        # Medir tiempo de respuesta
        start_time = time.time()
        response = client.get('/api/v1/properties/properties/')
        end_time = time.time()
        
        response_time = (end_time - start_time) * 1000  # En milisegundos
        
        print(f"   Status: {response.status_code}")
        print(f"   Response Time: {response_time:.2f}ms")
        
        if response_time < 500:  # Menos de 500ms es bueno
            print(f"   ✅ Performance: Good ({response_time:.2f}ms)")
        elif response_time < 1000:  # Menos de 1 segundo es aceptable
            print(f"   ⚠️ Performance: Acceptable ({response_time:.2f}ms)")
        else:
            print(f"   ❌ Performance: Slow ({response_time:.2f}ms)")
        
        return response.status_code == 200 and response_time < 1000
        
    except Exception as e:
        print(f"❌ Performance Test Error: {e}")
        return False

def main():
    """Función principal."""
    print("🚀 Frontend Properties Module Test")
    print("=" * 50)
    
    success = True
    
    # Test frontend requests
    if not test_frontend_properties_requests():
        success = False
    
    print("-" * 30)
    
    # Test performance
    if not test_performance():
        success = False
    
    print("=" * 50)
    
    if success:
        print("✅ Properties module working correctly!")
        print("🎉 Ready for frontend use!")
    else:
        print("❌ Properties module has issues!")
    
    return success

if __name__ == '__main__':
    main()