from django import forms
from django.contrib.auth import get_user_model
from .models import LandlordProfile, TenantProfile, ServiceProviderProfile
from .widgets import CustomTextInput, CustomEmailInput, CustomPasswordInput

User = get_user_model()

class LandlordRegistrationForm(forms.ModelForm):
    password1 = forms.CharField(label='Contraseña', widget=forms.PasswordInput(attrs={
        'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200',
        'placeholder': '••••••••'
    }))
    password2 = forms.CharField(label='Confirmar contraseña', widget=forms.PasswordInput(attrs={
        'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200',
        'placeholder': '••••••••'
    }))
    
    # Campos adicionales para el perfil de arrendador
    company_name = forms.CharField(required=False, widget=forms.TextInput(attrs={
        'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200',
        'placeholder': 'Mi Empresa Inmobiliaria'
    }))
    total_properties = forms.ChoiceField(required=False, choices=[
        ('', 'Seleccionar'),
        ('1', '1 propiedad'),
        ('2-5', '2-5 propiedades'),
        ('6-10', '6-10 propiedades'),
        ('11-25', '11-25 propiedades'),
        ('25+', 'Más de 25 propiedades')
    ], widget=forms.Select(attrs={
        'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200'
    }))
    years_experience = forms.ChoiceField(required=False, choices=[
        ('', 'Seleccionar'),
        ('0', 'Principiante'),
        ('1-2', '1-2 años'),
        ('3-5', '3-5 años'),
        ('6-10', '6-10 años'),
        ('10+', 'Más de 10 años')
    ], widget=forms.Select(attrs={
        'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200'
    }))
    property_types = forms.MultipleChoiceField(required=False, choices=[
        ('apartment', 'Apartamentos'),
        ('house', 'Casas'),
        ('studio', 'Estudios'),
        ('commercial', 'Comercial')
    ], widget=forms.CheckboxSelectMultiple)
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone_number']
        widgets = {
            'first_name': forms.TextInput(attrs={
                'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200',
                'placeholder': 'Tu nombre'
            }),
            'last_name': forms.TextInput(attrs={
                'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200',
                'placeholder': 'Tus apellidos'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200',
                'placeholder': 'tu@correo.com'
            }),
            'phone_number': forms.TextInput(attrs={
                'class': 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200',
                'placeholder': '+52 55 1234 5678'
            }),
        }
        
    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError('Las contraseñas no coinciden')
        return password2
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password1'])
        user.user_type = 'landlord'
        if commit:
            user.save()
        return user

class TenantRegistrationForm(forms.ModelForm):
    password1 = forms.CharField(label='Contraseña', widget=CustomPasswordInput())
    password2 = forms.CharField(label='Confirmar contraseña', widget=CustomPasswordInput())
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone_number']
        widgets = {
            'first_name': CustomTextInput(),
            'last_name': CustomTextInput(),
            'email': CustomEmailInput(),
            'phone_number': CustomTextInput(),
        }
        
    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError('Las contraseñas no coinciden')
        return password2
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password1'])
        user.user_type = 'tenant'
        if commit:
            user.save()
        return user

class ServiceProviderRegistrationForm(forms.ModelForm):
    password1 = forms.CharField(label='Contraseña', widget=CustomPasswordInput())
    password2 = forms.CharField(label='Confirmar contraseña', widget=CustomPasswordInput())
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone_number']
        widgets = {
            'first_name': CustomTextInput(),
            'last_name': CustomTextInput(),
            'email': CustomEmailInput(),
            'phone_number': CustomTextInput(),
        }
        
    def clean_password2(self):
        password1 = self.cleaned_data.get('password1')
        password2 = self.cleaned_data.get('password2')
        if password1 and password2 and password1 != password2:
            raise forms.ValidationError('Las contraseñas no coinciden')
        return password2
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data['password1'])
        user.user_type = 'service_provider'
        if commit:
            user.save()
        return user