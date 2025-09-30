"""
URLs completas para el dashboard con sistema de widgets avanzado.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'dashboard'

# URLs básicas existentes (compatibilidad con frontend actual)
urlpatterns = [
    # APIs existentes que usa el frontend actual
    path('stats/', views.DashboardStatsView.as_view(), name='stats'),
    path('charts/', views.DashboardChartsView.as_view(), name='charts'),
    path('export/', views.DashboardExportView.as_view(), name='export'),
]

# Sistema avanzado de widgets (se importa solo si está disponible)
try:
    from . import api_views
    from .models import DashboardWidget, UserDashboardLayout
    
    # Router para ViewSets de widgets
    router = DefaultRouter()
    router.register(r'widgets', api_views.DashboardWidgetViewSet, basename='widgets')
    router.register(r'layouts', api_views.UserDashboardLayoutViewSet, basename='layouts')
    
    # URLs avanzadas del sistema de widgets
    advanced_urls = [
        # ViewSets principales
        path('v2/', include(router.urls)),
        
        # APIs de datos avanzados
        path('v2/data/', api_views.DashboardDataAPIView.as_view(), name='dashboard_data_advanced'),
        path('v2/analytics/', api_views.DashboardAnalyticsAPIView.as_view(), name='dashboard_analytics'),
        path('v2/performance/', api_views.DashboardPerformanceAPIView.as_view(), name='performance_metrics'),
        
        # Gestión de cache
        path('v2/cache/', api_views.WidgetCacheManagementAPIView.as_view(), name='cache_management'),
        
        # APIs específicas por widget
        path('v2/widgets/<uuid:widget_id>/data/', api_views.DashboardWidgetViewSet.as_view({'get': 'data'}), name='widget_data'),
        path('v2/widgets/<uuid:widget_id>/refresh/', api_views.DashboardWidgetViewSet.as_view({'post': 'refresh'}), name='widget_refresh'),
        path('v2/widgets/<uuid:widget_id>/analytics/', api_views.DashboardWidgetViewSet.as_view({'get': 'analytics'}), name='widget_analytics'),
        
        # Gestión de layouts
        path('v2/layouts/<uuid:layout_id>/add-widget/', api_views.UserDashboardLayoutViewSet.as_view({'post': 'add_widget'}), name='layout_add_widget'),
        path('v2/layouts/<uuid:layout_id>/remove-widget/', api_views.UserDashboardLayoutViewSet.as_view({'delete': 'remove_widget'}), name='layout_remove_widget'),
        path('v2/layouts/<uuid:layout_id>/update/', api_views.UserDashboardLayoutViewSet.as_view({'put': 'update_layout'}), name='layout_update'),
        path('v2/layouts/<uuid:layout_id>/reset/', api_views.UserDashboardLayoutViewSet.as_view({'post': 'reset_to_default'}), name='layout_reset'),
        
        # APIs de sistema
        path('v2/system/health/', api_views.DashboardPerformanceAPIView.as_view(), name='system_health'),
        path('v2/types/', api_views.DashboardWidgetViewSet.as_view({'get': 'available_types'}), name='widget_types'),
    ]
    
    urlpatterns.extend(advanced_urls)
    
except ImportError:
    # Si no están disponibles los modelos avanzados, continuar sin ellos
    pass