#!/usr/bin/env python3
"""
Script para probar la creación de propiedades exactamente como lo hace el frontend.
"""

import os
import sys
import django
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

import json
from django.contrib.auth import get_user_model
from django.test import Client
from properties.models import Property
from datetime import datetime

User = get_user_model()

def test_frontend_property_creation():
    """Test que simula exactamente cómo el frontend crea una propiedad."""
    print("🏠 Testing Frontend Property Creation")
    print("=" * 60)
    
    try:
        # Cliente de test
        client = Client(
            HTTP_ACCEPT='application/json',
            HTTP_CONTENT_TYPE='application/json'
        )
        
        # Login con usuario landlord
        user = User.objects.filter(email='admin@verihome.com').first()
        if not user:
            # Crear usuario si no existe
            user = User.objects.create_user(
                email='admin@verihome.com',
                password='admin123',
                user_type='landlord',
                first_name='Admin',
                last_name='VeriHome'
            )
            print("✅ Usuario creado: admin@verihome.com")
        else:
            print(f"✅ Usuario existente: {user.email} (Tipo: {user.user_type})")
        
        client.force_login(user)
        
        # Contar propiedades antes
        count_before = Property.objects.count()
        print(f"\n📊 Propiedades antes: {count_before}")
        
        # Datos de la propiedad como los enviaría el frontend
        property_data = {
            "title": f"Apartamento Moderno {datetime.now().strftime('%H%M%S')}",
            "description": "Hermoso apartamento moderno con vista panorámica, ubicado en zona exclusiva.",
            "property_type": "apartment",
            "listing_type": "rent",
            "status": "available",
            "address": "Carrera 15 #123-45",
            "city": "Bogotá",
            "state": "Cundinamarca", 
            "country": "Colombia",
            "postal_code": "110111",
            "bedrooms": 3,
            "bathrooms": 2,
            "half_bathrooms": 0,
            "total_area": 120.0,
            "built_area": 100.0,
            "parking_spaces": 1,
            "year_built": 2022,
            "rent_price": "3500000.00",
            "security_deposit": "3500000.00",
            "maintenance_fee": "250000.00",
            "minimum_lease_term": 12,
            "pets_allowed": False,
            "furnished": True,
            "utilities_included": False,
            "property_features": {
                "has_balcony": True,
                "has_pool": True,
                "has_gym": True,
                "has_security": True
            },
            "nearby_amenities": ["Supermercados", "Transporte público", "Parques", "Colegios"],
            "available_from": datetime.now().date().isoformat()
        }
        
        # Hacer POST request
        print("\n📤 Enviando request de creación...")
        response = client.post(
            '/api/v1/properties/properties/',
            data=json.dumps(property_data),
            content_type='application/json'
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 201:
            print("   ✅ Propiedad creada exitosamente!")
            response_data = response.json()
            
            # Mostrar detalles
            print(f"\n📋 Detalles de la propiedad creada:")
            print(f"   ID: {response_data.get('id')}")
            print(f"   Título: {response_data.get('title')}")
            print(f"   Dirección: {response_data.get('address')}")
            print(f"   Ciudad: {response_data.get('city')}")
            print(f"   Precio: ${response_data.get('rent_price')}")
            
            # Verificar en DB
            count_after = Property.objects.count()
            print(f"\n📊 Propiedades después: {count_after}")
            print(f"   Nuevas propiedades creadas: {count_after - count_before}")
            
            # Verificar que aparece en la lista
            print("\n🔍 Verificando que aparece en la lista...")
            list_response = client.get('/api/v1/properties/properties/')
            
            if list_response.status_code == 200:
                properties = list_response.json()
                if isinstance(properties, dict):
                    properties = properties.get('results', [])
                    
                # Buscar la propiedad recién creada
                created_property = next(
                    (p for p in properties if p['id'] == response_data['id']), 
                    None
                )
                
                if created_property:
                    print("   ✅ La propiedad aparece en la lista!")
                    print(f"   Título en lista: {created_property['title']}")
                else:
                    print("   ❌ La propiedad NO aparece en la lista")
                    
            return True
            
        else:
            print("   ❌ Error al crear propiedad")
            print(f"   Response: {response.content.decode()}")
            
            # Mostrar errores de validación si existen
            try:
                error_data = response.json()
                if isinstance(error_data, dict):
                    print("\n   Errores de validación:")
                    for field, errors in error_data.items():
                        print(f"   - {field}: {errors}")
            except:
                pass
                
            return False
            
    except Exception as e:
        print(f"\n❌ Error en test: {e}")
        import traceback
        print(traceback.format_exc())
        return False

def cleanup_test_properties():
    """Limpiar propiedades de prueba."""
    print("\n🧹 Limpiando propiedades de prueba...")
    
    try:
        test_properties = Property.objects.filter(
            title__contains='Prueba'
        ) | Property.objects.filter(
            title__contains='Test'
        )
        
        count = test_properties.count()
        if count > 5:  # Si hay más de 5 propiedades de prueba
            # Eliminar las más antiguas, dejando solo las 3 más recientes
            old_properties = test_properties.order_by('created_at')[:-3]
            deleted_count = old_properties.count()
            old_properties.delete()
            print(f"   ✅ Eliminadas {deleted_count} propiedades de prueba antiguas")
        else:
            print(f"   ℹ️ Solo hay {count} propiedades de prueba, no es necesario limpiar")
            
    except Exception as e:
        print(f"   ❌ Error limpiando: {e}")

def main():
    """Función principal."""
    print("🚀 Frontend Property Creation Test")
    print("=" * 60)
    
    # Test creación
    success = test_frontend_property_creation()
    
    # Limpiar si es necesario
    cleanup_test_properties()
    
    print("\n" + "=" * 60)
    
    if success:
        print("✅ La creación de propiedades funciona correctamente!")
        print("🎉 El módulo está listo para usar desde el frontend!")
    else:
        print("❌ Hay problemas con la creación de propiedades")
        print("⚠️ Revisa los errores mostrados arriba")

if __name__ == '__main__':
    main()