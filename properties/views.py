"""
Vistas para la aplicación de propiedades de VeriHome.
"""

from django.shortcuts import render
from django.views.generic import TemplateView, ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin

from .models import Property


class PropertyListView(LoginRequiredMixin, ListView):
    """Vista de lista de propiedades. Requiere autenticación."""
    model = Property
    template_name = 'properties/list.html'
    context_object_name = 'properties'
    paginate_by = 12
    login_url = '/accounts/login/'
    redirect_field_name = 'next'
    
    def get_queryset(self):
        return Property.objects.filter(is_active=True, status='available')


class PropertyDetailView(LoginRequiredMixin, DetailView):
    """Vista de detalle de propiedad. Requiere autenticación."""
    model = Property
    template_name = 'properties/detail.html'
    context_object_name = 'property'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class PropertySearchView(LoginRequiredMixin, TemplateView):
    """Vista de búsqueda de propiedades. Requiere autenticación."""
    template_name = 'properties/search.html'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class PropertyMapView(LoginRequiredMixin, TemplateView):
    """Vista de mapa de propiedades. Requiere autenticación."""
    template_name = 'properties/map.html'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class FeaturedPropertiesView(LoginRequiredMixin, ListView):
    """Vista de propiedades destacadas. Requiere autenticación."""
    model = Property
    template_name = 'properties/featured.html'
    context_object_name = 'properties'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'
    
    def get_queryset(self):
        return Property.objects.filter(is_featured=True, is_active=True)


class MyPropertiesView(LoginRequiredMixin, ListView):
    """Vista de mis propiedades (para arrendadores)."""
    model = Property
    template_name = 'properties/my_properties.html'
    context_object_name = 'properties'
    
    def get_queryset(self):
        return Property.objects.filter(landlord=self.request.user)


class CreatePropertyView(LoginRequiredMixin, TemplateView):
    """Vista para crear nueva propiedad."""
    template_name = 'properties/create.html'


class EditPropertyView(LoginRequiredMixin, TemplateView):
    """Vista para editar propiedad."""
    template_name = 'properties/edit.html'


class DeletePropertyView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar propiedad."""
    template_name = 'properties/delete.html'


class ActivatePropertyView(LoginRequiredMixin, TemplateView):
    """Vista para activar propiedad."""
    template_name = 'properties/activate.html'


class DeactivatePropertyView(LoginRequiredMixin, TemplateView):
    """Vista para desactivar propiedad."""
    template_name = 'properties/deactivate.html'


class PropertyGalleryView(LoginRequiredMixin, DetailView):
    """Vista de galería de propiedad. Requiere autenticación."""
    model = Property
    template_name = 'properties/gallery.html'
    context_object_name = 'property'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class VirtualTourView(LoginRequiredMixin, DetailView):
    """Vista de tour virtual. Requiere autenticación."""
    model = Property
    template_name = 'properties/virtual_tour.html'
    context_object_name = 'property'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class PropertyImageManagementView(LoginRequiredMixin, TemplateView):
    """Vista para gestión de imágenes."""
    template_name = 'properties/manage_images.html'


class UploadPropertyImagesView(LoginRequiredMixin, TemplateView):
    """Vista para subir imágenes."""
    template_name = 'properties/upload_images.html'


class DeletePropertyImageView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar imagen."""
    template_name = 'properties/delete_image.html'


class SetMainImageView(LoginRequiredMixin, TemplateView):
    """Vista para establecer imagen principal."""
    template_name = 'properties/set_main_image.html'


class PropertyVideoManagementView(LoginRequiredMixin, TemplateView):
    """Vista para gestión de videos."""
    template_name = 'properties/manage_videos.html'


class UploadPropertyVideoView(LoginRequiredMixin, TemplateView):
    """Vista para subir video."""
    template_name = 'properties/upload_video.html'


class DeletePropertyVideoView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar video."""
    template_name = 'properties/delete_video.html'


class PropertyAmenitiesView(LoginRequiredMixin, DetailView):
    """Vista de amenidades de propiedad. Requiere autenticación."""
    model = Property
    template_name = 'properties/amenities.html'
    context_object_name = 'property'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class EditPropertyAmenitiesView(LoginRequiredMixin, TemplateView):
    """Vista para editar amenidades."""
    template_name = 'properties/edit_amenities.html'


class PropertyInquiryView(LoginRequiredMixin, TemplateView):
    """Vista para consultar propiedad. Requiere autenticación."""
    template_name = 'properties/inquire.html'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class AddToFavoritesView(LoginRequiredMixin, TemplateView):
    """Vista para agregar a favoritos."""
    template_name = 'properties/add_favorite.html'


class RemoveFromFavoritesView(LoginRequiredMixin, TemplateView):
    """Vista para quitar de favoritos."""
    template_name = 'properties/remove_favorite.html'


class SharePropertyView(LoginRequiredMixin, TemplateView):
    """Vista para compartir propiedad. Requiere autenticación."""
    template_name = 'properties/share.html'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class ReportPropertyView(LoginRequiredMixin, TemplateView):
    """Vista para reportar propiedad. Requiere autenticación."""
    template_name = 'properties/report.html'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class ComparePropertiesView(LoginRequiredMixin, TemplateView):
    """Vista para comparar propiedades. Requiere autenticación."""
    template_name = 'properties/compare.html'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class AddToComparisonView(LoginRequiredMixin, TemplateView):
    """Vista para agregar a comparación. Requiere autenticación."""
    template_name = 'properties/add_to_comparison.html'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class RemoveFromComparisonView(LoginRequiredMixin, TemplateView):
    """Vista para quitar de comparación. Requiere autenticación."""
    template_name = 'properties/remove_from_comparison.html'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class MyFavoritesView(LoginRequiredMixin, TemplateView):
    """Vista de mis favoritos."""
    template_name = 'properties/my_favorites.html'


class ReceivedInquiriesView(LoginRequiredMixin, TemplateView):
    """Vista de consultas recibidas."""
    template_name = 'properties/received_inquiries.html'


class InquiryDetailView(LoginRequiredMixin, TemplateView):
    """Vista de detalle de consulta."""
    template_name = 'properties/inquiry_detail.html'


class RespondInquiryView(LoginRequiredMixin, TemplateView):
    """Vista para responder consulta."""
    template_name = 'properties/respond_inquiry.html'


class AdvancedFiltersView(LoginRequiredMixin, TemplateView):
    """Vista de filtros avanzados. Requiere autenticación."""
    template_name = 'properties/advanced_filters.html'
    login_url = '/accounts/login/'
    redirect_field_name = 'next'


class SavedSearchesView(LoginRequiredMixin, TemplateView):
    """Vista de búsquedas guardadas."""
    template_name = 'properties/saved_searches.html'


class SaveSearchView(LoginRequiredMixin, TemplateView):
    """Vista para guardar búsqueda."""
    template_name = 'properties/save_search.html'


class DeleteSavedSearchView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar búsqueda guardada."""
    template_name = 'properties/delete_saved_search.html'


class PropertyAlertsView(LoginRequiredMixin, TemplateView):
    """Vista de alertas de propiedades."""
    template_name = 'properties/alerts.html'


class CreatePropertyAlertView(LoginRequiredMixin, TemplateView):
    """Vista para crear alerta."""
    template_name = 'properties/create_alert.html'


class DeletePropertyAlertView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar alerta."""
    template_name = 'properties/delete_alert.html'


class PropertyStatsView(LoginRequiredMixin, TemplateView):
    """Vista de estadísticas de propiedad."""
    template_name = 'properties/stats.html'


class ExportPropertyPDFView(LoginRequiredMixin, TemplateView):
    """Vista para exportar propiedad a PDF."""
    template_name = 'properties/export_pdf.html'
