"""
Vistas para la aplicación de usuarios de VeriHome.
"""

from django.shortcuts import render, redirect
from django.views.generic import TemplateView, CreateView, UpdateView, DetailView, ListView, FormView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.urls import reverse_lazy
from django import forms
from allauth.account.models import EmailAddress
from allauth.account.utils import send_email_confirmation

from .models import User, LandlordProfile, TenantProfile, ServiceProviderProfile
from .forms import LandlordRegistrationForm, TenantRegistrationForm, ServiceProviderRegistrationForm


class UserTypeSelectionView(TemplateView):
    """Vista para seleccionar el tipo de usuario durante el registro."""
    template_name = 'users/register_select.html'


class LandlordRegistrationView(CreateView):
    """Vista de registro para arrendadores."""
    template_name = 'users/register_landlord_fixed.html'
    form_class = LandlordRegistrationForm
    success_url = reverse_lazy('account_login')
    
    def form_valid(self, form):
        user = form.save()
        
        # Crear perfil de arrendador con los datos adicionales
        property_types = form.cleaned_data.get('property_types', [])
        
        # Convertir valores de texto a números
        total_properties_value = form.cleaned_data.get('total_properties', '0')
        if total_properties_value == '25+':
            total_properties = 25
        else:
            try:
                total_properties = int(total_properties_value) if total_properties_value else 0
            except ValueError:
                total_properties = 0
                
        years_experience_value = form.cleaned_data.get('years_experience', '0')
        if years_experience_value == '10+':
            years_experience = 10
        else:
            try:
                years_experience = int(years_experience_value) if years_experience_value else 0
            except ValueError:
                years_experience = 0
        
        LandlordProfile.objects.create(
            user=user,
            company_name=form.cleaned_data.get('company_name', ''),
            total_properties=total_properties,
            years_experience=years_experience,
            property_types=property_types
        )
        
        messages.success(self.request, 'Tu cuenta de arrendador ha sido creada exitosamente. Ahora puedes iniciar sesión.')
        return super().form_valid(form)


class TenantRegistrationView(CreateView):
    """Vista de registro para arrendatarios."""
    template_name = 'users/register_form.html'
    form_class = TenantRegistrationForm
    success_url = reverse_lazy('account_login')
    
    def form_valid(self, form):
        user = form.save()
        
        # Crear perfil de arrendatario
        TenantProfile.objects.create(
            user=user
        )
        
        messages.success(self.request, 'Tu cuenta de arrendatario ha sido creada exitosamente. Ahora puedes iniciar sesión.')
        return super().form_valid(form)


class ServiceProviderRegistrationView(CreateView):
    """Vista de registro para prestadores de servicios."""
    template_name = 'users/register_form.html'
    form_class = ServiceProviderRegistrationForm
    success_url = reverse_lazy('account_login')
    
    def form_valid(self, form):
        user = form.save()
        
        # Crear perfil de prestador de servicios
        ServiceProviderProfile.objects.create(
            user=user,
            service_category='maintenance'  # Valor por defecto
        )
        
        messages.success(self.request, 'Tu cuenta de prestador de servicios ha sido creada exitosamente. Ahora puedes iniciar sesión.')
        return super().form_valid(form)


class ProfileView(LoginRequiredMixin, TemplateView):
    """Vista del perfil del usuario."""
    template_name = 'users/profile.html'


class EditProfileView(LoginRequiredMixin, TemplateView):
    """Vista para editar el perfil del usuario."""
    template_name = 'users/edit_profile.html'


class PublicProfileView(DetailView):
    """Vista pública del perfil de un usuario."""
    model = User
    template_name = 'users/public_profile.html'
    context_object_name = 'profile_user'


class VerificationView(LoginRequiredMixin, TemplateView):
    """Vista de verificación de usuario."""
    template_name = 'users/verification.html'


class DocumentVerificationView(LoginRequiredMixin, TemplateView):
    """Vista para verificación de documentos."""
    template_name = 'users/document_verification.html'


class IdentityVerificationView(LoginRequiredMixin, TemplateView):
    """Vista para verificación de identidad."""
    template_name = 'users/identity_verification.html'


class AccountSettingsView(LoginRequiredMixin, TemplateView):
    """Vista de configuración de cuenta."""
    template_name = 'users/settings.html'


class PrivacySettingsView(LoginRequiredMixin, TemplateView):
    """Vista de configuración de privacidad."""
    template_name = 'users/privacy_settings.html'


class NotificationSettingsView(LoginRequiredMixin, TemplateView):
    """Vista de configuración de notificaciones."""
    template_name = 'users/notification_settings.html'


class SecuritySettingsView(LoginRequiredMixin, TemplateView):
    """Vista de configuración de seguridad."""
    template_name = 'users/security_settings.html'


class PortfolioView(LoginRequiredMixin, TemplateView):
    """Vista del portafolio (para prestadores de servicios)."""
    template_name = 'users/portfolio.html'


class AddPortfolioItemView(LoginRequiredMixin, TemplateView):
    """Vista para agregar elemento al portafolio."""
    template_name = 'users/add_portfolio_item.html'


class EditPortfolioItemView(LoginRequiredMixin, TemplateView):
    """Vista para editar elemento del portafolio."""
    template_name = 'users/edit_portfolio_item.html'


class DeletePortfolioItemView(LoginRequiredMixin, TemplateView):
    """Vista para eliminar elemento del portafolio."""
    template_name = 'users/delete_portfolio_item.html'


class LandlordListView(ListView):
    """Vista de lista de arrendadores."""
    model = User
    template_name = 'users/landlord_list.html'
    context_object_name = 'landlords'
    
    def get_queryset(self):
        return User.objects.filter(user_type='landlord', is_active=True)


class ServiceProviderListView(ListView):
    """Vista de lista de prestadores de servicios."""
    model = User
    template_name = 'users/service_provider_list.html'
    context_object_name = 'service_providers'
    
    def get_queryset(self):
        return User.objects.filter(user_type='service_provider', is_active=True)


class ServiceProviderSearchView(TemplateView):
    """Vista de búsqueda de prestadores de servicios."""
    template_name = 'users/search_service_providers.html'


class UserActivityView(LoginRequiredMixin, TemplateView):
    """Vista de actividad del usuario."""
    template_name = 'users/activity.html'


class FavoritesView(LoginRequiredMixin, TemplateView):
    """Vista de favoritos del usuario."""
    template_name = 'users/favorites.html'


class ResendVerificationEmailForm(forms.Form):
    """Formulario para reenviar correo de verificación."""
    email = forms.EmailField(
        label="Correo electrónico",
        widget=forms.EmailInput(attrs={'class': 'w-full px-4 py-2 border border-gray-300 rounded-lg'})
    )


class ResendVerificationEmailView(FormView):
    """Vista para reenviar correo de verificación."""
    template_name = 'account/email_resend.html'
    form_class = ResendVerificationEmailForm
    success_url = reverse_lazy('account_login')
    
    def form_valid(self, form):
        email = form.cleaned_data['email']
        try:
            email_address = EmailAddress.objects.get(email=email)
            if not email_address.verified:
                send_email_confirmation(self.request, email_address.user)
                messages.success(
                    self.request, 
                    "Se ha enviado un nuevo correo de verificación a tu dirección de correo electrónico."
                )
            else:
                messages.info(
                    self.request, 
                    "Esta dirección de correo electrónico ya está verificada. Puedes iniciar sesión."
                )
        except EmailAddress.DoesNotExist:
            messages.error(
                self.request, 
                "No se encontró ninguna cuenta con esta dirección de correo electrónico."
            )
        
        return super().form_valid(form)
