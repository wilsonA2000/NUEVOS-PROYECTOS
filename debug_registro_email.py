#!/usr/bin/env python
"""
Script para debuggear el envío de emails durante el registro
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

import logging
from django.core.mail import send_mail
from django.conf import settings
from allauth.account.models import EmailAddress, EmailConfirmation
from allauth.account.utils import send_email_confirmation
from django.contrib.auth import get_user_model
from django.http import HttpRequest
from django.contrib.sites.models import Site
from django.test import RequestFactory

User = get_user_model()

# Configurar logging para ver errores
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def simulate_registration():
    """Simular el proceso de registro completo"""
    print("🧪 SIMULANDO REGISTRO COMPLETO")
    print("=" * 50)
    
    # Datos de prueba
    email_test = "test_debug@gmail.com"
    
    # Limpiar usuario anterior si existe
    try:
        old_user = User.objects.get(email=email_test)
        EmailAddress.objects.filter(user=old_user).delete()
        EmailConfirmation.objects.filter(email_address__user=old_user).delete()
        old_user.delete()
        print(f"🧹 Usuario anterior {email_test} eliminado")
    except User.DoesNotExist:
        print(f"✅ No existe usuario anterior con {email_test}")
    
    try:
        # Paso 1: Crear usuario
        print("\n📝 PASO 1: Creando usuario...")
        user = User.objects.create_user(
            email=email_test,
            password="test123456",
            first_name="Test",
            last_name="User",
            user_type="tenant",
            is_verified=False
        )
        print(f"✅ Usuario creado: {user.email}")
        
        # Paso 2: Crear EmailAddress
        print("\n📧 PASO 2: Creando EmailAddress...")
        email_address, created = EmailAddress.objects.get_or_create(
            user=user,
            email=user.email,
            defaults={'primary': True, 'verified': False}
        )
        print(f"✅ EmailAddress creado: {email_address.email}, primary: {email_address.primary}, verified: {email_address.verified}")
        
        # Paso 3: Crear request simulado
        print("\n🌐 PASO 3: Creando request simulado...")
        factory = RequestFactory()
        request = factory.post('/api/v1/users/auth/register/')
        request.META['HTTP_HOST'] = 'localhost:8000'
        request.META['SERVER_NAME'] = 'localhost'
        request.META['SERVER_PORT'] = '8000'
        request.is_secure = lambda: False
        
        # Configurar site
        site, created = Site.objects.get_or_create(
            id=1,
            defaults={'domain': 'localhost:8000', 'name': 'VeriHome Local'}
        )
        print(f"✅ Site configurado: {site.domain}")
        
        # Paso 4: Enviar email de confirmación con debugging
        print("\n📬 PASO 4: Enviando email de confirmación...")
        
        # Habilitar logging de email
        import logging
        logging.getLogger('django.core.mail').setLevel(logging.DEBUG)
        
        try:
            send_email_confirmation(request, user, signup=True)
            print("✅ send_email_confirmation ejecutado sin errores")
            
            # Verificar que se creó la confirmación
            confirmations = EmailConfirmation.objects.filter(email_address=email_address)
            print(f"📋 Confirmaciones creadas: {confirmations.count()}")
            
            for conf in confirmations:
                print(f"   🔑 Key: {conf.key}")
                print(f"   📅 Creado: {conf.created}")
                print(f"   ⏰ Expira: {conf.key_expired()}")
            
        except Exception as e:
            print(f"❌ Error en send_email_confirmation: {e}")
            import traceback
            traceback.print_exc()
        
        # Paso 5: Verificar configuración de email
        print("\n⚙️ PASO 5: Verificando configuración de email...")
        print(f"EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
        print(f"EMAIL_HOST: {settings.EMAIL_HOST}")
        print(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        print(f"EMAIL_HOST_PASSWORD: {'*' * len(settings.EMAIL_HOST_PASSWORD) if settings.EMAIL_HOST_PASSWORD else 'NO CONFIGURADO'}")
        print(f"DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        
        # Paso 6: Prueba directa de envío
        print("\n📤 PASO 6: Prueba directa de envío...")
        try:
            result = send_mail(
                subject='[VeriHome] Test Debug Directo',
                message='Este es un test directo de envío de email.',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email_test],
                fail_silently=False,
            )
            print(f"✅ Email directo enviado: {result}")
        except Exception as e:
            print(f"❌ Error en envío directo: {e}")
            
        return user
        
    except Exception as e:
        print(f"❌ Error general: {e}")
        import traceback
        traceback.print_exc()
        return None

def check_allauth_adapter():
    """Verificar adaptador de allauth"""
    print("\n🔧 VERIFICANDO ADAPTADOR DE ALLAUTH")
    print("=" * 50)
    
    try:
        from users.adapters import VeriHomeAccountAdapter
        adapter = VeriHomeAccountAdapter()
        print(f"✅ Adaptador encontrado: {adapter.__class__.__name__}")
        
        # Verificar método send_confirmation_mail
        if hasattr(adapter, 'send_confirmation_mail'):
            print("✅ Método send_confirmation_mail existe")
        else:
            print("❌ Método send_confirmation_mail NO existe")
            
        # Verificar configuración
        print(f"ACCOUNT_ADAPTER: {settings.ACCOUNT_ADAPTER}")
        
    except Exception as e:
        print(f"❌ Error con adaptador: {e}")

def main():
    """Ejecutar debugging completo"""
    print("🔍 DEBUG DEL REGISTRO Y ENVÍO DE EMAILS")
    print("=" * 60)
    
    check_allauth_adapter()
    user = simulate_registration()
    
    if user:
        print(f"\n🎯 USUARIO CREADO EXITOSAMENTE: {user.email}")
        print("📧 Revisa si el email se envió y aparece en verihomeadmi@gmail.com enviados")
    else:
        print("\n❌ ERROR EN LA CREACIÓN DEL USUARIO")

if __name__ == '__main__':
    main()