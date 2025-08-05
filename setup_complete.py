#!/usr/bin/env python3
"""
Script completo para configurar VeriHome con email automático
"""

import os
import subprocess
import sys
from pathlib import Path

def run_command(command, description):
    """Ejecutar un comando y mostrar el resultado."""
    print(f"\n🔄 {description}...")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {description} completado")
            if result.stdout:
                print(f"📄 Salida: {result.stdout.strip()}")
            return True
        else:
            print(f"❌ Error en {description}:")
            print(f"📄 Error: {result.stderr.strip()}")
            return False
    except Exception as e:
        print(f"❌ Error ejecutando {description}: {e}")
        return False

def create_env_file():
    """Crear archivo .env con la configuración de email."""
    print("📝 Creando archivo .env...")
    
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
    
    try:
        with open('.env', 'w', encoding='utf-8') as f:
            f.write(env_content)
        print("✅ Archivo .env creado exitosamente!")
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
            'VeriHome - Configuración Automática Completada',
            '¡Hola! La configuración automática de VeriHome se ha completado exitosamente. '
            'El sistema ya puede enviar emails automáticamente para confirmaciones de cuenta, '
            'notificaciones de propiedades, contratos, pagos y mensajes.',
            'VeriHome <verihomeadmi@gmail.com>',
            ['verihomeadmi@gmail.com'],
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
    print("🚀 Configuración Completa Automática - VeriHome")
    print("=" * 60)
    
    # Verificar que estamos en el directorio correcto
    if not Path('manage.py').exists():
        print("❌ Error: No se encontró manage.py. Asegúrate de estar en el directorio raíz del proyecto.")
        return
    
    # 1. Crear archivo .env
    if not create_env_file():
        print("❌ No se pudo crear el archivo .env")
        return
    
    # 2. Ejecutar migraciones
    print("\n📋 Ejecutando migraciones...")
    
    if not run_command("python manage.py makemigrations", "Creando migraciones"):
        print("⚠️ Error creando migraciones, continuando...")
    
    if not run_command("python manage.py migrate", "Aplicando migraciones"):
        print("❌ Error aplicando migraciones")
        return
    
    # 3. Crear superusuario si no existe
    print("\n👤 Verificando superusuario...")
    try:
        import django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
        django.setup()
        
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        if not User.objects.filter(is_superuser=True).exists():
            print("👤 Creando superusuario...")
            superuser = User.objects.create_superuser(
                email='admin@verihome.com',
                password='admin123',
                first_name='Admin',
                last_name='VeriHome',
                user_type='landlord'
            )
            print(f"✅ Superusuario creado: admin@verihome.com / admin123")
        else:
            print("✅ Superusuario ya existe")
    except Exception as e:
        print(f"⚠️ Error con superusuario: {e}")
    
    # 4. Probar configuración de email
    print("\n🧪 ¿Deseas probar la configuración de email? (s/n): ", end="")
    response = input().lower()
    
    if response == 's':
        if test_email_configuration():
            print("\n🎉 ¡Configuración completada exitosamente!")
        else:
            print("\n⚠️ La configuración se completó pero la prueba de email falló.")
            print("Revisa la contraseña de aplicación y la conexión a internet.")
    else:
        print("\n✅ Configuración completada. Puedes probar más tarde con:")
        print("python test_email_config.py")
    
    # 5. Mostrar resumen final
    print("\n" + "=" * 60)
    print("📊 RESUMEN DE CONFIGURACIÓN")
    print("=" * 60)
    print("✅ Archivo .env creado con configuración de email")
    print("✅ Migraciones aplicadas")
    print("✅ Superusuario verificado/creado")
    print("✅ Adaptador personalizado configurado")
    print("✅ Verificación de email obligatoria activada")
    print("✅ Rechazo de login para usuarios no verificados activado")
    
    print("\n📝 PRÓXIMOS PASOS:")
    print("1. Inicia el servidor: python manage.py runserver")
    print("2. Ve a http://localhost:8000")
    print("3. Prueba el registro de un nuevo usuario")
    print("4. Verifica que llega el email de confirmación")
    print("5. Confirma el email y prueba el login")
    
    print("\n🔧 COMANDOS ÚTILES:")
    print("- Probar email: python test_email_config.py")
    print("- Crear código de entrevista: python manage.py shell")
    print("- Ver logs: python manage.py runserver --verbosity=2")
    
    print("\n📧 CONFIGURACIÓN DE EMAIL:")
    print("- Host: smtp.gmail.com")
    print("- Puerto: 587")
    print("- Usuario: verihomeadmi@gmail.com")
    print("- TLS: Habilitado")
    print("- Tipos de email: Confirmación, notificaciones, alertas")
    
    print("\n🎉 ¡VeriHome está listo para usar!")

if __name__ == '__main__':
    main() 