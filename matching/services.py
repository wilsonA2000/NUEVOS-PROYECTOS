"""
Servicios para el sistema de matching integrado con mensajería.
"""

from django.contrib.auth import get_user_model
from django.utils import timezone
from messaging.models import MessageThread, ThreadParticipant, Message
from .models import MatchRequest, MatchNotification

User = get_user_model()


class MatchingMessagingService:
    """Servicio para integrar el sistema de matching con la mensajería."""
    
    @staticmethod
    def create_match_thread(match_request):
        """
        Crea un hilo de conversación cuando se acepta un match.
        """
        if match_request.status != 'accepted':
            return None
        
        # Verificar si ya existe un hilo para este match
        existing_thread = MessageThread.objects.filter(
            property=match_request.property,
            participants__in=[match_request.tenant, match_request.landlord]
        ).first()
        
        if existing_thread:
            return existing_thread
        
        # Crear nuevo hilo de conversación
        thread = MessageThread.objects.create(
            subject=f"Match Aceptado - {match_request.property.title}",
            thread_type='inquiry',
            property=match_request.property,
            created_by=match_request.landlord,
            is_priority=True
        )
        
        # Agregar participantes
        ThreadParticipant.objects.create(
            thread=thread,
            user=match_request.landlord,
            is_active=True
        )
        
        ThreadParticipant.objects.create(
            thread=thread,
            user=match_request.tenant,
            is_active=True
        )
        
        # Crear mensaje inicial del sistema
        initial_message = Message.objects.create(
            thread=thread,
            sender=match_request.landlord,
            recipient=match_request.tenant,
            message_type='system',
            content=f"""¡Felicitaciones! Su solicitud de match para la propiedad "{match_request.property.title}" ha sido aceptada.

Código de Match: {match_request.match_code}
Puntaje de Compatibilidad: {match_request.get_compatibility_score()}%

Mensaje del arrendador: {match_request.landlord_response}

Pueden proceder a coordinar los siguientes pasos en esta conversación.""",
            status='delivered'
        )
        
        # Actualizar última actividad del hilo
        thread.last_message_at = initial_message.sent_at
        thread.save()
        
        # Crear notificación para el arrendatario
        MatchNotificationService.create_notification(
            user=match_request.tenant,
            notification_type='match_accepted',
            title='¡Match Aceptado!',
            message=f'Su solicitud para {match_request.property.title} ha sido aceptada. Puede continuar la conversación con el arrendador.',
            match_request=match_request,
            metadata={
                'thread_id': str(thread.id),
                'property_id': str(match_request.property.id)
            }
        )
        
        return thread
    
    @staticmethod
    def send_match_rejection_message(match_request):
        """
        Envía una notificación cuando se rechaza un match.
        """
        if match_request.status != 'rejected':
            return None
        
        # Crear notificación para el arrendatario
        MatchNotificationService.create_notification(
            user=match_request.tenant,
            notification_type='match_rejected',
            title='Solicitud de Match Rechazada',
            message=f'Su solicitud para {match_request.property.title} ha sido rechazada.',
            match_request=match_request,
            metadata={
                'property_id': str(match_request.property.id),
                'rejection_reason': match_request.landlord_response
            }
        )
    
    @staticmethod
    def notify_new_match_request(match_request):
        """
        Notifica al arrendador sobre una nueva solicitud de match.
        """
        if match_request.status != 'pending':
            return None
        
        # Crear notificación para el arrendador
        MatchNotificationService.create_notification(
            user=match_request.landlord,
            notification_type='match_request_received',
            title='Nueva Solicitud de Match',
            message=f'Ha recibido una nueva solicitud de match para {match_request.property.title} de {match_request.tenant.get_full_name()}.',
            match_request=match_request,
            metadata={
                'property_id': str(match_request.property.id),
                'tenant_id': str(match_request.tenant.id),
                'compatibility_score': match_request.get_compatibility_score()
            }
        )
    
    @staticmethod
    def get_user_match_conversations(user):
        """
        Obtiene todas las conversaciones relacionadas con matches para un usuario.
        """
        return MessageThread.objects.filter(
            participants=user,
            thread_type='inquiry',
            property__isnull=False
        ).distinct()


class MatchNotificationService:
    """Servicio para manejar notificaciones de matching."""
    
    @staticmethod
    def create_notification(user, notification_type, title, message, match_request=None, metadata=None):
        """
        Crea una nueva notificación de matching.
        """
        notification = MatchNotification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            match_request=match_request,
            metadata=metadata or {}
        )
        
        # Marcar como enviada inmediatamente para notificaciones internas
        notification.mark_as_sent()
        
        return notification
    
    @staticmethod
    def get_unread_notifications(user):
        """
        Obtiene todas las notificaciones no leídas para un usuario.
        """
        return MatchNotification.objects.filter(
            user=user,
            is_read=False
        ).order_by('-created_at')
    
    @staticmethod
    def mark_all_as_read(user):
        """
        Marca todas las notificaciones como leídas para un usuario.
        """
        return MatchNotification.objects.filter(
            user=user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
    
    @staticmethod
    def get_notification_count(user):
        """
        Obtiene el conteo de notificaciones no leídas.
        """
        return MatchNotification.objects.filter(
            user=user,
            is_read=False
        ).count()


class MatchRecommendationService:
    """Servicio para recomendaciones de matching."""
    
    @staticmethod
    def find_potential_matches_for_tenant(tenant, limit=10):
        """
        Encuentra propiedades potencialmente compatibles para un arrendatario.
        """
        from properties.models import Property
        
        # Obtener criterios del arrendatario si existen
        try:
            criteria = tenant.match_criteria
        except:
            criteria = None
        
        # Buscar propiedades disponibles
        properties = Property.objects.filter(
            availability_status='available'
        )
        
        if criteria:
            # Filtrar por criterios específicos
            if criteria.max_price:
                properties = properties.filter(rent_price__lte=criteria.max_price)
            
            if criteria.min_price:
                properties = properties.filter(rent_price__gte=criteria.min_price)
            
            if criteria.min_bedrooms:
                properties = properties.filter(bedrooms__gte=criteria.min_bedrooms)
            
            if criteria.min_bathrooms:
                properties = properties.filter(bathrooms__gte=criteria.min_bathrooms)
            
            if criteria.min_area:
                properties = properties.filter(total_area__gte=criteria.min_area)
            
            if criteria.preferred_cities:
                properties = properties.filter(city__in=criteria.preferred_cities)
            
            if criteria.pets_required:
                properties = properties.filter(pets_allowed=True)
        
        # Excluir propiedades donde ya hay solicitudes activas
        existing_requests = MatchRequest.objects.filter(
            tenant=tenant,
            status__in=['pending', 'viewed', 'accepted']
        ).values_list('property_id', flat=True)
        
        properties = properties.exclude(id__in=existing_requests)
        
        # Calcular puntuación de compatibilidad para cada propiedad
        scored_properties = []
        for property in properties[:limit*2]:  # Obtener más para poder ordenar
            if criteria:
                score = criteria.calculate_compatibility_score(property)
            else:
                score = 50  # Puntuación neutral sin criterios
            
            scored_properties.append((property, score))
        
        # Ordenar por puntuación y tomar los mejores
        scored_properties.sort(key=lambda x: x[1], reverse=True)
        return scored_properties[:limit]
    
    @staticmethod
    def find_qualified_tenants_for_property(property, limit=10):
        """
        Encuentra arrendatarios potencialmente calificados para una propiedad.
        """
        from django.db.models import Q
        
        # Buscar arrendatarios que podrían estar interesados
        qualified_tenants = User.objects.filter(
            user_type='tenant',
            is_verified=True
        )
        
        # Buscar por criterios de matching
        potential_matches = []
        for tenant in qualified_tenants:
            try:
                criteria = tenant.match_criteria
                if criteria:
                    score = criteria.calculate_compatibility_score(property)
                    if score >= 60:  # Solo incluir matches con buena compatibilidad
                        potential_matches.append((tenant, score))
            except:
                continue
        
        # Ordenar por puntuación
        potential_matches.sort(key=lambda x: x[1], reverse=True)
        return potential_matches[:limit]


class MatchWorkflowService:
    """Servicio para manejar el flujo completo de matching."""
    
    @staticmethod
    def process_match_request_response(match_request, action, landlord_message=''):
        """
        Procesa la respuesta del arrendador a una solicitud de match.
        """
        if action == 'accept':
            match_request.accept_match(landlord_message)
            # Crear hilo de conversación
            thread = MatchingMessagingService.create_match_thread(match_request)
            return {
                'status': 'success',
                'message': 'Match aceptado exitosamente',
                'thread_id': str(thread.id) if thread else None
            }
        
        elif action == 'reject':
            match_request.reject_match(landlord_message)
            # Enviar notificación de rechazo
            MatchingMessagingService.send_match_rejection_message(match_request)
            return {
                'status': 'success',
                'message': 'Match rechazado'
            }
        
        else:
            return {
                'status': 'error',
                'message': 'Acción no válida'
            }
    
    @staticmethod
    def create_match_request(tenant, property, request_data):
        """
        Crea una nueva solicitud de match.
        """
        # Verificar que no existe una solicitud activa
        existing_request = MatchRequest.objects.filter(
            tenant=tenant,
            property=property,
            status__in=['pending', 'viewed', 'accepted']
        ).first()
        
        if existing_request:
            return {
                'status': 'error',
                'message': 'Ya tienes una solicitud activa para esta propiedad'
            }
        
        # Crear nueva solicitud
        match_request = MatchRequest.objects.create(
            property=property,
            tenant=tenant,
            landlord=property.landlord,
            **request_data
        )
        
        # Notificar al arrendador
        MatchingMessagingService.notify_new_match_request(match_request)
        
        return {
            'status': 'success',
            'message': 'Solicitud de match enviada exitosamente',
            'match_code': match_request.match_code
        }