"""
Servicio avanzado de autenticación biométrica para contratos digitales de VeriHome.
Implementa verificación facial, documento de identidad, y grabación de voz con análisis ML.
"""

import os
import io
import base64
import hashlib
import json
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import logging

from django.conf import settings
from django.utils import timezone
from django.core.files.base import ContentFile
from django.db import transaction
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np

from .models import Contract, BiometricAuthentication, ContractSignature

logger = logging.getLogger(__name__)


class BiometricAuthenticationService:
    """Servicio completo de autenticación biométrica para contratos digitales."""
    
    def __init__(self):
        self.min_confidence_threshold = 0.7
        self.image_quality_threshold = 0.8
        self.voice_duration_min = 3  # segundos mínimos
        self.voice_duration_max = 30  # segundos máximos
        
    def initiate_authentication(self, contract: Contract, user, request) -> BiometricAuthentication:
        """
        Inicia el proceso de autenticación biométrica para un usuario específico.
        
        Args:
            contract: Instancia del contrato
            user: Usuario que va a autenticarse
            request: Request HTTP para obtener metadatos
            
        Returns:
            BiometricAuthentication: Instancia de autenticación creada
        """
        try:
            logger.info(f"Iniciando autenticación biométrica para usuario {user.id} y contrato {contract.id}")

            # Verificar que el usuario sea parte del contrato (incluyendo garante)
            allowed_users = [contract.primary_party, contract.secondary_party]
            if contract.guarantor:
                allowed_users.append(contract.guarantor)

            if user not in allowed_users:
                raise ValueError("El usuario no es parte de este contrato")

            # Verificar que el contrato esté en estado correcto.
            # BIO-001: se acepta tanto el vocabulario nuevo (`pending_*`) como
            # el legacy (`tenant_biometric`, etc.), porque otros endpoints
            # (unified_contract_api, codeudor_public_api) siguen escribiendo
            # los valores sin prefix.
            from contracts.constants import STATES_READY_FOR_BIOMETRIC
            if contract.status not in STATES_READY_FOR_BIOMETRIC:
                raise ValueError(
                    f"El contrato no está en estado válido para autenticación: {contract.status}"
                )
            
            # Verificar si ya existe una autenticación (cualquier estado)
            existing_auth = BiometricAuthentication.objects.filter(
                contract=contract,
                user=user
            ).first()

            if existing_auth:
                # Si está activa y no expirada, reutilizarla
                if existing_auth.status in ['pending', 'in_progress'] and not existing_auth.is_expired():
                    logger.info(f"Reutilizando autenticación existente {existing_auth.id}")
                    return existing_auth
                else:
                    # Si está expirada o en otro estado, eliminarla para crear una nueva
                    logger.info(f"Eliminando autenticación previa {existing_auth.id} (estado: {existing_auth.status})")
                    existing_auth.delete()
            
            # Obtener información del cliente
            client_ip = self._get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            device_info = self._extract_device_info(request)
            geolocation = self._extract_geolocation(request)
            
            # Crear nueva autenticación biométrica
            with transaction.atomic():
                auth = BiometricAuthentication.objects.create(
                    contract=contract,
                    user=user,
                    document_type='cedula_ciudadania',  # Por defecto, se actualiza después
                    ip_address=client_ip,
                    user_agent=user_agent,
                    device_info=device_info,
                    geolocation=geolocation,
                    security_checks={
                        'ip_verified': True,
                        'device_fingerprinted': bool(device_info),
                        'geolocation_captured': bool(geolocation),
                        'initiated_at': timezone.now().isoformat()
                    }
                )

                # Actualizar estado del contrato
                contract.status = 'pending_authentication'
                contract.save(update_fields=['status'])
            
            logger.info(f"Autenticación biométrica iniciada con ID {auth.id}")
            return auth
            
        except Exception as e:
            logger.error(f"Error iniciando autenticación biométrica: {str(e)}")
            raise
    
    def process_face_capture(self, auth_id: str, face_front_data: str, face_side_data: str) -> Dict[str, Any]:
        """
        Procesa las capturas faciales (frontal y lateral) con análisis avanzado.
        
        Args:
            auth_id: ID de la autenticación biométrica
            face_front_data: Imagen frontal en base64
            face_side_data: Imagen lateral en base64
            
        Returns:
            Dict con resultados del análisis facial
        """
        try:
            logger.info(f"Procesando capturas faciales para autenticación {auth_id}")
            
            auth = BiometricAuthentication.objects.get(id=auth_id)
            
            # Procesar imagen frontal
            front_analysis = self._process_face_image(face_front_data, 'frontal')
            front_file = self._save_base64_image(face_front_data, f"face_front_{auth_id}")
            auth.face_front_image = front_file
            
            # Procesar imagen lateral
            side_analysis = self._process_face_image(face_side_data, 'lateral')
            side_file = self._save_base64_image(face_side_data, f"face_side_{auth_id}")
            auth.face_side_image = side_file
            
            # Análisis combinado de coherencia facial
            coherence_analysis = self._analyze_face_coherence(front_analysis, side_analysis)
            
            # Calcular puntuación de confianza facial
            face_confidence = self._calculate_face_confidence(front_analysis, side_analysis, coherence_analysis)
            auth.face_confidence_score = face_confidence
            
            # Guardar análisis completo
            auth.facial_analysis = {
                'front_analysis': front_analysis,
                'side_analysis': side_analysis,
                'coherence_analysis': coherence_analysis,
                'overall_confidence': face_confidence,
                'processed_at': timezone.now().isoformat(),
                'quality_metrics': {
                    'front_quality': front_analysis.get('quality_score', 0),
                    'side_quality': side_analysis.get('quality_score', 0),
                    'liveness_detected': front_analysis.get('liveness_score', 0) > 0.8
                }
            }
            
            # Actualizar estado
            if auth.status == 'pending':
                auth.status = 'in_progress'
            
            auth.save()
            
            result = {
                'success': True,
                'face_confidence_score': face_confidence,
                'quality_metrics': auth.facial_analysis['quality_metrics'],
                'next_step': 'document_capture',
                'overall_progress': auth.get_progress_percentage()
            }
            
            logger.info(f"Capturas faciales procesadas exitosamente. Confianza: {face_confidence:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"Error procesando capturas faciales: {str(e)}")
            raise
    
    def process_document_verification(self, auth_id: str, document_image_data: str, document_type: str, document_number: str = "") -> Dict[str, Any]:
        """
        Procesa y verifica el documento de identidad con OCR y validación.
        
        Args:
            auth_id: ID de la autenticación biométrica
            document_image_data: Imagen del documento en base64
            document_type: Tipo de documento ('cedula_ciudadania', 'pasaporte', etc.)
            document_number: Número de documento (opcional, se extrae con OCR)
            
        Returns:
            Dict con resultados de la verificación del documento
        """
        try:
            logger.info(f"Procesando verificación de documento para autenticación {auth_id}")
            
            auth = BiometricAuthentication.objects.get(id=auth_id)
            
            # Procesar imagen del documento
            document_analysis = self._process_document_image(document_image_data, document_type)
            document_file = self._save_base64_image(document_image_data, f"document_{auth_id}")
            auth.document_image = document_file
            
            # Extraer información del documento con OCR
            ocr_results = self._extract_document_info(document_image_data, document_type)
            
            # Validar información extraída
            validation_results = self._validate_document_info(ocr_results, document_type)
            
            # Calcular puntuación de confianza del documento
            document_confidence = self._calculate_document_confidence(document_analysis, ocr_results, validation_results)
            auth.document_confidence_score = document_confidence
            
            # Actualizar información del documento
            auth.document_type = document_type
            if not document_number and ocr_results.get('document_number'):
                auth.document_number = ocr_results['document_number']
            elif document_number:
                auth.document_number = document_number
            
            if ocr_results.get('expiry_date'):
                auth.document_expiry_date = ocr_results['expiry_date']
            
            # Guardar análisis completo
            auth.document_analysis = {
                'image_analysis': document_analysis,
                'ocr_results': ocr_results,
                'validation_results': validation_results,
                'overall_confidence': document_confidence,
                'processed_at': timezone.now().isoformat(),
                'document_type_detected': ocr_results.get('detected_type', document_type),
                'security_features': {
                    'has_security_features': document_analysis.get('security_features', False),
                    'tamper_detected': document_analysis.get('tamper_detected', False),
                    'image_quality_acceptable': document_analysis.get('quality_score', 0) > 0.7
                }
            }
            
            auth.save()
            
            result = {
                'success': True,
                'document_confidence_score': document_confidence,
                'extracted_info': {
                    'document_number': auth.document_number,
                    'document_type': auth.document_type,
                    'expiry_date': auth.document_expiry_date.isoformat() if auth.document_expiry_date else None,
                    'name_detected': ocr_results.get('name', ''),
                },
                'security_features': auth.document_analysis['security_features'],
                'next_step': 'combined_capture',
                'overall_progress': auth.get_progress_percentage()
            }
            
            logger.info(f"Documento verificado exitosamente. Confianza: {document_confidence:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"Error procesando verificación de documento: {str(e)}")
            raise
    
    def process_combined_verification(self, auth_id: str, combined_image_data: str) -> Dict[str, Any]:
        """
        Procesa la imagen combinada del documento junto al rostro.
        
        Args:
            auth_id: ID de la autenticación biométrica
            combined_image_data: Imagen del documento junto al rostro en base64
            
        Returns:
            Dict con resultados de la verificación combinada
        """
        try:
            logger.info(f"Procesando verificación combinada para autenticación {auth_id}")
            
            auth = BiometricAuthentication.objects.get(id=auth_id)
            
            # Procesar imagen combinada
            combined_analysis = self._process_combined_image(combined_image_data)
            combined_file = self._save_base64_image(combined_image_data, f"combined_{auth_id}")
            auth.document_with_face_image = combined_file
            
            # Extraer rostro y documento de la imagen combinada
            face_extraction = self._extract_face_from_combined(combined_image_data)
            document_extraction = self._extract_document_from_combined(combined_image_data)
            
            # Comparar con las imágenes anteriores
            face_match_score = self._compare_faces(
                auth.face_front_image.path if auth.face_front_image else None,
                face_extraction
            )
            
            document_match_score = self._compare_documents(
                auth.document_image.path if auth.document_image else None,
                document_extraction
            )
            
            # Verificar coherencia y autenticidad
            coherence_score = self._verify_combined_coherence(face_extraction, document_extraction)
            
            # Calcular puntuación general de la verificación combinada
            combined_confidence = (face_match_score + document_match_score + coherence_score) / 3
            
            # Actualizar análisis en el modelo
            combined_analysis_data = {
                'face_extraction': face_extraction,
                'document_extraction': document_extraction,
                'face_match_score': face_match_score,
                'document_match_score': document_match_score,
                'coherence_score': coherence_score,
                'combined_confidence': combined_confidence,
                'processed_at': timezone.now().isoformat(),
                'verification_checks': {
                    'face_visible': face_extraction.get('face_detected', False),
                    'document_visible': document_extraction.get('document_detected', False),
                    'proper_positioning': combined_analysis.get('positioning_score', 0) > 0.7,
                    'lighting_adequate': combined_analysis.get('lighting_score', 0) > 0.6
                }
            }
            
            # Actualizar análisis facial y de documento con los resultados combinados
            if 'combined_verification' not in auth.facial_analysis:
                auth.facial_analysis['combined_verification'] = {}
            auth.facial_analysis['combined_verification'].update(combined_analysis_data)
            
            if 'combined_verification' not in auth.document_analysis:
                auth.document_analysis['combined_verification'] = {}
            auth.document_analysis['combined_verification'].update(combined_analysis_data)
            
            auth.save()
            
            result = {
                'success': True,
                'combined_confidence': combined_confidence,
                'verification_scores': {
                    'face_match_score': face_match_score,
                    'document_match_score': document_match_score,
                    'coherence_score': coherence_score
                },
                'verification_checks': combined_analysis_data['verification_checks'],
                'next_step': 'voice_capture',
                'overall_progress': auth.get_progress_percentage()
            }
            
            logger.info(f"Verificación combinada procesada exitosamente. Confianza: {combined_confidence:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"Error procesando verificación combinada: {str(e)}")
            raise
    
    def process_voice_verification(self, auth_id: str, voice_recording_data: str, expected_text: str = None) -> Dict[str, Any]:
        """
        Procesa y analiza la grabación de voz del usuario.
        
        Args:
            auth_id: ID de la autenticación biométrica
            voice_recording_data: Grabación de voz en base64
            expected_text: Texto esperado (si no se proporciona, se usa el generado automáticamente)
            
        Returns:
            Dict con resultados del análisis de voz
        """
        try:
            logger.info(f"Procesando verificación de voz para autenticación {auth_id}")
            
            auth = BiometricAuthentication.objects.get(id=auth_id)
            
            # Usar texto esperado o el generado automáticamente
            if not expected_text:
                expected_text = auth.voice_text
            
            # Procesar archivo de audio
            voice_analysis = self._process_voice_recording(voice_recording_data)
            voice_file = self._save_base64_audio(voice_recording_data, f"voice_{auth_id}")
            auth.voice_recording = voice_file
            
            # Verificar duración del audio
            duration_check = self._verify_audio_duration(voice_analysis)
            
            # Análisis de calidad de audio
            quality_analysis = self._analyze_audio_quality(voice_analysis)
            
            # Transcripción de voz a texto (simulado - en producción usar servicios como Google Speech-to-Text)
            transcription_results = self._transcribe_voice(voice_recording_data)
            
            # Comparar transcripción con texto esperado
            text_match_score = self._compare_transcription(transcription_results.get('text', ''), expected_text)
            
            # Análisis de características vocales (simulado - en producción usar análisis biométrico de voz)
            voice_characteristics = self._analyze_voice_characteristics(voice_analysis)
            
            # Calcular puntuación de confianza de voz
            voice_confidence = self._calculate_voice_confidence(
                duration_check, quality_analysis, text_match_score, voice_characteristics
            )
            auth.voice_confidence_score = voice_confidence
            
            # Guardar análisis completo
            auth.voice_analysis = {
                'audio_analysis': voice_analysis,
                'duration_check': duration_check,
                'quality_analysis': quality_analysis,
                'transcription_results': transcription_results,
                'text_match_score': text_match_score,
                'voice_characteristics': voice_characteristics,
                'overall_confidence': voice_confidence,
                'processed_at': timezone.now().isoformat(),
                'expected_text': expected_text,
                'verification_metrics': {
                    'duration_acceptable': duration_check.get('acceptable', False),
                    'quality_acceptable': quality_analysis.get('acceptable', False),
                    'text_match_acceptable': text_match_score > 0.8,
                    'voice_characteristics_detected': bool(voice_characteristics.get('features'))
                }
            }
            
            auth.save()
            
            result = {
                'success': True,
                'voice_confidence_score': voice_confidence,
                'transcription': transcription_results.get('text', ''),
                'text_match_score': text_match_score,
                'quality_metrics': {
                    'duration': voice_analysis.get('duration', 0),
                    'quality_score': quality_analysis.get('score', 0),
                    'clarity_score': quality_analysis.get('clarity', 0)
                },
                'verification_metrics': auth.voice_analysis['verification_metrics'],
                'next_step': 'complete_authentication',
                'overall_progress': auth.get_progress_percentage()
            }
            
            logger.info(f"Verificación de voz procesada exitosamente. Confianza: {voice_confidence:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"Error procesando verificación de voz: {str(e)}")
            raise
    
    def complete_authentication(self, auth_id: str) -> Dict[str, Any]:
        """
        Completa y valida toda la autenticación biométrica.
        
        Args:
            auth_id: ID de la autenticación biométrica
            
        Returns:
            Dict con el resultado final de la autenticación
        """
        try:
            logger.info(f"Completando autenticación biométrica {auth_id}")
            
            auth = BiometricAuthentication.objects.get(id=auth_id)
            
            # Verificar que todos los pasos estén completos
            if not auth.is_complete():
                missing_steps = []
                if not auth.face_front_image: missing_steps.append('face_front')
                if not auth.face_side_image: missing_steps.append('face_side')
                if not auth.document_image: missing_steps.append('document')
                if not auth.document_with_face_image: missing_steps.append('combined')
                if not auth.voice_recording: missing_steps.append('voice')
                
                raise ValueError(f"Autenticación incompleta. Faltan pasos: {', '.join(missing_steps)}")
            
            # Calcular puntuación general de confianza
            auth.calculate_overall_confidence()
            
            # Verificar si la puntuación general es aceptable
            if auth.overall_confidence_score < self.min_confidence_threshold:
                auth.status = 'failed'
                auth.completed_at = timezone.now()
                auth.save()
                
                result = {
                    'success': False,
                    'reason': 'confidence_too_low',
                    'overall_confidence': auth.overall_confidence_score,
                    'required_confidence': self.min_confidence_threshold,
                    'individual_scores': {
                        'face_confidence': auth.face_confidence_score,
                        'document_confidence': auth.document_confidence_score,
                        'voice_confidence': auth.voice_confidence_score
                    }
                }
                
                logger.warning(f"Autenticación fallida por baja confianza: {auth.overall_confidence_score:.2f}")
                return result
            
            # Actualizar estado a completado
            auth.status = 'completed'
            auth.completed_at = timezone.now()
            
            # Actualizar verificaciones de seguridad finales
            auth.security_checks.update({
                'all_steps_completed': True,
                'confidence_threshold_met': True,
                'completion_time': timezone.now().isoformat(),
                'total_duration_minutes': (auth.completed_at - auth.started_at).total_seconds() / 60,
                'final_verification': {
                    'face_verified': auth.face_confidence_score >= 0.7,
                    'document_verified': auth.document_confidence_score >= 0.7,
                    'voice_verified': auth.voice_confidence_score >= 0.7,
                    'overall_verified': auth.overall_confidence_score >= self.min_confidence_threshold
                }
            })
            
            auth.save()
            
            # NUEVO: Lógica de progresión secuencial
            contract = auth.contract
            self._handle_sequential_progression(auth, contract)

            # TEST-E2E-03: determinar user_type y next_actor para respuesta enriquecida
            user_type = 'unknown'
            if auth.user == getattr(contract, 'secondary_party', None):
                user_type = 'tenant'
            elif auth.user == getattr(contract, 'primary_party', None):
                user_type = 'landlord'
            elif auth.user == getattr(contract, 'guarantor', None):
                user_type = 'guarantor'

            # Recalcular estado canónico y determinar próximo actor
            ws = None
            next_actor = None
            next_step_msg = None
            try:
                rec = recompute_workflow_status(contract)
                if rec:
                    ws = rec['workflow_status']
                    if ws == 'all_biometrics_completed':
                        next_actor = None
                        next_step_msg = '🎉 Contrato activo: nació a la vida jurídica.'
                    elif ws == 'pending_landlord_biometric':
                        next_actor = 'landlord'
                        next_step_msg = 'Esperando firma del arrendador.'
                    elif ws == 'pending_guarantor_biometric':
                        next_actor = 'guarantor'
                        next_step_msg = 'Esperando firma del garante.'
                    elif ws == 'pending_tenant_biometric':
                        next_actor = 'tenant'
                        next_step_msg = 'Esperando firma del arrendatario.'
            except Exception as exc:
                logger.warning(f"complete_authentication: recompute falló: {exc}")

            # TEST-E2E-03: certificado estilo codeudor para paridad
            certificate = {
                'certificate_id': f"CERT-{user_type.upper()}-{str(auth.id)[:8].upper()}",
                'user_name': auth.user.get_full_name() if hasattr(auth.user, 'get_full_name') else str(auth.user),
                'user_type': user_type,
                'contract_number': getattr(contract, 'contract_number', None),
                'completed_at': auth.completed_at.isoformat(),
                'overall_confidence': f"{(auth.overall_confidence_score or 0) * 100:.1f}%",
                'integrity_hash': auth.integrity_hash,
            }

            result = {
                'success': True,
                'message': '¡Autenticación biométrica completada exitosamente!',
                'authentication_id': str(auth.id),
                'overall_confidence': auth.overall_confidence_score,
                'individual_scores': {
                    'face_confidence': auth.face_confidence_score,
                    'document_confidence': auth.document_confidence_score,
                    'voice_confidence': auth.voice_confidence_score
                },
                'completion_time': auth.completed_at.isoformat(),
                'duration_minutes': auth.security_checks['total_duration_minutes'],
                'contract_status': contract.status,
                'workflow_status': ws,
                'next_step': 'digital_signature',
                'next_actor': next_actor,
                'next_step_message': next_step_msg,
                'integrity_hash': auth.integrity_hash,
                'certificate': certificate,
            }

            logger.info(f"Autenticación biométrica completada exitosamente. Confianza general: {auth.overall_confidence_score:.2f}")
            return result
            
        except Exception as e:
            logger.error(f"Error completando autenticación biométrica: {str(e)}")
            raise
    
    # Métodos auxiliares privados
    def _get_client_ip(self, request):
        """Obtiene la IP real del cliente."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def _extract_device_info(self, request) -> Dict[str, Any]:
        """Extrae información del dispositivo."""
        user_agent = request.META.get('HTTP_USER_AGENT', '')
        return {
            'user_agent': user_agent,
            'platform': self._detect_platform(user_agent),
            'browser': self._detect_browser(user_agent),
            'is_mobile': 'Mobile' in user_agent,
            'fingerprint_timestamp': timezone.now().isoformat()
        }
    
    def _extract_geolocation(self, request) -> Dict[str, Any]:
        """Extrae información de geolocalización del request."""
        # En producción, esto vendría del frontend con permisos de geolocalización
        return {
            'latitude': request.data.get('latitude') if hasattr(request, 'data') else None,
            'longitude': request.data.get('longitude') if hasattr(request, 'data') else None,
            'accuracy': request.data.get('accuracy') if hasattr(request, 'data') else None,
            'timestamp': timezone.now().isoformat()
        }
    
    def _detect_platform(self, user_agent: str) -> str:
        """Detecta la plataforma del dispositivo."""
        if 'Windows' in user_agent:
            return 'Windows'
        elif 'Mac' in user_agent:
            return 'macOS'
        elif 'Linux' in user_agent:
            return 'Linux'
        elif 'Android' in user_agent:
            return 'Android'
        elif 'iPhone' in user_agent or 'iPad' in user_agent:
            return 'iOS'
        else:
            return 'Unknown'
    
    def _detect_browser(self, user_agent: str) -> str:
        """Detecta el navegador."""
        if 'Chrome' in user_agent:
            return 'Chrome'
        elif 'Firefox' in user_agent:
            return 'Firefox'
        elif 'Safari' in user_agent:
            return 'Safari'
        elif 'Edge' in user_agent:
            return 'Edge'
        else:
            return 'Unknown'
    
    def _save_base64_image(self, base64_data: str, filename: str) -> ContentFile:
        """Guarda una imagen base64 como archivo."""
        try:
            # Extraer datos de la imagen base64
            format, imgstr = base64_data.split(';base64,')
            ext = format.split('/')[-1]
            
            data = ContentFile(base64.b64decode(imgstr))
            return ContentFile(data.read(), name=f"{filename}.{ext}")
        except Exception as e:
            logger.error(f"Error guardando imagen base64: {e}")
            raise
    
    def _save_base64_audio(self, base64_data: str, filename: str) -> ContentFile:
        """Guarda un audio base64 como archivo."""
        try:
            # Extraer datos del audio base64
            format, audiostr = base64_data.split(';base64,')
            ext = format.split('/')[-1]
            
            data = ContentFile(base64.b64decode(audiostr))
            return ContentFile(data.read(), name=f"{filename}.{ext}")
        except Exception as e:
            logger.error(f"Error guardando audio base64: {e}")
            raise
    
    # Métodos de análisis simulados (en producción usarían servicios de ML reales)
    def _process_face_image(self, image_data: str, face_type: str) -> Dict[str, Any]:
        """Simula el análisis de imagen facial."""
        return {
            'face_detected': True,
            'quality_score': 0.85,
            'liveness_score': 0.92,
            'pose_estimation': {'yaw': 0.1, 'pitch': 0.05, 'roll': 0.02},
            'face_landmarks': 68,  # Simulado
            'face_type': face_type,
            'processed_at': timezone.now().isoformat()
        }
    
    def _analyze_face_coherence(self, front_analysis: Dict, side_analysis: Dict) -> Dict[str, Any]:
        """Analiza la coherencia entre las dos capturas faciales."""
        return {
            'face_match_probability': 0.94,
            'feature_consistency': 0.89,
            'lighting_consistency': 0.87,
            'same_person_confidence': 0.91
        }
    
    def _calculate_face_confidence(self, front_analysis: Dict, side_analysis: Dict, coherence_analysis: Dict) -> float:
        """Calcula la puntuación de confianza facial."""
        scores = [
            front_analysis.get('quality_score', 0),
            side_analysis.get('quality_score', 0),
            front_analysis.get('liveness_score', 0),
            coherence_analysis.get('same_person_confidence', 0)
        ]
        return sum(scores) / len(scores)
    
    def _process_document_image(self, image_data: str, document_type: str) -> Dict[str, Any]:
        """Simula el análisis de imagen de documento."""
        return {
            'document_detected': True,
            'quality_score': 0.88,
            'security_features': True,
            'tamper_detected': False,
            'corners_detected': 4,
            'text_regions': 12,  # Simulado
            'document_type': document_type
        }
    
    def _extract_document_info(self, image_data: str, document_type: str) -> Dict[str, Any]:
        """Simula la extracción OCR de información del documento."""
        return {
            'document_number': '1234567890',  # Simulado
            'name': 'Juan Pérez García',      # Simulado
            'expiry_date': timezone.now().date() + timedelta(days=1825),  # 5 años
            'detected_type': document_type,
            'ocr_confidence': 0.91
        }
    
    def _validate_document_info(self, ocr_results: Dict, document_type: str) -> Dict[str, Any]:
        """Valida la información extraída del documento."""
        return {
            'document_number_valid': len(ocr_results.get('document_number', '')) >= 8,
            'expiry_date_valid': ocr_results.get('expiry_date', timezone.now().date()) > timezone.now().date(),
            'name_present': bool(ocr_results.get('name')),
            'type_matches': ocr_results.get('detected_type') == document_type,
            'overall_validity': 0.89
        }
    
    def _calculate_document_confidence(self, document_analysis: Dict, ocr_results: Dict, validation_results: Dict) -> float:
        """Calcula la puntuación de confianza del documento."""
        scores = [
            document_analysis.get('quality_score', 0),
            ocr_results.get('ocr_confidence', 0),
            validation_results.get('overall_validity', 0),
            1.0 if not document_analysis.get('tamper_detected', True) else 0.5
        ]
        return sum(scores) / len(scores)
    
    def _process_combined_image(self, image_data: str) -> Dict[str, Any]:
        """Simula el análisis de imagen combinada."""
        return {
            'positioning_score': 0.85,
            'lighting_score': 0.78,
            'both_visible': True,
            'proper_distance': True,
            'face_document_proximity': 0.82
        }
    
    def _extract_face_from_combined(self, image_data: str) -> Dict[str, Any]:
        """Simula la extracción del rostro de la imagen combinada."""
        return {
            'face_detected': True,
            'face_region': {'x': 100, 'y': 150, 'width': 200, 'height': 250},  # Simulado
            'quality': 0.83
        }
    
    def _extract_document_from_combined(self, image_data: str) -> Dict[str, Any]:
        """Simula la extracción del documento de la imagen combinada."""
        return {
            'document_detected': True,
            'document_region': {'x': 350, 'y': 200, 'width': 300, 'height': 200},  # Simulado
            'quality': 0.86
        }
    
    def _compare_faces(self, original_path: str, extracted_face: Dict) -> float:
        """Simula la comparación de rostros."""
        return 0.91  # Simulado
    
    def _compare_documents(self, original_path: str, extracted_document: Dict) -> float:
        """Simula la comparación de documentos."""
        return 0.88  # Simulado
    
    def _verify_combined_coherence(self, face_extraction: Dict, document_extraction: Dict) -> float:
        """Verifica la coherencia de la imagen combinada."""
        return 0.87  # Simulado
    
    def _process_voice_recording(self, voice_data: str) -> Dict[str, Any]:
        """Simula el análisis de grabación de voz."""
        return {
            'duration': 8.5,  # segundos
            'sample_rate': 44100,
            'channels': 1,
            'format': 'wav',
            'file_size': 150000  # bytes
        }
    
    def _verify_audio_duration(self, voice_analysis: Dict) -> Dict[str, Any]:
        """Verifica la duración del audio."""
        duration = voice_analysis.get('duration', 0)
        return {
            'duration': duration,
            'acceptable': self.voice_duration_min <= duration <= self.voice_duration_max,
            'too_short': duration < self.voice_duration_min,
            'too_long': duration > self.voice_duration_max
        }
    
    def _analyze_audio_quality(self, voice_analysis: Dict) -> Dict[str, Any]:
        """Analiza la calidad del audio."""
        return {
            'score': 0.84,
            'clarity': 0.88,
            'noise_level': 0.15,
            'acceptable': True
        }
    
    def _transcribe_voice(self, voice_data: str) -> Dict[str, Any]:
        """Simula la transcripción de voz a texto."""
        # En producción usaría Google Speech-to-Text, Azure Speech, etc.
        return {
            'text': 'He firmado digitalmente el contrato número VH-2025-000123 el día 4 de agosto de 2025',
            'confidence': 0.92,
            'language_detected': 'es-CO'
        }
    
    def _compare_transcription(self, transcribed_text: str, expected_text: str) -> float:
        """Compara la transcripción con el texto esperado."""
        # Algoritmo simple de similitud (en producción usaría NLP avanzado)
        words_transcribed = set(transcribed_text.lower().split())
        words_expected = set(expected_text.lower().split())
        
        if not words_expected:
            return 0.0
        
        intersection = words_transcribed.intersection(words_expected)
        return len(intersection) / len(words_expected)
    
    def _analyze_voice_characteristics(self, voice_analysis: Dict) -> Dict[str, Any]:
        """Simula el análisis de características vocales."""
        return {
            'features': {
                'pitch_average': 150.5,  # Hz
                'tone_stability': 0.87,
                'speech_rate': 4.2,  # palabras por segundo
                'voice_uniqueness': 0.89
            },
            'biometric_score': 0.85
        }
    
    def _calculate_voice_confidence(self, duration_check: Dict, quality_analysis: Dict, text_match_score: float, voice_characteristics: Dict) -> float:
        """Calcula la puntuación de confianza de voz."""
        scores = [
            1.0 if duration_check.get('acceptable', False) else 0.5,
            quality_analysis.get('score', 0),
            text_match_score,
            voice_characteristics.get('biometric_score', 0)
        ]
        return sum(scores) / len(scores)
    
    def _activate_tenant_workflow(self, contract) -> None:
        """
        🔥 NUEVO: Activa automáticamente el workflow del arrendatario
        cuando el arrendador completa su autenticación biométrica
        """
        try:
            logger.info(f"Activando workflow del arrendatario para contrato {contract.contract_number}")
            
            # Solo activar si hay un arrendatario asignado
            if not contract.secondary_party:
                logger.warning(f"Contrato {contract.contract_number} no tiene arrendatario asignado")
                return
            
            # Verificar si ya existe una invitación activa
            from .landlord_contract_models import ContractInvitation
            from .invitation_service import ContractInvitationService
            
            existing_invitation = ContractInvitation.objects.filter(
                contract_id=contract.id,
                tenant_email=contract.secondary_party.email,
                status__in=['pending', 'sent', 'opened']
            ).first()
            
            if existing_invitation and existing_invitation.is_active:
                logger.info(f"Ya existe invitación activa para {contract.secondary_party.email}")
                return
            
            # Crear nueva invitación para el arrendatario
            invitation_service = ContractInvitationService()
            invitation, token = invitation_service.create_invitation(
                contract_id=str(contract.id),
                landlord=contract.primary_party,
                tenant_email=contract.secondary_party.email,
                tenant_phone=getattr(contract.secondary_party, 'phone', None),
                tenant_name=contract.secondary_party.get_full_name(),
                invitation_method='email',
                personal_message=f"""
¡Hola {contract.secondary_party.get_full_name()}!

El arrendador {contract.primary_party.get_full_name()} ha completado exitosamente su verificación biométrica para el contrato {contract.contract_number}.

Ahora es tu turno de completar el proceso de autenticación biométrica y firma digital del contrato.

El proceso incluye:
✅ Captura facial biométrica
✅ Verificación de documento de identidad
✅ Grabación de voz con verificación cultural
✅ Firma digital del contrato

Tu participación es esencial para activar el contrato de arrendamiento.
                """.strip(),
                expires_in_days=14  # 14 días para completar
            )
            
            # Enviar la invitación por email
            invitation_service.send_invitation(invitation, token)
            
            # Actualizar estado del contrato
            contract.status = 'pending_tenant_authentication'
            contract.save(update_fields=['status'])
            
            logger.info(f"✅ Workflow del arrendatario activado exitosamente para {contract.secondary_party.email}")
            
        except Exception as e:
            logger.error(f"❌ Error activando workflow del arrendatario: {str(e)}")
            # No fallar el proceso principal, solo logear el error
            pass

    def _handle_sequential_progression(self, auth, contract):
        """Maneja la progresión secuencial del flujo biométrico."""
        try:
            from matching.models import MatchRequest

            # Obtener el MatchRequest asociado
            match_request = MatchRequest.objects.filter(
                property=contract.property,
            ).first()

            if not match_request:
                logger.warning(f"No se encontró MatchRequest para el contrato {contract.id}")
                return

            # Determinar tipo de usuario que completó
            if auth.user == contract.secondary_party:
                user_type = 'tenant'
            elif auth.user == contract.guarantor:
                user_type = 'guarantor'
            elif auth.user == contract.primary_party:
                user_type = 'landlord'
            else:
                user_type = 'unknown'

            current_status = match_request.workflow_status

            logger.info(f"🔄 Sequential progression - User: {user_type}, Current status: {current_status}")

            # Progresión secuencial con soporte para garante (Tenant → Garante → Landlord)
            if current_status in ['biometric_pending', 'pending_tenant_biometric'] and user_type == 'tenant':
                # Arrendatario completó → verificar si hay garante
                if contract.guarantor:
                    match_request.workflow_status = 'pending_guarantor_biometric'
                    contract.status = 'pending_guarantor_biometric'
                    logger.info("✅ Tenant completed biometric → Now guarantor's turn")
                else:
                    # No hay garante, pasa directo al landlord
                    match_request.workflow_status = 'pending_landlord_biometric'
                    contract.status = 'pending_landlord_biometric'
                    logger.info("✅ Tenant completed biometric (no guarantor) → Now landlord's turn")

            elif current_status == 'pending_guarantor_biometric' and user_type == 'guarantor':
                # Garante completó → turno del arrendador
                match_request.workflow_status = 'pending_landlord_biometric'
                contract.status = 'pending_landlord_biometric'
                logger.info("✅ Guarantor completed biometric → Now landlord's turn")

            elif current_status == 'pending_landlord_biometric' and user_type == 'landlord':
                # Arrendador completó → todos terminaron, activar contrato
                match_request.workflow_status = 'all_biometrics_completed'
                contract.status = 'active'
                logger.info("✅ Landlord completed biometric → All biometrics completed, contract activated")

            elif current_status == 'pending_biometric_authentication':
                # Fallback para flujo legacy - determinar primer completador
                if user_type == 'tenant':
                    if contract.guarantor:
                        match_request.workflow_status = 'pending_guarantor_biometric'
                        contract.status = 'pending_guarantor_biometric'
                        logger.info("✅ Legacy: Tenant completed first → Guarantor's turn")
                    else:
                        match_request.workflow_status = 'pending_landlord_biometric'
                        contract.status = 'pending_landlord_biometric'
                        logger.info("✅ Legacy: Tenant completed first (no guarantor) → Landlord's turn")
                else:
                    match_request.workflow_status = 'pending_tenant_biometric'
                    contract.status = 'pending_tenant_biometric'
                    logger.info("✅ Legacy: Other user completed first → Tenant's turn")

            # Actualizar workflow_data con información de progresión
            if 'biometric_progress' not in match_request.workflow_data:
                match_request.workflow_data['biometric_progress'] = {}

            match_request.workflow_data['biometric_progress'][f'{user_type}_completed'] = True
            match_request.workflow_data['biometric_progress'][f'{user_type}_completed_at'] = timezone.now().isoformat()

            # 🔧 FIX: Actualizar también los flags específicos que el frontend busca
            if 'contract_created' not in match_request.workflow_data:
                match_request.workflow_data['contract_created'] = {}

            if user_type == 'tenant':
                match_request.workflow_data['contract_created']['tenant_auth_completed'] = True
                match_request.workflow_data['contract_created']['tenant_auth_completed_at'] = timezone.now().isoformat()
            elif user_type == 'landlord':
                match_request.workflow_data['contract_created']['landlord_auth_completed'] = True
                match_request.workflow_data['contract_created']['landlord_auth_completed_at'] = timezone.now().isoformat()
            elif user_type == 'guarantor':
                match_request.workflow_data['contract_created']['guarantor_auth_completed'] = True
                match_request.workflow_data['contract_created']['guarantor_auth_completed_at'] = timezone.now().isoformat()

            # Guardar cambios
            match_request.save()
            contract.save(update_fields=['status'])

            # BUG-E2E-05: recomputar estado canónico basado en firmas reales
            # para evitar drift entre workflow_status y firmas completadas.
            try:
                recompute_workflow_status(contract)
            except Exception as exc:
                logger.warning(f"recompute_workflow_status falló tras firma {user_type}: {exc}")

            # 🔄 SINCRONIZAR CON LANDLORDCONTROLLEDCONTRACT
            # BUG-BIO-01: crear espejo si no existe (contratos pre-refactor
            # que no pasaron por matching.auto_create_contract).
            try:
                from .landlord_contract_models import LandlordControlledContract

                landlord_contract, created = LandlordControlledContract.objects.get_or_create(
                    id=contract.id,
                    defaults={
                        'contract_number': contract.contract_number,
                        'landlord': contract.primary_party,
                        'tenant': contract.secondary_party,
                        'property': contract.property,
                        'contract_type': 'rental_urban',
                        'title': contract.title,
                        'description': contract.description or '',
                        'current_state': 'TENANT_REVIEWING',
                        'start_date': contract.start_date,
                        'end_date': contract.end_date,
                        'economic_terms': {
                            'monthly_rent': float(contract.monthly_rent) if contract.monthly_rent else 0,
                            'security_deposit': float(contract.security_deposit) if contract.security_deposit else 0,
                        },
                        'landlord_approved': True,
                        'landlord_approved_at': timezone.now(),
                    },
                )
                if created:
                    logger.info(f"🛠️ LandlordControlledContract espejo creado on-the-fly para contrato {contract.id}")

                # Actualizar workflow_stage y workflow_status
                if match_request.workflow_status == 'pending_landlord_biometric':
                    landlord_contract.workflow_stage = 'biometric_authentication'
                    landlord_contract.workflow_status = 'pending_landlord_biometric'
                    logger.info("🔄 LandlordContract: Esperando autenticación del landlord")

                elif match_request.workflow_status == 'all_biometrics_completed':
                    landlord_contract.workflow_stage = 'contract_active'
                    landlord_contract.workflow_status = 'active'
                    landlord_contract.is_active = True
                    landlord_contract.activation_date = timezone.now()
                    logger.info("🎉 LandlordContract: ACTIVADO - Nace a la vida jurídica")

                    # =======================================================
                    # 🔒 INMUTABILIDAD POST-BIOMÉTRICA (Plan Maestro V2.0)
                    # Bloquear el contrato permanentemente después de que
                    # todas las partes completen la autenticación biométrica.
                    # lock_contract() exige LANDLORD_SIGNED / READY_TO_PUBLISH
                    # / PUBLISHED, así que transicionamos primero.
                    # =======================================================
                    if landlord_contract.current_state not in ('LANDLORD_SIGNED', 'READY_TO_PUBLISH', 'PUBLISHED'):
                        landlord_contract.current_state = 'LANDLORD_SIGNED'
                        landlord_contract.save(update_fields=['current_state'])

                    try:
                        landlord_contract.lock_contract(
                            user=auth.user,
                            reason='biometric_complete'
                        )
                        logger.info(f"🔒 LandlordContract {landlord_contract.id}: BLOQUEADO PERMANENTEMENTE - Post-biométrico")

                        # Bloquear también los documentos del arrendatario asociados
                        self._lock_tenant_documents(landlord_contract, auth.user)

                        # Actualizar estado a PUBLISHED (nace a la vida jurídica)
                        landlord_contract.current_state = 'PUBLISHED'
                        landlord_contract.published = True
                        landlord_contract.published_at = timezone.now()
                        logger.info(f"📜 LandlordContract {landlord_contract.id}: Estado actualizado a PUBLISHED")

                    except Exception as lock_error:
                        logger.error(f"❌ Error al bloquear contrato post-biométrico: {lock_error}")
                        # No fallar el proceso principal si hay error en el bloqueo

                landlord_contract.save()
                logger.info(f"✅ LandlordControlledContract sincronizado: {landlord_contract.workflow_status}")

            except Exception as sync_error:
                logger.warning(f"⚠️ Error sincronizando LandlordControlledContract: {sync_error}")

            logger.info(f"✅ Sequential progression completed - New status: {match_request.workflow_status}")

        except Exception as e:
            logger.error(f"❌ Error en progresión secuencial: {str(e)}")
            # Fallback: actualizar contrato básico
            contract.status = 'authenticated_pending_signature'
            contract.save(update_fields=['status'])

    def _lock_tenant_documents(self, landlord_contract, user):
        """
        🔒 INMUTABILIDAD POST-BIOMÉTRICA: Bloquea todos los documentos del arrendatario.

        Este método bloquea permanentemente todos los documentos subidos por el
        arrendatario que están asociados al contrato. Una vez bloqueados, estos
        documentos no pueden ser editados ni eliminados.

        Args:
            landlord_contract: El contrato controlado por arrendador
            user: Usuario que ejecuta el bloqueo (para auditoría)
        """
        try:
            from requests.models import TenantDocument
            from matching.models import MatchRequest

            # Buscar el MatchRequest asociado al contrato
            match_request = MatchRequest.objects.filter(
                property=landlord_contract.property
            ).first()

            if not match_request:
                logger.warning(f"⚠️ No se encontró MatchRequest para bloquear documentos del contrato {landlord_contract.id}")
                return

            # Bloquear todos los documentos del arrendatario asociados a este match
            documents = TenantDocument.objects.filter(
                match_request=match_request,
                is_locked=False  # Solo los que aún no están bloqueados
            )

            documents_count = documents.count()
            if documents_count == 0:
                logger.info(f"ℹ️ No hay documentos por bloquear para el contrato {landlord_contract.id}")
                return

            # Bloquear cada documento
            for document in documents:
                document.is_locked = True
                document.locked_at = timezone.now()
                document.locked_by = user
                document.locked_reason = 'biometric_complete'
                document.save(update_fields=['is_locked', 'locked_at', 'locked_by', 'locked_reason'])

            logger.info(f"🔒 {documents_count} documentos bloqueados permanentemente para contrato {landlord_contract.id}")

            # Registrar en auditoría del contrato
            if hasattr(landlord_contract, 'add_workflow_event'):
                landlord_contract.add_workflow_event(
                    event_type='DOCUMENTS_LOCKED_POST_BIOMETRIC',
                    user=user,
                    details={
                        'documents_locked': documents_count,
                        'lock_reason': 'biometric_complete',
                        'locked_at': timezone.now().isoformat()
                    }
                )

        except ImportError as import_error:
            logger.warning(f"⚠️ Módulo de documentos no disponible: {import_error}")
        except Exception as e:
            logger.error(f"❌ Error al bloquear documentos del arrendatario: {e}")
            # No fallar el proceso principal


# Instancia global del servicio
biometric_service = BiometricAuthenticationService()


def recompute_workflow_status(contract):
    """
    BUG-E2E-05: recalcula MatchRequest.workflow_status + Contract.status +
    LandlordControlledContract.current_state basándose en las firmas REALES
    (BiometricAuthentication del tenant/landlord + CodeudorAuthToken del garante).

    Llamar después de CUALQUIER firma completada (tenant, garante público, landlord)
    para mantener el workflow sincronizado.

    Retorna: dict con el estado recalculado o None si no hay MatchRequest.
    """
    from matching.models import MatchRequest

    try:
        from .landlord_contract_models import CodeudorAuthToken
    except ImportError:
        CodeudorAuthToken = None

    # Determinar partes del contrato (funciona para Contract legacy y LandlordControlled)
    tenant = getattr(contract, 'secondary_party', None) or getattr(contract, 'tenant', None)
    landlord = getattr(contract, 'primary_party', None) or getattr(contract, 'landlord', None)

    if not tenant or not landlord:
        logger.warning(f"recompute_workflow_status: contract {contract.id} sin tenant o landlord")
        return None

    match_request = MatchRequest.objects.filter(
        tenant=tenant, property=contract.property
    ).first()
    if not match_request:
        logger.warning(f"recompute_workflow_status: no MatchRequest para contract {contract.id}")
        return None

    # Verificar firmas reales
    tenant_done = BiometricAuthentication.objects.filter(
        contract_id=contract.id, user=tenant, status='completed'
    ).exists()
    landlord_done = BiometricAuthentication.objects.filter(
        contract_id=contract.id, user=landlord, status='completed'
    ).exists()

    has_guarantor = False
    guarantor_done = False
    if CodeudorAuthToken:
        guarantor_tokens = CodeudorAuthToken.objects.filter(contract_id=contract.id)
        has_guarantor = guarantor_tokens.exists()
        guarantor_done = guarantor_tokens.filter(status='completed').exists()

    # Determinar nuevo estado canónico
    if tenant_done and landlord_done and (guarantor_done or not has_guarantor):
        new_workflow = 'all_biometrics_completed'
        new_contract_status = 'active'
    elif tenant_done and (guarantor_done or not has_guarantor):
        new_workflow = 'pending_landlord_biometric'
        new_contract_status = 'pending_landlord_biometric'
    elif tenant_done and has_guarantor and not guarantor_done:
        new_workflow = 'pending_guarantor_biometric'
        new_contract_status = 'pending_guarantor_biometric'
    else:
        new_workflow = 'pending_tenant_biometric'
        new_contract_status = 'pending_tenant_biometric'

    match_request.workflow_status = new_workflow
    match_request.save(update_fields=['workflow_status'])

    # Sincronizar Contract legacy.status
    if hasattr(contract, 'status'):
        contract.status = new_contract_status
        contract.save(update_fields=['status'])

    # Sincronizar LandlordControlledContract.current_state si existe
    try:
        from .landlord_contract_models import LandlordControlledContract
        lcc = LandlordControlledContract.objects.filter(id=contract.id).first()
        if lcc:
            if new_workflow == 'all_biometrics_completed':
                lcc.current_state = 'ACTIVE'
                lcc.is_active = True
                lcc.activation_date = timezone.now()
            elif new_workflow == 'pending_landlord_biometric':
                lcc.current_state = 'LANDLORD_AUTHENTICATION'
            elif new_workflow == 'pending_guarantor_biometric':
                lcc.current_state = 'GUARANTOR_AUTHENTICATION'
            lcc.save()
    except Exception as exc:
        logger.warning(f"recompute_workflow_status: no se pudo sync LandlordControlled: {exc}")

    logger.info(
        f"🔄 recompute_workflow_status: contract={contract.id} "
        f"tenant_done={tenant_done} guarantor={has_guarantor}/{guarantor_done} "
        f"landlord_done={landlord_done} -> {new_workflow}"
    )

    return {
        'workflow_status': new_workflow,
        'contract_status': new_contract_status,
        'tenant_done': tenant_done,
        'guarantor_done': guarantor_done,
        'has_guarantor': has_guarantor,
        'landlord_done': landlord_done,
    }