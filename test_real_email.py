#!/usr/bin/env python
"""
Test del envío real de emails con Gmail
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

def test_gmail_connection():
    print("PRUEBA DE ENVIO REAL CON GMAIL")
    print("=" * 40)
    
    print(f"Backend: {settings.EMAIL_BACKEND}")
    print(f"Host: {settings.EMAIL_HOST}")
    print(f"Puerto: {settings.EMAIL_PORT}")
    print(f"Usuario: {settings.EMAIL_HOST_USER}")
    print(f"TLS: {settings.EMAIL_USE_TLS}")
    
    # Email de prueba
    test_email = "wilsonderecho10@gmail.com"  # Email real del usuario
    
    print(f"\nEnviando email de prueba a: {test_email}")
    
    try:
        result = send_mail(
            subject='Prueba VeriHome - Sistema Configurado',
            message=(
                'Hola!\n\n'
                'Este es un email de prueba para confirmar que el sistema '
                'de correos de VeriHome está funcionando correctamente.\n\n'
                'Si recibes este mensaje, significa que:\n'
                '✓ La configuración de Gmail está correcta\n'
                '✓ Los emails de verificación funcionarán\n'
                '✓ Los usuarios recibirán sus confirmaciones\n\n'
                'Saludos,\n'
                'Equipo VeriHome'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[test_email],
            fail_silently=False,
        )
        
        print(f"✓ Email enviado exitosamente!")
        print(f"Resultado: {result}")
        print(f"\nRevisa la bandeja de entrada de {test_email}")
        print("Si no está en la bandeja principal, revisa spam/promociones")
        
        return True
        
    except Exception as e:
        print(f"✗ Error enviando email: {e}")
        print("\nPosibles causas:")
        print("- Contraseña de aplicación incorrecta")
        print("- Verificación en 2 pasos no habilitada")
        print("- Problemas de conectividad")
        return False

if __name__ == "__main__":
    test_gmail_connection()