#!/usr/bin/env python
"""
Crear un código de entrevista simple para pruebas
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from users.models import InterviewCode
from django.contrib.auth import get_user_model

User = get_user_model()

def create_test_code():
    print("CREAR CODIGO DE ENTREVISTA SIMPLE")
    print("=" * 35)
    
    # Buscar o crear usuario admin
    try:
        admin_user = User.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = User.objects.create_superuser(
                email="admin@verihome.com",
                password="admin123",
                first_name="Admin",
                last_name="VeriHome"
            )
    except Exception as e:
        print(f"Error creando admin: {e}")
        return
    
    # Crear código de prueba
    code = InterviewCode.objects.create(
        candidate_name="Usuario PruebaFix",
        candidate_email="testfix@gmail.com",
        created_by=admin_user,
        is_approved=True,
        approved_user_type="tenant",
        status="active"
    )
    
    print(f"Codigo creado: {code.interview_code}")
    print(f"Email: {code.candidate_email}")
    print(f"Estado: {code.status}")
    print(f"Aprobado: {code.is_approved}")
    print("Listo para usar en test_registration_fix.py")

if __name__ == "__main__":
    create_test_code()