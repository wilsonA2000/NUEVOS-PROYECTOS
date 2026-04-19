#!/usr/bin/env python3
"""
Script para probar el flujo biométrico completo con garante.
Flujo: Tenant → Guarantor → Landlord
"""
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from contracts.models import Contract
from django.contrib.auth import get_user_model
from matching.models import MatchRequest

User = get_user_model()

def setup_guarantor_test():
    """Configura un contrato con garante para probar el flujo biométrico."""

    contract_id = "c6a04a99-c3da-468a-a514-5c9fba718ea3"

    try:
        # Obtener el contrato existente
        contract = Contract.objects.get(id=contract_id)

        print("=" * 80)
        print("🔧 CONFIGURANDO CONTRATO PARA FLUJO CON GARANTE")
        print("=" * 80)

        # Crear un usuario garante si no existe
        guarantor_email = "guarantor@test.com"
        guarantor, created = User.objects.get_or_create(
            email=guarantor_email,
            defaults={
                'first_name': 'Carlos',
                'last_name': 'Garante',
                'user_type': 'tenant',  # Usar 'tenant' ya que 'guarantor' no está en las opciones
                'phone_number': '+57300123456',
                'is_verified': True
            }
        )

        if created:
            guarantor.set_password('password123')
            guarantor.save()
            print(f"✅ Creado usuario garante: {guarantor_email}")
        else:
            print(f"✅ Usando usuario garante existente: {guarantor_email}")

        # Asignar garante al contrato
        contract.guarantor = guarantor
        contract.save(update_fields=['guarantor'])

        print(f"✅ Garante asignado al contrato: {contract.guarantor.email}")

        # Mostrar configuración actual
        print("\n" + "=" * 80)
        print("📋 CONFIGURACIÓN DEL CONTRATO")
        print("=" * 80)
        print(f"Contrato ID: {contract.id}")
        print(f"Arrendador: {contract.primary_party.email}")
        print(f"Arrendatario: {contract.secondary_party.email}")
        print(f"Garante: {contract.guarantor.email if contract.guarantor else 'No asignado'}")
        print(f"Estado del contrato: {contract.status}")

        # Verificar MatchRequest
        match_request = MatchRequest.objects.filter(property=contract.property).first()
        if match_request:
            print(f"Estado del workflow: {match_request.workflow_status}")

        print("\n" + "=" * 80)
        print("🔥 FLUJO DE PRUEBA CONFIGURADO")
        print("=" * 80)
        print("Orden de autenticación biométrica:")
        print("1. 🏠 Arrendatario (tenant): letefon100@gmail.com")
        print("2. 👥 Garante: guarantor@test.com")
        print("3. 🏢 Arrendador (landlord): admin@verihome.com")

        print("\n📝 Para probar:")
        print("1. Inicia sesión como arrendatario y comienza la autenticación")
        print("2. Luego como garante")
        print("3. Finalmente como arrendador")

        return contract

    except Contract.DoesNotExist:
        print(f"❌ ERROR: Contrato {contract_id} no encontrado")
        return None
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return None

def check_biometric_states():
    """Verifica los estados actuales del flujo biométrico."""

    contract_id = "c6a04a99-c3da-468a-a514-5c9fba718ea3"

    try:
        contract = Contract.objects.get(id=contract_id)
        match_request = MatchRequest.objects.filter(property=contract.property).first()

        print("\n" + "=" * 80)
        print("🔍 ESTADO ACTUAL DEL FLUJO BIOMÉTRICO")
        print("=" * 80)

        print(f"Estado del contrato: {contract.status}")

        if match_request:
            print(f"Estado del workflow: {match_request.workflow_status}")

            # Mostrar progreso biométrico si existe
            biometric_progress = match_request.workflow_data.get('biometric_progress', {})
            if biometric_progress:
                print("\n📊 Progreso biométrico:")
                for key, value in biometric_progress.items():
                    print(f"  - {key}: {value}")
            else:
                print("\n📊 No hay progreso biométrico registrado aún")

        # Mostrar usuarios permitidos
        print("\n👥 Usuarios autorizados:")
        print(f"  - Arrendador: {contract.primary_party.email}")
        print(f"  - Arrendatario: {contract.secondary_party.email}")
        if contract.guarantor:
            print(f"  - Garante: {contract.guarantor.email}")

        return contract

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        return None

if __name__ == "__main__":
    print("🚀 CONFIGURADOR DE FLUJO BIOMÉTRICO CON GARANTE")
    print()

    # Configurar el contrato con garante
    contract = setup_guarantor_test()

    if contract:
        # Verificar estados actuales
        check_biometric_states()

        print("\n" + "=" * 80)
        print("✅ CONFIGURACIÓN COMPLETADA")
        print("=" * 80)
        print("Ahora puedes probar el flujo biométrico desde el frontend")
        print("El sistema está configurado para el flujo de 3 pasos con garante")
    else:
        print("\n❌ Error en la configuración")