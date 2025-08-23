"""
Vistas de API REST para la aplicación de contratos de VeriHome.
OPTIMIZED with performance monitoring and intelligent caching.
"""

from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db import models
from django.http import JsonResponse
from datetime import timedelta
# Import optimizations
from core.optimizations import (
    QueryOptimizationMixin, OptimizedPagination, PerformanceTrackingMixin,
    cache_expensive_operation, OptimizedContractSerializer
)
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

# Optimized ViewSets
class ContractViewSet(QueryOptimizationMixin, PerformanceTrackingMixin, viewsets.ModelViewSet):
    """ViewSet para contratos - OPTIMIZADO."""
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = OptimizedPagination
    
    def get_queryset(self):
        base_queryset = Contract.objects.filter(
            models.Q(primary_party=self.request.user) | 
            models.Q(secondary_party=self.request.user)
        ).select_related(
            'property', 'primary_party', 'secondary_party', 'template'
        ).prefetch_related(
            'signatures', 'amendments', 'documents'
        ).order_by('-created_at')
        return self.get_optimized_queryset(base_queryset)
    
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
                metadata={'contract_id': str(contract.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
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
                metadata={'contract_id': str(contract.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
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
                    metadata={
                        'contract_id': str(contract.id),
                        'signature_id': str(signature.id),
                        'verification_level': verification_level
                    },
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
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
                    metadata={'contract_id': str(contract.id)},
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
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


# ===================================================================
# NUEVAS APIS ESPECIALIZADAS PARA FLUJO BIOMÉTRICO COMPLETO
# ===================================================================

class GenerateContractPDFAPIView(APIView):
    """Vista para generar PDF inicial del contrato."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_id):
        """Genera PDF del contrato y actualiza estado."""
        try:
            from .pdf_generator import pdf_generator
            
            contract = Contract.objects.get(
                id=contract_id,
                primary_party=request.user,
                status='draft'
            )
            
            # Generar PDF
            pdf_content = pdf_generator.generate_contract_pdf(contract)
            pdf_url = pdf_generator.save_pdf_to_contract(contract, pdf_content)
            
            # Actualizar estado del contrato
            contract.status = 'pdf_generated'
            contract.save(update_fields=['status'])
            
            return Response({
                'success': True,
                'message': 'PDF generado exitosamente',
                'pdf_url': pdf_url,
                'contract_status': contract.status,
                'contract_id': str(contract.id),
                'generated_at': contract.pdf_generated_at.isoformat() if contract.pdf_generated_at else None
            })
            
        except Contract.DoesNotExist:
            return Response(
                {'error': 'Contrato no encontrado o sin permisos'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error generando PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class EditContractBeforeAuthAPIView(APIView):
    """Vista para editar contrato antes de autenticación."""
    permission_classes = [permissions.IsAuthenticated]
    
    def put(self, request, contract_id):
        """Permite editar el contrato antes de iniciar autenticación."""
        try:
            contract = Contract.objects.get(
                id=contract_id,
                primary_party=request.user,
                status__in=['pdf_generated', 'ready_for_authentication']
            )
            
            # Obtener datos de edición
            editable_fields = [
                'title', 'description', 'monthly_rent', 'security_deposit', 
                'late_fee', 'minimum_lease_term', 'start_date', 'end_date'
            ]
            
            updated_fields = []
            for field in editable_fields:
                if field in request.data:
                    setattr(contract, field, request.data[field])
                    updated_fields.append(field)
            
            if updated_fields:
                contract.save(update_fields=updated_fields)
                
                # Si se modificó el contrato, regenerar PDF
                from .pdf_generator import pdf_generator
                pdf_content = pdf_generator.generate_contract_pdf(contract)
                pdf_generator.save_pdf_to_contract(contract, pdf_content)
            
            return Response({
                'success': True,
                'message': 'Contrato actualizado exitosamente',
                'updated_fields': updated_fields,
                'contract_status': contract.status,
                'pdf_regenerated': bool(updated_fields)
            })
            
        except Contract.DoesNotExist:
            return Response(
                {'error': 'Contrato no encontrado o sin permisos'},
                status=status.HTTP_404_NOT_FOUND
            )


class StartBiometricAuthenticationAPIView(APIView):
    """Vista para iniciar autenticación biométrica."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_id):
        """Inicia el proceso de autenticación biométrica."""
        try:
            from .biometric_service import biometric_service
            
            contract = Contract.objects.get(
                id=contract_id,
                status__in=['pdf_generated', 'ready_for_authentication']
            )
            
            # Verificar que el usuario sea parte del contrato
            if request.user not in [contract.primary_party, contract.secondary_party]:
                return Response(
                    {'error': 'No tiene permisos para autenticarse en este contrato'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Iniciar autenticación biométrica
            auth = biometric_service.initiate_authentication(contract, request.user, request)
            
            return Response({
                'success': True,
                'message': 'Autenticación biométrica iniciada',
                'authentication_id': str(auth.id),
                'contract_status': contract.status,
                'expires_at': auth.expires_at.isoformat(),
                'voice_text': auth.voice_text,
                'next_step': 'face_capture',
                'progress': auth.get_progress_percentage()
            })
            
        except Contract.DoesNotExist:
            return Response(
                {'error': 'Contrato no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error iniciando autenticación: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class FaceCaptureAPIView(APIView):
    """Vista para capturar fotos faciales (frontal y lateral)."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_id):
        """Procesa capturas faciales."""
        try:
            from .biometric_service import biometric_service
            from .models import BiometricAuthentication
            
            # Obtener autenticación activa
            auth = BiometricAuthentication.objects.get(
                contract_id=contract_id,
                user=request.user,
                status__in=['pending', 'in_progress']
            )
            
            # Obtener datos de imágenes
            face_front_data = request.data.get('face_front_image')
            face_side_data = request.data.get('face_side_image')
            
            if not face_front_data or not face_side_data:
                return Response(
                    {'error': 'Se requieren ambas imágenes faciales (frontal y lateral)'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Procesar capturas faciales
            result = biometric_service.process_face_capture(
                str(auth.id), face_front_data, face_side_data
            )
            
            return Response(result)
            
        except BiometricAuthentication.DoesNotExist:
            return Response(
                {'error': 'Autenticación biométrica no encontrada o expirada'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error procesando capturas faciales: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DocumentCaptureAPIView(APIView):
    """Vista para capturar documento de identidad."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_id):
        """Procesa imagen del documento de identidad."""
        try:
            from .biometric_service import biometric_service
            from .models import BiometricAuthentication
            
            # Obtener autenticación activa
            auth = BiometricAuthentication.objects.get(
                contract_id=contract_id,
                user=request.user,
                status='in_progress'
            )
            
            # Obtener datos del documento
            document_image_data = request.data.get('document_image')
            document_type = request.data.get('document_type', 'cedula_ciudadania')
            document_number = request.data.get('document_number', '')
            
            if not document_image_data:
                return Response(
                    {'error': 'Se requiere imagen del documento'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Procesar documento
            result = biometric_service.process_document_verification(
                str(auth.id), document_image_data, document_type, document_number
            )
            
            return Response(result)
            
        except BiometricAuthentication.DoesNotExist:
            return Response(
                {'error': 'Autenticación biométrica no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error procesando documento: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CombinedCaptureAPIView(APIView):
    """Vista para capturar documento junto al rostro."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_id):
        """Procesa imagen del documento junto al rostro."""
        try:
            from .biometric_service import biometric_service
            from .models import BiometricAuthentication
            
            # Obtener autenticación activa
            auth = BiometricAuthentication.objects.get(
                contract_id=contract_id,
                user=request.user,
                status='in_progress'
            )
            
            # Obtener datos de imagen combinada
            combined_image_data = request.data.get('combined_image')
            
            if not combined_image_data:
                return Response(
                    {'error': 'Se requiere imagen del documento junto al rostro'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Procesar imagen combinada
            result = biometric_service.process_combined_verification(
                str(auth.id), combined_image_data
            )
            
            return Response(result)
            
        except BiometricAuthentication.DoesNotExist:
            return Response(
                {'error': 'Autenticación biométrica no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error procesando imagen combinada: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class VoiceCaptureAPIView(APIView):
    """Vista para capturar grabación de voz."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_id):
        """Procesa grabación de voz."""
        try:
            from .biometric_service import biometric_service
            from .models import BiometricAuthentication
            
            # Obtener autenticación activa
            auth = BiometricAuthentication.objects.get(
                contract_id=contract_id,
                user=request.user,
                status='in_progress'
            )
            
            # Obtener datos de voz
            voice_recording_data = request.data.get('voice_recording')
            expected_text = request.data.get('expected_text', auth.voice_text)
            
            if not voice_recording_data:
                return Response(
                    {'error': 'Se requiere grabación de voz'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Procesar grabación de voz
            result = biometric_service.process_voice_verification(
                str(auth.id), voice_recording_data, expected_text
            )
            
            return Response(result)
            
        except BiometricAuthentication.DoesNotExist:
            return Response(
                {'error': 'Autenticación biométrica no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error procesando grabación de voz: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CompleteAuthenticationAPIView(APIView):
    """Vista para completar autenticación biométrica."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, contract_id):
        """Completa y valida la autenticación biométrica."""
        try:
            from .biometric_service import biometric_service
            from .models import BiometricAuthentication
            
            # Obtener autenticación activa
            auth = BiometricAuthentication.objects.get(
                contract_id=contract_id,
                user=request.user,
                status='in_progress'
            )
            
            # Completar autenticación
            result = biometric_service.complete_authentication(str(auth.id))
            
            return Response(result)
            
        except BiometricAuthentication.DoesNotExist:
            return Response(
                {'error': 'Autenticación biométrica no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Error completando autenticación: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BiometricAuthenticationStatusAPIView(APIView):
    """Vista para consultar estado de autenticación biométrica."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, contract_id):
        """Obtiene el estado actual de la autenticación biométrica."""
        try:
            from .models import BiometricAuthentication
            
            auth = BiometricAuthentication.objects.get(
                contract_id=contract_id,
                user=request.user
            )
            
            return Response({
                'authentication_id': str(auth.id),
                'status': auth.status,
                'progress': auth.get_progress_percentage(),
                'overall_confidence': auth.overall_confidence_score,
                'individual_scores': {
                    'face_confidence': auth.face_confidence_score,
                    'document_confidence': auth.document_confidence_score,
                    'voice_confidence': auth.voice_confidence_score
                },
                'completed_steps': {
                    'face_front': bool(auth.face_front_image),
                    'face_side': bool(auth.face_side_image),
                    'document': bool(auth.document_image),
                    'combined': bool(auth.document_with_face_image),
                    'voice': bool(auth.voice_recording)
                },
                'started_at': auth.started_at.isoformat(),
                'completed_at': auth.completed_at.isoformat() if auth.completed_at else None,
                'expires_at': auth.expires_at.isoformat(),
                'is_expired': auth.is_expired(),
                'is_complete': auth.is_complete(),
                'voice_text': auth.voice_text,
                'contract_status': auth.contract.status
            })
            
        except BiometricAuthentication.DoesNotExist:
            return Response(
                {'error': 'Autenticación biométrica no encontrada'},
                status=status.HTTP_404_NOT_FOUND
            )


class TenantProcessesAPIView(generics.ListAPIView):
    """Vista para que los inquilinos vean sus procesos de arrendamiento en curso."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene todos los procesos de arrendamiento del inquilino/candidato actual."""
        try:
            from requests.models import PropertyInterestRequest
            from matching.models import MatchRequest
            from django.db import models
            
            # Solo inquilinos pueden ver esta vista
            if request.user.user_type not in ['tenant', 'candidate']:
                return Response({
                    'results': [],
                    'count': 0,
                    'message': 'Esta vista es solo para inquilinos y candidatos'
                })
            
            processes = []
            
            # 1. Buscar en PropertyInterestRequest como requester
            try:
                property_requests = PropertyInterestRequest.objects.filter(
                    requester=request.user,
                    status='accepted'  # Solo procesos aprobados/en curso
                ).select_related('property', 'assignee').order_by('-created_at')
                
                for request_obj in property_requests:
                    processes.append(self._format_property_request(request_obj))
                    
            except Exception as e:
                print(f"Error fetching PropertyInterestRequest: {e}")
            
            # 2. Buscar en MatchRequest como tenant (fallback)
            try:
                match_requests = MatchRequest.objects.filter(
                    tenant=request.user,
                    status='accepted'
                ).select_related('property', 'landlord').order_by('-created_at')
                
                for match_obj in match_requests:
                    processes.append(self._format_match_request(match_obj))
                    
            except Exception as e:
                print(f"Error fetching MatchRequest: {e}")
            
            print(f"🔍 TenantProcesses: Found {len(processes)} processes for user {request.user}")
            
            return Response({
                'results': processes,
                'count': len(processes)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error obteniendo procesos: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _format_property_request(self, request_obj):
        """Formatea un PropertyInterestRequest para la vista del inquilino - SINCRONIZACIÓN FIX."""
        # LEER ESTADO REAL DEL WORKFLOW DESDE LA BASE DE DATOS
        current_stage = getattr(request_obj, 'workflow_stage', 1)
        status_key = getattr(request_obj, 'workflow_status', 'visit_scheduled')
        workflow_db_data = getattr(request_obj, 'workflow_data', {})
        
        print(f"🔍 TENANT VIEW - PropertyRequest {request_obj.id}: Stage={current_stage}, Status={status_key}")
        
        # Usar datos del workflow desde la base de datos o valores por defecto
        workflow_data = workflow_db_data if workflow_db_data else {
            'visit_scheduled': {
                'date': 'Por definir',
                'time': 'Por definir',
                'notes': 'Pendiente coordinación VeriHome',
                'completed': False
            } if current_stage == 1 else None,
            'documents_requested': {
                'requested_at': request_obj.created_at.isoformat(),
                'documents_list': [
                    'Cédula de Ciudadanía',
                    'Comprobante de Ingresos (3 meses)',
                    'Referencias Laborales',
                    'Referencias Comerciales',
                    'Autorizaciones de Centrales de Riesgo'
                ],
                'uploaded_documents': []
            } if current_stage >= 2 else None,
            'contract_data': {
                'generated_at': None,
                'signed_by_tenant': False,
                'signed_by_landlord': False
            } if current_stage >= 3 else None
        }
        
        return {
            'id': str(request_obj.id),
            'match_code': f"REQ-{str(request_obj.id)[:8].upper()}",
            'current_stage': current_stage,
            'status': status_key,
            'property': {
                'id': str(request_obj.property.id),
                'title': request_obj.property.title,
                'address': f"{request_obj.property.address}, {request_obj.property.city}",
                'rent_price': float(request_obj.property.rent_price)
            },
            'landlord': {
                'id': str(request_obj.assignee.id),
                'full_name': request_obj.assignee.get_full_name(),
                'email': request_obj.assignee.email
            },
            'workflow_data': workflow_data,
            'created_at': request_obj.created_at.isoformat(),
            'updated_at': request_obj.updated_at.isoformat()
        }
    
    def _format_match_request(self, match_obj):
        """Formatea un MatchRequest para la vista del inquilino."""
        # Similar al anterior pero para MatchRequest
        current_stage = 1  # Etapa 1: Visita por defecto
        status_key = 'visit_scheduled'
        
        workflow_data = {
            'visit_scheduled': {
                'date': '2025-08-15',  # Datos de ejemplo, se puede mejorar
                'time': '14:00',
                'notes': 'Visita coordinada por VeriHome',
                'completed': False
            }
        }
        
        return {
            'id': str(match_obj.id),
            'match_code': getattr(match_obj, 'match_code', f"MAT-{str(match_obj.id)[:8].upper()}"),
            'current_stage': current_stage,
            'status': status_key,
            'property': {
                'id': str(match_obj.property.id),
                'title': match_obj.property.title,
                'address': f"{match_obj.property.address}, {match_obj.property.city}",
                'rent_price': float(match_obj.property.rent_price)
            },
            'landlord': {
                'id': str(match_obj.landlord.id),
                'full_name': match_obj.landlord.get_full_name(),
                'email': match_obj.landlord.email
            },
            'workflow_data': workflow_data,
            'created_at': match_obj.created_at.isoformat(),
            'updated_at': match_obj.updated_at.isoformat()
        }


class MatchedCandidatesAPIView(APIView):
    """Vista para obtener candidatos aprobados en el módulo de contratos."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene todos los matches aprobados para el arrendador actual."""
        try:
            from matching.models import MatchRequest
            from requests.models import PropertyInterestRequest
            
            # Solo arrendadores pueden ver esta vista
            if request.user.user_type != 'landlord':
                return Response(
                    {'error': 'Solo arrendadores pueden acceder a esta vista'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Obtener matches aceptados - buscar en ambos modelos
            matches = []
            
            # Primero intentar MatchRequest
            try:
                match_requests = MatchRequest.objects.filter(
                    landlord=request.user,
                    status='accepted'
                ).select_related('tenant', 'property', 'landlord').order_by('-created_at')
                matches.extend(match_requests)
            except:
                pass
            
            # Luego buscar en PropertyInterestRequest 
            # CRITICAL FIX: Incluir tanto 'accepted' como 'completed' status
            try:
                property_requests = PropertyInterestRequest.objects.filter(
                    assignee=request.user,
                    status__in=['accepted', 'completed', 'in_progress']  # Incluir todos los estados relevantes
                ).select_related('requester', 'property', 'assignee').order_by('-created_at')
                matches.extend(property_requests)
                print(f"🔍 Found {len(property_requests)} PropertyInterestRequest matches for user {request.user}")
            except Exception as e:
                print(f"❌ Error fetching PropertyInterestRequest: {e}")
            
            print(f"🔍 Total matches found: {len(matches)}")
            
            # Serializar los datos
            candidates_data = []
            for match in matches:
                # CRITICAL FIX: Leer estado real del workflow desde la base de datos
                # No hardcodear valores por defecto
                if isinstance(match, PropertyInterestRequest):
                    # Usar campos de workflow reales de la base de datos
                    workflow_stage = getattr(match, 'workflow_stage', 1)
                    workflow_status = getattr(match, 'workflow_status', 'visit_scheduled')
                    workflow_data = getattr(match, 'workflow_data', {})
                    print(f"📊 PropertyInterestRequest {match.id}: Stage={workflow_stage}, Status={workflow_status}")
                else:
                    # MatchRequest - usar valores por defecto o lógica existente
                    workflow_stage = 1
                    workflow_data = {}
                    workflow_status = 'visit_scheduled'
                
                # Determinar si es MatchRequest o PropertyInterestRequest
                is_match_request = hasattr(match, 'match_code')
                
                if is_match_request:
                    # Datos de MatchRequest
                    tenant = match.tenant
                    match_code = match.match_code
                    tenant_message = getattr(match, 'tenant_message', '')
                    preferred_move_in_date = getattr(match, 'preferred_move_in_date', None)
                    lease_duration_months = getattr(match, 'lease_duration_months', 12)
                    monthly_income = getattr(match, 'monthly_income', None)
                    employment_type = getattr(match, 'employment_type', '')
                else:
                    # Datos de PropertyInterestRequest
                    tenant = match.requester
                    match_code = f"REQ-{str(match.id)[:8]}"
                    tenant_message = getattr(match, 'description', '')
                    preferred_move_in_date = getattr(match, 'preferred_move_in_date', None)
                    lease_duration_months = getattr(match, 'lease_duration_months', 12)
                    monthly_income = getattr(match, 'monthly_income', None)
                    employment_type = getattr(match, 'employment_type', '')
                
                # Buscar si existe un contrato para este match
                contract_info = None
                try:
                    # Buscar contrato existente
                    existing_contract = Contract.objects.filter(
                        property=match.property,
                        secondary_party=tenant,  # tenant es secondary_party
                        primary_party=request.user  # landlord es primary_party
                    ).order_by('-created_at').first()
                    
                    if existing_contract:
                        # Obtener estado de autenticación biométrica
                        biometric_state = 'none'
                        if hasattr(existing_contract, 'biometric_authentication_state'):
                            biometric_state = existing_contract.biometric_authentication_state
                        elif hasattr(existing_contract, 'workflow_state'):
                            # Mapear workflow_state a biometric_state
                            if existing_contract.workflow_state == 'landlord_authentication':
                                biometric_state = 'pending_landlord_auth'
                            elif existing_contract.workflow_state == 'tenant_authentication':
                                biometric_state = 'pending_tenant_auth'
                            elif existing_contract.workflow_state == 'completed':
                                biometric_state = 'fully_authenticated'
                        
                        contract_info = {
                            'contract_id': str(existing_contract.id),
                            'status': existing_contract.status,
                            'biometric_state': biometric_state,
                            'created_at': existing_contract.created_at.isoformat(),
                            'move_in_date': preferred_move_in_date.isoformat() if preferred_move_in_date else None,
                            'landlord_auth_completed': getattr(existing_contract, 'landlord_auth_completed', False),
                            'tenant_auth_completed': getattr(existing_contract, 'tenant_auth_completed', False),
                            'keys_delivered': getattr(existing_contract, 'keys_delivered', False),
                            'execution_started': bool(getattr(existing_contract, 'execution_started_at', None))
                        }
                        
                        # Si existe contrato, actualizar workflow_data
                        if 'contract_created' not in workflow_data:
                            workflow_data['contract_created'] = contract_info
                        
                        print(f"📄 Contract found for match {match.id}: {existing_contract.id}, biometric_state: {biometric_state}")
                except Exception as e:
                    print(f"❌ Error checking contract: {e}")
                
                candidate_data = {
                    'id': str(match.id),
                    'match_code': match_code,
                    'status': match.status,
                    'tenant': {
                        'id': str(tenant.id),
                        'full_name': tenant.get_full_name(),
                        'email': tenant.email,
                        'phone': getattr(tenant, 'phone_number', None) or getattr(tenant, 'phone', None),
                        'city': getattr(tenant, 'city', None),
                        'country': getattr(tenant, 'country', None),
                        'is_verified': getattr(tenant, 'is_verified', False),
                    },
                    'property': {
                        'id': str(match.property.id),
                        'title': match.property.title,
                        'address': f"{match.property.address}, {match.property.city}",
                        'rent_price': float(match.property.rent_price),
                        'bedrooms': match.property.bedrooms,
                        'bathrooms': match.property.bathrooms,
                    },
                    'tenant_message': tenant_message,
                    'preferred_move_in_date': preferred_move_in_date.isoformat() if preferred_move_in_date else None,
                    'lease_duration_months': lease_duration_months,
                    'monthly_income': float(monthly_income) if monthly_income else None,
                    'employment_type': employment_type,
                    'created_at': match.created_at.isoformat(),
                    'workflow_stage': workflow_stage,
                    'workflow_status': workflow_status,  # AÑADIR STATUS PARA SINCRONIZACIÓN COMPLETA
                    'workflow_data': workflow_data,
                    'workflow_updated_at': match.workflow_updated_at.isoformat() if hasattr(match, 'workflow_updated_at') and match.workflow_updated_at else None
                }
                candidates_data.append(candidate_data)
            
            return Response({
                'results': candidates_data,
                'count': len(candidates_data)
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error obteniendo candidatos: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WorkflowActionAPIView(APIView):
    """Vista para ejecutar acciones del workflow de 3 etapas."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Ejecuta una acción del workflow de contratos con integración VeriHome."""
        try:
            from django.utils import timezone
            from requests.models import PropertyInterestRequest
            from messaging.models import Message
            from django.core.mail import send_mail
            from django.conf import settings
            import json
            
            match_request_id = request.data.get('match_request_id')
            action = request.data.get('action')
            
            if not match_request_id or not action:
                return Response(
                    {'error': 'match_request_id y action son requeridos'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Buscar primero en PropertyInterestRequest (principal)
            match_request = None
            try:
                match_request = PropertyInterestRequest.objects.get(
                    id=match_request_id,
                    property__landlord=request.user,
                    status__in=['accepted', 'completed', 'in_progress']
                )
                print(f"🎯 Found PropertyInterestRequest: {match_request.id}")
            except PropertyInterestRequest.DoesNotExist:
                # Fallback a MatchRequest si existe
                try:
                    from matching.models import MatchRequest
                    match_request = MatchRequest.objects.get(
                        id=match_request_id,
                        landlord=request.user,
                        status='accepted'
                    )
                    print(f"🎯 Found MatchRequest: {match_request.id}")
                except MatchRequest.DoesNotExist:
                    return Response(
                        {'error': 'Match request no encontrado o no tienes permisos'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            if not match_request:
                return Response(
                    {'error': 'Match request no encontrado o no tienes permisos'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Ejecutar acción basada en el tipo
            if action == 'visit_schedule':
                visit_data = request.data.get('visit_data', {})
                
                # OPCIÓN C: COORDINACIÓN PROFESIONAL CON EQUIPO VERIHOME
                tenant = getattr(match_request, 'requester', None) or getattr(match_request, 'tenant', None)
                property_obj = getattr(match_request, 'property', None)
                
                if not tenant or not property_obj:
                    return Response(
                        {'error': 'Datos de candidato o propiedad no encontrados'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # 1. CREAR HILO Y MENSAJE INTERNO PARA EL INQUILINO
                visit_message_content = f"""🏠 VISITA PROGRAMADA - COORDINADA POR VERIHOME

¡Excelente noticia! Tu solicitud para la propiedad {property_obj.title} ha avanzado a la siguiente fase.

📋 DETALLES DE LA VISITA:
• Fecha: {visit_data.get('date')}
• Hora: {visit_data.get('time')}
• Dirección: {property_obj.address}, {property_obj.city}
• Arrendador: {request.user.get_full_name()}

👥 COORDINACIÓN VERIHOME:
Un agente de VeriHome se pondrá en contacto contigo para:
• Confirmar tu disponibilidad
• Coordinar los detalles logísticos  
• Acompañarte durante la visita
• Brindarte asesoría profesional

{f'📝 NOTAS ADICIONALES: {visit_data.get("notes")}' if visit_data.get('notes') else ''}

📞 PRÓXIMOS PASOS:
1. Espera la llamada de nuestro agente (24-48 horas)
2. Confirma tu asistencia a la visita
3. Prepara tus preguntas sobre la propiedad

¿Tienes alguna pregunta? Responde a este mensaje y te contactaremos inmediatamente.

---
Coordinado profesionalmente por el equipo VeriHome"""
                
                # Crear o encontrar hilo de conversación existente
                from messaging.models import MessageThread
                thread, created = MessageThread.objects.get_or_create(
                    property=property_obj,
                    created_by=request.user,
                    thread_type='inquiry',
                    defaults={
                        'subject': f"🏠 Visita Programada - {property_obj.title}",
                        'status': 'active'
                    }
                )
                
                # Asegurar que ambos usuarios son participantes
                thread.participants.add(request.user, tenant)
                
                # Crear mensaje en el hilo
                Message.objects.create(
                    thread=thread,
                    sender=request.user,
                    recipient=tenant,
                    message_type='system',
                    content=visit_message_content
                )
                
                # 2. ENVIAR EMAIL AL INQUILINO
                email_subject = f"🏠 VeriHome: Visita Programada para {property_obj.title}"
                email_body = f"""
Estimado/a {tenant.get_full_name()},

¡Excelentes noticias! Tu solicitud de arrendamiento ha sido aprobada para continuar con el proceso.

DETALLES DE TU VISITA COORDINADA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 Propiedad: {property_obj.title}
📅 Fecha: {visit_data.get('date')}  
⏰ Hora: {visit_data.get('time')}
🏠 Dirección: {property_obj.address}, {property_obj.city}
👤 Arrendador: {request.user.get_full_name()}

COORDINACIÓN PROFESIONAL VERIHOME:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Un agente VeriHome te contactará en las próximas 24-48 horas
✅ Confirmaremos todos los detalles de la visita contigo  
✅ Te acompañaremos durante toda la visita
✅ Recibirás asesoría profesional gratuita
✅ Te ayudaremos con el proceso de documentación

{f'NOTAS ADICIONALES: {visit_data.get("notes")}' if visit_data.get('notes') else ''}

¿Tienes preguntas antes de la visita?
Responde a este email o ingresa a tu cuenta VeriHome.

¡Estamos emocionados de ayudarte a encontrar tu nuevo hogar!

Cordialmente,
El Equipo VeriHome
www.verihome.com | soporte@verihome.com
                """
                
                try:
                    send_mail(
                        subject=email_subject,
                        message=email_body,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[tenant.email],
                        fail_silently=False,
                    )
                    print(f"✅ Email de visita enviado a {tenant.email}")
                except Exception as e:
                    print(f"❌ Error enviando email: {str(e)}")
                
                # 3. CREAR NOTIFICACIÓN INTERNA PARA EL EQUIPO VERIHOME
                # (Esto se puede expandir para crear tickets internos)
                verihome_notification = f"""
🎯 NUEVA COORDINACIÓN DE VISITA REQUERIDA

📋 DETALLES:
• Arrendador: {request.user.get_full_name()} ({request.user.email})
• Inquilino: {tenant.get_full_name()} ({tenant.email})  
• Propiedad: {property_obj.title}
• Dirección: {property_obj.address}, {property_obj.city}
• Fecha Programada: {visit_data.get('date')} a las {visit_data.get('time')}

📞 TAREAS DE COORDINACIÓN:
1. Contactar al inquilino en 24-48 horas
2. Confirmar disponibilidad y detalles logísticos
3. Asignar agente para acompañamiento
4. Preparar documentación de apoyo
5. Coordinar seguimiento post-visita

{f'NOTAS DEL ARRENDADOR: {visit_data.get("notes")}' if visit_data.get('notes') else ''}
                """
                
                # Log de la actividad
                from users.models import UserActivityLog
                UserActivityLog.objects.create(
                    user=request.user,
                    activity_type='verihome_visit_coordination',
                    description=f'Visita coordinada por VeriHome para {tenant.get_full_name()}',
                    metadata={
                        'match_id': str(match_request.id),
                        'visit_date': visit_data.get('date'),
                        'visit_time': visit_data.get('time'),
                        'property_id': str(property_obj.id),
                        'tenant_email': tenant.email,
                        'coordination_type': 'verihome_professional',
                        'verihome_notification': verihome_notification
                    },
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
                )
                
                # Actualizar estado del match request - SINCRONIZACIÓN FIX
                match_request.workflow_stage = 1
                match_request.workflow_status = 'visit_scheduled'
                match_request.workflow_data.update({
                    'visit_scheduled': {
                        'date': visit_data.get('date'),
                        'time': visit_data.get('time'),
                        'notes': visit_data.get('notes', ''),
                        'completed': False,
                        'coordination_type': 'verihome_professional'
                    }
                })
                match_request.save()
                print(f"✅ PropertyInterestRequest {match_request.id} updated - Stage: {match_request.workflow_stage}, Status: {match_request.workflow_status}")
                
                result_message = "✅ Visita programada y coordinación VeriHome activada. El inquilino será contactado en 24-48 horas."
                updated_candidate_data = {
                    'workflow_stage': 1,
                    'workflow_status': 'visit_scheduled',
                    'status': 'visit_scheduled',
                    'last_action': 'visit_scheduled_verihome_coordination'
                }
                
            elif action == 'visit_completed':
                # Marcar visita como completada y avanzar a etapa 2 - SINCRONIZACIÓN FIX
                tenant = getattr(match_request, 'requester', None) or getattr(match_request, 'tenant', None)
                
                # Actualizar estado del match request - CRÍTICO PARA SINCRONIZACIÓN
                match_request.workflow_stage = 2
                match_request.workflow_status = 'documents_pending'
                if 'visit_scheduled' not in match_request.workflow_data:
                    match_request.workflow_data['visit_scheduled'] = {}
                match_request.workflow_data['visit_scheduled']['completed'] = True
                match_request.workflow_data['visit_scheduled']['completed_at'] = timezone.now().isoformat()
                match_request.save()
                print(f"🚀 VISIT COMPLETED - MatchRequest {match_request.id} updated - Stage: {match_request.workflow_stage}, Status: {match_request.workflow_status}")
                
                # 🔄 SINCRONIZACIÓN CRÍTICA: Actualizar PropertyInterestRequest correspondiente
                try:
                    from requests.models import PropertyInterestRequest
                    property_request = PropertyInterestRequest.objects.filter(
                        requester=tenant,
                        property=match_request.property
                    ).first()
                    
                    if property_request:
                        property_request.workflow_stage = 2
                        property_request.workflow_status = 'documents_pending'
                        property_request.workflow_data = match_request.workflow_data
                        property_request.save()
                        print(f"✅ SYNC SUCCESS - PropertyInterestRequest {property_request.id} synced to stage 2")
                    else:
                        print(f"⚠️ SYNC WARNING - No PropertyInterestRequest found for tenant {tenant.id} and property {match_request.property.id}")
                except Exception as sync_error:
                    print(f"❌ SYNC ERROR: {sync_error}")
                
                from users.models import UserActivityLog
                UserActivityLog.objects.create(
                    user=request.user,
                    activity_type='workflow_visit_completed',
                    description=f'Visita completada para candidato {tenant.get_full_name() if tenant else "Unknown"}',
                    metadata={'match_id': str(match_request.id)},
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
                )
                
                result_message = "✅ Visita completada - Candidato avanzado a etapa 2 (Documentos)"
                
            elif action == 'documents_request':
                # Solicitar documentos al candidato - SINCRONIZACIÓN FIX
                tenant = getattr(match_request, 'requester', None) or getattr(match_request, 'tenant', None)
                
                # Actualizar estado del match request - SINCRONIZACIÓN
                match_request.workflow_stage = 2
                match_request.workflow_status = 'documents_pending'
                match_request.workflow_data.update({
                    'documents_requested': {
                        'requested_at': timezone.now().isoformat(),
                        'documents_list': [
                            'Cédula de Ciudadanía (frente y atrás)',
                            'Certificado laboral',
                            'Cartas de recomendación'
                        ]
                    }
                })
                match_request.save()
                print(f"📄 DOCUMENTS REQUESTED - MatchRequest {match_request.id} updated - Stage: {match_request.workflow_stage}, Status: {match_request.workflow_status}")
                
                # 🔄 SINCRONIZACIÓN CRÍTICA: Actualizar PropertyInterestRequest correspondiente
                try:
                    from requests.models import PropertyInterestRequest
                    property_request = PropertyInterestRequest.objects.filter(
                        requester=tenant,
                        property=match_request.property
                    ).first()
                    
                    if property_request:
                        property_request.workflow_stage = 2
                        property_request.workflow_status = 'documents_pending'
                        property_request.workflow_data = match_request.workflow_data
                        property_request.save()
                        print(f"✅ SYNC SUCCESS - PropertyInterestRequest {property_request.id} synced to stage 2")
                    else:
                        print(f"⚠️ SYNC WARNING - No PropertyInterestRequest found for tenant {tenant.id} and property {match_request.property.id}")
                except Exception as sync_error:
                    print(f"❌ SYNC ERROR: {sync_error}")
                
                from users.models import UserActivityLog
                UserActivityLog.objects.create(
                    user=request.user,
                    activity_type='workflow_documents_request',
                    description=f'Documentos solicitados a candidato {tenant.get_full_name() if tenant else "Unknown"}',
                    metadata={'match_id': str(match_request.id)},
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
                )
                
                result_message = "✅ Solicitud de documentos enviada - Candidato en etapa 2"
                
            elif action == 'documents_approved':
                # Aprobar documentos y avanzar a etapa 3 - SINCRONIZACIÓN FIX
                documents_data = request.data.get('documents_data', {})
                tenant = getattr(match_request, 'requester', None) or getattr(match_request, 'tenant', None)
                
                # Actualizar estado del match request - AVANZAR A ETAPA 3
                match_request.workflow_stage = 3
                match_request.workflow_status = 'contract_ready'
                match_request.workflow_data.update({
                    'documents_approved': {
                        'approved_at': timezone.now().isoformat(),
                        'notes': documents_data.get('notes', ''),
                        'approved_by': request.user.get_full_name()
                    }
                })
                match_request.save()
                print(f"✅ DOCUMENTS APPROVED - PropertyInterestRequest {match_request.id} updated - Stage: {match_request.workflow_stage}, Status: {match_request.workflow_status}")
                
                # 🔒 CRITICAL BUSINESS LOGIC: Marcar propiedad como no disponible
                # Cuando todos los documentos sean aprobados, la propiedad debe salir del mercado
                property_obj = getattr(match_request, 'property', None)
                if property_obj:
                    property_obj.is_available_for_workflow = False
                    property_obj.save()
                    print(f"🔒 Property {property_obj.id} marked as unavailable for workflow - removed from public listings")
                
                # 🎯 NEW: BRIDGE AUTOMÁTICO - Crear contrato automáticamente 
                # Cuando se aprueban documentos → Crear contrato listo para firma
                try:
                    from contracts.models import Contract
                    from datetime import datetime, timedelta
                    from decimal import Decimal
                    import uuid
                    
                    # Verificar que no exista ya un contrato para este match
                    existing_contract = Contract.objects.filter(
                        property=property_obj,
                        tenant=tenant,
                        landlord=request.user,
                        status__in=['draft', 'pending_review', 'pending_signature', 'active']
                    ).first()
                    
                    if not existing_contract:
                        # Datos base del contrato
                        start_date = datetime.now().date()
                        duration_months = 12  # Default 12 meses
                        end_date = start_date + timedelta(days=30 * duration_months)
                        
                        # Crear contrato automáticamente
                        auto_contract = Contract.objects.create(
                            # Partes del contrato
                            landlord=request.user,
                            tenant=tenant,
                            property=property_obj,
                            
                            # Fechas
                            start_date=start_date,
                            end_date=end_date,
                            duration_months=duration_months,
                            
                            # Financiero - usar datos de la propiedad o defaults
                            monthly_rent=getattr(property_obj, 'rent_price', None) or Decimal('2500000'),
                            security_deposit=getattr(property_obj, 'rent_price', None) or Decimal('2500000'),  # 1 mes de canon
                            
                            # Estado inicial
                            status='draft',  # Borrador listo para edición
                            contract_type='rental',
                            
                            # Metadatos
                            created_via='workflow_automation',
                            workflow_match_id=str(match_request.id),
                            
                            # Cláusulas especiales generadas automáticamente
                            special_clauses=self._generate_default_clauses(property_obj, tenant, request.user),
                            
                            # IDs
                            id=uuid.uuid4()
                        )
                        
                        # Actualizar el match request con referencia al contrato
                        match_request.workflow_data.update({
                            'auto_contract_created': {
                                'contract_id': str(auto_contract.id),
                                'created_at': timezone.now().isoformat(),
                                'created_by': request.user.get_full_name()
                            }
                        })
                        match_request.save()
                        
                        print(f"🎯 AUTO-CONTRACT CREATED: {auto_contract.id} for PropertyInterestRequest {match_request.id}")
                        
                        # Actualizar respuesta con datos del contrato
                        result_message = f"✅ Documentos aprobados - Contrato #{auto_contract.id.hex[:8]} creado automáticamente"
                        
                    else:
                        print(f"ℹ️  Contract already exists: {existing_contract.id}")
                        result_message = f"✅ Documentos aprobados - Contrato existente: #{existing_contract.id.hex[:8]}"
                        
                except Exception as contract_error:
                    print(f"❌ Error creating auto-contract: {contract_error}")
                    # No fallar el proceso principal por error en creación de contrato
                    result_message = "✅ Documentos aprobados - Error creando contrato automático (se puede crear manualmente)"
                
                from users.models import UserActivityLog
                UserActivityLog.objects.create(
                    user=request.user,
                    activity_type='workflow_documents_approved',
                    description=f'Documentos aprobados para candidato {tenant.get_full_name() if tenant else "Unknown"}',
                    metadata={
                        'match_id': str(match_request.id),
                        'notes': documents_data.get('notes')
                    },
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
                )
                
                result_message = "✅ Documentos aprobados - Candidato avanzado a etapa 3 (Contrato)"
                
            elif action == 'contract_create':
                # CREAR CONTRATO REAL EN EL MODELO CONTRACT
                tenant = getattr(match_request, 'requester', None) or getattr(match_request, 'tenant', None)
                property_obj = getattr(match_request, 'property', None)
                
                if not tenant:
                    return JsonResponse({
                        'success': False,
                        'message': 'No se pudo identificar al arrendatario para crear el contrato'
                    }, status=400)
                
                if not property_obj:
                    return JsonResponse({
                        'success': False,
                        'message': 'No se pudo identificar la propiedad para crear el contrato'
                    }, status=400)
                
                try:
                    # Importar el modelo Contract y timedelta localmente para asegurar disponibilidad
                    from .models import Contract
                    from datetime import timedelta
                    
                    # Crear el contrato real en la base de datos
                    real_contract = Contract.objects.create(
                        # Partes del contrato
                        primary_party=request.user,  # Arrendador (quien ejecuta la acción)
                        secondary_party=tenant,      # Arrendatario
                        
                        # Información básica
                        title=f"Contrato de Arrendamiento - {property_obj.title}",
                        description=f"Contrato generado automáticamente para la propiedad {property_obj.title}",
                        contract_type='rental_urban',  # Por defecto para propiedades urbanas
                        content=f"CONTRATO DE ARRENDAMIENTO\n\nArrendador: {request.user.get_full_name()}\nArrendatario: {tenant.get_full_name()}\nPropiedad: {property_obj.title}\n\n[Este es un contrato generado automáticamente. Será completado durante la etapa de revisión.]",
                        
                        # Fechas - usar las del match request si están disponibles
                        start_date=getattr(match_request, 'preferred_move_in_date', None) or (timezone.now().date() + timedelta(days=30)),
                        end_date=(getattr(match_request, 'preferred_move_in_date', None) or (timezone.now().date() + timedelta(days=30))) + timedelta(days=365),
                        
                        # Información financiera básica de la propiedad
                        monthly_rent=property_obj.rent_price if hasattr(property_obj, 'rent_price') else None,
                        security_deposit=property_obj.rent_price if hasattr(property_obj, 'rent_price') else None,
                        
                        # Propiedad relacionada
                        property=property_obj,
                        
                        # Estado inicial
                        status='draft',  # Borrador listo para edición
                        
                        # Campos de workflow - almacenar en variables_data
                        variables_data={
                            'workflow_match_id': str(match_request.id),
                            'created_via': 'workflow_automation',
                            'auto_generated': True,
                            'property_address': getattr(property_obj, 'address', ''),
                            'property_id': str(property_obj.id) if property_obj else None
                        }
                    )
                    
                    # 📄 MIGRACIÓN AUTOMÁTICA DE DOCUMENTOS
                    try:
                        from requests.models import TenantDocument
                        
                        # Buscar PropertyInterestRequest asociado
                        property_request = PropertyInterestRequest.objects.filter(
                            requester=tenant,
                            property=property_obj
                        ).first()
                        
                        if property_request:
                            # Obtener todos los documentos aprobados del proceso
                            approved_documents = TenantDocument.objects.filter(
                                property_request=property_request,
                                status='approved'
                            )
                            
                            # Asociar documentos al contrato
                            if approved_documents.exists():
                                real_contract.tenant_documents.add(*approved_documents)
                                print(f"✅ DOCUMENTS MIGRATED: {approved_documents.count()} documentos asociados al contrato {real_contract.id}")
                            else:
                                print(f"⚠️ No approved documents found for migration to contract {real_contract.id}")
                        else:
                            print(f"⚠️ No PropertyInterestRequest found for document migration")
                            
                    except Exception as doc_migration_error:
                        print(f"❌ Error migrating documents to contract: {doc_migration_error}")
                        # No fallar el proceso por error en migración de documentos
                    
                    print(f"🎯 REAL CONTRACT CREATED: {real_contract.id} for PropertyInterestRequest {match_request.id}")
                    
                    # Actualizar el workflow del match request a etapa 4 (Contrato creado)
                    match_request.workflow_stage = 4
                    match_request.workflow_status = 'contract_created'
                    match_request.workflow_data.update({
                        'contract_created': {
                            'contract_id': str(real_contract.id),
                            'contract_number': real_contract.contract_number,
                            'created_at': timezone.now().isoformat(),
                            'created_by': request.user.get_full_name(),
                            'title': real_contract.title
                        }
                    })
                    
                    # Marcar el match como con contrato
                    if hasattr(match_request, 'has_contract'):
                        match_request.has_contract = True
                    if hasattr(match_request, 'contract_generated_at'):
                        match_request.contract_generated_at = timezone.now()
                    
                    match_request.save()
                    
                    # Registrar actividad
                    from users.models import UserActivityLog
                    UserActivityLog.objects.create(
                        user=request.user,
                        activity_type='workflow_contract_created',
                        description=f'Contrato {real_contract.contract_number} creado para candidato {tenant.get_full_name()}',
                        metadata={
                            'match_id': str(match_request.id),
                            'contract_id': str(real_contract.id),
                            'contract_number': real_contract.contract_number
                        },
                        ip_address=request.META.get('REMOTE_ADDR'),
                        user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
                    )
                    
                    result_message = f"✅ Contrato {real_contract.contract_number} creado exitosamente"
                    updated_candidate_data = {
                        'workflow_stage': 4,
                        'workflow_status': 'contract_created',
                        'contract_id': str(real_contract.id),
                        'contract_number': real_contract.contract_number,
                        'last_action': 'contract_created'
                    }
                    
                except Exception as e:
                    print(f"❌ Error creating real contract: {str(e)}")
                    return JsonResponse({
                        'success': False,
                        'message': f'Error al crear el contrato: {str(e)}'
                    }, status=500)
                
            elif action == 'contract_created':
                # SINCRONIZACIÓN: Contrato fue creado exitosamente desde LandlordContractForm
                contract_data = request.data.get('contract_data', {})
                contract_id = contract_data.get('contract_id')
                tenant = getattr(match_request, 'requester', None) or getattr(match_request, 'tenant', None)
                
                print(f"🎯 SINCRONIZACIÓN: Contrato {contract_id} creado para match {match_request.id}")
                
                # Actualizar el workflow del match request a etapa 4 (Contrato creado)
                match_request.workflow_stage = 4
                match_request.workflow_status = 'contract_created'
                match_request.workflow_data.update({
                    'contract_created': {
                        'contract_id': contract_id,
                        'created_at': contract_data.get('created_at'),
                        'created_by': request.user.get_full_name(),
                        'synchronized_at': timezone.now().isoformat()
                    }
                })
                match_request.save()
                
                print(f"✅ PropertyInterestRequest {match_request.id} updated - Stage: {match_request.workflow_stage}, Status: {match_request.workflow_status}")
                
                # Registrar actividad
                from users.models import UserActivityLog
                UserActivityLog.objects.create(
                    user=request.user,
                    activity_type='workflow_contract_created_sync',
                    description=f'Contrato {contract_id[:8]} sincronizado para candidato {tenant.get_full_name() if tenant else "Unknown"}',
                    metadata={
                        'match_id': str(match_request.id),
                        'contract_id': contract_id
                    },
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
                )
                
                result_message = f"✅ Contrato {contract_id[:8]} sincronizado exitosamente con el workflow"
                updated_candidate_data = {
                    'workflow_stage': 4,
                    'workflow_status': 'contract_created',
                    'contract_id': contract_id,
                    'last_action': 'contract_created_synchronized'
                }
                
            elif action == 'reject':
                # Rechazar candidato
                rejection_reason = request.data.get('rejection_reason', 'No especificado')
                tenant = getattr(match_request, 'requester', None) or getattr(match_request, 'tenant', None)
                
                # Cambiar el estado del match
                match_request.status = 'rejected'
                if hasattr(match_request, 'responded_at'):
                    match_request.responded_at = timezone.now()
                if hasattr(match_request, 'landlord_response'):
                    match_request.landlord_response = f"Rechazado: {rejection_reason}"
                match_request.save()
                
                from users.models import UserActivityLog
                UserActivityLog.objects.create(
                    user=request.user,
                    activity_type='workflow_candidate_rejected',
                    description=f'Candidato {tenant.get_full_name() if tenant else "Unknown"} rechazado',
                    metadata={
                        'match_id': str(match_request.id),
                        'rejection_reason': rejection_reason
                    },
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
                )
                
                result_message = "Candidato rechazado"
                
            else:
                return Response(
                    {'error': f'Acción no reconocida: {action}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return Response({
                'success': True,
                'message': result_message,
                'match_id': str(match_request.id),
                'updated_candidate': updated_candidate_data if action == 'visit_schedule' else {
                    'id': str(match_request.id),
                    'status': getattr(match_request, 'status', 'accepted'),
                    'workflow_stage': match_request.workflow_stage,  # USAR ESTADO REAL DE LA DB
                    'workflow_status': match_request.workflow_status,  # USAR ESTADO REAL DE LA DB
                    'workflow_updated_at': match_request.workflow_updated_at.isoformat() if hasattr(match_request, 'workflow_updated_at') and match_request.workflow_updated_at else None,
                }
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error ejecutando acción: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_default_clauses(self, property_obj, tenant, landlord):
        """Genera cláusulas especiales por defecto para el contrato automático."""
        clauses = []
        
        # Cláusulas base
        clauses.append("1) El inmueble se entrega en las condiciones actuales según inventario detallado.")
        
        # Cláusulas basadas en características de la propiedad
        if hasattr(property_obj, 'furnished') and property_obj.furnished:
            clauses.append("2) El inmueble se entrega completamente amoblado según inventario anexo.")
        else:
            clauses.append("2) El inmueble se entrega sin mobiliario.")
            
        if hasattr(property_obj, 'has_parking') and property_obj.has_parking:
            clauses.append("3) Se incluye un espacio de parqueadero asignado.")
        
        # Cláusulas estándar
        clauses.extend([
            "4) Los servicios públicos (agua, luz, gas, internet) corren por cuenta del arrendatario.",
            "5) No se permite el subarriendo total o parcial sin autorización previa escrita del arrendador.",
            "6) El arrendatario se compromete a mantener el inmueble en buen estado de conservación.",
            "7) Se prohíbe realizar modificaciones estructurales sin autorización del arrendador.",
            "8) El arrendador realizará inspecciones periódicas previa cita con el arrendatario.",
        ])
        
        # Cláusula de mascotas (si aplica)
        if hasattr(property_obj, 'pets_allowed') and property_obj.pets_allowed:
            clauses.append("9) Se permite tener mascotas pequeñas previa autorización y depósito adicional.")
        else:
            clauses.append("9) No se permite tener mascotas de ningún tipo en el inmueble.")
        
        # Cláusulas de terminación
        clauses.extend([
            "10) Para terminación anticipada del contrato, cualquier parte debe dar aviso con treinta (30) días de anticipación.",
            "11) El incumplimiento de estas cláusulas será causal de terminación inmediata del contrato.",
            "12) Las partes se someten a la jurisdicción de los tribunales colombianos."
        ])
        
        return " ".join(clauses)


class TenantContractReviewAPIView(APIView):
    """Vista para que los arrendatarios revisen y aprueben/soliciten cambios en borradores de contratos."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Procesa la revisión del arrendatario sobre un borrador de contrato."""
        try:
            from django.utils import timezone
            
            # Solo arrendatarios pueden usar esta vista
            if request.user.user_type not in ['tenant', 'candidate']:
                return Response(
                    {'error': 'Solo arrendatarios pueden revisar contratos'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            contract_id = request.data.get('contract_id')
            action = request.data.get('action')  # 'approve' or 'request_changes'
            comments = request.data.get('comments', '')
            
            if not contract_id or not action:
                return Response(
                    {'error': 'contract_id y action son requeridos'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if action not in ['approve', 'request_changes']:
                return Response(
                    {'error': 'action debe ser "approve" o "request_changes"'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if action == 'request_changes' and not comments.strip():
                return Response(
                    {'error': 'Los comentarios son requeridos cuando se solicitan cambios'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Buscar el contrato
            try:
                contract = Contract.objects.get(
                    id=contract_id,
                    secondary_party=request.user  # El arrendatario es secondary_party
                )
            except Contract.DoesNotExist:
                return Response(
                    {'error': 'Contrato no encontrado o no autorizado'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verificar que el contrato esté en estado de revisión
            if contract.status not in ['draft', 'pending_tenant_review']:
                return Response(
                    {'error': f'El contrato no puede ser revisado en su estado actual: {contract.status}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Procesar la acción
            if action == 'approve':
                # Arrendatario aprueba el borrador
                contract.tenant_review_status = 'approved'
                contract.tenant_reviewed_at = timezone.now()
                contract.tenant_review_comments = comments
                contract.status = 'ready_for_authentication'
                
                # Avanzar el workflow a etapa 4 (Autenticación)
                # Buscar el PropertyInterestRequest relacionado
                from requests.models import PropertyInterestRequest
                try:
                    property_request = PropertyInterestRequest.objects.filter(
                        requester=request.user,
                        property=contract.property,
                        assignee=contract.primary_party
                    ).first()
                    
                    if property_request:
                        property_request.workflow_stage = 4
                        property_request.workflow_status = 'biometric_authentication'
                        property_request.workflow_data['contract_approved'] = {
                            'approved_at': timezone.now().isoformat(),
                            'approved_by': request.user.get_full_name(),
                            'comments': comments,
                            'contract_id': str(contract.id)
                        }
                        property_request.save()
                        print(f"✅ PropertyInterestRequest {property_request.id} advanced to stage 4 (Authentication)")
                
                except Exception as e:
                    print(f"⚠️ Error updating PropertyInterestRequest: {e}")
                
                result_message = "✅ Borrador aprobado exitosamente. El proceso avanza a autenticación biométrica."
                
            elif action == 'request_changes':
                # Arrendatario solicita cambios
                contract.tenant_review_status = 'changes_requested'
                contract.tenant_reviewed_at = timezone.now()
                contract.tenant_review_comments = comments
                contract.status = 'tenant_changes_requested'
                
                result_message = "✏️ Solicitud de cambios enviada al arrendador."
                
                # Notificar al arrendador (opcional: enviar email)
                try:
                    from django.core.mail import send_mail
                    from django.conf import settings
                    
                    landlord = contract.primary_party
                    property_obj = contract.property
                    
                    email_subject = f"📝 VeriHome: Cambios solicitados en contrato - {property_obj.title}"
                    email_body = f"""
Estimado/a {landlord.get_full_name()},

El arrendatario {request.user.get_full_name()} ha revisado el borrador del contrato y solicita algunos cambios.

DETALLES DEL CONTRATO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Propiedad: {property_obj.title}
👤 Arrendatario: {request.user.get_full_name()}
📄 Contrato ID: {str(contract.id)[:8]}...

CAMBIOS SOLICITADOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{comments}

PRÓXIMOS PASOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Revisa los cambios solicitados
2. Edita el contrato según sea necesario
3. Envía la versión actualizada al arrendatario

Ingresa a tu panel de VeriHome para continuar con el proceso.

Cordialmente,
El Equipo VeriHome
www.verihome.com
                    """
                    
                    send_mail(
                        subject=email_subject,
                        message=email_body,
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[landlord.email],
                        fail_silently=True,
                    )
                    print(f"✅ Email de cambios solicitados enviado a {landlord.email}")
                    
                except Exception as e:
                    print(f"❌ Error enviando email: {str(e)}")
            
            # Guardar cambios
            contract.save()
            
            # Registrar actividad
            from users.models import UserActivityLog
            UserActivityLog.objects.create(
                user=request.user,
                activity_type=f'contract_review_{action}',
                description=f'Revisión de contrato: {action} para {contract.property.title}',
                metadata={
                    'contract_id': str(contract.id),
                    'action': action,
                    'comments': comments,
                    'landlord_id': str(contract.primary_party.id)
                },
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')[:255]
            )
            
            return Response({
                'success': True,
                'message': result_message,
                'contract_id': str(contract.id),
                'action': action,
                'new_status': contract.status,
                'review_status': contract.tenant_review_status
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error procesando revisión: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )