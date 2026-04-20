from django.apps import AppConfig


class MessagingConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "messaging"

    def ready(self):
        # Fase G1: signals para broadcast de mensajes por WS.
        from messaging import signals  # noqa: F401
