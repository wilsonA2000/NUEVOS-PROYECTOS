"""
API views para el sistema de códigos de entrevista.
"""

from rest_framework import status, viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import logging

from .models import InterviewCode, ContactRequest, InterviewSession
from .serializers import UserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


@method_decorator(csrf_exempt, name='dispatch')
class ValidateInterviewCodeView(APIView):
    """Vista para validar códigos de entrevista."""
    
    permission_classes = [permissions.AllowAny]  # Permitir acceso público para validación
    
    def post(self, request):
        interview_code = request.data.get('interview_code', '').strip().upper()
        
        if not interview_code:
            return Response({
                'is_valid': False,
                'message': 'Código de entrevista requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            code_obj = InterviewCode.objects.get(code=interview_code)
            
            if code_obj.is_valid():
                return Response({
                    'is_valid': True,
                    'message': 'Código válido',
                    'code_data': {
                        'code': code_obj.code,
                        'user_type': code_obj.user_type,
                        'email': code_obj.email,
                        'is_active': code_obj.is_active,
                        'valid_until': code_obj.valid_until.isoformat() if code_obj.valid_until else None,
                    }
                })
            else:
                # Incrementar intentos si el código existe pero no es válido
                code_obj.current_uses += 1
                code_obj.save()
                
                message = 'Código inválido'
                if not code_obj.is_active:
                    message = 'El código está inactivo'
                elif code_obj.is_used:
                    message = 'El código ya fue utilizado'
                elif timezone.now() > code_obj.valid_until:
                    message = 'El código ha expirado'
                elif code_obj.current_uses >= code_obj.max_uses:
                    message = 'El código ha alcanzado el máximo de usos'
                    
                return Response({
                    'is_valid': False,
                    'message': message
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except InterviewCode.DoesNotExist:
            return Response({
                'is_valid': False,
                'message': 'Código de entrevista no encontrado'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Error validating interview code {interview_code}: {str(e)}")
            return Response({
                'is_valid': False,
                'message': 'Error interno del servidor'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ContactRequestView(APIView):
    """Vista para crear solicitudes de contacto."""
    
    permission_classes = [permissions.AllowAny]  # Permitir acceso público
    
    def post(self, request):
        try:
            # Obtener datos del request
            data = request.data
            required_fields = ['full_name', 'email', 'phone', 'interested_as', 'message']
            
            # Validar campos requeridos
            for field in required_fields:
                if not data.get(field):
                    return Response({
                        'error': f'El campo {field} es requerido'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar si ya existe una solicitud con el mismo email
            existing_request = ContactRequest.objects.filter(
                email=data['email'],
                status__in=['pending', 'contacted', 'interviewed']
            ).first()
            
            if existing_request:
                return Response({
                    'error': 'Ya existe una solicitud activa con este email'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Crear la solicitud de contacto
            contact_request = ContactRequest.objects.create(
                full_name=data['full_name'],
                email=data['email'],
                phone=data['phone'],
                interested_as=data['interested_as'],
                message=data['message'],
                company_name=data.get('company_name', ''),
                experience_years=data.get('experience_years', 0),
                ip_address=self.get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                referrer=data.get('referrer', '')
            )
            
            return Response({
                'success': True,
                'message': 'Solicitud de contacto enviada exitosamente',
                'request_id': str(contact_request.id)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating contact request: {str(e)}")
            return Response({
                'error': 'Error interno del servidor'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_client_ip(self, request):
        """Obtiene la IP del cliente."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RegisterWithCodeView(APIView):
    """Vista para registro con código de entrevista."""
    
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        try:
            data = request.data
            interview_code = data.get('interview_code', '').strip().upper()
            
            if not interview_code:
                return Response({
                    'error': 'Código de entrevista requerido'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar el código de entrevista
            try:
                code_obj = InterviewCode.objects.get(code=interview_code)
                
                if not code_obj.is_valid():
                    code_obj.current_uses += 1
                    code_obj.save()
                    
                    message = 'Código inválido'
                    if not code_obj.is_active:
                        message = 'El código está inactivo'
                    elif code_obj.is_used:
                        message = 'El código ya fue utilizado'
                    elif timezone.now() > code_obj.valid_until:
                        message = 'El código ha expirado'
                    elif code_obj.current_uses >= code_obj.max_uses:
                        message = 'El código ha alcanzado el máximo de usos'
                        
                    return Response({
                        'error': f'Código de entrevista inválido: {message}'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
            except InterviewCode.DoesNotExist:
                return Response({
                    'error': 'Código de entrevista no encontrado'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Verificar que el email coincida (si el código tiene email asociado)
            if code_obj.email and data.get('email') != code_obj.email:
                return Response({
                    'error': 'El email no coincide con el código de entrevista'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar que el tipo de usuario coincida
            if data.get('user_type') != code_obj.user_type:
                return Response({
                    'error': 'El tipo de usuario no coincide con el código de entrevista'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Crear el usuario
            with transaction.atomic():
                user_data = {
                    'email': data['email'],
                    'password': data['password'],
                    'first_name': data['first_name'],
                    'last_name': data['last_name'],
                    'user_type': data['user_type'],
                    'phone_number': data.get('phone_number', ''),
                    'city': data.get('city', ''),
                    'address': data.get('address', ''),
                    'is_verified': True,  # Pre-verificado por el código de entrevista
                }
                
                # Crear el usuario
                user = User.objects.create_user(**user_data)
                
                # Marcar el código como usado
                code_obj.use_code(user)
                
                # Serializar respuesta
                serializer = UserSerializer(user)
                
                return Response({
                    'success': True,
                    'message': 'Usuario registrado exitosamente',
                    'user': serializer.data
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            logger.error(f"Error in register with code: {str(e)}")
            return Response({
                'error': 'Error interno del servidor'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class InterviewCodeViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de códigos de entrevista (solo admin)."""
    
    queryset = InterviewCode.objects.all()
    permission_classes = [permissions.IsAdminUser]
    
    def get_serializer_class(self):
        # Aquí podrías crear un serializer específico para InterviewCode
        from rest_framework import serializers
        
        class InterviewCodeSerializer(serializers.ModelSerializer):
            class Meta:
                model = InterviewCode
                fields = '__all__'
                read_only_fields = ('interview_code', 'created_at', 'updated_at', 'used_at')
        
        return InterviewCodeSerializer
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Aprobar un código de entrevista."""
        code = self.get_object()
        
        user_type = request.data.get('user_type')
        rating = request.data.get('rating')
        notes = request.data.get('notes', '')
        
        if not user_type or not rating:
            return Response({
                'error': 'user_type y rating son requeridos'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            rating = int(rating)
            if rating < 1 or rating > 10:
                raise ValueError("Rating debe estar entre 1 y 10")
        except ValueError:
            return Response({
                'error': 'Rating debe ser un número entre 1 y 10'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        code.approve(request.user, user_type, rating, notes)
        
        return Response({
            'message': 'Código aprobado exitosamente',
            'interview_code': code.interview_code
        })
    
    @action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revocar un código de entrevista."""
        code = self.get_object()
        code.revoke()
        
        return Response({
            'message': 'Código revocado exitosamente'
        })


class ContactRequestViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de solicitudes de contacto (solo admin)."""
    
    queryset = ContactRequest.objects.all()
    permission_classes = [permissions.IsAdminUser]
    
    def get_serializer_class(self):
        from rest_framework import serializers
        
        class ContactRequestSerializer(serializers.ModelSerializer):
            class Meta:
                model = ContactRequest
                fields = '__all__'
                read_only_fields = ('created_at', 'contacted_at', 'interviewed_at')
        
        return ContactRequestSerializer
    
    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Asignar solicitud a un usuario."""
        contact_request = self.get_object()
        contact_request.assign_to_user(request.user)
        
        return Response({
            'message': 'Solicitud asignada exitosamente'
        })
    
    @action(detail=True, methods=['post'])
    def mark_contacted(self, request, pk=None):
        """Marcar como contactado."""
        contact_request = self.get_object()
        contact_request.mark_as_contacted()
        
        return Response({
            'message': 'Marcado como contactado'
        })
    
    @action(detail=True, methods=['post'])
    def create_interview_code(self, request, pk=None):
        """Crear código de entrevista para la solicitud."""
        contact_request = self.get_object()
        
        if contact_request.interview_code:
            return Response({
                'error': 'Ya existe un código de entrevista para esta solicitud'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        interview_code = contact_request.create_interview_code(request.user)
        
        return Response({
            'message': 'Código de entrevista creado exitosamente',
            'interview_code': interview_code.interview_code
        })
    
    @action(detail=True, methods=['post'])
    def approve_and_generate(self, request, pk=None):
        """Aprobar solicitud y generar código."""
        contact_request = self.get_object()
        
        user_type = request.data.get('user_type')
        rating = request.data.get('rating')
        notes = request.data.get('notes', '')
        
        if not user_type or not rating:
            return Response({
                'error': 'user_type y rating son requeridos'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            rating = int(rating)
            if rating < 1 or rating > 10:
                raise ValueError("Rating debe estar entre 1 y 10")
        except ValueError:
            return Response({
                'error': 'Rating debe ser un número entre 1 y 10'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        interview_code = contact_request.approve_and_generate_code(
            request.user, user_type, rating, notes
        )
        
        return Response({
            'message': 'Solicitud aprobada y código generado exitosamente',
            'interview_code': interview_code.interview_code
        })