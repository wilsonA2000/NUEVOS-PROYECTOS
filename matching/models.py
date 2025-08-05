"""
Modelos para el sistema de matching entre arrendadores y arrendatarios de VeriHome.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()


class MatchRequest(models.Model):
    """Solicitudes de match entre arrendatarios y propiedades."""
    
    MATCH_STATUS = [
        ('pending', 'Pendiente'),
        ('viewed', 'Vista por Arrendador'),
        ('accepted', 'Aceptada'),
        ('rejected', 'Rechazada'),
        ('expired', 'Expirada'),
        ('cancelled', 'Cancelada'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Baja'),
        ('medium', 'Media'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),
    ]
    
    # IDs
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match_code = models.CharField('Código de Match', max_length=12, unique=True, editable=False)
    
    # Relaciones principales
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='match_requests',
        verbose_name='Propiedad'
    )
    tenant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='match_requests_sent',
        verbose_name='Arrendatario'
    )
    landlord = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='match_requests_received',
        verbose_name='Arrendador'
    )
    
    # Estado del match
    status = models.CharField('Estado', max_length=20, choices=MATCH_STATUS, default='pending')
    priority = models.CharField('Prioridad', max_length=10, choices=PRIORITY_LEVELS, default='medium')
    
    # Información del arrendatario
    tenant_message = models.TextField(
        'Mensaje del arrendatario',
        max_length=1000,
        help_text='Mensaje personalizado del arrendatario al arrendador'
    )
    tenant_phone = models.CharField('Teléfono de contacto', max_length=15, blank=True)
    tenant_email = models.EmailField('Email de contacto', blank=True)
    
    # Información financiera del interesado
    monthly_income = models.DecimalField(
        'Ingresos mensuales',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    employment_type = models.CharField(
        'Tipo de empleo',
        max_length=50,
        choices=[
            ('employed', 'Empleado'),
            ('self_employed', 'Independiente'),
            ('freelancer', 'Freelancer'),
            ('student', 'Estudiante'),
            ('retired', 'Pensionado'),
            ('unemployed', 'Desempleado'),
            ('other', 'Otro')
        ],
        blank=True
    )
    
    # Preferencias específicas
    preferred_move_in_date = models.DateField('Fecha preferida de mudanza', null=True, blank=True)
    lease_duration_months = models.PositiveIntegerField(
        'Duración deseada del contrato (meses)',
        default=12,
        validators=[MinValueValidator(1), MaxValueValidator(60)]
    )
    
    # Referencias del arrendatario
    has_rental_references = models.BooleanField('Tiene referencias de alquiler', default=False)
    has_employment_proof = models.BooleanField('Tiene comprobante de ingresos', default=False)
    has_credit_check = models.BooleanField('Autoriza verificación crediticia', default=False)
    
    # Información adicional
    number_of_occupants = models.PositiveIntegerField('Número de ocupantes', default=1)
    has_pets = models.BooleanField('Tiene mascotas', default=False)
    pet_details = models.TextField('Detalles de mascotas', max_length=500, blank=True)
    smoking_allowed = models.BooleanField('Fumador', default=False)
    
    # Respuesta del arrendador
    landlord_response = models.TextField('Respuesta del arrendador', max_length=1000, blank=True)
    landlord_notes = models.TextField('Notas privadas del arrendador', max_length=500, blank=True)
    
    # Fechas importantes
    created_at = models.DateTimeField('Fecha de solicitud', auto_now_add=True)
    viewed_at = models.DateTimeField('Vista por arrendador', null=True, blank=True)
    responded_at = models.DateTimeField('Fecha de respuesta', null=True, blank=True)
    expires_at = models.DateTimeField('Fecha de expiración', null=True, blank=True)
    
    # Seguimiento
    follow_up_count = models.PositiveIntegerField('Número de seguimientos', default=0)
    last_follow_up = models.DateTimeField('Último seguimiento', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Solicitud de Match'
        verbose_name_plural = 'Solicitudes de Match'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['landlord', 'status']),
            models.Index(fields=['tenant', 'created_at']),
        ]
    
    def __str__(self):
        return f"Match {self.match_code} - {self.tenant.get_full_name()} → {self.property.title}"
    
    def save(self, *args, **kwargs):
        if not self.match_code:
            self.match_code = self.generate_match_code()
        
        if not self.expires_at and self.status == 'pending':
            # Expira en 7 días
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        
        # Auto-llenar datos de contacto si están vacíos
        if not self.tenant_email:
            self.tenant_email = self.tenant.email
        
        super().save(*args, **kwargs)
    
    def generate_match_code(self):
        """Genera un código único para el match."""
        import random
        import string
        
        while True:
            code = 'MT-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            if not MatchRequest.objects.filter(match_code=code).exists():
                return code
    
    def mark_as_viewed(self):
        """Marca la solicitud como vista por el arrendador."""
        if self.status == 'pending':
            self.status = 'viewed'
            self.viewed_at = timezone.now()
            self.save()
    
    def accept_match(self, landlord_message=''):
        """Acepta la solicitud de match."""
        self.status = 'accepted'
        self.responded_at = timezone.now()
        self.landlord_response = landlord_message
        self.save()
        
        # Integrar con sistema de mensajería
        from .services import MatchingMessagingService
        MatchingMessagingService.create_match_thread(self)
    
    def reject_match(self, landlord_message=''):
        """Rechaza la solicitud de match."""
        self.status = 'rejected'
        self.responded_at = timezone.now()
        self.landlord_response = landlord_message
        self.save()
        
        # Enviar notificación de rechazo
        from .services import MatchingMessagingService
        MatchingMessagingService.send_match_rejection_message(self)
    
    def is_expired(self):
        """Verifica si la solicitud ha expirado."""
        return self.expires_at and timezone.now() > self.expires_at
    
    def can_follow_up(self):
        """Verifica si se puede hacer seguimiento."""
        if self.status not in ['pending', 'viewed']:
            return False
        
        if not self.last_follow_up:
            return True
        
        # Permitir seguimiento cada 2 días
        return timezone.now() > self.last_follow_up + timezone.timedelta(days=2)
    
    def create_notification(self, notification_type):
        """Crea una notificación relacionada con el match."""
        from .utils import create_match_notification
        create_match_notification(self, notification_type)
    
    def get_compatibility_score(self):
        """Calcula un puntaje de compatibilidad básico."""
        score = 0
        
        # Verificación de ingresos (30 puntos)
        if self.monthly_income and self.property.rent_price:
            income_ratio = float(self.monthly_income) / float(self.property.rent_price)
            if income_ratio >= 3:
                score += 30
            elif income_ratio >= 2.5:
                score += 20
            elif income_ratio >= 2:
                score += 10
        
        # Referencias y documentos (25 puntos)
        if self.has_rental_references:
            score += 10
        if self.has_employment_proof:
            score += 10
        if self.has_credit_check:
            score += 5
        
        # Mascotas compatibilidad (15 puntos)
        if self.has_pets == self.property.pets_allowed:
            score += 15
        elif not self.has_pets:
            score += 10
        
        # Fumador compatibilidad (10 puntos)
        if self.smoking_allowed == getattr(self.property, 'smoking_allowed', False):
            score += 10
        elif not self.smoking_allowed:
            score += 5
        
        # Duración del contrato (10 puntos)
        if 6 <= self.lease_duration_months <= 24:
            score += 10
        
        # Mensaje personalizado (10 puntos)
        if len(self.tenant_message) > 100:
            score += 10
        elif len(self.tenant_message) > 50:
            score += 5
        
        return min(score, 100)  # Máximo 100 puntos


class MatchCriteria(models.Model):
    """Criterios de búsqueda y matching para arrendatarios."""
    
    tenant = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='match_criteria',
        verbose_name='Arrendatario'
    )
    
    # Criterios de ubicación
    preferred_cities = models.JSONField(
        'Ciudades preferidas',
        default=list,
        blank=True,
        help_text='Lista de ciudades donde busca propiedad'
    )
    max_distance_km = models.PositiveIntegerField(
        'Distancia máxima (km)',
        default=10,
        help_text='Distancia máxima desde puntos de interés'
    )
    
    # Criterios financieros
    min_price = models.DecimalField(
        'Precio mínimo',
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    max_price = models.DecimalField(
        'Precio máximo',
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Criterios de propiedad
    property_types = models.JSONField(
        'Tipos de propiedad',
        default=list,
        blank=True,
        help_text='Tipos de propiedad de interés'
    )
    min_bedrooms = models.PositiveIntegerField('Mínimo dormitorios', default=1)
    min_bathrooms = models.PositiveIntegerField('Mínimo baños', default=1)
    min_area = models.PositiveIntegerField('Área mínima (m²)', null=True, blank=True)
    
    # Amenidades requeridas
    required_amenities = models.JSONField(
        'Amenidades requeridas',
        default=list,
        blank=True,
        help_text='Amenidades que debe tener la propiedad'
    )
    
    # Preferencias especiales
    pets_required = models.BooleanField('Requiere que permitan mascotas', default=False)
    smoking_required = models.BooleanField('Requiere que permitan fumar', default=False)
    furnished_required = models.BooleanField('Requiere amueblado', default=False)
    parking_required = models.BooleanField('Requiere estacionamiento', default=False)
    
    # Configuración de notificaciones
    auto_apply_enabled = models.BooleanField('Auto-aplicar a matches', default=False)
    notification_frequency = models.CharField(
        'Frecuencia de notificaciones',
        max_length=20,
        choices=[
            ('immediate', 'Inmediata'),
            ('daily', 'Diaria'),
            ('weekly', 'Semanal'),
            ('monthly', 'Mensual')
        ],
        default='daily'
    )
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    last_search = models.DateTimeField('Última búsqueda', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Criterio de Match'
        verbose_name_plural = 'Criterios de Match'
    
    def __str__(self):
        return f"Criterios de {self.tenant.get_full_name()}"
    
    def find_matching_properties(self):
        """Encuentra propiedades que coinciden con los criterios."""
        from properties.models import Property
        
        queryset = Property.objects.filter(
            is_active=True,
            status='available'
        )
        
        # Filtrar por precio
        if self.min_price:
            queryset = queryset.filter(rent_price__gte=self.min_price)
        if self.max_price:
            queryset = queryset.filter(rent_price__lte=self.max_price)
        
        # Filtrar por tipo de propiedad
        if self.property_types:
            queryset = queryset.filter(property_type__in=self.property_types)
        
        # Filtrar por características
        if self.min_bedrooms:
            queryset = queryset.filter(bedrooms__gte=self.min_bedrooms)
        if self.min_bathrooms:
            queryset = queryset.filter(bathrooms__gte=self.min_bathrooms)
        if self.min_area:
            queryset = queryset.filter(total_area__gte=self.min_area)
        
        # Filtrar por ciudades
        if self.preferred_cities:
            queryset = queryset.filter(city__in=self.preferred_cities)
        
        # Filtrar por preferencias especiales
        if self.pets_required:
            queryset = queryset.filter(pets_allowed=True)
        if self.parking_required:
            queryset = queryset.filter(parking_spaces__gt=0)
        
        return queryset
    
    def get_match_score(self, property):
        """Calcula el puntaje de match para una propiedad específica."""
        score = 0
        
        # Precio (30 puntos)
        if self.max_price and property.rent_price <= self.max_price:
            price_ratio = float(property.rent_price) / float(self.max_price)
            score += int(30 * (1 - price_ratio))
        
        # Ubicación (25 puntos)
        if property.city in self.preferred_cities:
            score += 25
        
        # Características (20 puntos)
        if property.bedrooms >= self.min_bedrooms:
            score += 7
        if property.bathrooms >= self.min_bathrooms:
            score += 7
        if not self.min_area or property.total_area >= self.min_area:
            score += 6
        
        # Amenidades (15 puntos)
        if self.required_amenities:
            property_amenities = property.amenities.values_list('name', flat=True)
            matching_amenities = len(set(self.required_amenities) & set(property_amenities))
            score += int(15 * matching_amenities / len(self.required_amenities))
        
        # Preferencias especiales (10 puntos)
        special_score = 0
        if self.pets_required and property.pets_allowed:
            special_score += 3
        if self.parking_required and property.parking_spaces > 0:
            special_score += 3
        if self.furnished_required and getattr(property, 'is_furnished', False):
            special_score += 4
        score += special_score
        
        return min(score, 100)


class MatchNotification(models.Model):
    """Notificaciones relacionadas con el sistema de matching."""
    
    NOTIFICATION_TYPES = [
        ('new_match_found', 'Nuevo Match Encontrado'),
        ('match_request_received', 'Solicitud de Match Recibida'),
        ('match_accepted', 'Match Aceptado'),
        ('match_rejected', 'Match Rechazado'),
        ('match_expired', 'Match Expirado'),
        ('follow_up_reminder', 'Recordatorio de Seguimiento'),
        ('criteria_updated', 'Criterios Actualizados'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relaciones
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='match_notifications',
        verbose_name='Usuario'
    )
    match_request = models.ForeignKey(
        MatchRequest,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Solicitud de Match',
        null=True,
        blank=True
    )
    
    # Contenido
    notification_type = models.CharField('Tipo', max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField('Título', max_length=200)
    message = models.TextField('Mensaje', max_length=1000)
    
    # Estado
    is_read = models.BooleanField('Leída', default=False)
    is_sent = models.BooleanField('Enviada', default=False)
    
    # Metadatos
    metadata = models.JSONField('Metadatos', default=dict, blank=True)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    read_at = models.DateTimeField('Fecha de lectura', null=True, blank=True)
    sent_at = models.DateTimeField('Fecha de envío', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Notificación de Match'
        verbose_name_plural = 'Notificaciones de Match'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
            models.Index(fields=['notification_type', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.user.get_full_name()}"
    
    def mark_as_read(self):
        """Marca la notificación como leída."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
    
    def mark_as_sent(self):
        """Marca la notificación como enviada."""
        if not self.is_sent:
            self.is_sent = True
            self.sent_at = timezone.now()
            self.save()


class MatchAnalytics(models.Model):
    """Analíticas del sistema de matching."""
    
    date = models.DateField('Fecha', unique=True)
    
    # Métricas de solicitudes
    total_requests_created = models.PositiveIntegerField('Solicitudes creadas', default=0)
    total_requests_viewed = models.PositiveIntegerField('Solicitudes vistas', default=0)
    total_requests_accepted = models.PositiveIntegerField('Solicitudes aceptadas', default=0)
    total_requests_rejected = models.PositiveIntegerField('Solicitudes rechazadas', default=0)
    
    # Métricas de conversión
    view_rate = models.FloatField('Tasa de visualización', default=0.0)
    acceptance_rate = models.FloatField('Tasa de aceptación', default=0.0)
    response_rate = models.FloatField('Tasa de respuesta', default=0.0)
    
    # Métricas de tiempo
    avg_response_time_hours = models.FloatField('Tiempo promedio de respuesta (horas)', default=0.0)
    avg_match_score = models.FloatField('Puntaje promedio de match', default=0.0)
    
    # Metadatos
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Analítica de Match'
        verbose_name_plural = 'Analíticas de Match'
        ordering = ['-date']
    
    def __str__(self):
        return f"Analíticas {self.date}"
    
    @classmethod
    def calculate_daily_analytics(cls, date=None):
        """Calcula las analíticas para un día específico."""
        if not date:
            date = timezone.now().date()
        
        requests = MatchRequest.objects.filter(created_at__date=date)
        
        total_created = requests.count()
        total_viewed = requests.filter(status__in=['viewed', 'accepted', 'rejected']).count()
        total_accepted = requests.filter(status='accepted').count()
        total_rejected = requests.filter(status='rejected').count()
        
        view_rate = (total_viewed / total_created * 100) if total_created > 0 else 0
        acceptance_rate = (total_accepted / total_viewed * 100) if total_viewed > 0 else 0
        response_rate = ((total_accepted + total_rejected) / total_created * 100) if total_created > 0 else 0
        
        # Calcular tiempo promedio de respuesta
        responded_requests = requests.filter(responded_at__isnull=False)
        if responded_requests.exists():
            total_response_time = sum([
                (req.responded_at - req.created_at).total_seconds() / 3600 
                for req in responded_requests
            ])
            avg_response_time = total_response_time / responded_requests.count()
        else:
            avg_response_time = 0
        
        # Calcular puntaje promedio
        scores = [req.get_compatibility_score() for req in requests]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        analytics, created = cls.objects.get_or_create(
            date=date,
            defaults={
                'total_requests_created': total_created,
                'total_requests_viewed': total_viewed,
                'total_requests_accepted': total_accepted,
                'total_requests_rejected': total_rejected,
                'view_rate': view_rate,
                'acceptance_rate': acceptance_rate,
                'response_rate': response_rate,
                'avg_response_time_hours': avg_response_time,
                'avg_match_score': avg_score,
            }
        )
        
        if not created:
            # Actualizar si ya existe
            analytics.total_requests_created = total_created
            analytics.total_requests_viewed = total_viewed
            analytics.total_requests_accepted = total_accepted
            analytics.total_requests_rejected = total_rejected
            analytics.view_rate = view_rate
            analytics.acceptance_rate = acceptance_rate
            analytics.response_rate = response_rate
            analytics.avg_response_time_hours = avg_response_time
            analytics.avg_match_score = avg_score
            analytics.save()
        
        return analytics