#!/usr/bin/env python3
"""
Script para verificar directamente en la base de datos que los datos se guardaron correctamente.
"""

import os
import sys
import django
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from properties.models import Property
from django.contrib.auth import get_user_model
import json

User = get_user_model()

def verify_database_data():
    """Verificar que los datos se guardaron correctamente en la base de datos."""
    
    print("🔍 VERIFICANDO DATOS EN LA BASE DE DATOS")
    print("=" * 60)
    
    # Buscar la propiedad creada
    properties = Property.objects.filter(title='bucaramanga casa').order_by('-created_at')
    
    if not properties.exists():
        print("❌ No se encontró la propiedad 'bucaramanga casa'")
        return False
    
    property_obj = properties.first()
    
    print(f"✅ Propiedad encontrada: {property_obj.title}")
    print(f"   ID: {property_obj.id}")
    print(f"   Creada: {property_obj.created_at}")
    print(f"   Landlord: {property_obj.landlord.email}")
    
    # Verificar campos básicos
    print("\n📋 CAMPOS BÁSICOS:")
    print(f"   Título: {property_obj.title}")
    print(f"   Ciudad: {property_obj.city}")
    print(f"   Tipo: {property_obj.property_type}")
    print(f"   Precio: {property_obj.rent_price}")
    print(f"   Habitaciones: {property_obj.bedrooms}")
    print(f"   Baños: {property_obj.bathrooms}")
    
    # Verificar campos CSV convertidos a JSON
    print("\n🔄 CAMPOS CSV CONVERTIDOS A JSON:")
    
    # utilities_included
    utilities = property_obj.utilities_included
    print(f"   utilities_included: {utilities}")
    print(f"   Tipo: {type(utilities)}")
    
    # property_features
    features = property_obj.property_features
    print(f"   property_features: {features}")
    print(f"   Tipo: {type(features)}")
    
    # nearby_amenities
    amenities = property_obj.nearby_amenities
    print(f"   nearby_amenities: {amenities}")
    print(f"   Tipo: {type(amenities)}")
    
    # transportation
    transport = property_obj.transportation
    print(f"   transportation: {transport}")
    print(f"   Tipo: {type(transport)}")
    
    # Verificar que son listas correctas
    print("\n✅ VERIFICACIONES:")
    
    success = True
    
    # Verificar utilities_included
    expected_utilities = ['agua', 'luz', 'telefono', 'internet']
    if isinstance(utilities, list) and utilities == expected_utilities:
        print(f"   ✅ utilities_included: {utilities}")
    else:
        print(f"   ❌ utilities_included: esperado {expected_utilities}, obtenido {utilities}")
        success = False
    
    # Verificar property_features
    expected_features = ['Jardín', 'Terraza', 'Zona de lavandería']
    if isinstance(features, list) and features == expected_features:
        print(f"   ✅ property_features: {features}")
    else:
        print(f"   ❌ property_features: esperado {expected_features}, obtenido {features}")
        success = False
    
    # Verificar nearby_amenities
    expected_amenities = ['Supermercado', 'Colegio', 'Hospital']
    if isinstance(amenities, list) and amenities == expected_amenities:
        print(f"   ✅ nearby_amenities: {amenities}")
    else:
        print(f"   ❌ nearby_amenities: esperado {expected_amenities}, obtenido {amenities}")
        success = False
    
    # Verificar transportation
    expected_transport = ['Bus', 'Metro', 'Taxi']
    if isinstance(transport, list) and transport == expected_transport:
        print(f"   ✅ transportation: {transport}")
    else:
        print(f"   ❌ transportation: esperado {expected_transport}, obtenido {transport}")
        success = False
    
    # Verificar otros campos
    print(f"\n🔢 OTROS CAMPOS:")
    print(f"   parking_spaces: {property_obj.parking_spaces} (tipo: {type(property_obj.parking_spaces)})")
    print(f"   floors: {property_obj.floors} (tipo: {type(property_obj.floors)})")
    print(f"   minimum_lease_term: {property_obj.minimum_lease_term} (tipo: {type(property_obj.minimum_lease_term)})")
    print(f"   pets_allowed: {property_obj.pets_allowed} (tipo: {type(property_obj.pets_allowed)})")
    print(f"   furnished: {property_obj.furnished} (tipo: {type(property_obj.furnished)})")
    
    return success

def test_direct_property_creation():
    """Crear una propiedad directamente para verificar el comportamiento."""
    
    print("\n🧪 TESTING CREACIÓN DIRECTA DE PROPIEDAD")
    print("=" * 60)
    
    # Obtener usuario landlord
    try:
        landlord_user = User.objects.get(email='landlord@test.com')
    except User.DoesNotExist:
        print("❌ Usuario landlord@test.com no encontrado")
        return False
    
    # Crear propiedad directamente
    property_data = {
        'title': 'Test Direct Creation',
        'description': 'Testing direct property creation',
        'property_type': 'house',
        'listing_type': 'rent',
        'address': 'Test Address',
        'city': 'Test City',
        'state': 'Test State',
        'country': 'Colombia',
        'bedrooms': 2,
        'bathrooms': 1,
        'total_area': 100,
        'rent_price': 1000000,
        'landlord': landlord_user,
        'utilities_included': ['agua', 'luz'],  # Lista directa
        'property_features': ['Jardín', 'Terraza'],  # Lista directa
        'nearby_amenities': ['Supermercado'],  # Lista directa
        'transportation': ['Bus'],  # Lista directa
    }
    
    try:
        property_obj = Property.objects.create(**property_data)
        print(f"✅ Propiedad creada directamente: {property_obj.title}")
        
        # Verificar que los campos JSON se guardaron correctamente
        print(f"   utilities_included: {property_obj.utilities_included} (tipo: {type(property_obj.utilities_included)})")
        print(f"   property_features: {property_obj.property_features} (tipo: {type(property_obj.property_features)})")
        print(f"   nearby_amenities: {property_obj.nearby_amenities} (tipo: {type(property_obj.nearby_amenities)})")
        print(f"   transportation: {property_obj.transportation} (tipo: {type(property_obj.transportation)})")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al crear propiedad: {e}")
        return False

if __name__ == '__main__':
    print("🚀 INICIANDO VERIFICACIÓN DE BASE DE DATOS")
    print("=" * 80)
    
    # Test 1: Verificar datos en base de datos
    success1 = verify_database_data()
    
    # Test 2: Crear propiedad directamente
    success2 = test_direct_property_creation()
    
    print("\n📊 RESUMEN DE RESULTADOS:")
    print(f"  Verificación BD: {'✅ PASSED' if success1 else '❌ FAILED'}")
    print(f"  Creación directa: {'✅ PASSED' if success2 else '❌ FAILED'}")
    
    if success1 and success2:
        print("\n🎉 TODOS LOS TESTS PASARON!")
        print("✅ Los datos se están guardando correctamente en la base de datos")
    else:
        print("\n❌ ALGUNOS TESTS FALLARON")
        print("🔧 Revisar logs para más detalles")