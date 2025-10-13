#!/usr/bin/env python3
"""
Script para verificar el estado actual del workflow entre arrendador y arrendatario
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from matching.models import MatchRequest
from contracts.models import LandlordControlledContract
from django.contrib.auth import get_user_model

User = get_user_model()

def main():
    print("=== VERIFICACIÓN DE ESTADO DEL WORKFLOW ===\n")

    # Ver todos los usuarios para identificar arrendador y arrendatario
    print("=== USUARIOS ===")
    for user in User.objects.all():
        print(f"ID: {user.id}")
        print(f"Email: {user.email}")
        print(f"User Type: {user.user_type}")
        print(f"Full Name: {user.get_full_name()}")
        print("---")

    # Ver estado de match requests
    print("\n=== MATCH REQUESTS ===")
    for mr in MatchRequest.objects.all():
        print(f"ID: {mr.id}")
        print(f"Tenant: {mr.tenant.email}")
        print(f"Landlord: {mr.landlord.email}")
        print(f"Status: {mr.status}")
        print(f"Workflow Stage: {mr.workflow_stage}")
        print(f"Workflow Status: {mr.workflow_status}")
        print(f"Has Contract: {mr.has_contract}")
        print(f"Created: {mr.created_at}")
        if mr.workflow_data:
            print(f"Workflow Data: {mr.workflow_data}")
        print("---")

    # Ver estado de contratos
    print("\n=== LANDLORD CONTROLLED CONTRACTS ===")
    for contract in LandlordControlledContract.objects.all():
        print(f"ID: {contract.id}")
        print(f"Status: {contract.status}")
        print(f"Landlord: {contract.landlord.email}")
        print(f"Tenant: {contract.tenant.email if contract.tenant else 'None'}")
        print(f"Property: {contract.property.title}")
        print(f"Created: {contract.created_at}")
        print("---")

if __name__ == "__main__":
    main()