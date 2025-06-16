"""
Vistas para la aplicación de usuarios de VeriHome.
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.views.generic import TemplateView, ListView, DetailView, CreateView, UpdateView, FormView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth import get_user_model
from django.urls import reverse_lazy
from django.contrib import messages
from django.db import transaction
from django.http import HttpResponseRedirect

from .models import LandlordProfile, TenantProfile, ServiceProviderProfile, InterviewCode
from .forms import (
    UserRegistrationForm, InterviewCodeVerificationForm, UserProfileForm,
    LandlordProfileForm, TenantProfileForm, ServiceProviderProfileForm
)

User = get_user_model()


class RegisterSelectView(TemplateView):
    """Vista para seleccionar el tipo de usuario para registro."""
    template_name = 'users/register_select.html'


class InterviewCodeVerificationView(FormView):
    """Vista para verificar el código de entrevista."""
    template_name = 'users/register_interview.html'
    form_class = InterviewCodeVerificationForm
    success_url = reverse_lazy('users:register')
    
    def form_valid(self, form):
        # Guardar el código de entrevista en la sesión
        self.request.session['interview_code'] = form.cleaned_data['interview_code']
        self.request.session['interview_email'] = form.cleaned_data['email']
        return super().form_valid(form)


class UserRegistrationView(CreateView):
    """Vista para registro de usuarios."""
    model = User
    form_class = UserRegistrationForm
    template_name = 'users/register_form.html'
    success_url = reverse_lazy('account_login')
    
    def dispatch(self, request, *args, **kwargs):
        # Verificar si hay un código de entrevista en la sesión
        if not request.session.get('interview_code') or not request.session.get('interview_email'):
            messages.error(request, 'Debes verificar un código de entrevista antes de registrarte.')
            return redirect('users:interview_verification')
        return super().dispatch(request, *args, **kwargs)
    
    def get_initial(self):
        initial = super().get_initial()
        initial['interview_code'] = self.request.session.get('interview_code')
        initial['email'] = self.request.session.get('interview_email')
        return initial
    
    def form_valid(self, form):
        response = super().form_valid(form)
        messages.success(self.request, 'Tu cuenta ha sido creada exitosamente. Ahora puedes iniciar sesión.')
        
        # Limpiar la sesión
        if 'interview_code' in self.request.session:
            del self.request.session['interview_code']
        if 'interview_email' in self.request.session:
            del self.request.session['interview_email']
            
        return response


class ProfileView(LoginRequiredMixin, DetailView):
    """Vista para ver el perfil de usuario."""
    model = User
    template_name = 'users/profile.html'
    context_object_name = 'profile_user'
    
    def get_object(self):
        return self.request.user
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.get_object()
        
        # Obtener el perfil específico según el tipo de usuario
        profile = user.get_profile()
        context['profile'] = profile
        
        # Obtener estadísticas adicionales
        from contracts.models import Contract
        context['contracts_count'] = Contract.objects.filter(
            primary_party=user
        ).count() + Contract.objects.filter(
            secondary_party=user
        ).count()
        
        return context


class ProfileEditView(LoginRequiredMixin, UpdateView):
    """Vista para editar el perfil de usuario."""
    template_name = 'users/profile_edit.html'
    success_url = reverse_lazy('users:profile')
    
    def get_object(self):
        return self.request.user
    
    def get_form_class(self):
        return UserProfileForm
    
    def get_profile_form_class(self):
        user = self.get_object()
        if user.user_type == 'landlord':
            return LandlordProfileForm
        elif user.user_type == 'tenant':
            return TenantProfileForm
        elif user.user_type == 'service_provider':
            return ServiceProviderProfileForm
        return None
    
    def get_profile(self):
        user = self.get_object()
        profile = user.get_profile()
        
        # Si el perfil no existe, crearlo
        if not profile:
            if user.user_type == 'landlord':
                profile = LandlordProfile.objects.create(user=user)
            elif user.user_type == 'tenant':
                profile = TenantProfile.objects.create(user=user)
            elif user.user_type == 'service_provider':
                profile = ServiceProviderProfile.objects.create(user=user)
        
        return profile
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        if 'profile_form' not in context:
            profile_form_class = self.get_profile_form_class()
            if profile_form_class:
                context['profile_form'] = profile_form_class(instance=self.get_profile())
        
        user = self.get_object()
        if user.user_type == 'tenant':
            context['employment_status_choices'] = TenantProfile.EMPLOYMENT_STATUS
        elif user.user_type == 'service_provider':
            context['service_category_choices'] = ServiceProviderProfile.SERVICE_CATEGORIES
        
        return context
    
    def post(self, request, *args, **kwargs):
        self.object = self.get_object()
        
        form = self.get_form()
        profile_form_class = self.get_profile_form_class()
        profile_form = profile_form_class(request.POST, request.FILES, instance=self.get_profile())
        
        if form.is_valid() and profile_form.is_valid():
            return self.form_valid(form, profile_form)
        else:
            return self.form_invalid(form, profile_form)
    
    def form_valid(self, form, profile_form):
        with transaction.atomic():
            form.save()
            profile_form.save()
        
        messages.success(self.request, 'Tu perfil ha sido actualizado exitosamente.')
        return HttpResponseRedirect(self.get_success_url())
    
    def form_invalid(self, form, profile_form):
        return self.render_to_response(
            self.get_context_data(form=form, profile_form=profile_form)
        )


class SettingsView(LoginRequiredMixin, TemplateView):
    """Vista para configuración de la cuenta."""
    template_name = 'users/settings.html'


class ServiceProviderListView(ListView):
    """Vista para listar proveedores de servicios."""
    model = ServiceProviderProfile
    template_name = 'users/service_provider_list.html'
    context_object_name = 'service_providers'
    
    def get_queryset(self):
        return ServiceProviderProfile.objects.filter(
            user__is_active=True
        ).select_related('user')


class ResendVerificationEmailView(TemplateView):
    """Vista para reenviar correo de verificación."""
    template_name = 'account/email_resend.html'


class DirectRegisterView(TemplateView):
    """Vista para registro directo (solo para desarrollo)."""
    template_name = 'users/direct_register.html'