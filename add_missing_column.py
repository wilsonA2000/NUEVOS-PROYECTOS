#!/usr/bin/env python3
"""
Script para agregar columna faltante directamente en SQLite
"""

import os
import sys
import sqlite3

# Configurar el path de Django
sys.path.insert(0, '/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')

import django
django.setup()

from django.conf import settings

def add_missing_columns():
    """Agregar columnas faltantes a la base de datos"""
    
    # Path to the database
    db_path = settings.DATABASES['default']['NAME']
    
    print(f"Conectando a la base de datos: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the column exists
        cursor.execute("PRAGMA table_info(users_tenantprofile)")
        columns = [column[1] for column in cursor.fetchall()]
        
        print(f"Columnas actuales en users_tenantprofile: {columns}")
        
        if 'years_employed' not in columns:
            print("Agregando columna years_employed...")
            cursor.execute("""
                ALTER TABLE users_tenantprofile 
                ADD COLUMN years_employed INTEGER;
            """)
            print("✅ Columna years_employed agregada")
        else:
            print("✅ Columna years_employed ya existe")
        
        # Check for has_pets column in tenantprofile
        if 'has_pets' not in columns:
            print("Agregando columna has_pets...")
            cursor.execute("""
                ALTER TABLE users_tenantprofile 
                ADD COLUMN has_pets BOOLEAN DEFAULT 0;
            """)
            print("✅ Columna has_pets agregada")
        else:
            print("✅ Columna has_pets ya existe")
            
        # Check for pets_description column in tenantprofile
        if 'pets_description' not in columns:
            print("Agregando columna pets_description...")
            cursor.execute("""
                ALTER TABLE users_tenantprofile 
                ADD COLUMN pets_description TEXT;
            """)
            print("✅ Columna pets_description agregada")
        else:
            print("✅ Columna pets_description ya existe")
            
        # Check for smokes column in tenantprofile  
        if 'smokes' not in columns:
            print("Agregando columna smokes...")
            cursor.execute("""
                ALTER TABLE users_tenantprofile 
                ADD COLUMN smokes BOOLEAN DEFAULT 0;
            """)
            print("✅ Columna smokes agregada")
        else:
            print("✅ Columna smokes ya existe")
            
        # Check for has_children column in tenantprofile
        if 'has_children' not in columns:
            print("Agregando columna has_children...")
            cursor.execute("""
                ALTER TABLE users_tenantprofile 
                ADD COLUMN has_children BOOLEAN DEFAULT 0;
            """)
            print("✅ Columna has_children agregada")
        else:
            print("✅ Columna has_children ya existe")
            
        # Check for children_count column in tenantprofile
        if 'children_count' not in columns:
            print("Agregando columna children_count...")
            cursor.execute("""
                ALTER TABLE users_tenantprofile 
                ADD COLUMN children_count INTEGER DEFAULT 0;
            """)
            print("✅ Columna children_count agregada")
        else:
            print("✅ Columna children_count ya existe")
            
        # Add remaining JSONField columns
        json_fields = [
            'preferred_property_types',
            'preferred_locations'
        ]
        
        for field in json_fields:
            if field not in columns:
                print(f"Agregando columna {field}...")
                cursor.execute(f"""
                    ALTER TABLE users_tenantprofile 
                    ADD COLUMN {field} TEXT DEFAULT '[]';
                """)
                print(f"✅ Columna {field} agregada")
            else:
                print(f"✅ Columna {field} ya existe")
                
        # Add max_rent_budget column  
        if 'max_rent_budget' not in columns:
            print("Agregando columna max_rent_budget...")
            cursor.execute("""
                ALTER TABLE users_tenantprofile 
                ADD COLUMN max_rent_budget DECIMAL(12,2);
            """)
            print("✅ Columna max_rent_budget agregada")
        else:
            print("✅ Columna max_rent_budget ya existe")
            
        # Check serviceproviderprofile table for missing columns
        try:
            cursor.execute("PRAGMA table_info(users_serviceproviderprofile)")
            sp_columns = [column[1] for column in cursor.fetchall()]
            print(f"Columnas en users_serviceproviderprofile: {sp_columns}")
            
            if 'work_start_time' not in sp_columns:
                print("Agregando columna work_start_time...")
                cursor.execute("""
                    ALTER TABLE users_serviceproviderprofile 
                    ADD COLUMN work_start_time TIME;
                """)
                print("✅ Columna work_start_time agregada")
            
            if 'work_end_time' not in sp_columns:
                print("Agregando columna work_end_time...")
                cursor.execute("""
                    ALTER TABLE users_serviceproviderprofile 
                    ADD COLUMN work_end_time TIME;
                """)
                print("✅ Columna work_end_time agregada")
                
        except sqlite3.OperationalError as e:
            print(f"Tabla serviceproviderprofile no existe o error: {e}")
        
        conn.commit()
        conn.close()
        print("✅ Base de datos actualizada correctamente")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    add_missing_columns()