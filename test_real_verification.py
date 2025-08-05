#!/usr/bin/env python
"""
Test del email de verificación real
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress
from allauth.account.utils import send_email_confirmation
from django.conf import settings
from django.test import RequestFactory

User = get_user_model()

def test_verification():
    print("PRUEBA EMAIL VERIFICACION REAL")
    print("=" * 30)
    
    # Buscar usuario sin verificar
    unverified_users = User.objects.exclude(
        emailaddress__verified=True
    ).distinct()
    
    if unverified_users.exists():
        user = unverified_users.first()
        print(f"Usuario: {user.email}")
        
        # Crear un request mock
        factory = RequestFactory()
        request = factory.get('/')
        request.user = user
        
        try:
            send_email_confirmation(request, user, signup=True)
            print("OK: Email de verificacion enviado!")
            print(f"Revisa: {user.email}")
            print("El email incluye el template profesional de VeriHome")
            
        except Exception as e:
            print(f"ERROR: {e}")
    else:
        print("No hay usuarios sin verificar")

if __name__ == "__main__":
    test_verification()