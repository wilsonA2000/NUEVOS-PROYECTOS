#!/usr/bin/env python3
"""
Script para limpiar completamente las propiedades de prueba y dejar la BD lista
para testing manual del módulo de propiedades
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


def clean_properties_completely():
    """Limpiar completamente todas las propiedades para testing manual"""

    print("=" * 70)
    print("🧹 LIMPIEZA COMPLETA DE PROPIEDADES - VERIHOME")
    print("=" * 70)

    # 1. Mostrar estado actual
    print("\n📊 ESTADO ACTUAL DE LA BASE DE DATOS:")
    total_properties = Property.objects.count()
    total_images = PropertyImage.objects.count()
    total_videos = PropertyVideo.objects.count()

    print(f"   Propiedades existentes: {total_properties}")
    print(f"   Imágenes de propiedades: {total_images}")
    print(f"   Videos de propiedades: {total_videos}")

    if total_properties == 0:
        print("\n✅ No hay propiedades para limpiar. La base de datos ya está limpia.")
        return

    # 2. Mostrar detalles de las propiedades a eliminar
    print("\n📋 PROPIEDADES A ELIMINAR:")
    properties = Property.objects.all()

    for i, prop in enumerate(properties, 1):
        landlord_info = f"{prop.landlord.email} ({prop.landlord.first_name} {prop.landlord.last_name})"
        title_info = prop.title if prop.title.strip() else "Sin título"
        print(f"   {i}. ID: {prop.id}")
        print(f"      Título: '{title_info}'")
        print(f"      Propietario: {landlord_info}")
        print(f"      Creado: {prop.created_at.strftime('%Y-%m-%d %H:%M')}")
        print(f"      Estado: {'Activa' if prop.is_active else 'Inactiva'}")
        print(f"      Imágenes: {prop.images.count()}")
        print(f"      Videos: {prop.videos.count()}")
        print()

    # 3. Confirmación
    print(
        f"⚠️  ADVERTENCIA: Se eliminarán {total_properties} propiedades PERMANENTEMENTE"
    )
    print("   Esto incluye:")
    print(f"   - {total_properties} registros de propiedades")
    print(f"   - {total_images} imágenes asociadas")
    print(f"   - {total_videos} videos asociados")
    print("   - Todos los archivos multimedia en el sistema")

    confirm = input(
        "\n¿Estás seguro de que deseas proceder con la limpieza completa? (ESCRIBE 'CONFIRMAR'): "
    )

    if confirm != "CONFIRMAR":
        print("❌ Operación cancelada por seguridad.")
        return

    print("\n🚀 Iniciando limpieza completa...")

    # 4. Eliminar todo en una transacción
    with transaction.atomic():
        # Contar elementos antes de eliminar
        PropertyImage.objects.count()
        PropertyVideo.objects.count()
        Property.objects.count()

        # Eliminar propiedades (esto eliminará imágenes y videos en cascada)
        deleted_count, deletion_details = Property.objects.all().delete()

        print("\n✅ ELIMINACIÓN COMPLETADA:")
        print(
            f"   - Propiedades eliminadas: {deletion_details.get('properties.Property', 0)}"
        )
        print(
            f"   - Imágenes eliminadas: {deletion_details.get('properties.PropertyImage', 0)}"
        )
        print(
            f"   - Videos eliminados: {deletion_details.get('properties.PropertyVideo', 0)}"
        )

        # Mostrar otros elementos eliminados si existen
        other_deleted = {
            k: v for k, v in deletion_details.items() if not k.startswith("properties.")
        }
        if other_deleted:
            print(f"   - Otros elementos: {other_deleted}")

    # 5. Verificar estado final
    print("\n📊 ESTADO FINAL DE LA BASE DE DATOS:")
    final_properties = Property.objects.count()
    final_images = PropertyImage.objects.count()
    final_videos = PropertyVideo.objects.count()

    print(f"   Propiedades restantes: {final_properties}")
    print(f"   Imágenes restantes: {final_images}")
    print(f"   Videos restantes: {final_videos}")

    # 6. Mostrar información de usuarios para testing manual
    print("\n👥 USUARIOS DISPONIBLES PARA TESTING MANUAL:")
    landlord_users = User.objects.filter(user_type="landlord", is_active=True)

    for i, user in enumerate(landlord_users, 1):
        status_icon = "✅" if user.is_verified else "❌"
        print(f"   {i}. {user.email} {status_icon}")
        print(f"      Nombre: {user.first_name} {user.last_name}")
        print(f"      Verificado: {user.is_verified}")
        print()

    # 7. Instrucciones para testing manual
    print("📝 INSTRUCCIONES PARA TESTING MANUAL:")
    print("   1. La base de datos está completamente limpia")
    print(
        f"   2. Usa cualquiera de los {landlord_users.count()} usuarios arrendadores arriba"
    )
    print("   3. Ve a http://localhost:5173 y autentica usando la solución HTML")
    print("   4. Crea propiedades manualmente para probar:")
    print("      - Formulario de creación")
    print("      - Validaciones")
    print("      - Carga de imágenes y videos")
    print("      - Eliminación (ahora funcionará porque serás el creador)")
    print("   5. Verificar que el rendimiento mejore sin datos de prueba")

    print("\n✨ LIMPIEZA COMPLETADA EXITOSAMENTE!")
    print("=" * 70)


if __name__ == "__main__":
    clean_properties_completely()
