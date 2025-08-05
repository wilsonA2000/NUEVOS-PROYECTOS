#!/usr/bin/env python
"""
Test simple del sistema de correos
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
from users.models import User

def test_email():
    print("VERIHOME - PRUEBA DE CORREOS")
    print("=" * 40)
    
    print(f"Backend de email: {settings.EMAIL_BACKEND}")
    print(f"Desde: {settings.DEFAULT_FROM_EMAIL}")
    print(f"Debug mode: {settings.DEBUG}")
    
    # Verificar usuarios recientes
    recent_users = User.objects.order_by('-date_joined')[:3]
    print(f"\nUsuarios recientes ({len(recent_users)}):")
    for user in recent_users:
        print(f"- {user.email}")
    
    # Probar envío
    try:
        print("\nEnviando email de prueba...")
        
        send_mail(
            'Prueba VeriHome',
            'Email de prueba del sistema VeriHome.',
            settings.DEFAULT_FROM_EMAIL,
            ['test@example.com'],
            fail_silently=False,
        )
        print("OK: Email enviado exitosamente")
        
        if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
            print("NOTA: En modo desarrollo - email mostrado en consola")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    test_email()