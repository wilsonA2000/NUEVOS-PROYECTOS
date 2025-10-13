"""
Vistas API para el sistema de matching de VeriHome.
"""

from rest_framework import viewsets, generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
import logging

logger = logging.getLogger(__name__)

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
    
    def create(self, request, *args, **kwargs):
        """Override create to add detailed error logging."""
        logger.info(f"📝 Match Request CREATE - User: {request.user.email}, Type: {request.user.user_type}")
        logger.info(f"📋 Request Data: {request.data}")
        
        # Log specific fields
        logger.info(f"   - property: {request.data.get('property')}")
        logger.info(f"   - priority: {request.data.get('priority')} (type: {type(request.data.get('priority'))})")
        logger.info(f"   - tenant_message length: {len(request.data.get('tenant_message', ''))}")
        
        serializer = self.get_serializer(data=request.data)
        
        if not serializer.is_valid():
            logger.error(f"❌ Validation errors: {serializer.errors}")
            # Return detailed error response
            return Response(
                {
                    "errors": serializer.errors,
                    "message": "Error de validación en los datos enviados",
                    "details": {
                        field: str(errors[0]) if errors else "" 
                        for field, errors in serializer.errors.items()
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            logger.info(f"✅ Match request created successfully")
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        except serializers.ValidationError as e:
            logger.error(f"❌ Validation error in perform_create: {str(e)}")
            return Response(
                {"error": str(e), "message": "Ya existe una solicitud para esta propiedad"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"❌ Unexpected error: {str(e)}")
            return Response(
                {"error": str(e), "message": "Error inesperado al crear la solicitud"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
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
            from rest_framework import serializers as drf_serializers
            raise drf_serializers.ValidationError("Ya has enviado una solicitud para esta propiedad")
        
        # Crear la solicitud
        match_request = serializer.save(
            tenant=self.request.user,
            landlord=property.landlord
        )
        
        # Crear notificación para el arrendador
        create_match_notification(match_request, 'match_request_received')
        
        # Crear actividad de usuario
        # TODO: Implementar create_user_activity function
        # from users.utils import create_user_activity
        # create_user_activity(
        #     user=self.request.user,
        #     action='match_request_sent',
        #     description=f'Solicitud de match enviada para {property.title}',
        #     metadata={
        #         'property_id': str(property.id),
        #         'match_code': match_request.match_code,
        #         'landlord_id': str(property.landlord.id)
        #     }
        # )
    
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
        # TODO: Implementar create_user_activity function
        # from users.utils import create_user_activity
        # create_user_activity(
        #     user=request.user,
        #     action='match_request_accepted',
        #     description=f'Solicitud de match aceptada para {match_request.property.title}',
        #     metadata={
        #         'match_code': match_request.match_code,
        #         'tenant_id': str(match_request.tenant.id)
        #     }
        # )
        
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
        # TODO: Implementar create_user_activity function
        # from users.utils import create_user_activity
        # create_user_activity(
        #     user=request.user,
        #     action='match_request_rejected',
        #     description=f'Solicitud de match rechazada para {match_request.property.title}',
        #     metadata={
        #         'match_code': match_request.match_code,
        #         'tenant_id': str(match_request.tenant.id)
        #     }
        # )
        
        return Response({
            'message': 'Solicitud rechazada',
            'match_code': match_request.match_code,
            'status': match_request.status
        })

    @action(detail=True, methods=['post'], url_path='generate-contract')
    def generate_contract(self, request, pk=None):
        """
        ✅ GENERA AUTOMÁTICAMENTE UN CONTRATO DESDE EL MATCH APROBADO
        Endpoint para crear el contrato del workflow unificado end-to-end.
        """
        match_request = self.get_object()

        # Verificar que el usuario es el arrendador
        if request.user != match_request.landlord:
            return Response(
                {'error': 'Solo el arrendador puede generar el contrato'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Verificar estado del match
        if match_request.status != 'accepted':
            return Response(
                {'error': 'El match debe estar aceptado para generar contrato'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verificar si ya tiene contrato
        if match_request.has_contract:
            return Response(
                {
                    'error': 'Ya existe un contrato para este match',
                    'contract_id': match_request.workflow_data.get('contract_id')
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # ✅ GENERAR CONTRATO AUTOMÁTICAMENTE
            contract = match_request.auto_create_contract()

            logger.info(f"✅ Contrato {contract.contract_number} generado automáticamente desde match {match_request.match_code}")

            return Response({
                'success': True,
                'message': 'Contrato generado automáticamente',
                'contract': {
                    'id': str(contract.id),
                    'contract_number': contract.contract_number,
                    'status': contract.status,
                    'title': contract.title,
                    'monthly_rent': float(contract.monthly_rent),
                    'start_date': contract.start_date.isoformat(),
                    'end_date': contract.end_date.isoformat(),
                },
                'match': {
                    'match_code': match_request.match_code,
                    'workflow_stage': match_request.workflow_stage,
                    'workflow_status': match_request.workflow_status,
                }
            }, status=status.HTTP_201_CREATED)

        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"❌ Error generando contrato: {str(e)}")
            return Response(
                {'error': 'Error al generar el contrato', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancela una solicitud de match por el tenant."""
        match_request = self.get_object()
        
        # Solo el tenant puede cancelar su propia solicitud
        if request.user != match_request.tenant:
            return Response(
                {'error': 'No tienes permisos para cancelar esta solicitud'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Solo se pueden cancelar solicitudes pendientes o vistas
        if match_request.status not in ['pending', 'viewed']:
            return Response(
                {'error': 'Esta solicitud ya ha sido procesada y no puede ser cancelada'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener el mensaje de cancelación opcional
        cancel_message = request.data.get('message', '')
        
        # Actualizar el estado a 'cancelled'
        match_request.status = 'cancelled'
        match_request.responded_at = timezone.now()
        if cancel_message:
            match_request.tenant_message = f"[CANCELADO] {cancel_message}"
        match_request.save()
        
        # Crear notificación para el arrendador
        create_match_notification(
            match_request, 
            'match_request_cancelled',
            message=f"El inquilino {match_request.tenant.get_full_name()} ha cancelado su solicitud para {match_request.property.title}"
        )
        
        return Response({
            'message': 'Solicitud cancelada exitosamente',
            'match_code': match_request.match_code,
            'status': match_request.status
        })

    @action(detail=True, methods=['post'], url_path='upload-document')
    def upload_document(self, request, pk=None):
        """✅ SUBIR DOCUMENTOS DEL ARRENDATARIO VINCULADOS AL MATCH"""
        from requests.models import TenantDocument

        match_request = self.get_object()

        # Solo el tenant puede subir documentos
        if request.user != match_request.tenant:
            return Response(
                {'error': 'Solo el arrendatario puede subir documentos'},
                status=status.HTTP_403_FORBIDDEN
            )

        # El match debe estar aceptado
        if match_request.status != 'accepted':
            return Response(
                {'error': 'Los documentos solo pueden subirse cuando el match ha sido aceptado'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar datos requeridos
        document_type = request.data.get('document_type')
        document_file = request.FILES.get('document_file')

        if not document_type or not document_file:
            return Response(
                {'error': 'Debe proporcionar document_type y document_file'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Crear el documento vinculado al match
            document = TenantDocument.objects.create(
                match_request=match_request,
                uploaded_by=request.user,
                document_type=document_type,
                document_file=document_file,
                original_filename=document_file.name,
                file_size=document_file.size,
                other_description=request.data.get('other_description', ''),
                status='pending'
            )

            # Actualizar workflow del match
            if match_request.workflow_stage < 2:
                match_request.workflow_stage = 2
                match_request.workflow_status = 'documents_pending'

            match_request.workflow_data['documents_uploaded'] = True
            match_request.workflow_data['last_document_uploaded_at'] = timezone.now().isoformat()
            match_request.save()

            # Notificar al arrendador
            create_match_notification(
                match_request,
                'document_uploaded',
                message=f"{request.user.get_full_name()} ha subido un documento: {document.get_document_type_display()}"
            )

            return Response({
                'success': True,
                'message': 'Documento subido exitosamente',
                'document': {
                    'id': str(document.id),
                    'document_type': document.document_type,
                    'document_type_display': document.get_document_type_display(),
                    'status': document.status,
                    'uploaded_at': document.uploaded_at.isoformat()
                },
                'match': {
                    'workflow_stage': match_request.workflow_stage,
                    'workflow_status': match_request.workflow_status
                }
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"❌ Error subiendo documento: {str(e)}")
            return Response(
                {'error': 'Error al subir el documento', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
            recent_requests_queryset = MatchRequest.objects.filter(tenant=user).order_by('-created_at')
            pending_count = recent_requests_queryset.filter(status='pending').count()
            recent_requests = recent_requests_queryset[:5]
            
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
            recent_requests_queryset = MatchRequest.objects.filter(landlord=user).order_by('-created_at')
            pending_count = recent_requests_queryset.filter(status__in=['pending', 'viewed']).count()
            recent_requests = recent_requests_queryset[:5]
            
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


class MatchPreferencesAPIView(APIView):
    """Vista para obtener y actualizar preferencias de matching."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtener preferencias actuales de matching."""
        if request.user.user_type != 'tenant':
            return Response(
                {'error': 'Esta funcionalidad es solo para arrendatarios'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            criteria = request.user.match_criteria
            preferences = {
                'id': str(criteria.id),
                'preferred_cities': criteria.preferred_cities,
                'max_distance_km': criteria.max_distance_km,
                'min_price': criteria.min_price,
                'max_price': criteria.max_price,
                'property_types': criteria.property_types,
                'min_bedrooms': criteria.min_bedrooms,
                'min_bathrooms': criteria.min_bathrooms,
                'min_area': criteria.min_area,
                'required_amenities': criteria.required_amenities,
                'pets_required': criteria.pets_required,
                'smoking_required': criteria.smoking_required,
                'furnished_required': criteria.furnished_required,
                'parking_required': criteria.parking_required,
                'auto_apply_enabled': criteria.auto_apply_enabled,
                'notification_frequency': criteria.notification_frequency,
                'last_search': criteria.last_search,
                'created_at': criteria.created_at,
                'updated_at': criteria.updated_at
            }
            
            return Response({
                'has_preferences': True,
                'preferences': preferences
            })
            
        except MatchCriteria.DoesNotExist:
            return Response({
                'has_preferences': False,
                'message': 'No se han configurado preferencias de búsqueda'
            })
    
    def post(self, request):
        """Crear o actualizar preferencias de matching."""
        if request.user.user_type != 'tenant':
            return Response(
                {'error': 'Esta funcionalidad es solo para arrendatarios'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            criteria = request.user.match_criteria
            # Actualizar criterios existentes
            for key, value in request.data.items():
                if hasattr(criteria, key):
                    setattr(criteria, key, value)
            criteria.save()
            
            message = 'Preferencias actualizadas exitosamente'
            
        except MatchCriteria.DoesNotExist:
            # Crear nuevos criterios
            criteria = MatchCriteria.objects.create(
                tenant=request.user,
                **request.data
            )
            message = 'Preferencias creadas exitosamente'
        
        return Response({
            'message': message,
            'preferences_id': str(criteria.id)
        }, status=status.HTTP_201_CREATED)


class MatchAnalyticsAPIView(APIView):
    """Vista para analíticas avanzadas del sistema de matching."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtener analíticas de matching del usuario."""
        user = request.user
        days = int(request.query_params.get('days', 30))
        
        # Fecha de inicio para el análisis
        from datetime import timedelta
        start_date = timezone.now() - timedelta(days=days)
        
        if user.user_type == 'tenant':
            # Analíticas para arrendatario
            requests = MatchRequest.objects.filter(
                tenant=user,
                created_at__gte=start_date
            )
            
            analytics = {
                'period_days': days,
                'total_requests_sent': requests.count(),
                'pending_requests': requests.filter(status='pending').count(),
                'viewed_requests': requests.filter(status='viewed').count(),
                'accepted_requests': requests.filter(status='accepted').count(),
                'rejected_requests': requests.filter(status='rejected').count(),
                'response_rate': 0,
                'acceptance_rate': 0,
                'avg_compatibility_score': 0,
                'top_rejection_reasons': [],
                'most_viewed_property_types': [],
                'price_range_preferences': {}
            }
            
            # Calcular tasas
            responded = requests.filter(status__in=['accepted', 'rejected']).count()
            if requests.count() > 0:
                analytics['response_rate'] = (responded / requests.count()) * 100
            
            if responded > 0:
                accepted = requests.filter(status='accepted').count()
                analytics['acceptance_rate'] = (accepted / responded) * 100
            
            # Calcular puntaje promedio de compatibilidad
            scores = [req.get_compatibility_score() for req in requests]
            if scores:
                analytics['avg_compatibility_score'] = sum(scores) / len(scores)
            
            # Tipos de propiedad más visualizados
            property_types = {}
            for req in requests:
                prop_type = req.property.property_type
                property_types[prop_type] = property_types.get(prop_type, 0) + 1
            
            analytics['most_viewed_property_types'] = sorted(
                property_types.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5]
            
        elif user.user_type == 'landlord':
            # Analíticas para arrendador
            requests = MatchRequest.objects.filter(
                landlord=user,
                created_at__gte=start_date
            )
            
            analytics = {
                'period_days': days,
                'total_requests_received': requests.count(),
                'pending_review': requests.filter(status='pending').count(),
                'viewed_requests': requests.filter(status='viewed').count(),
                'accepted_requests': requests.filter(status='accepted').count(),
                'rejected_requests': requests.filter(status='rejected').count(),
                'avg_response_time_hours': 0,
                'conversion_rate': 0,
                'avg_tenant_score': 0,
                'most_requested_properties': [],
                'tenant_income_distribution': {},
                'peak_request_hours': {}
            }
            
            # Calcular tiempo promedio de respuesta
            responded_requests = requests.filter(responded_at__isnull=False)
            if responded_requests.exists():
                total_response_time = sum([
                    (req.responded_at - req.created_at).total_seconds() / 3600 
                    for req in responded_requests
                ])
                analytics['avg_response_time_hours'] = total_response_time / responded_requests.count()
            
            # Tasa de conversión (aceptación)
            if requests.count() > 0:
                accepted = requests.filter(status='accepted').count()
                analytics['conversion_rate'] = (accepted / requests.count()) * 100
            
            # Puntaje promedio de inquilinos
            scores = [req.get_compatibility_score() for req in requests]
            if scores:
                analytics['avg_tenant_score'] = sum(scores) / len(scores)
            
            # Propiedades más solicitadas
            property_requests = {}
            for req in requests:
                prop_title = req.property.title
                property_requests[prop_title] = property_requests.get(prop_title, 0) + 1
            
            analytics['most_requested_properties'] = sorted(
                property_requests.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5]
            
        else:
            return Response(
                {'error': 'Tipo de usuario no soportado para analíticas'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return Response({
            'user_type': user.user_type,
            'analytics': analytics,
            'generated_at': timezone.now()
        })


class SmartMatchingAPIView(APIView):
    """Vista para matching inteligente con algoritmos avanzados."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Ejecutar algoritmo de matching inteligente."""
        if request.user.user_type != 'tenant':
            return Response(
                {'error': 'Esta funcionalidad es solo para arrendatarios'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Parámetros de configuración
        algorithm = request.data.get('algorithm', 'standard')  # standard, advanced, ml
        limit = int(request.data.get('limit', 20))
        min_score = int(request.data.get('min_score', 60))
        
        # Obtener criterios del usuario
        try:
            criteria = request.user.match_criteria
        except MatchCriteria.DoesNotExist:
            return Response(
                {'error': 'Primero configura tus criterios de búsqueda'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ejecutar algoritmo de matching
        if algorithm == 'advanced':
            matches = self._advanced_matching_algorithm(criteria, limit, min_score)
        elif algorithm == 'ml':
            matches = self._ml_matching_algorithm(criteria, limit, min_score)
        else:
            matches = self._standard_matching_algorithm(criteria, limit, min_score)
        
        # Preparar respuesta
        matches_data = []
        for match in matches:
            property_obj = match['property']
            matches_data.append({
                'property': {
                    'id': str(property_obj.id),
                    'title': property_obj.title,
                    'description': property_obj.description[:200],
                    'rent_price': property_obj.rent_price,
                    'city': property_obj.city,
                    'state': property_obj.state,
                    'property_type': property_obj.property_type,
                    'bedrooms': property_obj.bedrooms,
                    'bathrooms': property_obj.bathrooms,
                    'total_area': property_obj.total_area,
                    'landlord': property_obj.landlord.get_full_name()
                },
                'match_score': match['match_score'],
                'algorithm_details': match.get('details', {}),
                'confidence': match.get('confidence', 0),
                'reasons': match.get('reasons', []),
                'has_applied': MatchRequest.objects.filter(
                    tenant=request.user,
                    property=property_obj,
                    status__in=['pending', 'viewed', 'accepted']
                ).exists()
            })
        
        return Response({
            'algorithm_used': algorithm,
            'total_analyzed': match.get('total_analyzed', 0),
            'matches_found': len(matches_data),
            'min_score_threshold': min_score,
            'smart_matches': matches_data,
            'generated_at': timezone.now()
        })
    
    def _standard_matching_algorithm(self, criteria, limit, min_score):
        """Algoritmo de matching estándar basado en criterios."""
        from properties.models import Property
        
        # Obtener propiedades que cumplan criterios básicos
        properties = criteria.find_matching_properties()[:limit * 2]  # Buffer para filtrado
        
        matches = []
        for property in properties:
            score = criteria.get_match_score(property)
            if score >= min_score:
                matches.append({
                    'property': property,
                    'match_score': score,
                    'confidence': min(score / 100, 1.0),
                    'details': {'algorithm': 'standard'},
                    'reasons': self._get_match_reasons(property, criteria)
                })
        
        # Ordenar por score y limitar
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        return matches[:limit]
    
    def _advanced_matching_algorithm(self, criteria, limit, min_score):
        """Algoritmo avanzado que considera historial y patrones."""
        # Algoritmo más sofisticado que considera:
        # - Historial de matches anteriores
        # - Patrones de comportamiento
        # - Similitud con otros usuarios
        matches = self._standard_matching_algorithm(criteria, limit, min_score)
        
        # Ajustar scores basado en historial
        user_history = MatchRequest.objects.filter(tenant=criteria.tenant)
        
        for match in matches:
            # Bonus por tipo de propiedad preferido
            preferred_types = [req.property.property_type for req in user_history.filter(status='accepted')]
            if match['property'].property_type in preferred_types:
                match['match_score'] = min(match['match_score'] + 10, 100)
                match['reasons'].append("Tipo de propiedad que has preferido antes")
            
            # Penalty por rechazos previos similares
            similar_rejected = user_history.filter(
                status='rejected',
                property__city=match['property'].city,
                property__property_type=match['property'].property_type
            ).count()
            
            if similar_rejected > 2:
                match['match_score'] = max(match['match_score'] - 5, 0)
            
            match['details']['algorithm'] = 'advanced'
            match['details']['history_adjustment'] = True
        
        return matches
    
    def _ml_matching_algorithm(self, criteria, limit, min_score):
        """Algoritmo de machine learning simulado."""
        # En una implementación real, aquí iría un modelo de ML entrenado
        # Por ahora, simulamos con lógica heurística avanzada
        matches = self._advanced_matching_algorithm(criteria, limit, min_score)
        
        # Simular ajustes de ML
        for match in matches:
            # Factor de popularidad (propiedades más vistas)
            views_count = getattr(match['property'], 'views_count', 0)
            if views_count > 50:
                match['match_score'] = min(match['match_score'] + 5, 100)
                match['reasons'].append("Propiedad popular entre usuarios")
            
            # Factor de respuesta rápida del landlord
            landlord = match['property'].landlord
            avg_response = MatchRequest.objects.filter(
                landlord=landlord,
                responded_at__isnull=False
            ).count()
            
            if avg_response > 5:  # Landlord responsivo
                match['match_score'] = min(match['match_score'] + 3, 100)
                match['reasons'].append("Propietario con respuestas rápidas")
            
            match['details']['algorithm'] = 'ml'
            match['details']['ml_factors'] = ['popularity', 'landlord_responsiveness']
            match['confidence'] = min(match['match_score'] / 90, 1.0)  # ML tiene más confianza
        
        return matches
    
    def _get_match_reasons(self, property, criteria):
        """Genera razones específicas para el match."""
        reasons = []
        
        if criteria.max_price and property.rent_price <= criteria.max_price * 0.8:
            reasons.append("Precio muy competitivo")
        elif criteria.max_price and property.rent_price <= criteria.max_price:
            reasons.append("Dentro de tu presupuesto")
        
        if property.city in criteria.preferred_cities:
            reasons.append("En tu ciudad preferida")
        
        if property.bedrooms > criteria.min_bedrooms:
            reasons.append("Más dormitorios de los necesarios")
        
        if criteria.parking_required and property.parking_spaces > 0:
            reasons.append("Incluye estacionamiento")
        
        if criteria.pets_required and property.pets_allowed:
            reasons.append("Permite mascotas")
        
        return reasons[:3]  # Limitar a 3 razones principales


class FindMatchRequestAPIView(APIView):
    """Vista para encontrar MatchRequest por tenant y property."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Busca MatchRequest basado en tenant y property."""
        tenant_id = request.query_params.get('tenant')
        property_id = request.query_params.get('property')
        
        if not tenant_id or not property_id:
            return Response(
                {'error': 'Se requieren tenant y property como parámetros'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar permisos: solo el landlord de la propiedad puede buscar
        try:
            from properties.models import Property
            property_obj = Property.objects.get(id=property_id)
            
            if request.user != property_obj.landlord:
                return Response(
                    {'error': 'No tienes permisos para ver esta información'},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Property.DoesNotExist:
            return Response(
                {'error': 'Propiedad no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Buscar MatchRequest
        try:
            match_request = MatchRequest.objects.get(
                tenant_id=tenant_id,
                property_id=property_id
            )
            
            return Response({
                'match_request_id': str(match_request.id),
                'match_code': match_request.match_code,
                'status': match_request.status,
                'created_at': match_request.created_at
            })
            
        except MatchRequest.DoesNotExist:
            return Response(
                {'error': 'No se encontró solicitud de match entre este tenant y propiedad'},
                status=status.HTTP_404_NOT_FOUND
            )


class CheckExistingMatchRequestAPIView(APIView):
    """Vista para verificar si ya existe una solicitud de match para una propiedad."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Verifica si el usuario ya tiene una solicitud para una propiedad específica."""
        property_id = request.query_params.get('property_id')
        
        if not property_id:
            return Response(
                {'error': 'Se requiere property_id como parámetro'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Solo permitir a tenants verificar sus propias solicitudes
        if request.user.user_type != 'tenant':
            return Response(
                {'error': 'Solo los arrendatarios pueden usar esta funcionalidad'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            from properties.models import Property
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'error': 'Propiedad no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Buscar solicitud existente
        existing_request = MatchRequest.objects.filter(
            tenant=request.user,
            property=property_obj,
            status__in=['pending', 'viewed', 'accepted']
        ).first()
        
        if existing_request:
            return Response({
                'has_existing_request': True,
                'request': {
                    'id': str(existing_request.id),
                    'match_code': existing_request.match_code,
                    'status': existing_request.status,
                    'priority': existing_request.priority,
                    'created_at': existing_request.created_at,
                    'tenant_message': existing_request.tenant_message[:100] + '...' if len(existing_request.tenant_message) > 100 else existing_request.tenant_message,
                    'can_update': existing_request.status == 'pending',
                    'can_cancel': existing_request.status in ['pending', 'viewed']
                }
            })
        else:
            return Response({
                'has_existing_request': False,
                'can_create_new': True
            })
    
    def delete(self, request):
        """Permite cancelar una solicitud existente."""
        property_id = request.query_params.get('property_id')
        
        if not property_id:
            return Response(
                {'error': 'Se requiere property_id como parámetro'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if request.user.user_type != 'tenant':
            return Response(
                {'error': 'Solo los arrendatarios pueden cancelar solicitudes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            existing_request = MatchRequest.objects.get(
                tenant=request.user,
                property_id=property_id,
                status__in=['pending', 'viewed']
            )
            
            existing_request.status = 'cancelled'
            existing_request.save()
            
            return Response({
                'message': 'Solicitud cancelada exitosamente',
                'match_code': existing_request.match_code
            })
            
        except MatchRequest.DoesNotExist:
            return Response(
                {'error': 'No se encontró una solicitud cancelable'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        except MatchRequest.DoesNotExist:
            return Response(
                {'error': 'No se encontró solicitud de match entre este tenant y propiedad'},
                status=status.HTTP_404_NOT_FOUND
            )
        except MatchRequest.MultipleObjectsReturned:
            # Si hay múltiples, devolver el más reciente
            match_request = MatchRequest.objects.filter(
                tenant_id=tenant_id,
                property_id=property_id
            ).order_by('-created_at').first()
            
            return Response({
                'match_request_id': str(match_request.id),
                'match_code': match_request.match_code,
                'status': match_request.status,
                'created_at': match_request.created_at
            })


class CheckExistingMatchRequestAPIView(APIView):
    """Vista para verificar si ya existe una solicitud de match para una propiedad."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Verifica si el usuario ya tiene una solicitud para una propiedad específica."""
        property_id = request.query_params.get('property_id')
        
        if not property_id:
            return Response(
                {'error': 'Se requiere property_id como parámetro'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Solo permitir a tenants verificar sus propias solicitudes
        if request.user.user_type != 'tenant':
            return Response(
                {'error': 'Solo los arrendatarios pueden usar esta funcionalidad'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            from properties.models import Property
            property_obj = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response(
                {'error': 'Propiedad no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Buscar solicitud existente
        existing_request = MatchRequest.objects.filter(
            tenant=request.user,
            property=property_obj,
            status__in=['pending', 'viewed', 'accepted']
        ).first()
        
        if existing_request:
            return Response({
                'has_existing_request': True,
                'request': {
                    'id': str(existing_request.id),
                    'match_code': existing_request.match_code,
                    'status': existing_request.status,
                    'priority': existing_request.priority,
                    'created_at': existing_request.created_at,
                    'tenant_message': existing_request.tenant_message[:100] + '...' if len(existing_request.tenant_message) > 100 else existing_request.tenant_message,
                    'can_update': existing_request.status == 'pending',
                    'can_cancel': existing_request.status in ['pending', 'viewed']
                }
            })
        else:
            return Response({
                'has_existing_request': False,
                'can_create_new': True
            })
    
    def delete(self, request):
        """Permite cancelar una solicitud existente."""
        property_id = request.query_params.get('property_id')
        
        if not property_id:
            return Response(
                {'error': 'Se requiere property_id como parámetro'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if request.user.user_type != 'tenant':
            return Response(
                {'error': 'Solo los arrendatarios pueden cancelar solicitudes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            existing_request = MatchRequest.objects.get(
                tenant=request.user,
                property_id=property_id,
                status__in=['pending', 'viewed']
            )
            
            existing_request.status = 'cancelled'
            existing_request.save()
            
            return Response({
                'message': 'Solicitud cancelada exitosamente',
                'match_code': existing_request.match_code
            })
            
        except MatchRequest.DoesNotExist:
            return Response(
                {'error': 'No se encontró una solicitud cancelable'},
                status=status.HTTP_404_NOT_FOUND
            )