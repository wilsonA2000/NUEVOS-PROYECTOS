"""
Configuración de la aplicación de calificaciones para VeriHome.
"""

from django.apps import AppConfig


class RatingsConfig(AppConfig):
    """Configuración para la aplicación de calificaciones."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ratings'
    verbose_name = 'Sistema de Calificaciones'
    
    def ready(self):
        """Importar señales cuando la aplicación esté lista."""
        import ratings.signals
        # Configurar signals adicionales
        ratings.signals.setup_contract_signals()