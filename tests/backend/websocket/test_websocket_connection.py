#!/usr/bin/env python3
"""
Test WebSocket Connection para VeriHome
Prueba las conexiones WebSocket sin necesidad de wscat
"""

import asyncio
import websockets
import json
import sys
from datetime import datetime

class WebSocketTester:
    """Clase para probar conexiones WebSocket."""
    
    def __init__(self, base_url="ws://localhost:8000"):
        self.base_url = base_url
        self.results = []
    
    def log_result(self, endpoint, status, message=""):
        """Registra resultado de test."""
        icon = "✅" if status else "❌"
        result = f"{icon} {endpoint}: {message}"
        print(result)
        self.results.append({
            'endpoint': endpoint,
            'status': status,
            'message': message,
            'timestamp': datetime.now().isoformat()
        })
    
    async def test_websocket_endpoint(self, endpoint, test_message=None):
        """Prueba un endpoint WebSocket específico."""
        uri = f"{self.base_url}{endpoint}"
        
        try:
            # Intentar conectar con timeout
            async with websockets.connect(uri, timeout=5) as websocket:
                self.log_result(endpoint, True, "Conectado exitosamente")
                
                # Enviar mensaje de prueba si se proporciona
                if test_message:
                    await websocket.send(json.dumps(test_message))
                    self.log_result(endpoint, True, f"Mensaje enviado: {test_message.get('type', 'unknown')}")
                    
                    # Intentar recibir respuesta
                    try:
                        response = await asyncio.wait_for(websocket.recv(), timeout=3.0)
                        response_data = json.loads(response)
                        self.log_result(endpoint, True, f"Respuesta: {response_data.get('type', 'unknown')}")
                    except asyncio.TimeoutError:
                        self.log_result(endpoint, True, "Sin respuesta (timeout)")
                    except json.JSONDecodeError:
                        self.log_result(endpoint, True, "Respuesta recibida (no JSON)")
                
                return True
                
        except websockets.exceptions.ConnectionClosed:
            self.log_result(endpoint, False, "Conexión cerrada por el servidor")
            return False
        except websockets.exceptions.InvalidStatusCode as e:
            self.log_result(endpoint, False, f"Estado HTTP inválido: {e.status_code}")
            return False
        except ConnectionRefusedError:
            self.log_result(endpoint, False, "Conexión rechazada - servidor no disponible")
            return False
        except asyncio.TimeoutError:
            self.log_result(endpoint, False, "Timeout de conexión")
            return False
        except Exception as e:
            self.log_result(endpoint, False, f"Error: {str(e)}")
            return False
    
    async def test_all_endpoints(self):
        """Prueba todos los endpoints WebSocket."""
        print("🔌 PROBANDO CONEXIONES WEBSOCKET")
        print("=" * 50)
        
        # Endpoints a probar
        endpoints_to_test = [
            {
                'endpoint': '/ws/messaging/',
                'test_message': {
                    'type': 'ping',
                    'timestamp': datetime.now().isoformat()
                }
            },
            {
                'endpoint': '/ws/notifications/',
                'test_message': {
                    'type': 'ping'
                }
            },
            {
                'endpoint': '/ws/user-status/',
                'test_message': {
                    'type': 'heartbeat',
                    'timestamp': datetime.now().isoformat()
                }
            },
            # Nota: /ws/messaging/thread/1/ requiere autenticación específica
        ]
        
        successful_tests = 0
        total_tests = len(endpoints_to_test)
        
        for test_config in endpoints_to_test:
            endpoint = test_config['endpoint']
            test_message = test_config.get('test_message')
            
            print(f"\n🧪 Probando: {endpoint}")
            success = await self.test_websocket_endpoint(endpoint, test_message)
            
            if success:
                successful_tests += 1
        
        # Resumen
        print("\n" + "=" * 50)
        print("📊 RESUMEN DE PRUEBAS WEBSOCKET")
        print("=" * 50)
        print(f"✅ Exitosas: {successful_tests}")
        print(f"❌ Fallidas: {total_tests - successful_tests}")
        print(f"📈 Tasa de éxito: {(successful_tests/total_tests)*100:.1f}%")
        
        if successful_tests == total_tests:
            print("\n🎉 ¡TODAS LAS CONEXIONES WEBSOCKET FUNCIONAN!")
        elif successful_tests > 0:
            print(f"\n⚠️  {total_tests - successful_tests} conexiones fallaron")
            print("💡 Asegúrate de que el servidor Django esté corriendo")
        else:
            print("\n❌ NINGUNA CONEXIÓN WEBSOCKET FUNCIONA")
            print("🔧 Verifica que el servidor esté corriendo en puerto 8000")
        
        return successful_tests == total_tests

async def test_server_availability():
    """Verifica si el servidor está disponible."""
    try:
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            async with session.get('http://localhost:8000/', timeout=5) as response:
                if response.status == 200:
                    print("✅ Servidor HTTP disponible en puerto 8000")
                    return True
                else:
                    print(f"⚠️  Servidor responde con código: {response.status}")
                    return False
    except:
        # Fallback usando websockets para verificar puerto
        try:
            # Intentar conectar a cualquier endpoint WebSocket
            async with websockets.connect("ws://localhost:8000/ws/test/", timeout=2):
                pass
        except websockets.exceptions.InvalidStatusCode:
            # Si obtenemos un error de estado, el servidor está disponible
            print("✅ Servidor disponible en puerto 8000")
            return True
        except:
            print("❌ Servidor no disponible en puerto 8000")
            print("💡 Ejecuta: python manage.py runserver")
            return False

async def main():
    """Función principal."""
    print("🚀 INICIANDO PRUEBAS DE WEBSOCKET PARA VERIHOME")
    print("=" * 60)
    
    # Verificar disponibilidad del servidor
    print("🔍 Verificando disponibilidad del servidor...")
    server_available = await test_server_availability()
    
    if not server_available:
        print("\n💥 No se puede conectar al servidor")
        print("🔧 Soluciones:")
        print("   1. Ejecuta: python manage.py runserver")
        print("   2. Verifica que el puerto 8000 esté libre")
        print("   3. Asegúrate de estar en el directorio correcto")
        sys.exit(1)
    
    # Ejecutar pruebas WebSocket
    tester = WebSocketTester()
    success = await tester.test_all_endpoints()
    
    # Información adicional
    print("\n" + "=" * 50)
    print("💡 INFORMACIÓN ADICIONAL")
    print("=" * 50)
    print("📝 Para usar WebSocket en el frontend:")
    print("   const socket = new WebSocket('ws://localhost:8000/ws/messaging/');")
    print("   socket.onopen = () => console.log('Conectado');")
    print("   socket.onmessage = (event) => console.log(JSON.parse(event.data));")
    
    print("\n🔧 Para debug en navegador:")
    print("   F12 → Console → pegar código JavaScript arriba")
    
    print("\n🌐 URLs útiles:")
    print("   Frontend: http://localhost:8000/")
    print("   Admin: http://localhost:8000/admin/")
    print("   API: http://localhost:8000/api/v1/")
    
    # Código de salida
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⏹️  Pruebas interrumpidas")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n💥 Error fatal: {e}")
        sys.exit(1)