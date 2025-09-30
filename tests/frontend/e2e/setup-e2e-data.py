#!/usr/bin/env python3
"""
VeriHome E2E Testing Data Setup
Creates test data fixtures for E2E testing
"""

import os
import sys
from pathlib import Path

# Add Django project to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))
os.chdir(str(project_root))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')

import django
django.setup()

from django.contrib.auth import get_user_model
from properties.models import Property, PropertyImage, PropertyAmenity, PropertyAmenityRelation
from contracts.models import Contract
from users.models.user import User

def create_test_users():
    """Create test users for E2E testing"""
    print("🔧 Creating test users...")
    
    User = get_user_model()
    
    # Test users data
    test_users = [
        {
            'email': 'landlord@test.com',
            'password': 'test123',
            'first_name': 'John',
            'last_name': 'Landlord',
            'user_type': 'landlord',
            'phone_number': '3001234567',
            'is_active': True,
            'is_verified': True
        },
        {
            'email': 'tenant@test.com',
            'password': 'test123',
            'first_name': 'Jane',
            'last_name': 'Tenant',
            'user_type': 'tenant',
            'phone_number': '3007654321',
            'is_active': True,
            'is_verified': True
        },
        {
            'email': 'service@test.com',
            'password': 'test123',
            'first_name': 'Bob',
            'last_name': 'Service',
            'user_type': 'service_provider',
            'phone_number': '3009876543',
            'is_active': True,
            'is_verified': True
        }
    ]
    
    for user_data in test_users:
        email = user_data['email']
        if not User.objects.filter(email=email).exists():
            user = User.objects.create_user(**user_data)
            print(f"✅ Created user: {email}")
        else:
            print(f"ℹ️  User already exists: {email}")

def create_test_amenities():
    """Create test amenities"""
    print("🏠 Creating test amenities...")
    
    amenities = [
        'parqueadero', 'piscina', 'gimnasio', 'balcon', 'porteria',
        'jardin', 'bbq', 'terraza', 'ascensor', 'vitrina'
    ]
    
    for amenity_name in amenities:
        amenity, created = PropertyAmenity.objects.get_or_create(
            name=amenity_name,
            defaults={'description': f'{amenity_name} para la propiedad'}
        )
        if created:
            print(f"✅ Created amenity: {amenity_name}")

def create_test_properties():
    """Create test properties"""
    print("🏢 Creating test properties...")
    
    User = get_user_model()
    landlord = User.objects.filter(email='landlord@test.com').first()
    
    if not landlord:
        print("❌ Landlord user not found. Create users first.")
        return
    
    properties_data = [
        {
            'title': 'Luxury Apartment E2E Test',
            'description': 'Test apartment for E2E testing',
            'address': 'Carrera 43A #5-15, El Poblado',
            'city': 'Medellín',
            'property_type': 'apartment',
            'rent_price': 3500000,
            'sale_price': 650000000,
            'bedrooms': 3,
            'bathrooms': 2,
            'total_area': 120,
            'furnished': True,
            'is_active': True,
            'landlord': landlord
        },
        {
            'title': 'Family House E2E Test',
            'description': 'Test house for E2E testing',
            'address': 'Calle 30 Sur #25-45, Las Antillas',
            'city': 'Envigado',
            'property_type': 'house',
            'rent_price': 2800000,
            'sale_price': 520000000,
            'bedrooms': 4,
            'bathrooms': 3,
            'total_area': 180,
            'furnished': False,
            'is_active': True,
            'landlord': landlord
        }
    ]
    
    for prop_data in properties_data:
        title = prop_data['title']
        if not Property.objects.filter(title=title).exists():
            property_obj = Property.objects.create(**prop_data)
            print(f"✅ Created property: {title}")
            
            # Add amenities through PropertyAmenityRelation
            amenities = PropertyAmenity.objects.filter(name__in=['parqueadero', 'piscina', 'gimnasio'])
            for amenity in amenities:
                PropertyAmenityRelation.objects.get_or_create(
                    property=property_obj,
                    amenity=amenity,
                    defaults={'available': True}
                )
            
        else:
            print(f"ℹ️  Property already exists: {title}")

def verify_e2e_setup():
    """Verify E2E testing setup"""
    print("\n🔍 Verifying E2E setup...")
    
    User = get_user_model()
    
    # Check users
    test_emails = ['landlord@test.com', 'tenant@test.com', 'service@test.com']
    for email in test_emails:
        if User.objects.filter(email=email).exists():
            print(f"✅ User exists: {email}")
        else:
            print(f"❌ User missing: {email}")
    
    # Check properties
    properties_count = Property.objects.filter(title__contains='E2E Test').count()
    print(f"✅ E2E Test properties: {properties_count}")
    
    # Check amenities
    amenities_count = PropertyAmenity.objects.count()
    print(f"✅ Amenities available: {amenities_count}")
    
    print("\n🎯 E2E Testing environment ready!")

def main():
    """Main setup function"""
    print("🚀 VeriHome E2E Testing Setup")
    print("=" * 50)
    
    try:
        create_test_users()
        create_test_amenities()
        create_test_properties()
        verify_e2e_setup()
        
        print("\n✅ E2E Testing setup completed successfully!")
        print("\nNext steps:")
        print("1. Ensure Django server is running: python manage.py runserver")
        print("2. Ensure React frontend is running: cd frontend && npm run dev")
        print("3. Run E2E tests: npm run test:smoke")
        
    except Exception as e:
        print(f"❌ Error during setup: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()