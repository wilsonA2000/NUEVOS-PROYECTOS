"""
Tags personalizados para las plantillas del sistema de calificaciones.
"""

from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def stars_display(value, max_stars=10):
    """
    Muestra estrellas según la calificación.
    
    Args:
        value: Valor numérico de la calificación
        max_stars: Número máximo de estrellas (por defecto 10)
    
    Returns:
        HTML con estrellas llenas y vacías
    """
    if value is None:
        return mark_safe('<span class="text-gray-400">Sin calificación</span>')
    
    try:
        value = float(value)
    except (ValueError, TypeError):
        return mark_safe('<span class="text-gray-400">Valor inválido</span>')
    
    full_stars = int(value)
    empty_stars = max_stars - full_stars
    
    stars_html = '<span class="text-yellow-500">' + '★' * full_stars + '</span>'
    stars_html += '<span class="text-gray-300">' + '★' * empty_stars + '</span>'
    
    return mark_safe(stars_html)


@register.filter
def percentage(value, total):
    """
    Calcula el porcentaje de un valor respecto a un total.
    
    Args:
        value: Valor numérico
        total: Total para calcular el porcentaje
    
    Returns:
        Porcentaje como número entero
    """
    try:
        value = float(value)
        total = float(total)
        if total > 0:
            return int((value / total) * 100)
        return 0
    except (ValueError, TypeError, ZeroDivisionError):
        return 0


@register.filter
def multiply(value, arg):
    """
    Multiplica un valor por un argumento.
    
    Args:
        value: Valor numérico
        arg: Factor de multiplicación
    
    Returns:
        Resultado de la multiplicación
    """
    try:
        return float(value) * float(arg)
    except (ValueError, TypeError):
        return 0


@register.filter
def get_item(dictionary, key):
    """
    Obtiene un elemento de un diccionario por su clave.
    
    Args:
        dictionary: Diccionario
        key: Clave a buscar
    
    Returns:
        Valor asociado a la clave o None si no existe
    """
    if dictionary is None:
        return None
    return dictionary.get(str(key), 0)


@register.simple_tag
def rating_badge(badge_type):
    """
    Genera un badge HTML para un tipo de badge específico.
    
    Args:
        badge_type: Tipo de badge
    
    Returns:
        HTML del badge con estilo apropiado
    """
    badges = {
        'excellent_service': {
            'text': 'Servicio Excelente',
            'color': 'bg-green-100 text-green-800'
        },
        'great_service': {
            'text': 'Gran Servicio',
            'color': 'bg-blue-100 text-blue-800'
        },
        'good_service': {
            'text': 'Buen Servicio',
            'color': 'bg-blue-100 text-blue-800'
        },
        'experienced': {
            'text': 'Experimentado',
            'color': 'bg-purple-100 text-purple-800'
        },
        'established': {
            'text': 'Establecido',
            'color': 'bg-indigo-100 text-indigo-800'
        },
        'trusted': {
            'text': 'Confiable',
            'color': 'bg-teal-100 text-teal-800'
        },
        'communication_expert': {
            'text': 'Experto en Comunicación',
            'color': 'bg-yellow-100 text-yellow-800'
        },
        'reliability_expert': {
            'text': 'Experto en Confiabilidad',
            'color': 'bg-orange-100 text-orange-800'
        },
        'cleanliness_expert': {
            'text': 'Experto en Limpieza',
            'color': 'bg-green-100 text-green-800'
        },
        'punctuality_expert': {
            'text': 'Experto en Puntualidad',
            'color': 'bg-blue-100 text-blue-800'
        },
        'professionalism_expert': {
            'text': 'Experto en Profesionalismo',
            'color': 'bg-indigo-100 text-indigo-800'
        },
    }
    
    badge_info = badges.get(badge_type, {
        'text': badge_type.replace('_', ' ').title(),
        'color': 'bg-gray-100 text-gray-800'
    })
    
    return mark_safe(
        f'<span class="{badge_info["color"]} text-xs font-medium px-2.5 py-0.5 rounded-full">'
        f'{badge_info["text"]}'
        f'</span>'
    )