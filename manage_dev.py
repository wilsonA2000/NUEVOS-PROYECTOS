#!/usr/bin/env python3
"""
Script de gestión para desarrollo de VeriHome.
Facilita las tareas comunes de desarrollo.
"""

import os
import subprocess
import sys
import argparse
from pathlib import Path

def run_command(command, cwd=None, background=False):
    """Ejecuta un comando."""
    try:
        if background:
            subprocess.Popen(command, shell=True, cwd=cwd)
            print(f"🚀 Ejecutando en background: {command}")
        else:
            result = subprocess.run(command, shell=True, cwd=cwd, check=True)
            print(f"✅ Comando completado: {command}")
            return result
    except subprocess.CalledProcessError as e:
        print(f"❌ Error ejecutando: {command}")
        sys.exit(1)

def install_dependencies():
    """Instala las dependencias del proyecto."""
    print("📦 Instalando dependencias...")
    
    # Instalar dependencias de Python
    run_command("pip install -r requirements.txt")
    
    # Instalar dependencias de Node.js
    run_command("npm install", cwd="frontend")

def build_frontend():
    """Construye el frontend."""
    print("🔨 Construyendo frontend...")
    run_command("npm run build", cwd="frontend")

def run_django():
    """Ejecuta el servidor de Django."""
    print("🐍 Iniciando servidor Django...")
    run_command("python manage.py runserver", background=True)

def run_frontend_dev():
    """Ejecuta el servidor de desarrollo del frontend."""
    print("⚛️ Iniciando servidor de desarrollo del frontend...")
    run_command("npm run dev", cwd="frontend", background=True)

def run_both():
    """Ejecuta tanto Django como el frontend en desarrollo."""
    print("🚀 Iniciando ambos servidores...")
    run_django()
    run_frontend_dev()
    print("\n✅ Servidores iniciados!")
    print("📱 Frontend: http://localhost:3000")
    print("🐍 Backend: http://localhost:8000")
    print("🔧 Admin: http://localhost:8000/admin")
    print("\nPresiona Ctrl+C para detener ambos servidores")

def collect_static():
    """Recolecta archivos estáticos."""
    print("📁 Recolectando archivos estáticos...")
    run_command("python manage.py collectstatic --noinput")

def migrate():
    """Ejecuta las migraciones."""
    print("🗄️ Ejecutando migraciones...")
    run_command("python manage.py migrate")

def create_superuser():
    """Crea un superusuario."""
    print("👤 Creando superusuario...")
    run_command("python manage.py createsuperuser")

def shell():
    """Abre el shell de Django."""
    print("🐍 Abriendo shell de Django...")
    run_command("python manage.py shell")

def test():
    """Ejecuta las pruebas."""
    print("🧪 Ejecutando pruebas...")
    run_command("python manage.py test")

def main():
    parser = argparse.ArgumentParser(description="Script de gestión para VeriHome")
    parser.add_argument('command', choices=[
        'install', 'build', 'django', 'frontend', 'both', 
        'static', 'migrate', 'superuser', 'shell', 'test'
    ], help='Comando a ejecutar')
    
    args = parser.parse_args()
    
    # Verificar que estamos en el directorio correcto
    if not Path('manage.py').exists():
        print("❌ No se encontró manage.py. Asegúrate de estar en el directorio raíz del proyecto.")
        sys.exit(1)
    
    if args.command == 'install':
        install_dependencies()
    elif args.command == 'build':
        build_frontend()
    elif args.command == 'django':
        run_django()
    elif args.command == 'frontend':
        run_frontend_dev()
    elif args.command == 'both':
        run_both()
    elif args.command == 'static':
        collect_static()
    elif args.command == 'migrate':
        migrate()
    elif args.command == 'superuser':
        create_superuser()
    elif args.command == 'shell':
        shell()
    elif args.command == 'test':
        test()

if __name__ == "__main__":
    main() 