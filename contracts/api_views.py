"""
Vistas de API REST para la aplicación de contratos de VeriHome.
"""

from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db import models
from .models import (
    Contract, ContractTemplate, ContractSignature, ContractAmendment,
    ContractRenewal, ContractTermination, ContractDocument
)
from .serializers import (
    ContractSerializer, CreateContractSerializer, UpdateContractSerializer,
    ContractTemplateSerializer, ContractSignatureSerializer, ContractAmendmentSerializer,
    ContractRenewalSerializer, ContractTerminationSerializer, ContractDocumentSerializer,
    ContractStatsSerializer
)
from users.services import AdminActionLogger

User = get_user_model()

# ViewSets básicos
class ContractViewSet(viewsets.ModelViewSet):
    """ViewSet para contratos."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Contract.objects.filter(
            primary_party=self.request.user
        ) | Contract.objects.filter(
            secondary_party=self.request.user
        )
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateContractSerializer
        elif self.action in ['update', 'partial_update']:
            return UpdateContractSerializer
        return ContractSerializer

    def perform_create(self, serializer):
        contract = serializer.save()
        request = self.request
        # Logging automático
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='contract_create',
                description=f'Creación de contrato {contract.title}',
                target_object=contract,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            # Registrar como actividad de usuario
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='contract_create',
                description=f'Creación de contrato {contract.title}',
                details={'contract_id': str(contract.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                performed_by_admin=False
            )

    def perform_update(self, serializer):
        contract = serializer.save()
        request = self.request
        # Logging automático
        if hasattr(request, 'impersonation_session'):
            logger = AdminActionLogger(request.impersonation_session)
            logger.log_action(
                action_type='contract_edit',
                description=f'Edición de contrato {contract.title}',
                target_object=contract,
                new_data=serializer.data,
                notify_user=True
            )
        else:
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type='contract_edit',
                description=f'Edición de contrato {contract.title}',
                details={'contract_id': str(contract.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                performed_by_admin=False
            )

class ContractTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet para plantillas de contratos."""
    queryset = ContractTemplate.objects.filter(is_active=True)
    serializer_class = ContractTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

class ContractSignatureViewSet(viewsets.ModelViewSet):
    """ViewSet para firmas de contratos."""
    queryset = ContractSignature.objects.all()
    serializer_class = ContractSignatureSerializer
    permission_classes = [permissions.IsAuthenticated]

class ContractAmendmentViewSet(viewsets.ModelViewSet):
    """ViewSet para enmiendas de contratos."""
    queryset = ContractAmendment.objects.all()
    serializer_class = ContractAmendmentSerializer
    permission_classes = [permissions.IsAuthenticated]

class ContractRenewalViewSet(viewsets.ModelViewSet):
    """ViewSet para renovaciones de contratos."""
    queryset = ContractRenewal.objects.all()
    serializer_class = ContractRenewalSerializer
    permission_classes = [permissions.IsAuthenticated]

class ContractTerminationViewSet(viewsets.ModelViewSet):
    """ViewSet para terminaciones de contratos."""
    queryset = ContractTermination.objects.all()
    serializer_class = ContractTerminationSerializer
    permission_classes = [permissions.IsAuthenticated]

class ContractDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet para documentos de contratos."""
    queryset = ContractDocument.objects.all()
    serializer_class = ContractDocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

# Vistas de API personalizadas
class SignContractAPIView(APIView):
    """Vista para firmar un contrato con firma digital avanzada."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_pk):
        try:
            # Obtener el contrato - verificar que el usuario sea parte del contrato
            contract = Contract.objects.filter(
                models.Q(id=contract_pk) & 
                (models.Q(primary_party=request.user) | models.Q(secondary_party=request.user))
            ).first()
            
            if not contract:
                return Response(
                    {"detail": "Contrato no encontrado o no tienes permisos"}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verificar si ya firmó
            if contract.signatures.filter(signer=request.user, is_valid=True).exists():
                return Response(
                    {"detail": "Ya has firmado este contrato"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verificar que el contrato esté en estado firmable
            if contract.status not in ['pending_signature', 'partially_signed']:
                return Response(
                    {"detail": f"El contrato no puede ser firmado en estado: {contract.get_status_display()}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener datos de la firma
            signature_data = request.data.get('signature_data')
            biometric_data = request.data.get('biometric_data', {})
            verification_level = request.data.get('verification_level', 'basic')
            device_info = request.data.get('device_info', {})
            
            if not signature_data:
                return Response(
                    {"detail": "Datos de firma requeridos"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Determinar método de autenticación basado en datos biométricos
            authentication_method = 'password'  # Por defecto
            if biometric_data:
                if biometric_data.get('fingerprint'):
                    authentication_method = 'biometric_fingerprint'
                elif biometric_data.get('facialRecognition'):
                    authentication_method = 'webcam_face'
                elif biometric_data.get('documentVerification'):
                    authentication_method = 'webcam_document'
            
            # Generar hash de verificación seguro
            import hashlib
            import json
            from datetime import datetime
            
            hash_data = {
                'contract_id': str(contract.id),
                'signer_id': str(request.user.id),
                'signature': signature_data.get('signature', ''),
                'timestamp': signature_data.get('timestamp', datetime.now().isoformat()),
                'ip_address': request.META.get('REMOTE_ADDR', ''),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            }
            hash_string = json.dumps(hash_data, sort_keys=True)
            verification_hash = hashlib.sha256(hash_string.encode()).hexdigest()
            
            # Procesar datos de geolocalización
            geolocation = {}
            if signature_data.get('signerInfo', {}).get('geolocation'):
                geo = signature_data['signerInfo']['geolocation']
                geolocation = {
                    'latitude': geo.get('coords', {}).get('latitude'),
                    'longitude': geo.get('coords', {}).get('longitude'),
                    'accuracy': geo.get('coords', {}).get('accuracy'),
                    'timestamp': geo.get('timestamp')
                }
            
            # Crear firma digital
            signature = ContractSignature.objects.create(
                contract=contract,
                signer=request.user,
                signature_type='digital',
                authentication_method=authentication_method,
                signature_data=signature_data.get('signature', ''),
                ip_address=request.META.get('REMOTE_ADDR', ''),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                geolocation=geolocation,
                verification_hash=verification_hash,
                verification_level=verification_level,
                biometric_data=biometric_data,
                device_fingerprint=device_info,
                face_verification_data=biometric_data.get('facialRecognition', {}) if biometric_data else {},
                document_verification_data=biometric_data.get('documentVerification', {}) if biometric_data else {},
                security_checks={
                    'ip_verified': True,
                    'device_verified': bool(device_info),
                    'biometric_verified': bool(biometric_data),
                    'timestamp_verified': True,
                    'verification_level': verification_level
                }
            )
            
            # Guardar imagen de firma si viene en base64
            if signature_data.get('signature', '').startswith('data:image'):
                from django.core.files.base import ContentFile
                import base64
                
                format, imgstr = signature_data['signature'].split(';base64,')
                ext = format.split('/')[-1]
                data = ContentFile(base64.b64decode(imgstr), name=f'signature_{signature.id}.{ext}')
                signature.signature_image = data
                signature.save()
            
            # Actualizar estado del contrato
            if contract.is_fully_signed():
                contract.status = 'fully_signed'
                contract.save()
                
                # Enviar notificación a todas las partes
                from core.notifications import NotificationService
                notification_service = NotificationService()
                
                for user in [contract.primary_party, contract.secondary_party]:
                    notification_service.create_notification(
                        user=user,
                        notification_type='contract_fully_signed',
                        title='Contrato completamente firmado',
                        message=f'El contrato "{contract.title}" ha sido firmado por todas las partes.',
                        related_object=contract
                    )
            else:
                contract.status = 'partially_signed'
                contract.save()
                
                # Notificar a la otra parte que falta su firma
                other_party = contract.secondary_party if request.user == contract.primary_party else contract.primary_party
                
                from core.notifications import NotificationService
                notification_service = NotificationService()
                notification_service.create_notification(
                    user=other_party,
                    notification_type='contract_awaiting_signature',
                    title='Contrato pendiente de firma',
                    message=f'{request.user.get_full_name()} ha firmado el contrato "{contract.title}". Ahora es tu turno.',
                    related_object=contract
                )
            
            # Logging automático
            if hasattr(request, 'impersonation_session'):
                logger = AdminActionLogger(request.impersonation_session)
                logger.log_action(
                    action_type='contract_sign',
                    description=f'Firma digital de contrato {contract.title} con nivel {verification_level}',
                    target_object=contract,
                    new_data={
                        'signature_id': str(signature.id),
                        'verification_level': verification_level,
                        'authentication_method': authentication_method
                    },
                    notify_user=True
                )
            else:
                from users.models import UserActivityLog
                UserActivityLog.objects.create(
                    user=request.user,
                    activity_type='contract_sign',
                    description=f'Firma digital de contrato {contract.title}',
                    details={
                        'contract_id': str(contract.id),
                        'signature_id': str(signature.id),
                        'verification_level': verification_level
                    },
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    performed_by_admin=False
                )
            
            return Response(ContractSignatureSerializer(signature).data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            import traceback
            print(f"Error en firma de contrato: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"detail": f"Error al firmar el contrato: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class VerifySignatureAPIView(APIView):
    """Vista para verificar firma de un contrato."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, contract_pk):
        try:
            contract = Contract.objects.get(id=contract_pk)
            signatures = contract.signatures.filter(is_valid=True)
            
            return Response({
                'contract_id': contract.id,
                'total_signatures': signatures.count(),
                'required_signatures': 2,  # primary_party + secondary_party
                'is_fully_signed': contract.is_fully_signed(),
                'signatures': ContractSignatureSerializer(signatures, many=True).data
            })
            
        except Contract.DoesNotExist:
            return Response(
                {"detail": "Contrato no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class ActivateContractAPIView(APIView):
    """Vista para activar un contrato."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_pk):
        try:
            contract = Contract.objects.get(
                id=contract_pk,
                primary_party=request.user
            )
            
            if not contract.is_fully_signed():
                return Response(
                    {"detail": "El contrato debe estar completamente firmado"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            contract.status = 'active'
            contract.save()
            
            # Logging automático
            if hasattr(request, 'impersonation_session'):
                logger = AdminActionLogger(request.impersonation_session)
                logger.log_action(
                    action_type='contract_activate',
                    description=f'Activación de contrato {contract.title}',
                    target_object=contract,
                    new_data={'status': 'active'},
                    notify_user=True
                )
            else:
                from users.models import UserActivityLog
                UserActivityLog.objects.create(
                    user=request.user,
                    activity_type='contract_activate',
                    description=f'Activación de contrato {contract.title}',
                    details={'contract_id': str(contract.id)},
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', ''),
                    performed_by_admin=False
                )
            
            return Response({"detail": "Contrato activado correctamente"})
            
        except Contract.DoesNotExist:
            return Response(
                {"detail": "Contrato no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class SuspendContractAPIView(APIView):
    """Vista para suspender un contrato."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_pk):
        try:
            contract = Contract.objects.get(
                id=contract_pk,
                primary_party=request.user
            )
            
            contract.status = 'suspended'
            contract.save()
            
            return Response({"detail": "Contrato suspendido correctamente"})
            
        except Contract.DoesNotExist:
            return Response(
                {"detail": "Contrato no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class UploadDocumentAPIView(APIView):
    """Vista para subir documentos a un contrato."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_pk):
        try:
            contract = Contract.objects.get(
                id=contract_pk,
                primary_party=request.user
            ) | Contract.objects.get(
                id=contract_pk,
                secondary_party=request.user
            )
            
            file = request.FILES.get('file')
            if not file:
                return Response(
                    {"detail": "Archivo requerido"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            document = ContractDocument.objects.create(
                contract=contract,
                title=request.data.get('title', file.name),
                document_type=request.data.get('document_type', 'other'),
                description=request.data.get('description', ''),
                file=file,
                uploaded_by=request.user,
                file_size=file.size,
                mime_type=file.content_type
            )
            
            return Response(ContractDocumentSerializer(document).data, status=status.HTTP_201_CREATED)
            
        except Contract.DoesNotExist:
            return Response(
                {"detail": "Contrato no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )

class ExpiringContractsAPIView(generics.ListAPIView):
    """Vista para listar contratos próximos a expirar."""
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        from django.utils import timezone
        from datetime import timedelta
        
        # Contratos que expiran en los próximos 30 días
        future_date = timezone.now().date() + timedelta(days=30)
        
        return Contract.objects.filter(
            end_date__lte=future_date,
            status='active'
        ).filter(
            primary_party=self.request.user
        ) | Contract.objects.filter(
            end_date__lte=future_date,
            status='active'
        ).filter(
            secondary_party=self.request.user
        )

class PendingSignaturesAPIView(generics.ListAPIView):
    """Vista para listar contratos pendientes de firma."""
    serializer_class = ContractSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Contract.objects.filter(
            status='pending_signature'
        ).filter(
            primary_party=self.request.user
        ) | Contract.objects.filter(
            status='pending_signature'
        ).filter(
            secondary_party=self.request.user
        )

class ContractStatsAPIView(APIView):
    """Vista para estadísticas de contratos."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Obtener contratos del usuario
        user_contracts = Contract.objects.filter(
            primary_party=user
        ) | Contract.objects.filter(
            secondary_party=user
        )
        
        # Calcular estadísticas
        total_contracts = user_contracts.count()
        active_contracts = user_contracts.filter(status='active').count()
        pending_signatures = user_contracts.filter(status='pending_signature').count()
        
        # Contratos próximos a expirar (30 días)
        from django.utils import timezone
        from datetime import timedelta
        future_date = timezone.now().date() + timedelta(days=30)
        expiring_soon = user_contracts.filter(
            end_date__lte=future_date,
            status='active'
        ).count()
        
        # Valor total (solo contratos de arrendamiento)
        total_value = user_contracts.filter(
            contract_type='rental',
            status='active'
        ).aggregate(
            total=models.Sum('monthly_rent')
        )['total'] or 0
        
        stats = {
            'total_contracts': total_contracts,
            'active_contracts': active_contracts,
            'pending_signatures': pending_signatures,
            'expiring_soon': expiring_soon,
            'total_value': total_value
        }
        
        return Response(stats)


class DigitalSignatureAPIView(APIView):
    """Vista avanzada para firma digital con verificación biométrica."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_id):
        """Procesa una firma digital avanzada."""
        try:
            # Obtener el contrato
            contract = Contract.objects.get(
                id=contract_id,
                status__in=['pending_signature', 'partially_signed']
            )
            
            # Verificar que el usuario puede firmar este contrato
            if request.user not in [contract.primary_party, contract.secondary_party]:
                return Response(
                    {'error': 'No tiene permisos para firmar este contrato'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Verificar que el usuario no haya firmado ya
            existing_signature = ContractSignature.objects.filter(
                contract=contract,
                signer=request.user
            ).first()
            
            if existing_signature:
                return Response(
                    {'error': 'Ya ha firmado este contrato'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Extraer datos del request
            signature_data = request.data.get('signature_data', {})
            biometric_data = request.data.get('biometric_data', {})
            verification_level = request.data.get('verification_level', 'basic')
            device_info = request.data.get('device_info', {})
            
            # Validar datos requeridos
            if not signature_data.get('signature'):
                return Response(
                    {'error': 'Datos de firma requeridos'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener información del cliente
            client_ip = self.get_client_ip(request)
            user_agent = request.META.get('HTTP_USER_AGENT', '')
            
            # Procesar verificación biométrica si está presente
            security_checks = self.process_biometric_verification(biometric_data)
            
            # Generar hash de verificación
            verification_hash = self.generate_verification_hash(
                contract_id, request.user.id, signature_data, biometric_data
            )
            
            # Crear la firma
            signature = ContractSignature.objects.create(
                contract=contract,
                signer=request.user,
                signature_type='biometric' if biometric_data else 'digital',
                authentication_method=self.determine_auth_method(biometric_data),
                signature_data=signature_data.get('signature'),
                face_verification_data=biometric_data.get('facialRecognition', {}),
                document_verification_data=biometric_data.get('documentVerification', {}),
                ip_address=client_ip,
                user_agent=user_agent,
                geolocation=signature_data.get('signerInfo', {}).get('geolocation', {}),
                verification_hash=verification_hash,
                biometric_data=biometric_data,
                device_fingerprint=device_info,
                verification_level=verification_level,
                security_checks=security_checks
            )
            
            # Procesar imagen de firma si está presente
            if signature_data.get('signature'):
                self.save_signature_image(signature, signature_data.get('signature'))
            
            # Actualizar estado del contrato
            self.update_contract_status(contract)
            
            # Generar timestamp token (simulado)
            signature.timestamp_token = self.generate_timestamp_token()
            
            # Generar hash de blockchain (simulado)
            signature.blockchain_hash = self.generate_blockchain_hash(signature)
            signature.save()
            
            # Crear actividad de usuario
            from users.utils import create_user_activity
            create_user_activity(
                user=request.user,
                action='contract_signed',
                description=f'Contrato firmado digitalmente: {contract.contract_number}',
                metadata={
                    'contract_id': str(contract.id),
                    'verification_level': verification_level,
                    'biometric_used': bool(biometric_data)
                }
            )
            
            # Enviar notificaciones
            self.send_signature_notifications(contract, signature)
            
            return Response({
                'message': 'Contrato firmado exitosamente',
                'signature_id': signature.id,
                'verification_hash': verification_hash,
                'verification_level': verification_level,
                'contract_status': contract.status,
                'is_fully_signed': contract.is_fully_signed(),
                'timestamp': signature.signed_at.isoformat(),
                'blockchain_hash': signature.blockchain_hash
            }, status=status.HTTP_201_CREATED)
            
        except Contract.DoesNotExist:
            return Response(
                {'error': 'Contrato no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error procesando firma: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def get_client_ip(self, request):
        """Obtiene la IP real del cliente."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def determine_auth_method(self, biometric_data):
        """Determina el método de autenticación basado en los datos biométricos."""
        if biometric_data.get('fingerprint'):
            return 'biometric_fingerprint'
        elif biometric_data.get('facialRecognition'):
            return 'webcam_face'
        elif biometric_data.get('documentVerification'):
            return 'webcam_document'
        else:
            return 'digital_signature'
    
    def process_biometric_verification(self, biometric_data):
        """Procesa y valida los datos biométricos."""
        security_checks = {
            'facial_recognition_confidence': 0,
            'document_verification_confidence': 0,
            'fingerprint_quality': 0,
            'overall_score': 0,
            'verification_timestamp': timezone.now().isoformat()
        }
        
        if biometric_data.get('facialRecognition'):
            facial_data = biometric_data['facialRecognition']
            security_checks['facial_recognition_confidence'] = facial_data.get('confidence', 0)
            
        if biometric_data.get('documentVerification'):
            doc_data = biometric_data['documentVerification']
            security_checks['document_verification_confidence'] = doc_data.get('confidence', 0)
            
        if biometric_data.get('fingerprint'):
            fp_data = biometric_data['fingerprint']
            security_checks['fingerprint_quality'] = fp_data.get('quality', 0)
        
        # Calcular puntuación general
        confidences = [
            security_checks['facial_recognition_confidence'],
            security_checks['document_verification_confidence'],
            security_checks['fingerprint_quality']
        ]
        
        valid_confidences = [c for c in confidences if c > 0]
        if valid_confidences:
            security_checks['overall_score'] = sum(valid_confidences) / len(valid_confidences)
        
        return security_checks
    
    def generate_verification_hash(self, contract_id, user_id, signature_data, biometric_data):
        """Genera un hash de verificación único."""
        import hashlib
        
        data_string = f"{contract_id}:{user_id}:{signature_data.get('timestamp')}:{signature_data.get('signature')[:50]}"
        if biometric_data:
            data_string += f":{str(biometric_data)[:100]}"
        
        return hashlib.sha256(data_string.encode()).hexdigest()
    
    def save_signature_image(self, signature, signature_data_url):
        """Guarda la imagen de la firma."""
        import base64
        from django.core.files.base import ContentFile
        
        try:
            # Extraer datos de la imagen base64
            format, imgstr = signature_data_url.split(';base64,')
            ext = format.split('/')[-1]
            
            data = ContentFile(base64.b64decode(imgstr))
            filename = f"signature_{signature.id}.{ext}"
            signature.signature_image.save(filename, data, save=True)
            
        except Exception as e:
            print(f"Error saving signature image: {e}")
    
    def update_contract_status(self, contract):
        """Actualiza el estado del contrato después de la firma."""
        if contract.is_fully_signed():
            contract.status = 'fully_signed'
            contract.signed_date = timezone.now().date()
        else:
            contract.status = 'partially_signed'
        
        contract.save()
    
    def generate_timestamp_token(self):
        """Genera un token de marca temporal (simulado)."""
        import hashlib
        timestamp = timezone.now().isoformat()
        return hashlib.md5(f"TIMESTAMP:{timestamp}".encode()).hexdigest()
    
    def generate_blockchain_hash(self, signature):
        """Genera un hash de blockchain (simulado)."""
        import hashlib
        data = f"{signature.contract.id}:{signature.signer.id}:{signature.signed_at}:{signature.verification_hash}"
        return hashlib.sha256(data.encode()).hexdigest()
    
    def send_signature_notifications(self, contract, signature):
        """Envía notificaciones de firma."""
        # Implementar sistema de notificaciones
        # Por ahora solo logging
        print(f"Signature notification: Contract {contract.contract_number} signed by {signature.signer.get_full_name()}")


class SignatureVerificationAPIView(APIView):
    """Vista para verificar la autenticidad de una firma."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, signature_id):
        """Verifica la autenticidad de una firma."""
        try:
            signature = ContractSignature.objects.get(id=signature_id)
            
            # Verificar permisos
            if request.user not in [signature.contract.primary_party, signature.contract.secondary_party]:
                return Response(
                    {'error': 'No tiene permisos para verificar esta firma'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Regenerar hash para verificación
            verification_hash = self.regenerate_verification_hash(signature)
            is_valid = verification_hash == signature.verification_hash
            
            verification_data = {
                'signature_id': signature.id,
                'signer': signature.signer.get_full_name(),
                'contract_number': signature.contract.contract_number,
                'signed_at': signature.signed_at,
                'verification_level': signature.verification_level,
                'is_valid': is_valid,
                'hash_matches': verification_hash == signature.verification_hash,
                'security_checks': signature.security_checks,
                'biometric_verification': {
                    'facial_recognition_used': bool(signature.face_verification_data),
                    'document_verification_used': bool(signature.document_verification_data),
                    'fingerprint_used': bool(signature.biometric_data.get('fingerprint'))
                },
                'device_info': signature.device_fingerprint,
                'location_info': signature.geolocation,
                'blockchain_hash': signature.blockchain_hash,
                'timestamp_token': signature.timestamp_token
            }
            
            return Response(verification_data)
            
        except ContractSignature.DoesNotExist:
            return Response(
                {'error': 'Firma no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def regenerate_verification_hash(self, signature):
        """Regenera el hash de verificación para comparación."""
        import hashlib
        
        signature_data = {
            'signature': signature.signature_data[:50],
            'timestamp': signature.signed_at.isoformat()
        }
        
        data_string = f"{signature.contract.id}:{signature.signer.id}:{signature_data['timestamp']}:{signature_data['signature']}"
        if signature.biometric_data:
            data_string += f":{str(signature.biometric_data)[:100]}"
        
        return hashlib.sha256(data_string.encode()).hexdigest()