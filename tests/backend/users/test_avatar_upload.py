#!/usr/bin/env python3
"""
Script para probar la subida de avatar.
"""

import requests
import io
from PIL import Image

# Test data
LOGIN_DATA = {
    'email': 'admin@verihome.com',
    'password': 'admin123'
}

BASE_URL = 'http://localhost:8000/api/v1'

print('🧪 TESTING AVATAR UPLOAD')
print('=' * 40)

try:
    # 1. Login para obtener token
    print('1. Realizando login...')
    login_response = requests.post(f'{BASE_URL}/users/auth/login/', json=LOGIN_DATA)
    print(f'   Status Code: {login_response.status_code}')
    
    if login_response.status_code != 200:
        print(f'   Error en login: {login_response.text}')
        exit(1)
        
    tokens = login_response.json()
    headers = {'Authorization': f'Bearer {tokens["access"]}'}
    print('   ✅ Login exitoso')
    
    # 2. Crear imagen de prueba
    print('\n2. Creando imagen de prueba...')
    # Crear una imagen simple de 100x100 píxeles
    img = Image.new('RGB', (100, 100), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='JPEG')
    img_bytes.seek(0)
    print('   ✅ Imagen de prueba creada')
    
    # 3. Subir avatar
    print('\n3. Subiendo avatar...')
    files = {'avatar': ('test_avatar.jpg', img_bytes, 'image/jpeg')}
    upload_response = requests.post(f'{BASE_URL}/users/avatar/', files=files, headers=headers)
    print(f'   Status Code: {upload_response.status_code}')
    
    if upload_response.status_code == 200:
        result = upload_response.json()
        print('   ✅ Avatar subido exitosamente')
        print(f'   Avatar URL: {result.get("avatar_url")}')
    else:
        print(f'   Error subiendo avatar: {upload_response.text}')
        
    print('\n' + '=' * 40)
    if upload_response.status_code == 200:
        print('🎉 PRUEBA EXITOSA: Avatar se sube correctamente')
    else:
        print('❌ PRUEBA FALLIDA: Problemas con subida de avatar')
        
except Exception as e:
    print(f'Error durante la prueba: {e}')