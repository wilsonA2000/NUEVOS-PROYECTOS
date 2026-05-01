"""
Signals del módulo verification.

Al sellar un `FieldVisitAct` (status=sealed) se marca al usuario como
verificado y se actualiza el estado del `FieldVisitRequest` a
`visit_completed`. Cierra el ciclo digital → presencial.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import FieldVisitAct


@receiver(post_save, sender=FieldVisitAct)
def mark_user_verified_on_seal(sender, instance, created, **kwargs):
    if instance.status != "sealed":
        return

    user = instance.field_request.user
    fields_to_update = []
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
