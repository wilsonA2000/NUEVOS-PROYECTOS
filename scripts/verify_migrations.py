#!/usr/bin/env python3
"""
Script para verificar y ejecutar migraciones de Django en PostgreSQL.
"""

import os
import sys
import django
from pathlib import Path

# Agregar el directorio del proyecto al path
project_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(project_dir))

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection
from django.apps import apps


def print_message(message, style='INFO'):
    colors = {
        'INFO': '\033[94m',
        'SUCCESS': '\033[92m',
        'WARNING': '\033[93m',
        'ERROR': '\033[91m',
        'ENDC': '\033[0m'
    }
    print(f"{colors.get(style, '')}{message}{colors['ENDC']}")


def check_database_connection():
    """Verifica la conexión a la base de datos."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT version()")
            version = cursor.fetchone()[0]
            print_message(f"✅ Conexión a PostgreSQL exitosa: {version}", 'SUCCESS')
            return True
    except Exception as e:
        print_message(f"❌ Error conectando a la base de datos: {str(e)}", 'ERROR')
        return False


def check_migrations_status():
    """Verifica el estado actual de las migraciones."""
    try:
        print_message("📋 Verificando estado de migraciones...", 'INFO')
        
        # Ejecutar showmigrations
        execute_from_command_line(['manage.py', 'showmigrations'])
        return True
        
    except Exception as e:
        print_message(f"❌ Error verificando migraciones: {str(e)}", 'ERROR')
        return False


def run_migrations():
    """Ejecuta las migraciones de Django."""
    try:
        print_message("🔄 Ejecutando migraciones...", 'INFO')
        
        # Primero, crear migraciones si es necesario
        execute_from_command_line(['manage.py', 'makemigrations'])
        
        # Luego ejecutar migraciones
        execute_from_command_line(['manage.py', 'migrate'])
        
        print_message("✅ Migraciones ejecutadas exitosamente", 'SUCCESS')
        return True
        
    except Exception as e:
        print_message(f"❌ Error ejecutando migraciones: {str(e)}", 'ERROR')
        return False


def verify_models():
    """Verifica que todos los modelos estén correctamente configurados."""
    try:
        print_message("🔍 Verificando modelos...", 'INFO')
        
        app_models = {}
        
        for app_config in apps.get_app_configs():
            if app_config.name.startswith('verihome') or app_config.name in [
                'core', 'users', 'properties', 'contracts', 'payments', 
                'messaging', 'ratings', 'matching', 'dashboard'
            ]:
                models = app_config.get_models()
                if models:
                    app_models[app_config.name] = len(models)
                    print_message(f"  {app_config.name}: {len(models)} modelos", 'INFO')
        
        total_models = sum(app_models.values())
        print_message(f"✅ Total de modelos verificados: {total_models}", 'SUCCESS')
        
        return True
        
    except Exception as e:
        print_message(f"❌ Error verificando modelos: {str(e)}", 'ERROR')
        return False


def check_database_tables():
    """Verifica que las tablas se hayan creado correctamente."""
    try:
        print_message("🗃️  Verificando tablas en la base de datos...", 'INFO')
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            """)
            
            tables = [row[0] for row in cursor.fetchall()]
            
            print_message(f"📊 Tablas encontradas: {len(tables)}", 'INFO')
            
            # Verificar tablas críticas
            critical_tables = [
                'users_user',
                'properties_property', 
                'contracts_contract',
                'payments_transaction',
                'messaging_conversation',
                'ratings_rating'
            ]
            
            missing_tables = []
            for table in critical_tables:
                if table in tables:
                    print_message(f"  ✅ {table}", 'SUCCESS')
                else:
                    print_message(f"  ❌ {table} (faltante)", 'ERROR')
                    missing_tables.append(table)
            
            if missing_tables:
                print_message(f"⚠️  Tablas críticas faltantes: {len(missing_tables)}", 'WARNING')
                return False
            else:
                print_message("✅ Todas las tablas críticas están presentes", 'SUCCESS')
                return True
                
    except Exception as e:
        print_message(f"❌ Error verificando tablas: {str(e)}", 'ERROR')
        return False


def main():
    """Función principal del script."""
    print_message("🚀 VeriHome - Verificación de Migraciones PostgreSQL", 'INFO')
    print_message("=" * 60, 'INFO')
    
    success = True
    
    # 1. Verificar conexión a la base de datos
    if not check_database_connection():
        success = False
        return success
    
    # 2. Verificar estado de migraciones
    if not check_migrations_status():
        success = False
    
    # 3. Ejecutar migraciones
    if not run_migrations():
        success = False
        return success
    
    # 4. Verificar modelos
    if not verify_models():
        success = False
    
    # 5. Verificar tablas en la base de datos
    if not check_database_tables():
        success = False
    
    # Resumen final
    print_message("=" * 60, 'INFO')
    if success:
        print_message("🎉 ¡Verificación completada exitosamente!", 'SUCCESS')
        print_message("   La base de datos PostgreSQL está lista para VeriHome", 'SUCCESS')
    else:
        print_message("⚠️  Verificación completada con errores", 'WARNING')
        print_message("   Revisa los mensajes anteriores para más detalles", 'WARNING')
    
    return success


if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)