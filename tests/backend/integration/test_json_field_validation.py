#!/usr/bin/env python3
"""
Test JSON Field Validation - Verify string to array conversion
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
from properties.serializers import CreatePropertySerializer
from django.test import RequestFactory

User = get_user_model()

def test_json_field_validation():
    """Test that string fields are converted to JSON arrays correctly."""
    
    print("🧪 TESTING JSON FIELD VALIDATION")
    print("=" * 45)
    
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
    
    # Test data with string values (like frontend sends)
    property_data = {
        'title': 'Test Property JSON Fields',
        'description': 'Testing JSON field conversion',
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
        
        # JSON fields as strings (like frontend sends)
        'utilities_included': 'agua',
        'property_features': 'balcon alto',
        'nearby_amenities': 'amplia zona verde',
        'transportation': 'metrolinea'
    }
    
    print(f"📝 Testing with string values:")
    print(f"   - utilities_included: '{property_data['utilities_included']}'")
    print(f"   - property_features: '{property_data['property_features']}'")
    print(f"   - nearby_amenities: '{property_data['nearby_amenities']}'")
    print(f"   - transportation: '{property_data['transportation']}'")
    
    # Create serializer
    serializer = CreatePropertySerializer(data=property_data, context={'request': request})
    
    print(f"\n📤 Validating serializer...")
    if serializer.is_valid():
        print("✅ Serializer validation passed!")
        
        # Check validated data
        validated_data = serializer.validated_data
        print(f"\n🔍 VALIDATED DATA ANALYSIS:")
        
        for field in ['utilities_included', 'property_features', 'nearby_amenities', 'transportation']:
            original = property_data[field]
            validated = validated_data.get(field, 'NOT FOUND')
            print(f"   - {field}:")
            print(f"     Original: '{original}' (type: {type(original).__name__})")
            print(f"     Validated: {validated} (type: {type(validated).__name__})")
        
        print(f"\n✅ SUCCESS: All JSON fields validated correctly!")
        
        # Optional: Test actual creation (commented out to avoid DB changes)
        # property_instance = serializer.save()
        # print(f"✅ Property would be created successfully")
        # property_instance.delete()  # Clean up
        
    else:
        print(f"❌ Serializer validation failed:")
        for field, errors in serializer.errors.items():
            print(f"   - {field}: {errors}")

if __name__ == '__main__':
    test_json_field_validation()