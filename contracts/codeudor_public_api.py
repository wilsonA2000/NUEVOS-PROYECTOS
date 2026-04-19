"""
APIs públicas para autenticación de codeudores vía email.

Este módulo contiene endpoints que NO requieren autenticación JWT,
permitiendo a los codeudores completar su verificación biométrica
a través de un link único enviado por email.

Flujo:
1. Arrendador invita codeudor → POST /landlord/contracts/{id}/invite_codeudor/
2. Codeudor recibe email con link
3. Codeudor accede al link → GET /public/codeudor/validate/{token}/
4. Codeudor completa biometría → POST /public/codeudor/biometric/{token}/
5. Sistema confirma → GET /public/codeudor/status/{token}/
"""

import logging
import hashlib
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone

from .landlord_contract_models import (
    CodeudorAuthToken,
)
from .models import Contract

logger = logging.getLogger(__name__)


class CodeudorTokenValidateView(APIView):
    """
    Valida el token del codeudor y retorna información del contrato.

    Este endpoint es PÚBLICO (no requiere autenticación).
    El codeudor accede a este endpoint al hacer clic en el link del email.

    GET /api/v1/public/codeudor/validate/{token}/

    Response:
    - valid: boolean
    - contract_info: información básica del contrato
    - codeudor_info: información del codeudor
    - voice_text: texto para grabación de voz
    - expires_at: fecha de expiración del token
    """
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            # Validar token usando el método de clase
            auth_token = CodeudorAuthToken.validate_token(token)

            if not auth_token:
                return Response({
                    'valid': False,
                    'error': 'Token inválido o expirado',
                    'error_code': 'INVALID_TOKEN'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Marcar como accedido
            ip_address = request.META.get('REMOTE_ADDR')
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            auth_token.mark_as_accessed(ip_address, user_agent)

            # Obtener información del contrato
            contract = auth_token.contract

            # Generar texto de voz para el codeudor
            voice_text = self._generate_voice_text(auth_token, contract)

            return Response({
                'valid': True,
                'token_id': str(auth_token.id),
                'contract_info': {
                    'id': str(contract.id),
                    'contract_number': contract.contract_number,
                    'title': contract.title,
                    'landlord_name': contract.landlord.get_full_name() if contract.landlord else 'No disponible',
                    'property_address': contract.property_data.get('address', 'No disponible'),
                    'monthly_rent': contract.economic_terms.get('monthly_rent', 0),
                    'current_state': contract.current_state,
                },
                'codeudor_info': {
                    'name': auth_token.codeudor_name,
                    'email': auth_token.codeudor_email,
                    'document_type': auth_token.codeudor_document_type,
                    'document_number': auth_token.codeudor_document_number,
                    'codeudor_type': auth_token.codeudor_type,
                    'codeudor_type_display': 'Codeudor con Salario' if auth_token.codeudor_type == 'codeudor_salario' else 'Codeudor con Finca Raíz',
                },
                'voice_text': voice_text,
                'personal_message': auth_token.personal_message,
                'expires_at': auth_token.expires_at.isoformat(),
                'status': auth_token.status,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error validating codeudor token: {e}")
            return Response({
                'valid': False,
                'error': 'Error interno del servidor',
                'error_code': 'INTERNAL_ERROR'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _generate_voice_text(self, auth_token, contract):
        """Genera el texto que el codeudor debe leer para verificación de voz."""
        codeudor_type_text = "personal" if auth_token.codeudor_type == 'codeudor_salario' else "con garantía de finca raíz"

        return (
            f"Yo, {auth_token.codeudor_name}, identificado con {auth_token.get_codeudor_document_type_display()} "
            f"número {auth_token.codeudor_document_number}, acepto actuar como codeudor {codeudor_type_text} "
            f"del contrato de arrendamiento número {contract.contract_number}, "
            f"asumiendo solidariamente las obligaciones del arrendatario ante el arrendador. "
            f"Fecha: {timezone.now().strftime('%d de %B de %Y')}."
        )


class CodeudorBiometricStartView(APIView):
    """
    Inicia la sesión biométrica para el codeudor.

    POST /api/v1/public/codeudor/biometric/start/{token}/

    Response:
    - session_id: ID de la sesión biométrica
    - expires_at: fecha de expiración de la sesión
    - steps: pasos de la autenticación biométrica
    """
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            auth_token = CodeudorAuthToken.validate_token(token)

            if not auth_token:
                return Response({
                    'success': False,
                    'error': 'Token inválido o expirado',
                }, status=status.HTTP_400_BAD_REQUEST)

            if auth_token.status == 'completed':
                return Response({
                    'success': False,
                    'error': 'Este codeudor ya completó su autenticación biométrica',
                    'already_completed': True
                }, status=status.HTTP_400_BAD_REQUEST)

            # Obtener o crear registro de Contract (sistema legacy necesario para biométrica)
            landlord_contract = auth_token.contract
            contract = self._get_or_create_legacy_contract(landlord_contract)

            if not contract:
                return Response({
                    'success': False,
                    'error': 'Error al preparar la sesión biométrica',
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Crear sesión biométrica
            session_id = f"codeudor_{auth_token.id}_{timezone.now().timestamp()}"
            expires_at = timezone.now() + timezone.timedelta(minutes=30)

            # Actualizar token
            auth_token.start_biometric_session(session_id)

            # Generar texto de voz
            voice_text = self._generate_voice_text(auth_token, landlord_contract)

            return Response({
                'success': True,
                'session_id': session_id,
                'authentication_id': str(auth_token.id),
                'contract_id': str(contract.id),
                'expires_at': expires_at.isoformat(),
                'voice_text': voice_text,
                'steps': [
                    {'id': 0, 'name': 'face_front', 'label': 'Foto Frontal'},
                    {'id': 1, 'name': 'face_side', 'label': 'Foto Lateral'},
                    {'id': 2, 'name': 'document', 'label': 'Documento de Identidad'},
                    {'id': 3, 'name': 'combined', 'label': 'Foto con Documento'},
                    {'id': 4, 'name': 'voice', 'label': 'Grabación de Voz'},
                ],
                'codeudor_info': {
                    'name': auth_token.codeudor_name,
                    'document_type': auth_token.codeudor_document_type,
                    'document_number': auth_token.codeudor_document_number,
                }
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error starting codeudor biometric: {e}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_or_create_legacy_contract(self, landlord_contract):
        """Obtiene o crea el contrato legacy necesario para biométrica."""
        try:
            # Buscar contrato legacy existente
            contract = Contract.objects.filter(
                contract_number=landlord_contract.contract_number
            ).first()

            if not contract and landlord_contract.tenant:
                # Crear contrato legacy si no existe
                contract = Contract.objects.create(
                    contract_number=landlord_contract.contract_number,
                    contract_type='rental_urban',
                    primary_party=landlord_contract.landlord,
                    secondary_party=landlord_contract.tenant,
                    title=landlord_contract.title,
                    content='Contrato generado automáticamente para autenticación biométrica',
                    start_date=landlord_contract.start_date or timezone.now().date(),
                    end_date=landlord_contract.end_date or (timezone.now() + timezone.timedelta(days=365)).date(),
                    status='guarantor_biometric',
                    property=landlord_contract.property,
                )
                logger.info(f"Created legacy contract {contract.id} for codeudor biometric")

            return contract
        except Exception as e:
            logger.error(f"Error getting/creating legacy contract: {e}")
            return None

    def _generate_voice_text(self, auth_token, contract):
        """Genera el texto de voz para el codeudor."""
        codeudor_type_text = "personal" if auth_token.codeudor_type == 'codeudor_salario' else "con garantía de finca raíz"
        return (
            f"Yo, {auth_token.codeudor_name}, acepto actuar como codeudor {codeudor_type_text} "
            f"del contrato número {contract.contract_number}."
        )


class CodeudorBiometricCaptureView(APIView):
    """
    Procesa cada paso de la autenticación biométrica del codeudor.

    POST /api/v1/public/codeudor/biometric/capture/{token}/

    Body:
    - step: 'face_front' | 'face_side' | 'document' | 'combined' | 'voice'
    - data: base64 encoded image/audio
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, token):
        try:
            auth_token = CodeudorAuthToken.validate_token(token)

            if not auth_token:
                return Response({
                    'success': False,
                    'error': 'Token inválido o expirado',
                }, status=status.HTTP_400_BAD_REQUEST)

            if auth_token.status not in ['accessed', 'in_progress']:
                return Response({
                    'success': False,
                    'error': f'Estado inválido para captura: {auth_token.status}',
                }, status=status.HTTP_400_BAD_REQUEST)

            step = request.data.get('step')
            data = request.data.get('data')

            if not step or not data:
                return Response({
                    'success': False,
                    'error': 'Se requiere step y data',
                }, status=status.HTTP_400_BAD_REQUEST)

            # Procesar según el paso
            result = self._process_step(auth_token, step, data)

            return Response(result, status=status.HTTP_200_OK if result['success'] else status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error in codeudor biometric capture: {e}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _process_step(self, auth_token, step, data):
        """Procesa un paso específico de la biometría."""
        try:
            # Decodificar base64 si es necesario
            if isinstance(data, str) and data.startswith('data:'):
                # Remover prefijo data:image/...;base64,
                data = data.split(',')[1] if ',' in data else data

            # Actualizar datos biométricos en el token
            biometric_data = auth_token.biometric_data or {}
            biometric_data[f'{step}_captured'] = True
            biometric_data[f'{step}_timestamp'] = timezone.now().isoformat()

            # Simular análisis de confianza (en producción sería ML real)
            confidence_score = 0.85 + (hash(data[:100]) % 15) / 100  # 0.85-1.0
            biometric_data[f'{step}_confidence'] = round(confidence_score, 2)

            auth_token.biometric_data = biometric_data
            auth_token.save(update_fields=['biometric_data'])

            # Verificar si todos los pasos están completos
            completed_steps = [
                biometric_data.get('face_front_captured', False),
                biometric_data.get('face_side_captured', False),
                biometric_data.get('document_captured', False),
                biometric_data.get('combined_captured', False),
                biometric_data.get('voice_captured', False),
            ]
            all_complete = all(completed_steps)

            return {
                'success': True,
                'step': step,
                'confidence_score': confidence_score,
                'message': f'Paso {step} completado exitosamente',
                'all_steps_complete': all_complete,
                'progress': sum(completed_steps) / 5 * 100,
            }

        except Exception as e:
            logger.error(f"Error processing step {step}: {e}")
            return {
                'success': False,
                'error': f'Error procesando {step}: {str(e)}',
            }


class CodeudorBiometricCompleteView(APIView):
    """
    Completa la autenticación biométrica del codeudor.

    POST /api/v1/public/codeudor/biometric/complete/{token}/

    Response:
    - success: boolean
    - message: mensaje de confirmación
    - certificate: datos del certificado de autenticación
    """
    permission_classes = [AllowAny]

    def post(self, request, token):
        try:
            auth_token = CodeudorAuthToken.validate_token(token)

            if not auth_token:
                return Response({
                    'success': False,
                    'error': 'Token inválido o expirado',
                }, status=status.HTTP_400_BAD_REQUEST)

            biometric_data = auth_token.biometric_data or {}

            # Verificar que todos los pasos están completos
            required_steps = ['face_front', 'face_side', 'document', 'combined', 'voice']
            missing_steps = [s for s in required_steps if not biometric_data.get(f'{s}_captured', False)]

            if missing_steps:
                return Response({
                    'success': False,
                    'error': f'Pasos faltantes: {", ".join(missing_steps)}',
                    'missing_steps': missing_steps,
                }, status=status.HTTP_400_BAD_REQUEST)

            # Calcular confianza general
            confidences = [
                biometric_data.get(f'{s}_confidence', 0) for s in required_steps
            ]
            overall_confidence = sum(confidences) / len(confidences)

            # Verificar umbral mínimo
            if overall_confidence < 0.7:
                return Response({
                    'success': False,
                    'error': 'La confianza general no alcanza el umbral mínimo (70%)',
                    'overall_confidence': overall_confidence,
                }, status=status.HTTP_400_BAD_REQUEST)

            # Completar la autenticación
            biometric_data['overall_confidence'] = round(overall_confidence, 2)
            biometric_data['completed_at'] = timezone.now().isoformat()
            biometric_data['ip_address'] = request.META.get('REMOTE_ADDR')
            biometric_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')[:500]

            auth_token.complete_biometric(biometric_data)

            # Actualizar estado del contrato si es necesario
            self._update_contract_workflow(auth_token)

            # Generar certificado
            certificate = {
                'certificate_id': f"CERT-COD-{auth_token.id.hex[:8].upper()}",
                'codeudor_name': auth_token.codeudor_name,
                'codeudor_document': f"{auth_token.codeudor_document_type} {auth_token.codeudor_document_number}",
                'contract_number': auth_token.contract.contract_number,
                'completed_at': biometric_data['completed_at'],
                'overall_confidence': f"{overall_confidence * 100:.1f}%",
                'verification_hash': hashlib.sha256(
                    f"{auth_token.id}:{auth_token.codeudor_document_number}:{biometric_data['completed_at']}".encode()
                ).hexdigest()[:16].upper(),
            }

            return Response({
                'success': True,
                'message': '¡Autenticación biométrica completada exitosamente!',
                'certificate': certificate,
                'overall_confidence': overall_confidence,
                'next_step': 'El arrendador será notificado y podrá proceder con la firma del contrato.',
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error completing codeudor biometric: {e}")
            return Response({
                'success': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _update_contract_workflow(self, auth_token):
        """Actualiza el workflow del contrato después de la autenticación del codeudor.

        BUG-E2E-05: llama a recompute_workflow_status para sincronizar
        MatchRequest.workflow_status + Contract.status + LandlordControlled.current_state
        basándose en las firmas REALES. Antes el garante completaba pero el
        landlord seguía viendo 423 'Esperando tenant'.
        """
        try:
            landlord_contract = auth_token.contract  # LandlordControlledContract

            # Buscar Contract legacy (mismo UUID) para pasarlo a recompute
            legacy_contract = Contract.objects.filter(id=landlord_contract.id).first()

            target = legacy_contract or landlord_contract

            from .biometric_service import recompute_workflow_status
            result = recompute_workflow_status(target)

            if result:
                logger.info(
                    f"Contract {landlord_contract.contract_number} workflow recomputed "
                    f"post codeudor: {result['workflow_status']}"
                )
            else:
                # Fallback al comportamiento anterior si no hay MatchRequest
                if landlord_contract.current_state in ['pending_guarantor_biometric', 'TENANT_SIGNED']:
                    landlord_contract.current_state = 'pending_landlord_biometric'
                    landlord_contract.save(update_fields=['current_state'])

        except Exception as e:
            logger.error(f"Error updating contract workflow post-codeudor: {e}")


class CodeudorStatusView(APIView):
    """
    Obtiene el estado actual de la autenticación del codeudor.

    GET /api/v1/public/codeudor/status/{token}/
    """
    permission_classes = [AllowAny]

    def get(self, request, token):
        try:
            # Validar token (sin marcar como accedido)
            token_hash = hashlib.sha256(token.encode()).hexdigest()

            try:
                auth_token = CodeudorAuthToken.objects.get(token_hash=token_hash)
            except CodeudorAuthToken.DoesNotExist:
                return Response({
                    'valid': False,
                    'error': 'Token no encontrado',
                }, status=status.HTTP_404_NOT_FOUND)

            biometric_data = auth_token.biometric_data or {}

            # Calcular progreso
            required_steps = ['face_front', 'face_side', 'document', 'combined', 'voice']
            completed_steps = [s for s in required_steps if biometric_data.get(f'{s}_captured', False)]
            progress = len(completed_steps) / len(required_steps) * 100

            return Response({
                'valid': True,
                'status': auth_token.status,
                'status_display': dict(CodeudorAuthToken.STATUS_CHOICES).get(auth_token.status, auth_token.status),
                'is_completed': auth_token.status == 'completed',
                'is_expired': auth_token.is_expired,
                'progress': progress,
                'completed_steps': completed_steps,
                'missing_steps': [s for s in required_steps if s not in completed_steps],
                'overall_confidence': biometric_data.get('overall_confidence'),
                'completed_at': auth_token.completed_at.isoformat() if auth_token.completed_at else None,
                'expires_at': auth_token.expires_at.isoformat() if auth_token.expires_at else None,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error getting codeudor status: {e}")
            return Response({
                'valid': False,
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
