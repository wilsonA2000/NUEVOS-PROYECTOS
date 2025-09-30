"""
Modelos para el sistema de widgets del dashboard de VeriHome.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
import uuid
import json

User = get_user_model()


class DashboardWidget(models.Model):
    """Modelo base para widgets del dashboard."""
    
    WIDGET_TYPES = [
        # Estadísticas
        ('stats_overview', 'Resumen de Estadísticas'),
        ('financial_summary', 'Resumen Financiero'),
        ('property_summary', 'Resumen de Propiedades'),
        ('contract_summary', 'Resumen de Contratos'),
        ('rating_summary', 'Resumen de Calificaciones'),
        
        # Gráficos
        ('income_chart', 'Gráfico de Ingresos'),
        ('occupancy_chart', 'Gráfico de Ocupación'),
        ('trend_chart', 'Gráfico de Tendencias'),
        ('rating_chart', 'Gráfico de Calificaciones'),
        ('performance_chart', 'Gráfico de Rendimiento'),
        
        # Listas y tablas
        ('recent_activities', 'Actividades Recientes'),
        ('property_list', 'Lista de Propiedades'),
        ('contract_list', 'Lista de Contratos'),
        ('payment_list', 'Lista de Pagos'),
        ('tenant_list', 'Lista de Inquilinos'),
        ('notification_list', 'Notificaciones'),
        
        # Widgets interactivos
        ('quick_actions', 'Acciones Rápidas'),
        ('calendar_widget', 'Calendario'),
        ('weather_widget', 'Clima'),
        ('map_widget', 'Mapa de Propiedades'),
        ('search_widget', 'Búsqueda Rápida'),
        
        # Widgets específicos por rol
        ('match_requests', 'Solicitudes de Match'),
        ('property_performance', 'Rendimiento de Propiedades'),
        ('tenant_dashboard', 'Panel de Inquilino'),
        ('landlord_dashboard', 'Panel de Arrendador'),
        ('service_requests', 'Solicitudes de Servicio'),
    ]
    
    WIDGET_SIZES = [
        ('small', 'Pequeño (1x1)'),
        ('medium', 'Mediano (2x1)'),
        ('large', 'Grande (2x2)'),
        ('wide', 'Ancho (3x1)'),
        ('extra_large', 'Extra Grande (3x2)'),
        ('full_width', 'Ancho Completo (4x1)'),
        ('full_screen', 'Pantalla Completa (4x3)'),
    ]
    
    REFRESH_INTERVALS = [
        (0, 'Manual'),
        (30, '30 segundos'),
        (60, '1 minuto'),
        (300, '5 minutos'),
        (900, '15 minutos'),
        (1800, '30 minutos'),
        (3600, '1 hora'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Configuración básica
    widget_type = models.CharField('Tipo de Widget', max_length=30, choices=WIDGET_TYPES)
    title = models.CharField('Título', max_length=100)
    description = models.TextField('Descripción', max_length=300, blank=True)
    
    # Configuración de visualización
    size = models.CharField('Tamaño', max_length=20, choices=WIDGET_SIZES, default='medium')
    position_x = models.PositiveIntegerField('Posición X', default=0, validators=[MinValueValidator(0), MaxValueValidator(11)])
    position_y = models.PositiveIntegerField('Posición Y', default=0, validators=[MinValueValidator(0)])
    width = models.PositiveIntegerField('Ancho', default=2, validators=[MinValueValidator(1), MaxValueValidator(4)])
    height = models.PositiveIntegerField('Alto', default=1, validators=[MinValueValidator(1), MaxValueValidator(3)])
    
    # Estado
    is_active = models.BooleanField('Activo', default=True)
    is_visible = models.BooleanField('Visible', default=True)
    order = models.PositiveIntegerField('Orden', default=0)
    
    # Configuración de datos
    refresh_interval = models.IntegerField('Intervalo de actualización (segundos)', choices=REFRESH_INTERVALS, default=300)
    data_source = models.CharField('Fuente de datos', max_length=100, blank=True)
    filter_config = models.JSONField('Configuración de filtros', default=dict, blank=True)
    
    # Configuración de estilo
    color_scheme = models.CharField('Esquema de colores', max_length=20, default='default')
    background_color = models.CharField('Color de fondo', max_length=20, blank=True)
    text_color = models.CharField('Color de texto', max_length=20, blank=True)
    
    # Metadatos
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    last_data_update = models.DateTimeField('Última actualización de datos', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Widget de Dashboard'
        verbose_name_plural = 'Widgets de Dashboard'
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['widget_type', 'is_active']),
            models.Index(fields=['order', 'position_y']),
        ]
    
    def __str__(self):
        return f"{self.title} ({self.get_widget_type_display()})"
    
    def save(self, *args, **kwargs):
        # Auto-ajustar dimensiones según el tamaño
        size_dimensions = {
            'small': (1, 1),
            'medium': (2, 1),
            'large': (2, 2),
            'wide': (3, 1),
            'extra_large': (3, 2),
            'full_width': (4, 1),
            'full_screen': (4, 3),
        }
        
        if self.size in size_dimensions:
            self.width, self.height = size_dimensions[self.size]
        
        super().save(*args, **kwargs)
    
    def get_data_config(self):
        """Obtiene la configuración de datos del widget."""
        return {
            'type': self.widget_type,
            'filters': self.filter_config,
            'refresh_interval': self.refresh_interval,
            'data_source': self.data_source
        }
    
    def get_display_config(self):
        """Obtiene la configuración de visualización del widget."""
        return {
            'size': self.size,
            'position': {'x': self.position_x, 'y': self.position_y},
            'dimensions': {'width': self.width, 'height': self.height},
            'colors': {
                'scheme': self.color_scheme,
                'background': self.background_color,
                'text': self.text_color
            }
        }
    
    def needs_refresh(self):
        """Verifica si el widget necesita actualizar sus datos."""
        if self.refresh_interval == 0:  # Manual
            return False
        
        if not self.last_data_update:
            return True
        
        return (timezone.now() - self.last_data_update).total_seconds() > self.refresh_interval
    
    def mark_data_updated(self):
        """Marca el widget como actualizado."""
        self.last_data_update = timezone.now()
        self.save(update_fields=['last_data_update'])


class UserDashboardLayout(models.Model):
    """Layout personalizado del dashboard para cada usuario."""
    
    LAYOUT_TYPES = [
        ('default', 'Predeterminado'),
        ('compact', 'Compacto'),
        ('detailed', 'Detallado'),
        ('minimal', 'Minimalista'),
        ('custom', 'Personalizado'),
    ]
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='dashboard_layout',
        verbose_name='Usuario'
    )
    
    layout_type = models.CharField('Tipo de Layout', max_length=20, choices=LAYOUT_TYPES, default='default')
    layout_name = models.CharField('Nombre del Layout', max_length=100, default='Mi Dashboard')
    
    # Configuración del grid
    grid_columns = models.PositiveIntegerField('Columnas del grid', default=4, validators=[MinValueValidator(2), MaxValueValidator(6)])
    grid_row_height = models.PositiveIntegerField('Altura de fila', default=120, validators=[MinValueValidator(80), MaxValueValidator(200)])
    grid_margin = models.PositiveIntegerField('Margen del grid', default=10, validators=[MinValueValidator(5), MaxValueValidator(30)])
    
    # Widgets configurados
    widgets = models.ManyToManyField(
        DashboardWidget,
        through='UserWidgetConfig',
        related_name='user_layouts',
        verbose_name='Widgets'
    )
    
    # Configuración general
    dark_mode = models.BooleanField('Modo oscuro', default=False)
    sidebar_collapsed = models.BooleanField('Sidebar colapsado', default=False)
    show_welcome_widget = models.BooleanField('Mostrar widget de bienvenida', default=True)
    auto_refresh_enabled = models.BooleanField('Auto-actualización habilitada', default=True)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    last_accessed = models.DateTimeField('Último acceso', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Layout de Dashboard'
        verbose_name_plural = 'Layouts de Dashboard'
    
    def __str__(self):
        return f"Dashboard de {self.user.get_full_name()} - {self.layout_name}"
    
    def get_active_widgets(self):
        """Obtiene los widgets activos para este layout."""
        return self.widgets.filter(is_active=True, userwidgetconfig__is_enabled=True).order_by('order')
    
    def get_grid_config(self):
        """Obtiene la configuración del grid."""
        return {
            'columns': self.grid_columns,
            'row_height': self.grid_row_height,
            'margin': self.grid_margin,
            'dark_mode': self.dark_mode
        }
    
    def update_last_accessed(self):
        """Actualiza la fecha de último acceso."""
        self.last_accessed = timezone.now()
        self.save(update_fields=['last_accessed'])


class UserWidgetConfig(models.Model):
    """Configuración específica de un widget para un usuario."""
    
    user_layout = models.ForeignKey(
        UserDashboardLayout,
        on_delete=models.CASCADE,
        verbose_name='Layout del usuario'
    )
    widget = models.ForeignKey(
        DashboardWidget,
        on_delete=models.CASCADE,
        verbose_name='Widget'
    )
    
    # Estado del widget para este usuario
    is_enabled = models.BooleanField('Habilitado', default=True)
    is_collapsed = models.BooleanField('Colapsado', default=False)
    is_pinned = models.BooleanField('Fijado', default=False)
    
    # Posición personalizada
    custom_position_x = models.PositiveIntegerField('Posición X personalizada', null=True, blank=True)
    custom_position_y = models.PositiveIntegerField('Posición Y personalizada', null=True, blank=True)
    custom_width = models.PositiveIntegerField('Ancho personalizado', null=True, blank=True)
    custom_height = models.PositiveIntegerField('Alto personalizado', null=True, blank=True)
    
    # Configuración personalizada
    custom_title = models.CharField('Título personalizado', max_length=100, blank=True)
    custom_config = models.JSONField('Configuración personalizada', default=dict, blank=True)
    
    # Fechas
    added_at = models.DateTimeField('Fecha de agregado', auto_now_add=True)
    last_interacted = models.DateTimeField('Última interacción', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Configuración de Widget de Usuario'
        verbose_name_plural = 'Configuraciones de Widgets de Usuario'
        unique_together = ['user_layout', 'widget']
        ordering = ['widget__order']
    
    def __str__(self):
        return f"{self.widget.title} - {self.user_layout.user.get_full_name()}"
    
    def get_effective_position(self):
        """Obtiene la posición efectiva (personalizada o por defecto)."""
        return {
            'x': self.custom_position_x if self.custom_position_x is not None else self.widget.position_x,
            'y': self.custom_position_y if self.custom_position_y is not None else self.widget.position_y
        }
    
    def get_effective_dimensions(self):
        """Obtiene las dimensiones efectivas (personalizadas o por defecto)."""
        return {
            'width': self.custom_width if self.custom_width is not None else self.widget.width,
            'height': self.custom_height if self.custom_height is not None else self.widget.height
        }
    
    def get_effective_title(self):
        """Obtiene el título efectivo (personalizado o por defecto)."""
        return self.custom_title if self.custom_title else self.widget.title
    
    def update_interaction(self):
        """Actualiza la fecha de última interacción."""
        self.last_interacted = timezone.now()
        self.save(update_fields=['last_interacted'])


class WidgetDataCache(models.Model):
    """Cache de datos para widgets del dashboard."""
    
    widget = models.ForeignKey(
        DashboardWidget,
        on_delete=models.CASCADE,
        related_name='data_cache',
        verbose_name='Widget'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='widget_cache',
        verbose_name='Usuario',
        null=True,
        blank=True
    )
    
    # Datos en cache
    cached_data = models.JSONField('Datos en cache', default=dict)
    cache_key = models.CharField('Clave de cache', max_length=200)
    
    # Metadatos del cache
    cache_version = models.CharField('Versión del cache', max_length=50, default='1.0')
    data_source = models.CharField('Fuente de datos', max_length=100, blank=True)
    query_parameters = models.JSONField('Parámetros de consulta', default=dict, blank=True)
    
    # Control de tiempo
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    expires_at = models.DateTimeField('Fecha de expiración')
    last_accessed = models.DateTimeField('Último acceso', null=True, blank=True)
    
    # Estadísticas
    access_count = models.PositiveIntegerField('Número de accesos', default=0)
    data_size_bytes = models.PositiveIntegerField('Tamaño de datos (bytes)', default=0)
    
    class Meta:
        verbose_name = 'Cache de Datos de Widget'
        verbose_name_plural = 'Caches de Datos de Widgets'
        unique_together = ['widget', 'user', 'cache_key']
        indexes = [
            models.Index(fields=['cache_key', 'expires_at']),
            models.Index(fields=['widget', 'expires_at']),
        ]
    
    def __str__(self):
        return f"Cache {self.cache_key} - {self.widget.title}"
    
    def is_expired(self):
        """Verifica si el cache ha expirado."""
        return timezone.now() > self.expires_at
    
    def is_valid(self):
        """Verifica si el cache es válido."""
        return not self.is_expired() and bool(self.cached_data)
    
    def get_data(self):
        """Obtiene los datos del cache si son válidos."""
        if self.is_valid():
            self.access_count += 1
            self.last_accessed = timezone.now()
            self.save(update_fields=['access_count', 'last_accessed'])
            return self.cached_data
        return None
    
    def set_data(self, data, ttl_seconds=300):
        """Establece los datos en el cache con TTL."""
        self.cached_data = data
        self.expires_at = timezone.now() + timezone.timedelta(seconds=ttl_seconds)
        self.data_size_bytes = len(json.dumps(data).encode('utf-8'))
        self.save()
    
    @classmethod
    def cleanup_expired(cls):
        """Limpia los caches expirados."""
        expired_count = cls.objects.filter(expires_at__lt=timezone.now()).count()
        cls.objects.filter(expires_at__lt=timezone.now()).delete()
        return expired_count