#\!/usr/bin/env python3

import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.test import Client
import json

def test_property_creation():
    """Test crear una nueva propiedad vía API."""
    
    User = get_user_model()
    user = User.objects.get(email='landlord@test.com')
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)

    client = Client()

    print('🧪 Testing creación de propiedad')
    print('URL: /api/v1/properties/')
    
    # Datos de prueba para crear una propiedad
    property_data = {
        'title': 'Test Property Creation',
        'description': 'Test property created from API test',
        'property_type': 'apartment',
        'listing_type': 'rent',
        'status': 'available',
        'address': 'Calle Test 123',
        'city': 'Medellín',
        'state': 'Antioquia',
        'country': 'Colombia',
        'postal_code': '050001',
        'latitude': 6.2442,
        'longitude': -75.5812,
        'bedrooms': 2,
        'bathrooms': 1,
        'total_area': 80,
        'rent_price': 1500000,
        'pets_allowed': False,
        'smoking_allowed': False,
        'furnished': False,
        'is_active': True
    }
    
    try:
        response = client.post(
            '/api/v1/properties/',
            data=property_data,
            HTTP_AUTHORIZATION=f'Bearer {access_token}',
            content_type='application/json'
        )
        
        print(f'📊 Status: {response.status_code}')

        if response.status_code == 201:
            print('✅ Propiedad creada exitosamente')
            try:
                data = response.json()
                print(f'🏠 ID de propiedad: {data.get("id")}')
                print(f'📍 Título: {data.get("title")}')
                print(f'🏙️ Ciudad: {data.get("city")}')
                return True
            except Exception as e:
                print(f'⚠️ Error parsing JSON: {e}')
                return False
        else:
            print(f'❌ Error Status: {response.status_code}')
            content = response.content.decode()
            print(f'Error content: {content[:500]}...')
            return False
                
    except Exception as e:
        print(f'❌ Exception: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_property_creation()
    if success:
        print('\n✅ === CREACIÓN DE PROPIEDAD FUNCIONAL ===')
    else:
        print('\n❌ === PROBLEMAS EN CREACIÓN DE PROPIEDAD ===')
EOF < /dev/null
