#!/usr/bin/env python
"""
Script de debug para verificar el error 400 en match request
"""

import os
import sys
import django
import json
from decimal import Decimal

# Configurar Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "verihome.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.contrib.auth import get_user_model
from properties.models import Property
from matching.models import MatchRequest
from matching.serializers import CreateMatchRequestSerializer
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request

User = get_user_model()


def test_match_request_validation():
    """Test match request validation to find the 400 error."""

    print("\n" + "=" * 80)
    print("🔍 DEBUG: Match Request 400 Error Investigation")
    print("=" * 80)

    # Obtener el tenant y la propiedad
    try:
        tenant = User.objects.filter(user_type="tenant").first()
        if not tenant:
            print("❌ No hay tenants en la base de datos")
            return

        property = Property.objects.filter(is_active=True, status="available").first()
        if not property:
            print("❌ No hay propiedades disponibles")
            return

        print(f"✅ Tenant encontrado: {tenant.email} (ID: {tenant.id})")
        print(f"✅ Propiedad encontrada: {property.title} (ID: {property.id})")
        print(f"   - Landlord: {property.landlord.email}")
        print(f"   - Status: {property.status}")
        print(f"   - Is Active: {property.is_active}")

    except Exception as e:
        print(f"❌ Error obteniendo datos: {e}")
        return

    # Preparar los datos del request (simulando lo que envía el frontend)
    request_data = {
        "property": str(property.id),  # UUID como string
        "tenant_message": "Estoy muy interesado en esta propiedad. Soy un profesional responsable.",
        "tenant_phone": "+57 300 123 4567",
        "tenant_email": tenant.email,
        "monthly_income": 5000000,
        "employment_type": "employed",
        "preferred_move_in_date": "2025-09-15",
        "lease_duration_months": 12,
        "has_rental_references": True,
        "has_employment_proof": True,
        "has_credit_check": False,
        "number_of_occupants": 2,
        "has_pets": False,
        "pet_details": "",
        "smoking_allowed": False,
        "priority": "normal",
    }

    print("\n📋 Datos del request:")
    print(json.dumps(request_data, indent=2, default=str))

    # Crear un request factory para simular el request HTTP
    factory = APIRequestFactory()
    django_request = factory.post("/api/v1/matching/requests/", request_data)
    django_request.user = tenant

    # Crear el serializer con contexto
    serializer = CreateMatchRequestSerializer(
        data=request_data, context={"request": Request(django_request)}
    )

    print("\n🔍 Validando con el serializer...")

    # Validar
    if serializer.is_valid():
        print("✅ Datos válidos según el serializer")
        print("\n📋 Datos validados:")
        print(json.dumps(serializer.validated_data, indent=2, default=str))

        # Verificar si ya existe una solicitud previa
        existing = MatchRequest.objects.filter(
            tenant=tenant,
            property=property,
            status__in=["pending", "viewed", "accepted"],
        ).exists()

        if existing:
            print("\n⚠️ Ya existe una solicitud de match para esta propiedad")
            print("   Esto causaría un error 400 en el endpoint")
        else:
            print("\n✅ No hay solicitudes previas - debería funcionar")

    else:
        print("❌ Errores de validación encontrados:")
        for field, errors in serializer.errors.items():
            print(f"   - {field}: {errors}")

    # Verificar campos requeridos según el modelo
    print("\n📋 Verificando campos del modelo MatchRequest:")

    for field in MatchRequest._meta.fields:
        if (
            not field.blank
            and not field.null
            and field.name not in ["id", "created_at", "updated_at"]
        ):
            value = request_data.get(field.name, "NOT PROVIDED")
            if field.name in ["tenant", "landlord"]:
                continue  # Estos se asignan en perform_create
            print(
                f"   - {field.name}: {value} {'✅' if value != 'NOT PROVIDED' else '❌'}"
            )

    # Probar tipos de datos específicos
    print("\n🔍 Verificando tipos de datos:")
    print(
        f"   - property ID es UUID válido: {isinstance(property.id, (str, type(property.id)))}"
    )
    print(
        f"   - monthly_income es número: {isinstance(request_data['monthly_income'], (int, float, Decimal))}"
    )
    print(
        f"   - lease_duration_months está en rango (1-60): {1 <= request_data['lease_duration_months'] <= 60}"
    )
    print(
        f"   - number_of_occupants está en rango (1-20): {1 <= request_data['number_of_occupants'] <= 20}"
    )

    # Verificar permisos
    print("\n🔒 Verificando permisos:")
    print(f"   - Usuario es tenant: {'✅' if tenant.user_type == 'tenant' else '❌'}")
    print(
        f"   - Propiedad pertenece a otro usuario: {'✅' if property.landlord != tenant else '❌'}"
    )

    print("\n" + "=" * 80)
    print("📊 RESUMEN DEL DIAGNÓSTICO")
    print("=" * 80)

    if not serializer.is_valid():
        print("❌ El problema está en la validación del serializer")
        print("   Solución: Revisar los campos enviados desde el frontend")
    elif existing:
        print("⚠️ Ya existe una solicitud para esta propiedad")
        print("   Solución: Verificar en el frontend antes de enviar")
    else:
        print("✅ Los datos parecen correctos")
        print("   El error puede estar en otro lugar del proceso")


if __name__ == "__main__":
    test_match_request_validation()
