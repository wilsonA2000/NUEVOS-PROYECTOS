#!/usr/bin/env python3
"""
Script para limpiar caché y reiniciar servidores de VeriHome
"""

import os
import sys
import subprocess
import time
import shutil

def print_step(message):
    print(f"\n🔧 {message}")
    print("-" * 50)

def run_command(command, description):
    print(f"📋 {description}")
    print(f"Comando: {command}")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ {description} - Exitoso")
            if result.stdout:
                print(f"Salida: {result.stdout.strip()}")
        else:
            print(f"❌ {description} - Error")
            if result.stderr:
                print(f"Error: {result.stderr.strip()}")
    except Exception as e:
        print(f"❌ Error ejecutando comando: {e}")

def main():
    print("🚀 LIMPIANDO CACHÉ Y REINICIANDO SERVIDORES DE VERIHOME")
    print("=" * 60)
    
    # 1. Detener servidores si están corriendo
    print_step("Deteniendo servidores existentes...")
    run_command("taskkill /f /im python.exe", "Deteniendo procesos Python")
    run_command("taskkill /f /im node.exe", "Deteniendo procesos Node.js")
    
    # 2. Limpiar caché de Python
    print_step("Limpiando caché de Python...")
    run_command("python -Bc \"import compileall; compileall.compile_dir('.', force=True)\"", "Compilando archivos Python")
    
    # 3. Limpiar archivos temporales
    print_step("Limpiando archivos temporales...")
    temp_dirs = [
        "__pycache__",
        "*.pyc",
        "*.pyo",
        "*.pyd",
        ".pytest_cache",
        ".coverage",
        "htmlcov"
    ]
    
    for pattern in temp_dirs:
        run_command(f"del /s /q {pattern} 2>nul", f"Eliminando {pattern}")
    
    # 4. Limpiar caché de npm
    print_step("Limpiando caché de npm...")
    run_command("cd frontend && npm cache clean --force", "Limpiando caché de npm")
    run_command("cd frontend && rmdir /s /q node_modules 2>nul", "Eliminando node_modules")
    run_command("cd frontend && npm install", "Reinstalando dependencias")
    
    # 5. Limpiar build de Vite
    print_step("Limpiando build de Vite...")
    run_command("cd frontend && rmdir /s /q dist 2>nul", "Eliminando carpeta dist")
    
    # 6. Limpiar caché de Django
    print_step("Limpiando caché de Django...")
    run_command("python manage.py collectstatic --noinput", "Recolectando archivos estáticos")
    run_command("python manage.py migrate", "Ejecutando migraciones")
    
    # 7. Crear usuario de prueba
    print_step("Creando usuario de prueba...")
    run_command("python create_test_user.py", "Creando usuario de prueba")
    
    print("\n✅ LIMPIEZA COMPLETADA")
    print("\n📋 PRÓXIMOS PASOS:")
    print("1. Abre una nueva terminal y ejecuta: python manage.py runserver")
    print("2. Abre otra terminal y ejecuta: cd frontend && npm run dev")
    print("3. Abre el navegador en: http://localhost:3000")
    print("4. Intenta iniciar sesión con:")
    print("   - Email: test@verihome.com")
    print("   - Contraseña: test123")
    print("5. Presiona Ctrl+Shift+R para forzar recarga completa")
    
    print("\n🔍 SI SIGUES TENIENDO PROBLEMAS:")
    print("- Abre las herramientas de desarrollador (F12)")
    print("- Ve a la pestaña Network")
    print("- Marca 'Disable cache'")
    print("- Intenta iniciar sesión nuevamente")

if __name__ == "__main__":
    main() 