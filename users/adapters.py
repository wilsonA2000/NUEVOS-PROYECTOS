"""
Adaptador personalizado para django-allauth en VeriHome.
"""

from allauth.account.adapter import DefaultAccountAdapter
from allauth.account.models import EmailAddress
from django.core.exceptions import ValidationError, ObjectDoesNotExist
from django.utils.translation import gettext_lazy as _


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
                    user=user, 
                    email=user.email, 
                    primary=True
                )
                if not email_address.verified:
                    # Si el email no está verificado, no permitir login
                    raise ValidationError(
                        _("Tu cuenta no ha sido verificada. Por favor, verifica tu email antes de iniciar sesión.")
                    )
            except ObjectDoesNotExist:
                # Si no existe el EmailAddress, crear uno y marcarlo como no verificado
                EmailAddress.objects.create(
                    user=user,
                    email=user.email,
                    primary=True,
                    verified=False
                )
                raise ValidationError(
                    _("Tu cuenta no ha sido verificada. Por favor, verifica tu email antes de iniciar sesión.")
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
                user=user,
                email=user.email,
                primary=True,
                verified=False
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
            user_display = user.get_full_name() or user.first_name or user.email.split('@')[0]
            
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
            
            print(f"📧 Enviando email de confirmación a: {emailconfirmation.email_address.email}")
            print(f"🔗 URL de confirmación: {activate_url}")
            
            # Enviar el email
            self.send_mail(email_template, emailconfirmation.email_address.email, ctx)
            print("✅ Email enviado exitosamente vía adaptador personalizado")
            
        except Exception as e:
            print(f"❌ Error en send_confirmation_mail: {e}")
            import traceback
            traceback.print_exc()
            # Re-lanzar la excepción para que se maneje arriba
            raise
    
    def get_email_confirmation_url(self, request, emailconfirmation):
        """Obtener URL de confirmación de email."""
        # Construir URL del frontend React
        frontend_url = "http://localhost:5173"
        confirmation_path = f"/confirm-email/{emailconfirmation.key}"
        return f"{frontend_url}{confirmation_path}"


# Funciones auxiliares removidas para evitar recursión
# Las importaciones ya están en la parte superior del archivo 