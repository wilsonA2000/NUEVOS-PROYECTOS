#!/usr/bin/env python3

import os
import sys
import django
from django.conf import settings

# Setup Django
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from properties.models import Property
from properties.serializers import PropertySerializer

print("🔍 DEBUGGING PROPERTY IMAGE DATA...")
print("=" * 50)

# Get all properties
properties = Property.objects.all()
print(f"📊 Total properties in database: {properties.count()}")

for i, property in enumerate(properties[:3], 1):  # Only show first 3
    print(f"\n🏠 PROPERTY {i}: {property.title}")
    print(f"   UUID: {property.id}")
    print(f"   Images count: {property.images.count()}")
    
    # Serialize the property
    serializer = PropertySerializer(property)
    data = serializer.data
    
    print(f"   main_image_url: {data.get('main_image_url')}")
    print(f"   images array length: {len(data.get('images', []))}")
    
    if data.get('images'):
        for j, img in enumerate(data['images'][:2]):  # Show first 2 images
            print(f"   Image {j+1}:")
            print(f"     - id: {img.get('id')}")
            print(f"     - image: {img.get('image')}")
            print(f"     - image_url: {img.get('image_url')}")
            print(f"     - is_main: {img.get('is_main')}")

print("\n" + "=" * 50)
print("✅ Debug complete!")