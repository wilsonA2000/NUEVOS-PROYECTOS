#!/usr/bin/env python3

import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.test import Client
import json

def test_exact_frontend_endpoint():
    """Test del endpoint exacto que está llamando el frontend."""
    
    User = get_user_model()
    user = User.objects.get(email='landlord@test.com')
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)

    client = Client()

    print('🧪 Testing el endpoint exacto del frontend')
    print('URL: /api/v1/properties/properties/')
    
    try:
        response = client.get('/api/v1/properties/properties/', HTTP_AUTHORIZATION=f'Bearer {access_token}')
        print(f'📊 Status: {response.status_code}')

        if response.status_code == 200:
            print('✅ Endpoint funcionando correctamente')
            try:
                data = response.json()
                print(f'📄 Response type: {type(data)}')
                if isinstance(data, dict) and 'results' in data:
                    print(f'📋 Propiedades encontradas: {len(data["results"])}')
                elif isinstance(data, list):
                    print(f'📋 Propiedades encontradas: {len(data)}')
            except Exception as e:
                print(f'⚠️ Error parsing JSON: {e}')
        else:
            print(f'❌ Error Status: {response.status_code}')
            content = response.content.decode()
            
            if 'FieldError' in content:
                # Extraer el error específico
                import re
                error_match = re.search(r'Cannot resolve keyword &#x27;(.+?)&#x27;', content)
                if error_match:
                    field_name = error_match.group(1)
                    print(f'🔍 Campo problemático: {field_name}')
                    
                choices_match = re.search(r'Choices are: (.+?)</pre>', content)
                if choices_match:
                    choices = choices_match.group(1)
                    print(f'🔍 Campos disponibles: {choices}')
            else:
                print(f'Error content: {content[:300]}...')
                
    except Exception as e:
        print(f'❌ Exception: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_exact_frontend_endpoint()