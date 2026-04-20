"""
Tareas asíncronas de Celery para el módulo de contratos de VeriHome.
"""

from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


@shared_task
def check_contract_renewals():
    """
    Tarea diaria para verificar contratos próximos a vencer y enviar alertas.

    Revisa contratos que vencen en 60, 30 y 15 días, y envía notificaciones
    a arrendadores y arrendatarios correspondientes.
    """
    from contracts.renewal_service import RenewalAlertService

    try:
        result = RenewalAlertService.check_and_alert_expiring_contracts()
        logger.info(
            "Tarea check_contract_renewals completada: %d alertas enviadas",
            result.get("alerts_sent", 0),
        )
        return result
    except Exception:
        logger.exception("Error ejecutando check_contract_renewals")
        raise


@shared_task
def check_admin_review_sla():
    """
    Tarea diaria para verificar contratos cuyo plazo de revisión jurídica
    está por vencer o ya venció.

    - 24h antes del deadline: envía recordatorio al admin.
    - Después del deadline: marca como escalado y notifica al arrendador.
    """
    from django.utils import timezone
    from django.core.mail import send_mail
    from django.conf import settings
    from datetime import timedelta

    try:
        from contracts.landlord_contract_models import LandlordControlledContract

        now = timezone.now()
        reminder_window = now + timedelta(hours=24)
        escalated = 0
        reminded = 0

        # Contratos cuyo deadline ya pasó (escalar)
        overdue = LandlordControlledContract.objects.filter(
            current_state__in=["PENDING_ADMIN_REVIEW", "RE_PENDING_ADMIN"],
            admin_review_deadline__lt=now,
            admin_review_escalated=False,
        )
        for contract in overdue:
            contract.admin_review_escalated = True
            contract.save(update_fields=["admin_review_escalated", "updated_at"])
            contract.add_workflow_event(
                event_type="sla_escalation",
                description="Plazo de revisión jurídica vencido — contrato escalado",
                metadata={"deadline": contract.admin_review_deadline.isoformat()},
            )
            # Notificar arrendador
            if contract.landlord and contract.landlord.email:
                try:
                    send_mail(
                        subject="[VeriHome] Su contrato ha sido priorizado",
                        message=(
                            f"Estimado/a {contract.landlord.get_full_name()},\n\n"
                            f"Su contrato {contract.contract_number} ha sido priorizado "
                            f"para revisión jurídica. Recibirá respuesta en las próximas 24 horas.\n\n"
                            f"Equipo VeriHome"
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[contract.landlord.email],
                        fail_silently=True,
                    )
                except Exception:
                    pass
            escalated += 1

        # Contratos que vencen en 24h (recordar al admin)
        upcoming = LandlordControlledContract.objects.filter(
            current_state__in=["PENDING_ADMIN_REVIEW", "RE_PENDING_ADMIN"],
            admin_review_deadline__gt=now,
            admin_review_deadline__lt=reminder_window,
            admin_review_escalated=False,
        )
        for contract in upcoming:
            admin_email = getattr(settings, "EMAIL_HOST_USER", "")
            if admin_email:
                try:
                    send_mail(
                        subject=f"[VeriHome] Recordatorio: Contrato {contract.contract_number} vence en 24h",
                        message=(
                            f'El contrato {contract.contract_number} está pendiente de revisión '
                            f'jurídica y su plazo vence el {contract.admin_review_deadline.strftime("%d/%m/%Y %H:%M")}.\n\n'
                            f'Por favor revíselo desde el panel de administración.'
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[admin_email],
                        fail_silently=True,
                    )
                except Exception:
                    pass
            reminded += 1

        logger.info(
            "check_admin_review_sla: %d escalados, %d recordatorios enviados",
            escalated,
            reminded,
        )
        return {"escalated": escalated, "reminded": reminded}
    except Exception:
        logger.exception("Error ejecutando check_admin_review_sla")
        raise


@shared_task
def check_biometric_expiration():
    """
    Tarea periódica (cada hora) para notificar usuarios cuya sesión de
    autenticación biométrica está por expirar en las próximas 2 horas.
    """
    from django.utils import timezone
    from django.core.mail import send_mail
    from django.conf import settings
    from datetime import timedelta

    try:
        from contracts.models import BiometricAuthentication

        now = timezone.now()
        expiration_window = now + timedelta(hours=2)

        # Sesiones activas que expiran en las próximas 2 horas y no están completadas
        expiring = BiometricAuthentication.objects.filter(
            expires_at__gt=now,
            expires_at__lte=expiration_window,
            completed_at__isnull=True,
        ).select_related("user", "contract")

        notified = 0
        for auth in expiring:
            # Verificar que no hemos notificado ya (usar security_checks como flag)
            if auth.security_checks.get("expiration_notified"):
                continue

            if auth.user and auth.user.email:
                remaining = auth.expires_at - now
                hours = int(remaining.total_seconds() // 3600)
                minutes = int((remaining.total_seconds() % 3600) // 60)

                try:
                    send_mail(
                        subject=f"[VeriHome] Tu sesión de firma expira en {hours}h {minutes}m",
                        message=(
                            f"Estimado/a {auth.user.get_full_name()},\n\n"
                            f"Tu sesión de autenticación biométrica para el contrato "
                            f"{auth.contract.contract_number} expira en {hours} hora(s) "
                            f"y {minutes} minuto(s).\n\n"
                            f"Por favor completa los pasos pendientes para firmar el contrato.\n\n"
                            f"Si la sesión expira, deberás iniciar el proceso nuevamente.\n\n"
                            f"Equipo VeriHome"
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[auth.user.email],
                        fail_silently=True,
                    )
                except Exception:
                    pass

                # Marcar como notificado
                auth.security_checks["expiration_notified"] = True
                auth.save(update_fields=["security_checks"])
                notified += 1

        logger.info("check_biometric_expiration: %d notificaciones enviadas", notified)
        return {"notified": notified}
    except Exception:
        logger.exception("Error ejecutando check_biometric_expiration")
        raise
