"""
Tareas Celery de la app users.
"""

import logging

from celery import shared_task

logger = logging.getLogger("users")


@shared_task(
    name="users.tasks.send_confirmation_email",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def send_confirmation_email(self, email_confirmation_id):
    """Envía el email de confirmación de registro de forma asíncrona (D33).

    Desacopla el SMTP del request de registro: si el SMTP (Gmail) tiene un
    hipo, el alta del usuario NO falla con 500; el email se reintenta hasta 3
    veces (cada 5 min). El usuario siempre puede pedir reenvío en
    ``/api/v1/users/auth/resend-confirmation/``.
    """
    from allauth.account.models import EmailConfirmation
    from django.conf import settings
    from django.utils import timezone
    from django.utils.module_loading import import_string

    try:
        ec = EmailConfirmation.objects.select_related(
            "email_address__user"
        ).get(pk=email_confirmation_id)
    except EmailConfirmation.DoesNotExist:
        # Ya confirmado/borrado entre el encolado y la ejecución: nada que hacer.
        logger.warning(
            "send_confirmation_email: EmailConfirmation %s no existe; se omite.",
            email_confirmation_id,
        )
        return "skipped: no existe"

    try:
        adapter = import_string(settings.ACCOUNT_ADAPTER)()
        # request=None: el adapter usa get_current_site(None) → SITE_ID y arma
        # la URL desde settings.FRONTEND_URL (no necesita el request real).
        adapter.send_confirmation_mail(None, ec, signup=True)
        ec.sent = timezone.now()
        ec.save(update_fields=["sent"])
        logger.info(
            "Email de confirmación enviado a %s", ec.email_address.email
        )
        return "sent"
    except Exception as exc:
        logger.error(
            "Fallo enviando email de confirmación (intento %s/%s): %s",
            self.request.retries + 1,
            self.max_retries + 1,
            exc,
        )
        raise self.retry(exc=exc)
