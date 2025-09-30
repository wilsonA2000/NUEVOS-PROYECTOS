#!/usr/bin/env python3
"""
Test Image URLs - Verify image URLs are correct and accessible
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
from properties.serializers import PropertySerializer
from django.test import RequestFactory
from django.conf import settings

User = get_user_model()

def test_image_urls():
    """Test that image URLs are correct and files exist."""
    
    print("🧪 TESTING IMAGE URLS AND FILE EXISTENCE")
    print("=" * 55)
    
    # Get properties with images
    properties_with_images = Property.objects.filter(images__isnull=False).distinct()
    
    if not properties_with_images.exists():
        print("❌ No properties with images found")
        return
    
    property_obj = properties_with_images.first()
    print(f"✅ Testing property: {property_obj.title}")
    print(f"   Property ID: {property_obj.id}")
    
    # Check images in database
    images = PropertyImage.objects.filter(property=property_obj)
    print(f"   Images in DB: {images.count()}")
    
    # Create request context
    factory = RequestFactory()
    request = factory.get('/api/v1/properties/')
    request.user = property_obj.landlord
    
    # Test PropertySerializer response
    serializer = PropertySerializer(property_obj, context={'request': request})
    data = serializer.data
    
    print(f"\n📤 SERIALIZER RESPONSE:")
    print(f"   - Images count: {len(data.get('images', []))}")
    print(f"   - Main image URL: {data.get('main_image_url', 'NO MAIN IMAGE')}")
    
    # Check each image
    for i, img_data in enumerate(data.get('images', [])):
        print(f"\n   📷 Image {i+1}:")
        print(f"      - ID: {img_data.get('id')}")
        print(f"      - Is main: {img_data.get('is_main')}")
        print(f"      - Image URL: {img_data.get('image_url')}")
        
        # Check if file exists
        img_obj = PropertyImage.objects.get(id=img_data['id'])
        if img_obj.image:
            file_path = img_obj.image.path
            file_exists = os.path.exists(file_path)
            file_size = os.path.getsize(file_path) if file_exists else 0
            
            print(f"      - File path: {file_path}")
            print(f"      - File exists: {file_exists}")
            print(f"      - File size: {file_size} bytes")
            print(f"      - Image.url: {img_obj.image.url}")
        else:
            print(f"      - ❌ No image file attached!")
    
    # Check Django settings for media files
    print(f"\n⚙️  DJANGO MEDIA SETTINGS:")
    print(f"   - MEDIA_URL: {settings.MEDIA_URL}")
    print(f"   - MEDIA_ROOT: {settings.MEDIA_ROOT}")
    
    # Check if MEDIA_ROOT exists
    media_root_exists = os.path.exists(settings.MEDIA_ROOT)
    print(f"   - MEDIA_ROOT exists: {media_root_exists}")
    
    if media_root_exists:
        properties_dir = os.path.join(settings.MEDIA_ROOT, 'properties', 'images')
        properties_dir_exists = os.path.exists(properties_dir)
        print(f"   - Properties images dir exists: {properties_dir_exists}")
        
        if properties_dir_exists:
            files_in_dir = os.listdir(properties_dir)
            print(f"   - Files in properties/images: {len(files_in_dir)}")
            for file in files_in_dir[:5]:  # Show first 5 files
                print(f"     - {file}")

if __name__ == '__main__':
    test_image_urls()