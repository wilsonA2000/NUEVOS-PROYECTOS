#!/usr/bin/env python3
"""
Script para probar la actualización de perfil de usuario.
"""

import requests
import json

# Test data
LOGIN_DATA = {
    'email': 'admin@verihome.com',
    'password': 'admin123'
}

PROFILE_UPDATE_DATA = {
    'first_name': 'Juan Carlos',
    'last_name': 'Pérez Modificado',
    'phone_number': '+57300123456',
    'whatsapp': '+57300123456',
    'city': 'Medellín',
    'state': 'Antioquia',
    'country': 'Colombia'
}

BASE_URL = 'http://localhost:8000/api/v1'

print('🧪 TESTING PROFILE UPDATE')
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
    
    # 2. Obtener perfil actual
    print('\n2. Obteniendo perfil actual...')
    profile_response = requests.get(f'{BASE_URL}/users/profile/', headers=headers)
    print(f'   Status Code: {profile_response.status_code}')
    
    if profile_response.status_code != 200:
        print(f'   Error obteniendo perfil: {profile_response.text}')
        exit(1)
        
    current_profile = profile_response.json()
    print('   ✅ Perfil obtenido exitosamente')
    print(f'   Nombre actual: {current_profile.get("first_name")} {current_profile.get("last_name")}')
    
    # 3. Actualizar perfil
    print('\n3. Actualizando perfil...')
    update_response = requests.patch(
        f'{BASE_URL}/users/profile/', 
        json=PROFILE_UPDATE_DATA,
        headers=headers
    )
    print(f'   Status Code: {update_response.status_code}')
    
    if update_response.status_code != 200:
        print(f'   Error actualizando perfil: {update_response.text}')
        exit(1)
        
    updated_profile = update_response.json()
    print('   ✅ Perfil actualizado exitosamente')
    print(f'   Nombre actualizado: {updated_profile.get("first_name")} {updated_profile.get("last_name")}')
    
    # 4. Verificar cambios
    print('\n4. Verificando cambios...')
    verify_response = requests.get(f'{BASE_URL}/users/profile/', headers=headers)
    verified_profile = verify_response.json()
    
    changes_applied = True
    for key, value in PROFILE_UPDATE_DATA.items():
        if verified_profile.get(key) != value:
            print(f'   ❌ Campo {key}: esperado "{value}", obtenido "{verified_profile.get(key)}"')
            changes_applied = False
        else:
            print(f'   ✅ Campo {key}: actualizado correctamente')
            
    print('\n' + '=' * 40)
    if changes_applied:
        print('🎉 PRUEBA EXITOSA: Perfil se actualiza correctamente')
    else:
        print('❌ PRUEBA FALLIDA: Problemas con actualización de perfil')
        
except Exception as e:
    print(f'Error durante la prueba: {e}')