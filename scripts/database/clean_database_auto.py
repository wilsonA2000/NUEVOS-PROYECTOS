#!/usr/bin/env python3
"""
Script automático para limpiar completamente las propiedades de prueba
"""

import os
import sys
import django

# Configurar Django
sys.path.append("/mnt/c/Users/wilso/Desktop/NUEVOS PROYECTOS")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "verihome.settings")
django.setup()

from properties.models import Property, PropertyImage, PropertyVideo
from django.contrib.auth import get_user_model
from django.db import transaction

User = get_user_model()


def auto_clean_properties():
    """Limpiar automáticamente todas las propiedades"""

    print("=" * 70)
    print("🧹 LIMPIEZA AUTOMÁTICA DE PROPIEDADES - VERIHOME")
    print("=" * 70)

    # 1. Estado actual
    total_properties = Property.objects.count()
    total_images = PropertyImage.objects.count()
    total_videos = PropertyVideo.objects.count()

    print("\n📊 ESTADO INICIAL:")
    print(f"   Propiedades: {total_properties}")
    print(f"   Imágenes: {total_images}")
    print(f"   Videos: {total_videos}")

    if total_properties == 0:
        print("\n✅ Base de datos ya está limpia.")
        return

    # 2. Mostrar propiedades a eliminar
    print("\n📋 ELIMINANDO PROPIEDADES:")
    for i, prop in enumerate(Property.objects.all(), 1):
        title = prop.title.strip() if prop.title else "Sin título"
        print(f"   {i}. {title} - {prop.landlord.email}")

    # 3. Eliminar automáticamente
    print("\n🚀 Ejecutando limpieza...")

    with transaction.atomic():
        deleted_count, deletion_details = Property.objects.all().delete()

    print("\n✅ ELIMINACIÓN COMPLETADA:")
    print(f"   - Propiedades: {deletion_details.get('properties.Property', 0)}")
    print(f"   - Imágenes: {deletion_details.get('properties.PropertyImage', 0)}")
    print(f"   - Videos: {deletion_details.get('properties.PropertyVideo', 0)}")

    # 4. Verificar limpieza
    final_properties = Property.objects.count()
    final_images = PropertyImage.objects.count()
    final_videos = PropertyVideo.objects.count()

    print("\n📊 ESTADO FINAL:")
    print(f"   Propiedades: {final_properties}")
    print(f"   Imágenes: {final_images}")
    print(f"   Videos: {final_videos}")

    # 5. Usuarios para testing
    print("\n👥 USUARIOS ARRENDADORES DISPONIBLES:")
    landlords = User.objects.filter(user_type="landlord", is_active=True)

    for user in landlords:
        status = "✅" if user.is_verified else "❌"
        print(f"   • {user.email} {status} - {user.first_name} {user.last_name}")

    print("\n🎯 RECOMENDACIÓN:")
    print("   1. Usa 'wilsonderecho10@gmail.com' para testing (está verificado)")
    print("   2. Ve a http://localhost:5173 y autentica")
    print("   3. Crea propiedades manualmente")
    print("   4. Ahora podrás eliminarlas (serás el creador)")

    print("\n✨ BASE DE DATOS LIMPIA Y LISTA PARA TESTING MANUAL")
    print("=" * 70)


if __name__ == "__main__":
    auto_clean_properties()
