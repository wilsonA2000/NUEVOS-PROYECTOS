#!/usr/bin/env python3
"""
Script para probar el módulo de propiedades con requests reales HTTP.
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
from django.urls import reverse

User = get_user_model()

def test_properties_with_client():
    """Test con Django test client (simula requests HTTP)."""
    print("🔍 Testing Properties with Django Test Client...")
    
    try:
        # Crear cliente de test
        client = Client()
        
        # Login con usuario admin
        user = User.objects.filter(email='admin@verihome.com').first()
        if not user:
            print("❌ No se encontró usuario admin")
            return False
            
        # Force login
        client.force_login(user)
        
        # Test endpoint de propiedades
        response = client.get('/api/v1/properties/properties/')
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code != 200:
            print(f"❌ Error Response: {response.content.decode()}")
            return False
        else:
            data = response.json()
            print(f"✅ Success: Found {len(data.get('results', data))} properties")
            return True
            
    except Exception as e:
        print(f"❌ Test Error: {e}")
        import traceback
        print(traceback.format_exc())
        return False

def test_properties_endpoints():
    """Test de múltiples endpoints de propiedades."""
    print("🔍 Testing Multiple Properties Endpoints...")
    
    try:
        client = Client()
        
        # Login con usuario admin
        user = User.objects.filter(email='admin@verihome.com').first()
        client.force_login(user)
        
        endpoints = [
            '/api/v1/properties/properties/',
            '/api/v1/properties/properties/search/',
            '/api/v1/properties/filters/',
        ]
        
        results = {}
        
        for endpoint in endpoints:
            try:
                response = client.get(endpoint)
                results[endpoint] = {
                    'status': response.status_code,
                    'success': response.status_code == 200
                }
                if response.status_code != 200:
                    results[endpoint]['error'] = response.content.decode()[:200]
                    
            except Exception as e:
                results[endpoint] = {
                    'status': 'ERROR',
                    'success': False,
                    'error': str(e)
                }
        
        # Mostrar resultados
        for endpoint, result in results.items():
            status = "✅" if result['success'] else "❌"
            print(f"{status} {endpoint}: {result['status']}")
            if not result['success'] and 'error' in result:
                print(f"    Error: {result['error']}")
        
        return all(r['success'] for r in results.values())
        
    except Exception as e:
        print(f"❌ Multiple Test Error: {e}")
        return False

def check_properties_urls():
    """Verificar URLs de propiedades."""
    print("🔍 Checking Properties URLs...")
    
    try:
        from properties.api_urls import urlpatterns
        print(f"✅ Properties API URLs loaded: {len(urlpatterns)} patterns")
        
        for pattern in urlpatterns[:5]:  # Mostrar primeros 5
            print(f"  - {pattern.pattern}")
        
        return True
        
    except Exception as e:
        print(f"❌ URLs Error: {e}")
        return False

def main():
    """Función principal."""
    print("🚀 Testing Properties Module Real Functionality")
    print("=" * 60)
    
    success = True
    
    # Check URLs
    if not check_properties_urls():
        success = False
    
    print("-" * 40)
    
    # Test basic properties endpoint
    if not test_properties_with_client():
        success = False
    
    print("-" * 40)
    
    # Test multiple endpoints
    if not test_properties_endpoints():
        success = False
    
    print("=" * 60)
    
    if success:
        print("✅ All properties tests passed!")
    else:
        print("❌ Some properties tests failed!")
    
    return success

if __name__ == '__main__':
    main()