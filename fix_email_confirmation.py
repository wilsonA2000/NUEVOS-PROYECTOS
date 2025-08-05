#!/usr/bin/env python
"""
Script para arreglar el envío de emails de confirmación
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings
from allauth.account.models import EmailAddress, EmailConfirmation
from allauth.account.utils import send_email_confirmation
from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from django.contrib.sessions.middleware import SessionMiddleware
from django.contrib.messages.middleware import MessageMiddleware
from django.contrib.messages.storage.fallback import FallbackStorage
from django.test import RequestFactory

User = get_user_model()

def create_proper_request():
    """Crear un request completo con middleware necesario"""
    factory = RequestFactory()
    request = factory.post('/api/v1/users/auth/register/')
    
    # Configurar session
    SessionMiddleware(lambda req: None).process_request(request)
    request.session.save()
    
    # Configurar messages
    MessageMiddleware(lambda req: None).process_request(request)
    request._messages = FallbackStorage(request)
    
    # Configurar HTTP_HOST
    request.META['HTTP_HOST'] = 'localhost:8000'
    request.META['SERVER_NAME'] = 'localhost' 
    request.META['SERVER_PORT'] = '8000'
    request.is_secure = lambda: False
    
    return request

def test_email_confirmation_fixed():
    """Probar el envío de email con request corregido"""
    print("🧪 PROBANDO EMAIL CONFIRMATION CORREGIDO")
    print("=" * 50)
    
    # Crear usuario de prueba
    email_test = "test_fixed@gmail.com"
    
    # Limpiar usuario anterior
    try:
        old_user = User.objects.get(email=email_test)
        EmailAddress.objects.filter(user=old_user).delete()
        EmailConfirmation.objects.filter(email_address__user=old_user).delete()
        old_user.delete()
        print(f"🧹 Usuario anterior eliminado")
    except User.DoesNotExist:
        pass
    
    try:
        # Crear usuario
        user = User.objects.create_user(
            email=email_test,
            password="test123456",
            first_name="Test",
            last_name="Fixed",
            user_type="tenant",
            is_verified=False
        )
        print(f"✅ Usuario creado: {user.email}")
        
        # Crear EmailAddress
        email_address, created = EmailAddress.objects.get_or_create(
            user=user,
            email=user.email,
            defaults={'primary': True, 'verified': False}
        )
        print(f"✅ EmailAddress creado: {email_address.email}")
        
        # Configurar site correctamente
        site, created = Site.objects.get_or_create(
            id=1,
            defaults={'domain': 'localhost:8000', 'name': 'VeriHome'}
        )
        print(f"✅ Site configurado: {site.domain}")
        
        # Crear request completo
        request = create_proper_request()
        print("✅ Request con middleware configurado")
        
        # Enviar email de confirmación
        print("\n📬 Enviando email de confirmación...")
        send_email_confirmation(request, user, signup=True)
        print("✅ send_email_confirmation ejecutado exitosamente")
        
        # Verificar confirmaciones creadas
        confirmations = EmailConfirmation.objects.filter(email_address=email_address)
        print(f"📋 Confirmaciones creadas: {confirmations.count()}")
        
        for conf in confirmations:
            print(f"   🔑 Key: {conf.key}")
            print(f"   📧 Email: {conf.email_address.email}")
            print(f"   📅 Creado: {conf.created}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_direct_email_send():
    """Probar envío directo de email"""
    print("\n📤 PROBANDO ENVÍO DIRECTO")
    print("=" * 50)
    
    try:
        result = send_mail(
            subject='[VeriHome] Test de Envío Directo - Registro',
            message='''
Hola,

Este es un test de envío directo durante el proceso de registro.

Si recibes este email, significa que la configuración SMTP funciona correctamente.

El problema puede estar en el proceso de django-allauth.

Atentamente,
VeriHome Platform
            ''',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=['test_fixed@gmail.com'],
            fail_silently=False,
        )
        print(f"✅ Email directo enviado exitosamente: {result}")
        return True
    except Exception as e:
        print(f"❌ Error en envío directo: {e}")
        return False

def main():
    """Ejecutar pruebas de corrección"""
    print("🔧 ARREGLANDO SISTEMA DE EMAIL CONFIRMATION")
    print("=" * 60)
    
    # Verificar configuración
    print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
    print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
    print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
    print(f"ACCOUNT_EMAIL_VERIFICATION: {settings.ACCOUNT_EMAIL_VERIFICATION}")
    
    # Probar envío directo
    direct_success = test_direct_email_send()
    
    # Probar email confirmation
    confirmation_success = test_email_confirmation_fixed()
    
    print("\n🎯 RESULTADOS")
    print("=" * 60)
    print(f"📤 Envío directo: {'✅ FUNCIONA' if direct_success else '❌ FALLA'}")
    print(f"📬 Email confirmation: {'✅ FUNCIONA' if confirmation_success else '❌ FALLA'}")
    
    if direct_success and confirmation_success:
        print("\n🎉 SISTEMA ARREGLADO - Los emails deberían enviarse ahora")
    elif direct_success and not confirmation_success:
        print("\n⚠️  SMTP funciona pero django-allauth tiene problemas")
    else:
        print("\n❌ PROBLEMA CON CONFIGURACIÓN SMTP")

if __name__ == '__main__':
    main()