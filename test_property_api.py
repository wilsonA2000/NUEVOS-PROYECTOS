#!/usr/bin/env python3
"""
Script para probar la funcionalidad de propiedades directamente
"""

import os
import sys
import requests

# Configurar el path de Django
sys.path.insert(0, '/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')

import django
django.setup()

def test_property_operations():
    """Test de operaciones CRUD de propiedades"""
    
    print("🧪 TESTING PROPERTY OPERATIONS")
    print("=" * 50)
    
    # 1. Login
    login_data = {
        'email': 'landlord@test.com',
        'password': 'test123'
    }
    
    try:
        print("1. Testing login...")
        login_response = requests.post('http://localhost:8000/api/v1/users/auth/login/', 
                                     data=login_data, timeout=10)
        
        if login_response.status_code == 200:
            token = login_response.json().get('access')
            print(f"✅ Login successful")
            headers = {'Authorization': f'Bearer {token}'}
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return
        
        # 2. Get properties
        print("\n2. Testing property list...")
        props_response = requests.get('http://localhost:8000/api/v1/properties/properties/', 
                                    headers=headers, timeout=10)
        
        if props_response.status_code == 200:
            properties_data = props_response.json()
            if 'results' in properties_data:
                properties = properties_data['results']
            else:
                properties = properties_data if isinstance(properties_data, list) else []
            
            print(f"✅ Properties retrieved: {len(properties)}")
            
            if properties:
                # Use the first available property from the list
                target_prop = properties[0]
                    
                prop_id = target_prop['id']
                print(f"   Using property: {target_prop['title']} (ID: {prop_id})")
                
                # Verify this property belongs to the landlord
                print(f"   Property landlord: {target_prop.get('landlord', {}).get('email', 'N/A')}")
                
                # 3. Test property detail
                print("\n3. Testing property detail...")
                detail_response = requests.get(f'http://localhost:8000/api/v1/properties/properties/{prop_id}/', 
                                             headers=headers, timeout=10)
                if detail_response.status_code == 200:
                    print("✅ Property detail retrieved successfully")
                else:
                    print(f"❌ Property detail failed: {detail_response.status_code}")
                    print(f"Response: {detail_response.text[:200]}...")  # Show first 200 chars
                
                # 4. Test property update
                print("\n4. Testing property update...")
                update_data = {
                    'title': target_prop['title'] + ' (Updated)',
                    'description': target_prop.get('description', '') + ' - Modified',
                }
                
                update_response = requests.patch(f'http://localhost:8000/api/v1/properties/properties/{prop_id}/', 
                                               json=update_data, headers=headers, timeout=10)
                if update_response.status_code in [200, 204]:
                    print("✅ Property update successful")
                else:
                    print(f"❌ Property update failed: {update_response.status_code}")
                    print(f"Response: {update_response.text}")
                
                # 5. Test property deletion
                print("\n5. Testing property deletion...")
                delete_response = requests.delete(f'http://localhost:8000/api/v1/properties/properties/{prop_id}/', 
                                                headers=headers, timeout=10)
                if delete_response.status_code == 204:
                    print("✅ Property deletion successful")
                elif delete_response.status_code == 404:
                    print("⚠️ Property not found (may have been deleted already)")
                else:
                    print(f"❌ Property deletion failed: {delete_response.status_code}")
                    print(f"Response: {delete_response.text}")
                    
            else:
                print("❌ No properties available for testing")
                
        else:
            print(f"❌ Properties list failed: {props_response.status_code}")
            print(f"Response: {props_response.text}")
            
    except Exception as e:
        print(f"❌ Error during testing: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🏁 TESTING COMPLETED")

if __name__ == "__main__":
    test_property_operations()