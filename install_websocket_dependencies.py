#!/usr/bin/env python
"""
Script para instalar todas las dependencias necesarias para el sistema WebSocket
de mensajería en tiempo real en VeriHome.
"""

import subprocess
import sys
import os

def run_command(command, description):
    """Ejecuta un comando y maneja errores."""
    print(f"\n{'='*60}")
    print(f"🔧 {description}")
    print(f"{'='*60}")
    print(f"Ejecutando: {command}")
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        print("✅ Completado exitosamente")
        if result.stdout:
            print(f"Salida: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Error: {e}")
        if e.stdout:
            print(f"Salida: {e.stdout}")
        if e.stderr:
            print(f"Error: {e.stderr}")
        return False

def check_python_version():
    """Verifica la versión de Python."""
    version = sys.version_info
    if version.major != 3 or version.minor < 8:
        print("❌ Se requiere Python 3.8 o superior")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} detectado")
    return True

def install_backend_dependencies():
    """Instala dependencias del backend Django."""
    print("\n🐍 INSTALANDO DEPENDENCIAS DEL BACKEND")
    print("="*60)
    
    dependencies = [
        "channels>=4.0.0",
        "channels-redis>=4.1.0", 
        "redis>=4.5.0",
        "daphne>=4.0.0",
        "asgiref>=3.6.0",
    ]
    
    success = True
    for dep in dependencies:
        if not run_command(f"pip install {dep}", f"Instalando {dep}"):
            success = False
    
    return success

def install_frontend_dependencies():
    """Instala dependencias del frontend React."""
    print("\n⚛️  INSTALANDO DEPENDENCIAS DEL FRONTEND")
    print("="*60)
    
    frontend_dir = "./frontend"
    
    if not os.path.exists(frontend_dir):
        print(f"❌ Directorio {frontend_dir} no encontrado")
        return False
    
    os.chdir(frontend_dir)
    
    dependencies = [
        "date-fns@^2.29.0",  # Para formateo de fechas
        "@types/ws@^8.5.0",  # TypeScript definitions para WebSocket
    ]
    
    success = True
    for dep in dependencies:
        if not run_command(f"npm install {dep}", f"Instalando {dep}"):
            success = False
    
    os.chdir("..")
    return success

def create_redis_config():
    """Crea archivo de configuración para Redis."""
    print("\n🔧 CONFIGURANDO REDIS")
    print("="*60)
    
    redis_config = """# Configuración de Redis para VeriHome WebSocket
# Archivo: redis.conf

# Puerto por defecto
port 6379

# Bind a localhost para desarrollo
bind 127.0.0.1

# Configuración de memoria
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistencia
save 900 1
save 300 10
save 60 10000

# Logging
loglevel notice
logfile ""

# Configuraciones para WebSocket
timeout 0
tcp-keepalive 300

# Configuración para development
protected-mode no
"""
    
    try:
        with open("redis.conf", "w") as f:
            f.write(redis_config)
        print("✅ Archivo redis.conf creado")
        return True
    except Exception as e:
        print(f"❌ Error creando redis.conf: {e}")
        return False

def create_env_template():
    """Crea template para variables de entorno."""
    print("\n📝 CREANDO TEMPLATE DE VARIABLES DE ENTORNO")
    print("="*60)
    
    env_template = """# Variables de entorno para WebSocket en VeriHome
# Copia este archivo como .env y configura los valores

# Redis Configuration
REDIS_URL=redis://localhost:6379

# WebSocket Configuration  
WEBSOCKET_ENABLED=True
WEBSOCKET_HEARTBEAT_INTERVAL=30
WEBSOCKET_RECONNECT_ATTEMPTS=5

# Channels Configuration
CHANNEL_LAYERS_BACKEND=channels_redis.core.RedisChannelLayer
CHANNEL_LAYERS_CAPACITY=1500
CHANNEL_LAYERS_EXPIRY=60

# Development vs Production
DEBUG=True
ENVIRONMENT=development

# Notification Settings
NOTIFICATIONS_ENABLED=True
PUSH_NOTIFICATIONS_ENABLED=True
"""
    
    try:
        with open(".env.websocket.template", "w") as f:
            f.write(env_template)
        print("✅ Template .env.websocket.template creado")
        print("🔔 Renombra a .env y configura según tu entorno")
        return True
    except Exception as e:
        print(f"❌ Error creando template: {e}")
        return False

def verify_installation():
    """Verifica que las dependencias estén instaladas correctamente."""
    print("\n🔍 VERIFICANDO INSTALACIÓN")
    print("="*60)
    
    # Verificar dependencias de Python
    python_deps = [
        "channels",
        "channels_redis", 
        "redis",
        "daphne",
    ]
    
    success = True
    for dep in python_deps:
        try:
            __import__(dep)
            print(f"✅ {dep} instalado correctamente")
        except ImportError:
            print(f"❌ {dep} no encontrado")
            success = False
    
    return success

def print_next_steps():
    """Imprime los siguientes pasos."""
    print("\n🎉 INSTALACIÓN COMPLETADA")
    print("="*60)
    print("""
SIGUIENTES PASOS:

1. 📋 Configurar variables de entorno:
   - Renombra .env.websocket.template a .env
   - Configura REDIS_URL y otras variables según tu entorno

2. 🔴 Iniciar Redis:
   - Con Docker: docker run -p 6379:6379 redis:alpine
   - Con Redis local: redis-server redis.conf

3. 🔄 Aplicar migraciones:
   python manage.py migrate

4. 🚀 Iniciar el servidor con ASGI:
   - Desarrollo: python manage.py runserver
   - Producción: daphne verihome.asgi:application

5. ⚛️  Iniciar frontend:
   cd frontend && npm start

6. 🧪 Probar WebSocket:
   - Abre la aplicación en dos pestañas
   - Envía mensajes para verificar tiempo real
   - Revisa la consola para logs de conexión

7. 📊 Monitorear Redis:
   redis-cli monitor

COMPONENTES DISPONIBLES:
- useWebSocket: Hook genérico para conexiones WebSocket
- useRealTimeMessages: Hook especializado para mensajería
- useRealTimeNotifications: Hook para notificaciones push
- RealTimeMessageList: Lista de mensajes con tiempo real
- RealTimeChatWindow: Ventana de chat instantáneo
- RealTimeNotificationCenter: Centro de notificaciones

RUTAS WEBSOCKET:
- ws://localhost:8000/ws/messaging/ - Mensajería general
- ws://localhost:8000/ws/notifications/ - Notificaciones
- ws://localhost:8000/ws/messaging/thread/<id>/ - Conversación específica
- ws://localhost:8000/ws/user-status/ - Estados de usuario

¡VeriHome WebSocket está listo para usar! 🎊
""")

def main():
    """Función principal."""
    print("🏠 INSTALADOR DE WEBSOCKET PARA VERIHOME")
    print("="*60)
    print("Este script instalará todas las dependencias necesarias")
    print("para el sistema de mensajería en tiempo real con WebSocket.")
    
    if not check_python_version():
        sys.exit(1)
    
    steps = [
        (install_backend_dependencies, "Dependencias del Backend"),
        (install_frontend_dependencies, "Dependencias del Frontend"),
        (create_redis_config, "Configuración de Redis"),
        (create_env_template, "Template de Variables de Entorno"),
        (verify_installation, "Verificación de Instalación"),
    ]
    
    failed_steps = []
    
    for step_func, step_name in steps:
        if not step_func():
            failed_steps.append(step_name)
    
    if failed_steps:
        print(f"\n❌ Pasos fallidos: {', '.join(failed_steps)}")
        print("🔧 Revisa los errores anteriores y ejecuta nuevamente")
        sys.exit(1)
    
    print_next_steps()

if __name__ == "__main__":
    main()