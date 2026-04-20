#!/usr/bin/env python3
"""
Script para limpiar completamente todos los flujos contractuales y de solicitudes.
Resetea la base de datos a estado limpio para pruebas manuales desde cero.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "verihome.settings")
django.setup()

from contracts.models import Contract
from matching.models import MatchRequest
from django.contrib.auth import get_user_model
from properties.models import Property

User = get_user_model()


def clean_all_processes():
    """Limpia todos los procesos contractuales y de matching."""

    print("=" * 80)
    print("🧹 LIMPIEZA COMPLETA DEL SISTEMA")
    print("=" * 80)

    # 1. Eliminar todos los contratos
    contracts_count = Contract.objects.count()
    if contracts_count > 0:
        Contract.objects.all().delete()
        print(f"✅ Eliminados {contracts_count} contratos")
    else:
        print("✅ No hay contratos para eliminar")

    # 2. Eliminar todas las solicitudes de match
    match_requests_count = MatchRequest.objects.count()
    if match_requests_count > 0:
        MatchRequest.objects.all().delete()
        print(f"✅ Eliminadas {match_requests_count} solicitudes de match")
    else:
        print("✅ No hay solicitudes de match para eliminar")

    # 3. Resetear propiedades (marcar como disponibles)
    properties_updated = Property.objects.exclude(status="available").update(
        status="available"
    )
    print(f"✅ Reseteadas {properties_updated} propiedades a disponibles")

    # 4. Mostrar estado final
    print("\n" + "=" * 80)
    print("📊 ESTADO FINAL DEL SISTEMA")
    print("=" * 80)
    print(f"Contratos: {Contract.objects.count()}")
    print(f"Solicitudes de Match: {MatchRequest.objects.count()}")
    print(
        f"Propiedades disponibles: {Property.objects.filter(status='available').count()}"
    )
    print(
        f"Propiedades ocupadas: {Property.objects.exclude(status='available').count()}"
    )

    # 5. Mostrar usuarios disponibles para pruebas
    print("\n" + "=" * 80)
    print("👥 USUARIOS DISPONIBLES PARA PRUEBAS")
    print("=" * 80)

    landlords = User.objects.filter(user_type="landlord")
    tenants = User.objects.filter(user_type="tenant")

    print("🏢 ARRENDADORES:")
    for landlord in landlords:
        print(f"  - {landlord.email} ({landlord.first_name} {landlord.last_name})")

    print("\n🏠 ARRENDATARIOS:")
    for tenant in tenants:
        print(f"  - {tenant.email} ({tenant.first_name} {tenant.last_name})")

    # 6. Mostrar propiedades disponibles
    print("\n" + "=" * 80)
    print("🏘️ PROPIEDADES DISPONIBLES")
    print("=" * 80)

    properties = Property.objects.filter(status="available")[
        :5
    ]  # Mostrar las primeras 5
    for prop in properties:
        print(f"  - ID: {prop.id}")
        print(f"    Título: {prop.title}")
        print(f"    Precio: ${prop.rent_price or 0:,.0f}")
        print(f"    Ubicación: {prop.city}, {prop.state}")
        print(f"    Propietario: {prop.landlord.email}")
        print()

    if Property.objects.filter(status="available").count() > 5:
        total = Property.objects.filter(status="available").count()
        print(f"  ... y {total - 5} propiedades más")

    print("\n" + "=" * 80)
    print("✅ SISTEMA COMPLETAMENTE LIMPIO")
    print("=" * 80)
    print("🚀 Listo para iniciar pruebas manuales desde cero")
    print("\n📝 FLUJO DE PRUEBA RECOMENDADO:")
    print("1. Arrendatario busca propiedades")
    print("2. Arrendatario envía solicitud de match")
    print("3. Arrendador revisa y aprueba solicitud")
    print("4. Sistema genera contrato automáticamente")
    print("5. Flujo biométrico secuencial: Tenant → Garante → Landlord")


if __name__ == "__main__":
    try:
        clean_all_processes()
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        sys.exit(1)
