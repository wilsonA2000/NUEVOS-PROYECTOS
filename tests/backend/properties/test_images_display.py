#!/usr/bin/env python3
"""
Test Images Display - Verify images show correctly in API responses
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

def create_test_image(name="test_image.jpg"):
    """Create a test image file."""
    image = Image.new('RGB', (100, 100), color='red')
    img_buffer = io.BytesIO()
    image.save(img_buffer, format='JPEG')
    img_buffer.seek(0)
    
    return SimpleUploadedFile(
        name=name,
        content=img_buffer.read(),
        content_type='image/jpeg'
    )

def test_images_display():
    """Test that property images display correctly in API responses."""
    
    print("🧪 TESTING IMAGES DISPLAY IN API RESPONSES")
    print("=" * 55)
    
    # Get existing property with images
    properties_with_images = Property.objects.filter(images__isnull=False).distinct()
    
    if properties_with_images.exists():
        property_obj = properties_with_images.first()
        print(f"✅ Using existing property: {property_obj.title}")
        print(f"   Property ID: {property_obj.id}")
        print(f"   Images count in DB: {property_obj.images.count()}")
    else:
        print("❌ No existing properties with images found")
        return
    
    # Create request context
    factory = RequestFactory()
    request = factory.get('/api/v1/properties/')
    request.user = property_obj.landlord
    
    # Test with PropertySerializer
    print(f"\n📤 Testing PropertySerializer...")
    serializer = PropertySerializer(property_obj, context={'request': request})
    data = serializer.data
    
    print(f"🔍 SERIALIZER DATA ANALYSIS:")
    print(f"   - Has 'images' field: {'images' in data}")
    print(f"   - Images count in response: {len(data.get('images', []))}")
    
    if data.get('images'):
        for i, img in enumerate(data['images']):
            print(f"   - Image {i+1}:")
            print(f"     - Has 'image_url': {'image_url' in img}")
            print(f"     - Image URL: {img.get('image_url', 'NO URL!')}")
            print(f"     - Is main: {img.get('is_main', False)}")
    
    # Test main_image_url
    print(f"   - Has 'main_image_url': {'main_image_url' in data}")
    if 'main_image_url' in data:
        print(f"   - Main image URL: {data['main_image_url']}")
    
    # Test individual PropertyImage serialization
    print(f"\n📷 Testing individual PropertyImage...")
    if property_obj.images.exists():
        first_image = property_obj.images.first()
        from properties.serializers import PropertyImageSerializer
        
        img_serializer = PropertyImageSerializer(first_image, context={'request': request})
        img_data = img_serializer.data
        
        print(f"   - Image file path: {first_image.image.name if first_image.image else 'NO FILE'}")
        print(f"   - Image URL in serializer: {img_data.get('image_url', 'NO URL!')}")
        print(f"   - Direct image.url: {first_image.image.url if first_image.image else 'NO URL!'}")
    
    print(f"\n✅ Test completed! Check URLs above for image display issues.")

if __name__ == '__main__':
    test_images_display()