"""
Adaptador personalizado para django-allauth en VeriHome.
"""

import logging

from allauth.account.adapter import DefaultAccountAdapter
from allauth.account.models import EmailAddress
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.utils.translation import gettext_lazy as _

logger = logging.getLogger("users")


class VeriHomeAccountAdapter(DefaultAccountAdapter):
    """
    Adaptador personalizado para VeriHome que maneja:
    - Verificación obligatoria de email
    - Rechazo de login para cuentas no verificadas
    - Mensajes personalizados
    """

    def authenticate(self, request, **credentials):
        """Autenticar usuario verificando que el email esté confirmado."""
        user = super().authenticate(request, **credentials)

        if user:
            # Verificar que el email esté confirmado
            try:
                email_address = EmailAddress.objects.get(
                    user=user, email=user.email, primary=True
                )
                if not email_address.verified:
                    # Si el email no está verificado, no permitir login
                    raise ValidationError(
                        _(
                            "Tu cuenta no ha sido verificada. Por favor, verifica tu email antes de iniciar sesión."
                        )
                    )
            except ObjectDoesNotExist:
                # Si no existe el EmailAddress, crear uno y marcarlo como no verificado
                EmailAddress.objects.create(
                    user=user, email=user.email, primary=True, verified=False
                )
                raise ValidationError(
                    _(
                        "Tu cuenta no ha sido verificada. Por favor, verifica tu email antes de iniciar sesión."
                    )
                )

        return user

    def is_open_for_signup(self, request):
        """Permitir registro abierto."""
        return True

    def save_user(self, request, user, form, commit=True):
        """Guardar usuario y crear EmailAddress."""
        user = super().save_user(request, user, form, commit=False)

        if commit:
            user.save()
            # Crear EmailAddress para el usuario
            EmailAddress.objects.create(
                user=user, email=user.email, primary=True, verified=False
            )

        return user

    def send_confirmation_mail(self, request, emailconfirmation, signup):
        """Enviar email de confirmación personalizado."""
        try:
            # Usar directamente get_current_site sin crear recursión
            from django.contrib.sites.shortcuts import get_current_site

            current_site = get_current_site(request)
            activate_url = self.get_email_confirmation_url(request, emailconfirmation)

            # Obtener datos del usuario
            user = emailconfirmation.email_address.user
            user_display = (
                user.get_full_name() or user.first_name or user.email.split("@")[0]
            )

            ctx = {
                "user": user,
                "user_display": user_display,
                "activate_url": activate_url,
                "current_site": current_site,
                "site_domain": current_site.domain,
                "key": emailconfirmation.key,
            }

            if signup:
                email_template = "account/email/email_confirmation_signup"
            else:
                email_template = "account/email/email_confirmation"

            logger.info(
                "Enviando email de confirmación a %s (url=%s)",
                emailconfirmation.email_address.email,
                activate_url,
            )
            self.send_mail(email_template, emailconfirmation.email_address.email, ctx)

        except Exception as e:
            # Se relanza para que la tarea Celery (send_confirmation_email)
            # lo registre y reintente.
            logger.error("Error en send_confirmation_mail: %s", e, exc_info=True)
            raise

    def get_email_confirmation_url(self, request, emailconfirmation):
        """URL de confirmación apuntando al frontend React.

        Usa settings.FRONTEND_URL (antes estaba hardcodeado a localhost:5173,
        lo que rompía el link de confirmación en producción).
        """
        from django.conf import settings

        return f"{settings.FRONTEND_URL}/confirm-email/{emailconfirmation.key}"


# Funciones auxiliares removidas para evitar recursión
# Las importaciones ya están en la parte superior del archivo
