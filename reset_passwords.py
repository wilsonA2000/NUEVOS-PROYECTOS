#!/usr/bin/env python
"""Script para resetear contraseñas de usuarios."""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from users.models import User

def reset_password(email, new_password):
    """Resetear la contraseña de un usuario."""
    print(f"\n=== Reseteando contraseña para: {email} ===")
    
    try:
        user = User.objects.get(email=email)
        user.set_password(new_password)
        user.save()
        print(f"[OK] Contraseña actualizada para {email}")
        print(f"Nueva contraseña: {new_password}")
        
    except User.DoesNotExist:
        print(f"[ERROR] Usuario no encontrado: {email}")
    except Exception as e:
        print(f"[ERROR] Error: {str(e)}")

if __name__ == "__main__":
    # Resetear contraseñas
    reset_password("wilsonderecho10@gmail.com", "TestPassword123!")
    reset_password("letefon100@gmail.com", "TestPassword123!")