#!/usr/bin/env python3
"""
Check API Response - Verify actual API response structure
"""

import os
import sys
import django
import json
from pathlib import Path

# Setup Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from properties.models import Property

User = get_user_model()

def check_api_response():
    """Check actual API response."""
    
    print("🧪 CHECKING API RESPONSE STRUCTURE")
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
    
    # Get property with images
    property_id = "73bbe7e0-a918-458c-b371-679cbba5ebac"  # From your logs
    
    # Test detail endpoint
    response = client.get(f'/api/v1/properties/properties/{property_id}/')
    
    if response.status_code == 200:
        data = response.json()
        
        print(f"✅ Property found: {data.get('title', 'NO TITLE')}")
        print(f"   ID: {data.get('id')}")
        print(f"\n🔍 MAIN IMAGE URL:")
        print(f"   main_image_url: {data.get('main_image_url', 'NO MAIN IMAGE URL')}")
        
        print(f"\n🔍 IMAGES ARRAY:")
        images = data.get('images', [])
        print(f"   Images count: {len(images)}")
        
        if images:
            for i, img in enumerate(images[:3]):  # Show first 3
                print(f"\n   📷 Image {i+1}:")
                print(f"      - id: {img.get('id')}")
                print(f"      - image: {img.get('image')}")
                print(f"      - image_url: {img.get('image_url', 'NO IMAGE_URL')}")
                print(f"      - is_main: {img.get('is_main')}")
                print(f"      - Full image object: {json.dumps(img, indent=2)}")
        else:
            print("   ❌ No images in response")
            
        # Check if any image URL is None or contains 'undefined'
        has_issues = False
        if not data.get('main_image_url'):
            print("\n❌ ISSUE: main_image_url is None/empty")
            has_issues = True
            
        for img in images:
            if not img.get('image_url'):
                print(f"\n❌ ISSUE: Image {img.get('id')} has no image_url")
                has_issues = True
                
        if not has_issues:
            print("\n✅ All image URLs look correct")
            
    else:
        print(f"❌ API request failed: {response.status_code}")
        print(f"   Response: {response.content}")

if __name__ == '__main__':
    check_api_response()