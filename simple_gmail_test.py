#!/usr/bin/env python
"""
Test simple del envío con Gmail
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

def test_gmail():
    print("PRUEBA DE GMAIL")
    print("=" * 20)
    
    print(f"Backend: {settings.EMAIL_BACKEND}")
    print(f"Usuario: {settings.EMAIL_HOST_USER}")
    
    try:
        result = send_mail(
            'VeriHome - Test',
            'Email de prueba del sistema VeriHome configurado con Gmail.',
            settings.DEFAULT_FROM_EMAIL,
            ['wilsonderecho10@gmail.com'],
            fail_silently=False,
        )
        
        print("OK: Email enviado!")
        print(f"Resultado: {result}")
        print("Revisa tu bandeja de entrada.")
        
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    test_gmail()