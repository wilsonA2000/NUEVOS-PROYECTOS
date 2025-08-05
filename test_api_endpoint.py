#!/usr/bin/env python
"""
Script para probar que el endpoint esté funcionando
"""
import requests
import json

def test_endpoint():
    url = "http://127.0.0.1:8000/api/v1/auth/validate-interview-code/"
    
    # Datos de prueba
    test_data = {
        "interview_code": "VH-AWTQ-4217"
    }
    
    try:
        print(f"🔍 Testing endpoint: {url}")
        print(f"📝 Sending data: {test_data}")
        
        response = requests.post(
            url,
            headers={"Content-Type": "application/json"},
            data=json.dumps(test_data),
            timeout=10
        )
        
        print(f"📊 Status code: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Endpoint working correctly!")
        else:
            print("❌ Endpoint returned error")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure Django is running on port 8000")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_endpoint()