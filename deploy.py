#!/usr/bin/env python3
"""
Script de despliegue para VeriHome.
Automatiza el proceso completo de build y deploy.
"""

import os
import subprocess
import sys
import argparse
from pathlib import Path

def run_command(command, cwd=None, check=True):
    """Ejecuta un comando y maneja errores."""
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, check=check, capture_output=True, text=True)
        print(f"✅ {command}")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Error ejecutando: {command}")
        print(f"Error: {e.stderr}")
        if check:
            sys.exit(1)
        return None

def check_requirements():
    """Verifica que estén instaladas las dependencias necesarias."""
    print("🔍 Verificando dependencias...")
    
    # Verificar Python
    try:
        subprocess.run(["python", "--version"], check=True, capture_output=True)
        print("✅ Python encontrado")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Python no encontrado")
        sys.exit(1)
    
    # Verificar Node.js
    try:
        subprocess.run(["node", "--version"], check=True, capture_output=True)
        print("✅ Node.js encontrado")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ Node.js no encontrado")
        sys.exit(1)
    
    # Verificar npm
    try:
        subprocess.run(["npm", "--version"], check=True, capture_output=True)
        print("✅ npm encontrado")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ npm no encontrado")
        sys.exit(1)

def build_frontend():
    """Construye el frontend."""
    print("🔨 Construyendo frontend...")
    run_command("npm run build", cwd="frontend")

def collect_static():
    """Recolecta archivos estáticos."""
    print("📁 Recolectando archivos estáticos...")
    run_command("python manage.py collectstatic --noinput")

def run_migrations():
    """Ejecuta las migraciones."""
    print("🗄️ Ejecutando migraciones...")
    run_command("python manage.py migrate")

def build_docker():
    """Construye la imagen de Docker."""
    print("🐳 Construyendo imagen de Docker...")
    run_command("docker-compose build")

def start_services():
    """Inicia los servicios con Docker Compose."""
    print("🚀 Iniciando servicios...")
    run_command("docker-compose up -d")

def stop_services():
    """Detiene los servicios."""
    print("🛑 Deteniendo servicios...")
    run_command("docker-compose down")

def show_logs():
    """Muestra los logs de los servicios."""
    print("📋 Mostrando logs...")
    run_command("docker-compose logs -f", check=False)

def clean_build():
    """Limpia archivos de build."""
    print("🧹 Limpiando archivos de build...")
    
    # Limpiar build del frontend
    frontend_build = Path("staticfiles/frontend")
    if frontend_build.exists():
        import shutil
        shutil.rmtree(frontend_build)
        print("✅ Build del frontend limpiado")
    
    # Limpiar archivos estáticos recolectados
    staticfiles = Path("staticfiles")
    if staticfiles.exists():
        for item in staticfiles.iterdir():
            if item.is_file():
                item.unlink()
            elif item.is_dir() and item.name != "frontend":
                import shutil
                shutil.rmtree(item)
        print("✅ Archivos estáticos limpiados")

def main():
    parser = argparse.ArgumentParser(description="Script de despliegue para VeriHome")
    parser.add_argument('action', choices=[
        'check', 'build', 'deploy', 'start', 'stop', 'logs', 'clean', 'full'
    ], help='Acción a ejecutar')
    
    args = parser.parse_args()
    
    # Verificar que estamos en el directorio correcto
    if not Path('manage.py').exists():
        print("❌ No se encontró manage.py. Asegúrate de estar en el directorio raíz del proyecto.")
        sys.exit(1)
    
    if args.action == 'check':
        check_requirements()
    elif args.action == 'build':
        check_requirements()
        build_frontend()
        collect_static()
    elif args.action == 'deploy':
        check_requirements()
        build_frontend()
        collect_static()
        run_migrations()
        build_docker()
        start_services()
        print("\n🎉 ¡Despliegue completado!")
        print("📱 Aplicación disponible en: http://localhost")
        print("🔧 Admin: http://localhost/admin")
    elif args.action == 'start':
        start_services()
    elif args.action == 'stop':
        stop_services()
    elif args.action == 'logs':
        show_logs()
    elif args.action == 'clean':
        clean_build()
    elif args.action == 'full':
        check_requirements()
        clean_build()
        build_frontend()
        collect_static()
        run_migrations()
        build_docker()
        stop_services()
        start_services()
        print("\n🎉 ¡Despliegue completo finalizado!")
        print("📱 Aplicación disponible en: http://localhost")
        print("🔧 Admin: http://localhost/admin")

if __name__ == "__main__":
    main() 