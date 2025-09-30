"""
URLs para el sistema de servicios adicionales.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api_views import (
    ServiceCategoryViewSet, ServiceViewSet, ServiceRequestViewSet,
    PopularServicesListView, FeaturedServicesListView, 
    MostRequestedServicesListView, ServicesByCategoryListView,
    ServiceSearchView
)

app_name = 'services'

# Router para ViewSets
router = DefaultRouter()
router.register(r'categories', ServiceCategoryViewSet, basename='categories')
router.register(r'services', ServiceViewSet, basename='services')
router.register(r'requests', ServiceRequestViewSet, basename='requests')

urlpatterns = [
    # API endpoints (sin prefijo extra /api/ porque ya está en /api/v1/services/)
    path('', include(router.urls)),
    
    # Endpoints específicos
    path('popular/', PopularServicesListView.as_view(), name='popular-services'),
    path('featured/', FeaturedServicesListView.as_view(), name='featured-services'),
    path('most-requested/', MostRequestedServicesListView.as_view(), name='most-requested-services'),
    path('category/<slug:category_slug>/', ServicesByCategoryListView.as_view(), name='services-by-category'),
    path('search/', ServiceSearchView.as_view(), name='service-search'),
]