#!/usr/bin/env python
"""
Script simple para iniciar el servidor Django
"""
import os
import sys
import subprocess

# Cambiar al directorio del proyecto
os.chdir('/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')

# Usar el Python del virtual environment
python_path = './venv/Scripts/python.exe'

# Iniciar el servidor
cmd = [python_path, 'manage.py', 'runserver', '127.0.0.1:8000']
print(f"🚀 Iniciando servidor Django: {' '.join(cmd)}")

try:
    subprocess.run(cmd, check=True)
except KeyboardInterrupt:
    print("\n🛑 Servidor detenido por el usuario")
except Exception as e:
    print(f"❌ Error al iniciar servidor: {e}")