"""
Vistas API para el sistema de matching de VeriHome.
"""

from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import (
    MatchRequest, MatchCriteria, MatchNotification, MatchAnalytics
)
from .serializers import (
    MatchRequestSerializer, MatchCriteriaSerializer, 
    MatchNotificationSerializer, CreateMatchRequestSerializer,
    MatchRequestDetailSerializer
)
from .utils import (
    find_potential_matches, calculate_match_compatibility,
    get_landlord_match_recommendations, create_match_notification,
    auto_apply_matches, get_match_statistics
)

User = get_user_model()


class MatchRequestViewSet(viewsets.ModelViewSet):
    """ViewSet para solicitudes de match."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateMatchRequestSerializer
        elif self.action == 'retrieve':
            return MatchRequestDetailSerializer
        return MatchRequestSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.user_type == 'tenant':
            # Arrendatarios ven sus solicitudes enviadas
            return MatchRequest.objects.filter(tenant=user)
        elif user.user_type == 'landlord':
            # Arrendadores ven solicitudes recibidas
            return MatchRequest.objects.filter(landlord=user)
        else:
            return MatchRequest.objects.none()
    
    def perform_create(self, serializer):
        property = serializer.validated_data['property']
        
        # Verificar que el usuario sea arrendatario
        if self.request.user.user_type != 'tenant':
            raise permissions.PermissionDenied("Solo los arrendatarios pueden enviar solicitudes de match")
        
        # Verificar que no haya enviado solicitud ya
        existing_request = MatchRequest.objects.filter(
            tenant=self.request.user,
            property=property,
            status__in=['pending', 'viewed', 'accepted']
        ).exists()
        
        if existing_request:
            raise serializers.ValidationError("Ya has enviado una solicitud para esta propiedad")
        
        # Crear la solicitud
        match_request = serializer.save(
            tenant=self.request.user,
            landlord=property.landlord
        )
        
        # Crear notificación para el arrendador
        create_match_notification(match_request, 'match_request_received')
        
        # Crear actividad de usuario
        from users.utils import create_user_activity
        create_user_activity(
            user=self.request.user,
            action='match_request_sent',
            description=f'Solicitud de match enviada para {property.title}',
            metadata={
                'property_id': str(property.id),
                'match_code': match_request.match_code,
                'landlord_id': str(property.landlord.id)
            }
        )
    
    @action(detail=True, methods=['post'])
    def mark_viewed(self, request, pk=None):
        """Marca una solicitud como vista por el arrendador."""
        match_request = self.get_object()
        
        if request.user != match_request.landlord:
            return Response(
                {'error': 'No tienes permisos para esta acción'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        match_request.mark_as_viewed()
        
        return Response({
            'message': 'Solicitud marcada como vista',
            'status': match_request.status
        })
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Acepta una solicitud de match."""
        match_request = self.get_object()
        
        if request.user != match_request.landlord:
            return Response(
                {'error': 'No tienes permisos para esta acción'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if match_request.status not in ['pending', 'viewed']:
            return Response(
                {'error': 'Esta solicitud ya ha sido procesada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        landlord_message = request.data.get('message', '')
        match_request.accept_match(landlord_message)
        
        # Crear actividad de usuario
        from users.utils import create_user_activity
        create_user_activity(
            user=request.user,
            action='match_request_accepted',
            description=f'Solicitud de match aceptada para {match_request.property.title}',
            metadata={
                'match_code': match_request.match_code,
                'tenant_id': str(match_request.tenant.id)
            }
        )
        
        return Response({
            'message': 'Solicitud aceptada exitosamente',
            'match_code': match_request.match_code,
            'status': match_request.status
        })
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rechaza una solicitud de match."""
        match_request = self.get_object()
        
        if request.user != match_request.landlord:
            return Response(
                {'error': 'No tienes permisos para esta acción'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if match_request.status not in ['pending', 'viewed']:
            return Response(
                {'error': 'Esta solicitud ya ha sido procesada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        landlord_message = request.data.get('message', '')
        match_request.reject_match(landlord_message)
        
        # Crear actividad de usuario
        from users.utils import create_user_activity
        create_user_activity(
            user=request.user,
            action='match_request_rejected',
            description=f'Solicitud de match rechazada para {match_request.property.title}',
            metadata={
                'match_code': match_request.match_code,
                'tenant_id': str(match_request.tenant.id)
            }
        )
        
        return Response({
            'message': 'Solicitud rechazada',
            'match_code': match_request.match_code,
            'status': match_request.status
        })
    
    @action(detail=True, methods=['get'])
    def compatibility(self, request, pk=None):
        """Obtiene el análisis de compatibilidad para un match."""
        match_request = self.get_object()
        
        if request.user not in [match_request.tenant, match_request.landlord]:
            return Response(
                {'error': 'No tienes permisos para ver esta información'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        compatibility = calculate_match_compatibility(match_request)
        
        return Response({
            'match_code': match_request.match_code,
            'compatibility_analysis': compatibility,
            'tenant_score': match_request.get_compatibility_score()
        })


class MatchCriteriaViewSet(viewsets.ModelViewSet):
    """ViewSet para criterios de matching."""
    serializer_class = MatchCriteriaSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MatchCriteria.objects.filter(tenant=self.request.user)
    
    def perform_create(self, serializer):
        if self.request.user.user_type != 'tenant':
            raise permissions.PermissionDenied("Solo los arrendatarios pueden crear criterios de búsqueda")
        
        serializer.save(tenant=self.request.user)
    
    @action(detail=True, methods=['get'])
    def find_matches(self, request, pk=None):
        """Encuentra propiedades que coincidan con los criterios."""
        criteria = self.get_object()
        
        matches = find_potential_matches(criteria.tenant, limit=20)
        
        # Calcular scores para cada match
        matches_with_scores = []
        for property in matches:
            score = criteria.get_match_score(property)
            matches_with_scores.append({
                'property': {
                    'id': str(property.id),
                    'title': property.title,
                    'rent_price': property.rent_price,
                    'city': property.city,
                    'property_type': property.property_type,
                    'bedrooms': property.bedrooms,
                    'bathrooms': property.bathrooms,
                    'total_area': property.total_area,
                    'landlord': property.landlord.get_full_name(),
                },
                'match_score': score,
                'has_applied': MatchRequest.objects.filter(
                    tenant=request.user,
                    property=property,
                    status__in=['pending', 'viewed', 'accepted']
                ).exists()
            })
        
        return Response({
            'matches': matches_with_scores,
            'total_found': len(matches_with_scores)
        })


class PotentialMatchesAPIView(APIView):
    """Vista para obtener matches potenciales para un arrendatario."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type != 'tenant':
            return Response(
                {'error': 'Esta funcionalidad es solo para arrendatarios'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        limit = int(request.query_params.get('limit', 10))
        matches = find_potential_matches(request.user, limit=limit)
        
        # Serializar matches
        matches_data = []
        for property in matches:
            # Calcular score si tiene criterios
            score = 0
            try:
                criteria = request.user.match_criteria
                score = criteria.get_match_score(property)
            except:
                pass
            
            matches_data.append({
                'property': {
                    'id': str(property.id),
                    'title': property.title,
                    'description': property.description[:200],
                    'rent_price': property.rent_price,
                    'city': property.city,
                    'state': property.state,
                    'property_type': property.property_type,
                    'bedrooms': property.bedrooms,
                    'bathrooms': property.bathrooms,
                    'total_area': property.total_area,
                    'main_image': property.get_main_image(),
                    'landlord': {
                        'name': property.landlord.get_full_name(),
                        'user_type': property.landlord.user_type
                    }
                },
                'match_score': score,
                'reasons': self.get_match_reasons(property, request.user),
                'has_applied': MatchRequest.objects.filter(
                    tenant=request.user,
                    property=property,
                    status__in=['pending', 'viewed', 'accepted']
                ).exists()
            })
        
        return Response({
            'potential_matches': matches_data,
            'total_found': len(matches_data)
        })
    
    def get_match_reasons(self, property, tenant):
        """Genera razones por las que es un buen match."""
        reasons = []
        
        try:
            criteria = tenant.match_criteria
            
            if criteria.max_price and property.rent_price <= criteria.max_price:
                if property.rent_price <= criteria.max_price * 0.8:
                    reasons.append("Precio muy atractivo")
                else:
                    reasons.append("Dentro de tu presupuesto")
            
            if property.city in criteria.preferred_cities:
                reasons.append("En tu ciudad preferida")
            
            if property.bedrooms >= criteria.min_bedrooms:
                reasons.append("Suficientes dormitorios")
            
            if property.bathrooms >= criteria.min_bathrooms:
                reasons.append("Suficientes baños")
            
            if criteria.parking_required and property.parking_spaces > 0:
                reasons.append("Tiene estacionamiento")
            
            if criteria.pets_required and property.pets_allowed:
                reasons.append("Permite mascotas")
                
        except:
            # Si no tiene criterios, usar razones genéricas
            reasons = ["Propiedad disponible", "Buena ubicación"]
        
        return reasons


class LandlordRecommendationsAPIView(APIView):
    """Vista para obtener recomendaciones de matches para arrendadores."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if request.user.user_type != 'landlord':
            return Response(
                {'error': 'Esta funcionalidad es solo para arrendadores'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        limit = int(request.query_params.get('limit', 10))
        recommendations = get_landlord_match_recommendations(request.user, limit=limit)
        
        recommendations_data = []
        for rec in recommendations:
            recommendations_data.append({
                'property': {
                    'id': str(rec['property'].id),
                    'title': rec['property'].title,
                    'rent_price': rec['property'].rent_price,
                    'city': rec['property'].city,
                    'property_type': rec['property'].property_type
                },
                'tenant': {
                    'id': str(rec['tenant'].id),
                    'name': rec['tenant'].get_full_name(),
                    'email': rec['tenant'].email
                },
                'compatibility_score': rec['compatibility_score'],
                'reasons': rec['reasons'],
                'can_contact': True
            })
        
        return Response({
            'recommendations': recommendations_data,
            'total_found': len(recommendations_data)
        })


class MatchNotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para notificaciones de matching."""
    serializer_class = MatchNotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return MatchNotification.objects.filter(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Marca una notificación como leída."""
        notification = self.get_object()
        notification.mark_as_read()
        
        return Response({
            'message': 'Notificación marcada como leída',
            'is_read': notification.is_read
        })
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marca todas las notificaciones como leídas."""
        notifications = self.get_queryset().filter(is_read=False)
        count = notifications.count()
        
        notifications.update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({
            'message': f'{count} notificaciones marcadas como leídas',
            'count': count
        })


class MatchStatisticsAPIView(APIView):
    """Vista para estadísticas de matching."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        stats = get_match_statistics(request.user)
        
        # Agregar información adicional
        if request.user.user_type == 'tenant':
            # Para arrendatarios, agregar información sobre criterios
            try:
                criteria = request.user.match_criteria
                stats['has_criteria'] = True
                stats['auto_apply_enabled'] = criteria.auto_apply_enabled
                stats['last_search'] = criteria.last_search
            except MatchCriteria.DoesNotExist:
                stats['has_criteria'] = False
                stats['auto_apply_enabled'] = False
                stats['last_search'] = None
        
        elif request.user.user_type == 'landlord':
            # Para arrendadores, agregar información sobre propiedades
            stats['active_properties'] = request.user.properties.filter(
                is_active=True,
                status='available'
            ).count()
            
            # Solicitudes pendientes por propiedad
            pending_by_property = {}
            for property in request.user.properties.filter(is_active=True):
                pending_count = MatchRequest.objects.filter(
                    property=property,
                    status__in=['pending', 'viewed']
                ).count()
                if pending_count > 0:
                    pending_by_property[property.title] = pending_count
            
            stats['pending_by_property'] = pending_by_property
        
        return Response(stats)


class AutoApplyMatchesAPIView(APIView):
    """Vista para aplicar automáticamente a matches."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        if request.user.user_type != 'tenant':
            return Response(
                {'error': 'Esta funcionalidad es solo para arrendatarios'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        applications = auto_apply_matches(request.user)
        
        applications_data = []
        for app in applications:
            applications_data.append({
                'match_code': app.match_code,
                'property': {
                    'title': app.property.title,
                    'rent_price': app.property.rent_price,
                    'city': app.property.city
                },
                'landlord': app.landlord.get_full_name(),
                'created_at': app.created_at
            })
        
        return Response({
            'message': f'{len(applications)} solicitudes automáticas enviadas',
            'applications': applications_data,
            'count': len(applications)
        })


class MatchDashboardAPIView(APIView):
    """Vista para el dashboard de matching."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        if user.user_type == 'tenant':
            # Dashboard para arrendatario
            recent_requests = MatchRequest.objects.filter(tenant=user).order_by('-created_at')[:5]
            pending_count = recent_requests.filter(status='pending').count()
            
            # Notificaciones no leídas
            unread_notifications = MatchNotification.objects.filter(
                user=user,
                is_read=False
            ).count()
            
            # Matches potenciales disponibles
            potential_matches_count = len(find_potential_matches(user, limit=50))
            
            dashboard_data = {
                'user_type': 'tenant',
                'recent_requests': [
                    {
                        'match_code': req.match_code,
                        'property_title': req.property.title,
                        'status': req.status,
                        'created_at': req.created_at,
                        'landlord': req.landlord.get_full_name()
                    } for req in recent_requests
                ],
                'pending_responses': pending_count,
                'unread_notifications': unread_notifications,
                'potential_matches': potential_matches_count,
                'statistics': get_match_statistics(user)
            }
        
        elif user.user_type == 'landlord':
            # Dashboard para arrendador
            recent_requests = MatchRequest.objects.filter(landlord=user).order_by('-created_at')[:5]
            pending_count = recent_requests.filter(status__in=['pending', 'viewed']).count()
            
            # Notificaciones no leídas
            unread_notifications = MatchNotification.objects.filter(
                user=user,
                is_read=False
            ).count()
            
            # Propiedades activas
            active_properties = user.properties.filter(is_active=True, status='available').count()
            
            dashboard_data = {
                'user_type': 'landlord',
                'recent_requests': [
                    {
                        'match_code': req.match_code,
                        'property_title': req.property.title,
                        'tenant_name': req.tenant.get_full_name(),
                        'status': req.status,
                        'created_at': req.created_at,
                        'compatibility_score': req.get_compatibility_score()
                    } for req in recent_requests
                ],
                'pending_requests': pending_count,
                'unread_notifications': unread_notifications,
                'active_properties': active_properties,
                'statistics': get_match_statistics(user)
            }
        
        else:
            dashboard_data = {
                'user_type': user.user_type,
                'message': 'Dashboard no disponible para este tipo de usuario'
            }
        
        return Response(dashboard_data)