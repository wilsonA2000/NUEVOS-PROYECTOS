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


class MatchingAutomationService:
    """Servicio para automatización del sistema de matching."""
    
    @staticmethod
    def process_daily_matches():
        """Procesa matches diarios y envía notificaciones automáticas."""
        from .models import MatchCriteria
        
        # Obtener usuarios con auto-aplicación habilitada
        active_criteria = MatchCriteria.objects.filter(
            auto_apply_enabled=True,
            notification_frequency='daily',
            tenant__is_active=True
        )
        
        results = {
            'processed_users': 0,
            'total_matches_found': 0,
            'auto_applications_sent': 0,
            'notifications_sent': 0
        }
        
        for criteria in active_criteria:
            user_results = MatchingAutomationService._process_user_daily_matches(criteria)
            results['processed_users'] += 1
            results['total_matches_found'] += user_results['matches_found']
            results['auto_applications_sent'] += user_results['applications_sent']
            results['notifications_sent'] += user_results['notifications_sent']
        
        return results
    
    @staticmethod
    def _process_user_daily_matches(criteria):
        """Procesa matches diarios para un usuario específico."""
        from .utils import find_potential_matches
        
        user_results = {
            'matches_found': 0,
            'applications_sent': 0,
            'notifications_sent': 0
        }
        
        # Encontrar matches potenciales
        matches = find_potential_matches(criteria.tenant, limit=10)
        user_results['matches_found'] = len(matches)
        
        if not matches:
            return user_results
        
        # Si tiene auto-aplicación habilitada, enviar solicitudes automáticas
        if criteria.auto_apply_enabled:
            for property in matches[:3]:  # Máximo 3 aplicaciones automáticas por día
                # Verificar que no haya aplicado ya
                existing_request = MatchRequest.objects.filter(
                    tenant=criteria.tenant,
                    property=property,
                    status__in=['pending', 'viewed', 'accepted']
                ).exists()
                
                if not existing_request:
                    # Calcular score de compatibilidad
                    compatibility_score = criteria.get_match_score(property)
                    
                    # Solo aplicar si el score es alto
                    if compatibility_score >= 70:
                        match_request = MatchRequest.objects.create(
                            tenant=criteria.tenant,
                            landlord=property.landlord,
                            property=property,
                            tenant_message=f"Aplicación automática basada en criterios de búsqueda. Score de compatibilidad: {compatibility_score}%",
                            monthly_income=getattr(criteria.tenant, 'monthly_income', None),
                            employment_type='employed',  # Default
                            has_employment_proof=True,
                            priority='medium'
                        )
                        
                        # Notificar al landlord
                        MatchingMessagingService.notify_new_match_request(match_request)
                        user_results['applications_sent'] += 1
        
        # Enviar notificación de resumen al usuario
        MatchingAutomationService._send_daily_matches_notification(
            criteria.tenant, 
            matches, 
            user_results['applications_sent']
        )
        user_results['notifications_sent'] += 1
        
        # Actualizar fecha de última búsqueda
        criteria.last_search = timezone.now()
        criteria.save()
        
        return user_results
    
    @staticmethod
    def _send_daily_matches_notification(user, matches, auto_applications_sent):
        """Envía notificación diaria de matches al usuario."""
        from .models import MatchNotification
        
        # Crear notificación
        if matches:
            title = f"🏠 {len(matches)} nuevos matches encontrados"
            message = f"Hemos encontrado {len(matches)} propiedades que coinciden con tus criterios de búsqueda."
            
            if auto_applications_sent > 0:
                message += f" Se enviaron {auto_applications_sent} solicitudes automáticas a las mejores opciones."
            
            MatchNotification.objects.create(
                user=user,
                notification_type='new_match_found',
                title=title,
                message=message,
                metadata={
                    'matches_count': len(matches),
                    'auto_applications_sent': auto_applications_sent,
                    'match_properties': [
                        {
                            'id': str(prop.id),
                            'title': prop.title,
                            'rent_price': str(prop.rent_price),
                            'city': prop.city
                        } for prop in matches[:5]  # Top 5
                    ]
                }
            )
    
    @staticmethod
    def expire_old_matches():
        """Expira matches antiguos que no han recibido respuesta."""
        from .models import MatchRequest
        from datetime import timedelta
        
        # Fecha límite para expiración (7 días)
        expiry_date = timezone.now() - timedelta(days=7)
        
        expired_matches = MatchRequest.objects.filter(
            status__in=['pending', 'viewed'],
            created_at__lte=expiry_date
        )
        
        expired_count = expired_matches.count()
        
        # Marcar como expirados
        expired_matches.update(
            status='expired',
            expires_at=timezone.now()
        )
        
        # Notificar a los tenants sobre matches expirados
        for match in expired_matches:
            MatchNotification.objects.create(
                user=match.tenant,
                match_request=match,
                notification_type='match_expired',
                title=f"Match expirado - {match.property.title}",
                message=f"Tu solicitud para {match.property.title} ha expirado sin respuesta del propietario.",
                metadata={
                    'match_code': match.match_code,
                    'property_title': match.property.title,
                    'days_elapsed': 7
                }
            )
        
        return expired_count
    
    @staticmethod
    def send_follow_up_reminders():
        """Envía recordatorios de seguimiento a landlords."""
        from .models import MatchRequest
        from datetime import timedelta
        
        # Buscar matches pendientes de más de 2 días
        reminder_date = timezone.now() - timedelta(days=2)
        
        pending_matches = MatchRequest.objects.filter(
            status='pending',
            created_at__lte=reminder_date,
            follow_up_count__lt=2  # Máximo 2 recordatorios
        )
        
        reminders_sent = 0
        
        for match in pending_matches:
            # Crear notificación de recordatorio para el landlord
            MatchNotification.objects.create(
                user=match.landlord,
                match_request=match,
                notification_type='follow_up_reminder',
                title=f"Recordatorio: Solicitud pendiente - {match.property.title}",
                message=f"{match.tenant.get_full_name()} está esperando tu respuesta sobre {match.property.title}.",
                metadata={
                    'match_code': match.match_code,
                    'tenant_name': match.tenant.get_full_name(),
                    'days_pending': (timezone.now() - match.created_at).days,
                    'compatibility_score': match.get_compatibility_score()
                }
            )
            
            # Actualizar contador de seguimientos
            match.follow_up_count += 1
            match.last_follow_up = timezone.now()
            match.save()
            
            reminders_sent += 1
        
        return reminders_sent


class MatchingRecommendationService:
    """Servicio para recomendaciones inteligentes de matching."""
    
    @staticmethod
    def get_property_recommendations_for_tenant(tenant, limit=10):
        """Obtiene recomendaciones de propiedades para un tenant."""
        try:
            criteria = tenant.match_criteria
            properties = criteria.find_matching_properties()
        except:
            # Si no tiene criterios, usar propiedades disponibles básicas
            from properties.models import Property
            properties = Property.objects.filter(
                is_active=True,
                status='available'
            )
        
        # Calcular scores y ordenar
        recommendations = []
        for property in properties[:limit * 2]:  # Buffer para filtrado
            try:
                score = criteria.get_match_score(property) if hasattr(tenant, 'match_criteria') else 50
            except:
                score = 50  # Score default
            
            if score >= 40:  # Umbral mínimo
                recommendations.append({
                    'property': property,
                    'match_score': score,
                    'reasons': MatchingRecommendationService._get_recommendation_reasons(property, tenant)
                })
        
        # Ordenar por score y retornar top resultados
        recommendations.sort(key=lambda x: x['match_score'], reverse=True)
        return recommendations[:limit]
    
    @staticmethod
    def get_tenant_recommendations_for_property(property, limit=10):
        """Obtiene recomendaciones de tenants para una propiedad."""
        from .models import MatchCriteria
        
        # Buscar tenants con criterios que coincidan con esta propiedad
        potential_tenants = MatchCriteria.objects.filter(
            max_price__gte=property.rent_price,
            min_bedrooms__lte=property.bedrooms,
            min_bathrooms__lte=property.bathrooms
        ).select_related('tenant')
        
        recommendations = []
        for criteria in potential_tenants:
            tenant = criteria.tenant
            
            # Verificar que no haya aplicado ya
            has_applied = MatchRequest.objects.filter(
                tenant=tenant,
                property=property,
                status__in=['pending', 'viewed', 'accepted']
            ).exists()
            
            if not has_applied:
                compatibility_score = criteria.get_match_score(property)
                
                if compatibility_score >= 50:
                    recommendations.append({
                        'tenant': tenant,
                        'compatibility_score': compatibility_score,
                        'criteria': criteria,
                        'reasons': MatchingRecommendationService._get_tenant_recommendation_reasons(tenant, property)
                    })
        
        # Ordenar por score de compatibilidad
        recommendations.sort(key=lambda x: x['compatibility_score'], reverse=True)
        return recommendations[:limit]
    
    @staticmethod
    def _get_recommendation_reasons(property, tenant):
        """Genera razones para recomendar una propiedad a un tenant."""
        reasons = []
        
        try:
            criteria = tenant.match_criteria
            
            if property.rent_price <= criteria.max_price * 0.8:
                reasons.append("Precio excelente")
            elif property.rent_price <= criteria.max_price:
                reasons.append("Dentro de tu presupuesto")
            
            if property.city in criteria.preferred_cities:
                reasons.append("Ubicación preferida")
            
            if property.bedrooms > criteria.min_bedrooms:
                reasons.append("Espacios adicionales")
            
            if criteria.pets_required and property.pets_allowed:
                reasons.append("Acepta mascotas")
                
        except:
            reasons = ["Propiedad disponible", "Buena opción"]
        
        return reasons[:3]
    
    @staticmethod
    def _get_tenant_recommendation_reasons(tenant, property):
        """Genera razones para recomendar un tenant a un landlord."""
        reasons = []
        
        # Verificar ingresos
        tenant_income = getattr(tenant, 'monthly_income', 0)
        if tenant_income and property.rent_price:
            income_ratio = float(tenant_income) / float(property.rent_price)
            if income_ratio >= 3:
                reasons.append("Ingresos excelentes")
            elif income_ratio >= 2.5:
                reasons.append("Ingresos suficientes")
        
        # Verificar historial de matches
        accepted_matches = MatchRequest.objects.filter(
            tenant=tenant,
            status='accepted'
        ).count()
        
        if accepted_matches > 0:
            reasons.append("Historial positivo")
        
        # Verificar actividad reciente
        recent_activity = MatchRequest.objects.filter(
            tenant=tenant,
            created_at__gte=timezone.now() - timezone.timedelta(days=30)
        ).count()
        
        if recent_activity > 2:
            reasons.append("Usuario activo")
        
        return reasons[:3]