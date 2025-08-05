#!/usr/bin/env python
"""
Script para iniciar Django con logging detallado
"""
import os
import sys
import django
from django.core.management import execute_from_command_line

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')

if __name__ == '__main__':
    print("🚀 INICIANDO DJANGO CON LOGGING DETALLADO")
    print("=" * 60)
    print("🔧 Configuración:")
    print(f"   - Settings: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
    print(f"   - Python: {sys.version}")
    print("   - Puerto: 8000")
    print("   - Modo: DEBUG activado")
    print("=" * 60)
    
    # Ejecutar runserver con verbosidad
    execute_from_command_line([
        'manage.py', 
        'runserver', 
        '0.0.0.0:8000',
        '--verbosity=2'
    ])