#!/usr/bin/env python
"""Script para crear perfiles faltantes de usuarios existentes."""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from users.models import User, LandlordProfile, TenantProfile, ServiceProviderProfile, UserSettings


def create_missing_profiles():
    """Crear perfiles faltantes para usuarios existentes."""
    users = User.objects.all()
    
    for user in users:
        print(f"\n=== Procesando usuario: {user.email} ({user.user_type}) ===")
        
        # Crear configuración si no existe
        settings, created = UserSettings.objects.get_or_create(user=user)
        if created:
            print("[OK] UserSettings creado")
        else:
            print("[INFO] UserSettings ya existe")
        
        # Crear perfil según tipo de usuario
        if user.user_type == 'landlord':
            profile, created = LandlordProfile.objects.get_or_create(
                user=user,
                defaults={
                    'bio': f'Soy {user.get_full_name()}, un arrendador en VeriHome.',
                }
            )
            if created:
                print("[OK] LandlordProfile creado")
            else:
                print("[INFO] LandlordProfile ya existe")
                
        elif user.user_type == 'tenant':
            profile, created = TenantProfile.objects.get_or_create(
                user=user,
                defaults={
                    'bio': f'Soy {user.get_full_name()}, busco propiedades en VeriHome.',
                }
            )
            if created:
                print("[OK] TenantProfile creado")
            else:
                print("[INFO] TenantProfile ya existe")
                
        elif user.user_type == 'service_provider':
            profile, created = ServiceProviderProfile.objects.get_or_create(
                user=user,
                defaults={
                    'business_name': f'{user.get_full_name()} Services',
                    'bio': f'Proveedor de servicios profesionales en VeriHome.',
                    'experience_years': 1,
                }
            )
            if created:
                print("[OK] ServiceProviderProfile creado")
            else:
                print("[INFO] ServiceProviderProfile ya existe")


if __name__ == "__main__":
    create_missing_profiles()
    print("\n[COMPLETADO] Proceso de creación de perfiles terminado.")