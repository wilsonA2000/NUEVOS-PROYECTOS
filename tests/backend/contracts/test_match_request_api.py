#!/usr/bin/env python3
"""
Test script to verify the match request API works correctly after fixes
"""
import os
import django

# Setup Django environment FIRST
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

import requests
import json

from django.contrib.auth import get_user_model
from properties.models import Property

User = get_user_model()

def test_match_request_api():
    print("=== TESTING MATCH REQUEST API ===")
    
    # Login credentials
    email = "letefon100@gmail.com"
    password = "admin123"
    
    print(f"1. Attempting login with {email}...")
    
    # Login to get token
    login_url = "http://localhost:8000/api/v1/users/auth/login/"
    login_data = {
        "email": email,
        "password": password
    }
    
    try:
        login_response = requests.post(login_url, json=login_data)
        print(f"   Login status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data.get('access')
            print(f"   ✅ Login successful! Token received.")
            
            # Headers for authenticated requests
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            # Get user info to verify tenant status
            print(f"2. Verifying user is tenant...")
            me_url = "http://localhost:8000/api/v1/users/auth/me/"
            me_response = requests.get(me_url, headers=headers)
            
            if me_response.status_code == 200:
                user_data = me_response.json()
                print(f"   User type: {user_data.get('user_type')}")
                print(f"   User ID: {user_data.get('id')}")
                
                if user_data.get('user_type') == 'tenant':
                    print("   ✅ User is tenant - can send match requests")
                    
                    # Get available properties
                    print(f"3. Getting available properties...")
                    props_url = "http://localhost:8000/api/v1/properties/"
                    props_response = requests.get(props_url, headers=headers)
                    
                    if props_response.status_code == 200:
                        properties = props_response.json()
                        print(f"   Found {len(properties)} properties")
                        
                        if properties:
                            test_property = properties[0]
                            property_id = test_property.get('id')
                            property_title = test_property.get('title', 'Unknown')
                            
                            print(f"   Testing with property: {property_title} (ID: {property_id})")
                            
                            # Create match request
                            print(f"4. Creating match request...")
                            match_url = "http://localhost:8000/api/v1/matching/requests/"
                            
                            match_data = {
                                "property": property_id,
                                "tenant_message": "Estoy muy interesado en esta propiedad. Soy una persona responsable y ordenada.",
                                "employment_type": "employed",
                                "income_verification": True,
                                "references_available": True,
                                "pets": False,
                                "additional_occupants": 0,
                                "lease_duration_preference": "12"
                            }
                            
                            match_response = requests.post(match_url, json=match_data, headers=headers)
                            print(f"   Match request status: {match_response.status_code}")
                            
                            if match_response.status_code == 201:
                                match_result = match_response.json()
                                print(f"   ✅ Match request created successfully!")
                                print(f"   Match ID: {match_result.get('id')}")
                                print(f"   Status: {match_result.get('status')}")
                            elif match_response.status_code == 400:
                                error_data = match_response.json()
                                if "Ya has enviado una solicitud" in str(error_data):
                                    print(f"   ℹ️ Match request already exists for this property")
                                    print(f"   This is expected behavior - duplicate prevention working!")
                                else:
                                    print(f"   ❌ Bad request error: {error_data}")
                            else:
                                print(f"   ❌ Error creating match request")
                                try:
                                    error_data = match_response.json()
                                    print(f"   Error details: {error_data}")
                                except:
                                    print(f"   Error text: {match_response.text}")
                        else:
                            print("   ❌ No properties found")
                    else:
                        print(f"   ❌ Failed to get properties: {props_response.status_code}")
                else:
                    print(f"   ❌ User is not tenant, cannot test match requests")
            else:
                print(f"   ❌ Failed to get user info: {me_response.status_code}")
        else:
            print(f"   ❌ Login failed: {login_response.status_code}")
            try:
                error_data = login_response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Error text: {login_response.text}")
                
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Connection error: {e}")
    
    print("\n=== TEST COMPLETED ===")

if __name__ == "__main__":
    test_match_request_api()