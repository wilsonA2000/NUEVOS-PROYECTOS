#!/usr/bin/env python
"""
Script para configurar Redis para Django Channels en VeriHome
Proporciona instrucciones e opciones para instalar Redis.
"""

import os
import sys
import platform
import subprocess

def detect_system():
    """Detectar el sistema operativo."""
    system = platform.system().lower()
    if system == "linux":
        # Detectar distribución Linux
        try:
            with open('/etc/os-release', 'r') as f:
                content = f.read().lower()
                if 'ubuntu' in content or 'debian' in content:
                    return 'ubuntu'
                elif 'centos' in content or 'rhel' in content:
                    return 'centos'
                elif 'arch' in content:
                    return 'arch'
        except:
            pass
        return 'linux'
    elif system == "darwin":
        return 'macos'
    elif system == "windows":
        return 'windows'
    else:
        return 'unknown'

def install_redis_ubuntu():
    """Instrucciones para instalar Redis en Ubuntu/Debian."""
    print("📦 INSTALACIÓN DE REDIS EN UBUNTU/DEBIAN")
    print("=" * 50)
    
    commands = [
        "sudo apt update",
        "sudo apt install redis-server -y",
        "sudo systemctl start redis-server",
        "sudo systemctl enable redis-server",
        "redis-cli ping"
    ]
    
    print("Ejecuta los siguientes comandos:")
    for cmd in commands:
        print(f"  {cmd}")
    
    print("\n✅ Después de la instalación, Redis estará disponible en:")
    print("   redis://localhost:6379")

def install_redis_macos():
    """Instrucciones para instalar Redis en macOS."""
    print("📦 INSTALACIÓN DE REDIS EN MACOS")
    print("=" * 50)
    
    print("Opción 1 - Homebrew (recomendado):")
    commands_brew = [
        "brew install redis",
        "brew services start redis",
        "redis-cli ping"
    ]
    
    for cmd in commands_brew:
        print(f"  {cmd}")
    
    print("\nOpción 2 - MacPorts:")
    commands_port = [
        "sudo port install redis",
        "sudo port load redis",
        "redis-cli ping"
    ]
    
    for cmd in commands_port:
        print(f"  {cmd}")
    
    print("\n✅ Después de la instalación, Redis estará disponible en:")
    print("   redis://localhost:6379")

def install_redis_windows():
    """Instrucciones para instalar Redis en Windows."""
    print("📦 INSTALACIÓN DE REDIS EN WINDOWS")
    print("=" * 50)
    
    print("Opción 1 - Docker (recomendado):")
    print("  docker run -d -p 6379:6379 --name verihome-redis redis:alpine")
    print("  docker exec -it verihome-redis redis-cli ping")
    
    print("\nOpción 2 - Windows Subsystem for Linux (WSL):")
    print("  # Desde WSL Ubuntu:")
    print("  sudo apt update")
    print("  sudo apt install redis-server -y")
    print("  sudo service redis-server start")
    print("  redis-cli ping")
    
    print("\nOpción 3 - Redis para Windows (no oficial):")
    print("  1. Descargar desde: https://github.com/microsoftarchive/redis/releases")
    print("  2. Extraer e instalar")
    print("  3. Ejecutar redis-server.exe")
    
    print("\n✅ Después de la instalación, Redis estará disponible en:")
    print("   redis://localhost:6379")

def install_redis_docker():
    """Instrucciones para instalar Redis con Docker (universal)."""
    print("🐳 INSTALACIÓN DE REDIS CON DOCKER")
    print("=" * 50)
    
    print("Comando para iniciar Redis:")
    print("  docker run -d \\")
    print("    --name verihome-redis \\")
    print("    -p 6379:6379 \\")
    print("    --restart unless-stopped \\")
    print("    redis:alpine")
    
    print("\nComandos útiles:")
    print("  # Verificar que está corriendo")
    print("  docker ps")
    print("  ")
    print("  # Probar conexión")
    print("  docker exec -it verihome-redis redis-cli ping")
    print("  ")
    print("  # Ver logs")
    print("  docker logs verihome-redis")
    print("  ")
    print("  # Detener")
    print("  docker stop verihome-redis")
    print("  ")
    print("  # Iniciar de nuevo")
    print("  docker start verihome-redis")
    
    print("\n✅ Redis estará disponible en:")
    print("   redis://localhost:6379")

def test_redis_connection():
    """Probar conexión a Redis."""
    print("\n🔍 PROBANDO CONEXIÓN A REDIS")
    print("=" * 50)
    
    try:
        import redis
        
        # Probar conexión
        r = redis.Redis(host='localhost', port=6379, db=0)
        r.ping()
        
        print("✅ Redis está corriendo y accesible")
        
        # Información adicional
        info = r.info()
        print(f"   Versión: {info.get('redis_version', 'Unknown')}")
        print(f"   Modo: {info.get('redis_mode', 'Unknown')}")
        print(f"   Uptime: {info.get('uptime_in_seconds', 0)} segundos")
        
        return True
        
    except redis.ConnectionError:
        print("❌ No se puede conectar a Redis")
        print("   Asegúrate de que Redis esté corriendo en localhost:6379")
        return False
    except ImportError:
        print("❌ El módulo 'redis' no está instalado")
        print("   Instala con: pip install redis")
        return False
    except Exception as e:
        print(f"❌ Error inesperado: {e}")
        return False

def show_no_redis_options():
    """Mostrar opciones cuando Redis no está disponible."""
    print("\n💡 OPCIONES SIN REDIS")
    print("=" * 50)
    
    print("Si no quieres instalar Redis, Django Channels puede funcionar con:")
    print("✅ InMemoryChannelLayer (ya configurado como fallback)")
    print("   - Perfecto para desarrollo")
    print("   - No requiere instalación adicional")
    print("   - Limitado a un solo proceso")
    
    print("\n⚠️  Para producción se recomienda Redis porque:")
    print("   - Soporte para múltiples procesos/servidores")
    print("   - Persistencia de mensajes")
    print("   - Mejor rendimiento")
    print("   - Escalabilidad horizontal")

def main():
    """Función principal."""
    print("🎯 CONFIGURACIÓN DE REDIS PARA DJANGO CHANNELS")
    print("=" * 60)
    
    # Detectar sistema
    system = detect_system()
    print(f"🖥️  Sistema detectado: {system}")
    
    # Probar si Redis ya está disponible
    if test_redis_connection():
        print("\n🎉 ¡Redis ya está configurado y funcionando!")
        print("No necesitas hacer nada más.")
        return
    
    print("\n📋 OPCIONES DE INSTALACIÓN:")
    print("1. Docker (recomendado, funciona en todos los sistemas)")
    print("2. Instalación nativa del sistema")
    print("3. Continuar sin Redis (usar InMemoryChannelLayer)")
    
    try:
        choice = input("\nElige una opción (1-3): ").strip()
        
        if choice == "1":
            install_redis_docker()
        elif choice == "2":
            if system == "ubuntu":
                install_redis_ubuntu()
            elif system == "macos":
                install_redis_macos()
            elif system == "windows":
                install_redis_windows()
            else:
                print(f"Instrucciones específicas para {system} no disponibles.")
                print("Usa la opción Docker o busca instrucciones para tu sistema.")
        elif choice == "3":
            show_no_redis_options()
        else:
            print("Opción no válida.")
            return
        
    except KeyboardInterrupt:
        print("\n\nOperación cancelada.")
        return
    
    print("\n" + "=" * 60)
    print("📚 RECURSOS ADICIONALES:")
    print("   Redis Docs: https://redis.io/docs/")
    print("   Django Channels: https://channels.readthedocs.io/")
    print("   Docker Redis: https://hub.docker.com/_/redis")

if __name__ == '__main__':
    main()