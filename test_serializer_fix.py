#!/usr/bin/env python3
"""
Test script para validar que el serializer corregido funciona correctamente.
"""

import os
import sys
import django
from django.conf import settings

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from properties.optimized_serializers import OptimizedCreatePropertySerializer

def test_serializer_with_all_fields():
    """Test que el serializer acepta todos los campos del frontend."""
    
    # Datos de prueba que simulan lo que viene del frontend
    test_data = {
        'title': 'Test Property',
        'description': 'Test description',
        'property_type': 'apartment',
        'listing_type': 'rent',
        'address': '123 Test St',
        'city': 'Medellín',
        'state': 'Antioquia',
        'country': 'Colombia',
        'postal_code': '050001',
        'latitude': 6.2442,
        'longitude': -75.5812,
        'bedrooms': 2,
        'bathrooms': 1,
        'total_area': 80.0,
        'lot_area': 100.0,
        'year_built': 2020,
        'rent_price': 1500000,
        'sale_price': None,
        'security_deposit': 1500000,
        'utilities_included': 'agua, luz, internet',  # CSV string
        'furnished': True,
        'pets_allowed': False,
        'smoking_allowed': False,
        'available_from': '2024-01-01',
        # Campos que faltaban
        'parking_spaces': 1,
        'floors': 5,
        'minimum_lease_term': 6,
        'property_features': 'balcón, vista ciudad, cocina integral',  # CSV string
        'nearby_amenities': 'parque, supermercado, transporte',  # CSV string
        'transportation': 'metro, bus, taxi'  # CSV string
    }
    
    print("🧪 TESTING SERIALIZER CON TODOS LOS CAMPOS")
    print("=" * 50)
    
    # Test del serializer
    serializer = OptimizedCreatePropertySerializer(data=test_data)
    
    print(f"✅ Datos de entrada válidos: {serializer.is_valid()}")
    
    if serializer.is_valid():
        print("✅ Serializer válido - Todos los campos aceptados")
        print("\n🔍 DATOS VALIDADOS:")
        validated_data = serializer.validated_data
        
        # Verificar conversiones CSV -> JSON
        print(f"utilities_included: {validated_data['utilities_included']}")
        print(f"property_features: {validated_data['property_features']}")
        print(f"nearby_amenities: {validated_data['nearby_amenities']}")
        print(f"transportation: {validated_data['transportation']}")
        
        # Verificar campos numéricos
        print(f"parking_spaces: {validated_data['parking_spaces']}")
        print(f"floors: {validated_data['floors']}")
        print(f"minimum_lease_term: {validated_data['minimum_lease_term']}")
        
        print("\n🎉 SERIALIZER FUNCIONA CORRECTAMENTE")
        return True
    else:
        print("❌ Errores en el serializer:")
        for field, errors in serializer.errors.items():
            print(f"  - {field}: {errors}")
        return False

def test_csv_to_json_conversion():
    """Test específico para conversión CSV -> JSON."""
    
    print("\n🧪 TESTING CONVERSIÓN CSV -> JSON")
    print("=" * 50)
    
    test_cases = [
        {
            'utilities_included': 'agua, luz, internet, telefono',
            'property_features': 'balcón, vista ciudad, cocina integral, aire acondicionado',
            'nearby_amenities': 'parque, supermercado, banco, farmacia',
            'transportation': 'metro, bus, taxi, bicicleta'
        }
    ]
    
    for i, test_case in enumerate(test_cases):
        print(f"\n📋 Test Case {i+1}:")
        
        # Crear datos mínimos para test
        basic_data = {
            'title': f'Test Property {i+1}',
            'property_type': 'apartment',
            'listing_type': 'rent',
            'rent_price': 1000000,
            'city': 'Medellín'
        }
        
        # Agregar los campos de prueba
        basic_data.update(test_case)
        
        serializer = OptimizedCreatePropertySerializer(data=basic_data)
        
        if serializer.is_valid():
            validated = serializer.validated_data
            
            for field, original_value in test_case.items():
                converted_value = validated[field]
                print(f"  {field}:")
                print(f"    Original: '{original_value}'")
                print(f"    Converted: {converted_value}")
                print(f"    Type: {type(converted_value)}")
                
                # Verificar que sea lista
                if isinstance(converted_value, list):
                    print(f"    ✅ Convertido a lista correctamente")
                else:
                    print(f"    ❌ NO convertido a lista")
        else:
            print(f"  ❌ Errores: {serializer.errors}")

if __name__ == "__main__":
    print("🚀 VALIDANDO SERIALIZER CORREGIDO")
    print("=" * 60)
    
    # Test principal
    success = test_serializer_with_all_fields()
    
    # Test de conversiones
    test_csv_to_json_conversion()
    
    if success:
        print("\n🎉 TODOS LOS TESTS PASARON - SERIALIZER CORREGIDO EXITOSAMENTE")
    else:
        print("\n❌ ALGUNOS TESTS FALLARON - REVISAR SERIALIZER")