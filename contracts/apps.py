from django.apps import AppConfig


class ContractsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "contracts"

    def ready(self):
        # Conectar señales (T1.3 · auto-generación de cuotas al activar contrato)
        from . import signals  # noqa: F401
