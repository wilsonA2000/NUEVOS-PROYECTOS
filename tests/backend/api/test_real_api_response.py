#!/usr/bin/env python3
"""
Test Real API Response - Test actual API response from running server
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
from properties.models import Property

User = get_user_model()

def test_real_api_response():
    """Test real API response with proper authentication."""
    
    print("🧪 TESTING REAL API RESPONSE")
    print("=" * 40)
    
    # Get user and authenticate
    user = User.objects.filter(user_type='landlord').first()
    if not user:
        print("❌ No landlord user found")
        return
    
    print(f"✅ Using user: {user.email}")
    
    # Create client and force login
    client = Client()
    client.force_login(user)
    
    # Get properties
    properties = Property.objects.filter(images__isnull=False).distinct()
    if not properties.exists():
        print("❌ No properties with images found")
        return
    
    # Test list endpoint
    response = client.get('/api/v1/properties/properties/')
    print(f"📤 List endpoint response: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        results = data.get('results', [])
        
        if results:
            first_property = results[0]
            print(f"🏠 First property: {first_property.get('title', 'NO TITLE')}")
            print(f"   ID: {first_property.get('id')}")
            print(f"   Images count: {len(first_property.get('images', []))}")
            print(f"   Main image URL: {first_property.get('main_image_url', 'NO MAIN IMAGE')}")
            
            # Check first image
            images = first_property.get('images', [])
            if images:
                first_image = images[0]
                print(f"   First image:")
                print(f"     - ID: {first_image.get('id')}")
                print(f"     - Is main: {first_image.get('is_main')}")
                print(f"     - URL: {first_image.get('image_url')}")
                
                # Check URL structure
                image_url = first_image.get('image_url', '')
                if 'localhost:8000' in image_url:
                    print(f"   ✅ URL uses localhost:8000")
                elif 'testserver' in image_url:
                    print(f"   ⚠️ URL uses testserver")
                else:
                    print(f"   ❓ URL uses unknown host")
            else:
                print("   ❌ No images in first property")
        else:
            print("❌ No properties in results")
    else:
        print(f"❌ List endpoint failed: {response.status_code}")
        print(f"   Response: {response.content}")

if __name__ == '__main__':
    test_real_api_response()