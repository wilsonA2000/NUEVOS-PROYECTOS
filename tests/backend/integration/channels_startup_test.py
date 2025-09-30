#!/usr/bin/env python
"""
Test básico para verificar que Django Channels está funcionando.
"""

import os
import sys
import django
from pathlib import Path

# Configurar Django
BASE_DIR = Path(__file__).resolve().parent
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
sys.path.insert(0, str(BASE_DIR))

django.setup()

def test_channels():
    """Test rápido de Channels."""
    print("🧪 TESTING DJANGO CHANNELS")
    print("=" * 40)
    
    try:
        # Test 1: Verificar que channels está instalado
        import channels
        print(f"✅ Channels version: {channels.__version__}")
        
        # Test 2: Verificar configuración ASGI
        from django.conf import settings
        if hasattr(settings, 'ASGI_APPLICATION'):
            print(f"✅ ASGI_APPLICATION: {settings.ASGI_APPLICATION}")
        else:
            print("❌ ASGI_APPLICATION no configurado")
            return False
        
        # Test 3: Verificar Channel Layers
        if hasattr(settings, 'CHANNEL_LAYERS'):
            backend = settings.CHANNEL_LAYERS['default']['BACKEND']
            print(f"✅ CHANNEL_LAYERS: {backend}")
        else:
            print("❌ CHANNEL_LAYERS no configurado")
            return False
        
        # Test 4: Probar Channel Layer
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        
        if channel_layer:
            print(f"✅ Channel Layer: {channel_layer.__class__.__name__}")
        else:
            print("❌ Channel Layer no disponible")
            return False
        
        # Test 5: Test básico de funcionamiento
        import asyncio
        
        async def basic_test():
            try:
                channel = await channel_layer.new_channel()
                await channel_layer.send(channel, {
                    'type': 'test.message',
                    'text': 'Hello Channels!'
                })
                message = await channel_layer.receive(channel)
                return message.get('text') == 'Hello Channels!'
            except Exception as e:
                print(f"❌ Error en test básico: {e}")
                return False
        
        # Ejecutar test async
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        success = loop.run_until_complete(basic_test())
        loop.close()
        
        if success:
            print("✅ Test básico de Channel Layer exitoso")
        else:
            print("❌ Test básico de Channel Layer falló")
            
        return success
        
    except Exception as e:
        print(f"❌ Error durante testing: {e}")
        return False

def main():
    success = test_channels()
    
    if success:
        print("\n🎉 DJANGO CHANNELS CONFIGURADO CORRECTAMENTE")
        print("\n📝 Resumen:")
        print("   ✅ Channels instalado y funcionando")
        print("   ✅ ASGI configurado correctamente")
        print("   ✅ Channel Layers funcionando")
        print("   ✅ Tests básicos pasando")
        
        print("\n🚀 Para iniciar el servidor:")
        print("   python manage.py runserver")
        
        print("\n🌐 URLs disponibles:")
        print("   Frontend: http://localhost:8000/")
        print("   Admin: http://localhost:8000/admin/")
        print("   API: http://localhost:8000/api/v1/")
        
        print("\n🔌 WebSocket endpoints:")
        print("   ws://localhost:8000/ws/messaging/")
        print("   ws://localhost:8000/ws/notifications/")
        
    else:
        print("\n❌ HAY PROBLEMAS CON LA CONFIGURACIÓN")
        print("Revisa los errores anteriores.")
    
    return success

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)