#!/usr/bin/env python3
"""
Test Profile Update Complete Flow
=================================

Script para probar que la funcionalidad de actualización de perfil está
funcionando correctamente después de las correcciones implementadas.

Author: Claude Code
Date: 07/07/2025
Version: 1.0
"""

import os
import sys
import django
import json
from decimal import Decimal

# Configurar Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "verihome.settings")
django.setup()

from django.contrib.auth import get_user_model
from users.serializers import UserProfileSerializer

User = get_user_model()


def test_profile_update():
    """Test completo de actualización de perfil."""
    print("🧪 TESTING PROFILE UPDATE COMPLETE FLOW")
    print("=" * 50)

    try:
        # 1. Obtener usuario de prueba
        test_user = User.objects.filter(email="landlord@test.com").first()
        if not test_user:
            print("❌ Usuario de prueba no encontrado")
            print("💡 Tip: Ejecuta create_test_data.py para crear usuarios de prueba")
            return False

        print(f"✅ Usuario encontrado: {test_user.email}")
        print(f"   - Nombre: {test_user.first_name} {test_user.last_name}")
        print(f"   - Tipo: {test_user.get_user_type_display()}")
        print(f"   - Avatar: {test_user.avatar}")

        # 2. Datos de actualización
        update_data = {
            "first_name": "Carlos Updated",
            "last_name": "García Actualizado",
            "phone_number": "+573001234567",
            "whatsapp": "+573001234567",
            "date_of_birth": "1990-05-15",
            "gender": "male",
            "nationality": "Colombiana",
            "marital_status": "married",
            "country": "Colombia",
            "state": "Antioquia",
            "city": "Medellín Actualizada",
            "postal_code": "050021",
            "current_address": "Calle 10 #15-25, El Poblado, Medellín",
            "employment_status": "employed",
            "monthly_income": Decimal("8500000.00"),
            "currency": "COP",
            "employer_name": "Empresa Inmobiliaria S.A.S.",
            "job_title": "Gerente de Ventas",
            "years_employed": 5,
            "family_size": 3,
            "pets": True,
            "rental_history": True,
            "total_properties": 15,
            "years_experience": 8,
            "company_name": "Inmobiliaria García & Asociados",
            "source": "referral",
            "marketing_consent": True,
        }

        print("\n📝 Datos a actualizar:")
        print(
            json.dumps(
                {k: str(v) for k, v in update_data.items()},
                indent=2,
                ensure_ascii=False,
            )
        )

        # 3. Serializar y validar
        serializer = UserProfileSerializer(
            instance=test_user, data=update_data, partial=True
        )

        if not serializer.is_valid():
            print(f"❌ Errores de validación: {serializer.errors}")
            return False

        print("✅ Validación exitosa")

        # 4. Guardar cambios
        updated_user = serializer.save()
        print("✅ Usuario actualizado en base de datos")

        # 5. Verificar cambios
        print("\n🔍 Verificando cambios:")
        print(f"   - Nombre: {updated_user.first_name} {updated_user.last_name}")
        print(f"   - Teléfono: {updated_user.phone_number}")
        print(f"   - WhatsApp: {updated_user.whatsapp}")
        print(f"   - Ciudad: {updated_user.city}")
        print(f"   - Dirección: {updated_user.current_address}")
        print(f"   - Ingreso: {updated_user.monthly_income} {updated_user.currency}")
        print(f"   - Empresa: {updated_user.employer_name}")
        print(f"   - Propiedades: {updated_user.total_properties}")
        print(f"   - Experiencia: {updated_user.years_experience} años")
        print(f"   - Mascotas: {'Sí' if updated_user.pets else 'No'}")
        print(f"   - Marketing: {'Sí' if updated_user.marketing_consent else 'No'}")

        # 6. Test de serialización para respuesta
        response_serializer = UserProfileSerializer(updated_user)
        response_data = response_serializer.data

        print("\n📤 Datos de respuesta (serializados):")
        print(
            json.dumps(
                {k: str(v) for k, v in response_data.items()},
                indent=2,
                ensure_ascii=False,
            )
        )

        # 7. Verificar campos críticos
        critical_fields = [
            "first_name",
            "last_name",
            "phone_number",
            "city",
            "monthly_income",
            "total_properties",
            "years_experience",
        ]

        all_updated = True
        for field in critical_fields:
            original_value = str(update_data.get(field, ""))
            updated_value = str(getattr(updated_user, field, ""))
            if original_value != updated_value:
                print(
                    f"⚠️  Campo {field}: esperado '{original_value}', obtenido '{updated_value}'"
                )
                all_updated = False

        if all_updated:
            print("✅ Todos los campos críticos se actualizaron correctamente")

        print("\n🎉 TEST PROFILE UPDATE COMPLETADO")
        print(f"📊 Status: {'EXITOSO' if all_updated else 'PARCIAL'}")
        return all_updated

    except Exception as e:
        print(f"❌ Error durante el test: {str(e)}")
        import traceback

        traceback.print_exc()
        return False


def test_avatar_field():
    """Test específico para campo avatar."""
    print("\n🖼️  TESTING AVATAR FIELD")
    print("=" * 30)

    try:
        test_user = User.objects.filter(email="landlord@test.com").first()
        if not test_user:
            print("❌ Usuario de prueba no encontrado")
            return False

        # Test con avatar
        avatar_data = {"avatar": "avatars/test_avatar.jpg"}
        serializer = UserProfileSerializer(
            instance=test_user, data=avatar_data, partial=True
        )

        if serializer.is_valid():
            updated_user = serializer.save()
            print(f"✅ Avatar actualizado: {updated_user.avatar}")
            return True
        else:
            print(f"❌ Error en avatar: {serializer.errors}")
            return False

    except Exception as e:
        print(f"❌ Error en test avatar: {str(e)}")
        return False


def test_date_fields():
    """Test específico para campos de fecha."""
    print("\n📅 TESTING DATE FIELDS")
    print("=" * 30)

    try:
        test_user = User.objects.filter(email="tenant@test.com").first()
        if not test_user:
            print("❌ Usuario tenant no encontrado")
            return False

        # Test con fechas
        date_data = {"date_of_birth": "1995-03-20", "move_in_date": "2025-08-01"}

        serializer = UserProfileSerializer(
            instance=test_user, data=date_data, partial=True
        )

        if serializer.is_valid():
            updated_user = serializer.save()
            print(f"✅ Fecha nacimiento: {updated_user.date_of_birth}")
            print(f"✅ Fecha ingreso: {updated_user.move_in_date}")
            return True
        else:
            print(f"❌ Error en fechas: {serializer.errors}")
            return False

    except Exception as e:
        print(f"❌ Error en test fechas: {str(e)}")
        return False


def main():
    """Función principal."""
    print("🚀 VeriHome Profile Update Test Suite")
    print("=====================================")

    tests = [
        ("Profile Update Complete", test_profile_update),
        ("Avatar Field", test_avatar_field),
        ("Date Fields", test_date_fields),
    ]

    results = []

    for test_name, test_func in tests:
        print(f"\n🧪 Ejecutando: {test_name}")
        result = test_func()
        results.append((test_name, result))
        print(f"📊 Resultado: {'✅ PASS' if result else '❌ FAIL'}")

    # Resumen final
    print("\n📋 RESUMEN DE TESTS")
    print("=" * 40)
    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"   {test_name}: {status}")

    print(f"\n🎯 Total: {passed}/{total} tests passed")

    if passed == total:
        print(
            "🎉 TODOS LOS TESTS PASARON - Profile functionality is working correctly!"
        )
    else:
        print("⚠️  ALGUNOS TESTS FALLARON - Review the implementation")

    return passed == total


if __name__ == "__main__":
    main()
