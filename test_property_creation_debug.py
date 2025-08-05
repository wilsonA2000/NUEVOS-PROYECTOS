#!/usr/bin/env python3
"""
Script para probar la creación de propiedades y diagnosticar problemas.
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
from decimal import Decimal

User = get_user_model()

def check_property_count():
    """Verificar cuántas propiedades hay actualmente."""
    count = Property.objects.count()
    print(f"📊 Propiedades actuales en DB: {count}")
    
    # Mostrar las propiedades existentes
    for prop in Property.objects.all()[:5]:
        print(f"   - {prop.title} (ID: {prop.id}, Status: {prop.status})")
    
    return count

def test_property_creation_api():
    """Test de creación de propiedad vía API."""
    print("\n🔍 Testing Property Creation via API...")
    
    try:
        # Cliente de test
        client = Client()
        
        # Login con usuario admin (landlord)
        user = User.objects.filter(email='admin@verihome.com').first()
        if not user:
            print("❌ No se encontró usuario admin")
            return False
            
        print(f"✅ Usuario: {user.email} (Tipo: {user.user_type})")
        client.force_login(user)
        
        # Datos de prueba para nueva propiedad
        property_data = {
            "title": "Nueva Casa de Prueba API",
            "description": "Esta es una propiedad creada vía API para testing",
            "property_type": "house",
            "listing_type": "rent",
            "status": "available",
            "address": "Calle Test 123",
            "city": "Bogotá",
            "state": "Cundinamarca",
            "country": "Colombia",
            "postal_code": "110111",
            "bedrooms": 3,
            "bathrooms": 2,
            "half_bathrooms": 1,
            "total_area": 150.0,
            "built_area": 120.0,
            "parking_spaces": 2,
            "year_built": 2020,
            "rent_price": "2500000.00",
            "security_deposit": "2500000.00",
            "pets_allowed": True,
            "furnished": False,
            "utilities_included": False
        }
        
        # Contar propiedades antes
        count_before = Property.objects.count()
        
        # Hacer POST request
        print("\n📤 Enviando POST request...")
        response = client.post(
            '/api/v1/properties/properties/',
            data=json.dumps(property_data),
            content_type='application/json'
        )
        
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 201:
            print("   ✅ Propiedad creada exitosamente!")
            response_data = response.json()
            print(f"   ID: {response_data.get('id')}")
            print(f"   Title: {response_data.get('title')}")
            
            # Verificar en DB
            count_after = Property.objects.count()
            print(f"\n   Propiedades antes: {count_before}")
            print(f"   Propiedades después: {count_after}")
            
            if count_after > count_before:
                print("   ✅ Propiedad guardada en la base de datos")
                return True
            else:
                print("   ❌ Propiedad NO se guardó en la base de datos")
                return False
                
        else:
            print(f"   ❌ Error al crear propiedad")
            print(f"   Response: {response.content.decode()}")
            return False
            
    except Exception as e:
        print(f"❌ Error en test: {e}")
        import traceback
        print(traceback.format_exc())
        return False

def test_property_creation_direct():
    """Test de creación directa en DB."""
    print("\n🔍 Testing Direct Property Creation...")
    
    try:
        # Usuario landlord
        user = User.objects.filter(email='admin@verihome.com').first()
        if not user:
            print("❌ No se encontró usuario")
            return False
        
        # Contar antes
        count_before = Property.objects.count()
        
        # Crear propiedad directamente
        property_obj = Property.objects.create(
            landlord=user,
            title="Propiedad Directa Test",
            description="Creada directamente en DB",
            property_type="apartment",
            listing_type="rent",
            status="available",
            address="Calle Directa 456",
            city="Medellín",
            state="Antioquia",
            country="Colombia",
            postal_code="050001",
            bedrooms=2,
            bathrooms=1,
            rent_price=Decimal("1800000.00")
        )
        
        print(f"   ✅ Propiedad creada: {property_obj.title}")
        print(f"   ID: {property_obj.id}")
        
        # Verificar
        count_after = Property.objects.count()
        print(f"   Propiedades antes: {count_before}")
        print(f"   Propiedades después: {count_after}")
        
        # Verificar que se puede recuperar
        retrieved = Property.objects.get(id=property_obj.id)
        print(f"   ✅ Propiedad recuperada: {retrieved.title}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creando directamente: {e}")
        import traceback
        print(traceback.format_exc())
        return False

def check_permissions():
    """Verificar permisos de creación."""
    print("\n🔍 Checking Permissions...")
    
    try:
        from properties.api_views import PropertyViewSet
        
        user = User.objects.filter(email='admin@verihome.com').first()
        print(f"   Usuario: {user.email}")
        print(f"   Tipo: {user.user_type}")
        print(f"   Es staff: {user.is_staff}")
        print(f"   Es superuser: {user.is_superuser}")
        
        # Verificar si el usuario puede crear propiedades
        if user.user_type == 'landlord' or user.is_staff:
            print("   ✅ Usuario puede crear propiedades")
        else:
            print("   ❌ Usuario NO puede crear propiedades")
            
        return True
        
    except Exception as e:
        print(f"❌ Error verificando permisos: {e}")
        return False

def test_property_list_after_creation():
    """Verificar que las propiedades aparecen en la lista."""
    print("\n🔍 Testing Property List After Creation...")
    
    try:
        client = Client()
        user = User.objects.filter(email='admin@verihome.com').first()
        client.force_login(user)
        
        # Obtener lista
        response = client.get('/api/v1/properties/properties/')
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                properties = data
            else:
                properties = data.get('results', [])
                
            print(f"   ✅ Propiedades en lista: {len(properties)}")
            
            # Mostrar títulos
            for prop in properties[:5]:
                print(f"      - {prop.get('title')} (Status: {prop.get('status')})")
                
            return True
        else:
            print(f"   ❌ Error obteniendo lista: {response.content.decode()}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    """Función principal."""
    print("🚀 Property Creation Diagnostic")
    print("=" * 60)
    
    # 1. Check current properties
    initial_count = check_property_count()
    
    # 2. Check permissions
    check_permissions()
    
    # 3. Test API creation
    api_success = test_property_creation_api()
    
    # 4. Test direct creation
    direct_success = test_property_creation_direct()
    
    # 5. Check final list
    test_property_list_after_creation()
    
    # 6. Final count
    print("\n" + "=" * 60)
    final_count = check_property_count()
    
    print(f"\n📈 Resumen:")
    print(f"   Propiedades iniciales: {initial_count}")
    print(f"   Propiedades finales: {final_count}")
    print(f"   Nuevas propiedades: {final_count - initial_count}")
    
    if api_success and direct_success:
        print("\n✅ Creación de propiedades funciona correctamente!")
    else:
        print("\n❌ Hay problemas con la creación de propiedades")

if __name__ == '__main__':
    main()