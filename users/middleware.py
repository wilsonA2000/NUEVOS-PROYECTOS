"""
Middleware para el sistema de impersonación de usuarios y logging de actividades.
"""

import time
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.utils.deprecation import MiddlewareMixin
from django.contrib import messages
from django.shortcuts import redirect
from django.urls import reverse, resolve
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


class ActivityLoggerMiddleware(MiddlewareMixin):
    """
    Middleware que registra automáticamente ciertas actividades del usuario.
    """
    
    # Mapeo de URLs a tipos de actividad  
    URL_ACTIVITY_MAP = {
        'token_obtain_pair': 'login',
        'api_logout': 'logout',
        'api_profile': 'profile_update',
        'api_change_password': 'password_change',
        'api_user_search': 'search',
        'property-list': 'search',
        'property-detail': 'property_view',
        'property-create': 'property_create',
        'property-update': 'property_update',
        'property-delete': 'property_delete',
        'contract-list': 'search',
        'contract-detail': 'contract_create',
        'payment-list': 'search',
        'message-list': 'search',
        'rating-list': 'search',
    }
    
    # Métodos HTTP que generan actividad
    ACTIVITY_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
    
    # URLs que no deben registrarse para evitar spam
    EXCLUDE_URLS = {
        'activity-log-list',
        'activity-log-detail', 
        'api_activity_stats',
        'api_create_activity_log',
        'api_activity_types',
        'token_refresh',
        'heartbeat',
        'websocket'
    }
    
    def process_request(self, request):
        """Marcar el tiempo de inicio de la petición."""
        request._activity_start_time = time.time()
        return None
    
    def process_response(self, request, response):
        """Registrar actividad después de procesar la respuesta."""
        # Solo registrar para usuarios autenticados
        if not hasattr(request, 'user') or not request.user.is_authenticated:
            return response
        
        try:
            # Resolver la URL para obtener el nombre de la vista
            resolved = resolve(request.path)
            url_name = resolved.url_name
            
            # Excluir URLs que no queremos registrar
            if url_name in self.EXCLUDE_URLS:
                return response
            
            # Determinar si debemos registrar esta actividad
            should_log = self._should_log_activity(request, url_name, response.status_code)
            
            if should_log:
                activity_type = self._get_activity_type(request, url_name)
                if activity_type:
                    self._log_activity(request, response, activity_type, url_name)
                    
        except Exception as e:
            # No interrumpir la respuesta si hay error en el logging
            print(f"Error in ActivityLoggerMiddleware: {e}")
        
        return response
    
    def _should_log_activity(self, request, url_name, status_code):
        """Determinar si debemos registrar esta actividad."""
        # Solo registrar respuestas exitosas o ciertos errores específicos
        if not (200 <= status_code < 400 or status_code in [401, 403]):
            return False
        
        # Registrar todos los métodos POST, PUT, PATCH, DELETE
        if request.method in self.ACTIVITY_METHODS:
            return True
        
        # Para GET, solo registrar ciertas URLs específicas
        if request.method == 'GET' and url_name in self.URL_ACTIVITY_MAP:
            return True
        
        return False
    
    def _get_activity_type(self, request, url_name):
        """Determinar el tipo de actividad basado en la URL y método."""
        # Mapeo directo desde URL
        if url_name in self.URL_ACTIVITY_MAP:
            return self.URL_ACTIVITY_MAP[url_name]
        
        # Inferir basado en método HTTP y URL
        if request.method == 'POST':
            if 'login' in url_name:
                return 'login'
            elif 'logout' in url_name:
                return 'logout'
            elif 'property' in url_name:
                return 'property_create'
            elif 'contract' in url_name:
                return 'contract_create'
            elif 'payment' in url_name:
                return 'payment_made'
            elif 'message' in url_name:
                return 'message_sent'
            elif 'rating' in url_name:
                return 'rating_given'
        
        elif request.method in ['PUT', 'PATCH']:
            if 'profile' in url_name:
                return 'profile_update'
            elif 'property' in url_name:
                return 'property_update'
            elif 'contract' in url_name:
                return 'contract_update'
        
        elif request.method == 'DELETE':
            if 'property' in url_name:
                return 'property_delete'
            elif 'contract' in url_name:
                return 'contract_cancel'
        
        elif request.method == 'GET':
            if 'search' in url_name or 'list' in url_name:
                return 'search'
            elif 'property' in url_name and 'detail' in url_name:
                return 'property_view'
        
        return 'api_access'  # Tipo genérico para accesos API no clasificados
    
    def _log_activity(self, request, response, activity_type, url_name):
        """Crear el registro de actividad."""
        try:
            # Calcular tiempo de respuesta
            response_time = None
            if hasattr(request, '_activity_start_time'):
                response_time = int((time.time() - request._activity_start_time) * 1000)
            
            # Preparar metadatos
            metadata = {
                'url_name': url_name,
                'path': request.path,
                'method': request.method,
                'status_code': response.status_code,
                'query_params': dict(request.GET) if request.GET else {},
            }
            
            # Agregar datos del cuerpo de la petición (solo para ciertos métodos)
            if request.method in ['POST', 'PUT', 'PATCH'] and hasattr(request, 'POST'):
                # Solo guardar campos no sensibles
                safe_data = {}
                sensitive_fields = {'password', 'password2', 'token', 'key', 'secret'}
                
                for key, value in request.POST.items():
                    if key.lower() not in sensitive_fields:
                        safe_data[key] = value
                
                if safe_data:
                    metadata['request_data'] = safe_data
            
            # Preparar descripción legible
            description = self._generate_description(activity_type, request, metadata)
            
            # Crear el registro usando el método del modelo
            from .models import UserActivityLog
            UserActivityLog.log_activity(
                user=request.user,
                activity_type=activity_type,
                description=description,
                metadata=metadata,
                response_time_ms=response_time,
                request=request
            )
            
        except Exception as e:
            # Silenciar errores para no interrumpir la aplicación
            print(f"Error logging activity: {e}")
    
    def _generate_description(self, activity_type, request, metadata):
        """Generar una descripción legible para la actividad."""
        descriptions = {
            'login': 'Usuario inició sesión',
            'logout': 'Usuario cerró sesión',
            'profile_update': 'Usuario actualizó su perfil',
            'password_change': 'Usuario cambió su contraseña',
            'property_view': f'Usuario visualizó propiedad en {request.path}',
            'property_create': 'Usuario creó una nueva propiedad',
            'property_update': 'Usuario actualizó una propiedad',
            'property_delete': 'Usuario eliminó una propiedad',
            'search': f'Usuario realizó búsqueda en {request.path}',
            'api_access': f'Usuario accedió a API: {request.method} {request.path}',
        }
        
        base_description = descriptions.get(activity_type, f'Actividad: {activity_type}')
        
        # Agregar información adicional si está disponible
        if metadata.get('query_params'):
            params = metadata['query_params']
            if 'search' in params or 'q' in params:
                search_term = params.get('search') or params.get('q')
                base_description += f' (término: "{search_term}")'
        
        return base_description 