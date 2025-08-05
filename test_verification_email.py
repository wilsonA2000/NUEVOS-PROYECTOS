#!/usr/bin/env python
"""
Test del email de verificacion para usuarios nuevos
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

User = get_user_model()

def test_verification_email():
    print("PRUEBA DE EMAIL DE VERIFICACION")
    print("=" * 40)
    
    # Buscar usuarios sin verificar
    unverified_users = User.objects.exclude(
        emailaddress__verified=True
    ).distinct()
    
    print(f"Usuarios sin verificar encontrados: {unverified_users.count()}")
    
    if unverified_users.exists():
        user = unverified_users.first()
        print(f"Probando con usuario: {user.email}")
        
        try:
            # Enviar email de confirmación
            send_email_confirmation(request=None, user=user, signup=True)
            print("OK: Email de verificacion enviado")
            
            if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
                print("NOTA: Email mostrado en consola (modo desarrollo)")
                print("Para envío real, configura EMAIL_HOST_PASSWORD en settings.py")
            
        except Exception as e:
            print(f"ERROR enviando email: {e}")
    else:
        print("INFO: No hay usuarios sin verificar")
        
        # Mostrar estado de usuarios
        print("\nEstado de usuarios:")
        for user in User.objects.all()[:5]:
            email_addr = EmailAddress.objects.filter(user=user, primary=True).first()
            verified = email_addr.verified if email_addr else False
            print(f"- {user.email}: {'Verificado' if verified else 'Sin verificar'}")

def create_test_user():
    """Crear usuario de prueba para testing"""
    print("\nCreando usuario de prueba...")
    
    test_email = "test-verihome@example.com"
    
    # Verificar si ya existe
    if User.objects.filter(email=test_email).exists():
        print(f"Usuario {test_email} ya existe")
        return User.objects.get(email=test_email)
    
    # Crear nuevo usuario
    user = User.objects.create_user(
        email=test_email,
        password='testpass123',
        first_name='Usuario',
        last_name='Prueba'
    )
    
    # Crear EmailAddress sin verificar
    EmailAddress.objects.create(
        user=user,
        email=test_email,
        primary=True,
        verified=False
    )
    
    print(f"Usuario creado: {test_email}")
    return user

if __name__ == "__main__":
    test_verification_email()
    
    # Si no hay usuarios sin verificar, crear uno de prueba
    unverified = User.objects.exclude(emailaddress__verified=True).distinct()
    if not unverified.exists():
        test_user = create_test_user()
        print("\nProbando con usuario recién creado...")
        try:
            send_email_confirmation(request=None, user=test_user, signup=True)
            print("OK: Email de verificacion enviado para usuario de prueba")
        except Exception as e:
            print(f"ERROR: {e}")