#!/usr/bin/env python3
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.test import Client
import json

def test_rental_validation():
    """Test validación de renta sin precio."""
    
    User = get_user_model()
    user = User.objects.get(email='landlord@test.com')
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)

    client = Client()
    
    print('🧪 Testing validación de propiedad de renta sin precio')
    
    # Datos para rental property sin rent_price
    property_data = {
        'title': 'Casa de Renta Sin Precio',
        'description': 'Test de validación',
        'property_type': 'apartment',
        'listing_type': 'rent',  # rental pero sin rent_price
        'status': 'available',
        'address': 'Calle Test 123',
        'city': 'Medellín',
        'state': 'Antioquia',
        'country': 'Colombia',
        'bedrooms': 2,
        'bathrooms': 1,
        'total_area': 80,
        # No rent_price provided - should fail validation
        'pets_allowed': False,
        'smoking_allowed': False,
        'furnished': False,
        'is_active': True
    }
    
    try:
        response = client.post(
            '/api/v1/properties/properties/', 
            data=property_data, 
            HTTP_AUTHORIZATION=f'Bearer {access_token}',
            content_type='application/json'
        )
        
        print(f'Status: {response.status_code}')
        
        if response.status_code == 400:
            print('✅ Validación funcionando - 400 esperado para rental sin precio')
            try:
                error_data = json.loads(response.content.decode())
                print(f'📋 Error details: {json.dumps(error_data, indent=2)}')
                if 'rent_price' in error_data:
                    print('✅ Error de rent_price específico encontrado')
                    return True
            except:
                print(f'❌ Error Content: {response.content.decode()}')
                return False
        else:
            print(f'❌ Validación falló - Expected 400, got {response.status_code}')
            return False
            
    except Exception as e:
        print(f'❌ Exception: {e}')
        return False

if __name__ == '__main__':
    success = test_rental_validation()
    print('✅ VALIDATION WORKING' if success else '❌ VALIDATION FAILED')