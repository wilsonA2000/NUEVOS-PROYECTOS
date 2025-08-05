#!/usr/bin/env python3
"""
Script para verificar el archivo .env y la configuración de email
"""

import os
from pathlib import Path

def check_env_file():
    """Verificar si el archivo .env existe y tiene la configuración correcta"""
    print("🔍 Verificando archivo .env...")
    
    env_file = Path('.env')
    
    if not env_file.exists():
        print("❌ El archivo .env NO existe")
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
            with open(env_file, 'w', encoding='utf-8') as f:
                f.write(env_content)
            print("✅ Archivo .env creado exitosamente")
            return True
        except Exception as e:
            print(f"❌ Error creando archivo .env: {e}")
            return False
    else:
        print("✅ El archivo .env existe")
        
        # Verificar contenido
        try:
            with open(env_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            print("📋 Contenido del archivo .env:")
            print("-" * 40)
            
            required_vars = [
                'EMAIL_HOST_USER=verihomeadmi@gmail.com',
                'EMAIL_HOST_PASSWORD=hnae xeel dcbz wyqg',
                'EMAIL_HOST=smtp.gmail.com',
                'EMAIL_PORT=587',
                'EMAIL_USE_TLS=True'
            ]
            
            all_found = True
            for var in required_vars:
                if var in content:
                    print(f"✅ {var}")
                else:
                    print(f"❌ {var} - NO ENCONTRADO")
                    all_found = False
            
            if not all_found:
                print("\n⚠️ Algunas variables faltan en el archivo .env")
                print("📝 Recreando archivo .env...")
                
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
                
                with open(env_file, 'w', encoding='utf-8') as f:
                    f.write(env_content)
                print("✅ Archivo .env actualizado")
            
            return all_found
            
        except Exception as e:
            print(f"❌ Error leyendo archivo .env: {e}")
            return False

def test_django_settings():
    """Probar que Django puede leer las variables de entorno"""
    print("\n🧪 Probando configuración de Django...")
    
    try:
        import django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
        django.setup()
        
        from django.conf import settings
        
        print("✅ Django configurado correctamente")
        print(f"📧 EMAIL_HOST: {settings.EMAIL_HOST}")
        print(f"📧 EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        print(f"📧 EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error configurando Django: {e}")
        return False

def main():
    """Función principal"""
    print("🔍 Verificación de Configuración - VeriHome")
    print("=" * 50)
    
    # 1. Verificar archivo .env
    env_ok = check_env_file()
    
    if env_ok:
        # 2. Probar configuración de Django
        django_ok = test_django_settings()
        
        if django_ok:
            print("\n🎉 Configuración verificada correctamente!")
            print("\n📝 Próximos pasos:")
            print("1. Ejecuta: python test_specific_email.py")
            print("2. Revisa tu bandeja de entrada en letefon100@gmail.com")
            print("3. También revisa la carpeta de spam")
        else:
            print("\n❌ Error en la configuración de Django")
    else:
        print("\n❌ Error en el archivo .env")
    
    print("\n📞 Si el problema persiste:")
    print("- Ejecuta: python setup_complete.py")
    print("- Verifica la conexión a internet")
    print("- Revisa que la contraseña de aplicación sea correcta")

if __name__ == '__main__':
    main() 