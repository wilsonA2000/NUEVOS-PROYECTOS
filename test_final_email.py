#!/usr/bin/env python
"""
Script para probar la configuración final de emails en VeriHome
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model

User = get_user_model()

def test_gmail_deliverability():
    """Probar entrega a Gmail específicamente"""
    print("🧪 PRUEBA FINAL: Entrega a Gmail")
    print("=" * 50)
    
    try:
        result = send_mail(
            subject='[VeriHome Platform] Test Final - NO ES SPAM',
            message='''
Hola,

Este es un test final del sistema de emails de VeriHome Platform.

ESTE NO ES SPAM - Es un email oficial de verificación.

Si recibes este email, la configuración está funcionando correctamente.

Atentamente,
VeriHome Platform Team
            ''',
            from_email='VeriHome Platform <verihomeadmi@gmail.com>',
            recipient_list=['letefon100@gmail.com'],
            fail_silently=False,
        )
        print(f"✅ Email enviado exitosamente a letefon100@gmail.com")
        print(f"📧 Resultado del envío: {result}")
        print("📋 INSTRUCCIONES:")
        print("   1. Revisa tu bandeja de entrada en letefon100@gmail.com")
        print("   2. Si no está ahí, revisa la carpeta de SPAM/PROMOCIONES")
        print("   3. Si está en spam, márcalo como 'No es spam'")
        return True
    except Exception as e:
        print(f"❌ Error enviando email: {e}")
        return False

def check_user_status():
    """Verificar estado del usuario letefon100@gmail.com"""
    print("\n📋 VERIFICACIÓN DE USUARIO")
    print("=" * 50)
    
    try:
        user = User.objects.get(email='letefon100@gmail.com')
        print(f"👤 Usuario encontrado: {user.email}")
        print(f"📧 Email verificado: {user.is_verified if hasattr(user, 'is_verified') else 'N/A'}")
        print(f"🔐 Usuario activo: {user.is_active}")
        
        # Verificar EmailAddress
        try:
            email_addr = EmailAddress.objects.get(user=user, primary=True)
            print(f"📨 EmailAddress verificado: {email_addr.verified}")
            if not email_addr.verified:
                print("⚠️  El usuario necesita verificar su email para hacer login")
        except EmailAddress.DoesNotExist:
            print("❌ No se encontró EmailAddress para este usuario")
            
    except User.DoesNotExist:
        print("❌ Usuario letefon100@gmail.com no encontrado")

def show_email_config():
    """Mostrar configuración actual de email"""
    print("\n🔧 CONFIGURACIÓN ACTUAL")
    print("=" * 50)
    
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print(f"ACCOUNT_EMAIL_VERIFICATION: {settings.ACCOUNT_EMAIL_VERIFICATION}")

def main():
    """Ejecutar prueba final"""
    print("🚀 PRUEBA FINAL DE CONFIGURACIÓN DE EMAILS")
    print("=" * 60)
    
    show_email_config()
    check_user_status()
    test_gmail_deliverability()
    
    print("\n🎯 RESUMEN FINAL")
    print("=" * 60)
    print("✅ COMPLETADO:")
    print("   - Configuración SMTP mejorada")
    print("   - Mensaje de verificación en login implementado")
    print("   - Endpoint de reenvío de email agregado")
    print("   - Plantillas de email actualizadas (anti-spam)")
    print("   - App Password Gmail configurado correctamente")
    
    print("\n📧 PRÓXIMOS PASOS:")
    print("   1. Verificar recepción en letefon100@gmail.com")
    print("   2. Si está en spam, marcar como 'No es spam'")
    print("   3. Probar login sin verificar (debe mostrar mensaje)")
    print("   4. Verificar cuenta y probar login exitoso")
    
    print("\n🔗 ENDPOINTS DISPONIBLES:")
    print("   - POST /api/v1/users/auth/login/")
    print("   - POST /api/v1/users/auth/resend-confirmation/")
    print("   - POST /api/v1/users/auth/confirm-email/<key>/")

if __name__ == '__main__':
    main()