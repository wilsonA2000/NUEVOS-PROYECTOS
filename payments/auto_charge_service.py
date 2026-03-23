"""
Servicio de cobros automáticos de arriendo.
Procesa pagos programados según RentPaymentSchedule.
"""

import logging
from decimal import Decimal
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

logger = logging.getLogger(__name__)


def process_auto_charges():
    """
    Procesa todos los cobros automáticos de arriendo pendientes.
    Se ejecuta diariamente via Celery.

    Flujo:
    1. Busca RentPaymentSchedule con auto_charge_enabled y pago vencido
    2. Crea Transaction para cada uno
    3. Marca last_payment_date
    4. Envía confirmación o notificación de fallo
    """
    from .models import RentPaymentSchedule, Transaction

    today = timezone.now().date()
    processed = 0
    failed = 0

    schedules = RentPaymentSchedule.objects.filter(
        auto_charge_enabled=True,
        is_active=True,
    ).select_related('contract', 'contract__landlord', 'contract__tenant')

    for schedule in schedules:
        try:
            next_due = schedule.get_next_due_date()
            if not next_due or next_due > today:
                continue

            # Verificar que no se haya cobrado ya este mes
            if schedule.last_payment_date and schedule.last_payment_date.month == today.month and schedule.last_payment_date.year == today.year:
                continue

            amount = schedule.monthly_amount
            late_fee = Decimal('0')

            # Aplicar mora si aplica
            if schedule.is_payment_overdue() and schedule.late_fee_percentage:
                late_fee = schedule.calculate_late_fee()

            total_amount = amount + late_fee

            # Crear transacción
            transaction = Transaction.objects.create(
                transaction_type='rent_payment',
                amount=total_amount,
                currency='COP',
                status='completed',
                payer=schedule.contract.tenant if hasattr(schedule.contract, 'tenant') else None,
                payee=schedule.contract.landlord if hasattr(schedule.contract, 'landlord') else None,
                contract=schedule.contract,
                description=f'Pago automático de arriendo - {today.strftime("%B %Y")}',
                processed_at=timezone.now(),
                metadata={
                    'auto_charge': True,
                    'schedule_id': str(schedule.id),
                    'base_amount': str(amount),
                    'late_fee': str(late_fee),
                    'due_date': str(next_due),
                },
            )

            # Actualizar schedule
            schedule.last_payment_date = today
            schedule.save(update_fields=['last_payment_date', 'updated_at'])

            # Enviar confirmación
            _send_charge_confirmation(schedule, transaction, total_amount, late_fee)

            processed += 1
            logger.info(f"Auto-charge OK: {schedule.contract} - ${total_amount}")

        except Exception as e:
            failed += 1
            logger.error(f"Auto-charge FAILED: {schedule.id} - {e}")
            _send_charge_failure(schedule, str(e))

    return {'processed': processed, 'failed': failed}


def _send_charge_confirmation(schedule, transaction, amount, late_fee):
    """Envía email de confirmación de cobro automático."""
    tenant = schedule.contract.tenant if hasattr(schedule.contract, 'tenant') else None
    landlord = schedule.contract.landlord if hasattr(schedule.contract, 'landlord') else None

    # Email al arrendatario (pagador)
    if tenant and tenant.email:
        late_msg = f'\nMora aplicada: ${late_fee:,.0f}' if late_fee > 0 else ''
        try:
            send_mail(
                subject='[VeriHome] Pago de arriendo procesado',
                message=(
                    f'Estimado/a {tenant.get_full_name()},\n\n'
                    f'Su pago de arriendo ha sido procesado exitosamente.\n\n'
                    f'Monto: ${amount:,.0f} COP{late_msg}\n'
                    f'Referencia: {transaction.id}\n'
                    f'Fecha: {timezone.now().strftime("%d/%m/%Y %H:%M")}\n\n'
                    f'Puede ver el detalle en su panel de VeriHome.\n\n'
                    f'Equipo VeriHome'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[tenant.email],
                fail_silently=True,
            )
        except Exception:
            pass

    # Email al arrendador (receptor)
    if landlord and landlord.email:
        try:
            send_mail(
                subject='[VeriHome] Pago de arriendo recibido',
                message=(
                    f'Estimado/a {landlord.get_full_name()},\n\n'
                    f'Se ha recibido un pago de arriendo.\n\n'
                    f'Monto: ${amount:,.0f} COP\n'
                    f'Arrendatario: {tenant.get_full_name() if tenant else "N/A"}\n'
                    f'Referencia: {transaction.id}\n\n'
                    f'Equipo VeriHome'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[landlord.email],
                fail_silently=True,
            )
        except Exception:
            pass


def _send_charge_failure(schedule, error_msg):
    """Envía email cuando un cobro automático falla."""
    tenant = schedule.contract.tenant if hasattr(schedule.contract, 'tenant') else None
    if tenant and tenant.email:
        try:
            send_mail(
                subject='[VeriHome] Error en pago automático de arriendo',
                message=(
                    f'Estimado/a {tenant.get_full_name()},\n\n'
                    f'No pudimos procesar su pago automático de arriendo.\n\n'
                    f'Por favor ingrese a VeriHome y realice el pago manualmente '
                    f'o verifique su método de pago.\n\n'
                    f'Si necesita ayuda, contáctenos a soporte@verihome.com\n\n'
                    f'Equipo VeriHome'
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[tenant.email],
                fail_silently=True,
            )
        except Exception:
            pass
