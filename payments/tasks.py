"""
Tareas Celery para la aplicación de pagos de VeriHome.
Incluye recordatorios automáticos y escalamiento de pagos vencidos.
"""

import logging
from celery import shared_task

logger = logging.getLogger('payments')


@shared_task(
    name='payments.tasks.check_payment_reminders',
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def check_payment_reminders(self):
    """
    Tarea diaria para verificar y enviar recordatorios de pago.
    Revisa pagos próximos a vencer, que vencen hoy y vencidos recientemente.
    """
    try:
        from .reminder_service import process_all_reminders

        logger.info("Iniciando verificación de recordatorios de pago...")
        stats = process_all_reminders()
        logger.info(f"Recordatorios completados: {stats}")
        return stats

    except Exception as exc:
        logger.error(f"Error en check_payment_reminders: {exc}")
        raise self.retry(exc=exc)


@shared_task(
    name='payments.tasks.escalate_overdue_payments',
    bind=True,
    max_retries=3,
    default_retry_delay=600,
)
def escalate_overdue_payments(self):
    """
    Tarea semanal para escalar pagos severamente vencidos (más de 15 días).
    Notifica tanto al arrendatario como al arrendador.
    """
    try:
        from .reminder_service import escalate_severely_overdue

        logger.info("Iniciando escalamiento de pagos severamente vencidos...")
        stats = escalate_severely_overdue()
        logger.info(f"Escalamientos completados: {stats}")
        return stats

    except Exception as exc:
        logger.error(f"Error en escalate_overdue_payments: {exc}")
        raise self.retry(exc=exc)
