"""
URLs para el sistema de solicitudes de VeriHome.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .api_views import (
    BaseRequestViewSet, PropertyInterestRequestViewSet,
    ServiceRequestViewSet, ContractSignatureRequestViewSet,
    MaintenanceRequestViewSet, RequestNotificationViewSet,
    RequestCommentViewSet
)

app_name = 'requests'

# Router principal
router = DefaultRouter()
router.register(r'base', BaseRequestViewSet, basename='base-requests')
router.register(r'property-interest', PropertyInterestRequestViewSet, basename='property-interest')
router.register(r'services', ServiceRequestViewSet, basename='service-requests')
router.register(r'contracts', ContractSignatureRequestViewSet, basename='contract-requests')
router.register(r'maintenance', MaintenanceRequestViewSet, basename='maintenance-requests')
router.register(r'notifications', RequestNotificationViewSet, basename='request-notifications')

urlpatterns = [
    # API endpoints
    path('api/', include(router.urls)),
    # Comments endpoints (simplified without nesting)
    path('api/base/<str:request_pk>/comments/', RequestCommentViewSet.as_view({'get': 'list', 'post': 'create'}), name='request-comments-list'),
    path('api/base/<str:request_pk>/comments/<str:pk>/', RequestCommentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'delete': 'destroy'}), name='request-comments-detail'),
    
    # Document management APIs
    path('api/documents/', include('requests.document_urls')),
]