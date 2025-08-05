#!/usr/bin/env python
"""
Script de verificación para Django Channels en VeriHome
Verifica que todas las dependencias y configuraciones estén correctas.
"""

import os
import sys
import django
from pathlib import Path

# Configurar Django
BASE_DIR = Path(__file__).resolve().parent
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
sys.path.insert(0, str(BASE_DIR))

def check_dependencies():
    """Verificar que todas las dependencias estén instaladas."""
    print("🔍 Verificando dependencias...")
    
    dependencies = [
        ('channels', 'Django Channels'),
        ('channels_redis', 'Channels Redis'),
        ('redis', 'Redis Python Client'),
        ('daphne', 'Daphne ASGI Server'),
    ]
    
    missing = []
    for module, name in dependencies:
        try:
            __import__(module)
            print(f"   ✅ {name} - Instalado")
        except ImportError:
            print(f"   ❌ {name} - NO INSTALADO")
            missing.append(module)
    
    if missing:
        print(f"\n⚠️  Dependencias faltantes: {', '.join(missing)}")
        print("Instala con: pip install " + " ".join(missing))
        return False
    
    print("✅ Todas las dependencias están instaladas\n")
    return True

def check_django_setup():
    """Verificar configuración de Django."""
    print("🔍 Verificando configuración de Django...")
    
    try:
        django.setup()
        from django.conf import settings
        
        # Verificar INSTALLED_APPS
        if 'channels' in settings.INSTALLED_APPS:
            print("   ✅ 'channels' en INSTALLED_APPS")
        else:
            print("   ❌ 'channels' NO está en INSTALLED_APPS")
            return False
        
        # Verificar ASGI_APPLICATION
        if hasattr(settings, 'ASGI_APPLICATION'):
            print(f"   ✅ ASGI_APPLICATION: {settings.ASGI_APPLICATION}")
        else:
            print("   ❌ ASGI_APPLICATION no configurado")
            return False
        
        # Verificar CHANNEL_LAYERS
        if hasattr(settings, 'CHANNEL_LAYERS'):
            backend = settings.CHANNEL_LAYERS['default']['BACKEND']
            print(f"   ✅ CHANNEL_LAYERS: {backend}")
        else:
            print("   ❌ CHANNEL_LAYERS no configurado")
            return False
        
        print("✅ Configuración de Django correcta\n")
        return True
        
    except Exception as e:
        print(f"   ❌ Error en configuración de Django: {e}")
        return False

def check_redis_connection():
    """Verificar conexión a Redis."""
    print("🔍 Verificando conexión a Redis...")
    
    try:
        import redis
        from django.conf import settings
        
        # Obtener URL de Redis de settings
        redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379')
        
        # Probar conexión
        r = redis.from_url(redis_url)
        r.ping()
        
        print(f"   ✅ Redis conectado en: {redis_url}")
        print("   ✅ Se usará RedisChannelLayer")
        return True
        
    except Exception as e:
        print(f"   ⚠️  Redis no disponible: {e}")
        print("   🔄 Se usará InMemoryChannelLayer como fallback")
        return False

def check_asgi_file():
    """Verificar archivo ASGI."""
    print("🔍 Verificando archivo ASGI...")
    
    asgi_file = BASE_DIR / 'verihome' / 'asgi.py'
    
    if not asgi_file.exists():
        print("   ❌ verihome/asgi.py no existe")
        return False
    
    # Leer contenido del archivo ASGI
    content = asgi_file.read_text()
    
    required_imports = [
        'ProtocolTypeRouter',
        'AuthMiddlewareStack',
        'URLRouter'
    ]
    
    for import_name in required_imports:
        if import_name in content:
            print(f"   ✅ {import_name} importado")
        else:
            print(f"   ❌ {import_name} NO importado")
            return False
    
    print("✅ Archivo ASGI configurado correctamente\n")
    return True

def check_routing_file():
    """Verificar archivo de routing de WebSocket."""
    print("🔍 Verificando routing de WebSocket...")
    
    routing_file = BASE_DIR / 'messaging' / 'routing.py'
    
    if routing_file.exists():
        print(f"   ✅ messaging/routing.py existe")
        return True
    else:
        print(f"   ⚠️  messaging/routing.py no existe")
        print("   💡 Se puede crear posteriormente para WebSocket routing")
        return True

def test_channel_layer():
    """Probar el channel layer."""
    print("🔍 Probando Channel Layer...")
    
    try:
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        
        if channel_layer is None:
            print("   ❌ Channel Layer no está configurado")
            return False
        
        backend_name = channel_layer.__class__.__name__
        print(f"   ✅ Channel Layer activo: {backend_name}")
        
        # Intentar un test básico
        import asyncio
        
        async def test_send_receive():
            channel_name = await channel_layer.new_channel()
            await channel_layer.send(channel_name, {
                'type': 'test.message',
                'text': 'Hello World'
            })
            message = await channel_layer.receive(channel_name)
            return message.get('text') == 'Hello World'
        
        # Ejecutar test
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(test_send_receive())
        loop.close()
        
        if result:
            print("   ✅ Test de envío/recepción exitoso")
        else:
            print("   ❌ Test de envío/recepción falló")
            return False
        
        print("✅ Channel Layer funcionando correctamente\n")
        return True
        
    except Exception as e:
        print(f"   ❌ Error probando Channel Layer: {e}")
        return False

def print_summary():
    """Imprimir resumen final."""
    print("=" * 60)
    print("📋 RESUMEN DE VERIFICACIÓN")
    print("=" * 60)
    
    print("\n✅ Django Channels está configurado correctamente")
    print("\n🚀 Para iniciar el servidor ASGI:")
    print("   python manage.py runserver")
    print("   o")
    print("   daphne -p 8000 verihome.asgi:application")
    
    print("\n🔗 URLs de WebSocket disponibles:")
    print("   ws://localhost:8000/ws/messaging/")
    print("   ws://localhost:8000/ws/notifications/")
    
    print("\n💡 Comandos útiles:")
    print("   # Verificar configuración")
    print("   python manage.py check")
    print("   ")
    print("   # Iniciar con Daphne (recomendado para WebSocket)")
    print("   daphne verihome.asgi:application")
    
    print("\n📚 Documentación:")
    print("   Django Channels: https://channels.readthedocs.io/")
    print("   Redis: https://redis.io/docs/")

def main():
    """Función principal."""
    print("🎉 VERIFICACIÓN DE DJANGO CHANNELS - VERIHOME")
    print("=" * 60)
    
    checks = [
        check_dependencies(),
        check_django_setup(),
        check_redis_connection(),
        check_asgi_file(),
        check_routing_file(),
        test_channel_layer(),
    ]
    
    if all(checks):
        print_summary()
        return True
    else:
        print("\n❌ Hay problemas en la configuración")
        print("Revisa los errores anteriores y corrige antes de continuar")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)