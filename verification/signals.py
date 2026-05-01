"""
Signals del módulo verification.

Eventos cubiertos:
  - `FieldVisitAct` con `status='sealed'` → marca al usuario como
    verificado, actualiza `FieldVisitRequest.status='visit_completed'`
    y notifica al usuario que su verificación quedó completada.
  - `FieldVisitRequest.scheduled_visit` recién asignada → notifica
    al usuario que su visita presencial quedó programada.
"""

import logging

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

from .models import FieldVisitAct, FieldVisitRequest


logger = logging.getLogger(__name__)


def _safe_notify(user, **kwargs):
    """Crea notificación tolerando fallos del servicio (env de tests)."""
    try:
        from core.notification_service import notification_service

        notification_service.create_notification(user=user, **kwargs)
    except Exception as exc:  # pragma: no cover - mejor esfuerzo
        logger.warning("VeriHome ID notification failed: %s", exc)


@receiver(post_save, sender=FieldVisitAct)
def mark_user_verified_on_seal(sender, instance, created, **kwargs):
    if instance.status != "sealed":
        return

    user = instance.field_request.user
    fields_to_update = []
    already_verified = bool(getattr(user, "is_verified", False))
    if hasattr(user, "is_verified") and not user.is_verified:
        user.is_verified = True
        fields_to_update.append("is_verified")
    if hasattr(user, "verification_date") and not user.verification_date:
        user.verification_date = timezone.now()
        fields_to_update.append("verification_date")
    if fields_to_update:
        user.save(update_fields=fields_to_update)

    field_request = instance.field_request
    if field_request.status != "visit_completed":
        field_request.status = "visit_completed"
        if not field_request.scheduled_visit_id:
            field_request.scheduled_visit = instance.visit
            field_request.save(
                update_fields=["status", "scheduled_visit", "updated_at"]
            )
        else:
            field_request.save(update_fields=["status", "updated_at"])

    if not already_verified:
        verdict_label = {
            "aprobado": "aprobada",
            "observado": "aprobada con observaciones",
            "rechazado": "rechazada",
        }.get(instance.final_verdict, "completada")
        _safe_notify(
            user=user,
            notification_type="contract",
            title="VeriHome ID verificado",
            message=(
                f"Tu verificación VeriHome ID quedó {verdict_label} "
                f"(score {instance.total_score}). Ya podés crear "
                "propiedades, aplicar a matches y firmar contratos."
            ),
            priority="high",
            action_url="/app/profile",
            action_label="Ver mi perfil",
            related_object=instance,
        )


@receiver(pre_save, sender=FieldVisitRequest)
def cache_previous_scheduled_visit(sender, instance, **kwargs):
    """Guarda el scheduled_visit_id anterior para detectar nueva asignación."""
    if not instance.pk:
        instance._previous_scheduled_visit_id = None
        return
    try:
        previous = FieldVisitRequest.objects.only("scheduled_visit_id").get(
            pk=instance.pk
        )
        instance._previous_scheduled_visit_id = previous.scheduled_visit_id
    except FieldVisitRequest.DoesNotExist:
        instance._previous_scheduled_visit_id = None


@receiver(post_save, sender=FieldVisitRequest)
def notify_visit_scheduled(sender, instance, created, **kwargs):
    """Avisa al usuario cuando se le programa la visita presencial."""
    if created:
        return
    previous = getattr(instance, "_previous_scheduled_visit_id", None)
    if previous == instance.scheduled_visit_id:
        return
    if not instance.scheduled_visit_id:
        return

    visit = instance.scheduled_visit
    agent_name = (
        visit.agent.user.get_full_name() if visit and visit.agent else "—"
    )
    _safe_notify(
        user=instance.user,
        notification_type="contract",
        title="Visita VeriHome ID programada",
        message=(
            f"Tu visita presencial fue asignada al agente {agent_name}. "
            "Te contactaremos para coordinar fecha y hora exactas."
        ),
        priority="normal",
        action_url="/app/profile",
        action_label="Ver detalle",
        related_object=instance,
    )
