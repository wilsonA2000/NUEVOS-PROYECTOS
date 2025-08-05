#!/usr/bin/env python3
"""
Script para configurar automáticamente las variables de entorno para el email de VeriHome
"""

import os
from pathlib import Path

def create_env_file():
    """Crear archivo .env con la configuración de email."""
    
    env_content = """# Configuración de Email para VeriHome
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False
EMAIL_HOST_USER=verihomeadmi@gmail.com
EMAIL_HOST_PASSWORD=hnae xeel dcbz wyqg
DEFAULT_FROM_EMAIL=VeriHome <verihomeadmi@gmail.com>
SERVER_EMAIL=VeriHome <verihomeadmi@gmail.com>

# Configuración de Django
SECRET_KEY=django-insecure-*zzgo5_n4ft2^)+qavkb9us!@_23@8+z(tr7ojl$p))wncyfa1
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
"""
    
    env_file = Path('.env')
    
    if env_file.exists():
        print("⚠️ El archivo .env ya existe. ¿Deseas sobrescribirlo? (s/n): ", end="")
        response = input().lower()
        if response != 's':
            print("❌ Configuración cancelada.")
            return False
    
    try:
        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(env_content)
        
        print("✅ Archivo .env creado exitosamente!")
        print("📧 Configuración de email:")
        print(f"   - Host: smtp.gmail.com")
        print(f"   - Puerto: 587")
        print(f"   - Usuario: verihomeadmi@gmail.com")
        print(f"   - Contraseña: hnae xeel dcbz wyqg")
        print(f"   - TLS: Habilitado")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creando archivo .env: {e}")
        return False

def test_email_configuration():
    """Probar la configuración de email."""
    print("\n🧪 Probando configuración de email...")
    
    try:
        # Configurar variables de entorno
        os.environ.setdefault('EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
        os.environ.setdefault('EMAIL_HOST', 'smtp.gmail.com')
        os.environ.setdefault('EMAIL_PORT', '587')
        os.environ.setdefault('EMAIL_USE_TLS', 'True')
        os.environ.setdefault('EMAIL_USE_SSL', 'False')
        os.environ.setdefault('EMAIL_HOST_USER', 'verihomeadmi@gmail.com')
        os.environ.setdefault('EMAIL_HOST_PASSWORD', 'hnae xeel dcbz wyqg')
        os.environ.setdefault('DEFAULT_FROM_EMAIL', 'VeriHome <verihomeadmi@gmail.com>')
        os.environ.setdefault('SERVER_EMAIL', 'VeriHome <verihomeadmi@gmail.com>')
        
        # Importar Django
        import django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
        django.setup()
        
        # Probar envío de email
        from django.core.mail import send_mail
        
        send_mail(
            'Prueba de VeriHome - Configuración Automática',
            'Este es un email de prueba para verificar que la configuración automática funcionó correctamente.',
            'VeriHome <verihomeadmi@gmail.com>',
            ['verihomeadmi@gmail.com'],  # Enviar a ti mismo para verificar
            fail_silently=False,
        )
        
        print("✅ Email de prueba enviado exitosamente!")
        print("📧 Revisa tu bandeja de entrada en verihomeadmi@gmail.com")
        return True
        
    except Exception as e:
        print(f"❌ Error en la prueba de email: {e}")
        return False

def main():
    """Función principal."""
    print("🚀 Configuración Automática de Email - VeriHome")
    print("=" * 50)
    
    # Crear archivo .env
    if create_env_file():
        print("\n📋 Archivo .env configurado correctamente")
        
        # Probar configuración
        print("\n🧪 ¿Deseas probar la configuración de email ahora? (s/n): ", end="")
        response = input().lower()
        
        if response == 's':
            if test_email_configuration():
                print("\n🎉 ¡Configuración completada exitosamente!")
                print("\n📝 Próximos pasos:")
                print("1. Ejecuta: python manage.py makemigrations")
                print("2. Ejecuta: python manage.py migrate")
                print("3. Inicia el servidor: python manage.py runserver")
                print("4. Prueba el registro de un nuevo usuario")
            else:
                print("\n⚠️ La configuración se creó pero la prueba falló.")
                print("Revisa la contraseña de aplicación y la conexión a internet.")
        else:
            print("\n✅ Configuración completada. Puedes probar más tarde con:")
            print("python test_email_config.py")
    else:
        print("\n❌ No se pudo completar la configuración.")

if __name__ == '__main__':
    main() 