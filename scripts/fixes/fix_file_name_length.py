#!/usr/bin/env python
"""
Quick fix script to handle long file names in document uploads.
This updates the database field to allow longer filenames.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "verihome.settings")
django.setup()

from django.db import connection

def fix_file_field_length():
    """Increase the max_length for document_file field"""
    with connection.cursor() as cursor:
        try:
            # Check current column type
            cursor.execute("""
                SELECT character_maximum_length
                FROM information_schema.columns
                WHERE table_name = 'requests_tenantdocument'
                AND column_name = 'document_file';
            """)
            current_length = cursor.fetchone()

            if current_length:
                print(f"Current max_length for document_file: {current_length[0]}")

                if current_length[0] < 255:
                    # Alter column to allow 255 characters
                    cursor.execute("""
                        ALTER TABLE requests_tenantdocument
                        ALTER COLUMN document_file TYPE VARCHAR(255);
                    """)
                    print("✅ Successfully updated document_file to max_length=255")
                else:
                    print("ℹ️ Field already has sufficient length")
            else:
                print("❌ Could not find the column")

        except Exception as e:
            print(f"Error: {e}")
            print("\n⚠️ Alternative: Create a migration manually:")
            print("python manage.py makemigrations requests --empty -n increase_file_field_length")

if __name__ == "__main__":
    fix_file_field_length()