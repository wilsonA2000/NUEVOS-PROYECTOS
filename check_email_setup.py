#!/usr/bin/env python
"""Script para verificar la configuración de emails."""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from allauth.account.models import EmailAddress, EmailConfirmation
from users.models import User

def check_user_email_setup(email):
    """Verificar la configuración de email para un usuario."""
    print(f"\n=== Verificando configuración de email para: {email} ===\n")
    
    try:
        user = User.objects.get(email=email)
        print(f"[OK] Usuario encontrado: {user.email}")
        print(f"  - ID: {user.id}")
        print(f"  - Tipo: {user.user_type}")
        print(f"  - Verificado: {user.is_verified}")
        
        # Verificar EmailAddress
        email_addresses = EmailAddress.objects.filter(user=user)
        if email_addresses.exists():
            print(f"\n[OK] EmailAddress encontrados: {email_addresses.count()}")
            for ea in email_addresses:
                print(f"  - Email: {ea.email}")
                print(f"  - Primario: {ea.primary}")
                print(f"  - Verificado: {ea.verified}")
        else:
            print("\n[ERROR] No se encontraron EmailAddress")
            
        # Verificar EmailConfirmation
        confirmations = EmailConfirmation.objects.filter(email_address__user=user)
        if confirmations.exists():
            print(f"\n[OK] EmailConfirmation encontrados: {confirmations.count()}")
            for conf in confirmations:
                print(f"  - Key: {conf.key}")
                print(f"  - Creado: {conf.created}")
                print(f"  - Enviado: {conf.sent}")
                print(f"  - Expirado: {conf.key_expired()}")
        else:
            print("\n[ERROR] No se encontraron EmailConfirmation")
            
    except User.DoesNotExist:
        print(f"[ERROR] Usuario no encontrado: {email}")
        
    print("\n" + "="*50 + "\n")

if __name__ == "__main__":
    # Verificar el usuario existente
    check_user_email_setup("wilsonderecho10@gmail.com")
    
    # También verificar si hay registros para el usuario que intentó registrarse
    check_user_email_setup("letefon100@gmail.com")