#!/usr/bin/env python3
"""
Script para probar las correcciones realizadas al formulario de propiedades.
Simula exactamente lo que el frontend corregido debería enviar.
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from django.test import Client
import json

def test_fixed_property_creation():
    """Test para verificar que las correcciones funcionan."""
    
    User = get_user_model()
    user = User.objects.get(email='landlord@test.com')
    refresh = RefreshToken.for_user(user)
    access_token = str(refresh.access_token)

    client = Client()
    
    print('🧪 TESTING: Propiedades con correcciones aplicadas')
    print('=' * 80)
    
    # Test case que simula el frontend corregido
    corrected_data = {
        'title': 'Apartamento Corregido',
        'description': 'Descripción del apartamento con correcciones aplicadas',
        'property_type': 'apartment',
        'listing_type': 'rent',
        'status': 'available',
        'address': 'Calle Corregida 123',
        'city': 'Medellín',
        'state': 'Antioquia',
        'country': 'Colombia',
        'bedrooms': 2,
        'bathrooms': 1,
        'total_area': 80,
        'rent_price': 1500000,
        'pets_allowed': False,
        'smoking_allowed': False,
        'furnished': False
    }
    
    # Test case con campos mínimos (lo que podría enviar el frontend)
    minimal_data = {
        'title': 'Casa Mínima',
        'description': 'Descripción de casa mínima',
        'property_type': 'house',
        'listing_type': 'rent',
        'address': 'Calle Mínima 456',
        'city': 'Medellín',
        'state': 'Antioquia',
        'rent_price': 2000000,
        'bedrooms': 3,
        'bathrooms': 2,
        'total_area': 120
    }
    
    # Test case con campos opcionales vacíos o nulos
    with_empty_optionals = {
        'title': 'Estudio con Opcionales',
        'description': 'Descripción de estudio con campos opcionales',
        'property_type': 'studio',
        'listing_type': 'rent',
        'address': 'Calle Opcionales 789',
        'city': 'Medellín',
        'state': 'Antioquia',
        'rent_price': 800000,
        'bedrooms': 1,
        'bathrooms': 1,
        'total_area': 45,
        # Campos opcionales que no se envían o se envían vacíos
        'postal_code': '',
        'year_built': None,
        'security_deposit': '',
        'pets_allowed': False,
        'smoking_allowed': False,
        'furnished': False
    }
    
    test_cases = [
        ('Caso 1: Datos completos y corregidos', corrected_data),
        ('Caso 2: Datos mínimos requeridos', minimal_data),
        ('Caso 3: Con campos opcionales vacíos', with_empty_optionals)
    ]
    
    success_count = 0
    total_tests = len(test_cases)
    
    for test_name, test_data in test_cases:
        print(f'\\n🧪 {test_name}')
        print('-' * 60)
        
        try:
            # Limpiar datos None para simular el frontend
            cleaned_data = {k: v for k, v in test_data.items() if v is not None and v != ''}
            
            response = client.post(
                '/api/v1/properties/properties/', 
                data=json.dumps(cleaned_data),
                HTTP_AUTHORIZATION=f'Bearer {access_token}',
                content_type='application/json'
            )
            
            print(f'📊 Status Code: {response.status_code}')
            
            if response.status_code == 201:
                success_count += 1
                print('✅ SUCCESS: Propiedad creada exitosamente')
                try:
                    response_data = json.loads(response.content.decode())
                    print(f'🆔 ID: {response_data.get("id")}')
                    print(f'📋 Título: {response_data.get("title")}')
                    print(f'🏷️ Tipo: {response_data.get("property_type")}')
                    print(f'💰 Precio: ${response_data.get("rent_price", 0):,.0f}')
                except Exception as e:
                    print(f'⚠️ Response parsing error: {e}')
            else:
                print(f'❌ FAILED: Status {response.status_code}')
                try:
                    error_data = json.loads(response.content.decode())
                    print('📋 Error Details:')
                    print(json.dumps(error_data, indent=2, ensure_ascii=False))
                except Exception as e:
                    print(f'❌ Error parsing response: {e}')
                    print(f'📄 Raw Response: {response.content.decode()}')
                    
        except Exception as e:
            print(f'❌ Exception during request: {e}')
            
        print('-' * 60)
    
    print(f'\\n🏁 RESUMEN DE PRUEBAS')
    print('=' * 80)
    print(f'✅ Exitosas: {success_count}/{total_tests}')
    print(f'❌ Fallidas: {total_tests - success_count}/{total_tests}')
    
    if success_count == total_tests:
        print('🎉 ¡TODAS LAS PRUEBAS PASARON! Las correcciones funcionan correctamente.')
    else:
        print('⚠️ Algunas pruebas fallaron. Revisar los errores mostrados arriba.')
    
    return success_count == total_tests

if __name__ == '__main__':
    success = test_fixed_property_creation()
    print('\\n🎯 RESULTADO FINAL:', '✅ CORRECCIONES EXITOSAS' if success else '❌ CORRECCIONES REQUIEREN AJUSTES')