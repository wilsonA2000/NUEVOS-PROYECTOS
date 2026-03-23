"""
Servicio de reconciliación de pagos.
Vincula transacciones confirmadas con RentPaymentSchedule
y marca arriendos como pagados automáticamente.
"""

import logging
from django.utils import timezone

logger = logging.getLogger(__name__)


def reconcile_payment(transaction):
    """
    Reconcilia una transacción completada con su RentPaymentSchedule.
    Se llama desde los webhooks cuando un pago es confirmado.

    Args:
        transaction: Transaction object con status='completed'

    Returns:
        bool: True si se reconcilió exitosamente
    """
    if transaction.status != 'completed':
        return False

    if transaction.transaction_type != 'rent_payment':
        return False

    contract = transaction.contract
    if not contract:
        return False

    try:
        from .models import RentPaymentSchedule

        schedule = RentPaymentSchedule.objects.filter(
            contract=contract,
            is_active=True,
        ).first()

        if not schedule:
            logger.info(f"No RentPaymentSchedule found for contract {contract.id}")
            return False

        # Actualizar fecha de último pago
        schedule.last_payment_date = timezone.now().date()
        schedule.save(update_fields=['last_payment_date', 'updated_at'])

        logger.info(f"Reconciled transaction {transaction.id} with schedule {schedule.id}")
        return True

    except Exception as e:
        logger.error(f"Reconciliation error for transaction {transaction.id}: {e}")
        return False


def send_payment_confirmation(transaction):
    """
    Envía emails de confirmación cuando un pago es exitoso.
    Se llama desde webhooks después de reconciliar.
    """
    from django.core.mail import send_mail
    from django.conf import settings

    payer = transaction.payer
    payee = transaction.payee
    amount = transaction.amount

    # Email al pagador
    if payer and payer.email:
        try:
            send_mail(
                subject='[VeriHome] Pago confirmado',
                message=(
                    f'Estimado/a {payer.get_full_name()},\n\n'
                    f'Su pago ha sido confirmado exitosamente.\n\n'
                    f'Monto: ${amount:,.0f} COP\n'
                    f'Tipo: {transaction.get_transaction_type_display()}\n'
                    f'Referencia: {transaction.id}\n'
                    f'Fecha: {timezone.now().strftime("%d/%m/%Y %H:%M")}\n\n'
                    f'Puede descargar su recibo desde el panel de VeriHome.\n\n'
                    f'Equipo VeriHome'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[payer.email],
                fail_silently=True,
            )
        except Exception:
            pass

    # Email al receptor
    if payee and payee.email:
        try:
            send_mail(
                subject='[VeriHome] Pago recibido',
                message=(
                    f'Estimado/a {payee.get_full_name()},\n\n'
                    f'Se ha recibido un pago en su cuenta.\n\n'
                    f'Monto: ${amount:,.0f} COP\n'
                    f'De: {payer.get_full_name() if payer else "N/A"}\n'
                    f'Tipo: {transaction.get_transaction_type_display()}\n'
                    f'Referencia: {transaction.id}\n\n'
                    f'Equipo VeriHome'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[payee.email],
                fail_silently=True,
            )
        except Exception:
            pass


def send_payment_failure_notification(transaction):
    """
    Envía email cuando un pago falla.
    """
    from django.core.mail import send_mail
    from django.conf import settings

    payer = transaction.payer
    if payer and payer.email:
        try:
            send_mail(
                subject='[VeriHome] Pago no procesado',
                message=(
                    f'Estimado/a {payer.get_full_name()},\n\n'
                    f'Su pago no pudo ser procesado.\n\n'
                    f'Monto: ${transaction.amount:,.0f} COP\n'
                    f'Motivo: {transaction.failure_reason or "Error en la pasarela de pagos"}\n\n'
                    f'Por favor intente nuevamente o verifique su método de pago.\n'
                    f'Si el problema persiste, contáctenos a soporte@verihome.com\n\n'
                    f'Equipo VeriHome'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[payer.email],
                fail_silently=True,
            )
        except Exception:
            pass
