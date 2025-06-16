"""
Formularios para el sistema de calificaciones de VeriHome.
"""

from django import forms
from .models import Rating, RatingResponse, RatingReport, RatingCategory


class RatingForm(forms.ModelForm):
    """Formulario para crear y editar calificaciones."""
    
    # Campos para categorías específicas (escala 1-10)
    category_communication = forms.IntegerField(
        label="Comunicación",
        min_value=1,
        max_value=10,
        required=False,
        widget=forms.NumberInput(attrs={'class': 'rating-input'})
    )
    category_reliability = forms.IntegerField(
        label="Confiabilidad",
        min_value=1,
        max_value=10,
        required=False,
        widget=forms.NumberInput(attrs={'class': 'rating-input'})
    )
    category_punctuality = forms.IntegerField(
        label="Puntualidad",
        min_value=1,
        max_value=10,
        required=False,
        widget=forms.NumberInput(attrs={'class': 'rating-input'})
    )
    category_professionalism = forms.IntegerField(
        label="Profesionalismo",
        min_value=1,
        max_value=10,
        required=False,
        widget=forms.NumberInput(attrs={'class': 'rating-input'})
    )
    
    # Campos condicionales según el tipo de usuario
    category_cleanliness = forms.IntegerField(
        label="Limpieza",
        min_value=1,
        max_value=10,
        required=False,
        widget=forms.NumberInput(attrs={'class': 'rating-input'})
    )
    category_property_condition = forms.IntegerField(
        label="Estado de la Propiedad",
        min_value=1,
        max_value=10,
        required=False,
        widget=forms.NumberInput(attrs={'class': 'rating-input'})
    )
    category_payment_timeliness = forms.IntegerField(
        label="Puntualidad de Pagos",
        min_value=1,
        max_value=10,
        required=False,
        widget=forms.NumberInput(attrs={'class': 'rating-input'})
    )
    category_responsiveness = forms.IntegerField(
        label="Capacidad de Respuesta",
        min_value=1,
        max_value=10,
        required=False,
        widget=forms.NumberInput(attrs={'class': 'rating-input'})
    )
    
    class Meta:
        model = Rating
        fields = [
            'overall_rating', 'title', 'review_text',
            'is_anonymous', 'is_public'
        ]
        widgets = {
            'overall_rating': forms.NumberInput(
                attrs={'class': 'rating-input', 'min': '1', 'max': '10'}
            ),
            'title': forms.TextInput(attrs={'class': 'form-input', 'placeholder': 'Título de tu reseña'}),
            'review_text': forms.Textarea(
                attrs={'class': 'form-textarea', 'placeholder': 'Describe tu experiencia...', 'rows': 5}
            ),
            'is_anonymous': forms.CheckboxInput(attrs={'class': 'form-checkbox'}),
            'is_public': forms.CheckboxInput(attrs={'class': 'form-checkbox'}),
        }
        labels = {
            'overall_rating': 'Calificación General (1-10)',
            'title': 'Título',
            'review_text': 'Comentarios',
            'is_anonymous': 'Mantener mi nombre anónimo',
            'is_public': 'Hacer pública esta reseña',
        }
        help_texts = {
            'overall_rating': 'Califica del 1 al 10, donde 10 es excelente.',
            'is_anonymous': 'Si marcas esta opción, tu nombre no será visible para otros usuarios.',
            'is_public': 'Si desmarcas esta opción, solo tú y el usuario calificado podrán ver esta reseña.',
        }
    
    def __init__(self, *args, **kwargs):
        user_type = kwargs.pop('user_type', None)
        reviewee_type = kwargs.pop('reviewee_type', None)
        super().__init__(*args, **kwargs)
        
        # Ajustar campos según el tipo de usuario
        if user_type == 'landlord' and reviewee_type == 'tenant':
            # Arrendador calificando a arrendatario
            self.fields.pop('category_property_condition', None)
            self.fields.pop('category_responsiveness', None)
        elif user_type == 'tenant' and reviewee_type == 'landlord':
            # Arrendatario calificando a arrendador
            self.fields.pop('category_payment_timeliness', None)
        elif user_type == 'service_provider' or reviewee_type == 'service_provider':
            # Calificaciones relacionadas con prestadores de servicios
            self.fields.pop('category_property_condition', None)
            self.fields.pop('category_payment_timeliness', None)


class RatingResponseForm(forms.ModelForm):
    """Formulario para responder a una calificación."""
    
    class Meta:
        model = RatingResponse
        fields = ['response_text', 'is_public']
        widgets = {
            'response_text': forms.Textarea(
                attrs={'class': 'form-textarea', 'placeholder': 'Escribe tu respuesta...', 'rows': 4}
            ),
            'is_public': forms.CheckboxInput(attrs={'class': 'form-checkbox'}),
        }
        labels = {
            'response_text': 'Tu respuesta',
            'is_public': 'Hacer pública esta respuesta',
        }
        help_texts = {
            'is_public': 'Si desmarcas esta opción, solo tú y el autor de la reseña podrán ver esta respuesta.',
        }


class RatingReportForm(forms.ModelForm):
    """Formulario para reportar una calificación inapropiada."""
    
    class Meta:
        model = RatingReport
        fields = ['reason', 'description']
        widgets = {
            'reason': forms.Select(attrs={'class': 'form-select'}),
            'description': forms.Textarea(
                attrs={'class': 'form-textarea', 'placeholder': 'Explica por qué reportas esta reseña...', 'rows': 4}
            ),
        }
        labels = {
            'reason': 'Motivo del reporte',
            'description': 'Descripción detallada',
        }
        help_texts = {
            'description': 'Proporciona detalles específicos sobre por qué consideras que esta reseña debe ser revisada.',
        }