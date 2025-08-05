#\!/usr/bin/env python
"""
Script para probar la configuración de correo electrónico de VeriHome
"""
import os
import sys
import django
from pathlib import Path

# Agregar el directorio del proyecto al path
sys.path.append(str(Path(__file__).resolve().parent))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

def test_email_configuration():
    """Prueba la configuración de correo electrónico"""
    
    print("🔧 Probando configuración de email...")
    print(f"📧 Host: {settings.EMAIL_HOST}")
    print(f"🔌 Puerto: {settings.EMAIL_PORT}")
    print(f"🔐 TLS: {settings.EMAIL_USE_TLS}")
    print(f"👤 Usuario: {settings.EMAIL_HOST_USER}")
    print(f"🔑 Password configurado: {'Sí' if settings.EMAIL_HOST_PASSWORD else 'No'}")
    print("-" * 50)
    
    # Email de prueba
    test_email = "letefon100@gmail.com"
    subject = "[VeriHome] 🧪 Prueba de Configuración de Email"
    
    # Crear mensaje HTML
    html_message = f"""
    <\!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Prueba de Email - VeriHome</title>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }}
            .success {{ background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 4px; margin: 20px 0; }}
            .footer {{ text-align: center; margin-top: 30px; color: #666; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏠 VeriHome</h1>
                <h2>Configuración de Email Actualizada</h2>
            </div>
            <div class="content">
                <div class="success">
                    <h3>✅ ¡Configuración de Email Funcionando\!</h3>
                    <p>Este es un email de prueba para confirmar que la nueva API key está funcionando correctamente.</p>
                </div>
                
                <h3>📋 Detalles de la Configuración:</h3>
                <ul>
                    <li><strong>Usuario:</strong> leidy (letefon100@gmail.com)</li>
                    <li><strong>Sistema:</strong> VeriHome - Plataforma Inmobiliaria</li>
                </ul>
                
                <h3>📧 Próximos Pasos:</h3>
                <p>Los emails de confirmación de registro ahora deberían funcionar correctamente. Si registras una nueva cuenta, deberías recibir el email de confirmación automáticamente.</p>
                
                <h3>🔧 Configuración Técnica:</h3>
                <ul>
                    <li><strong>Host SMTP:</strong> {settings.EMAIL_HOST}</li>
                    <li><strong>Puerto:</strong> {settings.EMAIL_PORT}</li>
                    <li><strong>Encriptación:</strong> TLS</li>
                    <li><strong>API Key:</strong> ✅ Actualizada correctamente</li>
                </ul>
            </div>
            <div class="footer">
                <p>VeriHome - Conectando el mundo inmobiliario</p>
                <p>Este es un email automático de prueba del sistema.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Mensaje de texto plano (fallback)
    plain_message = f"""
    🏠 VeriHome - Configuración de Email Actualizada
    
    ✅ ¡Configuración de Email Funcionando\!
    
    Este es un email de prueba para confirmar que la nueva API key está funcionando correctamente.
    
    Detalles:
    - Usuario: leidy (letefon100@gmail.com)
    - Sistema: VeriHome - Plataforma Inmobiliaria
    - Host SMTP: {settings.EMAIL_HOST}
    - Puerto: {settings.EMAIL_PORT}
    - API Key: ✅ Actualizada correctamente
    
    Los emails de confirmación de registro ahora deberían funcionar correctamente.
    
    VeriHome - Conectando el mundo inmobiliario
    """
    
    try:
        print(f"📤 Enviando email de prueba a: {test_email}")
        
        # Enviar email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[test_email],
            html_message=html_message,
            fail_silently=False,
        )
        
        print("✅ ¡Email enviado exitosamente\!")
        print(f"📬 Revisa la bandeja de entrada de {test_email}")
        print("📁 También revisa la carpeta de spam/promociones")
        
        return True
        
    except Exception as e:
        print(f"❌ Error al enviar email: {str(e)}")
        print("🔍 Posibles causas:")
        print("   - API key incorrecta")
        print("   - Configuración de Gmail")
        print("   - Conexión a internet")
        print("   - Límites de envío de Gmail")
        
        return False

def test_registration_email():
    """Prueba específica para emails de registro"""
    
    print("\n" + "="*50)
    print("🧪 PRUEBA DE EMAIL DE CONFIRMACIÓN DE REGISTRO")
    print("="*50)
    
    from django.contrib.auth import get_user_model
    from allauth.account.models import EmailAddress
    from allauth.account.utils import send_email_confirmation
    
    User = get_user_model()
    
    # Buscar el usuario leidy
    try:
        user = User.objects.get(email="letefon100@gmail.com")
        print(f"👤 Usuario encontrado: {user.get_full_name()} ({user.email})")
        print(f"📧 Email verificado: {user.emailaddress_set.filter(verified=True).exists()}")
        
        # Verificar si hay un EmailAddress sin verificar
        unverified_emails = user.emailaddress_set.filter(verified=False)
        if unverified_emails.exists():
            print(f"📧 Emails sin verificar: {unverified_emails.count()}")
            
            # Reenviar email de confirmación
            email_address = unverified_emails.first()
            print(f"📤 Reenviando email de confirmación...")
            
            send_email_confirmation(None, user, signup=False, email=email_address.email)
            
            print("✅ Email de confirmación reenviado")
            print("📬 Revisa la bandeja de entrada de letefon100@gmail.com")
            
        else:
            print("ℹ️ El email ya está verificado o no hay registros de confirmación pendientes")
            
    except User.DoesNotExist:
        print("❌ Usuario con email letefon100@gmail.com no encontrado")
        print("💡 Asegúrate de que el usuario esté registrado en el sistema")

if __name__ == "__main__":
    print("🏠 VeriHome - Prueba de Configuración de Email")
    print("=" * 50)
    
    # Probar configuración general
    success = test_email_configuration()
    
    if success:
        # Probar email de confirmación específico
        test_registration_email()
    
    print("\n" + "="*50)
    print("🏁 Prueba completada")
    print("="*50)
EOF < /dev/null
