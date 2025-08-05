"""
Utilidades para el sistema de matching de VeriHome.
"""

from django.utils import timezone
from django.contrib.auth import get_user_model
from django.db.models import Q
from .models import MatchRequest, MatchCriteria, MatchNotification, MatchAnalytics

User = get_user_model()


def create_match_notification(match_request, notification_type, custom_message=None):
    """Crea una notificación relacionada con un match."""
    
    notification_configs = {
        'match_request_received': {
            'recipient': match_request.landlord,
            'title': f'Nueva solicitud de match - {match_request.property.title}',
            'message': f'{match_request.tenant.get_full_name()} está interesado en tu propiedad "{match_request.property.title}". Revisa su perfil y responde.'
        },
        'match_accepted': {
            'recipient': match_request.tenant,
            'title': 'Tu solicitud de match fue aceptada',
            'message': f'¡Buenas noticias! {match_request.landlord.get_full_name()} ha aceptado tu solicitud para "{match_request.property.title}". Pueden proceder con el siguiente paso.'
        },
        'match_rejected': {
            'recipient': match_request.tenant,
            'title': 'Actualización de tu solicitud de match',
            'message': f'{match_request.landlord.get_full_name()} ha respondido a tu solicitud para "{match_request.property.title}". Revisa los detalles en tu panel.'
        },
        'match_expired': {
            'recipient': match_request.tenant,
            'title': 'Tu solicitud de match ha expirado',
            'message': f'Tu solicitud para "{match_request.property.title}" ha expirado. Puedes enviar una nueva solicitud si sigues interesado.'
        },
        'follow_up_reminder': {
            'recipient': match_request.landlord,
            'title': 'Recordatorio: Solicitud de match pendiente',
            'message': f'Tienes una solicitud pendiente de {match_request.tenant.get_full_name()} para "{match_request.property.title}". No olvides responder.'
        }
    }
    
    config = notification_configs.get(notification_type)
    if not config:
        return None
    
    message = custom_message or config['message']
    
    notification = MatchNotification.objects.create(
        user=config['recipient'],
        match_request=match_request,
        notification_type=notification_type,
        title=config['title'],
        message=message,
        metadata={
            'property_id': str(match_request.property.id),
            'match_code': match_request.match_code,
            'created_by': str(match_request.tenant.id) if notification_type == 'match_request_received' else str(match_request.landlord.id)
        }
    )
    
    return notification


def find_potential_matches(tenant, limit=10):
    """Encuentra propiedades potenciales para un arrendatario."""
    
    try:
        criteria = tenant.match_criteria
    except MatchCriteria.DoesNotExist:
        # Si no tiene criterios, usar búsqueda básica
        from properties.models import Property
        return Property.objects.filter(
            is_active=True,
            status='available'
        )[:limit]
    
    matching_properties = criteria.find_matching_properties()
    
    # Excluir propiedades donde ya envió solicitud
    already_requested = MatchRequest.objects.filter(
        tenant=tenant,
        status__in=['pending', 'viewed', 'accepted']
    ).values_list('property_id', flat=True)
    
    matching_properties = matching_properties.exclude(id__in=already_requested)
    
    # Calcular scores y ordenar
    properties_with_scores = []
    for property in matching_properties[:50]:  # Limitar para performance
        score = criteria.get_match_score(property)
        properties_with_scores.append((property, score))
    
    # Ordenar por score descendente
    properties_with_scores.sort(key=lambda x: x[1], reverse=True)
    
    return [prop for prop, score in properties_with_scores[:limit]]


def calculate_match_compatibility(match_request):
    """Calcula la compatibilidad entre un match request y la propiedad."""
    
    property = match_request.property
    score = 0
    details = {
        'financial_score': 0,
        'requirements_score': 0,
        'preferences_score': 0,
        'documentation_score': 0,
        'total_score': 0
    }
    
    # 1. Evaluación financiera (40% del score)
    if match_request.monthly_income and property.rent_price:
        income_ratio = float(match_request.monthly_income) / float(property.rent_price)
        if income_ratio >= 4:
            financial_score = 40
        elif income_ratio >= 3:
            financial_score = 35
        elif income_ratio >= 2.5:
            financial_score = 25
        elif income_ratio >= 2:
            financial_score = 15
        else:
            financial_score = 5
        
        details['financial_score'] = financial_score
        score += financial_score
    
    # 2. Cumplimiento de requisitos (25% del score)
    requirements_score = 0
    
    # Mascotas
    if match_request.has_pets:
        if property.pets_allowed:
            requirements_score += 8
        else:
            requirements_score -= 5  # Penalización
    else:
        requirements_score += 5  # Bonus por no tener mascotas
    
    # Fumar
    if match_request.smoking_allowed:
        smoking_property_allowed = getattr(property, 'smoking_allowed', False)
        if smoking_property_allowed:
            requirements_score += 5
        else:
            requirements_score -= 3
    else:
        requirements_score += 3
    
    # Número de ocupantes vs capacidad
    if hasattr(property, 'max_occupants'):
        if match_request.number_of_occupants <= property.max_occupants:
            requirements_score += 7
        else:
            requirements_score -= 10
    
    details['requirements_score'] = max(0, requirements_score)
    score += max(0, requirements_score)
    
    # 3. Preferencias y timing (20% del score)
    preferences_score = 0
    
    # Duración del contrato
    if 6 <= match_request.lease_duration_months <= 24:
        preferences_score += 8
    elif match_request.lease_duration_months >= 12:
        preferences_score += 5
    
    # Fecha de mudanza (si la propiedad tiene disponibilidad)
    if match_request.preferred_move_in_date:
        if hasattr(property, 'available_from'):
            if property.available_from and match_request.preferred_move_in_date >= property.available_from:
                preferences_score += 7
        else:
            preferences_score += 5  # Asumimos que está disponible
    
    # Mensaje personalizado
    if len(match_request.tenant_message) > 200:
        preferences_score += 5
    elif len(match_request.tenant_message) > 100:
        preferences_score += 3
    
    details['preferences_score'] = preferences_score
    score += preferences_score
    
    # 4. Documentación y referencias (15% del score)
    documentation_score = 0
    
    if match_request.has_rental_references:
        documentation_score += 5
    if match_request.has_employment_proof:
        documentation_score += 5
    if match_request.has_credit_check:
        documentation_score += 3
    if match_request.employment_type in ['employed', 'self_employed']:
        documentation_score += 2
    
    details['documentation_score'] = documentation_score
    score += documentation_score
    
    details['total_score'] = min(score, 100)
    
    return details


def get_landlord_match_recommendations(landlord, limit=5):
    """Obtiene recomendaciones de matches para un arrendador."""
    
    # Obtener propiedades activas del arrendador
    landlord_properties = landlord.properties.filter(
        is_active=True,
        status='available'
    )
    
    if not landlord_properties.exists():
        return []
    
    recommendations = []
    
    for property in landlord_properties:
        # Buscar arrendatarios potenciales
        potential_tenants = find_potential_tenants_for_property(property, limit=3)
        
        for tenant_data in potential_tenants:
            recommendations.append({
                'property': property,
                'tenant': tenant_data['tenant'],
                'compatibility_score': tenant_data['score'],
                'criteria': tenant_data['criteria'],
                'reasons': tenant_data['reasons']
            })
    
    # Ordenar por score y limitar
    recommendations.sort(key=lambda x: x['compatibility_score'], reverse=True)
    return recommendations[:limit]


def find_potential_tenants_for_property(property, limit=5):
    """Encuentra arrendatarios potenciales para una propiedad específica."""
    
    potential_tenants = []
    
    # Buscar usuarios con criterios de match que coincidan
    matching_criteria = MatchCriteria.objects.filter(
        Q(preferred_cities__contains=property.city) |
        Q(preferred_cities__isnull=True) |
        Q(preferred_cities=[])
    ).filter(
        Q(max_price__gte=property.rent_price) |
        Q(max_price__isnull=True)
    ).filter(
        Q(property_types__contains=property.property_type) |
        Q(property_types__isnull=True) |
        Q(property_types=[])
    )
    
    for criteria in matching_criteria:
        tenant = criteria.tenant
        
        # Verificar que no haya enviado solicitud ya
        existing_request = MatchRequest.objects.filter(
            tenant=tenant,
            property=property,
            status__in=['pending', 'viewed', 'accepted']
        ).exists()
        
        if existing_request:
            continue
        
        # Calcular score de compatibilidad
        score = criteria.get_match_score(property)
        
        if score >= 50:  # Solo incluir matches con score decente
            reasons = []
            
            # Generar razones del match
            if property.rent_price <= criteria.max_price:
                price_ratio = float(property.rent_price) / float(criteria.max_price)
                if price_ratio <= 0.8:
                    reasons.append("Precio muy atractivo")
                else:
                    reasons.append("Precio dentro del presupuesto")
            
            if property.city in criteria.preferred_cities:
                reasons.append("Ubicación preferida")
            
            if property.bedrooms >= criteria.min_bedrooms:
                reasons.append("Suficientes dormitorios")
            
            if criteria.required_amenities:
                property_amenities = set(property.amenities.values_list('name', flat=True))
                matching_amenities = set(criteria.required_amenities) & property_amenities
                if matching_amenities:
                    reasons.append(f"Tiene {len(matching_amenities)} amenidades deseadas")
            
            potential_tenants.append({
                'tenant': tenant,
                'score': score,
                'criteria': criteria,
                'reasons': reasons
            })
    
    # Ordenar por score
    potential_tenants.sort(key=lambda x: x['score'], reverse=True)
    return potential_tenants[:limit]


def process_expired_matches():
    """Procesa matches expirados y actualiza su estado."""
    
    expired_matches = MatchRequest.objects.filter(
        status__in=['pending', 'viewed'],
        expires_at__lt=timezone.now()
    )
    
    for match in expired_matches:
        match.status = 'expired'
        match.save()
        
        # Crear notificación de expiración
        create_match_notification(match, 'match_expired')
    
    return expired_matches.count()


def send_follow_up_reminders():
    """Envía recordatorios de seguimiento a arrendadores."""
    
    # Buscar matches pendientes de más de 2 días sin respuesta
    pending_matches = MatchRequest.objects.filter(
        status__in=['pending', 'viewed'],
        created_at__lt=timezone.now() - timezone.timedelta(days=2),
        follow_up_count__lt=3  # Máximo 3 recordatorios
    ).filter(
        Q(last_follow_up__isnull=True) |
        Q(last_follow_up__lt=timezone.now() - timezone.timedelta(days=2))
    )
    
    reminders_sent = 0
    
    for match in pending_matches:
        # Enviar recordatorio
        create_match_notification(match, 'follow_up_reminder')
        
        # Actualizar contador
        match.follow_up_count += 1
        match.last_follow_up = timezone.now()
        match.save()
        
        reminders_sent += 1
    
    return reminders_sent


def generate_match_analytics(date=None):
    """Genera analíticas diarias del sistema de matching."""
    
    if not date:
        date = timezone.now().date()
    
    return MatchAnalytics.calculate_daily_analytics(date)


def auto_apply_matches(tenant):
    """Aplica automáticamente a matches cuando está habilitado."""
    
    try:
        criteria = tenant.match_criteria
        if not criteria.auto_apply_enabled:
            return []
        
        # Encontrar matches potenciales
        potential_properties = find_potential_matches(tenant, limit=5)
        
        auto_applications = []
        
        for property in potential_properties:
            # Verificar que no haya aplicado ya
            existing_request = MatchRequest.objects.filter(
                tenant=tenant,
                property=property
            ).exists()
            
            if existing_request:
                continue
            
            # Verificar score mínimo para auto-aplicar
            score = criteria.get_match_score(property)
            if score >= 80:  # Solo auto-aplicar a matches muy buenos
                
                # Crear solicitud automática
                match_request = MatchRequest.objects.create(
                    property=property,
                    tenant=tenant,
                    landlord=property.landlord,
                    tenant_message=f"Hola, estoy muy interesado en su propiedad '{property.title}'. Me parece perfecta para mis necesidades. Me gustaría agendar una visita cuando sea conveniente para usted.",
                    monthly_income=getattr(tenant, 'monthly_income', None),
                    employment_type=getattr(tenant, 'employment_type', ''),
                    preferred_move_in_date=timezone.now().date() + timezone.timedelta(days=30),
                    number_of_occupants=1,
                    priority='high'
                )
                
                # Crear notificación para el arrendador
                create_match_notification(match_request, 'match_request_received')
                
                auto_applications.append(match_request)
        
        return auto_applications
        
    except MatchCriteria.DoesNotExist:
        return []


def get_match_statistics(user):
    """Obtiene estadísticas de matching para un usuario."""
    
    if user.user_type == 'tenant':
        # Estadísticas para arrendatario
        sent_requests = MatchRequest.objects.filter(tenant=user)
        
        stats = {
            'total_sent': sent_requests.count(),
            'pending': sent_requests.filter(status='pending').count(),
            'viewed': sent_requests.filter(status='viewed').count(),
            'accepted': sent_requests.filter(status='accepted').count(),
            'rejected': sent_requests.filter(status='rejected').count(),
            'expired': sent_requests.filter(status='expired').count(),
            'response_rate': 0,
            'acceptance_rate': 0,
            'avg_response_time': 0
        }
        
        total_responded = stats['accepted'] + stats['rejected']
        if stats['total_sent'] > 0:
            stats['response_rate'] = round((total_responded / stats['total_sent']) * 100, 1)
        
        if total_responded > 0:
            stats['acceptance_rate'] = round((stats['accepted'] / total_responded) * 100, 1)
        
        # Tiempo promedio de respuesta
        responded_requests = sent_requests.filter(responded_at__isnull=False)
        if responded_requests.exists():
            total_time = sum([
                (req.responded_at - req.created_at).total_seconds() / 3600
                for req in responded_requests
            ])
            stats['avg_response_time'] = round(total_time / responded_requests.count(), 1)
    
    elif user.user_type == 'landlord':
        # Estadísticas para arrendador
        received_requests = MatchRequest.objects.filter(landlord=user)
        
        stats = {
            'total_received': received_requests.count(),
            'pending': received_requests.filter(status='pending').count(),
            'viewed': received_requests.filter(status='viewed').count(),
            'accepted': received_requests.filter(status='accepted').count(),
            'rejected': received_requests.filter(status='rejected').count(),
            'expired': received_requests.filter(status='expired').count(),
            'response_rate': 0,
            'acceptance_rate': 0,
            'avg_response_time': 0
        }
        
        total_responded = stats['accepted'] + stats['rejected']
        if stats['total_received'] > 0:
            stats['response_rate'] = round((total_responded / stats['total_received']) * 100, 1)
        
        if total_responded > 0:
            stats['acceptance_rate'] = round((stats['accepted'] / total_responded) * 100, 1)
        
        # Tiempo promedio de respuesta
        responded_requests = received_requests.filter(responded_at__isnull=False)
        if responded_requests.exists():
            total_time = sum([
                (req.responded_at - req.created_at).total_seconds() / 3600
                for req in responded_requests
            ])
            stats['avg_response_time'] = round(total_time / responded_requests.count(), 1)
    
    else:
        stats = {}
    
    return stats