#!/usr/bin/env python3
"""
Script para probar específicamente el envío de email a letefon100@gmail.com
"""

import os
import django
from pathlib import Path
from datetime import datetime

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.core.mail import send_mail
from django.conf import settings

def test_email_to_letefon():
    """Probar envío de email específico a letefon100@gmail.com"""
    print("🧪 Probando envío de email a letefon100@gmail.com...")
    
    try:
        # Verificar configuración
        print(f"📧 Configuración actual:")
        print(f"   - EMAIL_HOST: {settings.EMAIL_HOST}")
        print(f"   - EMAIL_PORT: {settings.EMAIL_PORT}")
        print(f"   - EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        print(f"   - EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
        print(f"   - DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
        
        # Enviar email de prueba
        subject = 'Prueba de VeriHome - Email de Test'
        message = f"""
Hola,

Este es un email de prueba para verificar que la configuracion de VeriHome esta funcionando correctamente.

Detalles de la prueba:
- Remitente: verihomeadmi@gmail.com
- Destinatario: letefon100@gmail.com
- Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Si recibes este email, significa que:
- La configuracion de Gmail esta correcta
- La contrasena de aplicacion funciona
- El servidor puede enviar emails
- Los emails llegan a tu bandeja

Proximos pasos:
1. Verifica que recibiste este email
2. Revisa la carpeta de spam si no lo ves
3. Prueba el registro de un nuevo usuario

Saludos,
Equipo VeriHome
        """
        
        from_email = 'VeriHome <verihomeadmi@gmail.com>'
        to_email = ['letefon100@gmail.com']
        
        print(f"\n📤 Enviando email...")
        print(f"   - De: {from_email}")
        print(f"   - Para: {to_email}")
        print(f"   - Asunto: {subject}")
        
        result = send_mail(
            subject,
            message,
            from_email,
            to_email,
            fail_silently=False,
        )
        
        print(f"✅ Email enviado exitosamente!")
        print(f"📊 Resultado: {result}")
        print(f"📧 Revisa tu bandeja de entrada en letefon100@gmail.com")
        print(f"📁 Tambien revisa la carpeta de spam")
        
        return True
        
    except Exception as e:
        print(f"❌ Error enviando email: {e}")
        print(f"📄 Tipo de error: {type(e).__name__}")
        
        # Mostrar más detalles del error
        if hasattr(e, 'smtp_code'):
            print(f"📄 Código SMTP: {e.smtp_code}")
        if hasattr(e, 'smtp_error'):
            print(f"📄 Error SMTP: {e.smtp_error}")
        
        return False

def test_gmail_connection():
    """Probar conexión directa con Gmail"""
    print("\n🔗 Probando conexión con Gmail...")
    
    try:
        import smtplib
        import ssl
        
        # Configuración SMTP
        smtp_server = "smtp.gmail.com"
        port = 587
        sender_email = "verihomeadmi@gmail.com"
        password = "hnae xeel dcbz wyqg"
        
        print(f"📡 Conectando a {smtp_server}:{port}...")
        
        # Crear contexto SSL
        context = ssl.create_default_context()
        
        # Intentar conexión
        with smtplib.SMTP(smtp_server, port) as server:
            print("✅ Conexión SMTP establecida")
            
            # Iniciar TLS
            server.starttls(context=context)
            print("✅ TLS iniciado")
            
            # Autenticar
            server.login(sender_email, password)
            print("✅ Autenticación exitosa")
            
            # Enviar email de prueba
            message = """From: VeriHome <verihomeadmi@gmail.com>
To: letefon100@gmail.com
Subject: Prueba Directa SMTP - VeriHome

Este es un email de prueba enviado directamente via SMTP.

Si recibes este email, la conexion con Gmail funciona correctamente.

Saludos,
VeriHome
"""
            
            server.sendmail(sender_email, "letefon100@gmail.com", message)
            print("✅ Email enviado via SMTP directo")
            
        return True
        
    except Exception as e:
        print(f"❌ Error en conexión SMTP: {e}")
        return False

def check_email_settings():
    """Verificar configuración de email en settings"""
    print("\n⚙️ Verificando configuración de email...")
    
    try:
        # Verificar que las variables están configuradas
        required_settings = [
            'EMAIL_HOST',
            'EMAIL_PORT', 
            'EMAIL_HOST_USER',
            'EMAIL_HOST_PASSWORD',
            'EMAIL_USE_TLS',
            'DEFAULT_FROM_EMAIL'
        ]
        
        for setting in required_settings:
            value = getattr(settings, setting, None)
            status = "✅" if value else "❌"
            print(f"   {status} {setting}: {value}")
        
        # Verificar archivo .env
        env_file = Path('.env')
        if env_file.exists():
            print(f"✅ Archivo .env existe")
            with open(env_file, 'r') as f:
                content = f.read()
                if 'hnae xeel dcbz wyqg' in content:
                    print("✅ Contraseña de aplicación encontrada en .env")
                else:
                    print("❌ Contraseña de aplicación NO encontrada en .env")
        else:
            print("❌ Archivo .env NO existe")
            
    except Exception as e:
        print(f"❌ Error verificando configuración: {e}")

def main():
    """Función principal"""
    print("🔍 Diagnóstico de Email - letefon100@gmail.com")
    print("=" * 60)
    
    # 1. Verificar configuración
    check_email_settings()
    
    # 2. Probar conexión SMTP
    smtp_ok = test_gmail_connection()
    
    # 3. Probar envío via Django
    django_ok = test_email_to_letefon()
    
    # Resumen
    print("\n" + "=" * 60)
    print("📊 RESUMEN DEL DIAGNÓSTICO")
    print("=" * 60)
    print(f"🔗 Conexión SMTP: {'✅ OK' if smtp_ok else '❌ FALLO'}")
    print(f"📧 Envío Django: {'✅ OK' if django_ok else '❌ FALLO'}")
    
    if smtp_ok and django_ok:
        print("\n🎉 Todo funciona correctamente!")
        print("📧 Revisa tu bandeja de entrada en letefon100@gmail.com")
        print("📁 También revisa la carpeta de spam")
    elif smtp_ok and not django_ok:
        print("\n⚠️ SMTP funciona pero Django falla")
        print("🔧 Revisa la configuración de Django")
    elif not smtp_ok:
        print("\n❌ Problema de conexión con Gmail")
        print("🔧 Verifica:")
        print("   - Verificación en 2 pasos habilitada")
        print("   - Contraseña de aplicación correcta")
        print("   - Conexión a internet")
    
    print("\n📞 Si el problema persiste:")
    print("1. Revisa la carpeta de spam")
    print("2. Verifica que letefon100@gmail.com esté bien escrito")
    print("3. Prueba con otro email temporal")
    print("4. Ejecuta: python setup_email_config.py")

if __name__ == '__main__':
    main() 