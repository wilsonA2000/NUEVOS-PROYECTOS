"""
Tareas asíncronas de Celery para el módulo de contratos de VeriHome.
"""

import logging
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)


@shared_task
def check_contract_renewals():
    """
    Tarea diaria para verificar contratos próximos a vencer y enviar alertas.

    Revisa contratos que vencen en 60, 30 y 15 días, y envía notificaciones
    a arrendadores y arrendatarios correspondientes.
    """
    from contracts.renewal_service import RenewalAlertService

    try:
        result = RenewalAlertService.check_and_alert_expiring_contracts()
        logger.info(
            "Tarea check_contract_renewals completada: %d alertas enviadas",
            result.get('alerts_sent', 0),
        )
        return result
    except Exception:
        logger.exception("Error ejecutando check_contract_renewals")
        raise
