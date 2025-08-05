"""
Formularios para la aplicación de usuarios de VeriHome.
"""

from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import UserCreationForm
from django.core.exceptions import ValidationError
from .models import LandlordProfile, TenantProfile, ServiceProviderProfile, InterviewCode, UserResume

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
            interview_code = InterviewCode.objects.get(interview_code=code, candidate_email=email)
            if interview_code.status == 'used':
                raise ValidationError('Este código de entrevista ya ha sido utilizado.')
        except InterviewCode.DoesNotExist:
            raise ValidationError('Código de entrevista inválido o no coincide con el correo electrónico.')
        
        return code
    
    def save(self, commit=True):
        user = super().save(commit=False)
        
        # Obtener el código de entrevista y asignarlo al usuario
        code = self.cleaned_data.get('interview_code')
        interview_code = InterviewCode.objects.get(interview_code=code)
        user.interview_code = interview_code
        user.initial_rating = interview_code.interview_rating or 0
        
        if commit:
            user.save()
            # Marcar el código como utilizado
            interview_code.status = 'used'
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
                interview_code = InterviewCode.objects.get(interview_code=code, candidate_email=email)
                if interview_code.status == 'used':
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
        fields = BaseProfileForm.Meta.fields + ('company_name', 'service_types', 
                                               'years_experience', 'hourly_rate', 'service_areas')


class UserResumeForm(forms.ModelForm):
    """Formulario para la hoja de vida del usuario."""
    
    class Meta:
        model = UserResume
        fields = [
            # Información personal
            'date_of_birth', 'nationality', 'marital_status', 'dependents',
            
            # Información de contacto
            'emergency_contact_name', 'emergency_contact_phone', 
            'emergency_contact_relation', 'emergency_contact_address',
            
            # Información educativa
            'education_level', 'institution_name', 'field_of_study', 
            'graduation_year', 'gpa',
            
            # Información laboral
            'current_employer', 'current_position', 'employment_type',
            'start_date', 'end_date', 'monthly_salary',
            'supervisor_name', 'supervisor_phone', 'supervisor_email',
            
            # Información financiera
            'bank_name', 'account_type', 'account_number', 'credit_score',
            'monthly_expenses',
            
            # Referencias
            'reference1_name', 'reference1_phone', 'reference1_email', 'reference1_relation',
            'reference2_name', 'reference2_phone', 'reference2_email', 'reference2_relation',
            
            # Historial de vivienda
            'eviction_history', 'eviction_details',
            
            # Documentos
            'id_document', 'proof_of_income', 'bank_statement', 'employment_letter',
            'tax_return', 'credit_report',
            
            # Información adicional
            'criminal_record', 'criminal_record_details', 'criminal_record_document',
        ]
        widgets = {
            'date_of_birth': forms.DateInput(attrs={'type': 'date'}),
            'start_date': forms.DateInput(attrs={'type': 'date'}),
            'end_date': forms.DateInput(attrs={'type': 'date'}),
            'graduation_year': forms.NumberInput(attrs={'min': '1950', 'max': '2030'}),
            'gpa': forms.NumberInput(attrs={'min': '0', 'max': '10', 'step': '0.01'}),
            'credit_score': forms.NumberInput(attrs={'min': '300', 'max': '850'}),
            'monthly_salary': forms.NumberInput(attrs={'min': '0', 'step': '0.01'}),
            'monthly_expenses': forms.NumberInput(attrs={'min': '0', 'step': '0.01'}),
            'dependents': forms.NumberInput(attrs={'min': '0', 'max': '20'}),
            'eviction_details': forms.Textarea(attrs={'rows': 3}),
            'criminal_record_details': forms.Textarea(attrs={'rows': 3}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Hacer algunos campos opcionales
        optional_fields = [
            'end_date', 'supervisor_name', 'supervisor_phone', 'supervisor_email',
            'bank_name', 'account_type', 'account_number', 'credit_score',
            'monthly_expenses', 'reference2_name', 'reference2_phone', 
            'reference2_email', 'reference2_relation', 'eviction_details',
            'tax_return', 'credit_report', 'criminal_record_details', 
            'criminal_record_document'
        ]
        
        for field_name in optional_fields:
            if field_name in self.fields:
                self.fields[field_name].required = False
    
    def clean(self):
        cleaned_data = super().clean()
        
        # Validar fechas
        start_date = cleaned_data.get('start_date')
        end_date = cleaned_data.get('end_date')
        
        if start_date and end_date and start_date > end_date:
            raise forms.ValidationError('La fecha de inicio no puede ser posterior a la fecha de fin.')
        
        # Validar año de graduación
        graduation_year = cleaned_data.get('graduation_year')
        if graduation_year:
            from datetime import date
            current_year = date.today().year
            if graduation_year > current_year:
                raise forms.ValidationError('El año de graduación no puede ser futuro.')
            if graduation_year < 1950:
                raise forms.ValidationError('El año de graduación debe ser posterior a 1950.')
        
        # Validar GPA
        gpa = cleaned_data.get('gpa')
        if gpa and (gpa < 0 or gpa > 10):
            raise forms.ValidationError('El GPA debe estar entre 0 y 10.')
        
        # Validar puntuación crediticia
        credit_score = cleaned_data.get('credit_score')
        if credit_score and (credit_score < 300 or credit_score > 850):
            raise forms.ValidationError('La puntuación crediticia debe estar entre 300 y 850.')
        
        return cleaned_data