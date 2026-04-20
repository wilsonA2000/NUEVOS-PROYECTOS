"""Señales del módulo de contratos.

T1.3: Cuando un LandlordControlledContract pasa a estado ACTIVE,
generar automáticamente:
- Un RentPaymentSchedule (cronograma del canon)
- N PaymentInstallment (uno por mes desde start_date hasta end_date)
- N PaymentOrder enlazadas a cada installment (consecutivo PO-YYYY-NNNNNNNN)

El receptor es idempotente: si ya existe schedule para el contrato, no
duplica nada.
"""

import logging
from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction as db_transaction
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from contracts.landlord_contract_models import LandlordControlledContract

logger = logging.getLogger(__name__)


# Track previous state via pre_save to detect transitions to ACTIVE
@receiver(pre_save, sender=LandlordControlledContract)
def _track_previous_state(sender, instance, **kwargs):
    """Guarda el estado previo para que el post_save sepa si hubo transición."""
    if not instance.pk:
        instance._previous_state = None
        return
    try:
        previous = sender.objects.only("current_state").get(pk=instance.pk)
        instance._previous_state = previous.current_state
    except sender.DoesNotExist:
        instance._previous_state = None


@receiver(post_save, sender=LandlordControlledContract)
def record_state_transition(sender, instance, created, **kwargs):
    """1.9.1: registra automáticamente cada transición en ContractWorkflowHistory.

    Antes, cada view debía llamar a `add_workflow_entry()` manualmente y si se
    olvidaba, la transición quedaba sin huella. Con este signal la trazabilidad
    se hace independiente del código de negocio.
    """
    previous = getattr(instance, "_previous_state", None)

    # Si no hay cambio real de estado, no hacer nada.
    if created:
        new_state_entry = instance.current_state
        previous = None
    elif previous == instance.current_state:
        return
    else:
        new_state_entry = instance.current_state

    try:
        from contracts.landlord_contract_models import ContractWorkflowHistory

        performed_by = getattr(instance, "_updated_by", None)
        ContractWorkflowHistory.objects.create(
            contract=instance,
            action_type="STATE_CHANGE",
            action_description=(
                f'Transición automática: {previous or "—"} → {new_state_entry}'
            ),
            performed_by=performed_by,
            user_role=getattr(performed_by, "user_type", "system") or "system",
            old_state=previous or "",
            new_state=new_state_entry or "",
        )
    except (
        Exception
    ) as exc:  # pragma: no cover — la trazabilidad no debe romper el guardado
        logger.warning(
            "No se pudo registrar transición en ContractWorkflowHistory: %s", exc
        )


@receiver(post_save, sender=LandlordControlledContract)
def generate_payment_schedule_on_activation(sender, instance, created, **kwargs):
    """Genera cronograma de pagos cuando el contrato pasa a ACTIVE."""
    if instance.current_state != "ACTIVE":
        return

    previous = getattr(instance, "_previous_state", None)
    # Solo actuar en la transición (no cada vez que se guarda un contrato ya activo)
    if previous == "ACTIVE":
        return

    # Importar aquí para evitar circular imports a nivel módulo
    from payments.models import (
        RentPaymentSchedule,
        PaymentInstallment,
        PaymentOrder,
        PaymentPlan,
    )

    # Encontrar el Contract legacy: comparten mismo UUID por convención
    # (BIO-02: ambos sistemas se sincronizan con el mismo id).
    from contracts.models import Contract

    legacy_contract = Contract.objects.filter(id=instance.id).first()
    if legacy_contract is None:
        logger.warning(
            "LandlordControlledContract %s activado sin Contract legacy "
            "(no se encontró Contract con mismo UUID). Skip schedule.",
            instance.id,
        )
        return

    if RentPaymentSchedule.objects.filter(contract=legacy_contract).exists():
        return

    # Validar que tengamos los datos mínimos
    if not (instance.start_date and instance.end_date):
        logger.warning(
            "LandlordControlledContract %s activado sin start/end_date. Skip schedule.",
            instance.id,
        )
        return

    monthly_rent = Decimal(str(instance.economic_terms.get("monthly_rent", 0) or 0))
    if monthly_rent <= 0:
        logger.warning(
            "LandlordControlledContract %s sin monthly_rent válido en economic_terms.",
            instance.id,
        )
        return

    landlord = instance.landlord
    tenant = instance.tenant
    if not (landlord and tenant):
        logger.warning("Contrato %s sin landlord o tenant.", instance.id)
        return

    with db_transaction.atomic():
        # 1. Crear el RentPaymentSchedule
        schedule = RentPaymentSchedule.objects.create(
            contract=legacy_contract,
            tenant=tenant,
            landlord=landlord,
            rent_amount=monthly_rent,
            due_date=instance.start_date.day,
            grace_period_days=5,
            legal_grace_days_max=30,
            auto_charge_enabled=False,  # opt-in del tenant
            auto_late_fee_enabled=True,
            start_date=instance.start_date,
            end_date=instance.end_date,
        )

        # 2. Crear PaymentPlan + PaymentInstallments mes a mes
        n_months = _months_between(instance.start_date, instance.end_date)
        plan = PaymentPlan.objects.create(
            user=tenant,
            plan_name=f"Plan de canon mensual · contrato {instance.id}",
            total_amount=monthly_rent * Decimal(n_months),
            installment_amount=monthly_rent,
            number_of_installments=n_months,
            frequency="monthly",
            start_date=instance.start_date,
            end_date=instance.end_date,
            status="active",
        )

        # 3. Crear N PaymentInstallment + PaymentOrder por cada mes
        installments_created = []
        current = date(
            instance.start_date.year, instance.start_date.month, instance.start_date.day
        )
        for n in range(1, plan.number_of_installments + 1):
            installment = PaymentInstallment.objects.create(
                payment_plan=plan,
                installment_number=n,
                amount=monthly_rent,
                due_date=current,
                status="pending",
            )
            grace_end = current + timedelta(days=schedule.grace_period_days)
            max_overdue = grace_end + timedelta(days=schedule.legal_grace_days_max)
            order = PaymentOrder.objects.create(
                order_type="rent",
                payer=tenant,
                payee=landlord,
                created_by=landlord,
                amount=monthly_rent,
                date_due=current,
                date_grace_end=grace_end,
                date_max_overdue=max_overdue,
                rent_schedule=schedule,
                installment=installment,
                description=f"Canon mes {n}/{plan.number_of_installments} · contrato {instance.id}",
                status="pending",
            )
            order.add_audit_event(
                "auto_generated",
                f"Generada automáticamente al activar contrato {instance.id}",
                actor=landlord,
                save=False,
            )
            order.save()
            installments_created.append(installment)
            current = _add_months(current, 1)

        logger.info(
            "Contrato %s activado: generadas %d installments y %d PaymentOrders.",
            instance.id,
            len(installments_created),
            len(installments_created),
        )


def _months_between(start, end):
    """Cantidad de meses entre dos fechas (incluyendo el último)."""
    return max(1, (end.year - start.year) * 12 + (end.month - start.month) + 1)


def _add_months(d, months):
    """Suma N meses a una fecha, ajustando al último día si no existe."""
    from calendar import monthrange

    month = d.month - 1 + months
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, monthrange(year, month)[1])
    return date(year, month, day)
