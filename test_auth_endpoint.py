#!/usr/bin/env python3

import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
import json

def test_auth_endpoint():
    User = get_user_model()
    
    # Test con usuario de prueba
    try:
        user = User.objects.get(email='landlord@test.com')
        print(f'🧪 Testing con usuario: {user.email}')
        print(f'✅ Usuario verificado: {user.is_verified}')
        print(f'✅ Usuario activo: {user.is_active}')
        
        # Crear token
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        print(f'🔑 Token generado: {access_token[:30]}...')
        
        # Test del endpoint
        client = Client()
        response = client.get(
            '/api/v1/users/auth/me/', 
            HTTP_AUTHORIZATION=f'Bearer {access_token}'
        )
        
        print(f'📡 Status Code: {response.status_code}')
        
        if response.status_code == 200:
            data = response.json()
            print(f'✅ Endpoint funcionando correctamente')
            print(f'📄 Datos usuario: ID={data.get("id")}, Email={data.get("email")}')
        else:
            print(f'❌ Error en endpoint:')
            print(f'   Content: {response.content.decode()[:200]}')
            
            # Debug de serializador
            print(f'\n🔍 Debug de serializadores:')
            try:
                from users.serializers import UserCompleteProfileSerializer
                serializer = UserCompleteProfileSerializer(user)
                print(f'✅ Serializer UserCompleteProfileSerializer OK')
            except Exception as e:
                print(f'❌ Error en UserCompleteProfileSerializer: {e}')
                
    except User.DoesNotExist:
        print(f'❌ Usuario landlord@test.com no existe')
    except Exception as e:
        print(f'❌ Error general: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_auth_endpoint()