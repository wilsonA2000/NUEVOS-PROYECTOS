"""
Servicio de Gestión de Invitaciones de Contratos
Maneja tokens seguros, notificaciones por email/SMS y validación de invitaciones
Incluye sistema de seguimiento, reenvío automático y expiración de tokens
"""

import secrets
import hashlib
from datetime import timedelta
from typing import Optional, Dict, Any, List, Tuple

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.db import transaction
from django.contrib.auth import get_user_model

from .landlord_contract_models import (
    LandlordControlledContract,
    ContractInvitation,
    ContractWorkflowHistory,
)
from core.notification_service import NotificationService

User = get_user_model()


class InvitationTokenService:
    """
    Servicio para generar y validar tokens seguros de invitación
    """

    @staticmethod
    def generate_secure_token() -> str:
        """Generar token seguro de 32 caracteres"""
        return secrets.token_urlsafe(32)

    @staticmethod
    def generate_token_hash(token: str) -> str:
        """Generar hash del token para almacenamiento seguro"""
        return hashlib.sha256(token.encode()).hexdigest()

    @staticmethod
    def validate_token_format(token: str) -> bool:
        """Validar formato básico del token"""
        return len(token) == 43 and token.replace("-", "").replace("_", "").isalnum()


class ContractInvitationService:
    """
    Servicio principal para gestión de invitaciones de contratos
    """

    def __init__(self):
        self.token_service = InvitationTokenService()
        self.notification_service = NotificationService()

    def create_invitation(
        self,
        contract_id: str,
        landlord: User,
        tenant_email: str,
        tenant_phone: Optional[str] = None,
        tenant_name: Optional[str] = None,
        invitation_method: str = "email",
        personal_message: Optional[str] = None,
        expires_in_days: int = 7,
    ) -> Tuple[ContractInvitation, str]:
        """
        Crear nueva invitación para arrendatario

        Returns:
            Tuple[ContractInvitation, str]: Instancia de invitación y token sin hash
        """
        try:
            contract = LandlordControlledContract.objects.get(
                id=contract_id, landlord=landlord
            )

            # Validar estado del contrato
            if contract.current_state not in ["DRAFT", "TENANT_INVITED"]:
                raise ValueError(
                    f"No se puede invitar en estado {contract.current_state}"
                )

            with transaction.atomic():
                # Generar token seguro
                token = self.token_service.generate_secure_token()
                token_hash = self.token_service.generate_token_hash(token)

                # Crear invitación
                invitation = ContractInvitation.objects.create(
                    contract=contract,
                    token_hash=token_hash,
                    tenant_email=tenant_email,
                    tenant_phone=tenant_phone,
                    tenant_name=tenant_name or "Arrendatario",
                    invitation_method=invitation_method,
                    personal_message=personal_message,
                    expires_at=timezone.now() + timedelta(days=expires_in_days),
                    created_by=landlord,
                )

                # Actualizar estado del contrato
                contract.tenant_email = tenant_email
                if tenant_name:
                    if not contract.tenant_data:
                        contract.tenant_data = {}
                    contract.tenant_data["full_name"] = tenant_name

                contract.current_state = "TENANT_INVITED"
                contract.save()

                # Registrar en historial
                ContractWorkflowHistory.objects.create(
                    contract=contract,
                    action="INVITATION_SENT",
                    performed_by=landlord,
                    details={
                        "tenant_email": tenant_email,
                        "invitation_method": invitation_method,
                        "expires_at": invitation.expires_at.isoformat(),
                    },
                )

                return invitation, token

        except LandlordControlledContract.DoesNotExist:
            raise ValueError("Contrato no encontrado o sin permisos")

    def send_invitation_notification(
        self, invitation: ContractInvitation, token: str
    ) -> bool:
        """
        Enviar notificación de invitación por el método especificado
        """
        try:
            contract = invitation.contract

            # Construir enlace de invitación
            invitation_url = f"{settings.FRONTEND_URL}/tenant/invitation/{token}"

            # Preparar contexto para templates
            context = {
                "tenant_name": invitation.tenant_name,
                "landlord_name": contract.landlord_data.get(
                    "full_name", contract.landlord.get_full_name()
                ),
                "property_address": contract.property_address,
                "monthly_rent": contract.monthly_rent,
                "security_deposit": contract.security_deposit,
                "contract_duration": contract.contract_duration_months,
                "invitation_url": invitation_url,
                "expires_at": invitation.expires_at,
                "personal_message": invitation.personal_message,
                "contract_number": contract.contract_number,
            }

            # Enviar según método
            if invitation.invitation_method == "email":
                return self._send_email_invitation(invitation, context)
            elif invitation.invitation_method == "sms":
                return self._send_sms_invitation(invitation, context)
            elif invitation.invitation_method == "whatsapp":
                return self._send_whatsapp_invitation(invitation, context)
            else:
                raise ValueError(
                    f"Método de invitación no soportado: {invitation.invitation_method}"
                )

        except Exception as e:
            print(f"Error enviando invitación: {e}")
            return False

    def _send_email_invitation(
        self, invitation: ContractInvitation, context: Dict[str, Any]
    ) -> bool:
        """Enviar invitación por email"""
        try:
            subject = f"Invitación de Contrato de Arrendamiento - {context['property_address']}"

            # Renderizar templates HTML y texto
            html_message = render_to_string("contracts/email/invitation.html", context)
            text_message = render_to_string("contracts/email/invitation.txt", context)

            # Enviar email
            send_mail(
                subject=subject,
                message=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[invitation.tenant_email],
                html_message=html_message,
                fail_silently=False,
            )

            # Actualizar estado
            invitation.status = "sent"
            invitation.sent_at = timezone.now()
            invitation.save()

            return True

        except Exception as e:
            print(f"Error enviando email: {e}")
            invitation.status = "failed"
            invitation.error_message = str(e)
            invitation.save()
            return False

    def _send_sms_invitation(
        self, invitation: ContractInvitation, context: Dict[str, Any]
    ) -> bool:
        """Enviar invitación por SMS"""
        try:
            # Preparar mensaje SMS (máximo 160 caracteres)
            message = (
                f"Hola {context['tenant_name']}! "
                f"Te invitamos a revisar el contrato para {context['property_address']}. "
                f"Canon: ${context['monthly_rent']:,.0f}. "
                f"Enlace: {context['invitation_url']}"
            )

            # Truncar si es muy largo
            if len(message) > 160:
                message = message[:157] + "..."

            # Enviar SMS (integración con servicio real)
            success = self._send_sms(invitation.tenant_phone, message)

            if success:
                invitation.status = "sent"
                invitation.sent_at = timezone.now()
                invitation.save()
                return True
            else:
                invitation.status = "failed"
                invitation.error_message = "Error enviando SMS"
                invitation.save()
                return False

        except Exception as e:
            print(f"Error enviando SMS: {e}")
            invitation.status = "failed"
            invitation.error_message = str(e)
            invitation.save()
            return False

    def _send_whatsapp_invitation(
        self, invitation: ContractInvitation, context: Dict[str, Any]
    ) -> bool:
        """Enviar invitación por WhatsApp"""
        try:
            # Preparar mensaje WhatsApp
            message = (
                f"¡Hola {context['tenant_name']}! 😊\n\n"
                f"Te invitamos a revisar el contrato de arrendamiento para:\n"
                f"🏠 {context['property_address']}\n"
                f"💰 Canon: ${context['monthly_rent']:,.0f}\n"
                f"🔒 Depósito: ${context['security_deposit']:,.0f}\n"
                f"📅 Duración: {context['contract_duration']} meses\n\n"
                f"Revisa aquí: {context['invitation_url']}\n\n"
                f"¡Gracias! - {context['landlord_name']}"
            )

            # Enviar WhatsApp (integración con WhatsApp Business API)
            success = self._send_whatsapp(invitation.tenant_phone, message)

            if success:
                invitation.status = "sent"
                invitation.sent_at = timezone.now()
                invitation.save()
                return True
            else:
                invitation.status = "failed"
                invitation.error_message = "Error enviando WhatsApp"
                invitation.save()
                return False

        except Exception as e:
            print(f"Error enviando WhatsApp: {e}")
            invitation.status = "failed"
            invitation.error_message = str(e)
            invitation.save()
            return False

    def _send_sms(self, phone: str, message: str) -> bool:
        """
        Integración con servicio de SMS (placeholder)
        En producción integrar con Twilio, AWS SNS, etc.
        """
        # Simulación para desarrollo
        print(f"SMS to {phone}: {message}")
        return True

    def _send_whatsapp(self, phone: str, message: str) -> bool:
        """
        Integración con WhatsApp Business API (placeholder)
        En producción integrar con WhatsApp Business API
        """
        # Simulación para desarrollo
        print(f"WhatsApp to {phone}: {message}")
        return True

    def verify_invitation_token(self, token: str) -> Dict[str, Any]:
        """
        Verificar validez de token de invitación
        """
        try:
            # Validar formato
            if not self.token_service.validate_token_format(token):
                return {"is_valid": False, "error": "Formato de token inválido"}

            # Buscar invitación
            token_hash = self.token_service.generate_token_hash(token)
            invitation = ContractInvitation.objects.select_related("contract").get(
                token_hash=token_hash
            )

            # Verificar expiración
            if timezone.now() > invitation.expires_at:
                invitation.status = "expired"
                invitation.save()
                return {"is_valid": False, "error": "Token expirado"}

            # Verificar que no haya sido ya usado
            if invitation.status == "accepted":
                return {"is_valid": False, "error": "Invitación ya aceptada"}

            # Marcar como abierto si es la primera vez
            if invitation.status == "sent":
                invitation.status = "opened"
                invitation.opened_at = timezone.now()
                invitation.save()

            return {
                "is_valid": True,
                "contract_id": str(invitation.contract.id),
                "expires_at": invitation.expires_at.isoformat(),
                "landlord_name": invitation.contract.landlord_data.get("full_name", ""),
                "property_address": invitation.contract.property_address,
            }

        except ContractInvitation.DoesNotExist:
            return {"is_valid": False, "error": "Token no encontrado"}
        except Exception as e:
            return {"is_valid": False, "error": f"Error validando token: {str(e)}"}

    def get_invitation_info(self, token: str) -> Dict[str, Any]:
        """
        Obtener información pública de la invitación
        """
        try:
            token_hash = self.token_service.generate_token_hash(token)
            invitation = ContractInvitation.objects.select_related("contract").get(
                token_hash=token_hash
            )

            contract = invitation.contract

            return {
                "contract_id": str(contract.id),
                "property_address": contract.property_address,
                "monthly_rent": float(contract.monthly_rent),
                "security_deposit": float(contract.security_deposit),
                "landlord_name": contract.landlord_data.get("full_name", ""),
                "contract_duration_months": contract.contract_duration_months,
                "invitation_expires_at": invitation.expires_at.isoformat(),
                "property_details": {
                    "type": contract.get_property_type_display(),
                    "area": contract.property_area or 0,
                    "rooms": contract.property_rooms or 0,
                    "bathrooms": contract.property_bathrooms or 0,
                    "amenities": contract.property_amenities or [],
                },
            }

        except ContractInvitation.DoesNotExist:
            raise ValueError("Invitación no encontrada")

    def accept_invitation(self, token: str, tenant: User) -> LandlordControlledContract:
        """
        Aceptar invitación y asociar arrendatario al contrato
        """
        try:
            with transaction.atomic():
                # Verificar token
                verification = self.verify_invitation_token(token)
                if not verification["is_valid"]:
                    raise ValueError(verification["error"])

                # Obtener invitación y contrato
                token_hash = self.token_service.generate_token_hash(token)
                invitation = ContractInvitation.objects.select_related("contract").get(
                    token_hash=token_hash
                )
                contract = invitation.contract

                # Asociar arrendatario
                contract.tenant = tenant
                contract.current_state = "TENANT_REVIEWING"
                contract.save()

                # Marcar invitación como aceptada
                invitation.status = "accepted"
                invitation.accepted_at = timezone.now()
                invitation.accepted_by = tenant
                invitation.save()

                # Registrar en historial
                ContractWorkflowHistory.objects.create(
                    contract=contract,
                    action="INVITATION_ACCEPTED",
                    performed_by=tenant,
                    details={
                        "invitation_id": str(invitation.id),
                        "accepted_at": invitation.accepted_at.isoformat(),
                    },
                )

                # Notificar al arrendador
                self._notify_landlord_invitation_accepted(contract, tenant)

                return contract

        except ContractInvitation.DoesNotExist:
            raise ValueError("Invitación no encontrada")

    def _notify_landlord_invitation_accepted(
        self, contract: LandlordControlledContract, tenant: User
    ):
        """Notificar al arrendador que la invitación fue aceptada"""
        try:
            context = {
                "landlord_name": contract.landlord_data.get(
                    "full_name", contract.landlord.get_full_name()
                ),
                "tenant_name": tenant.get_full_name(),
                "property_address": contract.property_address,
                "contract_number": contract.contract_number,
                "contract_url": f"{settings.FRONTEND_URL}/contracts/{contract.id}",
            }

            subject = f"Invitación Aceptada - Contrato {contract.contract_number}"
            html_message = render_to_string(
                "contracts/email/invitation_accepted.html", context
            )
            text_message = render_to_string(
                "contracts/email/invitation_accepted.txt", context
            )

            send_mail(
                subject=subject,
                message=text_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[contract.landlord.email],
                html_message=html_message,
                fail_silently=True,
            )

        except Exception as e:
            print(f"Error enviando notificación de aceptación: {e}")

    def resend_invitation(self, contract_id: str, landlord: User) -> bool:
        """
        Reenviar invitación existente
        """
        try:
            contract = LandlordControlledContract.objects.get(
                id=contract_id, landlord=landlord
            )

            # Buscar invitación activa
            invitation = (
                ContractInvitation.objects.filter(
                    contract=contract, status__in=["sent", "opened"]
                )
                .order_by("-created_at")
                .first()
            )

            if not invitation:
                raise ValueError("No hay invitación activa para reenviar")

            # Verificar que no haya expirado
            if timezone.now() > invitation.expires_at:
                raise ValueError("La invitación ha expirado")

            # Generar nuevo token
            token = self.token_service.generate_secure_token()
            token_hash = self.token_service.generate_token_hash(token)

            # Actualizar invitación
            invitation.token_hash = token_hash
            invitation.attempts += 1
            invitation.last_resent_at = timezone.now()
            invitation.save()

            # Enviar notificación
            success = self.send_invitation_notification(invitation, token)

            if success:
                # Registrar en historial
                ContractWorkflowHistory.objects.create(
                    contract=contract,
                    action="INVITATION_RESENT",
                    performed_by=landlord,
                    details={"attempts": invitation.attempts},
                )

            return success

        except LandlordControlledContract.DoesNotExist:
            raise ValueError("Contrato no encontrado o sin permisos")

    def get_invitation_history(
        self, contract_id: str, user: User
    ) -> List[Dict[str, Any]]:
        """
        Obtener historial de invitaciones para un contrato
        """
        try:
            contract = LandlordControlledContract.objects.get(id=contract_id)

            # Verificar permisos
            if contract.landlord != user and contract.tenant != user:
                raise ValueError("Sin permisos para ver historial")

            invitations = ContractInvitation.objects.filter(contract=contract).order_by(
                "-created_at"
            )

            history = []
            for invitation in invitations:
                history.append(
                    {
                        "id": str(invitation.id),
                        "tenant_email": invitation.tenant_email,
                        "tenant_phone": invitation.tenant_phone,
                        "method": invitation.invitation_method,
                        "status": invitation.status,
                        "sent_at": invitation.sent_at.isoformat()
                        if invitation.sent_at
                        else None,
                        "opened_at": invitation.opened_at.isoformat()
                        if invitation.opened_at
                        else None,
                        "accepted_at": invitation.accepted_at.isoformat()
                        if invitation.accepted_at
                        else None,
                        "expires_at": invitation.expires_at.isoformat(),
                        "attempts": invitation.attempts,
                        "last_resent_at": invitation.last_resent_at.isoformat()
                        if invitation.last_resent_at
                        else None,
                        "personal_message": invitation.personal_message,
                        "error_message": invitation.error_message,
                    }
                )

            return history

        except LandlordControlledContract.DoesNotExist:
            raise ValueError("Contrato no encontrado")

    def cleanup_expired_invitations(self) -> int:
        """
        Tarea de limpieza para marcar invitaciones expiradas
        Debe ejecutarse periódicamente (ej: tarea de Celery)
        """
        expired_count = ContractInvitation.objects.filter(
            expires_at__lt=timezone.now(), status__in=["sent", "opened"]
        ).update(status="expired")

        return expired_count
