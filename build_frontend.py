#!/usr/bin/env python3
"""
Script para construir el frontend React y prepararlo para Django.
"""

import os
import subprocess
import shutil
import sys
from pathlib import Path

def run_command(command, cwd=None):
    """Ejecuta un comando y maneja errores."""
    try:
        result = subprocess.run(command, shell=True, cwd=cwd, check=True, capture_output=True, text=True)
        print(f"✅ {command}")
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"❌ Error ejecutando: {command}")
        print(f"Error: {e.stderr}")
        sys.exit(1)

def main():
    # Obtener la ruta del proyecto
    project_root = Path(__file__).parent
    frontend_dir = project_root / 'frontend'
    staticfiles_dir = project_root / 'staticfiles'
    
    print("🚀 Iniciando build del frontend...")
    
    # Verificar que existe el directorio frontend
    if not frontend_dir.exists():
        print("❌ No se encontró el directorio frontend")
        sys.exit(1)
    
    # Verificar que existe package.json
    package_json = frontend_dir / 'package.json'
    if not package_json.exists():
        print("❌ No se encontró package.json en el directorio frontend")
        sys.exit(1)
    
    # Instalar dependencias si no existen
    node_modules = frontend_dir / 'node_modules'
    if not node_modules.exists():
        print("📦 Instalando dependencias...")
        run_command("npm install", cwd=frontend_dir)
    else:
        print("✅ Dependencias ya instaladas")
    
    # Limpiar build anterior
    frontend_build_dir = staticfiles_dir / 'frontend'
    if frontend_build_dir.exists():
        print("🧹 Limpiando build anterior...")
        shutil.rmtree(frontend_build_dir)
    
    # Construir el frontend
    print("🔨 Construyendo frontend...")
    run_command("npm run build", cwd=frontend_dir)
    
    # Verificar que se creó el build
    if not frontend_build_dir.exists():
        print("❌ No se generó el directorio de build")
        sys.exit(1)
    
    print("✅ Build completado exitosamente!")
    print(f"📁 Frontend disponible en: {frontend_build_dir}")
    
    # Información adicional
    print("\n📋 Para ejecutar en desarrollo:")
    print("  1. Terminal 1: python manage.py runserver")
    print("  2. Terminal 2: cd frontend && npm run dev")
    print("\n📋 Para ejecutar en producción:")
    print("  1. python manage.py collectstatic")
    print("  2. python manage.py runserver")

if __name__ == "__main__":
    main() 