#!/usr/bin/env python
"""
Script para probar el envío de emails de verificación en VeriHome
"""
import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.core.mail import send_mail, EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
from allauth.account.models import EmailAddress
from allauth.account.utils import send_email_confirmation
from django.contrib.auth import get_user_model
from django.http import HttpRequest
from django.contrib.sites.models import Site

User = get_user_model()

def test_basic_email():
    """Prueba básica de envío de email"""
    print("🧪 PRUEBA 1: Envío básico de email")
    print("=" * 50)
    
    try:
        result = send_mail(
            subject='Test Email - VeriHome',
            message='Este es un email de prueba desde VeriHome.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['wilsonarguellosv@gmail.com'],  # Cambiar por tu email
            fail_silently=False,
        )
        print(f"✅ Email básico enviado exitosamente. Resultado: {result}")
        return True
    except Exception as e:
        print(f"❌ Error enviando email básico: {e}")
        return False

def test_email_template():
    """Prueba de email con plantilla"""
    print("\n🧪 PRUEBA 2: Email con plantilla HTML")
    print("=" * 50)
    
    try:
        # Renderizar plantilla de confirmación
        context = {
            'user': {'first_name': 'Test', 'email': 'test@example.com'},
            'activate_url': 'http://localhost:3000/confirm-email/test-key-123',
            'current_site': {'name': 'VeriHome', 'domain': 'localhost:8000'},
            'key': 'test-key-123'
        }
        
        html_content = render_to_string('account/email/email_confirmation_message.html', context)
        text_content = render_to_string('account/email/email_confirmation_message.txt', context)
        
        email = EmailMessage(
            subject='[VeriHome] Confirmación de Email - Prueba',
            body=html_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=['wilsonarguellosv@gmail.com'],  # Cambiar por tu email
        )
        email.content_subtype = 'html'
        
        result = email.send()
        print(f"✅ Email con plantilla enviado exitosamente. Resultado: {result}")
        return True
    except Exception as e:
        print(f"❌ Error enviando email con plantilla: {e}")
        return False

def test_allauth_email_confirmation():
    """Prueba de confirmación de email con allauth"""
    print("\n🧪 PRUEBA 3: Confirmación de email con allauth")
    print("=" * 50)
    
    try:
        # Buscar un usuario existente para testing
        user = User.objects.filter(email__isnull=False).first()
        if not user:
            print("❌ No se encontró usuario para prueba")
            return False
        
        print(f"📧 Enviando confirmación a: {user.email}")
        
        # Crear un request simulado
        request = HttpRequest()
        request.META['HTTP_HOST'] = 'localhost:8000'
        request.META['SERVER_NAME'] = 'localhost'
        request.META['SERVER_PORT'] = '8000'
        request.is_secure = lambda: False
        
        # Enviar confirmación
        send_email_confirmation(request, user, signup=True)
        
        print("✅ Email de confirmación enviado exitosamente")
        return True
    except Exception as e:
        print(f"❌ Error enviando confirmación con allauth: {e}")
        return False

def check_email_settings():
    """Verificar configuración de email"""
    print("\n🔧 VERIFICACIÓN DE CONFIGURACIÓN")
    print("=" * 50)
    
    print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_USE_SSL: {settings.EMAIL_USE_SSL}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"EMAIL_HOST_PASSWORD: {'*' * len(settings.EMAIL_HOST_PASSWORD) if settings.EMAIL_HOST_PASSWORD else 'NO CONFIGURADO'}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    
    # Verificar allauth
    print(f"\nACCOUNT_EMAIL_VERIFICATION: {settings.ACCOUNT_EMAIL_VERIFICATION}")
    print(f"ACCOUNT_EMAIL_REQUIRED: {settings.ACCOUNT_EMAIL_REQUIRED}")
    print(f"ACCOUNT_ADAPTER: {settings.ACCOUNT_ADAPTER}")

def check_email_addresses():
    """Verificar EmailAddress existentes"""
    print("\n📋 VERIFICACIÓN DE EMAIL ADDRESSES")
    print("=" * 50)
    
    email_addresses = EmailAddress.objects.all()
    print(f"Total EmailAddress registrados: {email_addresses.count()}")
    
    for email_addr in email_addresses[:5]:  # Mostrar solo 5
        print(f"  📧 {email_addr.email} - Verificado: {email_addr.verified} - Usuario: {email_addr.user.email}")

def main():
    """Ejecutar todas las pruebas"""
    print("🚀 INICIANDO PRUEBAS DE EMAIL - VERIHOME")
    print("=" * 60)
    
    # Verificar configuración
    check_email_settings()
    
    # Verificar EmailAddress
    check_email_addresses()
    
    # Ejecutar pruebas
    test_basic_email()
    test_email_template()
    test_allauth_email_confirmation()
    
    print("\n🎉 PRUEBAS COMPLETADAS")
    print("=" * 60)
    print("📝 NOTAS:")
    print("- Si todas las pruebas pasan, el problema puede estar en:")
    print("  * Filtros de spam del email destino")
    print("  * Configuración de Gmail App Password")
    print("  * Firewall o antivirus bloqueando SMTP")
    print("- Revisa la carpeta de spam en tu email")
    print("- Verifica que verihomeadmi@gmail.com tenga 2FA activado")

if __name__ == '__main__':
    main()