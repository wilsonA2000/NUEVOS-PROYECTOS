#!/usr/bin/env python
"""
Script para probar el registro de usuarios y diagnosticar problemas.
"""

import os
import sys
import django
import requests
import json

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.sites.models import Site
from allauth.account.models import EmailAddress, EmailConfirmation
from django.test import RequestFactory
from django.core import mail
from django.conf import settings

User = get_user_model()

def test_backend_registration():
    """Probar registro directamente en el backend."""
    print("🔧 Probando registro en el backend...")
    
    email = "letefon100@gmail.com"
    
    # Eliminar usuario si existe
    try:
        user = User.objects.get(email=email)
        user.delete()
        print("🗑️ Usuario existente eliminado")
    except User.DoesNotExist:
        pass
    
    try:
        # Crear usuario directamente
        user = User.objects.create_user(
            email=email,
            password="testpass123",
            first_name="Usuario",
            last_name="Prueba",
            user_type="tenant"
        )
        
        print(f"✅ Usuario creado en backend: {user.email}")
        print(f"   ID: {user.id}")
        print(f"   Activo: {user.is_active}")
        print(f"   Verificado: {user.is_verified}")
        
        # Verificar EmailAddress
        try:
            email_address = EmailAddress.objects.get(user=user, email=user.email)
            print(f"✅ EmailAddress creado: {email_address.email} (verificado: {email_address.verified})")
        except EmailAddress.DoesNotExist:
            print("❌ EmailAddress no encontrado")
            
        return user
        
    except Exception as e:
        print(f"❌ Error creando usuario: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_frontend_registration_api():
    """Probar la API de registro del frontend."""
    print("\n🌐 Probando API de registro del frontend...")
    
    # URL de la API de registro
    api_url = "http://127.0.0.1:8000/api/auth/register/"
    
    # Datos de registro
    registration_data = {
        "email": "letefon100@gmail.com",
        "password1": "testpass123",
        "password2": "testpass123",
        "first_name": "Usuario",
        "last_name": "Prueba",
        "user_type": "tenant",
        "terms_accepted": True,
        "privacy_accepted": True
    }
    
    try:
        # Hacer petición POST
        response = requests.post(
            api_url,
            json=registration_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 201:
            print("✅ Registro exitoso via API")
            return True
        else:
            print("❌ Error en registro via API")
            return False
            
    except Exception as e:
        print(f"❌ Error conectando a la API: {e}")
        return False

def test_email_sending_after_registration():
    """Probar envío de email después del registro."""
    print("\n📧 Probando envío de email después del registro...")
    
    # Crear usuario
    user = test_backend_registration()
    if not user:
        return False
    
    # Crear request factory
    factory = RequestFactory()
    request = factory.get('/')
    
    # Configurar sitio
    site = Site.objects.get_current()
    print(f"🌐 Sitio actual: {site.name} ({site.domain})")
    
    try:
        # Importar y usar la función de envío de email
        from allauth.account.utils import send_email_confirmation
        send_email_confirmation(request, user, signup=True)
        
        print("✅ Función de envío de email ejecutada")
        
        # Verificar EmailConfirmation
        try:
            email_address = EmailAddress.objects.get(user=user, email=user.email)
            confirmations = EmailConfirmation.objects.filter(email_address=email_address)
            if confirmations.exists():
                confirmation = confirmations.first()
                print(f"✅ EmailConfirmation creado: {confirmation.key}")
                print(f"   Enviado: {confirmation.sent}")
            else:
                print("❌ No se encontró EmailConfirmation")
        except EmailAddress.DoesNotExist:
            print("❌ No se encontró EmailAddress")
            
        return True
        
    except Exception as e:
        print(f"❌ Error enviando email: {e}")
        import traceback
        traceback.print_exc()
        return False

def check_registration_urls():
    """Verificar URLs de registro."""
    print("\n🔗 Verificando URLs de registro...")
    
    try:
        from django.urls import reverse
        from django.test import Client
        
        client = Client()
        
        # Probar URL de registro
        try:
            signup_url = reverse('account_signup')
            print(f"✅ URL de registro: {signup_url}")
            
            response = client.get(signup_url)
            print(f"   Status: {response.status_code}")
            
        except Exception as e:
            print(f"❌ Error con URL de registro: {e}")
        
        # Probar API de registro
        try:
            api_url = "/api/auth/register/"
            response = client.get(api_url)
            print(f"✅ API de registro: {api_url}")
            print(f"   Status: {response.status_code}")
            
        except Exception as e:
            print(f"❌ Error con API de registro: {e}")
            
    except Exception as e:
        print(f"❌ Error verificando URLs: {e}")

def check_user_count():
    """Verificar cantidad de usuarios."""
    print("\n👥 Verificando usuarios en la base de datos...")
    
    total_users = User.objects.count()
    print(f"Total de usuarios: {total_users}")
    
    # Listar usuarios
    users = User.objects.all()
    for user in users:
        print(f"   - {user.email} ({user.get_full_name()}) - Tipo: {user.user_type}")
    
    # Verificar EmailAddress
    email_addresses = EmailAddress.objects.all()
    print(f"Total de EmailAddress: {email_addresses.count()}")
    
    for ea in email_addresses:
        print(f"   - {ea.email} (verificado: {ea.verified})")

def main():
    """Función principal."""
    print("🚀 Iniciando diagnóstico de registro de usuarios")
    print("=" * 60)
    
    # Verificar usuarios existentes
    check_user_count()
    
    # Verificar URLs
    check_registration_urls()
    
    # Probar registro en backend
    test_backend_registration()
    
    # Probar API de frontend
    test_frontend_registration_api()
    
    # Probar envío de email
    test_email_sending_after_registration()
    
    # Verificar usuarios después de las pruebas
    print("\n" + "=" * 60)
    print("📊 ESTADO FINAL")
    print("=" * 60)
    check_user_count()
    
    print("\n🎯 Próximos pasos:")
    print("1. Intenta registrar un usuario desde el frontend")
    print("2. Revisa la consola del servidor para errores")
    print("3. Verifica que el frontend esté conectado al backend correcto")

if __name__ == "__main__":
    main() 