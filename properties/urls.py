"""
URLs para la aplicación de propiedades de VeriHome.
Incluye listados, detalles, búsqueda y gestión de propiedades.
"""

from django.urls import path
from . import views

app_name = 'properties'

urlpatterns = [
    # Listado y búsqueda de propiedades
    path('', views.PropertyListView.as_view(), name='list'),
    path('buscar/', views.PropertySearchView.as_view(), name='search'),
    path('mapa/', views.PropertyMapView.as_view(), name='map'),
    path('destacadas/', views.FeaturedPropertiesView.as_view(), name='featured'),
    
    # Detalles de propiedad
    path('<uuid:pk>/', views.PropertyDetailView.as_view(), name='detail'),
    path('<uuid:pk>/galeria/', views.PropertyGalleryView.as_view(), name='gallery'),
    path('<uuid:pk>/tour-virtual/', views.VirtualTourView.as_view(), name='virtual_tour'),
    
    # Gestión de propiedades (para arrendadores)
    path('mis-propiedades/', views.MyPropertiesView.as_view(), name='my_properties'),
    path('nueva/', views.CreatePropertyView.as_view(), name='create'),
    path('<uuid:pk>/editar/', views.EditPropertyView.as_view(), name='edit'),
    path('<uuid:pk>/eliminar/', views.DeletePropertyView.as_view(), name='delete'),
    path('<uuid:pk>/activar/', views.ActivatePropertyView.as_view(), name='activate'),
    path('<uuid:pk>/desactivar/', views.DeactivatePropertyView.as_view(), name='deactivate'),
    
    # Gestión de imágenes
    path('<uuid:property_pk>/imagenes/', views.PropertyImageManagementView.as_view(), name='manage_images'),
    path('<uuid:property_pk>/imagenes/subir/', views.UploadPropertyImagesView.as_view(), name='upload_images'),
    path('imagen/<int:image_pk>/eliminar/', views.DeletePropertyImageView.as_view(), name='delete_image'),
    path('imagen/<int:image_pk>/principal/', views.SetMainImageView.as_view(), name='set_main_image'),
    
    # Gestión de videos
    path('<uuid:property_pk>/videos/', views.PropertyVideoManagementView.as_view(), name='manage_videos'),
    path('<uuid:property_pk>/videos/subir/', views.UploadPropertyVideoView.as_view(), name='upload_video'),
    path('video/<int:video_pk>/eliminar/', views.DeletePropertyVideoView.as_view(), name='delete_video'),
    
    # Amenidades
    path('<uuid:pk>/amenidades/', views.PropertyAmenitiesView.as_view(), name='amenities'),
    path('<uuid:pk>/amenidades/editar/', views.EditPropertyAmenitiesView.as_view(), name='edit_amenities'),
    
    # Consultas e interacciones
    path('<uuid:pk>/consultar/', views.PropertyInquiryView.as_view(), name='inquire'),
    path('<uuid:pk>/favoritos/agregar/', views.AddToFavoritesView.as_view(), name='add_favorite'),
    path('<uuid:pk>/favoritos/quitar/', views.RemoveFromFavoritesView.as_view(), name='remove_favorite'),
    path('<uuid:pk>/compartir/', views.SharePropertyView.as_view(), name='share'),
    path('<uuid:pk>/reportar/', views.ReportPropertyView.as_view(), name='report'),
    
    # Comparación de propiedades
    path('comparar/', views.ComparePropertiesView.as_view(), name='compare'),
    path('comparar/agregar/<uuid:pk>/', views.AddToComparisonView.as_view(), name='add_to_comparison'),
    path('comparar/quitar/<uuid:pk>/', views.RemoveFromComparisonView.as_view(), name='remove_from_comparison'),
    
    # Mis favoritos
    path('mis-favoritos/', views.MyFavoritesView.as_view(), name='my_favorites'),
    
    # Consultas recibidas (para arrendadores)
    path('consultas/', views.ReceivedInquiriesView.as_view(), name='received_inquiries'),
    path('consulta/<int:inquiry_pk>/', views.InquiryDetailView.as_view(), name='inquiry_detail'),
    path('consulta/<int:inquiry_pk>/responder/', views.RespondInquiryView.as_view(), name='respond_inquiry'),
    
    # Filtros avanzados
    path('filtros/', views.AdvancedFiltersView.as_view(), name='advanced_filters'),
    
    # Búsquedas guardadas
    path('busquedas-guardadas/', views.SavedSearchesView.as_view(), name='saved_searches'),
    path('busqueda/guardar/', views.SaveSearchView.as_view(), name='save_search'),
    path('busqueda/<int:search_pk>/eliminar/', views.DeleteSavedSearchView.as_view(), name='delete_saved_search'),
    
    # Alertas de propiedades
    path('alertas/', views.PropertyAlertsView.as_view(), name='alerts'),
    path('alerta/crear/', views.CreatePropertyAlertView.as_view(), name='create_alert'),
    path('alerta/<int:alert_pk>/eliminar/', views.DeletePropertyAlertView.as_view(), name='delete_alert'),
    
    # Analytics para propiedades
    path('<uuid:pk>/estadisticas/', views.PropertyStatsView.as_view(), name='stats'),
    
    # Exportar información
    path('<uuid:pk>/exportar-pdf/', views.ExportPropertyPDFView.as_view(), name='export_pdf'),
]
