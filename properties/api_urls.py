"""
URLs de la API REST para la aplicación de propiedades de VeriHome.
"""

app_name = 'properties_api'

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import api_views

# Router para ViewSets
router = DefaultRouter()
router.register(r'', api_views.PropertyViewSet, basename='property')
router.register(r'property-images', api_views.PropertyImageViewSet, basename='property-image')
router.register(r'property-videos', api_views.PropertyVideoViewSet, basename='property-video')
router.register(r'amenities', api_views.PropertyAmenityViewSet, basename='amenity')
router.register(r'inquiries', api_views.PropertyInquiryViewSet, basename='inquiry')
router.register(r'favorites', api_views.PropertyFavoriteViewSet, basename='favorite')

urlpatterns = [
    # Incluir rutas del router
    path('', include(router.urls)),
    
    # Búsqueda y filtros
    path('search/', api_views.PropertySearchAPIView.as_view(), name='api_property_search'),
    path('filters/', api_views.PropertyFiltersAPIView.as_view(), name='api_property_filters'),
    
    # Propiedades destacadas
    path('featured/', api_views.FeaturedPropertiesAPIView.as_view(), name='api_featured_properties'),
    path('trending/', api_views.TrendingPropertiesAPIView.as_view(), name='api_trending_properties'),
    
    # Estadísticas
    path('stats/', api_views.PropertyStatsAPIView.as_view(), name='api_property_stats'),
    
    # Favoritos
    path('<uuid:property_id>/toggle-favorite/', api_views.ToggleFavoriteAPIView.as_view(), name='api_toggle_favorite'),
    
    # Videos específicos
    path('property-videos/<int:video_id>/', api_views.PropertyVideoDetailAPIView.as_view(), name='api_property_video_detail'),
    path('<uuid:property_id>/videos/upload/', api_views.PropertyVideoUploadAPIView.as_view(), name='api_property_video_upload'),
]
