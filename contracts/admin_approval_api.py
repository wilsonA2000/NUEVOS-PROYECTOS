"""
API para Aprobación de Contratos por Administrador
Sistema Control Molecular - VeriHome

Este módulo implementa:
1. Endpoints de aprobación/rechazo de contratos por admin
2. Vista de contratos pendientes de revisión
3. Señales de notificación automática

Creado: Diciembre 2025
"""

import logging
from django.conf import settings
from django.core.mail import send_mail
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser, IsAuthenticated

from .landlord_contract_models import LandlordControlledContract
from .clause_models import ContractTypeTemplate, EditableContractClause

logger = logging.getLogger(__name__)


class AdminPendingContractsView(APIView):
    """
    GET: Listar todos los contratos pendientes de revisión admin.

    Endpoint: /api/v1/contracts/admin/pending/
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Obtener lista de contratos pendientes de revisión"""
        pending_contracts = LandlordControlledContract.objects.filter(
            current_state='PENDING_ADMIN_REVIEW'
        ).select_related(
            'landlord', 'property'
        ).order_by('-created_at')

        contracts_data = []
        for contract in pending_contracts:
            contracts_data.append({
                'id': str(contract.id),
                'contract_number': contract.contract_number,
                'landlord_name': contract.landlord.get_full_name() if contract.landlord else 'N/A',
                'landlord_email': contract.landlord.email if contract.landlord else 'N/A',
                'property_address': contract.property_data.get('property_address', 'N/A') if contract.property_data else 'N/A',
                'created_at': contract.created_at.isoformat(),
                'monthly_rent': contract.economic_terms.get('monthly_rent', 0) if contract.economic_terms else 0,
                'days_pending': (timezone.now() - contract.created_at).days,
            })

        return Response({
            'count': len(contracts_data),
            'contracts': contracts_data,
        })


class AdminContractDetailView(APIView):
    """
    GET: Ver detalles de un contrato específico para revisión.

    Endpoint: /api/v1/contracts/admin/contracts/<uuid:contract_id>/
    """
    permission_classes = [IsAdminUser]

    def get(self, request, contract_id):
        """Obtener detalles completos del contrato para revisión"""
        try:
            contract = LandlordControlledContract.objects.select_related(
                'landlord', 'property'
            ).get(id=contract_id)
        except LandlordControlledContract.DoesNotExist:
            return Response(
                {'error': 'Contrato no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Obtener cláusulas que se usarán
        contract_type = self._get_contract_type(contract)
        clauses = self._get_clauses_preview(contract_type)

        return Response({
            'id': str(contract.id),
            'contract_number': contract.contract_number,
            'current_state': contract.current_state,
            'current_state_display': contract.get_current_state_display(),
            'created_at': contract.created_at.isoformat(),
            'updated_at': contract.updated_at.isoformat(),

            # Datos del arrendador
            'landlord': {
                'id': str(contract.landlord.id) if contract.landlord else None,
                'name': contract.landlord.get_full_name() if contract.landlord else 'N/A',
                'email': contract.landlord.email if contract.landlord else 'N/A',
            },

            # Datos de la propiedad
            'property_data': contract.property_data or {},

            # Términos económicos
            'economic_terms': contract.economic_terms or {},

            # Términos del contrato
            'contract_terms': contract.contract_terms or {},

            # Datos del inquilino (si existen)
            'tenant_data': contract.tenant_data or {},

            # Preview de cláusulas que se incluirán
            'clauses_preview': clauses,

            # Estado de revisión admin
            'admin_review': {
                'reviewed': contract.admin_reviewed,
                'reviewed_at': contract.admin_reviewed_at.isoformat() if contract.admin_reviewed_at else None,
                'reviewer': contract.admin_reviewer.get_full_name() if contract.admin_reviewer else None,
                'notes': contract.admin_review_notes,
            }
        })

    def _get_contract_type(self, contract) -> str:
        """Determinar tipo de contrato basado en property_data"""
        if not contract.property_data:
            return 'rental_urban'

        property_type = contract.property_data.get('property_type', '').lower()
        type_mapping = {
            'apartment': 'rental_urban',
            'apartamento': 'rental_urban',
            'house': 'rental_urban',
            'casa': 'rental_urban',
            'commercial': 'rental_commercial',
            'local': 'rental_commercial',
            'room': 'rental_room',
            'habitación': 'rental_room',
            'rural': 'rental_rural',
            'finca': 'rental_rural',
        }
        return type_mapping.get(property_type, 'rental_urban')

    def _get_clauses_preview(self, contract_type: str) -> list:
        """Obtener preview de cláusulas para el tipo de contrato"""
        try:
            template = ContractTypeTemplate.objects.filter(
                contract_type=contract_type,
                is_active=True
            ).first()

            if not template:
                template = ContractTypeTemplate.objects.filter(
                    contract_type='rental_urban',
                    is_active=True
                ).first()

            if not template:
                return []

            clauses = template.get_ordered_clauses()
            return [
                {
                    'number': c.clause_number,
                    'ordinal': c.ordinal_text,
                    'title': c.title,
                    'category': c.category,
                    'legal_reference': c.legal_reference,
                    # No incluir contenido completo por eficiencia
                    'content_preview': c.content[:200] + '...' if len(c.content) > 200 else c.content,
                }
                for c in clauses
            ]
        except Exception as e:
            logger.warning(f"Error obteniendo preview de cláusulas: {e}")
            return []


class AdminContractApprovalView(APIView):
    """
    POST: Aprobar un contrato y moverlo a estado DRAFT.

    Endpoint: /api/v1/contracts/admin/contracts/<uuid:contract_id>/approve/
    """
    permission_classes = [IsAdminUser]

    def post(self, request, contract_id):
        """Aprobar contrato por administrador"""
        try:
            contract = LandlordControlledContract.objects.get(id=contract_id)
        except LandlordControlledContract.DoesNotExist:
            return Response(
                {'error': 'Contrato no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        if contract.current_state != 'PENDING_ADMIN_REVIEW':
            return Response(
                {'error': f'El contrato no está en estado de revisión. Estado actual: {contract.get_current_state_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        notes = request.data.get('notes', '')

        try:
            contract.approve_by_admin(request.user, notes)

            # Enviar notificación al arrendador
            self._notify_landlord_approved(contract)

            return Response({
                'success': True,
                'message': 'Contrato aprobado exitosamente',
                'contract_id': str(contract.id),
                'contract_number': contract.contract_number,
                'new_state': contract.current_state,
                'new_state_display': contract.get_current_state_display(),
            })
        except Exception as e:
            logger.error(f"Error aprobando contrato {contract_id}: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _notify_landlord_approved(self, contract):
        """Enviar email al arrendador notificando aprobación"""
        try:
            if not contract.landlord or not contract.landlord.email:
                return

            subject = f'[VeriHome] Contrato #{contract.contract_number} Aprobado'
            message = f"""
Estimado(a) {contract.landlord.get_full_name()},

Su contrato #{contract.contract_number} ha sido revisado y aprobado por nuestro equipo legal.

El contrato ahora está en estado "Borrador" y puede continuar con el proceso de firma.

Próximos pasos:
1. Revise el borrador del contrato
2. Invite al arrendatario a firmar
3. Complete el proceso biométrico

Si tiene alguna pregunta, no dude en contactarnos.

Atentamente,
El equipo de VeriHome
            """.strip()

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[contract.landlord.email],
                fail_silently=True,
            )
            logger.info(f"Email de aprobación enviado a {contract.landlord.email}")
        except Exception as e:
            logger.warning(f"Error enviando email de aprobación: {e}")


class AdminContractRejectionView(APIView):
    """
    POST: Rechazar un contrato y solicitar correcciones.

    Endpoint: /api/v1/contracts/admin/contracts/<uuid:contract_id>/reject/
    """
    permission_classes = [IsAdminUser]

    def post(self, request, contract_id):
        """Rechazar contrato con notas de corrección"""
        try:
            contract = LandlordControlledContract.objects.get(id=contract_id)
        except LandlordControlledContract.DoesNotExist:
            return Response(
                {'error': 'Contrato no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        if contract.current_state != 'PENDING_ADMIN_REVIEW':
            return Response(
                {'error': f'El contrato no está en estado de revisión. Estado actual: {contract.get_current_state_display()}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        notes = request.data.get('notes', '')
        if not notes:
            return Response(
                {'error': 'Debe proporcionar notas explicando las correcciones necesarias'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            contract.reject_by_admin(request.user, notes)

            # Enviar notificación al arrendador
            self._notify_landlord_rejected(contract, notes)

            return Response({
                'success': True,
                'message': 'Contrato devuelto para correcciones',
                'contract_id': str(contract.id),
                'contract_number': contract.contract_number,
                'rejection_notes': notes,
            })
        except Exception as e:
            logger.error(f"Error rechazando contrato {contract_id}: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _notify_landlord_rejected(self, contract, notes):
        """Enviar email al arrendador notificando rechazo con correcciones"""
        try:
            if not contract.landlord or not contract.landlord.email:
                return

            subject = f'[VeriHome] Contrato #{contract.contract_number} Requiere Correcciones'
            message = f"""
Estimado(a) {contract.landlord.get_full_name()},

Su contrato #{contract.contract_number} ha sido revisado por nuestro equipo legal y requiere algunas correcciones antes de poder continuar.

CORRECCIONES REQUERIDAS:
{notes}

Por favor, acceda a su cuenta de VeriHome y realice las modificaciones indicadas.

Si tiene alguna pregunta sobre las correcciones solicitadas, no dude en contactarnos.

Atentamente,
El equipo de VeriHome
            """.strip()

            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[contract.landlord.email],
                fail_silently=True,
            )
            logger.info(f"Email de rechazo enviado a {contract.landlord.email}")
        except Exception as e:
            logger.warning(f"Error enviando email de rechazo: {e}")


class AdminContractStatsView(APIView):
    """
    GET: Estadísticas de contratos para el dashboard admin.

    Endpoint: /api/v1/contracts/admin/stats/
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Obtener estadísticas de contratos"""
        from django.db.models import Count, Q

        stats = LandlordControlledContract.objects.aggregate(
            total=Count('id'),
            pending_review=Count('id', filter=Q(current_state='PENDING_ADMIN_REVIEW')),
            draft=Count('id', filter=Q(current_state='DRAFT')),
            active=Count('id', filter=Q(current_state='ACTIVE')),
            completed=Count('id', filter=Q(current_state='COMPLETED')),
            cancelled=Count('id', filter=Q(current_state='CANCELLED')),
        )

        # Contratos recientes
        recent_pending = LandlordControlledContract.objects.filter(
            current_state='PENDING_ADMIN_REVIEW'
        ).order_by('-created_at')[:5]

        return Response({
            'statistics': stats,
            'recent_pending': [
                {
                    'id': str(c.id),
                    'contract_number': c.contract_number,
                    'landlord_name': c.landlord.get_full_name() if c.landlord else 'N/A',
                    'created_at': c.created_at.isoformat(),
                    'days_pending': (timezone.now() - c.created_at).days,
                }
                for c in recent_pending
            ],
            'alert_level': 'high' if stats['pending_review'] > 5 else 'normal',
        })


# =============================================================================
# SEÑALES DE NOTIFICACIÓN AUTOMÁTICA
# =============================================================================

@receiver(post_save, sender=LandlordControlledContract)
def notify_admin_pending_review(sender, instance, created, **kwargs):
    """
    Enviar email al admin cuando un contrato llega a PENDING_ADMIN_REVIEW.

    Esta señal se dispara automáticamente cuando:
    1. Se crea un nuevo contrato (created=True)
    2. Se actualiza un contrato existente
    """
    if instance.current_state != 'PENDING_ADMIN_REVIEW':
        return

    # Solo notificar si el contrato acaba de entrar en este estado
    # (no notificar si ya estaba y se guardó por otra razón)
    if created or not instance.admin_reviewed:
        _send_admin_notification(instance)


def _send_admin_notification(contract):
    """Enviar notificación al admin sobre contrato pendiente"""
    try:
        admin_email = getattr(settings, 'ADMIN_EMAIL', None)
        if not admin_email:
            # Intentar obtener el email del primer superuser
            from django.contrib.auth import get_user_model
            User = get_user_model()
            admin_user = User.objects.filter(is_superuser=True, is_active=True).first()
            if admin_user:
                admin_email = admin_user.email

        if not admin_email:
            logger.warning("No se encontró email de admin para notificación")
            return

        subject = f'[VeriHome] Nuevo Contrato Pendiente de Revisión - #{contract.contract_number}'
        message = f"""
NUEVO CONTRATO PENDIENTE DE REVISIÓN

Número de contrato: {contract.contract_number}
Arrendador: {contract.landlord.get_full_name() if contract.landlord else 'N/A'}
Email: {contract.landlord.email if contract.landlord else 'N/A'}
Creado: {contract.created_at.strftime('%d/%m/%Y %H:%M')}

Propiedad: {contract.property_data.get('property_address', 'N/A') if contract.property_data else 'N/A'}
Canon mensual: ${contract.economic_terms.get('monthly_rent', 0):,.0f} COP

Por favor, acceda al panel de administración para revisar y aprobar este contrato.

---
Sistema de Notificaciones VeriHome
        """.strip()

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[admin_email],
            fail_silently=True,
        )
        logger.info(f"Notificación de nuevo contrato enviada a admin: {admin_email}")
    except Exception as e:
        logger.warning(f"Error enviando notificación de nuevo contrato: {e}")
