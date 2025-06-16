"""
URLs para el módulo de calificaciones de VeriHome.
"""

from django.urls import path, include
from . import views

app_name = 'ratings'

urlpatterns = [
    path('api/', include('ratings.api_urls')),
    path('', views.rating_dashboard, name='dashboard'),
    path('user/<uuid:user_id>/', views.user_ratings, name='user_ratings'),
    path('create/<uuid:contract_id>/', views.create_rating, name='create_rating'),
    path('detail/<uuid:rating_id>/', views.rating_detail, name='rating_detail'),
    path('respond/<uuid:rating_id>/', views.respond_to_rating, name='respond_to_rating'),
    path('report/<uuid:rating_id>/', views.report_rating, name='report_rating'),
]