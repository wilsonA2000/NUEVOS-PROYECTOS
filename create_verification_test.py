#!/usr/bin/env python
"""
Crear un usuario de prueba y enviar email de verificación real
"""
import os
import sys
import django

# Configurar Django
sys.path.append('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress, EmailConfirmation
from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string

User = get_user_model()

def create_and_send_verification():
    print("CREAR USUARIO Y ENVIAR VERIFICACION")
    print("=" * 35)
    
    # Email de prueba
    test_email = "test.verihome.2025@gmail.com"
    
    # Eliminar usuario si existe
    User.objects.filter(email=test_email).delete()
    
    # Crear nuevo usuario
    user = User.objects.create_user(
        email=test_email,
        password='TestPass123!',
        first_name='Usuario',
        last_name='Prueba'
    )
    
    # Crear EmailAddress
    email_address = EmailAddress.objects.create(
        user=user,
        email=test_email,
        primary=True,
        verified=False
    )
    
    # Crear EmailConfirmation
    email_confirmation = EmailConfirmation.create(email_address)
    email_confirmation.save()
    
    print(f"Usuario creado: {test_email}")
    print(f"Key de confirmacion: {email_confirmation.key}")
    
    # Preparar contexto para el template
    context = {
        'user': user,
        'activate_url': f"http://127.0.0.1:8000/accounts/confirm-email/{email_confirmation.key}/",
        'key': email_confirmation.key,
    }
    
    # Renderizar subject
    subject = render_to_string('account/email/email_confirmation_subject.txt', context).strip()
    
    # Renderizar mensaje texto
    text_content = render_to_string('account/email/email_confirmation_signup_message.txt', context)
    
    # Renderizar mensaje HTML
    html_content = render_to_string('account/email/email_confirmation_signup_message.html', context)
    
    print(f"Asunto: {subject}")
    print("Enviando email con template profesional...")
    
    try:
        # Enviar email usando EmailMultiAlternatives para HTML
        from django.core.mail import EmailMultiAlternatives
        
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[test_email]
        )
        msg.attach_alternative(html_content, "text/html")
        
        result = msg.send()
        
        print(f"OK: Email enviado! (resultado: {result})")
        print(f"Revisa la bandeja de: {test_email}")
        print("El email incluye:")
        print("- Template HTML profesional con branding VeriHome")
        print("- Boton de confirmacion")
        print("- Lista de caracteristicas de la plataforma")
        print("- Diseno responsive")
        
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == "__main__":
    create_and_send_verification()