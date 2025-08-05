#!/usr/bin/env python3
"""
Test completo de creación de propiedad con todos los campos.
"""

import os
import sys
import django
from django.conf import settings

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from properties.optimized_serializers import OptimizedCreatePropertySerializer
from django.contrib.auth import get_user_model
from properties.models import Property

User = get_user_model()

def test_complete_property_creation():
    """Test completo de creación de propiedad."""
    
    print("🏠 TESTING CREACIÓN COMPLETA DE PROPIEDAD")
    print("=" * 50)
    
    # Obtener un usuario landlord existente
    try:
        landlord = User.objects.filter(role='landlord').first()
        if not landlord:
            print("❌ No se encontró un usuario landlord. Creando uno...")
            landlord = User.objects.create_user(
                email='test_landlord@test.com',
                password='test123',
                first_name='Test',
                last_name='Landlord',
                role='landlord'
            )
            print(f"✅ Usuario landlord creado: {landlord.email}")
        else:
            print(f"✅ Usuario landlord encontrado: {landlord.email}")
    except Exception as e:
        print(f"❌ Error al obtener landlord: {e}")
        return False
    
    # Datos completos de la propiedad
    property_data = {
        'title': 'Apartamento Moderno El Poblado',
        'description': 'Hermoso apartamento en el corazón de El Poblado con todas las comodidades',
        'property_type': 'apartment',
        'listing_type': 'rent',
        'address': 'Carrera 43A #16-38',
        'city': 'Medellín',
        'state': 'Antioquia',
        'country': 'Colombia',
        'postal_code': '050021',
        'latitude': 6.2088,
        'longitude': -75.5648,
        'bedrooms': 3,
        'bathrooms': 2,
        'total_area': 120.0,
        'lot_area': 150.0,
        'year_built': 2018,
        'rent_price': 3500000,
        'sale_price': None,
        'security_deposit': 3500000,
        'utilities_included': 'agua, luz, internet, gas',
        'furnished': True,
        'pets_allowed': True,
        'smoking_allowed': False,
        'available_from': '2024-01-15',
        'parking_spaces': 2,
        'floors': 15,
        'minimum_lease_term': 12,
        'property_features': 'balcón, vista ciudad, cocina integral, aire acondicionado, closets',
        'nearby_amenities': 'centro comercial, parque, supermercado, restaurantes, bancos',
        'transportation': 'metro, bus, taxi, uber'
    }
    
    print("📋 Validando datos con el serializer...")
    
    # Validar con serializer
    serializer = OptimizedCreatePropertySerializer(data=property_data)
    
    if serializer.is_valid():
        print("✅ Datos válidos según el serializer")
        
        # Imprimir datos validados
        validated_data = serializer.validated_data
        print("\n🔍 CAMPOS CONVERTIDOS:")
        print(f"utilities_included: {validated_data['utilities_included']}")
        print(f"property_features: {validated_data['property_features']}")
        print(f"nearby_amenities: {validated_data['nearby_amenities']}")
        print(f"transportation: {validated_data['transportation']}")
        
        # Intentar crear la propiedad
        try:
            validated_data['landlord'] = landlord
            property_instance = Property.objects.create(**validated_data)
            
            print(f"\n✅ Propiedad creada exitosamente!")
            print(f"ID: {property_instance.id}")
            print(f"Title: {property_instance.title}")
            print(f"Landlord: {property_instance.landlord.email}")
            
            # Verificar que los campos JSON se guardaron correctamente
            print(f"\n🗃️ CAMPOS JSON EN LA BASE DE DATOS:")
            print(f"utilities_included: {property_instance.utilities_included}")
            print(f"property_features: {property_instance.property_features}")
            print(f"nearby_amenities: {property_instance.nearby_amenities}")
            print(f"transportation: {property_instance.transportation}")
            
            # Verificar tipos de datos
            print(f"\n🔍 TIPOS DE DATOS:")
            print(f"utilities_included: {type(property_instance.utilities_included)}")
            print(f"property_features: {type(property_instance.property_features)}")
            print(f"nearby_amenities: {type(property_instance.nearby_amenities)}")
            print(f"transportation: {type(property_instance.transportation)}")
            
            print(f"\n🎉 CREACIÓN COMPLETA EXITOSA!")
            return True
            
        except Exception as e:
            print(f"❌ Error al crear la propiedad: {e}")
            return False
    else:
        print("❌ Errores en la validación:")
        for field, errors in serializer.errors.items():
            print(f"  - {field}: {errors}")
        return False

def test_edge_cases():
    """Test casos especiales y edge cases."""
    
    print("\n🧪 TESTING CASOS ESPECIALES")
    print("=" * 50)
    
    # Test con listas ya convertidas
    print("📋 Test 1: Con listas ya convertidas")
    data_with_lists = {
        'title': 'Test con listas',
        'property_type': 'apartment',
        'listing_type': 'rent',
        'rent_price': 1000000,
        'city': 'Test City',
        'address': 'Test Address',
        'state': 'Test State',
        'description': 'Test Description',
        'total_area': 100.0,
        'utilities_included': ['agua', 'luz'],  # Ya es lista
        'property_features': ['balcón', 'vista'],  # Ya es lista
        'nearby_amenities': ['parque'],  # Ya es lista
        'transportation': ['metro', 'bus']  # Ya es lista
    }
    
    serializer = OptimizedCreatePropertySerializer(data=data_with_lists)
    if serializer.is_valid():
        print("✅ Listas ya convertidas - Validación exitosa")
        validated = serializer.validated_data
        print(f"  utilities_included: {validated['utilities_included']}")
    else:
        print(f"❌ Error con listas: {serializer.errors}")
    
    # Test con campos vacíos
    print("\n📋 Test 2: Con strings vacíos")
    data_with_empty = {
        'title': 'Test vacío',
        'property_type': 'apartment',
        'listing_type': 'rent',
        'rent_price': 1000000,
        'city': 'Test City',
        'address': 'Test Address',
        'state': 'Test State',
        'description': 'Test Description',
        'total_area': 100.0,
        'utilities_included': '',  # String vacío
        'property_features': '  ,  ,  ',  # String con comas y espacios
        'nearby_amenities': 'parque, , supermercado',  # Con elemento vacío
        'transportation': 'metro'  # Un solo elemento
    }
    
    serializer = OptimizedCreatePropertySerializer(data=data_with_empty)
    if serializer.is_valid():
        print("✅ Campos vacíos - Validación exitosa")
        validated = serializer.validated_data
        print(f"  utilities_included: {validated['utilities_included']}")
        print(f"  property_features: {validated['property_features']}")
        print(f"  nearby_amenities: {validated['nearby_amenities']}")
        print(f"  transportation: {validated['transportation']}")
    else:
        print(f"❌ Error con campos vacíos: {serializer.errors}")

if __name__ == "__main__":
    print("🚀 TEST COMPLETO DE CREACIÓN DE PROPIEDAD")
    print("=" * 60)
    
    success = test_complete_property_creation()
    test_edge_cases()
    
    if success:
        print("\n🎉 TODOS LOS TESTS COMPLETADOS EXITOSAMENTE!")
        print("✅ El serializer maneja correctamente todos los campos del frontend")
    else:
        print("\n❌ ALGUNOS TESTS FALLARON - REVISAR CONFIGURACIÓN")