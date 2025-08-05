#!/usr/bin/env python3
"""
Script para crear un usuario de prueba
"""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from users.models import User
from django.contrib.auth.hashers import make_password

def create_test_user():
    """Crear un usuario de prueba"""
    
    email = "test@example.com"
    password = "testpass123"
    
    # Verificar si el usuario ya existe
    if User.objects.filter(email=email).exists():
        print(f"✅ Usuario {email} ya existe")
        return True
    
    # Crear el usuario
    try:
        user = User.objects.create(
            email=email,
            password=make_password(password),
            first_name="Usuario",
            last_name="Prueba",
            is_active=True,
            is_staff=False,
            is_superuser=False
        )
        print(f"✅ Usuario creado exitosamente: {email}")
        print(f"   Contraseña: {password}")
        return True
    except Exception as e:
        print(f"❌ Error creando usuario: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Creando usuario de prueba...")
    success = create_test_user()
    
    if success:
        print("✅ Usuario de prueba listo para usar")
    else:
        print("❌ No se pudo crear el usuario de prueba") 