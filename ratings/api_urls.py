"""
URLs para la API de calificaciones de VeriHome.
"""

from django.urls import path
from . import views

app_name = 'ratings_api'

urlpatterns = [
    path('ratings/', views.RatingListCreateView.as_view(), name='rating_list_create'),
    path('ratings/<uuid:pk>/', views.RatingDetailView.as_view(), name='rating_detail'),
    path('ratings/<uuid:rating_id>/response/', views.RatingResponseCreateView.as_view(), name='rating_response_create'),
    path('ratings/<uuid:rating_id>/report/', views.RatingReportCreateView.as_view(), name='rating_report_create'),
    path('users/<uuid:user_id>/ratings/', views.UserRatingsView.as_view(), name='user_ratings'),
    path('users/<uuid:user_id>/rating-profile/', views.UserRatingProfileView.as_view(), name='user_rating_profile'),
    path('contracts/<uuid:contract_id>/ratings/', views.ContractRatingsView.as_view(), name='contract_ratings'),
    path('ratings/categories/', views.RatingCategoryListCreateView.as_view(), name='rating_category_list_create'),
]