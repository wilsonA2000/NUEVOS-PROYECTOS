#!/usr/bin/env python
import os
import sys
import django
from pathlib import Path

# Configurar Django
sys.path.append(str(Path(__file__).resolve().parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress, EmailConfirmation
from allauth.account.utils import send_email_confirmation
from django.db import transaction

User = get_user_model()

def create_test_user():
    """Crear usuario de prueba para leidy"""
    
    print("Creando usuario de prueba para leidy...")
    
    try:
        with transaction.atomic():
            # Crear usuario
            user = User.objects.create_user(
                email='letefon100@gmail.com',
                first_name='Leidy',
                last_name='Test',
                user_type='tenant',  # o el tipo que corresponda
                is_active=True
            )
            user.set_password('password123')  # Password temporal
            user.save()
            
            print(f"Usuario creado: {user.get_full_name()} ({user.email})")
            
            # Crear EmailAddress para allauth
            email_address = EmailAddress.objects.create(
                user=user,
                email=user.email,
                verified=False,
                primary=True
            )
            
            print(f"EmailAddress creado: {email_address.email}")
            
            # Enviar email de confirmación
            print("Enviando email de confirmación...")
            send_email_confirmation(None, user, signup=True, email=email_address.email)
            
            print("Email de confirmación enviado exitosamente!")
            print(f"Revisa la bandeja de entrada de {user.email}")
            
            return user
            
    except Exception as e:
        print(f"Error al crear usuario: {str(e)}")
        return None

def resend_confirmation_email():
    """Reenviar email de confirmación para usuarios existentes sin verificar"""
    
    print("Buscando emails sin verificar...")
    
    unverified_emails = EmailAddress.objects.filter(verified=False)
    
    for email_address in unverified_emails:
        print(f"Reenviando confirmación para: {email_address.email}")
        
        try:
            send_email_confirmation(None, email_address.user, signup=False, email=email_address.email)
            print(f"Email reenviado exitosamente a {email_address.email}")
        except Exception as e:
            print(f"Error al reenviar a {email_address.email}: {str(e)}")

if __name__ == "__main__":
    print("=== PRUEBA DE REGISTRO Y EMAIL DE CONFIRMACIÓN ===")
    
    # Verificar si el usuario ya existe
    try:
        existing_user = User.objects.get(email='letefon100@gmail.com')
        print(f"Usuario ya existe: {existing_user.get_full_name()}")
        
        # Verificar estado de verificación
        email_address = EmailAddress.objects.filter(user=existing_user).first()
        if email_address and not email_address.verified:
            print("Email no verificado. Reenviando confirmación...")
            send_email_confirmation(None, existing_user, signup=False, email=email_address.email)
            print("Email de confirmación reenviado!")
        else:
            print("Email ya verificado o no tiene EmailAddress.")
            
    except User.DoesNotExist:
        print("Usuario no existe. Creando nuevo usuario...")
        create_test_user()
    
    print("\n=== CONFIGURACIÓN DE EMAIL ===")
    from django.conf import settings
    print(f"Host: {settings.EMAIL_HOST}")
    print(f"Usuario: {settings.EMAIL_HOST_USER}")
    print(f"Desde: {settings.DEFAULT_FROM_EMAIL}")
    
    print("\n=== PROCESO COMPLETADO ===")
    print("Si no recibes el email, verifica:")
    print("1. Carpeta de spam/promociones")
    print("2. Que la API key de Gmail esté correcta")
    print("3. Que la cuenta de Gmail permita aplicaciones menos seguras")