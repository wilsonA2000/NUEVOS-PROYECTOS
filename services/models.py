"""
Modelos para el sistema de servicios adicionales de VeriHome.
Administrable desde el panel de Django Admin.
"""

import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.text import slugify
from django.urls import reverse


class ServiceCategory(models.Model):
    """Categorías principales de servicios."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, verbose_name="Nombre de la Categoría")
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(verbose_name="Descripción", blank=True)
    icon_name = models.CharField(
        max_length=50, 
        verbose_name="Icono (Material-UI)",
        help_text="Nombre del icono de Material-UI (ej: 'Build', 'AccountBalance', 'Security')",
        default="Build"
    )
    color = models.CharField(
        max_length=7,
        verbose_name="Color",
        help_text="Color hexadecimal (ej: #2196F3)",
        default="#2196F3"
    )
    order = models.PositiveIntegerField(
        verbose_name="Orden de visualización",
        default=0,
        help_text="Menor número aparece primero"
    )
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    is_featured = models.BooleanField(default=False, verbose_name="Destacado")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Categoría de Servicio"
        verbose_name_plural = "Categorías de Servicios"
        ordering = ['order', 'name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Service(models.Model):
    """Servicios específicos dentro de cada categoría."""
    
    DIFFICULTY_CHOICES = [
        ('easy', 'Fácil'),
        ('medium', 'Medio'),
        ('hard', 'Difícil'),
        ('expert', 'Experto'),
    ]
    
    PRICING_TYPE_CHOICES = [
        ('fixed', 'Precio Fijo'),
        ('hourly', 'Por Hora'),
        ('consultation', 'Consulta'),
        ('quote', 'Bajo Cotización'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    category = models.ForeignKey(
        ServiceCategory, 
        on_delete=models.CASCADE, 
        related_name='services',
        verbose_name="Categoría"
    )
    name = models.CharField(max_length=150, verbose_name="Nombre del Servicio")
    slug = models.SlugField(max_length=180, unique=True, blank=True)
    short_description = models.CharField(
        max_length=200, 
        verbose_name="Descripción Corta",
        help_text="Descripción breve para las tarjetas"
    )
    full_description = models.TextField(
        verbose_name="Descripción Completa",
        help_text="Descripción detallada del servicio"
    )
    
    # Información de precios
    pricing_type = models.CharField(
        max_length=20, 
        choices=PRICING_TYPE_CHOICES,
        default='quote',
        verbose_name="Tipo de Precio"
    )
    base_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Precio Base",
        help_text="Precio en COP (opcional)"
    )
    price_range_min = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Precio Mínimo"
    )
    price_range_max = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True,
        verbose_name="Precio Máximo"
    )
    
    # Características del servicio
    difficulty = models.CharField(
        max_length=20,
        choices=DIFFICULTY_CHOICES,
        default='medium',
        verbose_name="Dificultad"
    )
    estimated_duration = models.CharField(
        max_length=100,
        verbose_name="Duración Estimada",
        help_text="Ej: '2-4 horas', '1 día', '1-2 semanas'",
        blank=True
    )
    requirements = models.TextField(
        verbose_name="Requisitos",
        help_text="Que necesita el cliente para este servicio",
        blank=True
    )
    
    # Información del proveedor
    provider_info = models.TextField(
        verbose_name="Información del Proveedor",
        help_text="Información sobre quien ofrece este servicio",
        blank=True
    )
    contact_email = models.EmailField(
        verbose_name="Email de Contacto",
        blank=True
    )
    contact_phone = models.CharField(
        max_length=20,
        verbose_name="Teléfono de Contacto",
        blank=True
    )
    
    # Métricas y estado
    popularity_score = models.PositiveIntegerField(
        default=0,
        verbose_name="Puntuación de Popularidad",
        help_text="Mayor número = más popular"
    )
    views_count = models.PositiveIntegerField(default=0, verbose_name="Vistas")
    requests_count = models.PositiveIntegerField(default=0, verbose_name="Solicitudes")
    
    # Estados
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    is_featured = models.BooleanField(default=False, verbose_name="Destacado")
    is_most_requested = models.BooleanField(default=False, verbose_name="Más Solicitado")
    
    # Fechas
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Servicio"
        verbose_name_plural = "Servicios"
        ordering = ['-popularity_score', '-is_featured', '-is_most_requested', 'name']
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['is_featured', 'is_active']),
            models.Index(fields=['is_most_requested', 'is_active']),
            models.Index(fields=['popularity_score']),
        ]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(f"{self.category.name}-{self.name}")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.category.name} - {self.name}"

    def get_price_display(self):
        """Retorna el precio formateado para mostrar."""
        if self.pricing_type == 'fixed' and self.base_price:
            return f"${self.base_price:,.0f} COP"
        elif self.pricing_type == 'hourly' and self.base_price:
            return f"${self.base_price:,.0f} COP/hora"
        elif self.price_range_min and self.price_range_max:
            return f"${self.price_range_min:,.0f} - ${self.price_range_max:,.0f} COP"
        elif self.pricing_type == 'consultation':
            return "Consulta disponible"
        else:
            return "Precio bajo cotización"

    def increment_views(self):
        """Incrementa el contador de vistas."""
        self.views_count += 1
        self.save(update_fields=['views_count'])

    def increment_requests(self):
        """Incrementa el contador de solicitudes."""
        self.requests_count += 1
        self.save(update_fields=['requests_count'])


class ServiceImage(models.Model):
    """Imágenes para los servicios."""
    
    service = models.ForeignKey(
        Service, 
        on_delete=models.CASCADE, 
        related_name='images',
        verbose_name="Servicio"
    )
    image = models.ImageField(
        upload_to='services/images/',
        verbose_name="Imagen"
    )
    alt_text = models.CharField(
        max_length=200,
        verbose_name="Texto Alternativo",
        blank=True
    )
    is_main = models.BooleanField(default=False, verbose_name="Imagen Principal")
    order = models.PositiveIntegerField(default=0, verbose_name="Orden")

    class Meta:
        verbose_name = "Imagen de Servicio"
        verbose_name_plural = "Imágenes de Servicios"
        ordering = ['-is_main', 'order']

    def __str__(self):
        return f"Imagen de {self.service.name}"


class ServiceRequest(models.Model):
    """Solicitudes de servicios por parte de usuarios."""
    
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('contacted', 'Contactado'),
        ('in_progress', 'En Progreso'),
        ('completed', 'Completado'),
        ('cancelled', 'Cancelado'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service = models.ForeignKey(
        Service, 
        on_delete=models.CASCADE, 
        related_name='service_requests',
        verbose_name="Servicio"
    )
    requester_name = models.CharField(max_length=100, verbose_name="Nombre")
    requester_email = models.EmailField(verbose_name="Email")
    requester_phone = models.CharField(max_length=20, verbose_name="Teléfono")
    message = models.TextField(
        verbose_name="Mensaje",
        help_text="Detalles de lo que necesita"
    )
    preferred_date = models.DateField(
        null=True, 
        blank=True,
        verbose_name="Fecha Preferida"
    )
    budget_range = models.CharField(
        max_length=100,
        verbose_name="Presupuesto Estimado",
        blank=True
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Estado"
    )
    admin_notes = models.TextField(
        verbose_name="Notas del Administrador",
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Solicitud de Servicio"
        verbose_name_plural = "Solicitudes de Servicios"
        ordering = ['-created_at']

    def __str__(self):
        return f"Solicitud: {self.service.name} - {self.requester_name}"


# ══════════════════════════════════════════════════════════════
# SISTEMA DE SUSCRIPCIONES PARA PRESTADORES DE SERVICIOS
# ══════════════════════════════════════════════════════════════

class SubscriptionPlan(models.Model):
    """
    Plan de suscripción disponible para prestadores de servicios.
    Define precio, duración y funcionalidades incluidas.
    """

    BILLING_CYCLE = [
        ('monthly', 'Mensual'),
        ('quarterly', 'Trimestral'),
        ('annual', 'Anual'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField('Nombre del plan', max_length=50)
    slug = models.SlugField('Slug', unique=True)
    description = models.TextField('Descripción')
    billing_cycle = models.CharField('Ciclo de facturación', max_length=15, choices=BILLING_CYCLE, default='monthly')

    # Precios en COP
    price = models.DecimalField('Precio (COP)', max_digits=10, decimal_places=0)
    discount_percentage = models.PositiveIntegerField('Descuento (%)', default=0, help_text='Descuento aplicado sobre el precio base')

    # Límites y funcionalidades
    max_active_services = models.PositiveIntegerField('Máx. servicios activos', default=3)
    max_monthly_requests = models.PositiveIntegerField('Máx. solicitudes/mes', default=20)
    featured_listing = models.BooleanField('Listado destacado', default=False)
    priority_in_search = models.BooleanField('Prioridad en búsquedas', default=False)
    verified_badge = models.BooleanField('Badge verificado', default=False)
    access_to_analytics = models.BooleanField('Acceso a analíticas', default=False)
    direct_messaging = models.BooleanField('Mensajería directa', default=True)
    payment_gateway_access = models.BooleanField('Pasarela de pagos propia', default=False)

    # Estado
    is_active = models.BooleanField('Activo', default=True)
    is_recommended = models.BooleanField('Recomendado', default=False, help_text='Mostrar badge "Recomendado" en la UI')
    sort_order = models.PositiveIntegerField('Orden de visualización', default=0)

    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)

    class Meta:
        verbose_name = 'Plan de Suscripción'
        verbose_name_plural = 'Planes de Suscripción'
        ordering = ['sort_order', 'price']

    def __str__(self):
        return f"{self.name} - ${self.price:,.0f}/{'mes' if self.billing_cycle == 'monthly' else 'trim' if self.billing_cycle == 'quarterly' else 'año'}"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    @property
    def effective_price(self):
        if self.discount_percentage > 0:
            return self.price * (100 - self.discount_percentage) / 100
        return self.price


class ServiceSubscription(models.Model):
    """
    Suscripción activa de un prestador de servicios.
    Vincula un usuario service_provider con un plan de suscripción.
    """

    STATUS_CHOICES = [
        ('trial', 'Período de Prueba'),
        ('active', 'Activa'),
        ('past_due', 'Pago Vencido'),
        ('suspended', 'Suspendida'),
        ('cancelled', 'Cancelada'),
        ('expired', 'Expirada'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    service_provider = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='service_subscription',
        limit_choices_to={'user_type': 'service_provider'},
        verbose_name='Prestador de servicios',
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        verbose_name='Plan',
    )
    status = models.CharField('Estado', max_length=15, choices=STATUS_CHOICES, default='trial')

    # Fechas
    start_date = models.DateTimeField('Fecha de inicio')
    end_date = models.DateTimeField('Fecha de vencimiento')
    trial_end_date = models.DateTimeField('Fin del período de prueba', null=True, blank=True)
    cancelled_at = models.DateTimeField('Fecha de cancelación', null=True, blank=True)

    # Facturación
    next_billing_date = models.DateField('Próxima fecha de cobro', null=True, blank=True)
    auto_renew = models.BooleanField('Renovación automática', default=True)

    # Uso actual
    services_published = models.PositiveIntegerField('Servicios publicados', default=0)
    requests_this_month = models.PositiveIntegerField('Solicitudes este mes', default=0)

    # Metadatos
    cancellation_reason = models.TextField('Motivo de cancelación', blank=True)
    admin_notes = models.TextField('Notas admin', blank=True)

    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)

    class Meta:
        verbose_name = 'Suscripción de Servicio'
        verbose_name_plural = 'Suscripciones de Servicios'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.service_provider.get_full_name()} - {self.plan.name} ({self.get_status_display()})"

    @property
    def is_valid(self):
        from django.utils import timezone
        return self.status in ('trial', 'active') and self.end_date > timezone.now()

    @property
    def can_publish_service(self):
        return self.is_valid and self.services_published < self.plan.max_active_services

    @property
    def can_receive_requests(self):
        return self.is_valid and self.requests_this_month < self.plan.max_monthly_requests


class SubscriptionBillingHistory(models.Model):
    """Historial de cobros de suscripción."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subscription = models.ForeignKey(
        ServiceSubscription,
        on_delete=models.CASCADE,
        related_name='billing_history',
        verbose_name='Suscripción',
    )
    amount = models.DecimalField('Monto cobrado (COP)', max_digits=10, decimal_places=0)
    billing_date = models.DateField('Fecha de cobro')
    payment_method = models.CharField('Método de pago', max_length=50, blank=True)
    transaction_ref = models.CharField('Referencia de transacción', max_length=100, blank=True)
    status = models.CharField(
        'Estado',
        max_length=15,
        choices=[
            ('pending', 'Pendiente'),
            ('paid', 'Pagado'),
            ('failed', 'Fallido'),
            ('refunded', 'Reembolsado'),
        ],
        default='pending',
    )
    notes = models.TextField('Notas', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Historial de Facturación'
        verbose_name_plural = 'Historial de Facturación'
        ordering = ['-billing_date']

    def __str__(self):
        return f"{self.subscription.service_provider.get_full_name()} - ${self.amount:,.0f} ({self.get_status_display()})"