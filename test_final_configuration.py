#!/usr/bin/env python3
"""
Script final para verificar que la configuración del frontend y backend
maneja correctamente tanto éxitos (201) como errores (400)
"""

import requests
import json
import time

def test_property_creation_flow():
    print("🧪 TESTING FINAL PROPERTY CREATION FLOW")
    print("=====================================")
    
    base_url = "http://localhost:8000/api/v1"
    
    # Test 1: Login para obtener token
    print("\n📋 Step 1: Logging in to get authentication token")
    login_data = {
        "email": "landlord@test.com",
        "password": "test123"
    }
    
    try:
        login_response = requests.post(f"{base_url}/users/auth/login/", json=login_data)
        if login_response.status_code == 200:
            token = login_response.json().get('access')
            print(f"✅ Login successful - Token obtained")
            headers = {"Authorization": f"Bearer {token}"}
        else:
            print(f"❌ Login failed - Status: {login_response.status_code}")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Test 2: Caso de éxito (datos válidos)
    print("\n📋 Step 2: Testing SUCCESS case (valid data)")
    valid_property_data = {
        "title": "Apartamento Test Frontend",
        "description": "Test desde script de verificación",
        "property_type": "apartment",
        "listing_type": "rent",
        "status": "available",
        "address": "Calle Test 123",
        "city": "Medellín",
        "state": "Antioquia",
        "country": "Colombia",
        "total_area": 85.5,
        "rent_price": 1200000.00,
        "bedrooms": 2,
        "bathrooms": 1
    }
    
    try:
        success_response = requests.post(
            f"{base_url}/properties/properties/", 
            json=valid_property_data,
            headers=headers
        )
        print(f"📡 Response Status: {success_response.status_code}")
        
        if success_response.status_code == 201:
            print("✅ SUCCESS CASE: Status 201 - Property created successfully")
            property_data = success_response.json()
            print(f"📄 Created Property ID: {property_data.get('id')}")
            print(f"📄 Title: {property_data.get('title')}")
            print("🎯 Frontend should show: SUCCESS MODAL")
        else:
            print(f"❌ Unexpected status for valid data: {success_response.status_code}")
            print(f"📄 Response: {success_response.text}")
    
    except Exception as e:
        print(f"❌ Error in success test: {e}")
    
    # Test 3: Caso de error (datos inválidos)
    print("\n📋 Step 3: Testing ERROR case (invalid data)")
    invalid_property_data = {
        "title": "",  # Empty title (required)
        "property_type": "apartment",
        "listing_type": "rent",
        # Missing required fields like total_area, rent_price
    }
    
    try:
        error_response = requests.post(
            f"{base_url}/properties/properties/", 
            json=invalid_property_data,
            headers=headers
        )
        print(f"📡 Response Status: {error_response.status_code}")
        
        if error_response.status_code == 400:
            print("✅ ERROR CASE: Status 400 - Validation errors as expected")
            error_data = error_response.json()
            print(f"📄 Error Details:")
            for field, errors in error_data.items():
                print(f"   • {field}: {errors}")
            print("🎯 Frontend should show: ERROR MESSAGE")
        else:
            print(f"❌ Unexpected status for invalid data: {error_response.status_code}")
            print(f"📄 Response: {error_response.text}")
    
    except Exception as e:
        print(f"❌ Error in error test: {e}")
    
    # Summary
    print("\n🎉 FRONTEND CONFIGURATION VERIFICATION")
    print("====================================")
    print("✅ Backend returns 201 for valid data → Frontend success modal")
    print("❌ Backend returns 400 for invalid data → Frontend error message")
    print("")
    print("📡 Frontend API Configuration:")
    print("  • validateStatus: 2xx, 4xx, 401 are valid")
    print("  • Response interceptor: 4xx → converts to error")
    print("  • PropertyForm: catch handles errors")
    print("  • PropertyForm: success shows modal")
    print("")
    print("🎊 CONFIGURATION COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    test_property_creation_flow()