"""
Configuración de la aplicación de notificaciones para VeriHome.
Sistema integral de notificaciones en tiempo real, email y push.
"""

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """Configuración de la aplicación de notificaciones."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'
    verbose_name = 'Sistema de Notificaciones'
    
    def ready(self):
        """Configuración inicial de la aplicación."""
        # Importar señales para activar los handlers
        try:
            from . import signals
        except ImportError:
            pass