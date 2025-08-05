#!/usr/bin/env python3
"""
Script para diagnosticar y corregir problemas con las propiedades en VeriHome.
"""

import os
import sys
import django
from django.conf import settings

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from properties.models import Property
from users.models import User

def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_success(message):
    print(f"✅ {message}")

def print_error(message):
    print(f"❌ {message}")

def print_warning(message):
    print(f"⚠️  {message}")

def print_info(message):
    print(f"ℹ️  {message}")

def diagnose_properties_issues():
    """Diagnostica problemas con las propiedades."""
    print_header("DIAGNÓSTICO DE PROBLEMAS CON PROPIEDADES")
    
    User = get_user_model()
    
    # 1. Verificar usuarios existentes
    print_info("Verificando usuarios...")
    users = User.objects.all()
    print_success(f"Total de usuarios: {users.count()}")
    
    landlords = User.objects.filter(user_type='landlord')
    print_success(f"Usuarios tipo landlord: {landlords.count()}")
    
    # 2. Verificar propiedades existentes
    print_info("Verificando propiedades...")
    properties = Property.objects.all()
    print_success(f"Total de propiedades: {properties.count()}")
    
    active_properties = Property.objects.filter(is_active=True)
    print_success(f"Propiedades activas: {active_properties.count()}")
    
    available_properties = Property.objects.filter(status='available')
    print_success(f"Propiedades disponibles: {available_properties.count()}")
    
    # 3. Verificar propiedades sin landlord
    properties_without_landlord = Property.objects.filter(landlord__isnull=True)
    if properties_without_landlord.exists():
        print_warning(f"Propiedades sin landlord asignado: {properties_without_landlord.count()}")
        for prop in properties_without_landlord[:5]:
            print(f"   - {prop.title} (ID: {prop.id})")
    else:
        print_success("Todas las propiedades tienen landlord asignado")
    
    # 4. Verificar usuarios sin user_type
    users_without_type = User.objects.filter(user_type__isnull=True)
    if users_without_type.exists():
        print_warning(f"Usuarios sin user_type: {users_without_type.count()}")
        for user in users_without_type[:5]:
            print(f"   - {user.email} (ID: {user.id})")
    else:
        print_success("Todos los usuarios tienen user_type asignado")
    
    # 5. Verificar superusuarios
    superusers = User.objects.filter(is_superuser=True)
    print_success(f"Superusuarios: {superusers.count()}")
    for user in superusers:
        print(f"   - {user.email} (user_type: {user.user_type})")

def fix_properties_issues():
    """Corrige problemas comunes con las propiedades."""
    print_header("CORRECCIÓN DE PROBLEMAS CON PROPIEDADES")
    
    User = get_user_model()
    
    # 1. Asignar user_type a usuarios que no lo tienen
    users_without_type = User.objects.filter(user_type__isnull=True)
    if users_without_type.exists():
        print_info(f"Asignando user_type a {users_without_type.count()} usuarios...")
        for user in users_without_type:
            # Si es superusuario, asignar landlord por defecto
            if user.is_superuser:
                user.user_type = 'landlord'
                user.save()
                print_success(f"Usuario {user.email} asignado como landlord")
            else:
                # Para usuarios normales, asignar tenant por defecto
                user.user_type = 'tenant'
                user.save()
                print_success(f"Usuario {user.email} asignado como tenant")
    
    # 2. Asignar landlord a propiedades que no lo tienen
    properties_without_landlord = Property.objects.filter(landlord__isnull=True)
    if properties_without_landlord.exists():
        print_info(f"Asignando landlord a {properties_without_landlord.count()} propiedades...")
        
        # Buscar un landlord disponible
        landlord = User.objects.filter(user_type='landlord').first()
        if not landlord:
            # Si no hay landlord, crear uno
            landlord = User.objects.create(
                email='admin@verihome.com',
                first_name='Admin',
                last_name='VeriHome',
                user_type='landlord',
                is_staff=True,
                is_superuser=True
            )
            print_success(f"Creado landlord por defecto: {landlord.email}")
        
        # Asignar el landlord a todas las propiedades sin landlord
        properties_without_landlord.update(landlord=landlord)
        print_success(f"Landlord asignado a {properties_without_landlord.count()} propiedades")
    
    # 3. Asegurar que las propiedades tengan valores por defecto correctos
    print_info("Verificando valores por defecto de propiedades...")
    
    # Propiedades sin título
    properties_without_title = Property.objects.filter(title__isnull=True) | Property.objects.filter(title='')
    if properties_without_title.exists():
        print_info(f"Corrigiendo {properties_without_title.count()} propiedades sin título...")
        for i, prop in enumerate(properties_without_title):
            prop.title = f"Propiedad {prop.id}"
            prop.save()
            print_success(f"Título asignado a propiedad {prop.id}")
    
    # Propiedades sin descripción
    properties_without_description = Property.objects.filter(description__isnull=True) | Property.objects.filter(description='')
    if properties_without_description.exists():
        print_info(f"Corrigiendo {properties_without_description.count()} propiedades sin descripción...")
        for prop in properties_without_description:
            prop.description = "Descripción de la propiedad"
            prop.save()
            print_success(f"Descripción asignada a propiedad {prop.id}")
    
    # Propiedades sin dirección
    properties_without_address = Property.objects.filter(address__isnull=True) | Property.objects.filter(address='')
    if properties_without_address.exists():
        print_info(f"Corrigiendo {properties_without_address.count()} propiedades sin dirección...")
        for prop in properties_without_address:
            prop.address = "Dirección de la propiedad"
            prop.save()
            print_success(f"Dirección asignada a propiedad {prop.id}")

def create_test_properties():
    """Crea propiedades de prueba si no existen."""
    print_header("CREACIÓN DE PROPIEDADES DE PRUEBA")
    
    User = get_user_model()
    
    # Verificar si ya existen propiedades
    if Property.objects.exists():
        print_info("Ya existen propiedades en el sistema")
        return
    
    # Buscar o crear un landlord
    landlord = User.objects.filter(user_type='landlord').first()
    if not landlord:
        landlord = User.objects.create(
            email='landlord@verihome.com',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord'
        )
        print_success(f"Creado landlord de prueba: {landlord.email}")
    
    # Crear propiedades de prueba
    test_properties = [
        {
            'title': 'Casa Moderna en Condesa',
            'description': 'Hermosa casa moderna ubicada en el corazón de la Condesa, con excelente ubicación y amenidades.',
            'property_type': 'house',
            'listing_type': 'rent',
            'status': 'available',
            'address': 'Av. Tamaulipas 123',
            'city': 'Ciudad de México',
            'state': 'CDMX',
            'country': 'México',
            'postal_code': '06140',
            'bedrooms': 3,
            'bathrooms': 2.5,
            'total_area': 150.0,
            'rent_price': 25000.00,
            'pets_allowed': True,
            'furnished': False,
        },
        {
            'title': 'Apartamento en Polanco',
            'description': 'Elegante apartamento en Polanco, cerca de restaurantes y tiendas de lujo.',
            'property_type': 'apartment',
            'listing_type': 'rent',
            'status': 'available',
            'address': 'Av. Presidente Masaryk 456',
            'city': 'Ciudad de México',
            'state': 'CDMX',
            'country': 'México',
            'postal_code': '11560',
            'bedrooms': 2,
            'bathrooms': 2.0,
            'total_area': 120.0,
            'rent_price': 35000.00,
            'pets_allowed': False,
            'furnished': True,
        },
        {
            'title': 'Casa en Coyoacán',
            'description': 'Casa tradicional en Coyoacán, con jardín y terraza, perfecta para familias.',
            'property_type': 'house',
            'listing_type': 'sale',
            'status': 'available',
            'address': 'Calle Francisco Sosa 789',
            'city': 'Ciudad de México',
            'state': 'CDMX',
            'country': 'México',
            'postal_code': '04000',
            'bedrooms': 4,
            'bathrooms': 3.0,
            'total_area': 200.0,
            'sale_price': 8500000.00,
            'pets_allowed': True,
            'furnished': False,
        }
    ]
    
    for i, prop_data in enumerate(test_properties, 1):
        property_obj = Property.objects.create(
            landlord=landlord,
            **prop_data
        )
        print_success(f"Propiedad {i} creada: {property_obj.title}")
    
    print_success(f"Se crearon {len(test_properties)} propiedades de prueba")

def main():
    """Función principal."""
    print_header("VERIHOME - CORRECCIÓN DE PROBLEMAS CON PROPIEDADES")
    
    try:
        # 1. Diagnosticar problemas
        diagnose_properties_issues()
        
        # 2. Corregir problemas
        fix_properties_issues()
        
        # 3. Crear propiedades de prueba si es necesario
        create_test_properties()
        
        # 4. Verificar resultados
        print_header("VERIFICACIÓN FINAL")
        diagnose_properties_issues()
        
        print_success("¡Proceso completado exitosamente!")
        print_info("Ahora puedes probar la aplicación nuevamente")
        
    except Exception as e:
        print_error(f"Error durante el proceso: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main() 