#!/usr/bin/env python
"""
Seed idempotente para tests E2E VeriHome (multi-usuario + garante).

Modos (CLI arg):
  - minimal                   : solo usuarios (landlord + tenant + guarantor)
  - property_ready            : + propiedad del landlord disponible
  - ready_for_bio             : + MatchRequest aceptada + Contract status=ready_for_authentication
  - ready_for_bio_guarantor   : + todo lo anterior + CodeudorAuthToken activo
  - vhid_tenant_unverified    : tenant SIN FieldVisitRequest, is_verified=False (F1·C3)
  - vhid_tenant_wait_visit    : tenant con FieldVisitRequest digital_completed/aprobado
                                sin scheduled_visit, is_verified=False (F1·C4)
  - vhid_act_in_progress      : agente + FieldVisitRequest + VerificationVisit asignada
                                + FieldVisitAct(status=draft) (F1·C5)
  - full_ecosystem            : pruebas manuales · todos los usuarios verificados +
                                4 propiedades + Contract activo + ServiceSubscription
                                + InterviewCode + SupportTicket abierto.

Imprime JSON en stdout con IDs; logs a stderr.
"""

import json
import os
import sys
from decimal import Decimal
from datetime import timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "verihome.settings")

import django  # noqa: E402

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.utils import timezone  # noqa: E402

from properties.models import Property  # noqa: E402
from matching.models import MatchRequest  # noqa: E402

User = get_user_model()

LANDLORD_EMAIL = "admin@verihome.com"
TENANT_EMAIL = "letefon100@gmail.com"
GUARANTOR_EMAIL = "guarantor.e2e@verihome.com"
# 2026-04-18: actores adicionales para tests moleculares Fase A-F
ADMIN_EMAIL = "abogado.e2e@verihome.com"
SERVICE_PROVIDER_EMAIL = "prestador.e2e@verihome.com"
VERIFICATION_AGENT_EMAIL = "agente.e2e@verihome.com"
# 2026-04-20: actor juridico para full-admin-review-flow (password propio)
JURIDICO_EMAIL = "juridico@verihome.com"
JURIDICO_PASSWORD = "juridico123"
PASSWORD = "admin123"
PROPERTY_TITLE = "E2E Test Property - Playwright"


def log(msg):
    print(f"[seed] {msg}", file=sys.stderr)


def emit_result(result):
    # Marcadores sentinela para que globalSetup pueda extraer el JSON
    # aunque Django/apps impriman cualquier cosa a stdout antes (warnings,
    # ready(), management commands). JSON compacto en una sola linea.
    print("__SEED_JSON_START__")
    print(json.dumps(result))
    print("__SEED_JSON_END__")


def ensure_user(email, user_type, first_name, last_name, is_staff=False, password=None):
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            "first_name": first_name,
            "last_name": last_name,
            "user_type": user_type,
            "is_verified": True,
            "is_active": True,
            "is_staff": is_staff,
        },
    )
    user.set_password(password or PASSWORD)
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
            defaults={"primary": True, "verified": True},
        )
    except Exception as exc:  # pragma: no cover
        log(f"warn: EmailAddress create failed for {email}: {exc}")

    suffix = " [staff]" if is_staff else ""
    log(f"user {'created' if created else 'ensured'}: {email} ({user_type}){suffix}")
    return user


def ensure_property(landlord):
    prop, created = Property.objects.get_or_create(
        landlord=landlord,
        title=PROPERTY_TITLE,
        defaults={
            "description": "Propiedad creada automaticamente para tests E2E.",
            "property_type": "apartment",
            "listing_type": "rent",
            "status": "available",
            "address": "Carrera 27 #42-01",
            "city": "Bucaramanga",
            "state": "Santander",
            "country": "Colombia",
            "postal_code": "680001",
            "bedrooms": 2,
            "bathrooms": 1,
            "total_area": Decimal("65.00"),
            "rent_price": Decimal("1500000.00"),
            "is_active": True,
        },
    )
    if not created:
        prop.status = "available"
        prop.is_active = True
        prop.save(update_fields=["status", "is_active"])
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
        log(
            f"warn: could not clean LandlordControlledContract/CodeudorAuthToken: {exc}"
        )
    try:
        from contracts.models import Contract

        deleted_c = Contract.objects.filter(
            primary_party=landlord, secondary_party=tenant
        ).delete()
        log(f"deleted prior legacy Contracts: {deleted_c[0]}")
    except Exception:
        pass

    try:
        # Limpia PaymentOrders + RentPaymentSchedule + Transactions del
        # par landlord+tenant para que el conteo del seed contract_active
        # coincida con lo que el endpoint devuelve (Fase D1).
        from payments.models import PaymentOrder, RentPaymentSchedule, Transaction

        deleted_po = PaymentOrder.objects.filter(
            payer=tenant, payee=landlord
        ).delete()
        log(f"deleted prior PaymentOrders (payer/payee): {deleted_po[0]}")

        deleted_rps = RentPaymentSchedule.objects.filter(
            tenant=tenant, landlord=landlord
        ).delete()
        log(f"deleted prior RentPaymentSchedules: {deleted_rps[0]}")

        deleted_tx = Transaction.objects.filter(
            payer=tenant, payee=landlord
        ).delete()
        log(f"deleted prior Transactions: {deleted_tx[0]}")
    except Exception as exc:
        log(f"warn: could not clean payment artifacts: {exc}")


def create_match_request(landlord, tenant, prop, has_guarantor=False):
    mr = MatchRequest.objects.create(
        tenant=tenant,
        property=prop,
        landlord=landlord,
        status="accepted",
        tenant_message="Solicitud creada por seed E2E",
        landlord_response="Aceptada por seed E2E",
        monthly_income=Decimal("3000000.00"),
        employment_type="employed",
        workflow_stage=4,
        workflow_status="pending_tenant_biometric",
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
        contract_type="rental_urban",
        title=f"Contrato E2E Test - {prop.title}",
        description="Generado por seed_e2e_multiuser.py",
        content="Contrato de arrendamiento para test E2E.",
        primary_party=landlord,
        secondary_party=tenant,
        property=prop,  # requerido para que recompute_workflow_status encuentre MatchRequest
        start_date=start_date,
        end_date=end_date,
        monthly_rent=prop.rent_price or Decimal("1500000.00"),
        security_deposit=prop.rent_price or Decimal("1500000.00"),
        status="ready_for_authentication",
        variables_data={"seed": "e2e_multiuser"},
    )
    log(f"Contract (legacy) created: {contract.id} (status={contract.status})")

    try:
        match_request.workflow_data = match_request.workflow_data or {}
        match_request.workflow_data["contract_created"] = {
            "contract_id": str(contract.id),
            "created_at": timezone.now().isoformat(),
            "status": contract.status,
        }
        match_request.save(update_fields=["workflow_data"])
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
                "contract_number": contract.contract_number,
                "landlord": landlord,
                "tenant": tenant,
                "property": prop,
                "contract_type": "rental_urban",
                "title": contract.title,
                "description": contract.description or "",
                "current_state": "PUBLISHED",
                "start_date": contract.start_date,
                "end_date": contract.end_date,
                "economic_terms": {
                    "monthly_rent": float(contract.monthly_rent),
                    "security_deposit": float(contract.security_deposit or 0),
                },
                "contract_terms": {"duration_months": 12},
                "property_data": {
                    "address": prop.address,
                    "city": prop.city,
                    "title": prop.title,
                },
                "landlord_approved": True,
                "tenant_approved": True,
            },
        )
        log(
            f"LandlordControlledContract {'created' if created else 'ensured'}: {lcc.id}"
        )
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
            guarantee_type="CO_SIGNER",
            defaults={
                "title": "Codeudor Solidario E2E",
                "description": "Garante para test E2E",
                "amount": Decimal("1500000.00"),
                "status": "ACTIVE",
                "created_by": landlord,
            },
        )

        token_raw = secrets.token_urlsafe(64)
        token_hash = hashlib.sha256(token_raw.encode()).hexdigest()

        auth_token = CodeudorAuthToken.objects.create(
            token=token_raw,
            token_hash=token_hash,
            contract=landlord_contract,
            guarantee=guarantee,
            codeudor_name=f"{guarantor.first_name} {guarantor.last_name}",
            codeudor_email=guarantor.email,
            codeudor_document_type="CC",
            codeudor_document_number="9876543210",
            codeudor_type="codeudor_salario",
            status="sent",
            expires_at=timezone.now() + timedelta(days=7),
            created_by=landlord,
            personal_message="Token E2E test",
        )
        log(f"CodeudorAuthToken created: {auth_token.id} (token={token_raw[:16]}...)")
        return auth_token
    except Exception as exc:
        log(f"warn: CodeudorAuthToken creation failed: {exc}")
        return None


def reset_field_visit_data(user):
    """
    Borra `FieldVisitAct`, `FieldVisitRequest` y `VerificationVisit`
    del usuario para garantizar estado limpio en seeds de VeriHome ID.
    """
    try:
        from verification.models import (
            FieldVisitAct,
            FieldVisitRequest,
            VerificationVisit,
        )

        deleted_acts = FieldVisitAct.objects.filter(field_request__user=user).delete()
        log(f"deleted prior FieldVisitActs: {deleted_acts[0]}")
        deleted_reqs = FieldVisitRequest.objects.filter(user=user).delete()
        log(f"deleted prior FieldVisitRequests: {deleted_reqs[0]}")
        deleted_visits = VerificationVisit.objects.filter(target_user=user).delete()
        log(f"deleted prior VerificationVisits (target={user.email}): {deleted_visits[0]}")
    except Exception as exc:
        log(f"warn: reset_field_visit_data failed for {user.email}: {exc}")


def ensure_verification_agent_profile(agent_user):
    """Crea/asegura `VerificationAgent` profile para el usuario agente."""
    try:
        from verification.models import VerificationAgent

        profile, _ = VerificationAgent.objects.get_or_create(
            user=agent_user,
            defaults={
                "specialization": "both",
                "is_available": True,
                "max_weekly_visits": 20,
                "service_areas": ["Cabecera", "San Francisco", "Bucaramanga"],
            },
        )
        profile.is_available = True
        profile.save(update_fields=["is_available"])
        return profile
    except Exception as exc:
        log(f"warn: ensure_verification_agent_profile failed: {exc}")
        return None


def create_field_visit_request_wait_visit(user):
    """
    Crea `FieldVisitRequest` con flujo digital aprobado y sin visita
    presencial asignada. Estado consolidado `wait_visit` para el frontend.
    """
    from verification.models import FieldVisitRequest

    fr = FieldVisitRequest.objects.create(
        user=user,
        document_type_declared="cedula_ciudadania",
        document_number_declared="1098765432",
        full_name_declared=f"{user.first_name} {user.last_name}".strip() or "Tenant E2E",
        ocr_data={
            "document_number": "1098765432",
            "first_names": user.first_name or "Leidy",
            "surnames": user.last_name or "Tenant",
        },
        liveness_data={"qualityScore": 0.85, "totalDurationMs": 4200},
        face_match_data={"similarity": 0.78, "passed": True},
        digital_score={
            "observaciones": [],
            "total": 0.45,
            "subscores": {
                "ocr_match": 0.10,
                "liveness": 0.10,
                "face_match": 0.10,
                "selfie_quality": 0.075,
                "doc_quality": 0.075,
            },
        },
        digital_score_total=Decimal("0.450"),
        digital_verdict="aprobado",
        status="digital_completed",
    )
    log(f"FieldVisitRequest created (wait_visit): {fr.id}")
    return fr


def create_field_visit_act_draft(field_request, agent_profile, tenant):
    """
    Crea visita presencial asignada al agente (status=in_progress) y
    `FieldVisitAct` en borrador, listo para que el agente cargue scores.
    """
    from verification.models import FieldVisitAct, VerificationVisit

    visit = VerificationVisit.objects.create(
        visit_type="tenant",
        target_user=tenant,
        status="in_progress",
        agent=agent_profile,
        visit_address="Calle 34 #27-18",
        visit_city="Bucaramanga",
        scheduled_date=timezone.now().date(),
        scheduled_time="10:00",
        started_at=timezone.now(),
    )
    field_request.scheduled_visit = visit
    field_request.status = "visit_scheduled"
    field_request.save(update_fields=["scheduled_visit", "status"])

    act = FieldVisitAct.objects.create(
        field_request=field_request,
        visit=visit,
        payload={
            "secciones": {
                "I": {"identificacion": field_request.full_name_declared},
                "II": {"agente": agent_profile.user.email if agent_profile else None},
            }
        },
        visit_score_breakdown={},
        visit_score_total=Decimal("0.000"),
        status="draft",
    )
    log(
        f"FieldVisitAct draft created: {act.id} "
        f"(act_number={act.act_number}, visit={visit.visit_number})"
    )
    return visit, act


def setup_full_ecosystem(
    landlord, tenant, guarantor, admin, service_provider, verification_agent
):
    """
    Modo `full_ecosystem` para pruebas manuales del usuario.

    Construye un escenario completo: tenant verificado bypass-VHID,
    4 propiedades en distintas ciudades, un MatchRequest aceptado +
    Contract activo + cronograma de pagos, ServiceSubscription activa
    para el provider, VerificationAgent profile, InterviewCode válido
    para registros nuevos, SupportTicket abierto. Todo idempotente.
    """
    from datetime import date as _date
    from dateutil.relativedelta import relativedelta

    # 1) Marcar usuarios como verificados (bypass VHID enforcement)
    for u in [tenant, guarantor, service_provider]:
        if not u.is_verified:
            u.is_verified = True
            u.verification_date = timezone.now()
            u.save(update_fields=["is_verified", "verification_date"])

    # 2) Limpiar artefactos previos del par landlord+tenant
    prop = ensure_property(landlord)
    reset_match_and_contracts(landlord, tenant, prop)
    reset_field_visit_data(tenant)

    # 3) 3 propiedades adicionales para variedad de búsqueda
    Property.objects.filter(title__startswith="VeriHome Demo · ").delete()
    extras = [
        ("VeriHome Demo · Cedritos", "Bogotá", "Cundinamarca", Decimal("2800000"), 3, 2),
        ("VeriHome Demo · El Poblado", "Medellín", "Antioquia", Decimal("1900000"), 2, 1),
        ("VeriHome Demo · Ciudad Jardín", "Cali", "Valle del Cauca", Decimal("1200000"), 2, 2),
    ]
    extra_ids = []
    for title, city, state, price, beds, baths in extras:
        p = Property.objects.create(
            landlord=landlord,
            title=title,
            description=f"Propiedad demo VeriHome en {city}",
            property_type="apartment",
            listing_type="rent",
            status="available",
            address=f"Calle {len(extra_ids)+10} #20-{len(extra_ids)+5}",
            city=city,
            state=state,
            country="Colombia",
            postal_code="000000",
            bedrooms=beds,
            bathrooms=baths,
            total_area=Decimal("70.00"),
            rent_price=price,
            is_active=True,
        )
        extra_ids.append(str(p.id))
    log(f"created {len(extra_ids)} extra demo properties")

    # 4) MatchRequest aceptado + Contract + LCC ACTIVE → genera cronograma
    mr = create_match_request(landlord, tenant, prop)
    contract = create_contract_ready_for_signing(landlord, tenant, prop, mr)
    lcc = create_landlord_controlled_contract(landlord, tenant, prop, contract)
    if lcc:
        lcc.start_date = _date.today()
        lcc.end_date = lcc.start_date + relativedelta(months=12)
        lcc.economic_terms = {
            "monthly_rent": "1500000",
            "security_deposit": "1500000",
        }
        lcc.save(update_fields=["start_date", "end_date", "economic_terms"])
        lcc._updated_by = landlord
        lcc.current_state = "ACTIVE"
        lcc.save(update_fields=["current_state"])

    # 5) ServiceSubscription activa + Service para el provider
    try:
        from services.models import (
            ServiceCategory,
            Service,
            ServiceSubscription,
            SubscriptionPlan,
        )

        plan, _ = SubscriptionPlan.objects.get_or_create(
            slug="plan-demo",
            defaults={
                "name": "Plan Demo VeriHome",
                "description": "Plan estándar para pruebas manuales",
                "billing_cycle": "monthly",
                "price": Decimal("50000"),
                "max_active_services": 10,
                "max_monthly_requests": 100,
                "is_active": True,
            },
        )
        ServiceSubscription.objects.update_or_create(
            service_provider=service_provider,
            defaults={
                "plan": plan,
                "status": "active",
                "start_date": timezone.now() - timedelta(days=1),
                "end_date": timezone.now() + timedelta(days=365),
                "auto_renew": True,
            },
        )
        cat, _ = ServiceCategory.objects.get_or_create(
            slug="demo-mantenimiento",
            defaults={
                "name": "Mantenimiento general",
                "description": "Categoría demo VeriHome",
                "is_active": True,
            },
        )
        Service.objects.get_or_create(
            slug="demo-reparacion-general",
            defaults={
                "category": cat,
                "name": "Reparación general · Demo",
                "short_description": "Servicio demo para pruebas",
                "full_description": "Reparaciones generales (plomería, electricidad, pintura)",
                "pricing_type": "fixed",
                "base_price": Decimal("180000"),
                "difficulty": "easy",
                "estimated_duration": "2h",
                "is_active": True,
                "provider": service_provider,
            },
        )
    except Exception as exc:
        log(f"warn: services setup failed: {exc}")

    # 6) VerificationAgent profile siempre disponible
    ensure_verification_agent_profile(verification_agent)

    # 7) InterviewCode válido para registros nuevos
    interview_code = None
    try:
        from users.models.interview import InterviewCode

        InterviewCode.objects.filter(code="DEMO2026").delete()
        interview_code = InterviewCode.objects.create(
            code="DEMO2026",
            user_type="tenant",
            email=f"nuevo.tenant.demo@verihome.local",
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=30),
            created_by=admin,
            max_uses=10,
        )
        log(f"InterviewCode demo: {interview_code.code}")
    except Exception as exc:
        log(f"warn: InterviewCode setup failed: {exc}")

    # 8) SupportTicket abierto del tenant
    ticket = None
    try:
        from core.models import SupportTicket

        SupportTicket.objects.filter(
            subject__startswith="DEMO · ",
        ).delete()
        ticket = SupportTicket.objects.create(
            subject="DEMO · No puedo descargar el PDF del contrato",
            description="Cuando hago click en descargar el PDF aparece error 500.",
            category="technical",
            priority="medium",
            created_by=tenant,
            status="open",
        )
    except Exception as exc:
        log(f"warn: SupportTicket setup failed: {exc}")

    return {
        "property_id": str(prop.id),
        "property_extra_ids": extra_ids,
        "match_request_id": str(mr.id),
        "contract_id": str(contract.id),
        "lcc_id": str(lcc.id) if lcc else None,
        "interview_code": interview_code.code if interview_code else None,
        "ticket_id": str(ticket.id) if ticket else None,
    }


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "ready_for_bio"
    log(f"mode: {mode}")

    landlord = ensure_user(LANDLORD_EMAIL, "landlord", "Admin", "VeriHome")
    tenant = ensure_user(TENANT_EMAIL, "tenant", "Leidy", "Tenant")
    guarantor = ensure_user(GUARANTOR_EMAIL, "tenant", "Garante", "Solidario")
    admin = ensure_user(ADMIN_EMAIL, "landlord", "Abogado", "VeriHome", is_staff=True)
    service_provider = ensure_user(
        SERVICE_PROVIDER_EMAIL, "service_provider", "Prestador", "E2E"
    )
    verification_agent = ensure_user(
        VERIFICATION_AGENT_EMAIL, "landlord", "Agente", "Verificacion", is_staff=True
    )
    juridico = ensure_user(
        JURIDICO_EMAIL,
        "landlord",
        "Juridico",
        "VeriHome",
        is_staff=True,
        password=JURIDICO_PASSWORD,
    )

    result = {
        "mode": mode,
        "landlord_id": str(landlord.id),
        "tenant_id": str(tenant.id),
        "guarantor_id": str(guarantor.id),
        "admin_id": str(admin.id),
        "service_provider_id": str(service_provider.id),
        "verification_agent_id": str(verification_agent.id),
        "juridico_id": str(juridico.id),
        "landlord_email": LANDLORD_EMAIL,
        "tenant_email": TENANT_EMAIL,
        "guarantor_email": GUARANTOR_EMAIL,
        "admin_email": ADMIN_EMAIL,
        "service_provider_email": SERVICE_PROVIDER_EMAIL,
        "verification_agent_email": VERIFICATION_AGENT_EMAIL,
        "juridico_email": JURIDICO_EMAIL,
        "juridico_password": JURIDICO_PASSWORD,
        "password": PASSWORD,
        "timestamp": timezone.now().isoformat(),
    }

    if mode == "minimal":
        emit_result(result)
        return

    if mode == "full_ecosystem":
        # Modo para pruebas manuales: tenant verificado bypass-VHID,
        # 4 propiedades, ServiceSubscription, contrato activo con
        # cronograma, ticket abierto, InterviewCode válido.
        ext = setup_full_ecosystem(
            landlord, tenant, guarantor, admin, service_provider, verification_agent
        )
        result.update(ext)
        emit_result(result)
        return

    if mode == "vhid_tenant_unverified":
        # F1·C3 — tenant SIN onboarding VeriHome ID. POST a properties /
        # match-requests debe responder 403 con code=verihome_id_required.
        prop = ensure_property(landlord)
        result["property_id"] = str(prop.id)
        reset_field_visit_data(tenant)
        if tenant.is_verified:
            tenant.is_verified = False
            tenant.save(update_fields=["is_verified"])
        emit_result(result)
        return

    if mode == "vhid_tenant_wait_visit":
        # F1·C4 — tenant con flujo digital aprobado pero sin visita.
        # next_step="wait_visit". Banner Dashboard + Gate disabled.
        prop = ensure_property(landlord)
        result["property_id"] = str(prop.id)
        reset_field_visit_data(tenant)
        if tenant.is_verified:
            tenant.is_verified = False
            tenant.save(update_fields=["is_verified"])
        fr = create_field_visit_request_wait_visit(tenant)
        result["field_request_id"] = str(fr.id)
        emit_result(result)
        return

    if mode == "vhid_act_in_progress":
        # F1·C5 — agente con visita asignada y FieldVisitAct draft listo
        # para que el agente cargue 8 sub-scores via VisitScoreEditor.
        prop = ensure_property(landlord)
        result["property_id"] = str(prop.id)
        reset_field_visit_data(tenant)
        if tenant.is_verified:
            tenant.is_verified = False
            tenant.save(update_fields=["is_verified"])
        agent_profile = ensure_verification_agent_profile(verification_agent)
        fr = create_field_visit_request_wait_visit(tenant)
        visit, act = create_field_visit_act_draft(fr, agent_profile, tenant)
        result["field_request_id"] = str(fr.id)
        result["visit_id"] = str(visit.id)
        result["act_id"] = str(act.id)
        result["agent_profile_id"] = str(agent_profile.id) if agent_profile else None
        emit_result(result)
        return

    prop = ensure_property(landlord)
    result["property_id"] = str(prop.id)

    if mode == "property_ready":
        # Solo limpiar artefactos previos para dejar propiedad disponible
        reset_match_and_contracts(landlord, tenant, prop)
        emit_result(result)
        return

    reset_match_and_contracts(landlord, tenant, prop)
    mr = create_match_request(landlord, tenant, prop)
    contract = create_contract_ready_for_signing(landlord, tenant, prop, mr)
    result["match_request_id"] = str(mr.id)
    result["contract_id"] = str(contract.id)

    if mode == "ready_for_bio_guarantor":
        lcc = create_landlord_controlled_contract(landlord, tenant, prop, contract)
        if lcc:
            token = create_codeudor_token(landlord, guarantor, lcc)
            if token:
                result["codeudor_token"] = token.token
                result["codeudor_token_id"] = str(token.id)

    if mode == "admin_review":
        # Crea LCC en PENDING_ADMIN_REVIEW para el flujo de revisión jurídica
        lcc = create_landlord_controlled_contract(landlord, tenant, prop, contract)
        if lcc:
            lcc.current_state = "PENDING_ADMIN_REVIEW"
            lcc.save(update_fields=["current_state"])
            result["lcc_id"] = str(lcc.id)
            log(f"LCC set to PENDING_ADMIN_REVIEW: {lcc.id}")

    if mode == "tenant_reviewing":
        # LCC en TENANT_REVIEWING para testar devolución circular / objeciones
        lcc = create_landlord_controlled_contract(landlord, tenant, prop, contract)
        if lcc:
            lcc.current_state = "TENANT_REVIEWING"
            lcc.review_cycle_count = 0
            lcc.save(update_fields=["current_state", "review_cycle_count"])
            result["lcc_id"] = str(lcc.id)
            log(f"LCC set to TENANT_REVIEWING: {lcc.id}")

    if mode == "property_search_ready":
        # 4 propiedades en 3 ciudades y rangos de precio distintos para
        # ejercitar los filtros de la API (Fase I2).
        from properties.models import Property

        Property.objects.filter(title__startswith="E2E Search Property").delete()

        fixtures = [
            ("E2E Search Property · Chapinero", "Bogotá", Decimal("1500000")),
            ("E2E Search Property · Cedritos", "Bogotá", Decimal("2800000")),
            ("E2E Search Property · El Poblado", "Medellín", Decimal("900000")),
            ("E2E Search Property · Ciudad Jardín", "Cali", Decimal("1200000")),
        ]
        created_ids = []
        for title, city, price in fixtures:
            p, _ = Property.objects.get_or_create(
                landlord=landlord,
                title=title,
                defaults={
                    "description": f"Seed E2E search · {city}",
                    "property_type": "apartment",
                    "listing_type": "rent",
                    "status": "available",
                    "address": f"Carrera X #{len(created_ids) + 1}-00",
                    "city": city,
                    "state": "Colombia",
                    "total_area": Decimal("60.00"),
                    "rent_price": price,
                    "is_active": True,
                    "bedrooms": 2,
                    "bathrooms": 1,
                },
            )
            created_ids.append(str(p.id))
        result["property_search_ids"] = created_ids
        log(f"property_search_ready: created {len(created_ids)} properties")

    if mode == "ticket_ready":
        # Un SupportTicket abierto del tenant, listo para el flujo de
        # asignación + respuesta + resolución (Fase H2).
        from core.models import SupportTicket

        SupportTicket.objects.filter(
            subject__startswith="E2E · ",
        ).delete()
        ticket = SupportTicket.objects.create(
            subject="E2E · Error al generar PDF del contrato",
            description="Al descargar el PDF aparece un 500 intermitente.",
            category="technical",
            priority="high",
            created_by=tenant,
            status="open",
        )
        result["ticket_id"] = str(ticket.id)
        log(f"SupportTicket seeded: {ticket.id}")

    if mode == "interview_code_ready":
        # Crea dos InterviewCodes: uno válido, uno expirado.
        from users.models.interview import InterviewCode

        InterviewCode.objects.filter(
            code__in=["E2EVALID", "E2EEXPIR"],
        ).delete()

        ts = int(timezone.now().timestamp())
        valid_code = InterviewCode.objects.create(
            code="E2EVALID",
            user_type="tenant",
            email=f"nuevo.tenant.{ts}@e2e.local",
            valid_from=timezone.now() - timedelta(hours=1),
            valid_until=timezone.now() + timedelta(days=7),
            created_by=admin,
            max_uses=1,
        )
        expired_code = InterviewCode.objects.create(
            code="E2EEXPIR",
            user_type="tenant",
            email=f"expirado.{ts}@e2e.local",
            valid_from=timezone.now() - timedelta(days=14),
            valid_until=timezone.now() - timedelta(days=1),
            created_by=admin,
            max_uses=1,
        )
        result["interview_code_valid"] = valid_code.code
        result["interview_code_expired"] = expired_code.code
        result["interview_email_valid"] = valid_code.email
        result["interview_email_expired"] = expired_code.email
        log(
            f"Interview codes seeded: valid={valid_code.code}, expired={expired_code.code}"
        )

    if mode == "rent_paid":
        # contract_active + una transacción confirmada + reconciliación.
        # Simula que el webhook de la pasarela marcó una PaymentOrder
        # como paid, disparando el reconcile y la factura DIAN.
        lcc = create_landlord_controlled_contract(landlord, tenant, prop, contract)
        if lcc:
            from datetime import date as _date
            from dateutil.relativedelta import relativedelta

            lcc.start_date = _date.today()
            lcc.end_date = lcc.start_date + relativedelta(months=3)
            lcc.economic_terms = {
                "monthly_rent": "1500000",
                "security_deposit": "1500000",
            }
            lcc.save(update_fields=["start_date", "end_date", "economic_terms"])
            lcc._updated_by = landlord
            lcc.current_state = "ACTIVE"
            lcc.save(update_fields=["current_state"])
            result["lcc_id"] = str(lcc.id)

            from payments.models import PaymentOrder, Transaction
            from payments.reconciliation_service import reconcile_payment

            po = (
                PaymentOrder.objects.filter(
                    payer=tenant,
                    payee=landlord,
                    order_type="rent",
                    status="pending",
                    rent_schedule__isnull=False,
                )
                .order_by("date_due", "created_at")
                .first()
            )
            result["payment_order_id"] = str(po.id) if po else None
            log(f"Seed picked PaymentOrder {po.id if po else None}")

            # Crear Transaction directa con type='rent_payment'.
            tx = Transaction.objects.create(
                transaction_type="rent_payment",
                amount=po.total_amount if po else Decimal("1500000"),
                currency="COP",
                payer=tenant,
                payee=landlord,
                contract=contract,
                status="completed",
                processed_at=timezone.now(),
                description="Seed E2E: pago canon simulado webhook",
            )
            result["transaction_id"] = str(tx.id)

            from payments.models import RentPaymentSchedule

            sched_count = RentPaymentSchedule.objects.filter(
                contract=contract, is_active=True
            ).count()
            log(f"RentPaymentSchedule count for contract {contract.id}: {sched_count}")
            try:
                ok = reconcile_payment(tx)
                log(f"reconcile_payment returned: {ok}")
            except Exception as exc:
                log(f"warn: reconcile_payment failed: {exc}")

            # Verificar cuál PO quedó paid después del reconcile
            paid_po = (
                PaymentOrder.objects.filter(
                    payer=tenant,
                    payee=landlord,
                    order_type="rent",
                    status="paid",
                )
                .order_by("-paid_at")
                .first()
            )
            if paid_po:
                log(f"Reconcile pagó PaymentOrder {paid_po.id}")
                # Usar la orden efectivamente pagada como referencia del test
                result["payment_order_id"] = str(paid_po.id)
                result["payment_order_status_after"] = paid_po.status
            elif po:
                po.refresh_from_db()
                result["payment_order_status_after"] = po.status
                log(f"PaymentOrder {po.id} status after reconcile: {po.status}")

    if mode == "contract_active":
        # Crea LCC en ACTIVE. El signal genera automáticamente
        # RentPaymentSchedule + PaymentInstallments + PaymentOrders.
        lcc = create_landlord_controlled_contract(landlord, tenant, prop, contract)
        if lcc:
            # set start/end dates para que el signal tenga fechas
            from datetime import date as _date
            from dateutil.relativedelta import relativedelta

            lcc.start_date = _date.today()
            lcc.end_date = lcc.start_date + relativedelta(months=6)
            lcc.economic_terms = {
                "monthly_rent": "1500000",
                "security_deposit": "1500000",
            }
            lcc.save(update_fields=["start_date", "end_date", "economic_terms"])
            lcc._updated_by = landlord
            lcc.current_state = "ACTIVE"
            lcc.save(update_fields=["current_state"])
            result["lcc_id"] = str(lcc.id)

            # Contar PaymentOrders generadas por el signal
            try:
                from payments.models import PaymentOrder

                po_count = PaymentOrder.objects.filter(
                    payer=tenant,
                    payee=landlord,
                    order_type="rent",
                ).count()
                result["payment_orders_count"] = po_count
                log(
                    f"LCC set to ACTIVE: {lcc.id} · generadas {po_count} PaymentOrders rent"
                )
            except Exception as exc:
                log(f"warn: no se pudo contar PaymentOrders: {exc}")

    if mode == "verification_ready":
        from verification.models import VerificationAgent, VerificationVisit

        agent_profile, _ = VerificationAgent.objects.get_or_create(
            user=verification_agent,
            defaults={
                "specialization": "both",
                "is_available": True,
                "max_weekly_visits": 20,
                "service_areas": ["Cabecera", "San Francisco"],
            },
        )
        agent_profile.is_available = True
        agent_profile.save(update_fields=["is_available"])

        # Visita pendiente de asignación (para Fase C test)
        visit = VerificationVisit.objects.create(
            visit_type="tenant",
            target_user=tenant,
            status="pending",
            visit_address="Calle 34 #27-18",
            visit_city="Bucaramanga",
            scheduled_date=timezone.now().date() + timedelta(days=3),
            scheduled_time="10:00",
        )
        # visit_number se genera en save, asegurar que esté
        if not visit.visit_number:
            from uuid import uuid4

            visit.visit_number = f"VV-E2E-{str(uuid4())[:6].upper()}"
            visit.save(update_fields=["visit_number"])
        result["agent_profile_id"] = str(agent_profile.id)
        result["visit_id"] = str(visit.id)
        log(
            f"VerificationAgent profile ready: {agent_profile.agent_code} · visit {visit.visit_number}"
        )

    if mode == "service_order_ready":
        # Prestador con suscripción activa, listo para emitir órdenes a clientes.
        from services.models import (
            ServiceCategory,
            Service,
            ServiceSubscription,
            SubscriptionPlan,
        )

        plan, _ = SubscriptionPlan.objects.get_or_create(
            slug="plan-e2e-basico",
            defaults={
                "name": "Plan E2E básico",
                "description": "Seed para tests E2E",
                "billing_cycle": "monthly",
                "price": Decimal("50000"),
                "max_active_services": 5,
                "max_monthly_requests": 50,
                "is_active": True,
            },
        )
        ServiceSubscription.objects.update_or_create(
            service_provider=service_provider,
            defaults={
                "plan": plan,
                "status": "active",
                "start_date": timezone.now() - timedelta(days=1),
                "end_date": timezone.now() + timedelta(days=365),
                "auto_renew": True,
            },
        )
        category, _ = ServiceCategory.objects.get_or_create(
            slug="e2e-plumbing",
            defaults={
                "name": "E2E · Plomería",
                "description": "Seed de servicios para tests",
                "is_active": True,
            },
        )
        service, _ = Service.objects.get_or_create(
            slug="e2e-reparacion-grifo",
            defaults={
                "category": category,
                "name": "E2E · Reparación de grifo",
                "short_description": "Servicio seed",
                "full_description": "Reparación estándar de grifo",
                "pricing_type": "fixed",
                "base_price": Decimal("150000"),
                "difficulty": "easy",
                "estimated_duration": "1h",
                "is_active": True,
                "provider": service_provider,
            },
        )
        result["service_id"] = str(service.id)
        result["subscription_plan_id"] = str(plan.id)
        log(f"ServiceSubscription activa para prestador: {service_provider.email}")

    emit_result(result)


if __name__ == "__main__":
    main()
