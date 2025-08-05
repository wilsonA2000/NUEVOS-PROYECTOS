#!/usr/bin/env python
"""
Script para verificar y arreglar el estado de verificación de email del usuario admin
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress

User = get_user_model()

def fix_admin_email():
    try:
        # Buscar el usuario admin
        user = User.objects.get(email='admin@verihome.com')
        print(f'✓ Usuario encontrado: {user.email}')
        print(f'  - is_active: {user.is_active}')
        print(f'  - is_verified: {getattr(user, "is_verified", "N/A")}')
        
        # Verificar EmailAddress
        try:
            email_addr = EmailAddress.objects.get(user=user, primary=True)
            print(f'  - Email verificado: {email_addr.verified}')
            
            if not email_addr.verified:
                email_addr.verified = True
                email_addr.save()
                print('✓ Email marcado como verificado')
                
        except EmailAddress.DoesNotExist:
            print('! No hay EmailAddress configurado, creando...')
            EmailAddress.objects.create(
                user=user, 
                email=user.email, 
                verified=True, 
                primary=True
            )
            print('✓ EmailAddress creado y verificado')
        
        # Asegurar que el usuario esté activo
        if not user.is_active:
            user.is_active = True
            user.save()
            print('✓ Usuario activado')
        
        # Asegurar que is_verified esté en True si existe
        if hasattr(user, 'is_verified') and not user.is_verified:
            user.is_verified = True
            user.save()
            print('✓ Usuario marcado como verificado')
            
        print('\n🎉 ¡Usuario admin configurado correctamente!')
        print('Ahora puedes usar:')
        print('  Email: admin@verihome.com')
        print('  Password: admin123')
        
    except User.DoesNotExist:
        print('❌ Usuario admin@verihome.com no encontrado')
        print('Creando usuario admin...')
        
        user = User.objects.create_user(
            email='admin@verihome.com',
            password='admin123',
            first_name='Admin',
            last_name='VeriHome',
            is_active=True,
            is_staff=True,
            is_superuser=True
        )
        
        # Crear EmailAddress verificado
        EmailAddress.objects.create(
            user=user, 
            email=user.email, 
            verified=True, 
            primary=True
        )
        
        # Marcar como verificado si el campo existe
        if hasattr(user, 'is_verified'):
            user.is_verified = True
            user.save()
        
        print('✓ Usuario admin creado y configurado')

if __name__ == '__main__':
    fix_admin_email()