#!/usr/bin/env python
"""
Script para probar el sistema de correos de VeriHome
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
from allauth.account.models import EmailConfirmation
from allauth.account.utils import send_email_confirmation

def test_basic_email():
    """Prueba envío básico de email"""
    print("🧪 Probando envío básico de email...")
    print(f"📧 Backend de email: {settings.EMAIL_BACKEND}")
    print(f"📮 Desde: {settings.DEFAULT_FROM_EMAIL}")
    
    try:
        send_mail(
            'Prueba de VeriHome - Sistema de Correos',
            'Este es un email de prueba para verificar que el sistema de correos funciona correctamente.',
            settings.DEFAULT_FROM_EMAIL,
            ['test@example.com'],  # Email de prueba
            fail_silently=False,
        )
        print("✅ Email básico enviado exitosamente")
        return True
    except Exception as e:
        print(f"❌ Error enviando email básico: {e}")
        return False

def test_verification_email():
    """Prueba envío de email de verificación"""
    print("\n🧪 Probando email de verificación de cuenta...")
    
    try:
        # Buscar un usuario reciente sin verificar
        unverified_users = User.objects.filter(emailaddress__verified=False)
        
        if unverified_users.exists():
            user = unverified_users.first()
            print(f"👤 Usuario de prueba: {user.email}")
            
            # Enviar email de confirmación
            send_email_confirmation(None, user, signup=True)
            print("✅ Email de verificación enviado exitosamente")
            return True
        else:
            print("ℹ️ No hay usuarios sin verificar para probar")
            return True
            
    except Exception as e:
        print(f"❌ Error enviando email de verificación: {e}")
        return False

def show_email_templates():
    """Muestra información sobre los templates de email"""
    print("\n📋 Templates de email disponibles:")
    
    templates = [
        "templates/account/email/email_confirmation_signup_message.html",
        "templates/account/email/email_confirmation_signup_message.txt", 
        "templates/account/email/email_confirmation_subject.txt"
    ]
    
    for template in templates:
        template_path = f"/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS/{template}"
        if os.path.exists(template_path):
            print(f"✅ {template}")
        else:
            print(f"❌ {template} - NO ENCONTRADO")

def show_recent_users():
    """Muestra usuarios recientes para debugging"""
    print("\n👥 Usuarios recientes (últimos 5):")
    recent_users = User.objects.order_by('-date_joined')[:5]
    
    for user in recent_users:
        verified = hasattr(user, 'emailaddress_set') and user.emailaddress_set.filter(verified=True).exists()
        print(f"📧 {user.email} - Verificado: {'✅' if verified else '❌'}")

def main():
    print("=" * 60)
    print("🏠 VERIHOME - SISTEMA DE PRUEBA DE CORREOS")
    print("=" * 60)
    
    # Mostrar configuración
    print(f"🔧 Configuración actual:")
    print(f"   Backend: {settings.EMAIL_BACKEND}")
    print(f"   Host: {getattr(settings, 'EMAIL_HOST', 'No configurado')}")
    print(f"   Puerto: {getattr(settings, 'EMAIL_PORT', 'No configurado')}")
    print(f"   Usuario: {getattr(settings, 'EMAIL_HOST_USER', 'No configurado')}")
    print(f"   Debug Mode: {settings.DEBUG}")
    
    # Mostrar templates
    show_email_templates()
    
    # Mostrar usuarios recientes
    show_recent_users()
    
    # Probar emails
    success_basic = test_basic_email()
    success_verification = test_verification_email()
    
    print("\n" + "=" * 60)
    if success_basic and success_verification:
        print("✅ TODAS LAS PRUEBAS PASARON")
        print("📨 El sistema de correos está funcionando correctamente")
        
        if settings.EMAIL_BACKEND == 'django.core.mail.backends.console.EmailBackend':
            print("\nℹ️ NOTA: Estás en modo desarrollo.")
            print("   Los emails se muestran en la consola en lugar de enviarse.")
            print("   Para envío real, configura EMAIL_HOST_PASSWORD en settings.py")
    else:
        print("❌ ALGUNAS PRUEBAS FALLARON")
        print("🔧 Revisa la configuración de email")
    
    print("=" * 60)

if __name__ == "__main__":
    main()