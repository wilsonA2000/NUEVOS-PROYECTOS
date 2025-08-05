#!/usr/bin/env python
"""Script para enviar email de confirmación manualmente."""

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.sites.models import Site
from allauth.account.models import EmailAddress, EmailConfirmation
from allauth.account.adapter import get_adapter
from allauth.account.utils import send_email_confirmation
from users.models import User
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.conf import settings

def send_confirmation_manually(email):
    """Enviar email de confirmación manualmente."""
    print(f"\n=== Enviando confirmación para: {email} ===\n")
    
    try:
        user = User.objects.get(email=email)
        print(f"[OK] Usuario encontrado: {user.email}")
        
        # Crear o obtener EmailAddress
        email_address, created = EmailAddress.objects.get_or_create(
            user=user,
            email=user.email,
            defaults={'primary': True, 'verified': False}
        )
        print(f"[OK] EmailAddress {'creado' if created else 'obtenido'}")
        
        # Crear EmailConfirmation manualmente
        confirmation = EmailConfirmation.create(email_address)
        confirmation.sent = None  # Marcar como no enviado para que allauth lo envíe
        confirmation.save()
        print(f"[OK] EmailConfirmation creado: {confirmation.key}")
        
        # Obtener el adapter y construir la URL
        adapter = get_adapter()
        site = Site.objects.get_current()
        
        # Construir URL de confirmación
        confirmation_url = f"http://localhost:3000/confirm-email/{confirmation.key}"
        print(f"[OK] URL de confirmación: {confirmation_url}")
        
        # Construir el contexto del email
        context = {
            'user': user,
            'email': email,
            'confirmation_url': confirmation_url,
            'site_name': 'VeriHome',
            'site_domain': 'localhost:3000'
        }
        
        # Construir el mensaje
        subject = '[VeriHome] Confirma tu dirección de correo electrónico'
        message = f"""
Hola {user.first_name or 'Usuario'},

¡Bienvenido a VeriHome! Tu plataforma inmobiliaria de confianza.

Por favor, confirma tu dirección de correo electrónico haciendo clic en el siguiente enlace:

{confirmation_url}

Si no te registraste en VeriHome, puedes ignorar este mensaje.

Saludos,
El equipo de VeriHome
"""
        
        # Enviar el email
        result = send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=False,
        )
        
        if result:
            print("[OK] Email enviado exitosamente")
            # Marcar como enviado
            confirmation.sent = django.utils.timezone.now()
            confirmation.save()
        else:
            print("[ERROR] No se pudo enviar el email")
            
    except User.DoesNotExist:
        print(f"[ERROR] Usuario no encontrado: {email}")
    except Exception as e:
        print(f"[ERROR] Error: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    send_confirmation_manually("letefon100@gmail.com")