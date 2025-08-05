"""
URLs para el sistema de códigos de entrevista.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api_interview import (
    ValidateInterviewCodeView,
    ContactRequestView,
    RegisterWithCodeView,
    InterviewCodeViewSet,
    ContactRequestViewSet
)

app_name = 'interview'

# Router para ViewSets
router = DefaultRouter()
router.register(r'codes', InterviewCodeViewSet, basename='interview-codes')
router.register(r'contact-requests', ContactRequestViewSet, basename='contact-requests')

urlpatterns = [
    # APIs públicas
    path('validate-interview-code/', ValidateInterviewCodeView.as_view(), name='validate-code'),
    path('contact/', ContactRequestView.as_view(), name='contact-request'),
    path('register-with-code/', RegisterWithCodeView.as_view(), name='register-with-code'),
    
    # APIs administrativas
    path('admin/', include(router.urls)),
]