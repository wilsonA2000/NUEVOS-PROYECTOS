#!/usr/bin/env python3
"""
Create Property with Images and Test Display
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from properties.models import Property, PropertyImage
from properties.serializers import PropertySerializer, CreatePropertySerializer
from django.test import RequestFactory
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
import io

User = get_user_model()

def create_test_image(name="test_image.jpg", color='red'):
    """Create a test image file."""
    image = Image.new('RGB', (100, 100), color=color)
    img_buffer = io.BytesIO()
    image.save(img_buffer, format='JPEG')
    img_buffer.seek(0)
    
    return SimpleUploadedFile(
        name=name,
        content=img_buffer.read(),
        content_type='image/jpeg'
    )

def test_create_and_display():
    """Create property with images and test API response."""
    
    print("🧪 CREATING PROPERTY WITH IMAGES AND TESTING DISPLAY")
    print("=" * 60)
    
    # Get user
    user = User.objects.filter(user_type='landlord').first()
    if not user:
        print("❌ No landlord user found")
        return
    
    print(f"✅ Using user: {user.email}")
    
    # Create request context
    factory = RequestFactory()
    request = factory.post('/api/v1/properties/')
    request.user = user
    
    # Create test images
    images = [
        create_test_image('main_image.jpg', 'blue'),
        create_test_image('room1.jpg', 'green'),
        create_test_image('kitchen.jpg', 'yellow')
    ]
    
    # Create property data
    property_data = {
        'title': 'Test Property con Imágenes',
        'description': 'Propiedad de prueba para verificar display de imágenes',
        'property_type': 'apartment',
        'listing_type': 'rent',
        'status': 'available',
        'address': 'Calle de Prueba 123',
        'city': 'Bogotá',
        'state': 'Cundinamarca',
        'country': 'Colombia',
        'postal_code': '110111',
        'latitude': '4.5709',
        'longitude': '-74.2973',
        'bedrooms': '2',
        'bathrooms': '1',
        'total_area': '80',
        'rent_price': '1500000',
        'pets_allowed': 'true',
        'furnished': 'false',
        'is_active': 'true',
        'images': images
    }
    
    print(f"📤 Creating property with {len(images)} images...")
    
    # Create property
    serializer = CreatePropertySerializer(data=property_data, context={'request': request})
    
    if serializer.is_valid():
        property_instance = serializer.save()
        print(f"✅ Property created: {property_instance.id}")
        
        # Check images in database
        images_count = PropertyImage.objects.filter(property=property_instance).count()
        print(f"✅ Images in DB: {images_count}")
        
        # Now test PropertySerializer response
        print(f"\n📤 Testing PropertySerializer response...")
        prop_serializer = PropertySerializer(property_instance, context={'request': request})
        data = prop_serializer.data
        
        print(f"🔍 API RESPONSE ANALYSIS:")
        print(f"   - Property ID: {data.get('id')}")
        print(f"   - Has 'images' field: {'images' in data}")
        print(f"   - Images count in response: {len(data.get('images', []))}")
        print(f"   - Has 'main_image_url': {'main_image_url' in data}")
        
        if data.get('images'):
            for i, img in enumerate(data['images']):
                print(f"   - Image {i+1}:")
                print(f"     - ID: {img.get('id')}")
                print(f"     - Has 'image_url': {'image_url' in img}")
                print(f"     - Image URL: {img.get('image_url', 'NO URL!')}")
                print(f"     - Is main: {img.get('is_main', False)}")
        else:
            print("   ❌ NO IMAGES IN RESPONSE!")
        
        if 'main_image_url' in data:
            print(f"   - Main image URL: {data.get('main_image_url', 'NO MAIN IMAGE URL!')}")
        
        # Clean up
        property_instance.delete()
        print(f"\n🧹 Test property cleaned up")
        
        if data.get('images') and len(data['images']) > 0:
            print(f"\n✅ SUCCESS: Images are displaying correctly!")
        else:
            print(f"\n❌ FAILURE: Images are NOT displaying in API response!")
        
    else:
        print(f"❌ Property creation failed:")
        for field, errors in serializer.errors.items():
            print(f"   - {field}: {errors}")

if __name__ == '__main__':
    test_create_and_display()