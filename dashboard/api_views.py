"""
Vistas API para el sistema de widgets del dashboard de VeriHome.
"""

from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.core.cache import cache
from datetime import timedelta, datetime
import json

from .models import DashboardWidget, UserDashboardLayout, UserWidgetConfig, WidgetDataCache
from .serializers import (
    DashboardWidgetSerializer, UserDashboardLayoutSerializer, UserWidgetConfigSerializer,
    WidgetDataCacheSerializer, WidgetDataSerializer, DashboardStatsSerializer,
    ChartDataSerializer, DashboardLayoutUpdateSerializer, CreateWidgetSerializer,
    WidgetAnalyticsSerializer, DashboardPerformanceSerializer
)
from .services import DashboardDataService, WidgetDataProvider, DashboardAnalytics

# Import related models
from properties.models import Property
from contracts.models import Contract
from payments.models import Transaction
from ratings.models import Rating
from matching.models import MatchRequest

User = get_user_model()


class DashboardWidgetViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de widgets del dashboard."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateWidgetSerializer
        return DashboardWidgetSerializer
    
    def get_queryset(self):
        queryset = DashboardWidget.objects.filter(is_active=True)
        
        # Filtros opcionales
        widget_type = self.request.query_params.get('type')
        if widget_type:
            queryset = queryset.filter(widget_type=widget_type)
        
        size = self.request.query_params.get('size')
        if size:
            queryset = queryset.filter(size=size)
        
        return queryset.order_by('order', 'created_at')
    
    def perform_create(self, serializer):
        # Determinar el siguiente orden
        last_order = DashboardWidget.objects.aggregate(
            max_order=models.Max('order')
        )['max_order'] or 0
        
        serializer.save(order=last_order + 1)
    
    @action(detail=True, methods=['get'])
    def data(self, request, pk=None):
        """Obtiene los datos para un widget específico."""
        widget = self.get_object()
        user = request.user
        
        # Verificar cache primero
        cache_key = f"widget_data_{widget.id}_{user.id}"
        cached_data = cache.get(cache_key)
        
        if cached_data and not widget.needs_refresh():
            return Response({
                'widget_id': str(widget.id),
                'data': cached_data,
                'from_cache': True,
                'timestamp': timezone.now()
            })
        
        # Obtener datos frescos
        try:
            data_provider = WidgetDataProvider(widget, user)
            widget_data = data_provider.get_data()
            
            # Guardar en cache
            cache_timeout = widget.refresh_interval if widget.refresh_interval > 0 else 300
            cache.set(cache_key, widget_data, timeout=cache_timeout)
            
            # Actualizar timestamp del widget
            widget.mark_data_updated()
            
            return Response({
                'widget_id': str(widget.id),
                'data': widget_data,
                'from_cache': False,
                'timestamp': timezone.now()
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error al obtener datos del widget: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def refresh(self, request, pk=None):
        """Fuerza la actualización de datos de un widget."""
        widget = self.get_object()
        user = request.user
        
        # Limpiar cache
        cache_key = f"widget_data_{widget.id}_{user.id}"
        cache.delete(cache_key)
        
        # Obtener datos frescos
        try:
            data_provider = WidgetDataProvider(widget, user)
            widget_data = data_provider.get_data()
            
            # Actualizar timestamp
            widget.mark_data_updated()
            
            return Response({
                'widget_id': str(widget.id),
                'data': widget_data,
                'refreshed_at': timezone.now(),
                'message': 'Widget actualizado exitosamente'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error al actualizar widget: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Obtiene analíticas de uso para un widget."""
        widget = self.get_object()
        days = int(request.query_params.get('days', 30))
        
        analytics_service = DashboardAnalytics()
        analytics_data = analytics_service.get_widget_analytics(widget, days)
        
        serializer = WidgetAnalyticsSerializer(analytics_data)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def available_types(self, request):
        """Lista todos los tipos de widgets disponibles."""
        widget_types = []
        for code, name in DashboardWidget.WIDGET_TYPES:
            widget_types.append({
                'code': code,
                'name': name,
                'category': self._get_widget_category(code),
                'description': self._get_widget_description(code),
                'default_size': self._get_default_size(code),
                'supports_user_types': self._get_supported_user_types(code)
            })
        
        return Response({
            'widget_types': widget_types,
            'total_types': len(widget_types)
        })
    
    def _get_widget_category(self, widget_type):
        """Obtiene la categoría de un tipo de widget."""
        categories = {
            'stats_overview': 'statistics',
            'financial_summary': 'statistics',
            'property_summary': 'statistics',
            'contract_summary': 'statistics',
            'rating_summary': 'statistics',
            'income_chart': 'charts',
            'occupancy_chart': 'charts',
            'trend_chart': 'charts',
            'rating_chart': 'charts',
            'performance_chart': 'charts',
            'recent_activities': 'lists',
            'property_list': 'lists',
            'contract_list': 'lists',
            'payment_list': 'lists',
            'tenant_list': 'lists',
            'notification_list': 'lists',
            'quick_actions': 'interactive',
            'calendar_widget': 'interactive',
            'weather_widget': 'interactive',
            'map_widget': 'interactive',
            'search_widget': 'interactive',
            'match_requests': 'specialized',
            'property_performance': 'specialized',
            'tenant_dashboard': 'specialized',
            'landlord_dashboard': 'specialized',
            'service_requests': 'specialized',
        }
        return categories.get(widget_type, 'general')
    
    def _get_widget_description(self, widget_type):
        """Obtiene la descripción de un tipo de widget."""
        descriptions = {
            'stats_overview': 'Resumen general de estadísticas principales',
            'financial_summary': 'Resumen de ingresos, gastos y ganancias',
            'property_summary': 'Estado y métricas de propiedades',
            'contract_summary': 'Estado de contratos activos y pendientes',
            'rating_summary': 'Resumen de calificaciones recibidas',
            'income_chart': 'Gráfico de evolución de ingresos',
            'occupancy_chart': 'Gráfico de ocupación de propiedades',
            'trend_chart': 'Gráfico de tendencias temporales',
            'rating_chart': 'Distribución de calificaciones',
            'performance_chart': 'Gráfico de rendimiento general',
            'recent_activities': 'Lista de actividades recientes',
            'property_list': 'Lista de propiedades con acciones rápidas',
            'contract_list': 'Lista de contratos con estado',
            'payment_list': 'Lista de pagos recientes',
            'tenant_list': 'Lista de inquilinos actuales',
            'notification_list': 'Notificaciones importantes',
            'quick_actions': 'Botones de acciones frecuentes',
            'calendar_widget': 'Calendario con eventos importantes',
            'weather_widget': 'Información meteorológica',
            'map_widget': 'Mapa con ubicación de propiedades',
            'search_widget': 'Buscador rápido del sistema',
            'match_requests': 'Solicitudes de matching pendientes',
            'property_performance': 'Rendimiento detallado de propiedades',
            'tenant_dashboard': 'Panel específico para inquilinos',
            'landlord_dashboard': 'Panel específico para arrendadores',
            'service_requests': 'Solicitudes de servicios',
        }
        return descriptions.get(widget_type, 'Widget personalizable')
    
    def _get_default_size(self, widget_type):
        """Obtiene el tamaño por defecto de un tipo de widget."""
        default_sizes = {
            'stats_overview': 'large',
            'financial_summary': 'large',
            'property_summary': 'medium',
            'contract_summary': 'medium',
            'rating_summary': 'small',
            'income_chart': 'wide',
            'occupancy_chart': 'medium',
            'trend_chart': 'wide',
            'rating_chart': 'medium',
            'performance_chart': 'large',
            'recent_activities': 'wide',
            'property_list': 'full_width',
            'contract_list': 'wide',
            'payment_list': 'wide',
            'tenant_list': 'wide',
            'notification_list': 'medium',
            'quick_actions': 'small',
            'calendar_widget': 'medium',
            'weather_widget': 'small',
            'map_widget': 'large',
            'search_widget': 'medium',
            'match_requests': 'wide',
            'property_performance': 'extra_large',
            'tenant_dashboard': 'full_screen',
            'landlord_dashboard': 'full_screen',
            'service_requests': 'wide',
        }
        return default_sizes.get(widget_type, 'medium')
    
    def _get_supported_user_types(self, widget_type):
        """Obtiene los tipos de usuario que soporta un widget."""
        user_type_support = {
            'stats_overview': ['landlord', 'tenant', 'service_provider'],
            'financial_summary': ['landlord', 'service_provider'],
            'property_summary': ['landlord'],
            'contract_summary': ['landlord', 'tenant'],
            'rating_summary': ['landlord', 'tenant', 'service_provider'],
            'income_chart': ['landlord', 'service_provider'],
            'occupancy_chart': ['landlord'],
            'trend_chart': ['landlord', 'service_provider'],
            'rating_chart': ['landlord', 'tenant', 'service_provider'],
            'performance_chart': ['landlord', 'service_provider'],
            'recent_activities': ['landlord', 'tenant', 'service_provider'],
            'property_list': ['landlord', 'tenant'],
            'contract_list': ['landlord', 'tenant'],
            'payment_list': ['landlord', 'tenant', 'service_provider'],
            'tenant_list': ['landlord'],
            'notification_list': ['landlord', 'tenant', 'service_provider'],
            'quick_actions': ['landlord', 'tenant', 'service_provider'],
            'calendar_widget': ['landlord', 'tenant', 'service_provider'],
            'weather_widget': ['landlord', 'tenant', 'service_provider'],
            'map_widget': ['landlord', 'tenant'],
            'search_widget': ['landlord', 'tenant', 'service_provider'],
            'match_requests': ['landlord', 'tenant'],
            'property_performance': ['landlord'],
            'tenant_dashboard': ['tenant'],
            'landlord_dashboard': ['landlord'],
            'service_requests': ['landlord', 'tenant', 'service_provider'],
        }
        return user_type_support.get(widget_type, ['landlord', 'tenant', 'service_provider'])


class UserDashboardLayoutViewSet(viewsets.ModelViewSet):
    """ViewSet para layouts de dashboard de usuario."""
    
    serializer_class = UserDashboardLayoutSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return UserDashboardLayout.objects.filter(user=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_widget(self, request, pk=None):
        """Añade un widget al layout del usuario."""
        layout = self.get_object()
        widget_id = request.data.get('widget_id')
        
        if not widget_id:
            return Response(
                {'error': 'widget_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            widget = DashboardWidget.objects.get(id=widget_id, is_active=True)
        except DashboardWidget.DoesNotExist:
            return Response(
                {'error': 'Widget no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Verificar si ya existe
        if UserWidgetConfig.objects.filter(user_layout=layout, widget=widget).exists():
            return Response(
                {'error': 'El widget ya está añadido al layout'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar compatibilidad con tipo de usuario
        if request.user.user_type not in widget.get_supported_user_types():
            return Response(
                {'error': 'Este widget no es compatible con tu tipo de usuario'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear configuración del widget
        config_data = request.data.get('config', {})
        widget_config = UserWidgetConfig.objects.create(
            user_layout=layout,
            widget=widget,
            custom_position_x=config_data.get('position_x'),
            custom_position_y=config_data.get('position_y'),
            custom_width=config_data.get('width'),
            custom_height=config_data.get('height'),
            custom_title=config_data.get('title', ''),
            custom_config=config_data.get('custom_config', {}),
            is_enabled=config_data.get('is_enabled', True),
            is_collapsed=config_data.get('is_collapsed', False),
            is_pinned=config_data.get('is_pinned', False)
        )
        
        serializer = UserWidgetConfigSerializer(widget_config)
        return Response({
            'message': 'Widget añadido exitosamente',
            'widget_config': serializer.data
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['delete'])
    def remove_widget(self, request, pk=None):
        """Remueve un widget del layout del usuario."""
        layout = self.get_object()
        widget_id = request.data.get('widget_id')
        
        if not widget_id:
            return Response(
                {'error': 'widget_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            widget_config = UserWidgetConfig.objects.get(
                user_layout=layout,
                widget__id=widget_id
            )
            widget_config.delete()
            
            return Response({
                'message': 'Widget removido exitosamente'
            })
            
        except UserWidgetConfig.DoesNotExist:
            return Response(
                {'error': 'Configuración de widget no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['put'])
    def update_layout(self, request, pk=None):
        """Actualiza la configuración completa del layout."""
        layout = self.get_object()
        serializer = DashboardLayoutUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            # Actualizar campos del layout
            for field, value in serializer.validated_data.items():
                if field != 'widget_configurations' and hasattr(layout, field):
                    setattr(layout, field, value)
            
            layout.save()
            
            # Actualizar configuraciones de widgets si se proporcionan
            widget_configs = serializer.validated_data.get('widget_configurations', [])
            for config_data in widget_configs:
                try:
                    widget_config = UserWidgetConfig.objects.get(
                        user_layout=layout,
                        widget__id=config_data['widget_id']
                    )
                    
                    # Actualizar posición
                    position = config_data.get('position', {})
                    if 'x' in position:
                        widget_config.custom_position_x = position['x']
                    if 'y' in position:
                        widget_config.custom_position_y = position['y']
                    
                    # Actualizar dimensiones
                    dimensions = config_data.get('dimensions', {})
                    if 'width' in dimensions:
                        widget_config.custom_width = dimensions['width']
                    if 'height' in dimensions:
                        widget_config.custom_height = dimensions['height']
                    
                    # Actualizar otros campos
                    for field in ['is_enabled', 'is_collapsed', 'is_pinned', 'custom_title', 'custom_config']:
                        if field in config_data:
                            setattr(widget_config, field, config_data[field])
                    
                    widget_config.save()
                    
                except UserWidgetConfig.DoesNotExist:
                    continue
            
            # Retornar layout actualizado
            updated_serializer = UserDashboardLayoutSerializer(layout)
            return Response({
                'message': 'Layout actualizado exitosamente',
                'layout': updated_serializer.data
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def reset_to_default(self, request, pk=None):
        """Resetea el layout a la configuración por defecto."""
        layout = self.get_object()
        
        # Eliminar todas las configuraciones de widgets
        UserWidgetConfig.objects.filter(user_layout=layout).delete()
        
        # Resetear configuración del layout
        layout.layout_type = 'default'
        layout.grid_columns = 4
        layout.grid_row_height = 120
        layout.grid_margin = 10
        layout.dark_mode = False
        layout.sidebar_collapsed = False
        layout.show_welcome_widget = True
        layout.auto_refresh_enabled = True
        layout.save()
        
        # Agregar widgets por defecto según el tipo de usuario
        self._add_default_widgets(layout, request.user.user_type)
        
        updated_serializer = UserDashboardLayoutSerializer(layout)
        return Response({
            'message': 'Layout reseteado a configuración por defecto',
            'layout': updated_serializer.data
        })
    
    def _add_default_widgets(self, layout, user_type):
        """Añade widgets por defecto según el tipo de usuario."""
        default_widgets = {
            'landlord': [
                ('stats_overview', 0, 0, 2, 2),
                ('financial_summary', 2, 0, 2, 2),
                ('property_summary', 0, 2, 2, 1),
                ('recent_activities', 2, 2, 2, 1),
                ('income_chart', 0, 3, 4, 1),
            ],
            'tenant': [
                ('contract_summary', 0, 0, 2, 2),
                ('payment_list', 2, 0, 2, 2),
                ('property_list', 0, 2, 4, 1),
                ('recent_activities', 0, 3, 4, 1),
            ],
            'service_provider': [
                ('stats_overview', 0, 0, 2, 2),
                ('financial_summary', 2, 0, 2, 2),
                ('service_requests', 0, 2, 4, 1),
                ('recent_activities', 0, 3, 4, 1),
            ]
        }
        
        widgets_config = default_widgets.get(user_type, default_widgets['landlord'])
        
        for widget_type, x, y, width, height in widgets_config:
            try:
                widget = DashboardWidget.objects.filter(
                    widget_type=widget_type,
                    is_active=True
                ).first()
                
                if widget:
                    UserWidgetConfig.objects.create(
                        user_layout=layout,
                        widget=widget,
                        custom_position_x=x,
                        custom_position_y=y,
                        custom_width=width,
                        custom_height=height,
                        is_enabled=True
                    )
            except Exception:
                continue


class DashboardDataAPIView(APIView):
    """Vista para obtener datos consolidados del dashboard."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene todos los datos necesarios para el dashboard del usuario."""
        user = request.user
        
        # Obtener o crear layout del usuario
        layout, created = UserDashboardLayout.objects.get_or_create(
            user=user,
            defaults={'layout_name': f'Dashboard de {user.get_full_name()}'}
        )
        
        if created:
            # Agregar widgets por defecto para usuarios nuevos
            self._add_default_widgets(layout, user.user_type)
        
        # Actualizar último acceso
        layout.update_last_accessed()
        
        # Obtener widgets activos
        active_widgets = layout.get_active_widgets()
        
        # Preparar datos para cada widget
        dashboard_data = {
            'layout': UserDashboardLayoutSerializer(layout).data,
            'widgets': [],
            'global_stats': {},
            'performance_metrics': {}
        }
        
        data_service = DashboardDataService(user)
        
        for widget_config in active_widgets:
            widget = widget_config.widget
            
            try:
                # Obtener datos del widget
                data_provider = WidgetDataProvider(widget, user)
                widget_data = data_provider.get_data()
                
                dashboard_data['widgets'].append({
                    'config': UserWidgetConfigSerializer(widget_config).data,
                    'data': widget_data,
                    'last_updated': widget.last_data_update
                })
                
            except Exception as e:
                # En caso de error, incluir widget con error
                dashboard_data['widgets'].append({
                    'config': UserWidgetConfigSerializer(widget_config).data,
                    'data': None,
                    'error': str(e),
                    'last_updated': None
                })
        
        # Estadísticas globales
        dashboard_data['global_stats'] = data_service.get_global_stats()
        
        # Métricas de rendimiento
        analytics_service = DashboardAnalytics()
        dashboard_data['performance_metrics'] = analytics_service.get_dashboard_performance(user)
        
        return Response(dashboard_data)
    
    def _add_default_widgets(self, layout, user_type):
        """Añade widgets por defecto (método auxiliar)."""
        # Lógica similar a la del ViewSet
        default_widgets = {
            'landlord': ['stats_overview', 'financial_summary', 'property_summary', 'recent_activities'],
            'tenant': ['contract_summary', 'payment_list', 'property_list', 'recent_activities'],
            'service_provider': ['stats_overview', 'financial_summary', 'service_requests', 'recent_activities']
        }
        
        widget_types = default_widgets.get(user_type, default_widgets['landlord'])
        
        for i, widget_type in enumerate(widget_types):
            try:
                widget = DashboardWidget.objects.filter(
                    widget_type=widget_type,
                    is_active=True
                ).first()
                
                if widget:
                    UserWidgetConfig.objects.create(
                        user_layout=layout,
                        widget=widget,
                        custom_position_x=(i % 2) * 2,
                        custom_position_y=i // 2,
                        is_enabled=True
                    )
            except Exception:
                continue


class DashboardAnalyticsAPIView(APIView):
    """Vista para analíticas del dashboard."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene analíticas del dashboard del usuario."""
        user = request.user
        days = int(request.query_params.get('days', 30))
        
        analytics_service = DashboardAnalytics()
        
        # Analíticas generales del usuario
        user_analytics = analytics_service.get_user_dashboard_analytics(user, days)
        
        # Analíticas de widgets individuales
        widget_analytics = []
        try:
            layout = user.dashboard_layout
            for widget_config in layout.get_active_widgets():
                widget_data = analytics_service.get_widget_analytics(widget_config.widget, days)
                widget_analytics.append(widget_data)
        except UserDashboardLayout.DoesNotExist:
            pass
        
        # Métricas de rendimiento del sistema
        performance_metrics = analytics_service.get_dashboard_performance(user)
        
        return Response({
            'user_analytics': user_analytics,
            'widget_analytics': widget_analytics,
            'performance_metrics': performance_metrics,
            'period_days': days,
            'generated_at': timezone.now()
        })


class WidgetCacheManagementAPIView(APIView):
    """Vista para gestión de cache de widgets."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Lista información del cache de widgets del usuario."""
        user = request.user
        
        cache_entries = WidgetDataCache.objects.filter(user=user).order_by('-created_at')
        
        cache_stats = {
            'total_entries': cache_entries.count(),
            'valid_entries': cache_entries.filter(expires_at__gt=timezone.now()).count(),
            'expired_entries': cache_entries.filter(expires_at__lte=timezone.now()).count(),
            'total_size_mb': sum(entry.data_size_bytes for entry in cache_entries) / (1024 * 1024),
            'entries': WidgetDataCacheSerializer(cache_entries[:20], many=True).data
        }
        
        return Response(cache_stats)
    
    def delete(self, request):
        """Limpia el cache de widgets del usuario."""
        user = request.user
        
        # Parámetros de limpieza
        clear_all = request.query_params.get('clear_all', 'false').lower() == 'true'
        widget_id = request.query_params.get('widget_id')
        
        if clear_all:
            # Limpiar todo el cache del usuario
            deleted_count = WidgetDataCache.objects.filter(user=user).count()
            WidgetDataCache.objects.filter(user=user).delete()
            
            # También limpiar cache de Django
            cache.delete_pattern(f"widget_data_*_{user.id}")
            
            message = f"Se eliminaron {deleted_count} entradas de cache"
            
        elif widget_id:
            # Limpiar cache de un widget específico
            deleted_count = WidgetDataCache.objects.filter(
                user=user,
                widget__id=widget_id
            ).count()
            WidgetDataCache.objects.filter(
                user=user,
                widget__id=widget_id
            ).delete()
            
            # Limpiar cache de Django
            cache.delete(f"widget_data_{widget_id}_{user.id}")
            
            message = f"Se eliminaron {deleted_count} entradas de cache para el widget"
            
        else:
            # Limpiar solo cache expirado
            deleted_count = WidgetDataCache.cleanup_expired()
            message = f"Se eliminaron {deleted_count} entradas de cache expiradas"
        
        return Response({
            'message': message,
            'deleted_count': deleted_count
        })


class DashboardPerformanceAPIView(APIView):
    """Vista para métricas de rendimiento del dashboard."""
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene métricas de rendimiento del dashboard."""
        analytics_service = DashboardAnalytics()
        performance_data = analytics_service.get_system_performance_metrics()
        
        serializer = DashboardPerformanceSerializer(performance_data)
        return Response(serializer.data)