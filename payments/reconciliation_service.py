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
    Reconcilia una transacción completada con su RentPaymentSchedule
    o ServiceOrder según el tipo. Se llama desde webhooks confirmados.

    Args:
        transaction: Transaction object con status='completed'

    Returns:
        bool: True si se reconcilió exitosamente
    """
    if transaction.status != "completed":
        return False

    if transaction.transaction_type in ("rent_payment", "monthly_rent"):
        return _reconcile_rent_payment(transaction)
    if transaction.transaction_type == "service_payment":
        return _reconcile_service_payment(transaction)

    return False


def _reconcile_rent_payment(transaction):
    """Reconcilia un pago de renta con RentPaymentSchedule + PaymentOrder."""
    contract = transaction.contract
    if not contract:
        return False

    try:
        from .models import RentPaymentSchedule, PaymentOrder

        schedule = RentPaymentSchedule.objects.filter(
            contract=contract,
            is_active=True,
        ).first()

        if not schedule:
            logger.info(f"No RentPaymentSchedule found for contract {contract.id}")
            return False

        # Actualizar fecha de último pago
        schedule.last_payment_date = timezone.now().date()
        schedule.save(update_fields=["last_payment_date", "updated_at"])

        # Marcar la siguiente PaymentOrder pendiente del schedule como pagada
        next_order = (
            PaymentOrder.objects.filter(
                rent_schedule=schedule,
                status__in=["pending", "partial", "overdue"],
            )
            .order_by("date_due")
            .first()
        )
        if next_order:
            next_order.paid_amount = next_order.total_amount
            next_order.status = "paid"
            next_order.transaction = transaction
            next_order.paid_at = timezone.now()
            next_order.add_audit_event(
                "paid_via_webhook",
                f"Pagada vía transacción {transaction.transaction_number}",
                save=False,
            )
            next_order.save()

        # Auto-generar factura DIAN
        try:
            from .dian_invoice_service import auto_invoice_rent_payment

            auto_invoice_rent_payment(transaction)
        except Exception as e:
            logger.warning(f"Auto-invoice failed for {transaction.id}: {e}")

        logger.info(
            f"Reconciled transaction {transaction.id} with schedule {schedule.id}"
        )
        return True

    except Exception as e:
        logger.error(f"Reconciliation error for transaction {transaction.id}: {e}")
        return False


def _reconcile_service_payment(transaction):
    """Reconcilia un pago de servicio con ServiceOrder + PaymentOrder.

    T2.3: Cuando llega un webhook con transacción de tipo service_payment,
    busca la PaymentOrder enlazada por amount + payer + status, marca
    la ServiceOrder como paid, crea ServicePayment y notifica al provider.
    """
    try:
        from .models import PaymentOrder
        from services.models import ServiceOrder, ServicePayment

        # Estrategia de matching: buscar PaymentOrder pendiente con mismo amount
        # y payer. En producción se debería pasar el order_id en el webhook
        # para evitar ambigüedad.
        candidate_orders = PaymentOrder.objects.filter(
            order_type="service",
            payer=transaction.payer,
            payee=transaction.payee,
            amount=transaction.amount,
            status__in=["pending", "partial"],
        ).order_by("-created_at")

        po = candidate_orders.first()
        if po is None:
            logger.info(
                f"No matching PaymentOrder for service transaction {transaction.id}"
            )
            return False

        # Marcar la PaymentOrder como pagada
        po.paid_amount = po.total_amount
        po.status = "paid"
        po.transaction = transaction
        po.paid_at = timezone.now()
        po.add_audit_event(
            "paid_via_webhook",
            f"Pagada vía transacción {transaction.transaction_number}",
            save=False,
        )
        po.save()

        # Marcar la ServiceOrder como paid y crear ServicePayment
        service_order = ServiceOrder.objects.filter(payment_order=po).first()
        if service_order and service_order.status == "accepted":
            service_order.status = "paid"
            service_order.paid_at = timezone.now()
            service_order.save()
            ServicePayment.objects.create(
                order=service_order,
                amount_paid=transaction.amount,
                gateway=transaction.payment_method.payment_type
                if transaction.payment_method
                else "manual",
                transaction=transaction,
                notes=f"Reconciliado vía webhook {transaction.transaction_number}",
            )
            logger.info(
                f"ServiceOrder {service_order.id} marked as paid via {transaction.id}"
            )

        return True

    except Exception as e:
        logger.error(
            f"Service reconciliation error for transaction {transaction.id}: {e}"
        )
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
                subject="[VeriHome] Pago confirmado",
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
                subject="[VeriHome] Pago recibido",
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
                subject="[VeriHome] Pago no procesado",
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
