"""
Serializers para el sistema de widgets del dashboard de VeriHome.
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import DashboardWidget, UserDashboardLayout, UserWidgetConfig, WidgetDataCache

User = get_user_model()


class DashboardWidgetSerializer(serializers.ModelSerializer):
    """Serializer para widgets del dashboard."""
    
    display_config = serializers.SerializerMethodField()
    data_config = serializers.SerializerMethodField()
    needs_refresh = serializers.SerializerMethodField()
    widget_type_display = serializers.CharField(source='get_widget_type_display', read_only=True)
    size_display = serializers.CharField(source='get_size_display', read_only=True)
    
    class Meta:
        model = DashboardWidget
        fields = [
            'id', 'widget_type', 'widget_type_display', 'title', 'description',
            'size', 'size_display', 'position_x', 'position_y', 'width', 'height',
            'is_active', 'is_visible', 'order', 'refresh_interval', 'data_source',
            'filter_config', 'color_scheme', 'background_color', 'text_color',
            'created_at', 'updated_at', 'last_data_update', 'display_config',
            'data_config', 'needs_refresh'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_data_update']
    
    def get_display_config(self, obj):
        return obj.get_display_config()
    
    def get_data_config(self, obj):
        return obj.get_data_config()
    
    def get_needs_refresh(self, obj):
        return obj.needs_refresh()


class UserWidgetConfigSerializer(serializers.ModelSerializer):
    """Serializer para configuración de widgets de usuario."""
    
    widget = DashboardWidgetSerializer(read_only=True)
    widget_id = serializers.UUIDField(write_only=True)
    effective_position = serializers.SerializerMethodField()
    effective_dimensions = serializers.SerializerMethodField()
    effective_title = serializers.SerializerMethodField()
    
    class Meta:
        model = UserWidgetConfig
        fields = [
            'id', 'widget', 'widget_id', 'is_enabled', 'is_collapsed', 'is_pinned',
            'custom_position_x', 'custom_position_y', 'custom_width', 'custom_height',
            'custom_title', 'custom_config', 'added_at', 'last_interacted',
            'effective_position', 'effective_dimensions', 'effective_title'
        ]
        read_only_fields = ['id', 'added_at', 'last_interacted']
    
    def get_effective_position(self, obj):
        return obj.get_effective_position()
    
    def get_effective_dimensions(self, obj):
        return obj.get_effective_dimensions()
    
    def get_effective_title(self, obj):
        return obj.get_effective_title()


class UserDashboardLayoutSerializer(serializers.ModelSerializer):
    """Serializer para layouts de dashboard de usuario."""
    
    widgets = UserWidgetConfigSerializer(source='userwidgetconfig_set', many=True, read_only=True)
    widget_count = serializers.SerializerMethodField()
    active_widget_count = serializers.SerializerMethodField()
    grid_config = serializers.SerializerMethodField()
    layout_type_display = serializers.CharField(source='get_layout_type_display', read_only=True)
    
    class Meta:
        model = UserDashboardLayout
        fields = [
            'id', 'layout_type', 'layout_type_display', 'layout_name',
            'grid_columns', 'grid_row_height', 'grid_margin', 'dark_mode',
            'sidebar_collapsed', 'show_welcome_widget', 'auto_refresh_enabled',
            'created_at', 'updated_at', 'last_accessed', 'widgets',
            'widget_count', 'active_widget_count', 'grid_config'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_accessed']
    
    def get_widget_count(self, obj):
        return obj.widgets.count()
    
    def get_active_widget_count(self, obj):
        return obj.get_active_widgets().count()
    
    def get_grid_config(self, obj):
        return obj.get_grid_config()


class WidgetDataCacheSerializer(serializers.ModelSerializer):
    """Serializer para cache de datos de widgets."""
    
    widget_title = serializers.CharField(source='widget.title', read_only=True)
    is_expired = serializers.SerializerMethodField()
    is_valid = serializers.SerializerMethodField()
    size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = WidgetDataCache
        fields = [
            'id', 'widget', 'widget_title', 'user', 'cached_data', 'cache_key',
            'cache_version', 'data_source', 'query_parameters', 'created_at',
            'expires_at', 'last_accessed', 'access_count', 'data_size_bytes',
            'is_expired', 'is_valid', 'size_mb'
        ]
        read_only_fields = [
            'id', 'created_at', 'last_accessed', 'access_count', 'data_size_bytes'
        ]
    
    def get_is_expired(self, obj):
        return obj.is_expired()
    
    def get_is_valid(self, obj):
        return obj.is_valid()
    
    def get_size_mb(self, obj):
        return round(obj.data_size_bytes / (1024 * 1024), 2)


class WidgetDataSerializer(serializers.Serializer):
    """Serializer para datos dinámicos de widgets."""
    
    widget_id = serializers.UUIDField()
    widget_type = serializers.CharField()
    data = serializers.JSONField()
    metadata = serializers.JSONField(required=False)
    timestamp = serializers.DateTimeField(read_only=True)
    cache_info = serializers.JSONField(required=False)


class DashboardStatsSerializer(serializers.Serializer):
    """Serializer para estadísticas del dashboard."""
    
    # Estadísticas de propiedades
    properties = serializers.JSONField()
    
    # Estadísticas financieras
    finances = serializers.JSONField()
    
    # Estadísticas de contratos
    contracts = serializers.JSONField()
    
    # Estadísticas de usuarios
    users = serializers.JSONField(required=False)
    
    # Estadísticas de calificaciones
    ratings = serializers.JSONField()
    
    # Actividades recientes
    activities = serializers.ListField(child=serializers.JSONField())
    
    # Metadatos
    period = serializers.CharField()
    generated_at = serializers.DateTimeField()
    user_type = serializers.CharField()


class ChartDataSerializer(serializers.Serializer):
    """Serializer para datos de gráficos."""
    
    chart_type = serializers.CharField()
    labels = serializers.ListField(child=serializers.CharField())
    datasets = serializers.ListField(child=serializers.JSONField())
    options = serializers.JSONField(required=False)
    colors = serializers.ListField(child=serializers.CharField(), required=False)


class WidgetConfigurationSerializer(serializers.Serializer):
    """Serializer para configuración de widgets."""
    
    widget_id = serializers.UUIDField()
    position = serializers.JSONField()
    dimensions = serializers.JSONField()
    is_enabled = serializers.BooleanField(default=True)
    is_collapsed = serializers.BooleanField(default=False)
    is_pinned = serializers.BooleanField(default=False)
    custom_title = serializers.CharField(required=False, allow_blank=True)
    custom_config = serializers.JSONField(required=False)


class DashboardLayoutUpdateSerializer(serializers.Serializer):
    """Serializer para actualizar layout del dashboard."""
    
    layout_name = serializers.CharField(max_length=100, required=False)
    layout_type = serializers.ChoiceField(
        choices=UserDashboardLayout.LAYOUT_TYPES, 
        required=False
    )
    grid_columns = serializers.IntegerField(min_value=2, max_value=6, required=False)
    grid_row_height = serializers.IntegerField(min_value=80, max_value=200, required=False)
    grid_margin = serializers.IntegerField(min_value=5, max_value=30, required=False)
    dark_mode = serializers.BooleanField(required=False)
    sidebar_collapsed = serializers.BooleanField(required=False)
    show_welcome_widget = serializers.BooleanField(required=False)
    auto_refresh_enabled = serializers.BooleanField(required=False)
    
    # Lista de configuraciones de widgets
    widget_configurations = serializers.ListField(
        child=WidgetConfigurationSerializer(), 
        required=False
    )


class CreateWidgetSerializer(serializers.ModelSerializer):
    """Serializer para crear nuevos widgets."""
    
    class Meta:
        model = DashboardWidget
        fields = [
            'widget_type', 'title', 'description', 'size', 'position_x', 'position_y',
            'refresh_interval', 'data_source', 'filter_config', 'color_scheme',
            'background_color', 'text_color'
        ]
    
    def validate_position_x(self, value):
        if value < 0 or value > 11:
            raise serializers.ValidationError("La posición X debe estar entre 0 y 11")
        return value
    
    def validate_position_y(self, value):
        if value < 0:
            raise serializers.ValidationError("La posición Y debe ser mayor o igual a 0")
        return value
    
    def validate_filter_config(self, value):
        """Valida la configuración de filtros."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("La configuración de filtros debe ser un objeto JSON")
        return value


class WidgetAnalyticsSerializer(serializers.Serializer):
    """Serializer para analíticas de widgets."""
    
    widget_id = serializers.UUIDField()
    widget_title = serializers.CharField()
    widget_type = serializers.CharField()
    
    # Métricas de uso
    total_views = serializers.IntegerField()
    unique_users = serializers.IntegerField()
    avg_interaction_time = serializers.FloatField()
    last_accessed = serializers.DateTimeField(allow_null=True)
    
    # Métricas de rendimiento
    avg_load_time = serializers.FloatField()
    cache_hit_rate = serializers.FloatField()
    error_rate = serializers.FloatField()
    
    # Datos de uso temporal
    daily_usage = serializers.ListField(child=serializers.JSONField())
    hourly_distribution = serializers.ListField(child=serializers.IntegerField())
    
    # Configuración más común
    most_common_size = serializers.CharField()
    most_common_position = serializers.JSONField()
    
    # Metadatos
    period_days = serializers.IntegerField()
    generated_at = serializers.DateTimeField()


class DashboardPerformanceSerializer(serializers.Serializer):
    """Serializer para métricas de rendimiento del dashboard."""
    
    # Métricas generales
    total_widgets = serializers.IntegerField()
    active_widgets = serializers.IntegerField()
    avg_load_time = serializers.FloatField()
    
    # Métricas de cache
    cache_size_mb = serializers.FloatField()
    cache_hit_rate = serializers.FloatField()
    expired_cache_entries = serializers.IntegerField()
    
    # Métricas de usuario
    total_layouts = serializers.IntegerField()
    avg_widgets_per_user = serializers.FloatField()
    most_used_widget_types = serializers.ListField(child=serializers.JSONField())
    
    # Recomendaciones
    optimization_suggestions = serializers.ListField(child=serializers.CharField())
    
    # Metadatos
    generated_at = serializers.DateTimeField()
    system_status = serializers.CharField()