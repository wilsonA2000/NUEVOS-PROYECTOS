"""
Sistema de calificaciones y reseñas para VeriHome.
Permite calificaciones entre usuarios relacionados contractualmente.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid

User = get_user_model()


class Rating(models.Model):
    """Calificaciones entre usuarios en la plataforma."""
    
    RATING_TYPES = [
        ('landlord_to_tenant', 'Arrendador a Arrendatario'),
        ('tenant_to_landlord', 'Arrendatario a Arrendador'),
        ('client_to_service_provider', 'Cliente a Prestador de Servicios'),
        ('service_provider_to_client', 'Prestador de Servicios a Cliente'),
        ('general', 'General'),
    ]
    
    RATING_CATEGORIES = [
        ('communication', 'Comunicación'),
        ('reliability', 'Confiabilidad'),
        ('cleanliness', 'Limpieza'),
        ('punctuality', 'Puntualidad'),
        ('professionalism', 'Profesionalismo'),
        ('property_condition', 'Estado de la Propiedad'),
        ('payment_timeliness', 'Puntualidad de Pagos'),
        ('responsiveness', 'Capacidad de Respuesta'),
        ('overall', 'Calificación General'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Partes involucradas
    reviewer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ratings_given'
    )
    reviewee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ratings_received'
    )
    
    # Información de la calificación
    rating_type = models.CharField('Tipo de calificación', max_length=30, choices=RATING_TYPES)
    overall_rating = models.PositiveIntegerField(
        'Calificación general',
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text='Escala de 1 a 10 estrellas'
    )
    
    # Referencias relacionadas
    contract = models.ForeignKey(
        'contracts.Contract',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ratings'
    )
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ratings'
    )
    
    # Contenido de la reseña
    title = models.CharField('Título de la reseña', max_length=200, blank=True)
    review_text = models.TextField('Comentarios', max_length=2000, blank=True)
    
    # Configuración
    is_anonymous = models.BooleanField('Reseña anónima', default=False)
    is_public = models.BooleanField('Reseña pública', default=True)
    is_verified = models.BooleanField('Reseña verificada', default=False)
    
    # Estado
    is_active = models.BooleanField('Activa', default=True)
    is_flagged = models.BooleanField('Marcada para revisión', default=False)
    moderation_status = models.CharField(
        'Estado de moderación',
        max_length=20,
        choices=[
            ('pending', 'Pendiente'),
            ('approved', 'Aprobada'),
            ('rejected', 'Rechazada'),
        ],
        default='pending'
    )
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    verified_at = models.DateTimeField('Fecha de verificación', null=True, blank=True)
    
    # Metadatos
    ip_address = models.GenericIPAddressField('Dirección IP', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Calificación'
        verbose_name_plural = 'Calificaciones'
        unique_together = ['reviewer', 'reviewee', 'contract']
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Calificación de {self.reviewer.get_full_name()} a {self.reviewee.get_full_name()} - {self.overall_rating}/10"
    
    def save(self, *args, **kwargs):
        # Verificar que el revisor y el evaluado no sean la misma persona
        if self.reviewer == self.reviewee:
            raise ValueError("Un usuario no puede calificarse a sí mismo")
        
        # Verificar relación contractual si es necesario
        if self.contract and not self.can_rate():
            raise ValueError("No hay relación contractual válida para esta calificación")
        
        super().save(*args, **kwargs)
    
    def can_rate(self):
        """Verifica si el usuario puede calificar basado en relaciones contractuales."""
        if not self.contract:
            return True  # Para calificaciones generales
        
        # Verificar que ambas partes estén relacionadas con el contrato
        contract_parties = [self.contract.primary_party, self.contract.secondary_party]
        return self.reviewer in contract_parties and self.reviewee in contract_parties
    
    def get_stars_display(self):
        """Devuelve la representación visual de las estrellas."""
        full_stars = self.overall_rating
        return '★' * full_stars + '☆' * (10 - full_stars)


class RatingCategory(models.Model):
    """Calificaciones específicas por categoría."""
    
    rating = models.ForeignKey(
        Rating,
        on_delete=models.CASCADE,
        related_name='category_ratings'
    )
    category = models.CharField('Categoría', max_length=30, choices=Rating.RATING_CATEGORIES)
    score = models.PositiveIntegerField(
        'Puntuación',
        validators=[MinValueValidator(1), MaxValueValidator(10)]
    )
    notes = models.TextField('Notas específicas', max_length=500, blank=True)
    
    class Meta:
        verbose_name = 'Calificación por Categoría'
        verbose_name_plural = 'Calificaciones por Categorías'
        unique_together = ['rating', 'category']
        
    def __str__(self):
        return f"{self.get_category_display()}: {self.score}/10"


class RatingResponse(models.Model):
    """Respuestas a las calificaciones."""
    
    rating = models.OneToOneField(
        Rating,
        on_delete=models.CASCADE,
        related_name='response'
    )
    responder = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='rating_responses'
    )
    
    # Contenido de la respuesta
    response_text = models.TextField('Respuesta', max_length=1500)
    
    # Estado
    is_public = models.BooleanField('Respuesta pública', default=True)
    is_flagged = models.BooleanField('Marcada para revisión', default=False)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Fecha de actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Respuesta a Calificación'
        verbose_name_plural = 'Respuestas a Calificaciones'
        
    def __str__(self):
        return f"Respuesta de {self.responder.get_full_name()} a calificación"


class RatingReport(models.Model):
    """Reportes de calificaciones inapropiadas."""
    
    REPORT_REASONS = [
        ('fake', 'Calificación Falsa'),
        ('spam', 'Spam'),
        ('inappropriate', 'Contenido Inapropiado'),
        ('personal_attack', 'Ataque Personal'),
        ('discriminatory', 'Contenido Discriminatorio'),
        ('off_topic', 'Fuera de Tema'),
        ('other', 'Otro'),
    ]
    
    REPORT_STATUS = [
        ('pending', 'Pendiente'),
        ('under_review', 'En Revisión'),
        ('resolved', 'Resuelto'),
        ('dismissed', 'Desestimado'),
    ]
    
    rating = models.ForeignKey(
        Rating,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='rating_reports_made'
    )
    
    # Información del reporte
    reason = models.CharField('Razón del reporte', max_length=20, choices=REPORT_REASONS)
    description = models.TextField('Descripción detallada', max_length=1000)
    
    # Estado del reporte
    status = models.CharField('Estado', max_length=20, choices=REPORT_STATUS, default='pending')
    
    # Moderación
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='rating_reports_reviewed'
    )
    resolution_notes = models.TextField('Notas de resolución', max_length=1000, blank=True)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de reporte', auto_now_add=True)
    reviewed_at = models.DateTimeField('Fecha de revisión', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Reporte de Calificación'
        verbose_name_plural = 'Reportes de Calificaciones'
        unique_together = ['rating', 'reporter']
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Reporte de {self.reporter.get_full_name()} - {self.get_reason_display()}"


class UserRatingProfile(models.Model):
    """Perfil de calificaciones agregadas de un usuario."""
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='rating_profile'
    )
    
    # Estadísticas generales
    total_ratings_received = models.PositiveIntegerField('Total de calificaciones recibidas', default=0)
    average_rating = models.DecimalField('Calificación promedio', max_digits=3, decimal_places=2, default=0.00)
    
    # Distribución de calificaciones (1-10 estrellas)
    ratings_distribution = models.JSONField(
        'Distribución de calificaciones',
        default=dict,
        help_text='Conteo de calificaciones por número de estrellas'
    )
    
    # Calificaciones por categoría
    category_averages = models.JSONField(
        'Promedios por categoría',
        default=dict,
        help_text='Promedio de calificaciones por categoría'
    )
    
    # Badges y reconocimientos
    badges = models.JSONField(
        'Badges obtenidos',
        default=list,
        help_text='Lista de badges basados en calificaciones'
    )
    
    # Estadísticas por tipo de usuario
    landlord_rating = models.DecimalField('Calificación como arrendador', max_digits=3, decimal_places=2, null=True, blank=True)
    tenant_rating = models.DecimalField('Calificación como arrendatario', max_digits=3, decimal_places=2, null=True, blank=True)
    service_provider_rating = models.DecimalField('Calificación como prestador de servicios', max_digits=3, decimal_places=2, null=True, blank=True)
    
    # Fechas
    last_updated = models.DateTimeField('Última actualización', auto_now=True)
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    
    class Meta:
        verbose_name = 'Perfil de Calificaciones'
        verbose_name_plural = 'Perfiles de Calificaciones'
        
    def __str__(self):
        return f"Perfil de calificaciones - {self.user.get_full_name()}"
    
    def update_statistics(self):
        """Actualiza las estadísticas del perfil."""
        received_ratings = Rating.objects.filter(
            reviewee=self.user,
            is_active=True,
            moderation_status='approved'
        )
        
        self.total_ratings_received = received_ratings.count()
        
        if self.total_ratings_received > 0:
            # Calcular promedio general
            total_score = sum(rating.overall_rating for rating in received_ratings)
            self.average_rating = total_score / self.total_ratings_received
            
            # Actualizar distribución
            distribution = {}
            for i in range(1, 11):
                distribution[str(i)] = received_ratings.filter(overall_rating=i).count()
            self.distribution = distribution
            
            # Actualizar promedios por categoría
            category_averages = {}
            for category_code, category_name in Rating.RATING_CATEGORIES:
                category_ratings = RatingCategory.objects.filter(
                    rating__reviewee=self.user,
                    rating__is_active=True,
                    rating__moderation_status='approved',
                    category=category_code
                )
                if category_ratings.exists():
                    avg_score = sum(cr.score for cr in category_ratings) / category_ratings.count()
                    category_averages[category_code] = round(avg_score, 2)
            
            self.category_averages = category_averages
            
            # Actualizar badges
            self.update_badges()
        
        self.save()
    
    def update_badges(self):
        """Actualiza los badges basados en las calificaciones."""
        badges = []
        
        if self.average_rating >= 9.0:
            badges.append('excellent_service')
        elif self.average_rating >= 8.0:
            badges.append('great_service')
        elif self.average_rating >= 7.0:
            badges.append('good_service')
        
        if self.total_ratings_received >= 50:
            badges.append('experienced')
        elif self.total_ratings_received >= 20:
            badges.append('established')
        elif self.total_ratings_received >= 5:
            badges.append('trusted')
        
        # Badges específicos por categoría
        for category, average in self.category_averages.items():
            if average >= 9.0:
                badges.append(f'{category}_expert')
        
        self.badges = badges
    
    def get_badge_display(self):
        """Devuelve los badges en formato legible."""
        badge_names = {
            'excellent_service': 'Servicio Excelente',
            'great_service': 'Gran Servicio',
            'good_service': 'Buen Servicio',
            'experienced': 'Experimentado',
            'established': 'Establecido',
            'trusted': 'Confiable',
            'communication_expert': 'Experto en Comunicación',
            'reliability_expert': 'Experto en Confiabilidad',
            'cleanliness_expert': 'Experto en Limpieza',
            'punctuality_expert': 'Experto en Puntualidad',
            'professionalism_expert': 'Experto en Profesionalismo',
        }
        
        return [badge_names.get(badge, badge) for badge in self.badges]


class RatingInvitation(models.Model):
    """Invitaciones para calificar después de completar un contrato."""
    
    INVITATION_STATUS = [
        ('pending', 'Pendiente'),
        ('sent', 'Enviada'),
        ('completed', 'Completada'),
        ('expired', 'Expirada'),
        ('declined', 'Declinada'),
    ]
    
    contract = models.ForeignKey(
        'contracts.Contract',
        on_delete=models.CASCADE,
        related_name='rating_invitations'
    )
    inviter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='rating_invitations_sent'
    )
    invitee = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='rating_invitations_received'
    )
    
    # Estado de la invitación
    status = models.CharField('Estado', max_length=20, choices=INVITATION_STATUS, default='pending')
    
    # Calificación resultante
    resulting_rating = models.OneToOneField(
        Rating,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invitation'
    )
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    sent_at = models.DateTimeField('Fecha de envío', null=True, blank=True)
    expires_at = models.DateTimeField('Fecha de expiración', null=True, blank=True)
    completed_at = models.DateTimeField('Fecha de completado', null=True, blank=True)
    
    # Token de seguridad para el enlace
    invitation_token = models.CharField('Token de invitación', max_length=100, unique=True)
    
    class Meta:
        verbose_name = 'Invitación de Calificación'
        verbose_name_plural = 'Invitaciones de Calificación'
        unique_together = ['contract', 'inviter', 'invitee']
        ordering = ['-created_at']
        
    def __str__(self):
        return f"Invitación de {self.inviter.get_full_name()} a {self.invitee.get_full_name()}"
    
    def is_expired(self):
        """Verifica si la invitación ha expirado."""
        return self.expires_at and self.expires_at < timezone.now()
    
    def save(self, *args, **kwargs):
        # Generar token único si no existe
        if not self.invitation_token:
            self.invitation_token = str(uuid.uuid4()).replace('-', '')
        
        super().save(*args, **kwargs)
