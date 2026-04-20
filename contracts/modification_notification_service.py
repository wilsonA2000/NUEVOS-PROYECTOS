"""
Servicio de Notificaciones por Email para Modificaciones de Contratos

Maneja el envío de emails cuando:
- Un arrendatario solicita una modificación
- Un arrendador responde a una solicitud (aprueba/rechaza)
"""

from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)


class ModificationNotificationService:
    """Servicio para enviar notificaciones por email sobre modificaciones de contratos."""

    @staticmethod
    def send_modification_request_notification(
        modification_request, contract, landlord_email: str
    ) -> bool:
        """
        Envía email al arrendador cuando un arrendatario solicita una modificación.

        Args:
            modification_request: Instancia de ContractModificationRequest
            contract: Instancia de LandlordControlledContract
            landlord_email: Email del arrendador

        Returns:
            bool: True si se envió exitosamente, False en caso contrario
        """
        try:
            # Datos para el template
            context = {
                "landlord_name": contract.landlord_data.get("full_name", "Arrendador"),
                "tenant_name": contract.tenant_data.get("full_name", "Arrendatario"),
                "contract_number": contract.contract_number,
                "property_address": contract.property_address,
                "revision_number": modification_request.revision_number,
                "reason": modification_request.reason,
                "requested_changes": modification_request.requested_changes,
                "dashboard_url": f"{settings.FRONTEND_URL}/app/landlord/candidates",
            }

            # Renderizar template HTML
            html_message = render_to_string(
                "emails/modification_request_notification.html", context
            )

            # Versión en texto plano
            plain_message = strip_tags(html_message)

            # Asunto del email
            subject = f"📝 Nueva Solicitud de Modificación - Contrato #{contract.contract_number}"

            # Crear email con versión HTML y texto plano
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[landlord_email],
            )
            email.attach_alternative(html_message, "text/html")

            # Enviar email
            email.send()

            logger.info(
                f"Email de solicitud de modificación enviado a {landlord_email} "
                f"para contrato {contract.contract_number}"
            )
            return True

        except Exception as e:
            logger.error(f"Error enviando email de solicitud de modificación: {str(e)}")
            return False

    @staticmethod
    def send_modification_response_notification(
        modification_request,
        contract,
        tenant_email: str,
        approved: bool,
        landlord_response: str = None,
    ) -> bool:
        """
        Envía email al arrendatario cuando el arrendador responde a una solicitud.

        Args:
            modification_request: Instancia de ContractModificationRequest
            contract: Instancia de LandlordControlledContract
            tenant_email: Email del arrendatario
            approved: True si fue aprobada, False si fue rechazada
            landlord_response: Comentario del arrendador

        Returns:
            bool: True si se envió exitosamente, False en caso contrario
        """
        try:
            # Datos para el template
            context = {
                "tenant_name": contract.tenant_data.get("full_name", "Arrendatario"),
                "landlord_name": contract.landlord_data.get("full_name", "Arrendador"),
                "contract_number": contract.contract_number,
                "property_address": contract.property_address,
                "revision_number": modification_request.revision_number,
                "approved": approved,
                "status_text": "Aprobada" if approved else "Rechazada",
                "landlord_response": landlord_response
                or (
                    "Su solicitud ha sido aprobada. El arrendador procederá a editar el contrato."
                    if approved
                    else "Su solicitud ha sido rechazada."
                ),
                "dashboard_url": f"{settings.FRONTEND_URL}/app/tenant/contracts",
            }

            # Renderizar template HTML
            html_message = render_to_string(
                "emails/modification_response_notification.html", context
            )

            # Versión en texto plano
            plain_message = strip_tags(html_message)

            # Asunto del email
            status_emoji = "✅" if approved else "❌"
            status_text = "Aprobada" if approved else "Rechazada"
            subject = f"{status_emoji} Solicitud de Modificación {status_text} - Contrato #{contract.contract_number}"

            # Crear email con versión HTML y texto plano
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[tenant_email],
            )
            email.attach_alternative(html_message, "text/html")

            # Enviar email
            email.send()

            logger.info(
                f"Email de respuesta de modificación enviado a {tenant_email} "
                f"para contrato {contract.contract_number} - Estado: {status_text}"
            )
            return True

        except Exception as e:
            logger.error(f"Error enviando email de respuesta de modificación: {str(e)}")
            return False

    @staticmethod
    def send_modification_implemented_notification(
        modification_request, contract, tenant_email: str
    ) -> bool:
        """
        Envía email al arrendatario cuando el arrendador completa la edición del contrato.

        Args:
            modification_request: Instancia de ContractModificationRequest
            contract: Instancia de LandlordControlledContract
            tenant_email: Email del arrendatario

        Returns:
            bool: True si se envió exitosamente, False en caso contrario
        """
        try:
            # Datos para el template
            context = {
                "tenant_name": contract.tenant_data.get("full_name", "Arrendatario"),
                "landlord_name": contract.landlord_data.get("full_name", "Arrendador"),
                "contract_number": contract.contract_number,
                "property_address": contract.property_address,
                "revision_number": modification_request.revision_number,
                "dashboard_url": f"{settings.FRONTEND_URL}/app/tenant/contracts",
            }

            # Renderizar template HTML
            html_message = render_to_string(
                "emails/modification_implemented_notification.html", context
            )

            # Versión en texto plano
            plain_message = strip_tags(html_message)

            # Asunto del email
            subject = f"🎉 Contrato Actualizado - #{contract.contract_number}"

            # Crear email con versión HTML y texto plano
            email = EmailMultiAlternatives(
                subject=subject,
                body=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[tenant_email],
            )
            email.attach_alternative(html_message, "text/html")

            # Enviar email
            email.send()

            logger.info(
                f"Email de modificación implementada enviado a {tenant_email} "
                f"para contrato {contract.contract_number}"
            )
            return True

        except Exception as e:
            logger.error(f"Error enviando email de modificación implementada: {str(e)}")
            return False
