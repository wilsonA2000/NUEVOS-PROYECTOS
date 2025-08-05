from django import forms
from django.contrib.auth import get_user_model
from .models import MessageThread, Message
from properties.models import Property
from contracts.models import Contract

User = get_user_model()

class MessageForm(forms.ModelForm):
    """Formulario para enviar mensajes."""
    content = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'rows': 4,
            'placeholder': 'Escribe tu mensaje aquí...'
        })
    )

    class Meta:
        model = Message
        fields = ['content']

class MessageThreadForm(forms.ModelForm):
    """Formulario para crear nuevos hilos de conversación."""
    recipients = forms.ModelMultipleChoiceField(
        queryset=User.objects.all(),
        widget=forms.SelectMultiple(attrs={
            'class': 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'data-placeholder': 'Selecciona los destinatarios...'
        })
    )
    content = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'rows': 4,
            'placeholder': 'Escribe tu mensaje aquí...'
        })
    )
    subject = forms.CharField(
        widget=forms.TextInput(attrs={
            'class': 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'placeholder': 'Asunto del mensaje'
        })
    )
    thread_type = forms.ChoiceField(
        choices=MessageThread.THREAD_TYPES,
        widget=forms.Select(attrs={
            'class': 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        })
    )
    property = forms.ModelChoiceField(
        queryset=Property.objects.none(),
        required=False,
        widget=forms.Select(attrs={
            'class': 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'data-placeholder': 'Selecciona una propiedad (opcional)'
        })
    )
    contract = forms.ModelChoiceField(
        queryset=Contract.objects.none(),
        required=False,
        widget=forms.Select(attrs={
            'class': 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
            'data-placeholder': 'Selecciona un contrato (opcional)'
        })
    )

    class Meta:
        model = MessageThread
        fields = ['recipients', 'subject', 'thread_type', 'property', 'contract']

    def __init__(self, *args, **kwargs):
        user = kwargs.pop('user', None)
        super().__init__(*args, **kwargs)
        
        if user:
            # Filtrar propiedades y contratos según el usuario
            if hasattr(user, 'landlord'):
                self.fields['property'].queryset = Property.objects.filter(landlord=user)
                self.fields['contract'].queryset = Contract.objects.filter(primary_party=user)
            elif hasattr(user, 'tenant'):
                self.fields['property'].queryset = Property.objects.filter(contracts__secondary_party=user)
                self.fields['contract'].queryset = Contract.objects.filter(secondary_party=user)
            elif hasattr(user, 'service_provider'):
                self.fields['property'].queryset = Property.objects.filter(services__provider=user)
                self.fields['contract'].queryset = Contract.objects.filter(services__provider=user)

    def save(self, commit=True):
        thread = super().save(commit=False)
        if commit:
            thread.save()
            # Agregar participantes al hilo
            for user in self.cleaned_data['recipients']:
                thread.participants.add(user)
        return thread 