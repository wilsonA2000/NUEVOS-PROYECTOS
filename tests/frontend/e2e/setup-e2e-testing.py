#!/usr/bin/env python3
"""
VeriHome E2E Testing Setup Script
Configures and prepares the environment for end-to-end testing
"""

import os
import sys
import subprocess
from pathlib import Path

# Add Django project to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')

import django
django.setup()

def create_test_fixtures():
    """Create test data fixtures for E2E testing"""
    from django.contrib.auth import get_user_model
    from properties.models import Property, Amenity
    from contracts.models import Contract
    from messaging.models import Conversation, Message
    
    User = get_user_model()
    
    print("🔧 Creating test fixtures for E2E testing...")
    
    # Create test users
    test_users = []
    
    # Landlord user
    landlord, created = User.objects.get_or_create(
        email='landlord@test.com',
        defaults={
            'first_name': 'John',
            'last_name': 'Landlord',
            'user_type': 'landlord',
            'phone_number': '3001234567',
            'is_active': True,
        }
    )
    if created:
        landlord.set_password('test123')
        landlord.save()
        print(f"✅ Created landlord user: {landlord.email}")
    test_users.append(landlord)
    
    # Tenant user
    tenant, created = User.objects.get_or_create(
        email='tenant@test.com',
        defaults={
            'first_name': 'Jane',
            'last_name': 'Tenant',
            'user_type': 'tenant',
            'phone_number': '3007654321',
            'is_active': True,
        }
    )
    if created:
        tenant.set_password('test123')
        tenant.save()
        print(f"✅ Created tenant user: {tenant.email}")
    test_users.append(tenant)
    
    # Service provider user
    service, created = User.objects.get_or_create(
        email='service@test.com',
        defaults={
            'first_name': 'Bob',
            'last_name': 'Service',
            'user_type': 'service_provider',
            'phone_number': '3009876543',
            'is_active': True,
        }
    )
    if created:
        service.set_password('test123')
        service.save()
        print(f"✅ Created service provider user: {service.email}")
    test_users.append(service)
    
    # Create amenities
    amenity_names = [
        'Parqueadero', 'Piscina', 'Gimnasio', 'Balcón', 'Terraza',
        'Aire Acondicionado', 'Calefacción', 'Portería 24h', 'Ascensor', 'BBQ'
    ]
    
    amenities = []
    for name in amenity_names:
        amenity, created = Amenity.objects.get_or_create(
            name=name,
            defaults={'description': f'{name} disponible en la propiedad'}
        )
        amenities.append(amenity)
    
    print(f"✅ Created {len(amenities)} amenities")
    
    # Create test properties
    test_properties = [
        {
            'title': 'Luxury Apartment Poblado',
            'description': 'Beautiful luxury apartment in El Poblado with amazing city views',
            'address': 'Carrera 43A #5-15',
            'city': 'Medellín',
            'property_type': 'apartment',
            'rent_price': 3500000,
            'sale_price': 650000000,
            'bedrooms': 3,
            'bathrooms': 2,
            'area': 120,
            'is_active': True,
        },
        {
            'title': 'Cozy House Envigado',
            'description': 'Comfortable family house in quiet Envigado neighborhood',
            'address': 'Calle 30 Sur #25-45',
            'city': 'Envigado',
            'property_type': 'house',
            'rent_price': 2200000,
            'sale_price': 420000000,
            'bedrooms': 4,
            'bathrooms': 3,
            'area': 180,
            'is_active': True,
        },
        {
            'title': 'Modern Studio Sabaneta',
            'description': 'Contemporary studio apartment perfect for young professionals',
            'address': 'Carrera 45 #76-23',
            'city': 'Sabaneta',
            'property_type': 'studio',
            'rent_price': 1200000,
            'sale_price': 180000000,
            'bedrooms': 1,
            'bathrooms': 1,
            'area': 45,
            'is_active': True,
        }
    ]
    
    properties = []
    for prop_data in test_properties:
        prop, created = Property.objects.get_or_create(
            title=prop_data['title'],
            landlord=landlord,
            defaults=prop_data
        )
        if created:
            # Add some amenities to each property
            prop.amenities.add(*amenities[:5])
            print(f"✅ Created property: {prop.title}")
        properties.append(prop)
    
    # Create test contracts
    for i, prop in enumerate(properties[:2]):  # Only for first 2 properties
        contract, created = Contract.objects.get_or_create(
            title=f'Rental Contract - {prop.title}',
            defaults={
                'contract_type': 'rental_urban',
                'primary_party': landlord,
                'secondary_party': tenant,
                'property': prop,
                'description': f'Rental contract for {prop.title}',
                'content': 'Standard rental contract content...',
                'start_date': '2024-01-01',
                'end_date': '2024-12-31',
                'monthly_rent': prop.rent_price,
                'security_deposit': prop.rent_price,
                'status': 'active'
            }
        )
        if created:
            print(f"✅ Created contract: {contract.title}")
    
    # Create test conversations and messages
    conversation, created = Conversation.objects.get_or_create(
        subject='Property Inquiry - Luxury Apartment',
        defaults={}
    )
    if created:
        conversation.participants.add(landlord, tenant)
        
        # Create some test messages
        messages = [
            {'sender': tenant, 'body': 'Hi, I am interested in your luxury apartment. Is it still available?'},
            {'sender': landlord, 'body': 'Hello! Yes, the apartment is still available. Would you like to schedule a viewing?'},
            {'sender': tenant, 'body': 'That would be great! I am available this weekend.'},
            {'sender': landlord, 'body': 'Perfect! How about Saturday at 2 PM?'},
        ]
        
        for msg_data in messages:
            Message.objects.get_or_create(
                conversation=conversation,
                sender=msg_data['sender'],
                body=msg_data['body'],
                defaults={'message_type': 'text'}
            )
        
        print(f"✅ Created conversation with {len(messages)} messages")
    
    print("🎉 Test fixtures created successfully!")
    return {
        'users': test_users,
        'properties': properties,
        'amenities': amenities
    }

def install_cypress_dependencies():
    """Install Cypress and related dependencies"""
    print("📦 Installing Cypress dependencies...")
    
    e2e_dir = Path(__file__).parent
    os.chdir(e2e_dir)
    
    try:
        # Install npm dependencies
        subprocess.run(['npm', 'install'], check=True, capture_output=True, text=True)
        print("✅ Cypress dependencies installed successfully")
        
        # Install Cypress binary
        subprocess.run(['npx', 'cypress', 'install'], check=True, capture_output=True, text=True)
        print("✅ Cypress binary installed successfully")
        
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        print(f"Error output: {e.stderr}")
        return False

def verify_test_environment():
    """Verify that the test environment is properly configured"""
    print("🔍 Verifying test environment...")
    
    # Check if Django server is running
    import requests
    try:
        response = requests.get('http://localhost:8000/api/v1/', timeout=5)
        if response.status_code == 200:
            print("✅ Django backend is running")
        else:
            print(f"⚠️ Django backend returned status {response.status_code}")
    except requests.exceptions.RequestException:
        print("❌ Django backend is not running. Please start it with: python manage.py runserver")
        return False
    
    # Check if frontend is running
    try:
        response = requests.get('http://localhost:5173/', timeout=5)
        if response.status_code == 200:
            print("✅ Frontend is running")
        else:
            print(f"⚠️ Frontend returned status {response.status_code}")
    except requests.exceptions.RequestException:
        print("❌ Frontend is not running. Please start it with: cd frontend && npm run dev")
        return False
    
    # Check WebSocket endpoints
    if os.environ.get('ENABLE_WEBSOCKET_TESTS', 'true').lower() == 'true':
        import websocket
        try:
            ws_url = 'ws://localhost:8000/ws/messaging/'
            ws = websocket.create_connection(ws_url, timeout=5)
            ws.close()
            print("✅ WebSocket endpoint is accessible")
        except Exception as e:
            print(f"⚠️ WebSocket endpoint not accessible: {e}")
            print("   WebSocket tests will be disabled")
    
    print("🎉 Test environment verification completed!")
    return True

def create_test_scripts():
    """Create convenient test running scripts"""
    print("📝 Creating test runner scripts...")
    
    # Create run-tests.sh script
    script_content = """#!/bin/bash
# VeriHome E2E Testing Runner Script

echo "🚀 Starting VeriHome E2E Tests..."

# Check if services are running
echo "🔍 Checking services..."

# Check Django backend
if ! curl -f http://localhost:8000/api/v1/ > /dev/null 2>&1; then
    echo "❌ Django backend is not running. Start it with: python manage.py runserver"
    exit 1
fi

# Check frontend
if ! curl -f http://localhost:5173/ > /dev/null 2>&1; then
    echo "❌ Frontend is not running. Start it with: cd frontend && npm run dev"
    exit 1
fi

echo "✅ All services are running"

# Run test based on argument
case "$1" in
    "auth")
        echo "🧪 Running authentication tests..."
        npx cypress run --spec "cypress/e2e/auth/**/*.cy.js"
        ;;
    "properties")
        echo "🧪 Running property management tests..."
        npx cypress run --spec "cypress/e2e/properties/**/*.cy.js"
        ;;
    "websocket")
        echo "🧪 Running WebSocket tests..."
        npx cypress run --spec "cypress/e2e/websocket/**/*.cy.js"
        ;;
    "contracts")
        echo "🧪 Running contract tests..."
        npx cypress run --spec "cypress/e2e/contracts/**/*.cy.js"
        ;;
    "full")
        echo "🧪 Running all E2E tests..."
        npx cypress run
        ;;
    "open")
        echo "🧪 Opening Cypress test runner..."
        npx cypress open
        ;;
    *)
        echo "Usage: $0 {auth|properties|websocket|contracts|full|open}"
        echo ""
        echo "Test suites:"
        echo "  auth       - Authentication and user management tests"
        echo "  properties - Property creation, search, and management tests"  
        echo "  websocket  - Real-time messaging and WebSocket tests"
        echo "  contracts  - Contract creation and biometric authentication tests"
        echo "  full       - Run all test suites"
        echo "  open       - Open Cypress interactive test runner"
        exit 1
        ;;
esac

echo "🎉 Tests completed!"
"""
    
    script_path = Path(__file__).parent / 'run-tests.sh'
    with open(script_path, 'w') as f:
        f.write(script_content)
    
    # Make script executable
    os.chmod(script_path, 0o755)
    print(f"✅ Created test runner script: {script_path}")
    
    # Create Windows batch file
    batch_content = """@echo off
REM VeriHome E2E Testing Runner Script for Windows

echo 🚀 Starting VeriHome E2E Tests...

REM Check if services are running
echo 🔍 Checking services...

REM Check Django backend
curl -f http://localhost:8000/api/v1/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Django backend is not running. Start it with: python manage.py runserver
    exit /b 1
)

REM Check frontend
curl -f http://localhost:5173/ >nul 2>&1
if errorlevel 1 (
    echo ❌ Frontend is not running. Start it with: cd frontend && npm run dev
    exit /b 1
)

echo ✅ All services are running

REM Run test based on argument
if "%1"=="auth" (
    echo 🧪 Running authentication tests...
    npx cypress run --spec "cypress/e2e/auth/**/*.cy.js"
) else if "%1"=="properties" (
    echo 🧪 Running property management tests...
    npx cypress run --spec "cypress/e2e/properties/**/*.cy.js"
) else if "%1"=="websocket" (
    echo 🧪 Running WebSocket tests...
    npx cypress run --spec "cypress/e2e/websocket/**/*.cy.js"
) else if "%1"=="contracts" (
    echo 🧪 Running contract tests...
    npx cypress run --spec "cypress/e2e/contracts/**/*.cy.js"
) else if "%1"=="full" (
    echo 🧪 Running all E2E tests...
    npx cypress run
) else if "%1"=="open" (
    echo 🧪 Opening Cypress test runner...
    npx cypress open
) else (
    echo Usage: %0 {auth^|properties^|websocket^|contracts^|full^|open}
    echo.
    echo Test suites:
    echo   auth       - Authentication and user management tests
    echo   properties - Property creation, search, and management tests
    echo   websocket  - Real-time messaging and WebSocket tests
    echo   contracts  - Contract creation and biometric authentication tests
    echo   full       - Run all test suites
    echo   open       - Open Cypress interactive test runner
    exit /b 1
)

echo 🎉 Tests completed!
"""
    
    batch_path = Path(__file__).parent / 'run-tests.bat'
    with open(batch_path, 'w') as f:
        f.write(batch_content)
    
    print(f"✅ Created Windows test runner script: {batch_path}")

def main():
    """Main setup function"""
    print("🚀 VeriHome E2E Testing Setup")
    print("=" * 50)
    
    # Install dependencies
    if not install_cypress_dependencies():
        print("❌ Failed to install dependencies. Exiting.")
        sys.exit(1)
    
    # Create test fixtures
    try:
        create_test_fixtures()
    except Exception as e:
        print(f"❌ Failed to create test fixtures: {e}")
        sys.exit(1)
    
    # Create test scripts
    create_test_scripts()
    
    # Verify environment
    if not verify_test_environment():
        print("⚠️ Environment verification failed. Tests may not work correctly.")
    
    print("\n🎉 E2E Testing Setup Complete!")
    print("=" * 50)
    print("📋 Next Steps:")
    print("1. Ensure Django backend is running: python manage.py runserver")
    print("2. Ensure React frontend is running: cd frontend && npm run dev")
    print("3. Run tests:")
    print("   - ./run-tests.sh auth          # Authentication tests")
    print("   - ./run-tests.sh properties    # Property management tests")
    print("   - ./run-tests.sh websocket     # WebSocket/real-time tests")
    print("   - ./run-tests.sh full          # All tests")
    print("   - ./run-tests.sh open          # Open Cypress GUI")
    print("\n🔍 Test Coverage:")
    print("✅ User authentication and registration")
    print("✅ Property creation, search, and management")
    print("✅ Real-time messaging with WebSocket")
    print("✅ Notifications and user status")
    print("✅ Performance monitoring")
    print("✅ Error handling and edge cases")

if __name__ == '__main__':
    main()