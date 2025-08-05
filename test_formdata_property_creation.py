#!/usr/bin/env python3
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.test import Client
import tempfile
from PIL import Image
import io

def test_formdata_property_creation():
    """Test crear una propiedad usando FormData como el frontend."""
    
    User = get_user_model()
    user = User.objects.get(email='landlord@test.com')
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)

    client = Client()
    
    print('🧪 Testing creación de propiedad con FormData')
    
    # Crear una imagen de prueba
    image = Image.new('RGB', (100, 100), color='red')
    image_io = io.BytesIO()
    image.save(image_io, format='JPEG')
    image_io.seek(0)
    
    # Datos como FormData (similar al frontend)
    form_data = {
        'title': 'Casa de Prueba FormData',
        'description': 'Descripción de casa de prueba',
        'property_type': 'apartment',
        'listing_type': 'rent',
        'status': 'available',
        'address': 'Calle Falsa 123',
        'city': 'Medellín',
        'state': 'Antioquia',
        'country': 'Colombia',
        'bedrooms': '2',
        'bathrooms': '1',
        'total_area': '80',
        'rent_price': '1500000',
        'pets_allowed': 'false',
        'smoking_allowed': 'false',
        'furnished': 'false',
        'is_active': 'true',
        'images': image_io,
    }
    
    try:
        response = client.post(
            '/api/v1/properties/properties/', 
            data=form_data, 
            HTTP_AUTHORIZATION=f'Bearer {access_token}'
        )
        
        print(f'Status: {response.status_code}')
        
        if response.status_code == 201:
            print('✅ Propiedad con FormData creada exitosamente')
            return True
        else:
            print(f'❌ Error Status: {response.status_code}')
            print(f'❌ Error Content: {response.content.decode()}')
            
            # Try to parse as JSON to get better error info
            try:
                import json
                error_data = json.loads(response.content.decode())
                print(f'📋 Error JSON: {json.dumps(error_data, indent=2)}')
            except:
                pass
            
            return False
            
    except Exception as e:
        print(f'❌ Exception: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_formdata_property_creation()
    print('✅ SUCCESS' if success else '❌ FAILED')