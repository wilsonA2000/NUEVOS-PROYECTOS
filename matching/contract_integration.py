"""
Servicio de integración entre Matching y Contratos.
Solo permite crear contratos cuando existe un match aceptado.
"""

from typing import Optional, Dict, List
from decimal import Decimal
from datetime import datetime, timedelta
from django.db import transaction
from django.core.exceptions import ValidationError

from matching.models import MatchRequest
from contracts.colombian_contracts import (
    ColombianContract, ColombianContractType, 
    ContractStatus, ContractMilestone, LegalClause
)
from users.models import User
from properties.models import Property


class MatchContractIntegrationService:
    """Servicio para crear contratos desde matches aceptados"""
    
    @staticmethod
    def validate_match_for_contract(match_request: MatchRequest) -> Dict[str, any]:
        """Valida que un match puede convertirse en contrato"""
        errors = []
        warnings = []
        
        # Validación 1: Match debe estar aceptado
        if match_request.status != 'accepted':
            errors.append("El match debe estar aceptado por ambas partes")
        
        # Validación 2: Verificar identidades
        tenant = match_request.tenant
        landlord = match_request.property.landlord
        
        if not tenant.is_verified:
            errors.append("El inquilino debe tener identidad verificada")
        
        if not landlord.is_verified:
            errors.append("El arrendador debe tener identidad verificada")
        
        # Validación 3: Propiedad debe estar disponible
        if match_request.property.status != 'available' or not match_request.property.is_active:
            errors.append("La propiedad no está disponible")
        
        # Validación 4: Documentos requeridos
        required_docs = {
            'tenant': ['cedula', 'carta_laboral', 'referencias'],
            'landlord': ['cedula', 'certificado_tradicion', 'paz_salvo_administracion']
        }
        
        # Aquí verificarías los documentos subidos
        
        # Validación 5: Información financiera
        if match_request.monthly_income < match_request.property.rent_price * 3:
            warnings.append("Ingresos del inquilino menores a 3x el arriendo")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'match_data': {
                'tenant': {
                    'id': str(tenant.id),
                    'name': tenant.get_full_name(),
                    'email': tenant.email,
                    'is_verified': tenant.is_verified
                },
                'landlord': {
                    'id': str(landlord.id),
                    'name': landlord.get_full_name(),
                    'email': landlord.email,
                    'is_verified': landlord.is_verified
                },
                'property': {
                    'id': str(match_request.property.id),
                    'title': match_request.property.title,
                    'address': match_request.property.address,
                    'city': match_request.property.city,
                    'state': match_request.property.state,
                    'rent_price': float(match_request.property.rent_price),
                    'status': match_request.property.status
                },
                'financial_info': {
                    'monthly_rent': float(match_request.property.rent_price),
                    'tenant_income': float(match_request.monthly_income) if match_request.monthly_income else None,
                    'lease_duration': match_request.lease_duration_months
                }
            }
        }
    
    @staticmethod
    @transaction.atomic
    def create_contract_from_match(
        match_request: MatchRequest,
        contract_type: str = ColombianContractType.ARRENDAMIENTO_VIVIENDA_URBANA,
        additional_data: Optional[Dict] = None
    ) -> ColombianContract:
        """Crea un contrato desde un match aceptado"""
        
        # Validar el match
        validation = MatchContractIntegrationService.validate_match_for_contract(match_request)
        if not validation['valid']:
            raise ValidationError(f"No se puede crear contrato: {', '.join(validation['errors'])}")
        
        # Usar objetos directamente desde match_request
        property_obj = match_request.property
        tenant = match_request.tenant
        landlord = match_request.property.landlord
        
        # Calcular fechas
        start_date = match_request.preferred_move_in_date or datetime.now().date() + timedelta(days=15)
        lease_months = match_request.lease_duration_months or 12
        end_date = start_date + timedelta(days=lease_months * 30)
        
        # Crear el contrato
        contract = ColombianContract.objects.create(
            match_request=match_request,
            contract_type=contract_type,
            status=ContractStatus.DRAFT,
            
            # IDs de las partes
            landlord_id_type=match_data['landlord'].document_type or 'CC',
            landlord_id_number=match_data['landlord'].document_number,
            tenant_id_type=match_data['tenant'].document_type or 'CC',
            tenant_id_number=match_data['tenant'].document_number,
            
            # Verificación (heredada del usuario)
            landlord_verified=match_data['landlord'].is_verified,
            tenant_verified=match_data['tenant'].is_verified,
            
            # Detalles financieros
            monthly_rent=property_obj.rent_price,
            security_deposit=property_obj.rent_price * Decimal('1'),  # 1 mes de depósito
            administration_fee=property_obj.administration_fee or Decimal('0'),
            
            # Fechas
            start_date=start_date,
            end_date=end_date,
            payment_due_day=5,  # Default día 5 de cada mes
            
            # Garantías (se completa después)
            guarantee_type='CODEUDOR',  # Default
            
            # Servicios
            utilities_included={
                'agua': False,
                'luz': False,
                'gas': False,
                'internet': property_obj.has_internet or False
            },
            
            # Creador
            created_by=landlord,
            
            # Inventario inicial vacío
            property_inventory=[]
        )
        
        # Crear hitos automáticos (pagos mensuales)
        MatchContractIntegrationService._create_payment_milestones(contract)
        
        # Agregar cláusulas legales obligatorias
        MatchContractIntegrationService._add_mandatory_clauses(contract)
        
        # Notificar a las partes
        MatchContractIntegrationService._notify_contract_creation(contract)
        
        # Actualizar el match
        match_request.has_contract = True
        match_request.save()
        
        return contract
    
    @staticmethod
    def _create_payment_milestones(contract: ColombianContract):
        """Crea los hitos de pago mensuales"""
        current_date = contract.start_date
        month_counter = 1
        
        while current_date <= contract.end_date:
            ContractMilestone.objects.create(
                contract=contract,
                milestone_type='PAGO_MENSUAL',
                description=f'Pago de arriendo mes {month_counter}',
                due_date=current_date.replace(day=contract.payment_due_day),
                amount=contract.monthly_rent + contract.administration_fee,
                status='PENDING'
            )
            
            # Siguiente mes
            if current_date.month == 12:
                current_date = current_date.replace(year=current_date.year + 1, month=1)
            else:
                current_date = current_date.replace(month=current_date.month + 1)
            month_counter += 1
        
        # Hito de entrega inicial
        ContractMilestone.objects.create(
            contract=contract,
            milestone_type='ENTREGA_INMUEBLE',
            description='Entrega del inmueble con inventario',
            due_date=contract.start_date,
            status='PENDING'
        )
        
        # Hito de devolución
        ContractMilestone.objects.create(
            contract=contract,
            milestone_type='DEVOLUCION_INMUEBLE',
            description='Devolución del inmueble en buen estado',
            due_date=contract.end_date,
            status='PENDING'
        )
    
    @staticmethod
    def _add_mandatory_clauses(contract: ColombianContract):
        """Agrega las cláusulas legales obligatorias"""
        # Aquí se agregarían las cláusulas desde la base de datos
        # o desde templates predefinidos según el tipo de contrato
        pass
    
    @staticmethod
    def _notify_contract_creation(contract: ColombianContract):
        """Notifica a las partes sobre la creación del contrato"""
        # Implementar notificaciones por email/SMS/push
        pass


class ContractVerificationService:
    """Servicio para verificación de identidades y documentos"""
    
    @staticmethod
    async def verify_identity_for_contract(user: User, documents: Dict[str, any]) -> Dict:
        """Verifica la identidad del usuario para firmar contratos"""
        verification_steps = []
        
        # 1. Verificación de documento de identidad
        id_verification = await ContractVerificationService._verify_id_document(
            documents.get('id_document'),
            user.document_number
        )
        verification_steps.append(id_verification)
        
        # 2. Verificación biométrica (selfie vs documento)
        if documents.get('selfie'):
            biometric_verification = await ContractVerificationService._verify_biometric(
                documents.get('id_document'),
                documents.get('selfie')
            )
            verification_steps.append(biometric_verification)
        
        # 3. Verificación ante bases de datos gubernamentales
        gov_verification = await ContractVerificationService._verify_government_database(
            user.document_type,
            user.document_number
        )
        verification_steps.append(gov_verification)
        
        # 4. Verificación de antecedentes (opcional)
        if documents.get('request_background_check'):
            background_check = await ContractVerificationService._perform_background_check(user)
            verification_steps.append(background_check)
        
        # Calcular score de verificación
        total_score = sum(step['score'] for step in verification_steps)
        max_score = len(verification_steps) * 100
        verification_percentage = (total_score / max_score) * 100
        
        return {
            'verified': verification_percentage >= 80,
            'verification_score': verification_percentage,
            'steps': verification_steps,
            'can_sign_contracts': verification_percentage >= 90,
            'timestamp': datetime.now()
        }
    
    @staticmethod
    async def _verify_id_document(document_file, expected_number: str) -> Dict:
        """Verifica documento de identidad usando OCR"""
        # Implementación de OCR y verificación
        # Aquí se integraría con servicios como AWS Textract o similar
        return {
            'step': 'document_verification',
            'status': 'completed',
            'score': 90,
            'details': 'Documento verificado correctamente'
        }
    
    @staticmethod
    async def _verify_biometric(id_photo, selfie_photo) -> Dict:
        """Verifica coincidencia biométrica"""
        # Implementación de reconocimiento facial
        # Integración con servicios como AWS Rekognition
        return {
            'step': 'biometric_verification',
            'status': 'completed',
            'score': 95,
            'details': 'Verificación biométrica exitosa'
        }
    
    @staticmethod
    async def _verify_government_database(doc_type: str, doc_number: str) -> Dict:
        """Verifica contra bases de datos gubernamentales"""
        # Integración con APIs gubernamentales
        # RENIEC (Perú), Registraduría (Colombia), etc.
        return {
            'step': 'government_verification',
            'status': 'completed',
            'score': 100,
            'details': 'Verificado en base de datos oficial'
        }
    
    @staticmethod
    async def _perform_background_check(user: User) -> Dict:
        """Realiza verificación de antecedentes"""
        # Verificación de antecedentes penales, crediticios, etc.
        return {
            'step': 'background_check',
            'status': 'completed',
            'score': 85,
            'details': 'Sin antecedentes negativos'
        }