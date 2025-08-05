#!/usr/bin/env python3

import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.db import connection

def fix_missing_columns():
    """Agregar columnas faltantes directamente con SQL."""
    
    cursor = connection.cursor()
    
    # Verificar qué columnas faltan
    cursor.execute("PRAGMA table_info(users_tenantprofile);")
    columns = [column[1] for column in cursor.fetchall()]
    print(f"🔍 Columnas actuales en users_tenantprofile: {columns}")
    
    # Agregar job_title si no existe
    if 'job_title' not in columns:
        try:
            cursor.execute("ALTER TABLE users_tenantprofile ADD COLUMN job_title VARCHAR(100) DEFAULT '';")
            print("✅ Agregada columna job_title a users_tenantprofile")
        except Exception as e:
            print(f"❌ Error agregando job_title: {e}")
    
    # Verificar otras columnas faltantes comunes
    missing_columns = {
        'company': 'VARCHAR(100) DEFAULT ""',
        'monthly_income': 'DECIMAL(10, 2) DEFAULT 0.00',
        'employment_status': 'VARCHAR(50) DEFAULT "not_specified"',
        'references': 'TEXT DEFAULT ""',
        'emergency_contact': 'VARCHAR(100) DEFAULT ""',
        'emergency_phone': 'VARCHAR(20) DEFAULT ""',
    }
    
    for col_name, col_definition in missing_columns.items():
        if col_name not in columns:
            try:
                cursor.execute(f"ALTER TABLE users_tenantprofile ADD COLUMN {col_name} {col_definition};")
                print(f"✅ Agregada columna {col_name} a users_tenantprofile")
            except Exception as e:
                print(f"⚠️ Error agregando {col_name}: {e}")
    
    print("🔄 Verificando otras tablas...")
    
    # Verificar ServiceProviderProfile
    try:
        cursor.execute("PRAGMA table_info(users_serviceproviderprofile);")
        sp_columns = [column[1] for column in cursor.fetchall()]
        print(f"🔍 Columnas en users_serviceproviderprofile: {len(sp_columns)} columnas")
        
        # Agregar campos faltantes comunes
        sp_missing = {
            'work_start_time': 'TIME DEFAULT "09:00:00"',
            'work_end_time': 'TIME DEFAULT "17:00:00"',
            'rating': 'DECIMAL(3, 2) DEFAULT 0.00',
            'total_reviews': 'INTEGER DEFAULT 0',
        }
        
        for col_name, col_definition in sp_missing.items():
            if col_name not in sp_columns:
                try:
                    cursor.execute(f"ALTER TABLE users_serviceproviderprofile ADD COLUMN {col_name} {col_definition};")
                    print(f"✅ Agregada columna {col_name} a users_serviceproviderprofile")
                except Exception as e:
                    print(f"⚠️ Error agregando {col_name}: {e}")
                    
    except Exception as e:
        print(f"⚠️ Error verificando ServiceProviderProfile: {e}")
    
    print("✅ Migración manual completada")

if __name__ == '__main__':
    fix_missing_columns()