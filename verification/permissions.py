"""
Permissions del módulo verification — VeriHome ID enforcement.

`VerihomeIDVerified` bloquea acciones críticas (crear propiedad,
aplicar a match, iniciar autenticación biométrica) hasta que el usuario
complete el flujo VeriHome ID con visita presencial sellada por el
abogado titulado (`FieldVisitAct.status='sealed'` → signal marca
`User.is_verified=True`).
"""

from rest_framework import permissions
from rest_framework.exceptions import PermissionDenied


class VerihomeIDRequired(permissions.BasePermission):
    """
    Requiere que `request.user.is_verified=True`. El flag se setea
    automáticamente vía signal cuando el `FieldVisitAct` queda sellado.

    Devuelve 403 con un payload estructurado para que el frontend
    detecte la causa específica:

        {
          "detail": "...",
          "code": "verihome_id_required",
          "next_step": "start_onboarding" | "wait_visit"
        }
    """

    message = "Debés completar tu verificación VeriHome ID antes de esta acción."

    def has_permission(self, request, view):
        from django.conf import settings

        user = request.user
        if not (user and user.is_authenticated):
            return False
        # Bypass cuando el flag está apagado (tests legacy / dev local).
        if not getattr(settings, "VERIHOME_ID_ENFORCEMENT", True):
            return True
        if getattr(user, "is_verified", False):
            return True

        next_step = self._next_step(user)
        raise PermissionDenied(
            detail={
                "detail": self.message,
                "code": "verihome_id_required",
                "next_step": next_step,
            }
        )

    @staticmethod
    def _next_step(user) -> str:
        from verification.models import FieldVisitRequest

        last = (
            FieldVisitRequest.objects.filter(user=user)
            .order_by("-created_at")
            .first()
        )
        if not last:
            return "start_onboarding"
        if last.status == "rejected":
            return "start_onboarding"
        if last.status in ("digital_completed", "visit_scheduled"):
            return "wait_visit"
        return "start_onboarding"
