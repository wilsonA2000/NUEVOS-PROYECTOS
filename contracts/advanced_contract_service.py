"""
Servicio avanzado para gestión de contratos digitales en VeriHome.
Incluye automatización, validaciones legales, y procesamiento inteligente.
"""

from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.template import Template, Context
from django.core.files.base import ContentFile
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Any, Optional, Tuple
import json
import hashlib
import uuid
import logging
import re
from io import BytesIO

from .models import (
    Contract, ContractTemplate, ContractSignature, ContractAmendment,
    ContractTermination, ContractRenewal, ContractDocument
)

User = get_user_model()
logger = logging.getLogger(__name__)


class AdvancedContractService:
    """Servicio avanzado para gestión completa de contratos digitales."""
    
    def __init__(self):
        self.legal_validators = ContractLegalValidator()
        self.pdf_generator = ContractPDFGenerator()
        self.digital_notary = DigitalNotaryService()
        self.ai_analyzer = ContractAIAnalyzer()
    
    @transaction.atomic
    def create_contract_from_template(
        self,
        template_id: str,
        primary_party: User,
        secondary_party: User,
        contract_data: Dict[str, Any],
        property_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Crea un contrato basado en una plantilla con validaciones avanzadas.
        
        Args:
            template_id: ID de la plantilla
            primary_party: Parte principal (arrendador/cliente)
            secondary_party: Parte secundaria (arrendatario/prestador)
            contract_data: Datos específicos del contrato
            property_id: ID de la propiedad (para contratos de arrendamiento)
        
        Returns:
            Dict con resultado de la creación
        """
        try:
            # Obtener plantilla
            template = ContractTemplate.objects.get(id=template_id, is_active=True)
            
            # Validar datos del contrato
            validation_result = self._validate_contract_data(template, contract_data)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['errors'],
                    'code': 'VALIDATION_ERROR'
                }
            
            # Verificar que las partes pueden firmar contratos
            parties_check = self._verify_contract_parties(primary_party, secondary_party, template.template_type)
            if not parties_check['valid']:
                return {
                    'success': False,
                    'error': parties_check['error'],
                    'code': 'PARTIES_VALIDATION_ERROR'
                }
            
            # Preparar contexto para renderizado
            context = self._prepare_contract_context(
                template, primary_party, secondary_party, contract_data, property_id
            )
            
            # Renderizar contenido del contrato
            rendered_content = self._render_contract_content(template.content, context)
            
            # Obtener propiedad si es necesario
            property_obj = None
            if property_id:
                try:
                    from properties.models import Property
                    property_obj = Property.objects.get(id=property_id)
                except Property.DoesNotExist:
                    return {
                        'success': False,
                        'error': 'Propiedad no encontrada',
                        'code': 'PROPERTY_NOT_FOUND'
                    }
            
            # Crear el contrato
            contract = Contract.objects.create(
                contract_type=template.template_type,
                template=template,
                primary_party=primary_party,
                secondary_party=secondary_party,
                title=contract_data.get('title', f"Contrato {template.get_template_type_display()}"),
                description=contract_data.get('description', ''),
                content=rendered_content,
                start_date=datetime.strptime(contract_data['start_date'], '%Y-%m-%d').date(),
                end_date=datetime.strptime(contract_data['end_date'], '%Y-%m-%d').date(),
                monthly_rent=contract_data.get('monthly_rent'),
                security_deposit=contract_data.get('security_deposit'),
                late_fee=contract_data.get('late_fee'),
                property=property_obj,
                variables_data=contract_data,
                is_renewable=contract_data.get('is_renewable', False),
                auto_renewal_notice_days=contract_data.get('auto_renewal_notice_days', 30)
            )
            
            # Validaciones legales automáticas
            legal_validation = self.legal_validators.validate_contract(contract)
            if legal_validation['warnings']:
                # Log warnings but don't fail
                logger.warning(f"Legal warnings for contract {contract.id}: {legal_validation['warnings']}")
            
            # Generar PDF inicial
            pdf_result = self.pdf_generator.generate_contract_pdf(contract)
            if pdf_result['success']:
                contract.pdf_file = pdf_result['file']
                contract.pdf_generated_at = timezone.now()
                contract.save()
            
            # Programar notificaciones automáticas
            self._schedule_contract_notifications(contract)
            
            # Registrar en blockchain si está habilitado
            if hasattr(self, 'blockchain_service'):
                blockchain_hash = self.blockchain_service.register_contract(contract)
                contract.variables_data['blockchain_hash'] = blockchain_hash
                contract.save()
            
            logger.info(f"Contract created successfully: {contract.id}")
            
            return {
                'success': True,
                'contract_id': str(contract.id),
                'contract_number': contract.contract_number,
                'legal_validation': legal_validation,
                'pdf_generated': pdf_result['success']
            }
            
        except ContractTemplate.DoesNotExist:
            return {
                'success': False,
                'error': 'Plantilla de contrato no encontrada',
                'code': 'TEMPLATE_NOT_FOUND'
            }
        except Exception as e:
            logger.error(f"Error creating contract: {str(e)}")
            return {
                'success': False,
                'error': f'Error interno: {str(e)}',
                'code': 'INTERNAL_ERROR'
            }
    
    @transaction.atomic
    def create_digital_signature(
        self,
        contract_id: str,
        signer: User,
        signature_data: Dict[str, Any],
        authentication_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Crea una firma digital avanzada con múltiples métodos de autenticación.
        
        Args:
            contract_id: ID del contrato
            signer: Usuario que firma
            signature_data: Datos de la firma
            authentication_data: Datos de autenticación
        
        Returns:
            Dict con resultado de la firma
        """
        try:
            contract = Contract.objects.get(id=contract_id)
            
            # Verificar que el usuario puede firmar este contrato
            if signer not in [contract.primary_party, contract.secondary_party]:
                return {
                    'success': False,
                    'error': 'Usuario no autorizado para firmar este contrato',
                    'code': 'UNAUTHORIZED_SIGNER'
                }
            
            # Verificar si ya firmó
            existing_signature = ContractSignature.objects.filter(
                contract=contract,
                signer=signer,
                is_valid=True
            ).exists()
            
            if existing_signature:
                return {
                    'success': False,
                    'error': 'El usuario ya ha firmado este contrato',
                    'code': 'ALREADY_SIGNED'
                }
            
            # Procesar autenticación biométrica si está presente
            biometric_result = self._process_biometric_authentication(
                signer, authentication_data
            )
            
            # Validar nivel de autenticación requerido
            required_level = self._determine_authentication_level(contract)
            if not self._validate_authentication_level(authentication_data, required_level):
                return {
                    'success': False,
                    'error': 'Nivel de autenticación insuficiente',
                    'code': 'INSUFFICIENT_AUTHENTICATION'
                }
            
            # Generar datos de seguridad
            security_data = self._generate_security_data(
                contract, signer, signature_data, authentication_data
            )
            
            # Crear la firma
            signature = ContractSignature.objects.create(
                contract=contract,
                signer=signer,
                signature_type=signature_data.get('type', 'digital'),
                authentication_method=authentication_data.get('method', 'password'),
                signature_data=signature_data.get('signature_string', ''),
                ip_address=authentication_data.get('ip_address', '127.0.0.1'),
                user_agent=authentication_data.get('user_agent', ''),
                geolocation=authentication_data.get('geolocation', {}),
                biometric_data=biometric_result.get('data', {}),
                device_fingerprint=authentication_data.get('device_fingerprint', {}),
                verification_level=required_level,
                security_checks=security_data,
                certificate_chain=self._generate_certificate_chain(signer),
                timestamp_token=self._generate_timestamp_token(),
                blockchain_hash=self._register_signature_blockchain(contract, signer) if hasattr(self, 'blockchain_service') else ''
            )
            
            # Procesar imagen de firma si está presente
            if signature_data.get('signature_image'):
                signature.signature_image = self._process_signature_image(
                    signature_data['signature_image']
                )
                signature.save()
            
            # Actualizar estado del contrato
            self._update_contract_signature_status(contract)
            
            # Notificar a las partes
            self._notify_signature_event(contract, signer, 'signed')
            
            # Verificar si el contrato está completamente firmado
            if contract.is_fully_signed():
                self._handle_fully_signed_contract(contract)
            
            logger.info(f"Digital signature created for contract {contract.id} by user {signer.id}")
            
            return {
                'success': True,
                'signature_id': str(signature.id),
                'verification_hash': signature.verification_hash,
                'contract_fully_signed': contract.is_fully_signed(),
                'biometric_verification': biometric_result.get('verified', False),
                'security_level': required_level
            }
            
        except Contract.DoesNotExist:
            return {
                'success': False,
                'error': 'Contrato no encontrado',
                'code': 'CONTRACT_NOT_FOUND'
            }
        except Exception as e:
            logger.error(f"Error creating digital signature: {str(e)}")
            return {
                'success': False,
                'error': f'Error procesando firma: {str(e)}',
                'code': 'SIGNATURE_ERROR'
            }
    
    def create_contract_amendment(
        self,
        contract_id: str,
        requested_by: User,
        amendment_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Crea una enmienda al contrato con validaciones automáticas.
        
        Args:
            contract_id: ID del contrato
            requested_by: Usuario que solicita la enmienda
            amendment_data: Datos de la enmienda
        
        Returns:
            Dict con resultado de la creación
        """
        try:
            contract = Contract.objects.get(id=contract_id)
            
            # Verificar permisos
            if requested_by not in [contract.primary_party, contract.secondary_party]:
                return {
                    'success': False,
                    'error': 'Usuario no autorizado para enmendar este contrato',
                    'code': 'UNAUTHORIZED_USER'
                }
            
            # Verificar que el contrato esté activo
            if contract.status not in ['active', 'fully_signed']:
                return {
                    'success': False,
                    'error': 'Solo se pueden enmendar contratos activos',
                    'code': 'INVALID_CONTRACT_STATUS'
                }
            
            # Generar número de enmienda
            amendment_count = contract.amendments.count() + 1
            amendment_number = f"{contract.contract_number}-A{amendment_count:02d}"
            
            # Validar cambios propuestos
            validation_result = self._validate_amendment_changes(contract, amendment_data)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['errors'],
                    'code': 'AMENDMENT_VALIDATION_ERROR'
                }
            
            # Crear la enmienda
            amendment = ContractAmendment.objects.create(
                contract=contract,
                amendment_number=amendment_number,
                title=amendment_data['title'],
                description=amendment_data['description'],
                content=amendment_data['content'],
                changes_summary=amendment_data.get('changes_summary', {}),
                requested_by=requested_by,
                effective_date=datetime.strptime(amendment_data['effective_date'], '%Y-%m-%d').date() if amendment_data.get('effective_date') else None
            )
            
            # Notificar a la otra parte
            other_party = contract.secondary_party if requested_by == contract.primary_party else contract.primary_party
            self._notify_amendment_request(amendment, other_party)
            
            # Analizar impacto legal de la enmienda
            legal_impact = self.legal_validators.analyze_amendment_impact(amendment)
            amendment.changes_summary['legal_impact'] = legal_impact
            amendment.save()
            
            logger.info(f"Contract amendment created: {amendment.id}")
            
            return {
                'success': True,
                'amendment_id': str(amendment.id),
                'amendment_number': amendment_number,
                'legal_impact': legal_impact,
                'requires_approval': True
            }
            
        except Contract.DoesNotExist:
            return {
                'success': False,
                'error': 'Contrato no encontrado',
                'code': 'CONTRACT_NOT_FOUND'
            }
        except Exception as e:
            logger.error(f"Error creating amendment: {str(e)}")
            return {
                'success': False,
                'error': f'Error creando enmienda: {str(e)}',
                'code': 'AMENDMENT_ERROR'
            }
    
    def process_contract_renewal(
        self,
        contract_id: str,
        requested_by: User,
        renewal_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Procesa una renovación de contrato con análisis automático.
        
        Args:
            contract_id: ID del contrato original
            requested_by: Usuario que solicita la renovación
            renewal_data: Datos de la renovación
        
        Returns:
            Dict con resultado del procesamiento
        """
        try:
            contract = Contract.objects.get(id=contract_id)
            
            # Verificar elegibilidad para renovación
            eligibility_check = self._check_renewal_eligibility(contract, requested_by)
            if not eligibility_check['eligible']:
                return {
                    'success': False,
                    'error': eligibility_check['reason'],
                    'code': 'RENEWAL_NOT_ELIGIBLE'
                }
            
            # Calcular nueva renta si hay aumento
            original_rent = contract.monthly_rent or Decimal('0')
            rent_increase = renewal_data.get('rent_increase_percentage', 0)
            new_rent = original_rent * (1 + Decimal(str(rent_increase)) / 100)
            
            # Validar aumento de renta según normativas
            rent_validation = self.legal_validators.validate_rent_increase(
                original_rent, new_rent, contract.contract_type
            )
            
            if not rent_validation['valid']:
                return {
                    'success': False,
                    'error': rent_validation['error'],
                    'code': 'INVALID_RENT_INCREASE'
                }
            
            # Crear solicitud de renovación
            renewal = ContractRenewal.objects.create(
                original_contract=contract,
                new_start_date=datetime.strptime(renewal_data['start_date'], '%Y-%m-%d').date(),
                new_end_date=datetime.strptime(renewal_data['end_date'], '%Y-%m-%d').date(),
                new_monthly_rent=new_rent,
                rent_increase_percentage=Decimal(str(rent_increase)),
                requested_by=requested_by,
                terms_changes=renewal_data.get('terms_changes', {}),
                notes=renewal_data.get('notes', ''),
                response_deadline=datetime.strptime(renewal_data['response_deadline'], '%Y-%m-%d').date()
            )
            
            # Generar documento de renovación
            renewal_doc = self._generate_renewal_document(renewal)
            
            # Notificar a la otra parte
            other_party = contract.secondary_party if requested_by == contract.primary_party else contract.primary_party
            self._notify_renewal_request(renewal, other_party)
            
            # Programar recordatorios automáticos
            self._schedule_renewal_reminders(renewal)
            
            logger.info(f"Contract renewal processed: {renewal.id}")
            
            return {
                'success': True,
                'renewal_id': str(renewal.id),
                'new_monthly_rent': float(new_rent),
                'rent_increase_percentage': float(rent_increase),
                'rent_validation': rent_validation,
                'response_deadline': renewal.response_deadline.isoformat()
            }
            
        except Contract.DoesNotExist:
            return {
                'success': False,
                'error': 'Contrato no encontrado',
                'code': 'CONTRACT_NOT_FOUND'
            }
        except Exception as e:
            logger.error(f"Error processing renewal: {str(e)}")
            return {
                'success': False,
                'error': f'Error procesando renovación: {str(e)}',
                'code': 'RENEWAL_ERROR'
            }
    
    def analyze_contract_compliance(self, contract_id: str) -> Dict[str, Any]:
        """
        Analiza el cumplimiento del contrato usando IA y reglas legales.
        
        Args:
            contract_id: ID del contrato a analizar
        
        Returns:
            Dict con análisis de cumplimiento
        """
        try:
            contract = Contract.objects.get(id=contract_id)
            
            # Análisis de cumplimiento de pagos
            payment_compliance = self._analyze_payment_compliance(contract)
            
            # Análisis de cumplimiento de términos
            terms_compliance = self._analyze_terms_compliance(contract)
            
            # Análisis de actividad del contrato
            activity_analysis = self._analyze_contract_activity(contract)
            
            # Detección de riesgos automática
            risk_assessment = self._assess_contract_risks(contract)
            
            # Recomendaciones de IA
            ai_recommendations = self.ai_analyzer.generate_recommendations(contract)
            
            # Score de cumplimiento general
            compliance_score = self._calculate_compliance_score(
                payment_compliance, terms_compliance, activity_analysis
            )
            
            return {
                'contract_id': str(contract.id),
                'contract_number': contract.contract_number,
                'compliance_score': compliance_score,
                'payment_compliance': payment_compliance,
                'terms_compliance': terms_compliance,
                'activity_analysis': activity_analysis,
                'risk_assessment': risk_assessment,
                'ai_recommendations': ai_recommendations,
                'analysis_date': timezone.now().isoformat()
            }
            
        except Contract.DoesNotExist:
            return {
                'success': False,
                'error': 'Contrato no encontrado',
                'code': 'CONTRACT_NOT_FOUND'
            }
        except Exception as e:
            logger.error(f"Error analyzing contract compliance: {str(e)}")
            return {
                'success': False,
                'error': f'Error en análisis: {str(e)}',
                'code': 'ANALYSIS_ERROR'
            }
    
    # Métodos auxiliares privados
    
    def _validate_contract_data(self, template: ContractTemplate, data: Dict[str, Any]) -> Dict[str, Any]:
        """Valida los datos del contrato según la plantilla."""
        errors = []
        
        # Validaciones obligatorias
        required_fields = ['start_date', 'end_date', 'title']
        for field in required_fields:
            if not data.get(field):
                errors.append(f"Campo requerido: {field}")
        
        # Validar fechas
        if data.get('start_date') and data.get('end_date'):
            try:
                start = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
                end = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
                
                if start >= end:
                    errors.append("La fecha de inicio debe ser anterior a la fecha de finalización")
                
                if start <= timezone.now().date():
                    errors.append("La fecha de inicio debe ser futura")
                    
            except ValueError:
                errors.append("Formato de fecha inválido (usar YYYY-MM-DD)")
        
        # Validaciones específicas por tipo de contrato
        if template.template_type.startswith('rental_'):
            if not data.get('monthly_rent') or Decimal(str(data['monthly_rent'])) <= 0:
                errors.append("La renta mensual debe ser mayor a 0")
            
            if data.get('security_deposit'):
                deposit = Decimal(str(data['security_deposit']))
                rent = Decimal(str(data.get('monthly_rent', 0)))
                # En Colombia, el depósito no puede exceder 1 mes de renta para vivienda
                if template.template_type == 'rental_urban' and deposit > rent:
                    errors.append("El depósito no puede exceder 1 mes de renta para vivienda urbana")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    def _verify_contract_parties(self, primary: User, secondary: User, contract_type: str) -> Dict[str, Any]:
        """Verifica que las partes pueden firmar este tipo de contrato."""
        if primary.id == secondary.id:
            return {
                'valid': False,
                'error': 'Las partes del contrato no pueden ser el mismo usuario'
            }
        
        # Verificar tipos de usuario según el contrato
        if contract_type.startswith('rental_'):
            if primary.user_type != 'landlord':
                return {
                    'valid': False,
                    'error': 'La parte principal debe ser un arrendador para contratos de arrendamiento'
                }
            if secondary.user_type != 'tenant':
                return {
                    'valid': False,
                    'error': 'La parte secundaria debe ser un inquilino para contratos de arrendamiento'
                }
        
        elif contract_type == 'service_provider':
            if secondary.user_type != 'service_provider':
                return {
                    'valid': False,
                    'error': 'La parte secundaria debe ser un prestador de servicios'
                }
        
        return {'valid': True}
    
    def _prepare_contract_context(
        self,
        template: ContractTemplate,
        primary: User,
        secondary: User,
        data: Dict[str, Any],
        property_id: Optional[str]
    ) -> Dict[str, Any]:
        """Prepara el contexto para renderizar el contrato."""
        context = {
            'primary_party': primary,
            'secondary_party': secondary,
            'primary_name': primary.get_full_name(),
            'secondary_name': secondary.get_full_name(),
            'primary_email': primary.email,
            'secondary_email': secondary.email,
            'contract_date': timezone.now().date(),
            'contract_year': timezone.now().year,
            **data
        }
        
        # Agregar información de la propiedad si existe
        if property_id:
            try:
                from properties.models import Property
                property_obj = Property.objects.get(id=property_id)
                context.update({
                    'property': property_obj,
                    'property_address': property_obj.full_address,
                    'property_type': property_obj.get_property_type_display(),
                    'property_city': property_obj.city,
                    'property_neighborhood': property_obj.neighborhood
                })
            except:
                pass
        
        return context
    
    def _render_contract_content(self, template_content: str, context: Dict[str, Any]) -> str:
        """Renderiza el contenido del contrato con las variables."""
        try:
            template = Template(template_content)
            django_context = Context(context)
            return template.render(django_context)
        except Exception as e:
            logger.error(f"Error rendering contract content: {str(e)}")
            return template_content  # Devolver contenido sin renderizar como fallback
    
    def _schedule_contract_notifications(self, contract: Contract):
        """Programa notificaciones automáticas para el contrato."""
        try:
            from notifications.notification_service import notification_service
            
            # Notificación de creación
            for party in [contract.primary_party, contract.secondary_party]:
                notification_service.create_notification(
                    recipient=party,
                    title="Nuevo contrato creado",
                    message=f"Se ha creado el contrato {contract.contract_number}. Revisa y firma cuando estés listo.",
                    template_name="contract_created",
                    priority="high",
                    channels=['in_app', 'email'],
                    action_url=f"/contracts/{contract.id}",
                    content_object=contract
                )
            
            # Notificaciones de vencimiento (30, 15, 7, 1 días antes)
            warning_days = [30, 15, 7, 1]
            for days in warning_days:
                notification_date = contract.end_date - timedelta(days=days)
                if notification_date > timezone.now().date():
                    notification_service.create_notification(
                        recipient=contract.primary_party,
                        title=f"Contrato vence en {days} días",
                        message=f"El contrato {contract.contract_number} vencerá el {contract.end_date}.",
                        template_name="contract_expiry_warning",
                        priority="high" if days <= 7 else "normal",
                        channels=['in_app', 'email'],
                        action_url=f"/contracts/{contract.id}",
                        scheduled_at=timezone.make_aware(datetime.combine(notification_date, datetime.min.time())),
                        content_object=contract
                    )
        
        except Exception as e:
            logger.error(f"Error scheduling contract notifications: {str(e)}")
    
    def _process_biometric_authentication(self, user: User, auth_data: Dict[str, Any]) -> Dict[str, Any]:
        """Procesa autenticación biométrica avanzada."""
        result = {
            'verified': False,
            'data': {},
            'confidence_score': 0.0
        }
        
        try:
            # Procesar reconocimiento facial si está presente
            if auth_data.get('face_data'):
                face_result = self._verify_facial_recognition(user, auth_data['face_data'])
                result['data']['face_verification'] = face_result
                result['verified'] = face_result.get('verified', False)
                result['confidence_score'] = max(result['confidence_score'], face_result.get('confidence', 0.0))
            
            # Procesar verificación de documento
            if auth_data.get('document_data'):
                doc_result = self._verify_document_authenticity(user, auth_data['document_data'])
                result['data']['document_verification'] = doc_result
                result['verified'] = result['verified'] and doc_result.get('verified', False)
            
            # Procesar huella digital si está presente
            if auth_data.get('fingerprint_data'):
                fingerprint_result = self._verify_fingerprint(user, auth_data['fingerprint_data'])
                result['data']['fingerprint_verification'] = fingerprint_result
                result['verified'] = result['verified'] and fingerprint_result.get('verified', False)
            
        except Exception as e:
            logger.error(f"Error in biometric authentication: {str(e)}")
            result['error'] = str(e)
        
        return result
    
    def _verify_facial_recognition(self, user: User, face_data: Dict[str, Any]) -> Dict[str, Any]:
        """Verifica el reconocimiento facial."""
        # Placeholder para integración con servicios de reconocimiento facial
        # En producción se integraría con AWS Rekognition, Azure Face API, etc.
        return {
            'verified': True,  # Placeholder
            'confidence': 0.95,
            'face_match': True,
            'liveness_check': True
        }
    
    def _verify_document_authenticity(self, user: User, doc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Verifica la autenticidad del documento de identidad."""
        # Placeholder para verificación de documentos
        return {
            'verified': True,  # Placeholder
            'document_type': doc_data.get('type', 'cedula'),
            'authenticity_score': 0.92,
            'data_extracted': True
        }
    
    def _verify_fingerprint(self, user: User, fingerprint_data: Dict[str, Any]) -> Dict[str, Any]:
        """Verifica la huella digital."""
        # Placeholder para verificación de huella digital
        return {
            'verified': True,  # Placeholder
            'match_score': 0.88,
            'quality_score': 0.95
        }
    
    def _determine_authentication_level(self, contract: Contract) -> str:
        """Determina el nivel de autenticación requerido."""
        # Contratos de alto valor requieren autenticación máxima
        if contract.monthly_rent and contract.monthly_rent > Decimal('5000000'):  # 5 millones COP
            return 'maximum'
        
        # Contratos comerciales requieren autenticación mejorada
        if contract.contract_type == 'rental_commercial':
            return 'enhanced'
        
        return 'basic'
    
    def _validate_authentication_level(self, auth_data: Dict[str, Any], required_level: str) -> bool:
        """Valida que el nivel de autenticación sea suficiente."""
        provided_methods = set()
        
        if auth_data.get('password'):
            provided_methods.add('password')
        if auth_data.get('face_data'):
            provided_methods.add('facial')
        if auth_data.get('document_data'):
            provided_methods.add('document')
        if auth_data.get('fingerprint_data'):
            provided_methods.add('fingerprint')
        
        if required_level == 'basic':
            return 'password' in provided_methods
        elif required_level == 'enhanced':
            return len(provided_methods) >= 2 and 'password' in provided_methods
        elif required_level == 'maximum':
            return len(provided_methods) >= 3 and all(method in provided_methods for method in ['password', 'facial', 'document'])
        
        return False
    
    def _generate_security_data(
        self,
        contract: Contract,
        signer: User,
        signature_data: Dict[str, Any],
        auth_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Genera datos de seguridad para la firma."""
        return {
            'contract_hash': hashlib.sha256(contract.content.encode()).hexdigest(),
            'signer_verification': True,
            'timestamp_verified': True,
            'ip_validation': self._validate_ip_address(auth_data.get('ip_address')),
            'device_trusted': self._validate_device_fingerprint(auth_data.get('device_fingerprint')),
            'geolocation_consistent': self._validate_geolocation(signer, auth_data.get('geolocation')),
            'security_score': self._calculate_security_score(auth_data)
        }
    
    def _generate_certificate_chain(self, signer: User) -> Dict[str, Any]:
        """Genera cadena de certificados para la firma."""
        return {
            'issuer': 'VeriHome Digital Notary',
            'subject': signer.email,
            'serial_number': str(uuid.uuid4()),
            'valid_from': timezone.now().isoformat(),
            'valid_to': (timezone.now() + timedelta(days=365)).isoformat(),
            'algorithm': 'SHA-256',
            'key_size': 2048
        }
    
    def _generate_timestamp_token(self) -> str:
        """Genera token de marca temporal RFC 3161."""
        # En producción se usaría un servicio de TSA real
        timestamp_data = {
            'timestamp': timezone.now().isoformat(),
            'tsa': 'VeriHome TSA',
            'algorithm': 'SHA-256'
        }
        return hashlib.sha256(json.dumps(timestamp_data).encode()).hexdigest()
    
    def _register_signature_blockchain(self, contract: Contract, signer: User) -> str:
        """Registra la firma en blockchain."""
        # Placeholder para registro en blockchain
        signature_hash = hashlib.sha256(f"{contract.id}{signer.id}{timezone.now()}".encode()).hexdigest()
        return signature_hash
    
    def _update_contract_signature_status(self, contract: Contract):
        """Actualiza el estado del contrato según las firmas."""
        signature_status = contract.get_signature_status()
        
        if signature_status['signed_count'] == 0:
            contract.status = 'pending_signature'
        elif signature_status['signed_count'] < signature_status['total_count']:
            contract.status = 'partially_signed'
        elif signature_status['is_complete']:
            contract.status = 'fully_signed'
        
        contract.save(update_fields=['status'])
    
    def _handle_fully_signed_contract(self, contract: Contract):
        """Maneja contratos completamente firmados."""
        try:
            # Activar el contrato
            contract.status = 'active'
            contract.save()
            
            # Generar PDF final firmado
            final_pdf = self.pdf_generator.generate_signed_contract_pdf(contract)
            if final_pdf['success']:
                contract.pdf_file = final_pdf['file']
                contract.pdf_generated_at = timezone.now()
                contract.is_downloadable = True
                contract.save()
            
            # Notificar a ambas partes
            from notifications.notification_service import notification_service
            
            for party in [contract.primary_party, contract.secondary_party]:
                notification_service.create_notification(
                    recipient=party,
                    title="Contrato completamente firmado",
                    message=f"El contrato {contract.contract_number} ha sido firmado por todas las partes y está ahora activo.",
                    template_name="contract_fully_signed",
                    priority="high",
                    channels=['in_app', 'email'],
                    action_url=f"/contracts/{contract.id}",
                    content_object=contract
                )
            
            # Registrar en sistema de auditoría
            self._audit_contract_activation(contract)
            
        except Exception as e:
            logger.error(f"Error handling fully signed contract: {str(e)}")
    
    # Métodos placeholder para funcionalidades avanzadas
    
    def _validate_ip_address(self, ip_address: str) -> bool:
        """Valida la dirección IP."""
        return True  # Placeholder
    
    def _validate_device_fingerprint(self, device_fp: Dict[str, Any]) -> bool:
        """Valida la huella del dispositivo."""
        return True  # Placeholder
    
    def _validate_geolocation(self, user: User, geolocation: Dict[str, Any]) -> bool:
        """Valida la consistencia de la geolocalización."""
        return True  # Placeholder
    
    def _calculate_security_score(self, auth_data: Dict[str, Any]) -> float:
        """Calcula un score de seguridad."""
        return 0.95  # Placeholder
    
    def _audit_contract_activation(self, contract: Contract):
        """Registra la activación del contrato en auditoría."""
        logger.info(f"Contract {contract.id} activated and fully signed")


class ContractLegalValidator:
    """Validador de aspectos legales de contratos."""
    
    def validate_contract(self, contract: Contract) -> Dict[str, Any]:
        """Valida aspectos legales del contrato."""
        warnings = []
        errors = []
        
        # Validar duración del contrato
        duration = (contract.end_date - contract.start_date).days
        if contract.contract_type == 'rental_urban' and duration > 365 * 3:
            warnings.append("Contratos de vivienda urbana superiores a 3 años requieren consideraciones especiales")
        
        # Validar incremento de renta
        if contract.monthly_rent:
            # Placeholder para validaciones más complejas
            pass
        
        return {
            'valid': len(errors) == 0,
            'warnings': warnings,
            'errors': errors
        }
    
    def analyze_amendment_impact(self, amendment: ContractAmendment) -> Dict[str, Any]:
        """Analiza el impacto legal de una enmienda."""
        return {
            'legal_risk': 'low',
            'requires_notarization': False,
            'affects_rent_control': False,
            'recommendations': []
        }
    
    def validate_rent_increase(self, original_rent: Decimal, new_rent: Decimal, contract_type: str) -> Dict[str, Any]:
        """Valida aumentos de renta según normativas colombianas."""
        increase_percentage = ((new_rent - original_rent) / original_rent) * 100
        
        # En Colombia, el aumento anual no puede superar el IPC + 1%
        max_allowed_increase = 12.0  # Placeholder - debería obtenerse de fuente oficial
        
        if increase_percentage > max_allowed_increase:
            return {
                'valid': False,
                'error': f'El aumento del {increase_percentage:.2f}% supera el máximo permitido del {max_allowed_increase}%'
            }
        
        return {
            'valid': True,
            'increase_percentage': float(increase_percentage),
            'max_allowed': max_allowed_increase
        }


class ContractPDFGenerator:
    """Generador de PDFs para contratos."""
    
    def generate_contract_pdf(self, contract: Contract) -> Dict[str, Any]:
        """Genera PDF del contrato."""
        try:
            # Placeholder para generación de PDF
            # En producción se usaría ReportLab, WeasyPrint, etc.
            
            pdf_content = f"PDF del contrato {contract.contract_number}"
            pdf_file = ContentFile(pdf_content.encode(), name=f"contract_{contract.contract_number}.pdf")
            
            return {
                'success': True,
                'file': pdf_file,
                'filename': f"contract_{contract.contract_number}.pdf"
            }
            
        except Exception as e:
            logger.error(f"Error generating PDF: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def generate_signed_contract_pdf(self, contract: Contract) -> Dict[str, Any]:
        """Genera PDF del contrato firmado."""
        return self.generate_contract_pdf(contract)


class DigitalNotaryService:
    """Servicio de notaría digital."""
    
    def notarize_contract(self, contract: Contract) -> Dict[str, Any]:
        """Notariza digitalmente un contrato."""
        return {
            'success': True,
            'notary_seal': str(uuid.uuid4()),
            'notarized_at': timezone.now().isoformat()
        }


class ContractAIAnalyzer:
    """Analizador de contratos con IA."""
    
    def generate_recommendations(self, contract: Contract) -> List[Dict[str, Any]]:
        """Genera recomendaciones usando IA."""
        return [
            {
                'type': 'optimization',
                'message': 'Considerar agregar cláusula de fuerza mayor',
                'priority': 'medium'
            }
        ]


# Instancia global del servicio
advanced_contract_service = AdvancedContractService()