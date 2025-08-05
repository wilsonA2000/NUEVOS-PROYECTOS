#!/usr/bin/env python3
"""
Script para verificar el tipo de usuario actual.
"""

import os
import sys
import django
from django.conf import settings

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

def check_users():
    """Verificar los tipos de usuario disponibles."""
    
    print("👥 VERIFICANDO TIPOS DE USUARIO")
    print("=" * 50)
    
    users = User.objects.all()[:10]  # Mostrar primeros 10
    
    for user in users:
        print(f"📋 Email: {user.email}")
        print(f"   - user_type: {getattr(user, 'user_type', 'NO TIENE')}")
        print(f"   - is_superuser: {user.is_superuser}")
        print(f"   - is_staff: {user.is_staff}")
        print(f"   - is_active: {user.is_active}")
        print()
    
    # Contar por tipos
    print("📊 CONTEO POR TIPOS:")
    landlords = User.objects.filter(user_type='landlord').count()
    tenants = User.objects.filter(user_type='tenant').count()
    service_providers = User.objects.filter(user_type='service_provider').count()
    no_type = User.objects.filter(user_type__isnull=True).count()
    
    print(f"   - Landlords: {landlords}")
    print(f"   - Tenants: {tenants}")
    print(f"   - Service Providers: {service_providers}")
    print(f"   - Sin tipo: {no_type}")
    
    # Verificar si hay usuarios landlord
    if landlords > 0:
        print("\n✅ HAY USUARIOS LANDLORD DISPONIBLES")
        landlord = User.objects.filter(user_type='landlord').first()
        print(f"   - Ejemplo: {landlord.email}")
        return landlord
    else:
        print("\n❌ NO HAY USUARIOS LANDLORD")
        print("🔧 Creando uno...")
        
        # Crear un usuario landlord
        landlord = User.objects.create_user(
            email='landlord_test@verihome.com',
            password='test123',
            first_name='Test',
            last_name='Landlord',
            user_type='landlord'
        )
        
        print(f"✅ Usuario landlord creado: {landlord.email}")
        return landlord

if __name__ == "__main__":
    check_users()