"""
Servicio para gestionar el flujo de trabajo de contratos controlados por arrendador.
Sistema de workflow paso a paso que garantiza seguridad jurídica y trazabilidad completa.
"""

from django.db import transaction, models
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError, PermissionDenied
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from typing import Dict, List, Optional, Tuple
import secrets
import uuid
from datetime import timedelta
import logging

from .landlord_contract_models import (
    LandlordControlledContract,
    ContractObjection,
    LandlordContractGuarantee,
    ContractWorkflowHistory
)
from core.notification_service import NotificationService

User = get_user_model()
logger = logging.getLogger(__name__)


class LandlordContractService:
    """
    Servicio principal para gestionar el ciclo de vida completo de contratos
    controlados por arrendador con workflow paso a paso.
    """

    def __init__(self):
        self.logger = logger

    # =====================================================================
    # FASE 1: CREACIÓN Y CONFIGURACIÓN INICIAL DEL CONTRATO
    # =====================================================================

    def create_contract_draft(
        self,
        landlord: User,
        property_id: str,
        contract_template: str,
        basic_terms: Dict
    ) -> LandlordControlledContract:
        """
        Paso 1: Arrendador crea el borrador inicial del contrato.
        
        Args:
            landlord: Usuario arrendador
            property_id: ID de la propiedad
            contract_template: Template base del contrato
            basic_terms: Términos básicos (canon, depósito, etc.)
        
        Returns:
            LandlordControlledContract creado en estado DRAFT
        """
        with transaction.atomic():
            # Validar permisos del arrendador
            if not self._validate_landlord_permissions(landlord):
                raise PermissionDenied("Usuario no tiene permisos de arrendador")
            
            # Validar términos básicos
            self._validate_basic_terms(basic_terms)
            
            # Crear contrato en estado borrador
            contract = LandlordControlledContract.objects.create(
                landlord=landlord,
                property_id=property_id,
                contract_template=contract_template,
                current_state='DRAFT',
                monthly_rent=basic_terms.get('monthly_rent'),
                security_deposit=basic_terms.get('security_deposit'),
                contract_duration_months=basic_terms.get('duration_months', 12),
                utilities_included=basic_terms.get('utilities_included', False),
                pets_allowed=basic_terms.get('pets_allowed', False),
                smoking_allowed=basic_terms.get('smoking_allowed', False)
            )
            
            # Registrar acción en historial
            self._record_history(
                contract=contract,
                user=landlord,
                action_type='CONTRACT_CREATED',
                description=f"Contrato creado para propiedad {property_id}",
                old_state='',
                new_state='DRAFT',
                data_changes={'basic_terms': basic_terms}
            )
            
            # Notificar al arrendador
            NotificationService.notify_contract_draft_created(landlord, contract)
            
            self.logger.info(f"Contrato {contract.contract_number} creado por {landlord.email}")
            return contract

    def complete_landlord_data(
        self,
        contract_id: uuid.UUID,
        landlord: User,
        landlord_data: Dict
    ) -> Tuple[LandlordControlledContract, str]:
        """
        Paso 2: Arrendador completa todos sus datos y términos del contrato.
        
        Args:
            contract_id: ID del contrato
            landlord: Usuario arrendador
            landlord_data: Datos completos del arrendador
        
        Returns:
            Tupla (contrato actualizado, token de invitación)
        """
        with transaction.atomic():
            contract = self._get_contract_for_landlord(contract_id, landlord)
            
            # Validar estado del contrato
            if contract.current_state != 'DRAFT':
                raise ValidationError(f"No se pueden completar datos en estado {contract.current_state}")
            
            # Validar datos del arrendador
            self._validate_landlord_data(landlord_data)
            
            # Generar token de invitación único
            invitation_token = self._generate_secure_token()
            
            # Actualizar contrato
            contract.landlord_data = landlord_data
            contract.current_state = 'TENANT_INVITED'
            contract.invitation_token = invitation_token
            contract.invitation_expires_at = timezone.now() + timedelta(days=7)
            contract.save()
            
            # Registrar en historial
            self._record_history(
                contract=contract,
                user=landlord,
                action_type='LANDLORD_DATA_COMPLETED',
                description="Arrendador completó sus datos",
                old_state='DRAFT',
                new_state='TENANT_INVITED',
                data_changes={'landlord_data_keys': list(landlord_data.keys())}
            )
            
            self.logger.info(f"Datos del arrendador completados para contrato {contract.contract_number}")
            return contract, invitation_token

    # =====================================================================
    # FASE 2: INVITACIÓN Y PARTICIPACIÓN DEL ARRENDATARIO
    # =====================================================================

    def send_tenant_invitation(
        self,
        contract_id: uuid.UUID,
        landlord: User,
        tenant_email: str,
        personal_message: str = ""
    ) -> bool:
        """
        Paso 3: Enviar invitación por email al arrendatario.
        
        Args:
            contract_id: ID del contrato
            landlord: Usuario arrendador
            tenant_email: Email del arrendatario
            personal_message: Mensaje personalizado opcional
        
        Returns:
            True si se envió exitosamente
        """
        with transaction.atomic():
            contract = self._get_contract_for_landlord(contract_id, landlord)
            
            if contract.current_state != 'TENANT_INVITED':
                raise ValidationError("Contrato no está en estado de invitación")
            
            # Actualizar email del arrendatario invitado
            contract.tenant_email = tenant_email
            contract.save()
            
            # Enviar email de invitación personalizado
            success = self._send_invitation_email(
                contract=contract,
                tenant_email=tenant_email,
                personal_message=personal_message
            )
            
            if success:
                # Registrar en historial
                self._record_history(
                    contract=contract,
                    user=landlord,
                    action_type='INVITATION_SENT',
                    description=f"Invitación enviada a {tenant_email}",
                    old_state='TENANT_INVITED',
                    new_state='TENANT_INVITED',
                    data_changes={'tenant_email': tenant_email}
                )
                
                # Crear usuario temporal si no existe
                try:
                    temp_user = User.objects.get(email=tenant_email)
                except User.DoesNotExist:
                    # Crear usuario temporal para notificación
                    temp_user = User.objects.create_user(
                        username=tenant_email,
                        email=tenant_email,
                        first_name='Arrendatario',
                        last_name='Invitado'
                    )
                
                # Enviar notificación de invitación
                NotificationService.notify_tenant_invited(
                    tenant=temp_user,
                    contract=contract,
                    landlord=landlord
                )
            
            return success

    def accept_tenant_invitation(
        self,
        invitation_token: str,
        tenant: User
    ) -> LandlordControlledContract:
        """
        Paso 4: Arrendatario acepta la invitación.
        
        Args:
            invitation_token: Token de invitación
            tenant: Usuario arrendatario
        
        Returns:
            Contrato actualizado
        """
        with transaction.atomic():
            try:
                contract = LandlordControlledContract.objects.get(
                    invitation_token=invitation_token,
                    invitation_expires_at__gt=timezone.now()
                )
            except LandlordControlledContract.DoesNotExist:
                raise ValidationError("Token de invitación inválido o expirado")
            
            # Verificar que el email coincida
            if contract.tenant_email != tenant.email:
                raise PermissionDenied("El email no coincide con la invitación")
            
            # Asignar arrendatario al contrato
            contract.tenant = tenant
            contract.current_state = 'TENANT_REVIEWING'
            contract.save()
            
            # Registrar en historial
            self._record_history(
                contract=contract,
                user=tenant,
                action_type='INVITATION_ACCEPTED',
                description="Arrendatario aceptó la invitación",
                old_state='TENANT_INVITED',
                new_state='TENANT_REVIEWING',
                data_changes={'tenant_assigned': tenant.email}
            )
            
            self.logger.info(f"Invitación aceptada por {tenant.email} para contrato {contract.contract_number}")
            return contract

    def complete_tenant_data(
        self,
        contract_id: uuid.UUID,
        tenant: User,
        tenant_data: Dict
    ) -> LandlordControlledContract:
        """
        Paso 5: Arrendatario completa sus datos.
        
        Args:
            contract_id: ID del contrato
            tenant: Usuario arrendatario
            tenant_data: Datos del arrendatario
        
        Returns:
            Contrato actualizado
        """
        with transaction.atomic():
            contract = self._get_contract_for_tenant(contract_id, tenant)
            
            if contract.current_state != 'TENANT_REVIEWING':
                raise ValidationError(f"No se pueden completar datos en estado {contract.current_state}")
            
            # Validar datos del arrendatario
            self._validate_tenant_data(tenant_data)
            
            # Actualizar contrato
            contract.tenant_data = tenant_data
            contract.current_state = 'LANDLORD_REVIEWING'
            contract.save()
            
            # Registrar en historial
            self._record_history(
                contract=contract,
                user=tenant,
                action_type='TENANT_DATA_COMPLETED',
                description="Arrendatario completó sus datos",
                old_state='TENANT_REVIEWING',
                new_state='LANDLORD_REVIEWING',
                data_changes={'tenant_data_keys': list(tenant_data.keys())}
            )
            
            # Notificar al arrendador
            self._notify_landlord_tenant_completed(contract)
            
            return contract

    # =====================================================================
    # FASE 3: REVISIÓN Y MANEJO DE OBJECIONES
    # =====================================================================

    def submit_objection(
        self,
        contract_id: uuid.UUID,
        user: User,
        field_name: str,
        current_value: str,
        proposed_value: str,
        justification: str,
        priority: str = 'MEDIUM'
    ) -> ContractObjection:
        """
        Permitir que cualquier parte del contrato presente objeciones.
        
        Args:
            contract_id: ID del contrato
            user: Usuario que presenta la objeción
            field_name: Campo a objetar
            current_value: Valor actual
            proposed_value: Valor propuesto
            justification: Justificación de la objeción
            priority: Prioridad (LOW, MEDIUM, HIGH, CRITICAL)
        
        Returns:
            ContractObjection creada
        """
        with transaction.atomic():
            contract = self._get_contract_for_user(contract_id, user)
            
            # Validar que se puedan presentar objeciones
            if contract.current_state not in ['LANDLORD_REVIEWING', 'TENANT_REVIEWING', 'OBJECTIONS_PENDING']:
                raise ValidationError("No se pueden presentar objeciones en el estado actual")
            
            # Crear objeción
            objection = ContractObjection.objects.create(
                contract=contract,
                objected_by=user,
                field_name=field_name,
                current_value=current_value,
                proposed_value=proposed_value,
                justification=justification,
                priority=priority,
                status='PENDING'
            )
            
            # Cambiar estado del contrato si no estaba ya en objeciones
            if contract.current_state != 'OBJECTIONS_PENDING':
                old_state = contract.current_state
                contract.current_state = 'OBJECTIONS_PENDING'
                contract.save()
                
                # Registrar cambio de estado
                self._record_history(
                    contract=contract,
                    user=user,
                    action_type='OBJECTION_SUBMITTED',
                    description=f"Objeción presentada para campo {field_name}",
                    old_state=old_state,
                    new_state='OBJECTIONS_PENDING',
                    data_changes={'objection_id': str(objection.id)},
                    related_objection=objection
                )
            
            # Notificar a la otra parte
            other_party = contract.tenant if user == contract.landlord else contract.landlord
            self._notify_objection_submitted(contract, objection, other_party)
            
            return objection

    def respond_to_objection(
        self,
        objection_id: uuid.UUID,
        user: User,
        response: str,  # 'ACCEPTED' o 'REJECTED'
        response_note: str = ""
    ) -> ContractObjection:
        """
        Responder a una objeción presentada.
        
        Args:
            objection_id: ID de la objeción
            user: Usuario que responde
            response: 'ACCEPTED' o 'REJECTED'
            response_note: Nota de respuesta
        
        Returns:
            ContractObjection actualizada
        """
        with transaction.atomic():
            try:
                objection = ContractObjection.objects.get(id=objection_id)
            except ContractObjection.DoesNotExist:
                raise ValidationError("Objeción no encontrada")
            
            contract = objection.contract
            
            # Verificar permisos
            if user == objection.objected_by:
                raise PermissionDenied("No puedes responder a tu propia objeción")
            
            if user not in [contract.landlord, contract.tenant]:
                raise PermissionDenied("No tienes permisos para responder esta objeción")
            
            # Actualizar objeción
            objection.status = response
            objection.response_note = response_note
            objection.responded_at = timezone.now()
            objection.responded_by = user
            objection.save()
            
            # Si fue aceptada, aplicar el cambio
            if response == 'ACCEPTED':
                self._apply_objection_change(contract, objection)
            
            # Registrar en historial
            self._record_history(
                contract=contract,
                user=user,
                action_type=f'OBJECTION_{response}',
                description=f"Objeción {response.lower()} para campo {objection.field_name}",
                old_state=contract.current_state,
                new_state=contract.current_state,
                data_changes={'objection_response': response},
                related_objection=objection
            )
            
            # Verificar si todas las objeciones están resueltas
            if self._all_objections_resolved(contract):
                contract.current_state = 'BOTH_REVIEWING'
                contract.save()
                
                self._record_history(
                    contract=contract,
                    user=user,
                    action_type='ALL_OBJECTIONS_RESOLVED',
                    description="Todas las objeciones han sido resueltas",
                    old_state='OBJECTIONS_PENDING',
                    new_state='BOTH_REVIEWING'
                )
            
            return objection

    # =====================================================================
    # FASE 4: APROBACIÓN FINAL
    # =====================================================================

    def approve_contract(
        self,
        contract_id: uuid.UUID,
        user: User
    ) -> LandlordControlledContract:
        """
        Aprobar el contrato final por parte de landlord o tenant.
        
        Args:
            contract_id: ID del contrato
            user: Usuario que aprueba
        
        Returns:
            Contrato actualizado
        """
        with transaction.atomic():
            contract = self._get_contract_for_user(contract_id, user)
            
            if contract.current_state != 'BOTH_REVIEWING':
                raise ValidationError("El contrato no está listo para aprobación")
            
            # Marcar aprobación según el usuario
            if user == contract.landlord:
                contract.landlord_approved = True
                contract.landlord_approved_at = timezone.now()
                approval_type = 'LANDLORD_APPROVED'
            elif user == contract.tenant:
                contract.tenant_approved = True
                contract.tenant_approved_at = timezone.now()
                approval_type = 'TENANT_APPROVED'
            else:
                raise PermissionDenied("Usuario no autorizado para aprobar este contrato")
            
            contract.save()
            
            # Registrar aprobación
            self._record_history(
                contract=contract,
                user=user,
                action_type=approval_type,
                description=f"{user.get_full_name()} aprobó el contrato",
                old_state='BOTH_REVIEWING',
                new_state='BOTH_REVIEWING'
            )
            
            # Verificar si ambas partes han aprobado
            if contract.landlord_approved and contract.tenant_approved:
                contract.current_state = 'READY_TO_SIGN'
                contract.save()
                
                self._record_history(
                    contract=contract,
                    user=user,
                    action_type='BOTH_PARTIES_APPROVED',
                    description="Ambas partes aprobaron el contrato",
                    old_state='BOTH_REVIEWING',
                    new_state='READY_TO_SIGN'
                )
                
                # Notificar que está listo para firmar
                self._notify_ready_to_sign(contract)
            
            return contract

    # =====================================================================
    # FASE 5: FIRMA DIGITAL Y PUBLICACIÓN
    # =====================================================================

    def record_digital_signature(
        self,
        contract_id: uuid.UUID,
        user: User,
        signature_data: Dict
    ) -> LandlordControlledContract:
        """
        Registrar firma digital de una de las partes.
        
        Args:
            contract_id: ID del contrato
            user: Usuario que firma
            signature_data: Datos de la firma digital
        
        Returns:
            Contrato actualizado
        """
        with transaction.atomic():
            contract = self._get_contract_for_user(contract_id, user)
            
            if contract.current_state != 'READY_TO_SIGN':
                raise ValidationError("El contrato no está listo para firmar")
            
            # Registrar firma según el usuario
            if user == contract.landlord:
                contract.landlord_signed = True
                contract.landlord_signed_at = timezone.now()
                contract.landlord_signature_data = signature_data
                signature_type = 'LANDLORD_SIGNED'
            elif user == contract.tenant:
                contract.tenant_signed = True
                contract.tenant_signed_at = timezone.now()
                contract.tenant_signature_data = signature_data
                signature_type = 'TENANT_SIGNED'
            else:
                raise PermissionDenied("Usuario no autorizado para firmar este contrato")
            
            contract.save()
            
            # Registrar firma en historial
            self._record_history(
                contract=contract,
                user=user,
                action_type=signature_type,
                description=f"{user.get_full_name()} firmó digitalmente el contrato",
                old_state='READY_TO_SIGN',
                new_state='READY_TO_SIGN',
                data_changes={'signature_timestamp': timezone.now().isoformat()}
            )
            
            # Verificar si ambas partes han firmado
            if contract.landlord_signed and contract.tenant_signed:
                contract.current_state = 'FULLY_SIGNED'
                contract.fully_signed_at = timezone.now()
                contract.save()
                
                self._record_history(
                    contract=contract,
                    user=user,
                    action_type='FULLY_SIGNED',
                    description="Contrato completamente firmado por ambas partes",
                    old_state='READY_TO_SIGN',
                    new_state='FULLY_SIGNED'
                )
                
                # Notificar firma completa
                self._notify_fully_signed(contract)
            
            return contract

    def publish_contract(
        self,
        contract_id: uuid.UUID,
        landlord: User
    ) -> LandlordControlledContract:
        """
        Publicar el contrato (darle vida jurídica) - solo el arrendador puede hacerlo.
        
        Args:
            contract_id: ID del contrato
            landlord: Usuario arrendador
        
        Returns:
            Contrato publicado
        """
        with transaction.atomic():
            contract = self._get_contract_for_landlord(contract_id, landlord)
            
            if contract.current_state != 'FULLY_SIGNED':
                raise ValidationError("Solo se pueden publicar contratos completamente firmados")
            
            # Publicar contrato
            contract.current_state = 'PUBLISHED'
            contract.published = True
            contract.published_at = timezone.now()
            contract.start_date = timezone.now().date()
            
            # Calcular fecha de finalización basada en duración
            if contract.contract_duration_months:
                end_date = contract.start_date.replace(
                    year=contract.start_date.year + (contract.start_date.month + contract.contract_duration_months - 1) // 12,
                    month=(contract.start_date.month + contract.contract_duration_months - 1) % 12 + 1
                )
                contract.end_date = end_date
            
            contract.save()
            
            # Registrar publicación
            self._record_history(
                contract=contract,
                user=landlord,
                action_type='CONTRACT_PUBLISHED',
                description="Contrato publicado - adquiere vida jurídica",
                old_state='FULLY_SIGNED',
                new_state='PUBLISHED',
                data_changes={
                    'start_date': contract.start_date.isoformat(),
                    'end_date': contract.end_date.isoformat() if contract.end_date else None
                }
            )
            
            # Notificar publicación
            self._notify_contract_published(contract)
            
            self.logger.info(f"Contrato {contract.contract_number} publicado exitosamente")
            return contract

    # =====================================================================
    # MÉTODOS DE VALIDACIÓN
    # =====================================================================

    def _validate_landlord_permissions(self, user: User) -> bool:
        """Validar que el usuario tiene permisos de arrendador."""
        return hasattr(user, 'profile') and user.profile.user_type == 'landlord'

    def _validate_basic_terms(self, terms: Dict) -> None:
        """Validar términos básicos del contrato."""
        required_fields = ['monthly_rent', 'security_deposit']
        for field in required_fields:
            if not terms.get(field):
                raise ValidationError(f"Campo requerido: {field}")
        
        if terms['monthly_rent'] <= 0:
            raise ValidationError("El canon mensual debe ser mayor a 0")
        
        if terms['security_deposit'] < 0:
            raise ValidationError("El depósito no puede ser negativo")

    def _validate_landlord_data(self, data: Dict) -> None:
        """Validar datos completos del arrendador."""
        required_fields = [
            'full_name', 'document_number', 'document_type',
            'phone', 'address', 'city', 'emergency_contact'
        ]
        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"Campo requerido del arrendador: {field}")

    def _validate_tenant_data(self, data: Dict) -> None:
        """Validar datos completos del arrendatario."""
        required_fields = [
            'full_name', 'document_number', 'document_type',
            'phone', 'current_address', 'employment_type',
            'monthly_income', 'references'
        ]
        for field in required_fields:
            if not data.get(field):
                raise ValidationError(f"Campo requerido del arrendatario: {field}")

    # =====================================================================
    # MÉTODOS DE UTILIDAD
    # =====================================================================

    def _get_contract_for_landlord(self, contract_id: uuid.UUID, landlord: User) -> LandlordControlledContract:
        """Obtener contrato verificando que pertenece al arrendador."""
        try:
            return LandlordControlledContract.objects.get(id=contract_id, landlord=landlord)
        except LandlordControlledContract.DoesNotExist:
            raise PermissionDenied("Contrato no encontrado o sin permisos")

    def _get_contract_for_tenant(self, contract_id: uuid.UUID, tenant: User) -> LandlordControlledContract:
        """Obtener contrato verificando que pertenece al arrendatario."""
        try:
            return LandlordControlledContract.objects.get(id=contract_id, tenant=tenant)
        except LandlordControlledContract.DoesNotExist:
            raise PermissionDenied("Contrato no encontrado o sin permisos")

    def _get_contract_for_user(self, contract_id: uuid.UUID, user: User) -> LandlordControlledContract:
        """Obtener contrato verificando que el usuario es parte del mismo."""
        try:
            return LandlordControlledContract.objects.filter(
                id=contract_id
            ).filter(
                models.Q(landlord=user) | models.Q(tenant=user)
            ).get()
        except LandlordControlledContract.DoesNotExist:
            raise PermissionDenied("Contrato no encontrado o sin permisos")

    def _generate_secure_token(self) -> str:
        """Generar token seguro para invitaciones."""
        return secrets.token_urlsafe(32)

    def _record_history(
        self,
        contract: LandlordControlledContract,
        user: User,
        action_type: str,
        description: str,
        old_state: str = '',
        new_state: str = '',
        data_changes: Dict = None,
        related_objection: ContractObjection = None,
        related_guarantee: LandlordContractGuarantee = None
    ) -> ContractWorkflowHistory:
        """Registrar acción en el historial del workflow."""
        history_entry = ContractWorkflowHistory.objects.create(
            contract=contract,
            performed_by=user,
            action_type=action_type,
            description=description,
            old_state=old_state,
            new_state=new_state,
            data_changes=data_changes or {},
            related_objection=related_objection,
            related_guarantee=related_guarantee
        )
        
        # También agregar al workflow_history JSON del contrato
        contract.add_workflow_entry({
            'timestamp': timezone.now().isoformat(),
            'user': user.email,
            'action': action_type,
            'description': description
        })
        
        return history_entry

    def _all_objections_resolved(self, contract: LandlordControlledContract) -> bool:
        """Verificar si todas las objeciones han sido resueltas."""
        pending_objections = contract.objections.filter(status='PENDING')
        return not pending_objections.exists()

    def _apply_objection_change(self, contract: LandlordControlledContract, objection: ContractObjection) -> None:
        """Aplicar cambio aceptado por objeción."""
        # Actualizar el campo correspondiente en los datos del contrato
        field_name = objection.field_name
        new_value = objection.proposed_value
        
        # Determinar en qué sección está el campo y actualizarlo
        if field_name in contract.landlord_data:
            contract.landlord_data[field_name] = new_value
        elif field_name in contract.tenant_data:
            contract.tenant_data[field_name] = new_value
        else:
            # Campo directo del modelo
            if hasattr(contract, field_name):
                setattr(contract, field_name, new_value)
        
        contract.save()

    # =====================================================================
    # MÉTODOS DE NOTIFICACIÓN
    # =====================================================================

    def _send_invitation_email(self, contract: LandlordControlledContract, tenant_email: str, personal_message: str) -> bool:
        """Enviar email de invitación al arrendatario."""
        try:
            subject = f"Invitación a contrato de arrendamiento - {contract.contract_number}"
            
            context = {
                'contract': contract,
                'landlord': contract.landlord,
                'invitation_url': f"{settings.FRONTEND_URL}/contracts/accept/{contract.invitation_token}",
                'personal_message': personal_message,
                'expiry_date': contract.invitation_expires_at
            }
            
            html_content = render_to_string('contracts/emails/tenant_invitation.html', context)
            text_content = render_to_string('contracts/emails/tenant_invitation.txt', context)
            
            send_mail(
                subject=subject,
                message=text_content,
                html_message=html_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[tenant_email],
                fail_silently=False
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error enviando invitación: {e}")
            return False

    def _notify_landlord_tenant_completed(self, contract: LandlordControlledContract) -> None:
        """Notificar al arrendador que el arrendatario completó sus datos."""
        # Notificar que el arrendatario completó sus datos
        NotificationService.notify_contract_accepted_by_tenant(
            landlord=contract.landlord,
            contract=contract,
            tenant=contract.tenant
        )

    def _notify_objection_submitted(self, contract: LandlordControlledContract, objection: ContractObjection, recipient: User) -> None:
        """Notificar que se presentó una objeción."""
        # Contar objeciones pendientes
        objection_count = contract.objections.filter(status='PENDING').count()
        
        if recipient == contract.landlord:
            # Notificar al arrendador sobre objeción del arrendatario
            NotificationService.notify_contract_objection_submitted(
                landlord=contract.landlord,
                contract=contract,
                tenant=contract.tenant,
                objection_count=objection_count
            )
        else:
            # Si es al arrendatario, enviar notificación genérica
            NotificationService.create_notification(
                user=recipient,
                notification_type='contract',
                title='Nueva Objeción Recibida',
                message=f'Se ha presentado una nueva objeción en tu contrato. Revisa y responde para continuar con el proceso.',
                priority='high',
                action_url=f'/app/contracts/review/{contract.id}/objections',
                action_label='Ver Objeciones',
                related_object=contract,
                send_email=True
            )

    def _notify_ready_to_sign(self, contract: LandlordControlledContract) -> None:
        """Notificar que el contrato está listo para firmar."""
        # Notificar a ambas partes que pueden proceder con las firmas
        NotificationService.notify_signature_request(
            user=contract.landlord,
            contract=contract,
            requester=contract.tenant,
            signature_type='digital'
        )
        
        NotificationService.notify_signature_request(
            user=contract.tenant,
            contract=contract,
            requester=contract.landlord,
            signature_type='digital'
        )

    def _notify_fully_signed(self, contract: LandlordControlledContract) -> None:
        """Notificar que el contrato fue completamente firmado."""
        # Notificar a ambas partes que el contrato está completamente firmado
        NotificationService.notify_contract_fully_signed(
            user=contract.landlord,
            contract=contract
        )
        
        NotificationService.notify_contract_fully_signed(
            user=contract.tenant,
            contract=contract
        )

    def _notify_contract_published(self, contract: LandlordControlledContract) -> None:
        """Notificar que el contrato fue publicado."""
        # Notificar al arrendatario que el contrato está activo
        NotificationService.notify_contract_published(
            tenant=contract.tenant,
            contract=contract,
            landlord=contract.landlord
        )