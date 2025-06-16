"""
Formularios para la aplicación de usuarios de VeriHome.
"""

from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm
from django.core.exceptions import ValidationError
from .models import LandlordProfile, TenantProfile, ServiceProviderProfile, InterviewCode

User = get_user_model()


class UserRegistrationForm(UserCreationForm):
    """Formulario para registro de usuarios."""
    
    interview_code = forms.CharField(
        label='Código de entrevista',
        max_length=8,
        required=True,
        help_text='Ingresa el código de entrevista que recibiste después de tu entrevista con VeriHome.'
    )
    
    class Meta:
        model = User
        fields = ('email', 'first_name', 'last_name', 'user_type', 'phone_number', 'interview_code')
        
    def clean_interview_code(self):
        code = self.cleaned_data.get('interview_code')
        email = self.cleaned_data.get('email')
        
        try:
            interview_code = InterviewCode.objects.get(code=code, email=email)
            if interview_code.is_used:
                raise ValidationError('Este código de entrevista ya ha sido utilizado.')
        except InterviewCode.DoesNotExist:
            raise ValidationError('Código de entrevista inválido o no coincide con el correo electrónico.')
        
        return code
    
    def save(self, commit=True):
        user = super().save(commit=False)
        
        # Obtener el código de entrevista y asignarlo al usuario
        code = self.cleaned_data.get('interview_code')
        interview_code = InterviewCode.objects.get(code=code)
        user.interview_code = interview_code
        user.initial_rating = interview_code.initial_rating
        
        if commit:
            user.save()
            # Marcar el código como utilizado
            interview_code.is_used = True
            interview_code.save()
            
            # Crear el perfil correspondiente según el tipo de usuario
            if user.user_type == 'landlord':
                LandlordProfile.objects.create(user=user)
            elif user.user_type == 'tenant':
                TenantProfile.objects.create(user=user)
            elif user.user_type == 'service_provider':
                ServiceProviderProfile.objects.create(user=user)
        
        return user


class InterviewCodeVerificationForm(forms.Form):
    """Formulario para verificar el código de entrevista."""
    
    interview_code = forms.CharField(
        label='Código de entrevista',
        max_length=8,
        required=True
    )
    email = forms.EmailField(
        label='Correo electrónico',
        required=True
    )
    
    def clean(self):
        cleaned_data = super().clean()
        code = cleaned_data.get('interview_code')
        email = cleaned_data.get('email')
        
        if code and email:
            try:
                interview_code = InterviewCode.objects.get(code=code, email=email)
                if interview_code.is_used:
                    raise ValidationError('Este código de entrevista ya ha sido utilizado.')
                cleaned_data['interview_code_obj'] = interview_code
            except InterviewCode.DoesNotExist:
                raise ValidationError('Código de entrevista inválido o no coincide con el correo electrónico.')
        
        return cleaned_data


class UserProfileForm(forms.ModelForm):
    """Formulario para editar el perfil básico del usuario."""
    
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'phone_number')


class BaseProfileForm(forms.ModelForm):
    """Formulario base para todos los perfiles."""
    
    class Meta:
        fields = ('bio', 'profile_image', 'address', 'city', 'state', 'country', 
                  'postal_code', 'identification_document', 'proof_of_address')


class LandlordProfileForm(BaseProfileForm):
    """Formulario para editar el perfil de arrendador."""
    
    class Meta(BaseProfileForm.Meta):
        model = LandlordProfile
        fields = BaseProfileForm.Meta.fields + ('company_name', 'years_experience', 
                                               'property_ownership_docs', 'business_license')


class TenantProfileForm(BaseProfileForm):
    """Formulario para editar el perfil de arrendatario."""
    
    class Meta(BaseProfileForm.Meta):
        model = TenantProfile
        fields = BaseProfileForm.Meta.fields + ('employment_status', 'employer_name', 
                                               'emergency_contact_name', 'emergency_contact_phone')


class ServiceProviderProfileForm(BaseProfileForm):
    """Formulario para editar el perfil de prestador de servicios."""
    
    class Meta(BaseProfileForm.Meta):
        model = ServiceProviderProfile
        fields = BaseProfileForm.Meta.fields + ('service_category', 'business_name', 
                                               'years_experience', 'hourly_rate', 'service_description')