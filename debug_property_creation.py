#!/usr/bin/env python3
"""
Script para depurar el error 400 Bad Request en la creación de propiedades.
Reproduce exactamente los datos del log del usuario para identificar el error.
"""

import os
import sys
import django
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

import json
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from properties.optimized_serializers import OptimizedCreatePropertySerializer
from properties.models import Property
from decimal import Decimal
from datetime import date

User = get_user_model()

def debug_property_creation():
    """Depura el error 400 en la creación de propiedades."""
    
    print("🔍 DEBUGGING PROPERTY CREATION ERROR 400")
    print("=" * 50)
    
    # Datos del FormData del usuario (basados en los logs)
    formdata_from_logs = {
        'title': 'bucaramanga casa',
        'description': 'casa hermosa bucarmnga',
        'property_type': 'house',
        'listing_type': 'rent',
        'address': 'calle 123',
        'city': 'bucaramanga',
        'state': 'santander',
        'country': 'colombia',
        'postal_code': '680001',
        'bedrooms': '3',
        'bathrooms': '2.0',
        'total_area': '150.50',
        'lot_area': '200.00',
        'year_built': '2020',
        'rent_price': '1200000',
        'security_deposit': '1200000',
        'utilities_included': 'agua,luz, telefono, internet',
        'furnished': 'false',
        'pets_allowed': 'false',
        'smoking_allowed': 'false',
        'property_features': 'jardin amplio',
        'nearby_amenities': 'zona verde',
        'transportation': 'metrolinea',
        'available_from': '2024-01-15',
        'latitude': '7.119349',
        'longitude': '-73.122742',
        'parking_spaces': '1',
        'floors': '2',
        'minimum_lease_term': '12'
    }
    
    print("📋 DATOS DEL FORMDATA:")
    for key, value in formdata_from_logs.items():
        print(f"  {key}: {value} (type: {type(value)})")
    
    print("\n🔧 PASO 1: Verificar modelo Property")
    
    # Verificar campos del modelo Property
    from properties.models import Property
    property_fields = [field.name for field in Property._meta.fields]
    print(f"Campos del modelo Property: {property_fields}")
    
    print("\n🔧 PASO 2: Verificar serializer CreatePropertySerializer")
    
    # Verificar campos del serializer
    serializer_fields = OptimizedCreatePropertySerializer().fields.keys()
    print(f"Campos del serializer: {list(serializer_fields)}")
    
    print("\n🔧 PASO 3: Identificar campos extras en FormData")
    
    # Campos que están en FormData pero no en serializer
    extra_fields = set(formdata_from_logs.keys()) - set(serializer_fields)
    print(f"Campos EXTRAS en FormData (no en serializer): {extra_fields}")
    
    print("\n🔧 PASO 4: Limpiar datos para serializer")
    
    # Limpiar datos manteniendo solo campos válidos del serializer
    clean_data = {}
    for field_name in serializer_fields:
        if field_name in formdata_from_logs:
            value = formdata_from_logs[field_name]
            
            # Convertir tipos de datos según el campo
            if field_name in ['bedrooms', 'parking_spaces', 'floors', 'minimum_lease_term', 'year_built']:
                clean_data[field_name] = int(value) if value else 0
            elif field_name in ['bathrooms', 'total_area', 'lot_area', 'rent_price', 'security_deposit']:
                clean_data[field_name] = Decimal(value) if value else None
            elif field_name in ['furnished', 'pets_allowed', 'smoking_allowed']:
                clean_data[field_name] = value.lower() == 'true' if isinstance(value, str) else bool(value)
            elif field_name == 'available_from':
                if value:
                    try:
                        clean_data[field_name] = date.fromisoformat(value)
                    except:
                        clean_data[field_name] = None
                else:
                    clean_data[field_name] = None
            elif field_name in ['latitude', 'longitude']:
                clean_data[field_name] = Decimal(value) if value else None
            elif field_name in ['utilities_included', 'property_features', 'nearby_amenities', 'transportation']:
                # Convertir strings a listas (campos JSON en el modelo)
                if isinstance(value, str):
                    clean_data[field_name] = [item.strip() for item in value.split(',') if item.strip()]
                else:
                    clean_data[field_name] = value
            else:
                clean_data[field_name] = value
    
    print("📋 DATOS LIMPIOS PARA SERIALIZER:")
    for key, value in clean_data.items():
        print(f"  {key}: {value} (type: {type(value)})")
    
    print("\n🔧 PASO 5: Crear usuario de prueba")
    
    # Crear o obtener usuario landlord para pruebas
    try:
        user = User.objects.get(email='landlord@test.com')
        print(f"✅ Usuario encontrado: {user.email}")
    except User.DoesNotExist:
        user = User.objects.create_user(
            email='landlord@test.com',
            password='test123',
            first_name='Test',
            last_name='Landlord',
            user_type='landlord'
        )
        print(f"✅ Usuario creado: {user.email}")
    
    print("\n🔧 PASO 6: Probar serializer con datos limpios")
    
    # Crear el serializer con contexto de request
    factory = RequestFactory()
    request = factory.post('/api/v1/properties/properties/')
    request.user = user
    
    serializer = OptimizedCreatePropertySerializer(data=clean_data, context={'request': request})
    
    print("🧪 VALIDANDO SERIALIZER...")
    
    if serializer.is_valid():
        print("✅ SERIALIZER VÁLIDO")
        print("📦 Datos validados:", serializer.validated_data)
        
        # Intentar crear la propiedad
        try:
            property_obj = serializer.save(landlord=user)
            print(f"✅ PROPIEDAD CREADA EXITOSAMENTE: {property_obj.id}")
            print(f"   Título: {property_obj.title}")
            print(f"   Ciudad: {property_obj.city}")
            print(f"   Precio: {property_obj.rent_price}")
            
        except Exception as e:
            print(f"❌ ERROR AL GUARDAR LA PROPIEDAD: {e}")
            print(f"   Tipo de error: {type(e)}")
            
    else:
        print("❌ SERIALIZER INVÁLIDO")
        print("🚨 ERRORES ENCONTRADOS:")
        for field, errors in serializer.errors.items():
            print(f"  Campo '{field}': {errors}")
    
    print("\n🔧 PASO 7: Análisis detallado de validaciones")
    
    # Revisar validaciones específicas del serializer
    print("\n📝 VALIDACIONES DEL SERIALIZER:")
    
    # Verificar validación de listing_type vs rent_price
    listing_type = clean_data.get('listing_type')
    rent_price = clean_data.get('rent_price')
    sale_price = clean_data.get('sale_price')
    
    print(f"  listing_type: {listing_type}")
    print(f"  rent_price: {rent_price}")
    print(f"  sale_price: {sale_price}")
    
    # Ejecutar validación manual
    if listing_type == 'rent':
        if not rent_price or rent_price == 0:
            print("❌ VALIDACIÓN FALLIDA: rent_price requerido para listing_type='rent'")
        else:
            print("✅ VALIDACIÓN EXITOSA: rent_price válido para listing_type='rent'")
    
    if listing_type == 'sale':
        if not sale_price or sale_price == 0:
            print("❌ VALIDACIÓN FALLIDA: sale_price requerido para listing_type='sale'")
        else:
            print("✅ VALIDACIÓN EXITOSA: sale_price válido para listing_type='sale'")
    
    print("\n🔧 PASO 8: Revisar campos obligatorios del modelo")
    
    # Verificar campos obligatorios del modelo
    from django.core.exceptions import ValidationError
    
    try:
        # Crear instancia del modelo para verificar validaciones
        property_instance = Property(**clean_data, landlord=user)
        property_instance.full_clean()  # Ejecutar validaciones del modelo
        print("✅ VALIDACIONES DEL MODELO EXITOSAS")
        
    except ValidationError as e:
        print("❌ VALIDACIONES DEL MODELO FALLIDAS:")
        for field, errors in e.message_dict.items():
            print(f"  Campo '{field}': {errors}")
    except Exception as e:
        print(f"❌ ERROR EN VALIDACIONES DEL MODELO: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 DEBUGGING COMPLETO")

if __name__ == "__main__":
    debug_property_creation()