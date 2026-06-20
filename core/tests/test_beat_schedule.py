"""
Tests del beat schedule de Celery (D41).

Garantiza que:
- el schedule efectivo se carga desde settings.CELERY_BEAT_SCHEDULE (no lo
  pisa un segundo bloque en verihome/celery.py);
- toda tarea agendada está realmente registrada (no hay tareas "fantasma"
  como las que existían antes: process_pending_notifications,
  process_expired_contracts, send_payment_reminders).
"""

from django.conf import settings
from django.test import SimpleTestCase


class BeatScheduleTest(SimpleTestCase):
    def setUp(self):
        from verihome.celery import app

        # Asegura que todas las tareas @shared_task estén importadas/registradas.
        app.loader.import_default_modules()
        self.app = app

    def test_schedule_efectivo_viene_de_settings(self):
        """El beat_schedule del app debe ser el de settings (una sola fuente)."""
        self.assertEqual(
            set(self.app.conf.beat_schedule.keys()),
            set(settings.CELERY_BEAT_SCHEDULE.keys()),
        )

    def test_todas_las_tareas_agendadas_existen(self):
        """Ninguna entrada del schedule apunta a una tarea no registrada."""
        registered = set(self.app.tasks.keys())
        agendadas = {
            cfg["task"] for cfg in settings.CELERY_BEAT_SCHEDULE.values()
        }
        faltantes = agendadas - registered
        self.assertEqual(
            faltantes,
            set(),
            f"Tareas agendadas que no existen (fantasma): {faltantes}",
        )

    def test_no_quedan_tareas_fantasma_conocidas(self):
        """Regresión explícita de las 3 tareas fantasma eliminadas en D41."""
        agendadas = {
            cfg["task"] for cfg in settings.CELERY_BEAT_SCHEDULE.values()
        }
        for fantasma in (
            "notifications.tasks.process_pending_notifications",
            "contracts.tasks.process_expired_contracts",
            "payments.tasks.send_payment_reminders",
        ):
            self.assertNotIn(fantasma, agendadas)
