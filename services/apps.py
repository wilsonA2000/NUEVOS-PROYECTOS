from django.apps import AppConfig


class ServicesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "services"
    verbose_name = "Servicios Adicionales"

    def ready(self):
        # Registrar los signals al arrancar la app (Fase 1.9.5).
        from services import signals  # noqa: F401
