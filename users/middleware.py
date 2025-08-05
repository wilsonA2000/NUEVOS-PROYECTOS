"""
Middleware para el sistema de impersonación de usuarios.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.utils.deprecation import MiddlewareMixin
from django.contrib import messages
from django.shortcuts import redirect
from django.urls import reverse
from django.utils import timezone
from .models import AdminImpersonationSession

User = get_user_model()


class ImpersonationMiddleware(MiddlewareMixin):
    """
    Middleware que permite a los superusuarios impersonar a otros usuarios.
    """
    
    def process_request(self, request):
        # Verificar si hay una sesión de impersonación activa
        impersonation_id = request.session.get('impersonation_id')
        
        if impersonation_id:
            try:
                # Obtener la sesión de impersonación
                impersonation = AdminImpersonationSession.objects.get(
                    id=impersonation_id,
                    is_active=True
                )
                
                # Verificar que el usuario original sigue siendo superusuario
                if not impersonation.admin_user.is_superuser:
                    # Si ya no es superusuario, terminar la impersonación
                    self._end_impersonation(request, impersonation)
                    return
                
                # Establecer el usuario impersonado como usuario actual
                request.user = impersonation.impersonated_user
                request.impersonation_session = impersonation
                request.is_impersonating = True
                
            except AdminImpersonationSession.DoesNotExist:
                # Si la sesión no existe, limpiar
                self._clear_impersonation(request)
        
        return None
    
    def process_response(self, request, response):
        # Agregar indicador de impersonación en la respuesta
        if hasattr(request, 'is_impersonating') and request.is_impersonating:
            response['X-Impersonating'] = 'true'
            response['X-Impersonated-User'] = str(request.user.id)
        
        return response
    
    def _end_impersonation(self, request, impersonation):
        """Terminar una sesión de impersonación."""
        impersonation.ended_at = timezone.now()
        impersonation.is_active = False
        impersonation.save()
        
        # Limpiar la sesión
        self._clear_impersonation(request)
        
        # Redirigir al admin
        messages.warning(request, 'La sesión de impersonación ha terminado.')
        return redirect('admin:index')
    
    def _clear_impersonation(self, request):
        """Limpiar datos de impersonación de la sesión."""
        if 'impersonation_id' in request.session:
            del request.session['impersonation_id']
        if hasattr(request, 'impersonation_session'):
            delattr(request, 'impersonation_session')
        if hasattr(request, 'is_impersonating'):
            delattr(request, 'is_impersonating')


class AdminActionLoggingMiddleware(MiddlewareMixin):
    """
    Middleware para registrar acciones administrativas durante impersonación.
    """
    
    def process_request(self, request):
        # Solo registrar si hay una sesión de impersonación activa
        if hasattr(request, 'impersonation_session'):
            request.admin_action_log = []
        
        return None
    
    def process_response(self, request, response):
        # Registrar acciones si hay una sesión de impersonación
        if hasattr(request, 'impersonation_session') and hasattr(request, 'admin_action_log'):
            for action_data in request.admin_action_log:
                self._log_admin_action(request, action_data)
        
        return response
    
    def _log_admin_action(self, request, action_data):
        """Registrar una acción administrativa."""
        try:
            from .models import AdminActionLog
            
            AdminActionLog.objects.create(
                impersonation_session=request.impersonation_session,
                action_type=action_data.get('action_type', 'other'),
                action_description=action_data.get('description', ''),
                target_object_type=action_data.get('object_type', ''),
                target_object_id=action_data.get('object_id', ''),
                old_data=action_data.get('old_data', {}),
                new_data=action_data.get('new_data', {}),
                ip_address=self._get_client_ip(request),
                success=action_data.get('success', True),
                error_message=action_data.get('error_message', '')
            )
        except Exception as e:
            # Log error pero no fallar la aplicación
            print(f"Error logging admin action: {e}")
    
    def _get_client_ip(self, request):
        """Obtener la IP del cliente."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip 