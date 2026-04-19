#!/usr/bin/env python
"""
Seed idempotente para tests E2E VeriHome (multi-usuario + garante).

Modos (CLI arg):
  - minimal                   : solo usuarios (landlord + tenant + guarantor)
  - property_ready            : + propiedad del landlord disponible
  - ready_for_bio             : + MatchRequest aceptada + Contract status=ready_for_authentication
  - ready_for_bio_guarantor   : + todo lo anterior + CodeudorAuthToken activo

Imprime JSON en stdout con IDs; logs a stderr.
"""
import json
import os
import sys
from decimal import Decimal
from datetime import timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')

import django  # noqa: E402

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.utils import timezone  # noqa: E402

from properties.models import Property  # noqa: E402
from matching.models import MatchRequest  # noqa: E402

User = get_user_model()

LANDLORD_EMAIL = 'admin@verihome.com'
TENANT_EMAIL = 'letefon100@gmail.com'
GUARANTOR_EMAIL = 'guarantor.e2e@verihome.com'
# 2026-04-18: actores adicionales para tests moleculares Fase A-F
ADMIN_EMAIL = 'abogado.e2e@verihome.com'
SERVICE_PROVIDER_EMAIL = 'prestador.e2e@verihome.com'
VERIFICATION_AGENT_EMAIL = 'agente.e2e@verihome.com'
PASSWORD = 'admin123'
PROPERTY_TITLE = 'E2E Test Property - Playwright'


def log(msg):
    print(f'[seed] {msg}', file=sys.stderr)


def ensure_user(email, user_type, first_name, last_name, is_staff=False):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'first_name': first_name,
            'last_name': last_name,
            'user_type': user_type,
            'is_verified': True,
            'is_active': True,
            'is_staff': is_staff,
        },
    )
    user.set_password(PASSWORD)
    user.is_verified = True
    user.is_active = True
    user.user_type = user_type
    # is_staff: forzar siempre para idempotencia del seed
    user.is_staff = is_staff
    if not user.first_name:
        user.first_name = first_name
    if not user.last_name:
        user.last_name = last_name
    user.save()

    # El login pasa por allauth que valida EmailAddress.verified=True,
    # no sólo user.is_verified. Crear/actualizar la entrada.
    try:
        from allauth.account.models import EmailAddress  # noqa: WPS433
        EmailAddress.objects.update_or_create(
            user=user,
            email=email,
            defaults={'primary': True, 'verified': True},
        )
    except Exception as exc:  # pragma: no cover
        log(f"warn: EmailAddress create failed for {email}: {exc}")

    suffix = ' [staff]' if is_staff else ''
    log(f"user {'created' if created else 'ensured'}: {email} ({user_type}){suffix}")
    return user


def ensure_property(landlord):
    prop, created = Property.objects.get_or_create(
        landlord=landlord,
        title=PROPERTY_TITLE,
        defaults={
            'description': 'Propiedad creada automaticamente para tests E2E.',
            'property_type': 'apartment',
            'listing_type': 'rent',
            'status': 'available',
            'address': 'Carrera 27 #42-01',
            'city': 'Bucaramanga',
            'state': 'Santander',
            'country': 'Colombia',
            'postal_code': '680001',
            'bedrooms': 2,
            'bathrooms': 1,
            'total_area': Decimal('65.00'),
            'rent_price': Decimal('1500000.00'),
            'is_active': True,
        },
    )
    if not created:
        prop.status = 'available'
        prop.is_active = True
        prop.save(update_fields=['status', 'is_active'])
    log(f"property {'created' if created else 'ensured'}: {prop.id}")
    return prop


def reset_match_and_contracts(landlord, tenant, prop):
    deleted_mr = MatchRequest.objects.filter(tenant=tenant, property=prop).delete()
    log(f"deleted prior MatchRequests: {deleted_mr[0]}")
    try:
        from contracts.landlord_contract_models import (
            LandlordControlledContract,
            CodeudorAuthToken,
        )

        tokens = CodeudorAuthToken.objects.filter(
            contract__landlord=landlord, contract__tenant=tenant
        ).delete()
        log(f"deleted prior CodeudorAuthTokens: {tokens[0]}")

        deleted_lcc = LandlordControlledContract.objects.filter(
            landlord=landlord, tenant=tenant, property=prop
        ).delete()
        log(f"deleted prior LandlordControlledContracts: {deleted_lcc[0]}")
    except Exception as exc:
        log(f"warn: could not clean LandlordControlledContract/CodeudorAuthToken: {exc}")
    try:
        from contracts.models import Contract

        deleted_c = Contract.objects.filter(primary_party=landlord, secondary_party=tenant).delete()
        log(f"deleted prior legacy Contracts: {deleted_c[0]}")
    except Exception as exc:
        log(f"warn: could not clean legacy Contract: {exc}")


def create_match_request(landlord, tenant, prop, has_guarantor=False):
    mr = MatchRequest.objects.create(
        tenant=tenant,
        property=prop,
        landlord=landlord,
        status='accepted',
        tenant_message='Solicitud creada por seed E2E',
        landlord_response='Aceptada por seed E2E',
        monthly_income=Decimal('3000000.00'),
        employment_type='employed',
        workflow_stage=4,
        workflow_status='pending_tenant_biometric',
        has_contract=True,
        contract_generated_at=timezone.now(),
    )
    log(f"MatchRequest created: {mr.id} (stage={mr.workflow_stage})")
    return mr


def create_contract_ready_for_signing(landlord, tenant, prop, match_request):
    from contracts.models import Contract
    from dateutil.relativedelta import relativedelta

    start_date = timezone.now().date() + timedelta(days=7)
    end_date = start_date + relativedelta(months=12)

    contract = Contract.objects.create(
        match_request=match_request,
        contract_type='rental_urban',
        title=f'Contrato E2E Test - {prop.title}',
        description='Generado por seed_e2e_multiuser.py',
        content='Contrato de arrendamiento para test E2E.',
        primary_party=landlord,
        secondary_party=tenant,
        property=prop,  # requerido para que recompute_workflow_status encuentre MatchRequest
        start_date=start_date,
        end_date=end_date,
        monthly_rent=prop.rent_price or Decimal('1500000.00'),
        security_deposit=prop.rent_price or Decimal('1500000.00'),
        status='ready_for_authentication',
        variables_data={'seed': 'e2e_multiuser'},
    )
    log(f"Contract (legacy) created: {contract.id} (status={contract.status})")

    try:
        match_request.workflow_data = match_request.workflow_data or {}
        match_request.workflow_data['contract_created'] = {
            'contract_id': str(contract.id),
            'created_at': timezone.now().isoformat(),
            'status': contract.status,
        }
        match_request.save(update_fields=['workflow_data'])
    except Exception as exc:
        log(f"warn: no se pudo actualizar workflow_data: {exc}")

    return contract


def create_landlord_controlled_contract(landlord, tenant, prop, contract):
    """Crea LandlordControlledContract espejo del Contract legacy."""
    try:
        from contracts.landlord_contract_models import LandlordControlledContract

        lcc, created = LandlordControlledContract.objects.get_or_create(
            id=contract.id,
            defaults={
                'contract_number': contract.contract_number,
                'landlord': landlord,
                'tenant': tenant,
                'property': prop,
                'contract_type': 'rental_urban',
                'title': contract.title,
                'description': contract.description or '',
                'current_state': 'PUBLISHED',
                'start_date': contract.start_date,
                'end_date': contract.end_date,
                'economic_terms': {
                    'monthly_rent': float(contract.monthly_rent),
                    'security_deposit': float(contract.security_deposit or 0),
                },
                'contract_terms': {'duration_months': 12},
                'property_data': {
                    'address': prop.address,
                    'city': prop.city,
                    'title': prop.title,
                },
                'landlord_approved': True,
                'tenant_approved': True,
            },
        )
        log(f"LandlordControlledContract {'created' if created else 'ensured'}: {lcc.id}")
        return lcc
    except Exception as exc:
        log(f"warn: LandlordControlledContract creation failed: {exc}")
        return None


def create_codeudor_token(landlord, guarantor, landlord_contract):
    """Crea CodeudorAuthToken activo para el garante."""
    try:
        from contracts.landlord_contract_models import (
            CodeudorAuthToken,
            LandlordContractGuarantee,
        )
        import secrets
        import hashlib

        guarantee, _ = LandlordContractGuarantee.objects.get_or_create(
            contract=landlord_contract,
            guarantee_type='CO_SIGNER',
            defaults={
                'title': 'Codeudor Solidario E2E',
                'description': 'Garante para test E2E',
                'amount': Decimal('1500000.00'),
                'status': 'ACTIVE',
                'created_by': landlord,
            },
        )

        token_raw = secrets.token_urlsafe(64)
        token_hash = hashlib.sha256(token_raw.encode()).hexdigest()

        auth_token = CodeudorAuthToken.objects.create(
            token=token_raw,
            token_hash=token_hash,
            contract=landlord_contract,
            guarantee=guarantee,
            codeudor_name=f'{guarantor.first_name} {guarantor.last_name}',
            codeudor_email=guarantor.email,
            codeudor_document_type='CC',
            codeudor_document_number='9876543210',
            codeudor_type='codeudor_salario',
            status='sent',
            expires_at=timezone.now() + timedelta(days=7),
            created_by=landlord,
            personal_message='Token E2E test',
        )
        log(f"CodeudorAuthToken created: {auth_token.id} (token={token_raw[:16]}...)")
        return auth_token
    except Exception as exc:
        log(f"warn: CodeudorAuthToken creation failed: {exc}")
        return None


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else 'ready_for_bio'
    log(f"mode: {mode}")

    landlord = ensure_user(LANDLORD_EMAIL, 'landlord', 'Admin', 'VeriHome')
    tenant = ensure_user(TENANT_EMAIL, 'tenant', 'Leidy', 'Tenant')
    guarantor = ensure_user(GUARANTOR_EMAIL, 'tenant', 'Garante', 'Solidario')
    admin = ensure_user(ADMIN_EMAIL, 'landlord', 'Abogado', 'VeriHome', is_staff=True)
    service_provider = ensure_user(
        SERVICE_PROVIDER_EMAIL, 'service_provider', 'Prestador', 'E2E'
    )
    verification_agent = ensure_user(
        VERIFICATION_AGENT_EMAIL, 'landlord', 'Agente', 'Verificacion', is_staff=True
    )

    result = {
        'mode': mode,
        'landlord_id': str(landlord.id),
        'tenant_id': str(tenant.id),
        'guarantor_id': str(guarantor.id),
        'admin_id': str(admin.id),
        'service_provider_id': str(service_provider.id),
        'verification_agent_id': str(verification_agent.id),
        'landlord_email': LANDLORD_EMAIL,
        'tenant_email': TENANT_EMAIL,
        'guarantor_email': GUARANTOR_EMAIL,
        'admin_email': ADMIN_EMAIL,
        'service_provider_email': SERVICE_PROVIDER_EMAIL,
        'verification_agent_email': VERIFICATION_AGENT_EMAIL,
        'password': PASSWORD,
        'timestamp': timezone.now().isoformat(),
    }

    if mode == 'minimal':
        print(json.dumps(result, indent=2))
        return

    prop = ensure_property(landlord)
    result['property_id'] = str(prop.id)

    if mode == 'property_ready':
        # Solo limpiar artefactos previos para dejar propiedad disponible
        reset_match_and_contracts(landlord, tenant, prop)
        print(json.dumps(result, indent=2))
        return

    reset_match_and_contracts(landlord, tenant, prop)
    mr = create_match_request(landlord, tenant, prop)
    contract = create_contract_ready_for_signing(landlord, tenant, prop, mr)
    result['match_request_id'] = str(mr.id)
    result['contract_id'] = str(contract.id)

    if mode == 'ready_for_bio_guarantor':
        lcc = create_landlord_controlled_contract(landlord, tenant, prop, contract)
        if lcc:
            token = create_codeudor_token(landlord, guarantor, lcc)
            if token:
                result['codeudor_token'] = token.token
                result['codeudor_token_id'] = str(token.id)

    if mode == 'admin_review':
        # Crea LCC en PENDING_ADMIN_REVIEW para el flujo de revisión jurídica
        lcc = create_landlord_controlled_contract(landlord, tenant, prop, contract)
        if lcc:
            lcc.current_state = 'PENDING_ADMIN_REVIEW'
            lcc.save(update_fields=['current_state'])
            result['lcc_id'] = str(lcc.id)
            log(f"LCC set to PENDING_ADMIN_REVIEW: {lcc.id}")

    if mode == 'tenant_reviewing':
        # LCC en TENANT_REVIEWING para testar devolución circular / objeciones
        lcc = create_landlord_controlled_contract(landlord, tenant, prop, contract)
        if lcc:
            lcc.current_state = 'TENANT_REVIEWING'
            lcc.review_cycle_count = 0
            lcc.save(update_fields=['current_state', 'review_cycle_count'])
            result['lcc_id'] = str(lcc.id)
            log(f"LCC set to TENANT_REVIEWING: {lcc.id}")

    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
