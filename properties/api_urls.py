"""
URLs de la API REST para la aplicación de propiedades de VeriHome.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Router para ViewSets
router = DefaultRouter()
router.register(r'properties', api_views.PropertyViewSet)
router.register(r'property-images', api_views.PropertyImageViewSet)
router.register(r'property-videos', api_views.PropertyVideoViewSet)
router.register(r'amenities', api_views.PropertyAmenityViewSet)
router.register(r'inquiries', api_views.PropertyInquiryViewSet)
router.register(r'favorites', api_views.PropertyFavoriteViewSet)

urlpatterns = [
    # Incluir rutas del router
    path('', include(router.urls)),
    
    # Búsqueda y filtros
    path('search/', api_views.PropertySearchAPIView.as_view(), name='api_property_search'),
    path('search/advanced/', api_views.AdvancedPropertySearchAPIView.as_view(), name='api_advanced_search'),
    path('filters/', api_views.PropertyFiltersAPIView.as_view(), name='api_property_filters'),
    
    # Mapa de propiedades
    path('map/', api_views.PropertyMapAPIView.as_view(), name='api_property_map'),
    path('map/bounds/', api_views.PropertyMapBoundsAPIView.as_view(), name='api_property_map_bounds'),
    
    # Propiedades destacadas
    path('featured/', api_views.FeaturedPropertiesAPIView.as_view(), name='api_featured_properties'),
    path('trending/', api_views.TrendingPropertiesAPIView.as_view(), name='api_trending_properties'),
    
    # Gestión de imágenes
    path('<uuid:property_pk>/images/upload/', api_views.UploadPropertyImagesAPIView.as_view(), name='api_upload_images'),
    path('image/<int:image_pk>/set-main/', api_views.SetMainImageAPIView.as_view(), name='api_set_main_image'),
    
    # Estadísticas
    path('<uuid:property_pk>/stats/', api_views.PropertyStatsAPIView.as_view(), name='api_property_stats'),
    path('analytics/', api_views.PropertyAnalyticsAPIView.as_view(), name='api_property_analytics'),
    
    # Comparación
    path('compare/', api_views.ComparePropertiesAPIView.as_view(), name='api_compare_properties'),
]
