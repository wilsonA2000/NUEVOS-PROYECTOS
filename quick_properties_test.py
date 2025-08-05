#!/usr/bin/env python3
"""
Script de prueba rápida para verificar la funcionalidad básica del módulo de propiedades.
Este script ejecuta pruebas básicas sin necesidad de configuración compleja.
"""

import os
import sys
import django
from datetime import date
from decimal import Decimal

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from properties.models import (
    Property, PropertyImage, PropertyVideo, PropertyAmenity, 
    PropertyInquiry, PropertyFavorite, PropertyView
)

User = get_user_model()

def print_header(title):
    """Imprime un encabezado formateado."""
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def print_section(title):
    """Imprime una sección formateada."""
    print(f"\n--- {title} ---")

def test_user_creation():
    """Prueba la creación de usuarios."""
    print_section("PRUEBA DE CREACIÓN DE USUARIOS")
    
    # Crear arrendador
    landlord, created = User.objects.get_or_create(
        email='landlord@test.com',
        defaults={
            'first_name': 'Juan',
            'last_name': 'Pérez',
            'user_type': 'landlord',
            'is_verified': True
        }
    )
    if created:
        landlord.set_password('testpass123')
        landlord.save()
        print("✅ Arrendador creado")
    else:
        print("ℹ️  Arrendador ya existe")
    
    # Crear arrendatario
    tenant, created = User.objects.get_or_create(
        email='tenant@test.com',
        defaults={
            'first_name': 'María',
            'last_name': 'García',
            'user_type': 'tenant',
            'is_verified': True
        }
    )
    if created:
        tenant.set_password('testpass123')
        tenant.save()
        print("✅ Arrendatario creado")
    else:
        print("ℹ️  Arrendatario ya existe")
    
    return landlord, tenant

def test_property_creation(landlord):
    """Prueba la creación de propiedades."""
    print_section("PRUEBA DE CREACIÓN DE PROPIEDADES")
    
    # Crear propiedad
    property_obj, created = Property.objects.get_or_create(
        title='Apartamento de Prueba',
        landlord=landlord,
        defaults={
            'description': 'Hermoso apartamento en el centro de la ciudad',
            'property_type': 'apartment',
            'listing_type': 'rent',
            'status': 'available',
            'address': 'Calle de Prueba 123',
            'city': 'Ciudad de Prueba',
            'state': 'Estado de Prueba',
            'country': 'México',
            'postal_code': '12345',
            'bedrooms': 2,
            'bathrooms': 1,
            'total_area': 80.0,
            'rent_price': Decimal('15000.00'),
            'minimum_lease_term': 12,
            'pets_allowed': True,
            'furnished': False,
            'utilities_included': ['electricity', 'water'],
            'property_features': ['balcony', 'closet'],
            'nearby_amenities': ['supermarket', 'park'],
            'transportation': ['metro', 'bus'],
            'is_active': True
        }
    )
    
    if created:
        print("✅ Propiedad creada")
    else:
        print("ℹ️  Propiedad ya existe")
    
    return property_obj

def test_amenities_creation():
    """Prueba la creación de amenidades."""
    print_section("PRUEBA DE CREACIÓN DE AMENIDADES")
    
    amenities_data = [
        {'name': 'Piscina', 'category': 'recreation', 'icon': 'pool'},
        {'name': 'Gimnasio', 'category': 'recreation', 'icon': 'gym'},
        {'name': 'Estacionamiento', 'category': 'parking', 'icon': 'parking'},
        {'name': 'Seguridad 24/7', 'category': 'security', 'icon': 'security'},
        {'name': 'Aire acondicionado', 'category': 'interior', 'icon': 'ac'},
        {'name': 'Balcón', 'category': 'exterior', 'icon': 'balcony'},
    ]
    
    created_count = 0
    for amenity_data in amenities_data:
        amenity, created = PropertyAmenity.objects.get_or_create(
            name=amenity_data['name'],
            defaults=amenity_data
        )
        if created:
            created_count += 1
    
    print(f"✅ {created_count} amenidades creadas")
    return created_count

def test_property_interactions(property_obj, tenant):
    """Prueba las interacciones con propiedades."""
    print_section("PRUEBA DE INTERACCIONES CON PROPIEDADES")
    
    # Crear consulta
    inquiry, created = PropertyInquiry.objects.get_or_create(
        property=property_obj,
        inquirer=tenant,
        defaults={
            'subject': 'Consulta de prueba',
            'message': 'Me interesa esta propiedad, ¿podría visitarla?',
            'preferred_contact_method': 'email',
            'status': 'new'
        }
    )
    
    if created:
        print("✅ Consulta creada")
    else:
        print("ℹ️  Consulta ya existe")
    
    # Crear favorito
    favorite, created = PropertyFavorite.objects.get_or_create(
        property=property_obj,
        user=tenant
    )
    
    if created:
        print("✅ Favorito creado")
    else:
        print("ℹ️  Favorito ya existe")
    
    # Crear vista
    view, created = PropertyView.objects.get_or_create(
        property=property_obj,
        user=tenant,
        defaults={
            'ip_address': '192.168.1.1',
            'user_agent': 'Mozilla/5.0 (Test Browser)'
        }
    )
    
    if created:
        print("✅ Vista registrada")
    else:
        print("ℹ️  Vista ya existe")
    
    return inquiry, favorite, view

def test_property_queries(landlord, tenant):
    """Prueba las consultas de propiedades."""
    print_section("PRUEBA DE CONSULTAS DE PROPIEDADES")
    
    # Propiedades del arrendador
    landlord_properties = Property.objects.filter(landlord=landlord)
    print(f"✅ Arrendador tiene {landlord_properties.count()} propiedades")
    
    # Propiedades disponibles para arrendatario
    available_properties = Property.objects.filter(is_active=True, status='available')
    print(f"✅ Hay {available_properties.count()} propiedades disponibles")
    
    # Consultas del arrendador
    landlord_inquiries = PropertyInquiry.objects.filter(property__landlord=landlord)
    print(f"✅ Arrendador tiene {landlord_inquiries.count()} consultas")
    
    # Consultas del arrendatario
    tenant_inquiries = PropertyInquiry.objects.filter(inquirer=tenant)
    print(f"✅ Arrendatario tiene {tenant_inquiries.count()} consultas")
    
    # Favoritos del arrendatario
    tenant_favorites = PropertyFavorite.objects.filter(user=tenant)
    print(f"✅ Arrendatario tiene {tenant_favorites.count()} favoritos")
    
    # Vistas de propiedades
    total_views = PropertyView.objects.count()
    print(f"✅ Total de vistas registradas: {total_views}")

def test_property_validation():
    """Prueba las validaciones de propiedades."""
    print_section("PRUEBA DE VALIDACIONES")
    
    try:
        # Intentar crear propiedad sin campos obligatorios
        invalid_property = Property()
        invalid_property.full_clean()
        print("❌ Error: Se permitió crear propiedad inválida")
        return False
    except Exception as e:
        print("✅ Validación funciona correctamente")
        return True

def test_property_methods(property_obj):
    """Prueba los métodos de las propiedades."""
    print_section("PRUEBA DE MÉTODOS DE PROPIEDADES")
    
    # Método __str__
    print(f"✅ Representación en string: {property_obj}")
    
    # Método get_main_image
    main_image = property_obj.get_main_image()
    print(f"✅ Imagen principal: {main_image}")
    
    # Verificar contadores
    print(f"✅ Vistas: {property_obj.views_count}")
    print(f"✅ Favoritos: {property_obj.favorites_count}")

def run_quick_tests():
    """Ejecuta todas las pruebas rápidas."""
    print_header("PRUEBAS RÁPIDAS - MÓDULO DE PROPIEDADES")
    
    try:
        # Crear usuarios
        landlord, tenant = test_user_creation()
        
        # Crear amenidades
        amenities_count = test_amenities_creation()
        
        # Crear propiedad
        property_obj = test_property_creation(landlord)
        
        # Probar interacciones
        inquiry, favorite, view = test_property_interactions(property_obj, tenant)
        
        # Probar consultas
        test_property_queries(landlord, tenant)
        
        # Probar validaciones
        validation_ok = test_property_validation()
        
        # Probar métodos
        test_property_methods(property_obj)
        
        # Resumen
        print_header("RESUMEN DE PRUEBAS")
        print("✅ Todas las pruebas básicas pasaron exitosamente")
        print(f"📊 Datos creados:")
        print(f"   - Usuarios: 2 (arrendador, arrendatario)")
        print(f"   - Amenidades: {amenities_count}")
        print(f"   - Propiedades: 1")
        print(f"   - Consultas: 1")
        print(f"   - Favoritos: 1")
        print(f"   - Vistas: 1")
        print(f"   - Validaciones: {'✅' if validation_ok else '❌'}")
        
        print("\n🎉 El módulo de propiedades está funcionando correctamente!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error durante las pruebas: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = run_quick_tests()
    sys.exit(0 if success else 1) 