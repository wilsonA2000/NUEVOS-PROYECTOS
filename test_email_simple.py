#!/usr/bin/env python
import os
import sys
import django
from pathlib import Path

# Configurar Django
sys.path.append(str(Path(__file__).resolve().parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

def test_email():
    print("Probando configuracion de email...")
    print(f"Host: {settings.EMAIL_HOST}")
    print(f"Usuario: {settings.EMAIL_HOST_USER}")
    print(f"Password configurado: {'Si' if settings.EMAIL_HOST_PASSWORD else 'No'}")
    
    try:
        send_mail(
            subject='[VeriHome] Prueba de Email',
            message='Este es un email de prueba para verificar la configuracion.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['letefon100@gmail.com'],
            fail_silently=False,
        )
        print("Email enviado exitosamente!")
        return True
    except Exception as e:
        print(f"Error al enviar email: {str(e)}")
        return False

if __name__ == "__main__":
    test_email()