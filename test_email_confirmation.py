#!/usr/bin/env python
"""
Script para diagnosticar y probar el envío de correos de confirmación de VeriHome.
"""

import os
import sys
import django
from datetime import datetime

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from allauth.account.models import EmailAddress, EmailConfirmation
from allauth.account.utils import send_email_confirmation
from django.test import RequestFactory
from django.core import mail
from django.conf import settings

User = get_user_model()

def test_email_configuration():
    """Probar la configuración de email."""
    print("🔧 Probando configuración de email...")
    
    # Verificar configuración
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_PORT: {settings.EMAIL_PORT}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
    print(f"EMAIL_USE_SSL: {settings.EMAIL_USE_SSL}")
    
    # Verificar configuración de allauth
    print(f"ACCOUNT_EMAIL_VERIFICATION: {settings.ACCOUNT_EMAIL_VERIFICATION}")
    print(f"ACCOUNT_EMAIL_REQUIRED: {settings.ACCOUNT_EMAIL_REQUIRED}")
    print(f"ACCOUNT_ADAPTER: {settings.ACCOUNT_ADAPTER}")
    
    return True

def test_smtp_connection():
    """Probar conexión SMTP."""
    print("\n🔌 Probando conexión SMTP...")
    
    try:
        from django.core.mail import get_connection
        connection = get_connection()
        connection.open()
        print("✅ Conexión SMTP exitosa")
        connection.close()
        return True
    except Exception as e:
        print(f"❌ Error en conexión SMTP: {e}")
        return False

def create_test_user():
    """Crear usuario de prueba."""
    print("\n👤 Creando usuario de prueba...")
    
    email = "letefon100@gmail.com"
    
    # Eliminar usuario si existe
    try:
        user = User.objects.get(email=email)
        user.delete()
        print("🗑️ Usuario existente eliminado")
    except User.DoesNotExist:
        pass
    
    # Crear nuevo usuario (sin username ya que el modelo no lo tiene)
    user = User.objects.create_user(
        email=email,
        password="testpass123",
        first_name="Usuario",
        last_name="Prueba",
        user_type="tenant"  # Campo requerido
    )
    
    print(f"✅ Usuario creado: {user.email} ({user.get_full_name()})")
    return user

def test_email_confirmation_sending():
    """Probar envío de correo de confirmación."""
    print("\n📧 Probando envío de correo de confirmación...")
    
    # Crear usuario de prueba
    user = create_test_user()
    
    # Crear request factory
    factory = RequestFactory()
    request = factory.get('/')
    
    # Configurar sitio
    site = Site.objects.get_current()
    print(f"🌐 Sitio actual: {site.name} ({site.domain})")
    
    # Limpiar bandeja de salida
    mail.outbox.clear()
    
    try:
        # Enviar correo de confirmación
        send_email_confirmation(request, user, signup=True)
        
        # Verificar que se envió el correo
        if len(mail.outbox) > 0:
            email = mail.outbox[0]
            print(f"✅ Correo enviado exitosamente")
            print(f"   De: {email.from_email}")
            print(f"   Para: {email.to}")
            print(f"   Asunto: {email.subject}")
            print(f"   Contenido HTML: {'Sí' if hasattr(email, 'alternatives') and email.alternatives else 'No'}")
            
            # Verificar EmailAddress
            try:
                email_address = EmailAddress.objects.get(user=user, email=user.email)
                print(f"✅ EmailAddress creado: {email_address.email} (verificado: {email_address.verified})")
                
                # Verificar EmailConfirmation
                confirmations = EmailConfirmation.objects.filter(email_address=email_address)
                if confirmations.exists():
                    confirmation = confirmations.first()
                    print(f"✅ EmailConfirmation creado: {confirmation.key}")
                    print(f"   Enviado: {confirmation.sent}")
                    print(f"   Expira: {confirmation.sent + django.utils.timezone.timedelta(days=settings.ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS)}")
                else:
                    print("❌ No se encontró EmailConfirmation")
                    
            except EmailAddress.DoesNotExist:
                print("❌ No se encontró EmailAddress")
                
        else:
            print("❌ No se envió ningún correo")
            return False
            
    except Exception as e:
        print(f"❌ Error al enviar correo de confirmación: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def test_email_templates():
    """Verificar que las plantillas de email existen."""
    print("\n📄 Verificando plantillas de email...")
    
    from django.template.loader import get_template
    from django.template import TemplateDoesNotExist
    
    templates_to_check = [
        'account/email/email_confirmation_signup_message.html',
        'account/email/email_confirmation_signup_message.txt',
        'account/email/email_confirmation_message.html',
        'account/email/email_confirmation_message.txt',
    ]
    
    for template_name in templates_to_check:
        try:
            template = get_template(template_name)
            print(f"✅ {template_name}")
        except TemplateDoesNotExist:
            print(f"❌ {template_name} - NO ENCONTRADO")
    
    return True

def cleanup_test_user():
    """Limpiar usuario de prueba."""
    print("\n🧹 Limpiando usuario de prueba...")
    
    try:
        user = User.objects.get(email="letefon100@gmail.com")
        user.delete()
        print("✅ Usuario de prueba eliminado")
    except User.DoesNotExist:
        print("ℹ️ Usuario de prueba no encontrado")

def main():
    """Función principal."""
    print("🚀 Iniciando diagnóstico de correos de confirmación de VeriHome")
    print("=" * 60)
    
    # Ejecutar pruebas
    tests = [
        ("Configuración de email", test_email_configuration),
        ("Conexión SMTP", test_smtp_connection),
        ("Plantillas de email", test_email_templates),
        ("Envío de correo de confirmación", test_email_confirmation_sending),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Error en {test_name}: {e}")
            results.append((test_name, False))
    
    # Limpiar
    cleanup_test_user()
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE PRUEBAS")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASÓ" if result else "❌ FALLÓ"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nResultado: {passed}/{total} pruebas pasaron")
    
    if passed == total:
        print("🎉 ¡Todas las pruebas pasaron! El sistema de correos está funcionando correctamente.")
    else:
        print("⚠️ Algunas pruebas fallaron. Revisa los errores arriba.")
    
    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 