#!/usr/bin/env python
"""Script para verificar emails de usuarios existentes."""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from allauth.account.models import EmailAddress
from users.models import User

def verify_user_email(email):
    """Verificar el email de un usuario."""
    print(f"\n=== Verificando email: {email} ===")
    
    try:
        user = User.objects.get(email=email)
        print(f"[OK] Usuario encontrado: {user.email}")
        
        # Buscar o crear EmailAddress
        email_address, created = EmailAddress.objects.get_or_create(
            user=user,
            email=user.email,
            defaults={'primary': True, 'verified': False}
        )
        
        if email_address.verified:
            print(f"[INFO] El email ya está verificado")
        else:
            email_address.verified = True
            email_address.save()
            print(f"[OK] Email marcado como verificado")
            
        # También actualizar el campo is_verified del usuario
        if not user.is_verified:
            user.is_verified = True
            user.save()
            print(f"[OK] Usuario marcado como verificado")
            
    except User.DoesNotExist:
        print(f"[ERROR] Usuario no encontrado: {email}")
    except Exception as e:
        print(f"[ERROR] Error: {str(e)}")

if __name__ == "__main__":
    # Verificar ambos usuarios
    verify_user_email("wilsonderecho10@gmail.com")
    verify_user_email("letefon100@gmail.com")