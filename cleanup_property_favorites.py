#!/usr/bin/env python3
"""
Script para limpiar todos los registros de PropertyFavorite.
Deja la tabla vacía para evitar conflictos de campos antiguos.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from properties.models import PropertyFavorite

count = PropertyFavorite.objects.count()
PropertyFavorite.objects.all().delete()
print(f"🗑️  Se eliminaron {count} registros de PropertyFavorite.") 