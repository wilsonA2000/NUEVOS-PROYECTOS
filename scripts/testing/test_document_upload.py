#!/usr/bin/env python
import requests
import json
import io

# Configuration
BASE_URL = 'http://localhost:8000'
TOKEN = ''  # Will get this from login

# Test credentials
EMAIL = 'letefon100@gmail.com'  # Tenant user
PASSWORD = 'VeriHome2025!*'

def login():
    """Login and get token"""
    response = requests.post(f'{BASE_URL}/api/v1/users/login/', json={
        'email': EMAIL,
        'password': PASSWORD
    })

    if response.status_code == 200:
        data = response.json()
        print(f"✅ Login successful: {EMAIL}")
        return data['tokens']['access']
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def test_upload_document(token, process_id):
    """Test document upload"""
    headers = {
        'Authorization': f'Bearer {token}'
    }

    # Create a dummy PDF file
    pdf_content = b'%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Kids[3 0 R]/Count 1>>\nendobj\n3 0 obj\n<</Type/Page/Parent 2 0 R/Resources<</Font<</F1 4 0 R>>>>/MediaBox[0 0 612 792]/Contents 5 0 R>>\nendobj\n4 0 obj\n<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>\nendobj\n5 0 obj\n<</Length 44>>\nstream\nBT /F1 12 Tf 100 700 Td (Test Document) Tj ET\nendstream\nendobj\nxref\n0 6\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\n0000000212 00000 n\n0000000281 00000 n\ntrailer\n<</Size 6/Root 1 0 R>>\nstartxref\n369\n%%EOF'

    # Create file object
    files = {
        'document_file': ('test_document.pdf', io.BytesIO(pdf_content), 'application/pdf')
    }

    data = {
        'property_request': process_id,
        'document_type': 'tomador_cedula_ciudadania'
    }

    print(f"\n📤 Uploading document to process: {process_id}")
    print(f"📝 Data being sent: {data}")

    response = requests.post(
        f'{BASE_URL}/api/v1/requests/api/documents/upload/',
        headers=headers,
        files=files,
        data=data
    )

    print(f"📨 Response status: {response.status_code}")
    print(f"📨 Response headers: {dict(response.headers)}")

    if response.status_code in [200, 201]:
        print(f"✅ Document upload successful!")
        print(f"📄 Response: {json.dumps(response.json(), indent=2)}")
    else:
        print(f"❌ Document upload failed!")
        print(f"📄 Response text: {response.text}")
        try:
            print(f"📄 Response JSON: {json.dumps(response.json(), indent=2)}")
        except:
            pass

def get_match_request(token):
    """Get the first match request to test with"""
    headers = {
        'Authorization': f'Bearer {token}'
    }

    response = requests.get(f'{BASE_URL}/api/v1/matching/requests/', headers=headers)

    if response.status_code == 200:
        data = response.json()
        if data.get('results') and len(data['results']) > 0:
            match_request = data['results'][0]
            print(f"✅ Found match request: {match_request['id']}")
            return match_request['id']

    print("❌ No match requests found")
    return None

def main():
    # Login
    token = login()
    if not token:
        return

    # Get a match request ID to use as process_id
    process_id = get_match_request(token)
    if not process_id:
        # Use a hardcoded one if needed
        process_id = '4167cf50-3f4c-4bb1-bcd7-fd9b669702ab'
        print(f"⚠️ Using hardcoded process_id: {process_id}")

    # Test document upload
    test_upload_document(token, process_id)

if __name__ == '__main__':
    main()