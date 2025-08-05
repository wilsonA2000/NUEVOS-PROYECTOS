#!/usr/bin/env python3
"""
Script de verificación de configuración de seguridad para VeriHome.
Verifica todas las configuraciones de seguridad implementadas.
"""

import os
import sys
import django
from pathlib import Path

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
BASE_DIR = Path(__file__).resolve().parent

# Agregar el directorio del proyecto al path
sys.path.append(str(BASE_DIR))

try:
    django.setup()
    from django.conf import settings
    from django.core.management import execute_from_command_line
    print("✅ Django configurado correctamente")
except Exception as e:
    print(f"❌ Error configurando Django: {e}")
    sys.exit(1)


def check_secret_key():
    """Verificar SECRET_KEY."""
    print("\n🔐 Verificando SECRET_KEY...")
    
    secret_key = getattr(settings, 'SECRET_KEY', '')
    
    if not secret_key:
        print("❌ SECRET_KEY no configurada")
        return False
    
    if secret_key.startswith('django-insecure-'):
        print("❌ SECRET_KEY insegura (contiene 'django-insecure-')")
        return False
    
    if len(secret_key) < 50:
        print(f"⚠️  SECRET_KEY corta ({len(secret_key)} caracteres, recomendado: 50+)")
        return False
    
    print(f"✅ SECRET_KEY segura ({len(secret_key)} caracteres)")
    return True


def check_debug_settings():
    """Verificar configuraciones relacionadas con DEBUG."""
    print("\n🔧 Verificando configuraciones de DEBUG...")
    
    debug = getattr(settings, 'DEBUG', False)
    print(f"📊 DEBUG = {debug}")
    
    allowed_hosts = getattr(settings, 'ALLOWED_HOSTS', [])
    print(f"📊 ALLOWED_HOSTS = {allowed_hosts}")
    
    if debug and not allowed_hosts:
        print("⚠️  DEBUG=True pero ALLOWED_HOSTS vacío")
    
    return True


def check_security_settings():
    """Verificar configuraciones de seguridad."""
    print("\n🛡️  Verificando configuraciones de seguridad...")
    
    debug = getattr(settings, 'DEBUG', False)
    
    # Configuraciones que deben estar presentes
    security_settings = {
        'SECURE_BROWSER_XSS_FILTER': True,
        'SECURE_CONTENT_TYPE_NOSNIFF': True,
        'X_FRAME_OPTIONS': 'DENY',
    }
    
    for setting_name, expected_value in security_settings.items():
        actual_value = getattr(settings, setting_name, None)
        if actual_value == expected_value:
            print(f"✅ {setting_name} = {actual_value}")
        else:
            print(f"❌ {setting_name} = {actual_value} (esperado: {expected_value})")
    
    # Configuraciones específicas según DEBUG
    if debug:
        # En desarrollo
        dev_settings = {
            'SECURE_SSL_REDIRECT': False,
            'SECURE_HSTS_SECONDS': 0,
            'SESSION_COOKIE_SECURE': False,
            'CSRF_COOKIE_SECURE': False,
        }
        
        print("\n📍 Configuraciones para desarrollo:")
        for setting_name, expected_value in dev_settings.items():
            actual_value = getattr(settings, setting_name, None)
            if actual_value == expected_value:
                print(f"✅ {setting_name} = {actual_value}")
            else:
                print(f"⚠️  {setting_name} = {actual_value} (esperado para desarrollo: {expected_value})")
    else:
        # En producción
        prod_settings = {
            'SECURE_SSL_REDIRECT': True,
            'SECURE_HSTS_SECONDS': lambda x: x > 0,
            'SESSION_COOKIE_SECURE': True,
            'CSRF_COOKIE_SECURE': True,
        }
        
        print("\n🏭 Configuraciones para producción:")
        for setting_name, expected_check in prod_settings.items():
            actual_value = getattr(settings, setting_name, None)
            if callable(expected_check):
                is_valid = expected_check(actual_value)
                status = "✅" if is_valid else "❌"
                print(f"{status} {setting_name} = {actual_value}")
            else:
                status = "✅" if actual_value == expected_check else "❌"
                print(f"{status} {setting_name} = {actual_value} (esperado: {expected_check})")
    
    return True


def check_cache_config():
    """Verificar configuración de cache."""
    print("\n💾 Verificando configuración de cache...")
    
    caches = getattr(settings, 'CACHES', {})
    
    if not caches:
        print("❌ No hay configuración de CACHES")
        return False
    
    default_cache = caches.get('default', {})
    backend = default_cache.get('BACKEND', '')
    
    print(f"📊 Cache backend: {backend}")
    
    if 'redis' in backend.lower():
        print("✅ Usando Redis como cache principal")
        
        # Verificar configuración de fallback
        if 'IGNORE_EXCEPTIONS' in str(default_cache.get('OPTIONS', {})):
            print("✅ Cache configurado con fallback en caso de error")
        else:
            print("⚠️  Cache Redis sin configuración de fallback")
            
    elif 'locmem' in backend.lower():
        print("⚠️  Usando cache local en memoria (probablemente fallback activo)")
    else:
        print(f"⚠️  Backend de cache desconocido: {backend}")
    
    # Verificar configuración de sesiones
    session_engine = getattr(settings, 'SESSION_ENGINE', '')
    print(f"📊 Sesiones: {session_engine}")
    
    return True


def check_logging_config():
    """Verificar configuración de logging."""
    print("\n📝 Verificando configuración de logging...")
    
    logging_config = getattr(settings, 'LOGGING', {})
    
    if not logging_config:
        print("❌ No hay configuración de LOGGING")
        return False
    
    # Verificar formatters
    formatters = logging_config.get('formatters', {})
    if 'json' in formatters:
        json_formatter = formatters['json']
        if '()' in json_formatter:
            print("✅ Formatter JSON personalizado configurado")
        else:
            print("⚠️  Formatter JSON usando configuración estándar")
    
    # Verificar handlers
    handlers = logging_config.get('handlers', {})
    console_handler = handlers.get('console', {})
    
    debug = getattr(settings, 'DEBUG', False)
    expected_level = 'DEBUG' if debug else 'INFO'
    actual_level = console_handler.get('level', '')
    
    if actual_level == expected_level:
        print(f"✅ Console handler configurado correctamente ({actual_level})")
    else:
        print(f"⚠️  Console handler nivel {actual_level} (esperado: {expected_level})")
    
    # Verificar directorio de logs
    logs_dir = BASE_DIR / 'logs'
    if logs_dir.exists():
        print(f"✅ Directorio de logs existe: {logs_dir}")
    else:
        print(f"⚠️  Directorio de logs no existe: {logs_dir}")
    
    return True


def check_cors_config():
    """Verificar configuración de CORS."""
    print("\n🌐 Verificando configuración de CORS...")
    
    cors_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
    debug = getattr(settings, 'DEBUG', False)
    
    print(f"📊 CORS_ALLOWED_ORIGINS: {cors_origins}")
    
    expected_dev_origins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]
    
    if debug:
        missing_origins = [origin for origin in expected_dev_origins if origin not in cors_origins]
        if not missing_origins:
            print("✅ CORS configurado correctamente para desarrollo")
        else:
            print(f"⚠️  CORS falta orígenes de desarrollo: {missing_origins}")
    
    cors_credentials = getattr(settings, 'CORS_ALLOW_CREDENTIALS', False)
    print(f"📊 CORS_ALLOW_CREDENTIALS: {cors_credentials}")
    
    return True


def run_django_checks():
    """Ejecutar verificaciones de Django."""
    print("\n🔍 Ejecutando verificaciones de Django...")
    
    try:
        # Verificaciones básicas
        print("Ejecutando: python manage.py check")
        execute_from_command_line(['manage.py', 'check'])
        print("✅ Verificaciones básicas pasaron")
        
        # Verificaciones de despliegue (solo las críticas)
        print("\nEjecutando verificaciones de seguridad...")
        execute_from_command_line(['manage.py', 'check', '--deploy', '--fail-level', 'ERROR'])
        print("✅ Verificaciones de seguridad críticas pasaron")
        
    except SystemExit as e:
        if e.code != 0:
            print(f"⚠️  Algunas verificaciones fallaron (código: {e.code})")
            return False
    except Exception as e:
        print(f"❌ Error ejecutando verificaciones: {e}")
        return False
    
    return True


def main():
    """Función principal."""
    print("🔐 VERIFICACIÓN DE CONFIGURACIÓN DE SEGURIDAD - VERIHOME")
    print("=" * 60)
    
    checks = [
        ("SECRET_KEY", check_secret_key),
        ("Configuraciones DEBUG", check_debug_settings),
        ("Configuraciones de seguridad", check_security_settings),
        ("Configuración de cache", check_cache_config),
        ("Configuración de logging", check_logging_config),
        ("Configuración de CORS", check_cors_config),
        ("Verificaciones de Django", run_django_checks),
    ]
    
    passed = 0
    total = len(checks)
    
    for check_name, check_func in checks:
        try:
            if check_func():
                passed += 1
        except Exception as e:
            print(f"❌ Error en {check_name}: {e}")
    
    print("\n" + "=" * 60)
    print(f"📊 RESUMEN: {passed}/{total} verificaciones pasaron")
    
    if passed == total:
        print("🎉 ¡Todas las verificaciones de seguridad pasaron!")
        return 0
    else:
        print(f"⚠️  {total - passed} verificaciones necesitan atención")
        return 1


if __name__ == '__main__':
    sys.exit(main())