"""Signals del módulo services.

Fase 1.9.5: trazabilidad automática de ServiceOrder.

El receptor `record_service_order_state_transition` graba cada cambio
de ``status`` en ``ServiceOrderHistory``. Los views pueden setear
``instance._updated_by = request.user`` antes de ``save()`` para
atribuir la acción a un usuario específico (thread-local pattern, igual
que en contracts.signals).
"""

from __future__ import annotations

import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from services.models import ServiceOrder

logger = logging.getLogger(__name__)


# Map status → action_type canónico. Los estados no listados caen a
# STATE_CHANGE (genérico).
_STATUS_TO_ACTION = {
    "sent": "SEND",
    "accepted": "ACCEPT",
    "rejected": "REJECT",
    "cancelled": "CANCEL",
    "paid": "PAY",
}


@receiver(pre_save, sender=ServiceOrder)
def _track_previous_status(sender, instance, **kwargs):
    """Guarda el status previo para que el post_save detecte transiciones."""
    if not instance.pk:
        instance._previous_status = None
        return
    try:
        previous = sender.objects.only("status").get(pk=instance.pk)
        instance._previous_status = previous.status
    except sender.DoesNotExist:
        instance._previous_status = None


@receiver(post_save, sender=ServiceOrder)
def record_service_order_state_transition(sender, instance, created, **kwargs):
    """Registra creación y cada transición de status en ServiceOrderHistory."""
    from services.models import ServiceOrderHistory

    previous = getattr(instance, "_previous_status", None)

    if created:
        action_type = "CREATE"
        description = f"Orden creada en estado {instance.status}"
        old_status = ""
        new_status = instance.status
    elif previous == instance.status:
        return  # sin cambio de estado, nada que registrar aquí
    else:
        action_type = _STATUS_TO_ACTION.get(instance.status, "STATE_CHANGE")
        description = f'Transición {previous or "—"} → {instance.status}'
        old_status = previous or ""
        new_status = instance.status

    performed_by = getattr(instance, "_updated_by", None)

    # Resolver user_role: prestador, cliente, admin o sistema.
    user_role = "system"
    if performed_by is not None:
        if performed_by == instance.provider_id or performed_by == instance.provider:
            user_role = "service_provider"
        elif performed_by == instance.client_id or performed_by == instance.client:
            user_role = "client"
        elif getattr(performed_by, "is_staff", False):
            user_role = "admin"
        else:
            user_role = getattr(performed_by, "user_type", "system") or "system"

    try:
        ServiceOrderHistory.objects.create(
            order=instance,
            action_type=action_type,
            action_description=description,
            performed_by=performed_by,
            user_role=user_role,
            old_status=old_status,
            new_status=new_status,
            metadata={
                "amount": str(instance.amount),
                "payment_order_id": str(instance.payment_order_id)
                if instance.payment_order_id
                else None,
            },
        )
    except (
        Exception
    ) as exc:  # pragma: no cover - la trazabilidad no debe romper el guardado
        logger.warning(
            "No se pudo registrar transición en ServiceOrderHistory "
            "para orden %s: %s",
            instance.id,
            exc,
        )
