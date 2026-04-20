"""
Servicio de recordatorios automáticos de pago para VeriHome.
Gestiona el envío de notificaciones por email para pagos próximos y vencidos.
"""

import logging
from datetime import timedelta
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from .models import Transaction

logger = logging.getLogger("payments")


def get_upcoming_payments(days_ahead=5):
    """
    Encuentra pagos (transacciones) con vencimiento en los próximos N días
    que aún están pendientes.

    Args:
        days_ahead: Número de días hacia adelante para buscar.

    Returns:
        QuerySet de Transaction pendientes con vencimiento próximo.
    """
    today = timezone.now().date()
    future_date = today + timedelta(days=days_ahead)

    return (
        Transaction.objects.filter(
            status="pending",
            due_date__gte=today,
            due_date__lte=future_date,
        )
        .select_related("payer", "payee", "contract", "property")
        .order_by("due_date")
    )


def get_overdue_payments():
    """
    Encuentra pagos pendientes cuya fecha de vencimiento ya pasó.

    Returns:
        QuerySet de Transaction vencidas y no pagadas.
    """
    today = timezone.now().date()

    return (
        Transaction.objects.filter(
            status="pending",
            due_date__lt=today,
        )
        .select_related("payer", "payee", "contract", "property")
        .order_by("due_date")
    )


def send_payment_reminder(payment, reminder_type):
    """
    Envía un recordatorio de pago por email al pagador.

    Args:
        payment: Instancia de Transaction.
        reminder_type: Tipo de recordatorio. Uno de:
            'upcoming', 'due_today', 'overdue_3_days', 'overdue_7_days'

    Returns:
        bool: True si el email se envió correctamente.
    """
    payer = payment.payer

    if not payer.email:
        logger.warning(
            f"No se puede enviar recordatorio a pago {payment.transaction_number}: "
            f"el pagador no tiene email."
        )
        return False

    # Construir información contextual
    amount_display = f"${payment.amount:,.2f} {payment.currency}"
    due_date_display = (
        payment.due_date.strftime("%d/%m/%Y") if payment.due_date else "No definida"
    )

    contract_ref = "N/A"
    if payment.contract:
        contract_ref = payment.contract.title or f"Contrato #{payment.contract.id}"

    property_address = "N/A"
    if payment.property:
        property_address = payment.property.address or payment.property.title

    # Definir asunto y cuerpo según tipo de recordatorio
    subject, body = _build_reminder_content(
        reminder_type=reminder_type,
        payer_name=payer.get_full_name() or payer.email,
        amount=amount_display,
        due_date=due_date_display,
        contract_ref=contract_ref,
        property_address=property_address,
        transaction_number=payment.transaction_number,
    )

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[payer.email],
            fail_silently=False,
        )
        logger.info(
            f"Recordatorio '{reminder_type}' enviado para pago "
            f"{payment.transaction_number} a {payer.email}"
        )
        return True
    except Exception as e:
        logger.error(
            f"Error enviando recordatorio '{reminder_type}' para pago "
            f"{payment.transaction_number}: {e}"
        )
        return False


def _build_reminder_content(
    reminder_type,
    payer_name,
    amount,
    due_date,
    contract_ref,
    property_address,
    transaction_number,
):
    """
    Construye el asunto y cuerpo del email según el tipo de recordatorio.

    Returns:
        Tuple (subject, body)
    """
    base_footer = (
        "\n\n---\n"
        "Este es un mensaje automático de VeriHome.\n"
        "Si ya realizó este pago, por favor ignore este mensaje.\n"
        "Para cualquier consulta, responda a este correo o visite nuestra plataforma."
    )

    if reminder_type == "upcoming":
        subject = (
            f"[VeriHome] Recordatorio: Pago próximo a vencer - {transaction_number}"
        )
        body = (
            f"Estimado/a {payer_name},\n\n"
            f"Le recordamos que tiene un pago próximo a vencer:\n\n"
            f"  - Número de transacción: {transaction_number}\n"
            f"  - Monto: {amount}\n"
            f"  - Fecha de vencimiento: {due_date}\n"
            f"  - Contrato: {contract_ref}\n"
            f"  - Propiedad: {property_address}\n\n"
            f"Le recomendamos realizar el pago antes de la fecha de vencimiento "
            f"para evitar recargos por mora."
            f"{base_footer}"
        )

    elif reminder_type == "due_today":
        subject = f"[VeriHome] Pago vence HOY - {transaction_number}"
        body = (
            f"Estimado/a {payer_name},\n\n"
            f"Su pago vence el día de HOY:\n\n"
            f"  - Número de transacción: {transaction_number}\n"
            f"  - Monto: {amount}\n"
            f"  - Fecha de vencimiento: {due_date}\n"
            f"  - Contrato: {contract_ref}\n"
            f"  - Propiedad: {property_address}\n\n"
            f"Por favor realice el pago hoy para evitar recargos."
            f"{base_footer}"
        )

    elif reminder_type == "overdue_3_days":
        subject = f"[VeriHome] AVISO: Pago vencido hace 3 días - {transaction_number}"
        body = (
            f"Estimado/a {payer_name},\n\n"
            f"Le informamos que su pago se encuentra VENCIDO desde hace 3 días:\n\n"
            f"  - Número de transacción: {transaction_number}\n"
            f"  - Monto: {amount}\n"
            f"  - Fecha de vencimiento: {due_date}\n"
            f"  - Contrato: {contract_ref}\n"
            f"  - Propiedad: {property_address}\n\n"
            f"Le solicitamos realizar el pago a la mayor brevedad posible. "
            f"Pueden aplicarse recargos por mora según las condiciones de su contrato."
            f"{base_footer}"
        )

    elif reminder_type == "overdue_7_days":
        subject = f"[VeriHome] URGENTE: Pago vencido hace 7 días - {transaction_number}"
        body = (
            f"Estimado/a {payer_name},\n\n"
            f"AVISO URGENTE: Su pago se encuentra VENCIDO desde hace 7 días:\n\n"
            f"  - Número de transacción: {transaction_number}\n"
            f"  - Monto: {amount}\n"
            f"  - Fecha de vencimiento: {due_date}\n"
            f"  - Contrato: {contract_ref}\n"
            f"  - Propiedad: {property_address}\n\n"
            f"Es necesario que regularice este pago de manera inmediata. "
            f"El incumplimiento puede generar acciones adicionales conforme "
            f"a las cláusulas de su contrato y la legislación colombiana vigente."
            f"{base_footer}"
        )

    else:
        subject = f"[VeriHome] Recordatorio de pago - {transaction_number}"
        body = (
            f"Estimado/a {payer_name},\n\n"
            f"Tiene un pago pendiente:\n\n"
            f"  - Número de transacción: {transaction_number}\n"
            f"  - Monto: {amount}\n"
            f"  - Fecha de vencimiento: {due_date}\n"
            f"  - Contrato: {contract_ref}\n"
            f"  - Propiedad: {property_address}\n"
            f"{base_footer}"
        )

    return subject, body


def process_all_reminders():
    """
    Procesa todos los recordatorios pendientes:
    - Pagos próximos (5 días antes)
    - Pagos que vencen hoy
    - Pagos vencidos hace 3 días
    - Pagos vencidos hace 7 días

    Returns:
        dict con contadores de recordatorios enviados por tipo.
    """
    today = timezone.now().date()
    stats = {
        "upcoming": 0,
        "due_today": 0,
        "overdue_3_days": 0,
        "overdue_7_days": 0,
        "errors": 0,
    }

    # 1. Pagos próximos a vencer (5 días antes)
    upcoming = get_upcoming_payments(days_ahead=5)
    for payment in upcoming:
        if payment.due_date != today:  # Los de hoy se manejan aparte
            if send_payment_reminder(payment, "upcoming"):
                stats["upcoming"] += 1
            else:
                stats["errors"] += 1

    # 2. Pagos que vencen hoy
    due_today = Transaction.objects.filter(
        status="pending",
        due_date=today,
    ).select_related("payer", "payee", "contract", "property")

    for payment in due_today:
        if send_payment_reminder(payment, "due_today"):
            stats["due_today"] += 1
        else:
            stats["errors"] += 1

    # 3. Pagos vencidos hace 3 días
    three_days_ago = today - timedelta(days=3)
    overdue_3 = Transaction.objects.filter(
        status="pending",
        due_date=three_days_ago,
    ).select_related("payer", "payee", "contract", "property")

    for payment in overdue_3:
        if send_payment_reminder(payment, "overdue_3_days"):
            stats["overdue_3_days"] += 1
        else:
            stats["errors"] += 1

    # 4. Pagos vencidos hace 7 días
    seven_days_ago = today - timedelta(days=7)
    overdue_7 = Transaction.objects.filter(
        status="pending",
        due_date=seven_days_ago,
    ).select_related("payer", "payee", "contract", "property")

    for payment in overdue_7:
        if send_payment_reminder(payment, "overdue_7_days"):
            stats["overdue_7_days"] += 1
        else:
            stats["errors"] += 1

    logger.info(
        f"Recordatorios procesados: "
        f"upcoming={stats['upcoming']}, due_today={stats['due_today']}, "
        f"overdue_3={stats['overdue_3_days']}, overdue_7={stats['overdue_7_days']}, "
        f"errores={stats['errors']}"
    )

    return stats


# T3.3 · Notificaciones de PaymentOrder con consecutivo


def send_payment_order_reminder(order, reminder_type="upcoming"):
    """Envía email de recordatorio para una PaymentOrder específica.

    A diferencia de send_payment_reminder (basado en RentPaymentSchedule),
    este usa PaymentOrder.order_number como referencia auditable y
    refleja correctamente el desglose monto base + intereses moratorios
    cuando aplique.

    Args:
        order: instancia de payments.models.PaymentOrder
        reminder_type: 'upcoming' (3 días antes), 'overdue' (vencida),
                       'late_fee' (mora aplicada con saldo actualizado)
    """
    payer = order.payer
    if not payer or not payer.email:
        logger.info(f"Order {order.order_number} sin payer.email; skip")
        return False

    payer_name = payer.get_full_name() or payer.email
    amount_str = f"${order.total_amount:,.0f}"
    has_interest = order.interest_amount and order.interest_amount > 0
    interest_str = f"${order.interest_amount:,.0f}" if has_interest else None

    base_footer = (
        "\n\n---\n"
        f"Consecutivo auditable: {order.order_number}\n"
        "Si ya realizó este pago, por favor ignore este mensaje.\n"
        "VeriHome — Plataforma inmobiliaria."
    )

    if reminder_type == "upcoming":
        subject = f"[VeriHome] Recordatorio de pago próximo — {order.order_number}"
        body = (
            f'Estimado/a {payer_name},\n\n'
            f'Su orden de pago {order.order_number} vence el '
            f'{order.date_due.strftime("%d/%m/%Y")}.\n\n'
            f'  - Tipo: {order.get_order_type_display()}\n'
            f'  - Monto base: ${order.amount:,.0f}\n'
            f'  - Total a pagar: {amount_str}\n\n'
            f'Le recomendamos pagar antes del vencimiento para evitar '
            f'recargos por mora según la tasa legal vigente.'
            f'{base_footer}'
        )
    elif reminder_type == "overdue":
        subject = f"[VeriHome] Pago VENCIDO — {order.order_number}"
        body = (
            f'Estimado/a {payer_name},\n\n'
            f'Su orden de pago {order.order_number} está VENCIDA desde '
            f'{order.date_due.strftime("%d/%m/%Y")}.\n\n'
            f'  - Monto base: ${order.amount:,.0f}\n'
        )
        if has_interest:
            body += f"  - Intereses moratorios acumulados: {interest_str}\n"
        body += (
            f"  - Total a pagar: {amount_str}\n\n"
            f"Se aplican intereses diarios según la tasa legal colombiana "
            f"vigente. Realice el pago a la mayor brevedad para evitar "
            f"que el saldo siga incrementando."
            f"{base_footer}"
        )
    elif reminder_type == "late_fee":
        subject = f"[VeriHome] Intereses moratorios aplicados — {order.order_number}"
        body = (
            f'Estimado/a {payer_name},\n\n'
            f'Le informamos que se han aplicado intereses moratorios a su '
            f'orden de pago {order.order_number}:\n\n'
            f'  - Monto base original: ${order.amount:,.0f}\n'
            f'  - Intereses moratorios acumulados: {interest_str or "$0"}\n'
            f'  - SALDO ACTUAL: {amount_str}\n\n'
            f'El cálculo se realiza diariamente sobre el saldo, según la '
            f'tasa legal certificada por la Superintendencia Financiera de '
            f'Colombia, con tope máximo de {order.rent_schedule.legal_grace_days_max if order.rent_schedule else 30} '
            f'días de mora computable. Pasado ese plazo procede acción jurídica.'
            f'{base_footer}'
        )
    else:
        subject = f"[VeriHome] Notificación — {order.order_number}"
        body = (
            f"Estimado/a {payer_name},\n\n"
            f"Tiene una orden de pago pendiente: {order.order_number} "
            f"por {amount_str}."
            f"{base_footer}"
        )

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@verihome.co"),
            recipient_list=[payer.email],
            fail_silently=False,
        )
        order.add_audit_event(
            f"reminder_sent_{reminder_type}",
            f"Email enviado a {payer.email}",
        )
        logger.info(
            f"PaymentOrder reminder ({reminder_type}) sent for {order.order_number}"
        )
        return True
    except Exception as e:
        logger.error(
            f"Failed to send PaymentOrder reminder for {order.order_number}: {e}"
        )
        return False


def escalate_severely_overdue():
    """
    Escala pagos severamente vencidos (más de 15 días).
    Envía notificación tanto al arrendatario como al arrendador,
    y marca la transacción con metadata de escalamiento.

    Returns:
        dict con contadores de escalamientos realizados.
    """
    today = timezone.now().date()
    cutoff_date = today - timedelta(days=15)

    severely_overdue = Transaction.objects.filter(
        status="pending",
        due_date__lte=cutoff_date,
    ).select_related("payer", "payee", "contract", "property")

    stats = {"escalated": 0, "errors": 0}

    for payment in severely_overdue:
        # Verificar si ya fue escalado esta semana
        metadata = payment.metadata or {}
        last_escalation = metadata.get("last_escalation_date")
        if last_escalation:
            from datetime import date

            try:
                last_date = date.fromisoformat(last_escalation)
                if (today - last_date).days < 7:
                    continue  # Ya se escaló esta semana
            except (ValueError, TypeError):
                pass

        days_overdue = (today - payment.due_date).days
        payer = payment.payer
        payee = payment.payee

        amount_display = f"${payment.amount:,.2f} {payment.currency}"
        due_date_display = payment.due_date.strftime("%d/%m/%Y")

        contract_ref = "N/A"
        if payment.contract:
            contract_ref = payment.contract.title or f"Contrato #{payment.contract.id}"

        property_address = "N/A"
        if payment.property:
            property_address = payment.property.address or payment.property.title

        # Notificar al arrendador (payee)
        if payee.email:
            try:
                send_mail(
                    subject=f"[VeriHome] ESCALAMIENTO: Pago vencido hace {days_overdue} días",
                    message=(
                        f"Estimado/a {payee.get_full_name() or payee.email},\n\n"
                        f"Le informamos que el siguiente pago de su arrendatario "
                        f"({payer.get_full_name() or payer.email}) se encuentra vencido "
                        f"desde hace {days_overdue} días:\n\n"
                        f"  - Transacción: {payment.transaction_number}\n"
                        f"  - Monto: {amount_display}\n"
                        f"  - Vencimiento: {due_date_display}\n"
                        f"  - Contrato: {contract_ref}\n"
                        f"  - Propiedad: {property_address}\n\n"
                        f"Recomendamos contactar directamente al arrendatario "
                        f"para resolver esta situación.\n\n"
                        f"---\n"
                        f"Mensaje automático de VeriHome."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[payee.email],
                    fail_silently=False,
                )
            except Exception as e:
                logger.error(f"Error enviando escalamiento a payee {payee.email}: {e}")
                stats["errors"] += 1

        # Notificar al arrendatario (payer) con tono más urgente
        if payer.email:
            try:
                send_mail(
                    subject=(
                        f"[VeriHome] ESCALAMIENTO URGENTE: "
                        f"Pago vencido hace {days_overdue} días - {payment.transaction_number}"
                    ),
                    message=(
                        f"Estimado/a {payer.get_full_name() or payer.email},\n\n"
                        f"AVISO DE ESCALAMIENTO: Su pago lleva {days_overdue} días de mora:\n\n"
                        f"  - Transacción: {payment.transaction_number}\n"
                        f"  - Monto: {amount_display}\n"
                        f"  - Vencimiento: {due_date_display}\n"
                        f"  - Contrato: {contract_ref}\n"
                        f"  - Propiedad: {property_address}\n\n"
                        f"Este caso ha sido escalado. Por favor regularice su pago "
                        f"de inmediato para evitar acciones legales conforme a la "
                        f"legislación colombiana vigente (Ley 820 de 2003).\n\n"
                        f"---\n"
                        f"Mensaje automático de VeriHome."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[payer.email],
                    fail_silently=False,
                )
            except Exception as e:
                logger.error(f"Error enviando escalamiento a payer {payer.email}: {e}")
                stats["errors"] += 1

        # Registrar escalamiento en metadata
        metadata["last_escalation_date"] = today.isoformat()
        metadata["escalation_count"] = metadata.get("escalation_count", 0) + 1
        payment.metadata = metadata
        payment.save(update_fields=["metadata"])

        stats["escalated"] += 1
        logger.info(
            f"Pago {payment.transaction_number} escalado "
            f"({days_overdue} días vencido, escalamiento #{metadata['escalation_count']})"
        )

    logger.info(
        f"Escalamientos procesados: {stats['escalated']} escalados, "
        f"{stats['errors']} errores"
    )

    return stats
