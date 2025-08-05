#!/usr/bin/env python
"""
Script para crear usuarios de prueba para VeriHome.
Crea un superusuario y usuarios para cada tipo de perfil.
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import LandlordProfile, TenantProfile, ServiceProviderProfile
from django.db import transaction

User = get_user_model()

def create_superuser():
    """Crea un superusuario para el admin de Django."""
    print("🔧 Creando superusuario...")
    
    try:
        # Verificar si ya existe
        if User.objects.filter(is_superuser=True).exists():
            print("⚠️  Ya existe un superusuario")
            return
        
        # Crear superusuario
        superuser = User.objects.create_superuser(
            email='admin@verihome.com',
            password='admin123',
            first_name='Admin',
            last_name='VeriHome',
            user_type='landlord'  # Tipo por defecto
        )
        
        print("✅ Superusuario creado exitosamente!")
        print(f"   Email: admin@verihome.com")
        print(f"   Password: admin123")
        print(f"   Nombre: {superuser.get_full_name()}")
        
        return superuser
        
    except Exception as e:
        print(f"❌ Error creando superusuario: {e}")
        return None

def create_landlord_user():
    """Crea un usuario arrendador de prueba."""
    print("\n🏠 Creando usuario arrendador...")
    
    try:
        # Verificar si ya existe
        if User.objects.filter(email='landlord@verihome.com').exists():
            print("⚠️  Ya existe el usuario arrendador")
            return User.objects.get(email='landlord@verihome.com')
        
        # Crear usuario arrendador
        landlord = User.objects.create_user(
            email='landlord@verihome.com',
            password='landlord123',
            first_name='Juan',
            last_name='Pérez',
            user_type='landlord',
            is_verified=True,
            phone_number='+525512345678'
        )
        
        # Crear perfil de arrendador
        landlord_profile = LandlordProfile.objects.create(
            user=landlord,
            company_name='Inmobiliaria Pérez',
            total_properties=5,
            years_experience=8,
            property_types=['apartment', 'house', 'commercial']
        )
        
        print("✅ Usuario arrendador creado exitosamente!")
        print(f"   Email: landlord@verihome.com")
        print(f"   Password: landlord123")
        print(f"   Nombre: {landlord.get_full_name()}")
        print(f"   Empresa: {landlord_profile.company_name}")
        print(f"   Propiedades: {landlord_profile.total_properties}")
        
        return landlord
        
    except Exception as e:
        print(f"❌ Error creando usuario arrendador: {e}")
        return None

def create_tenant_user():
    """Crea un usuario arrendatario de prueba."""
    print("\n🏡 Creando usuario arrendatario...")
    
    try:
        # Verificar si ya existe
        if User.objects.filter(email='tenant@verihome.com').exists():
            print("⚠️  Ya existe el usuario arrendatario")
            return User.objects.get(email='tenant@verihome.com')
        
        # Crear usuario arrendatario
        tenant = User.objects.create_user(
            email='tenant@verihome.com',
            password='tenant123',
            first_name='María',
            last_name='García',
            user_type='tenant',
            is_verified=True,
            phone_number='+525598765432'
        )
        
        # Crear perfil de arrendatario
        tenant_profile = TenantProfile.objects.create(
            user=tenant,
            employment_status='employed',
            monthly_income=25000,
            preferred_areas=['Polanco', 'Roma Norte', 'Condesa'],
            property_preferences=['apartment', 'studio']
        )
        
        print("✅ Usuario arrendatario creado exitosamente!")
        print(f"   Email: tenant@verihome.com")
        print(f"   Password: tenant123")
        print(f"   Nombre: {tenant.get_full_name()}")
        print(f"   Estado laboral: {tenant_profile.get_employment_status_display()}")
        print(f"   Ingreso mensual: ${tenant_profile.monthly_income:,}")
        
        return tenant
        
    except Exception as e:
        print(f"❌ Error creando usuario arrendatario: {e}")
        return None

def create_service_provider_user():
    """Crea un usuario prestador de servicios de prueba."""
    print("\n🔧 Creando usuario prestador de servicios...")
    
    try:
        # Verificar si ya existe
        if User.objects.filter(email='service@verihome.com').exists():
            print("⚠️  Ya existe el usuario prestador de servicios")
            return User.objects.get(email='service@verihome.com')
        
        # Crear usuario prestador de servicios
        service_provider = User.objects.create_user(
            email='service@verihome.com',
            password='service123',
            first_name='Carlos',
            last_name='López',
            user_type='service_provider',
            is_verified=True,
            phone_number='+525555555555'
        )
        
        # Crear perfil de prestador de servicios
        service_profile = ServiceProviderProfile.objects.create(
            user=service_provider,
            business_name='Servicios López',
            service_category='plumbing',
            specialties='Plomería residencial y comercial, instalación de sistemas de agua, reparación de fugas',
            years_experience=12,
            service_areas=['CDMX', 'Estado de México']
        )
        
        print("✅ Usuario prestador de servicios creado exitosamente!")
        print(f"   Email: service@verihome.com")
        print(f"   Password: service123")
        print(f"   Nombre: {service_provider.get_full_name()}")
        print(f"   Negocio: {service_profile.business_name}")
        print(f"   Categoría: {service_profile.get_service_category_display()}")
        print(f"   Años de experiencia: {service_profile.years_experience}")
        
        return service_provider
        
    except Exception as e:
        print(f"❌ Error creando usuario prestador de servicios: {e}")
        return None

def main():
    """Función principal que crea todos los usuarios."""
    print("🚀 Creando usuarios de prueba para VeriHome")
    print("=" * 60)
    
    try:
        with transaction.atomic():
            # Crear superusuario
            superuser = create_superuser()
            
            # Crear usuarios de prueba
            landlord = create_landlord_user()
            tenant = create_tenant_user()
            service_provider = create_service_provider_user()
            
            print("\n" + "=" * 60)
            print("✅ Usuarios creados exitosamente!")
            print("\n📋 Resumen de credenciales:")
            print("=" * 60)
            print("🔧 SUPERUSUARIO (Admin Django):")
            print("   Email: admin@verihome.com")
            print("   Password: admin123")
            print("\n🏠 ARRENDADOR:")
            print("   Email: landlord@verihome.com")
            print("   Password: landlord123")
            print("\n🏡 ARRENDATARIO:")
            print("   Email: tenant@verihome.com")
            print("   Password: tenant123")
            print("\n🔧 PRESTADOR DE SERVICIOS:")
            print("   Email: service@verihome.com")
            print("   Password: service123")
            print("\n" + "=" * 60)
            print("🎯 Ahora puedes:")
            print("   1. Acceder al admin de Django con admin@verihome.com")
            print("   2. Probar las funcionalidades con los usuarios creados")
            print("   3. Ejecutar las pruebas de mensajería")
            
    except Exception as e:
        print(f"❌ Error general: {e}")

if __name__ == "__main__":
    main() 