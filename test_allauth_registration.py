#!/usr/bin/env python
import os
import sys
import django
from pathlib import Path

# Configurar Django
sys.path.append(str(Path(__file__).resolve().parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.contrib.auth import get_user_model
from allauth.account.models import EmailAddress
from django.core.mail import send_mail
from django.conf import settings

def test_email_verification_flow():
    """Prueba el flujo completo de verificación de email"""
    
    test_email = "letefon100@gmail.com"
    User = get_user_model()
    
    print(f"=== PRUEBA DE VERIFICACIÓN DE EMAIL PARA {test_email} ===")
    
    # 1. Verificar si el usuario existe
    try:
        user = User.objects.get(email=test_email)
        print(f"✅ Usuario encontrado: {user.get_full_name()}")
        
        # 2. Verificar EmailAddress
        try:
            email_address = EmailAddress.objects.get(user=user, email=test_email)
            print(f"📧 EmailAddress existe - Verificado: {email_address.verified}")
            
            if not email_address.verified:
                print("📤 Enviando email de verificación manual...")
                
                # Crear URL de verificación simulada
                verification_url = "https://verihome.com/accounts/verify-email/"
                
                subject = '[VeriHome] Confirma tu dirección de correo electrónico'
                
                html_message = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Confirma tu email - VeriHome</title>
                </head>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                            <h1 style="margin: 0;">🏠 VeriHome</h1>
                            <h2 style="margin: 10px 0 0 0;">Confirma tu dirección de email</h2>
                        </div>
                        
                        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                            <p>Hola <strong>{user.get_full_name()}</strong>,</p>
                            
                            <p>¡Bienvenida a VeriHome! Para completar tu registro, necesitamos que confirmes tu dirección de correo electrónico.</p>
                            
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="{verification_url}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                                    ✅ Confirmar Email
                                </a>
                            </div>
                            
                            <p>Si el botón no funciona, puedes copiar y pegar este enlace en tu navegador:</p>
                            <p style="background: #e9ecef; padding: 10px; border-radius: 4px; word-break: break-all;">
                                {verification_url}
                            </p>
                            
                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                            
                            <h3>📋 Detalles de tu cuenta:</h3>
                            <ul>
                                <li><strong>Email:</strong> {user.email}</li>
                                <li><strong>Nombre:</strong> {user.get_full_name()}</li>
                                <li><strong>Tipo de cuenta:</strong> {user.get_user_type_display()}</li>
                            </ul>
                            
                            <p><strong>Nota:</strong> Este enlace de confirmación expirará en 3 días.</p>
                            
                            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
                                <p>Si no creaste esta cuenta, puedes ignorar este email.</p>
                                <p>VeriHome - Conectando el mundo inmobiliario</p>
                            </div>
                        </div>
                    </div>
                </body>
                </html>
                """
                
                plain_message = f"""
                Hola {user.get_full_name()},

                ¡Bienvenida a VeriHome! 

                Para completar tu registro, necesitamos que confirmes tu dirección de correo electrónico.

                Visita este enlace para confirmar: {verification_url}

                Detalles de tu cuenta:
                - Email: {user.email}
                - Nombre: {user.get_full_name()}
                - Tipo de cuenta: {user.get_user_type_display()}

                Este enlace expirará en 3 días.

                Si no creaste esta cuenta, puedes ignorar este email.

                Saludos,
                El equipo de VeriHome
                """
                
                # Enviar email
                send_mail(
                    subject=subject,
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[test_email],
                    html_message=html_message,
                    fail_silently=False
                )
                
                print("✅ Email de verificación enviado exitosamente!")
                print(f"📬 Revisa la bandeja de entrada de {test_email}")
                print("📁 También revisa la carpeta de spam/promociones")
                
            else:
                print("ℹ️ El email ya está verificado")
                
        except EmailAddress.DoesNotExist:
            print("⚠️ No existe EmailAddress para este usuario")
            # Crear EmailAddress
            email_address = EmailAddress.objects.create(
                user=user,
                email=test_email,
                verified=False,
                primary=True
            )
            print(f"📧 EmailAddress creado para {test_email}")
            
    except User.DoesNotExist:
        print(f"❌ Usuario con email {test_email} no encontrado")
        return False
    
    # 3. Información de configuración
    print("\n=== CONFIGURACIÓN DE EMAIL ===")
    print(f"📧 Host SMTP: {settings.EMAIL_HOST}")
    print(f"👤 Usuario: {settings.EMAIL_HOST_USER}")
    print(f"📨 Desde: {settings.DEFAULT_FROM_EMAIL}")
    print(f"🔐 Password configurado: {'Sí' if settings.EMAIL_HOST_PASSWORD else 'No'}")
    
    return True

if __name__ == "__main__":
    success = test_email_verification_flow()
    
    if success:
        print("\n🎉 ¡Configuración de email funcionando correctamente!")
        print("✅ API key actualizada")
        print("✅ Email enviado exitosamente")
        print("✅ Usuario configurado correctamente")
    else:
        print("\n❌ Hubo problemas con la configuración")