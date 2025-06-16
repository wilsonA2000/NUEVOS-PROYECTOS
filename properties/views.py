"""
Vistas para la aplicación de propiedades de VeriHome.
"""

from django.shortcuts import render
from django.views.generic import TemplateView, ListView, DetailView
from django.contrib.auth.mixins import LoginRequiredMixin

from .models import Property


class PropertyListView(ListView):
    """Vista de lista de propiedades."""
    model = Property
    template_name = 'properties/list.html'
    context_object_name = 'properties'
    paginate_by = 12
    
    def get_queryset(self):
        return Property.objects.filter(is_active=True, status='available')


class PropertyDetailView(DetailView):
    """Vista de detalle de propiedad."""
    model = Property
    template_name = 'properties/detail.html'
    context_object_name = 'property'


class PropertySearchView(TemplateView):
    """Vista de búsqueda de propiedades."""
    template_name = 'properties/search.html'


class PropertyMapView(TemplateView):
    """Vista de mapa de propiedades."""
    template_name = 'properties/map.html'


class FeaturedPropertiesView(ListView):
    """Vista de propiedades destacadas."""
    model = Property
    template_name = 'properties/featured.html'
    context_object_name = 'properties'
    
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


class PropertyGalleryView(DetailView):
    """Vista de galería de propiedad."""
    model = Property
    template_name = 'properties/gallery.html'
    context_object_name = 'property'


class VirtualTourView(DetailView):
    """Vista de tour virtual."""
    model = Property
    template_name = 'properties/virtual_tour.html'
    context_object_name = 'property'


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


class PropertyAmenitiesView(DetailView):
    """Vista de amenidades de propiedad."""
    model = Property
    template_name = 'properties/amenities.html'
    context_object_name = 'property'


class EditPropertyAmenitiesView(LoginRequiredMixin, TemplateView):
    """Vista para editar amenidades."""
    template_name = 'properties/edit_amenities.html'


class PropertyInquiryView(TemplateView):
    """Vista para consultar propiedad."""
    template_name = 'properties/inquire.html'


class AddToFavoritesView(LoginRequiredMixin, TemplateView):
    """Vista para agregar a favoritos."""
    template_name = 'properties/add_favorite.html'


class RemoveFromFavoritesView(LoginRequiredMixin, TemplateView):
    """Vista para quitar de favoritos."""
    template_name = 'properties/remove_favorite.html'


class SharePropertyView(TemplateView):
    """Vista para compartir propiedad."""
    template_name = 'properties/share.html'


class ReportPropertyView(TemplateView):
    """Vista para reportar propiedad."""
    template_name = 'properties/report.html'


class ComparePropertiesView(TemplateView):
    """Vista para comparar propiedades."""
    template_name = 'properties/compare.html'


class AddToComparisonView(TemplateView):
    """Vista para agregar a comparación."""
    template_name = 'properties/add_to_comparison.html'


class RemoveFromComparisonView(TemplateView):
    """Vista para quitar de comparación."""
    template_name = 'properties/remove_from_comparison.html'


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


class AdvancedFiltersView(TemplateView):
    """Vista de filtros avanzados."""
    template_name = 'properties/advanced_filters.html'


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
