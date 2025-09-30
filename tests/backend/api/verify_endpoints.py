#!/usr/bin/env python3
"""
Verificar endpoints principales de Properties API
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model

User = get_user_model()

def test_endpoints():
    """Test all essential property endpoints."""
    
    print("🧪 TESTING PROPERTIES API ENDPOINTS")
    print("=" * 50)
    
    # Get admin user
    try:
        user = User.objects.get(email='admin@verihome.com')
        print(f"🔐 Using admin user: {user.email}")
    except User.DoesNotExist:
        print("❌ Admin user not found")
        return
    
    # Create client and authenticate
    client = Client()
    client.force_login(user)
    
    # Test endpoints
    endpoints = [
        ('GET', '/api/v1/properties/properties/', 'Lista de propiedades'),
        ('GET', '/api/v1/properties/search/', 'Búsqueda de propiedades'),
        ('GET', '/api/v1/properties/filters/', 'Filtros disponibles'),
        ('GET', '/api/v1/properties/featured/', 'Propiedades destacadas'),
        ('GET', '/api/v1/properties/trending/', 'Propiedades trending'),
        ('GET', '/api/v1/properties/stats/', 'Estadísticas de propiedades'),
        ('GET', '/api/v1/properties/amenities/', 'Amenidades disponibles'),
        ('GET', '/api/v1/properties/favorites/', 'Propiedades favoritas'),
        ('GET', '/api/v1/properties/inquiries/', 'Consultas de propiedades'),
    ]
    
    results = []
    
    for method, url, description in endpoints:
        try:
            if method == 'GET':
                response = client.get(url)
            elif method == 'POST':
                response = client.post(url)
            
            if response.status_code == 200:
                results.append(f"✅ {description}: {response.status_code}")
            else:
                results.append(f"❌ {description}: {response.status_code}")
                
        except Exception as e:
            results.append(f"💥 {description}: ERROR - {str(e)}")
    
    # Print results
    print("\n📊 RESULTADOS:")
    for result in results:
        print(result)
    
    # Test specific property detail
    print("\n🔍 TESTING SPECIFIC PROPERTY:")
    property_id = "73bbe7e0-a918-458c-b371-679cbba5ebac"
    response = client.get(f'/api/v1/properties/properties/{property_id}/')
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Property detail: {data.get('title', 'NO TITLE')}")
        print(f"   - Images: {len(data.get('images', []))}")
        print(f"   - Main image URL: {data.get('main_image_url', 'NO URL')}")
    else:
        print(f"❌ Property detail: {response.status_code}")
    
    # Summary
    successful = len([r for r in results if r.startswith('✅')])
    total = len(results)
    print(f"\n📈 RESUMEN: {successful}/{total} endpoints funcionando correctamente")

if __name__ == '__main__':
    test_endpoints()