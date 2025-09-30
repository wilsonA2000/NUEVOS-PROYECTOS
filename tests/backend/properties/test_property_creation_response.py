#!/usr/bin/env python3
"""
Test Property Creation Response
Verify that CreatePropertySerializer returns ID and images properly
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
from properties.serializers import CreatePropertySerializer
from django.test import RequestFactory
from django.core.files.uploadedfile import SimpleUploadedFile
import tempfile
from PIL import Image
import io

User = get_user_model()

def create_test_image():
    """Create a test image file."""
    # Create a simple image
    image = Image.new('RGB', (100, 100), color='red')
    img_buffer = io.BytesIO()
    image.save(img_buffer, format='JPEG')
    img_buffer.seek(0)
    
    return SimpleUploadedFile(
        name='test_image.jpg',
        content=img_buffer.read(),
        content_type='image/jpeg'
    )

def test_property_creation_response():
    """Test that property creation returns proper response with ID and images."""
    
    print("🧪 TESTING PROPERTY CREATION RESPONSE")
    print("=" * 50)
    
    # Get or create a test user
    try:
        user = User.objects.filter(user_type='landlord').first()
        if not user:
            user = User.objects.create_user(
                email='test_landlord@test.com',
                password='testpassword',
                first_name='Test',
                last_name='Landlord',
                user_type='landlord',
                is_email_verified=True
            )
        print(f"✅ Using test user: {user.email}")
    except Exception as e:
        print(f"❌ Error creating/getting user: {e}")
        return
    
    # Create request context
    factory = RequestFactory()
    request = factory.post('/api/v1/properties/')
    request.user = user
    
    # Create test data
    test_image = create_test_image()
    
    property_data = {
        'title': 'Test Property for Response Check',
        'description': 'Testing property creation response format',
        'property_type': 'apartment',
        'listing_type': 'rent',
        'status': 'available',
        'address': 'Calle Test 123',
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
        'images': [test_image]
    }
    
    try:
        # Create serializer with context
        serializer = CreatePropertySerializer(
            data=property_data,
            context={'request': request}
        )
        
        print(f"📝 Validating serializer data...")
        if serializer.is_valid():
            print("✅ Serializer validation passed")
            
            # Save the property
            print(f"💾 Creating property...")
            property_instance = serializer.save()
            print(f"✅ Property created: {property_instance.id}")
            
            # Get the response representation
            print(f"📤 Getting response representation...")
            response_data = serializer.to_representation(property_instance)
            
            print(f"\n🔍 RESPONSE DATA ANALYSIS:")
            print(f"   - Has 'id' field: {'id' in response_data}")
            print(f"   - Has 'short_id' field: {'short_id' in response_data}")
            print(f"   - Has 'images' field: {'images' in response_data}")
            print(f"   - Has 'videos' field: {'videos' in response_data}")
            
            if 'id' in response_data:
                print(f"   - Original ID: {response_data['id']}")
            if 'short_id' in response_data:
                print(f"   - Short ID: {response_data['short_id']}")
            if 'images' in response_data:
                print(f"   - Images count: {len(response_data['images'])}")
                if response_data['images']:
                    print(f"   - First image URL: {response_data['images'][0].get('image_url', 'No URL')}")
            
            # Verify images were created
            images_count = PropertyImage.objects.filter(property=property_instance).count()
            print(f"   - Images in DB: {images_count}")
            
            print(f"\n✅ SUCCESS: Property creation response includes all required data!")
            
            # Clean up
            property_instance.delete()
            print(f"🧹 Test property cleaned up")
            
        else:
            print(f"❌ Serializer validation failed:")
            for field, errors in serializer.errors.items():
                print(f"   - {field}: {errors}")
                
    except Exception as e:
        print(f"❌ Error during property creation test: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_property_creation_response()