#!/usr/bin/env python3
"""
Script para crear el registro LandlordControlledContract faltante
basado en los datos del workflow
"""
import os
import sys
import django
from django.utils import timezone

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from contracts.models import LandlordControlledContract
from matching.models import MatchRequest
from properties.models import Property
from django.contrib.auth import get_user_model

User = get_user_model()

def main():
    print("=== CREANDO CONTRATO FALTANTE ===\n")

    # Obtener datos del MatchRequest
    try:
        match_request = MatchRequest.objects.get(id="4167cf50-3f4c-4bb1-bcd7-fd9b669702ab")
        print(f"✅ MatchRequest encontrado: {match_request.id}")

        # Extraer datos del workflow
        workflow_data = match_request.workflow_data
        contract_data = workflow_data.get('contract_created', {})

        contract_id = contract_data.get('contract_id')
        contract_number = contract_data.get('contract_number')
        title = contract_data.get('title')

        print(f"📋 Contract ID: {contract_id}")
        print(f"📋 Contract Number: {contract_number}")
        print(f"📋 Title: {title}")

        # Verificar si ya existe
        if LandlordControlledContract.objects.filter(id=contract_id).exists():
            print("⚠️ El contrato ya existe")
            return

        # Verificar si el contract_number ya existe y generar uno nuevo si es necesario
        existing_numbers = LandlordControlledContract.objects.filter(
            contract_number=contract_number
        ).exists()

        if existing_numbers:
            print(f"⚠️ Contract number {contract_number} ya existe, generando uno nuevo")
            # Generar un nuevo número de contrato
            import datetime
            current_year = datetime.datetime.now().year
            last_contract = LandlordControlledContract.objects.filter(
                contract_number__startswith=f'VH-{current_year}-'
            ).order_by('-contract_number').first()

            if last_contract:
                last_num = int(last_contract.contract_number.split('-')[-1])
                contract_number = f'VH-{current_year}-{str(last_num + 1).zfill(6)}'
            else:
                contract_number = f'VH-{current_year}-000001'

            print(f"📋 Nuevo Contract Number: {contract_number}")

        # Crear el contrato con la estructura correcta
        rent_price = match_request.property.rent_price or 0
        deposit = rent_price * 2 if rent_price else 0

        contract = LandlordControlledContract.objects.create(
            id=contract_id,
            contract_number=contract_number,
            title=title,
            landlord=match_request.landlord,
            tenant=match_request.tenant,
            property=match_request.property,
            current_state='BOTH_REVIEWING',  # Estado para que tenant pueda aprobar
            contract_type='rental_urban',
            description=f'Contrato de arrendamiento para {match_request.property.title}',
            # Usar JSONField structure
            economic_terms={
                'monthly_rent': float(rent_price),
                'deposit_amount': float(deposit),
                'administration_fee': 0,
                'additional_costs': 0
            },
            contract_terms={
                'lease_duration_months': 12,
                'utilities_included': False,
                'pets_allowed': False,
                'furniture_included': False,
                'early_termination_clause': True
            },
            landlord_data={
                'name': match_request.landlord.get_full_name(),
                'email': match_request.landlord.email,
                'property_address': match_request.property.address
            },
            tenant_data={
                'name': match_request.tenant.get_full_name(),
                'email': match_request.tenant.email
            },
            special_clauses=[],
            property_data={
                'property_id': str(match_request.property.id),
                'property_title': match_request.property.title,
                'property_type': match_request.property.property_type,
                'area': float(match_request.property.total_area or 0)
            }
        )

        print(f"✅ Contrato creado exitosamente:")
        print(f"   - ID: {contract.id}")
        print(f"   - Estado: {contract.current_state}")
        print(f"   - Landlord: {contract.landlord.email}")
        print(f"   - Tenant: {contract.tenant.email}")
        print(f"   - Property: {contract.property.title}")

        # Actualizar el workflow status del match request
        match_request.workflow_status = 'contract_pending_tenant_approval'
        match_request.save()

        print(f"✅ MatchRequest actualizado con workflow_status: {match_request.workflow_status}")

    except MatchRequest.DoesNotExist:
        print("❌ MatchRequest no encontrado")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main()