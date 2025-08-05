"""
Vistas de API REST para la aplicación de usuarios de VeriHome.
"""

from rest_framework import viewsets, generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model, authenticate, login, logout
from django.db import transaction
from django.core.exceptions import ObjectDoesNotExist
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
import json
from .models import LandlordProfile, TenantProfile, ServiceProviderProfile, UserResume, UserSettings, InterviewCode
from .serializers import UserSerializer, UserRegistrationSerializer, UserProfileSerializer, UserResumeSerializer, UserSettingsSerializer, InterviewCodeVerificationSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from allauth.account.models import EmailAddress
from allauth.account.utils import send_email_confirmation
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

# ViewSets básicos
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para visualizar usuarios."""
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

class LandlordProfileViewSet(viewsets.ModelViewSet):
    """ViewSet para perfiles de propietarios."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        from .models import LandlordProfile
        return LandlordProfile.objects.all()
    
    def get_serializer_class(self):
        from .serializers import LandlordProfileSerializer
        return LandlordProfileSerializer

class TenantProfileViewSet(viewsets.ModelViewSet):
    """ViewSet para perfiles de inquilinos."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        from .models import TenantProfile
        return TenantProfile.objects.all()
    
    def get_serializer_class(self):
        from .serializers import TenantProfileSerializer
        return TenantProfileSerializer

class ServiceProviderProfileViewSet(viewsets.ModelViewSet):
    """ViewSet para perfiles de proveedores de servicios."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        from .models import ServiceProviderProfile
        return ServiceProviderProfile.objects.all()
    
    def get_serializer_class(self):
        from .serializers import ServiceProviderProfileSerializer
        return ServiceProviderProfileSerializer

class PortfolioItemViewSet(viewsets.ModelViewSet):
    """ViewSet para elementos de portafolio de proveedores de servicios."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        from .models import PortfolioItem
        return PortfolioItem.objects.all()
    
    def get_serializer_class(self):
        from .serializers import PortfolioItemSerializer
        return PortfolioItemSerializer

# Vistas de API personalizadas
class UserProfileView(generics.RetrieveUpdateAPIView):
    """Vista para ver y actualizar perfil de usuario."""
    permission_classes = [permissions.AllowAny]  # Permitir acceso sin autenticación
    serializer_class = UserSerializer
    
    def get_serializer_class(self):
        """Usar serializer simple que funcione para todos los métodos."""
        return UserSerializer

    def get_object(self):
        # Si no hay usuario autenticado, devolver None
        if not self.request.user.is_authenticated:
            return None
        return self.request.user
    
    def get(self, request, *args, **kwargs):
        # Si no hay usuario autenticado, devolver 401
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication credentials were not provided.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return super().get(request, *args, **kwargs)
    
    def put(self, request, *args, **kwargs):
        # Para actualizar, sí requiere autenticación
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication credentials were not provided.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return super().put(request, *args, **kwargs)
    
    def patch(self, request, *args, **kwargs):
        # Para actualizar, sí requiere autenticación
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication credentials were not provided.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return super().patch(request, *args, **kwargs)

class UserRegistrationAPIView(generics.CreateAPIView):
    """Vista para registro de usuarios."""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [permissions.AllowAny]

class LogoutAPIView(APIView):
    """Vista para logout de usuarios."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # En JWT, el logout se maneja del lado del cliente
        # Aquí podríamos implementar blacklisting de tokens si es necesario
        return Response({'message': 'Logout exitoso'})

class ChangePasswordAPIView(APIView):
    """Vista para cambiar contraseña."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not user.check_password(old_password):
            return Response(
                {'error': 'Contraseña actual incorrecta'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Contraseña actualizada correctamente'})

class RequestVerificationAPIView(APIView):
    """Vista para solicitar verificación."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        if user.is_verified:
            return Response(
                {'error': 'Usuario ya verificado'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Implementar lógica de verificación
        return Response({'message': 'Solicitud de verificación enviada'})

class UploadVerificationDocumentsAPIView(APIView):
    """Vista para subir documentos de verificación."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Implementar lógica de subida de documentos
        return Response({'message': 'Documentos subidos correctamente'})

class VerificationStatusAPIView(APIView):
    """Vista para consultar estado de verificación."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'is_verified': user.is_verified,
            'verification_status': user.verification_status
        })

class UserSearchAPIView(generics.ListAPIView):
    """Vista para búsqueda de usuarios."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        query = self.getattr(request, "query_params", request.GET).get('q', '')
        return User.objects.filter(
            email__icontains=query
        ) | User.objects.filter(
            first_name__icontains=query
        ) | User.objects.filter(
            last_name__icontains=query
        )

class ServiceProviderSearchAPIView(generics.ListAPIView):
    """Vista para búsqueda de proveedores de servicios."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        query = self.getattr(request, "query_params", request.GET).get('q', '')
        return User.objects.filter(
            user_type='service_provider',
            email__icontains=query
        ) | User.objects.filter(
            user_type='service_provider',
            first_name__icontains=query
        ) | User.objects.filter(
            user_type='service_provider',
            last_name__icontains=query
        )

class UserDashboardStatsAPIView(APIView):
    """Vista para estadísticas del dashboard."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Implementar lógica de estadísticas
        return Response({
            'total_contracts': 0,
            'active_contracts': 0,
            'total_payments': 0,
            'pending_payments': 0
        })

class ProfileView(APIView):
    """Vista para manejar el perfil del usuario."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Obtener el perfil del usuario actual."""
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        """Actualizar el perfil del usuario actual."""
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AvatarUploadView(APIView):
    """Vista para subir avatar del usuario."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Subir avatar del usuario."""
        if 'avatar' not in request.FILES:
            return Response(
                {'error': 'No se proporcionó archivo de avatar'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        avatar_file = request.FILES['avatar']
        
        # Validar tipo de archivo
        if not avatar_file.content_type.startswith('image/'):
            return Response(
                {'error': 'El archivo debe ser una imagen'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Guardar avatar
        try:
            request.user.avatar = avatar_file
            request.user.save()
            
            return Response({
                'avatar_url': request.user.avatar.url if request.user.avatar else None
            })
        except Exception as e:
            return Response(
                {'error': f'Error al guardar avatar: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ResumeView(APIView):
    """Vista para manejar la hoja de vida del usuario."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Obtener la hoja de vida del usuario."""
        try:
            resume = UserResume.objects.get(user=request.user)
            serializer = UserResumeSerializer(resume)
            return Response(serializer.data)
        except UserResume.DoesNotExist:
            return Response(
                {'error': 'Hoja de vida no encontrada'}, 
                status=status.HTTP_404_NOT_FOUND
            )

    def post(self, request):
        """Crear una nueva hoja de vida."""
        serializer = UserResumeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request):
        """Actualizar la hoja de vida del usuario."""
        try:
            resume = UserResume.objects.get(user=request.user)
            serializer = UserResumeSerializer(resume, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except UserResume.DoesNotExist:
            return Response(
                {'error': 'Hoja de vida no encontrada'}, 
                status=status.HTTP_404_NOT_FOUND
            )

class SettingsView(APIView):
    """Vista para manejar los ajustes del usuario."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Obtener los ajustes del usuario."""
        try:
            settings = UserSettings.objects.get(user=request.user)
            serializer = UserSettingsSerializer(settings)
            return Response(serializer.data)
        except UserSettings.DoesNotExist:
            # Crear ajustes por defecto si no existen
            settings = UserSettings.objects.create(user=request.user)
            serializer = UserSettingsSerializer(settings)
            return Response(serializer.data)

    def put(self, request):
        """Actualizar los ajustes del usuario."""
        try:
            settings = UserSettings.objects.get(user=request.user)
            serializer = UserSettingsSerializer(settings, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except UserSettings.DoesNotExist:
            # Crear ajustes si no existen
            serializer = UserSettingsSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class InterviewCodeVerificationView(APIView):
    """Vista para verificar códigos de entrevista."""
    
    def post(self, request):
        """Verificar un código de entrevista."""
        serializer = InterviewCodeVerificationSerializer(data=request.data)
        if serializer.is_valid():
            code = serializer.validated_data['code']
            email = serializer.validated_data['email']
            
            try:
                interview_code = InterviewCode.objects.get(interview_code=code, candidate_email=email)
                if interview_code.status == 'used':
                    return Response({
                        'valid': False,
                        'message': 'Este código de entrevista ya ha sido utilizado.'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                return Response({
                    'valid': True,
                    'message': 'Código verificado correctamente.'
                })
            except InterviewCode.DoesNotExist:
                return Response({
                    'valid': False,
                    'message': 'Código de entrevista inválido o no coincide con el correo electrónico.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SimpleRegistrationView(APIView):
    """Vista para registro de usuarios sin código de entrevista."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Registrar un nuevo usuario con o sin código de entrevista."""
        try:
            # Extraer datos del request
            email = request.data.get('email')
            password = request.data.get('password')
            password2 = request.data.get('password2')
            first_name = request.data.get('first_name', '')
            last_name = request.data.get('last_name', '')
            user_type = request.data.get('user_type', 'tenant')
            phone_number = request.data.get('phone_number', '')
            interview_code_str = request.data.get('interview_code', '').strip().upper()
            
            # Validaciones básicas
            if not email or not password:
                return Response({
                    'error': 'Email y contraseña son requeridos'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if password != password2:
                return Response({
                    'error': 'Las contraseñas no coinciden'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Verificar si el usuario ya existe
            if User.objects.filter(email=email).exists():
                return Response({
                    'error': 'Ya existe un usuario con este email'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar código de entrevista solo si se proporciona y no está vacío
            interview_code_obj = None
            if interview_code_str and interview_code_str.strip():
                try:
                    interview_code_obj = InterviewCode.objects.get(interview_code=interview_code_str)
                    
                    # Verificar que el email coincida
                    if interview_code_obj.candidate_email != email:
                        return Response({
                            'error': 'El email no coincide con el código de entrevista'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Verificar que el código sea válido
                    is_valid, message = interview_code_obj.is_valid()
                    if not is_valid:
                        return Response({
                            'error': f'Código de entrevista inválido: {message}'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # El tipo de usuario debe coincidir con el código
                    if interview_code_obj.approved_user_type != user_type:
                        return Response({
                            'error': f'El tipo de usuario debe ser: {interview_code_obj.get_approved_user_type_display()}'
                        }, status=status.HTTP_400_BAD_REQUEST)
                        
                except InterviewCode.DoesNotExist:
                    return Response({
                        'error': 'Código de entrevista no encontrado'
                    }, status=status.HTTP_400_BAD_REQUEST)
            # Si no hay código de entrevista, permitir registro normal
            
            # Crear el usuario
            with transaction.atomic():
                user = User.objects.create_user(
                    email=email,
                    password=password,
                    first_name=first_name,
                    last_name=last_name,
                    user_type=user_type,
                    phone_number=phone_number,
                    is_verified=False  # No verificado hasta confirmar email
                )
                
                # Si hay código de entrevista, asignarlo y marcar como usado
                if interview_code_obj:
                    interview_code_obj.use_code(user)
                    user.interview_code = interview_code_obj
                    user.initial_rating = interview_code_obj.interview_rating or 0
                    user.save()
                
                # Crear EmailAddress para django-allauth
                email_address, created = EmailAddress.objects.get_or_create(
                    user=user,
                    email=user.email,
                    defaults={'primary': True, 'verified': False}
                )
                
                # Enviar email de confirmación
                try:
                    send_email_confirmation(request, user, signup=True)
                    print(f"✅ Email de confirmación enviado a {user.email}")
                except Exception as e:
                    print(f"❌ Error enviando email de confirmación: {e}")
                    # Continuar sin fallar el registro
                    pass
                
                return Response({
                    'message': 'Usuario registrado exitosamente. Se ha enviado un email de confirmación a tu correo electrónico.',
                    'user_id': str(user.id),
                    'email': user.email,
                    'email_sent': True,
                    'interview_code_used': bool(interview_code_obj)
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            return Response({
                'error': f'Error al registrar usuario: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserRegistrationView(APIView):
    """Vista para registro de usuarios con código de entrevista."""
    permission_classes = [permissions.AllowAny]  # Permitir registro sin autenticación
    
    def post(self, request):
        """Registrar un nuevo usuario con código de entrevista."""
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                with transaction.atomic():
                    # Verificar código de entrevista
                    code = serializer.validated_data['interview_code']
                    email = serializer.validated_data['email']
                    interview_code = InterviewCode.objects.get(interview_code=code, candidate_email=email)
                    if interview_code.status == 'used':
                        return Response({
                            'error': 'Este código de entrevista ya ha sido utilizado.'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Crear usuario (sin asignar interview_code aún)
                    user = serializer.save()
                    
                    # Asignar código y calificación inicial SIN llamar a save() de nuevo si es posible
                    User.objects.filter(pk=user.pk).update(
                        interview_code=interview_code,
                        initial_rating=interview_code.interview_rating or 0
                    )
                    
                    # Marcar código como utilizado
                    interview_code.status = 'used'
                    interview_code.save()
                    
                    # Enviar email de confirmación usando django-allauth
                    email_address, created = EmailAddress.objects.get_or_create(
                        user=user,
                        email=user.email,
                        defaults={'primary': True, 'verified': False}
                    )
                    try:
                        send_email_confirmation(request, user, signup=True)
                        print(f"✅ Email de confirmación enviado a {user.email}")
                    except Exception as e:
                        print(f"❌ Error enviando email de confirmación: {e}")
                        # Continuar sin fallar el registro
                        pass
                    
                    return Response({
                        'message': 'Usuario registrado exitosamente. Se ha enviado un email de confirmación a tu correo electrónico.',
                        'user_id': user.id,
                        'email_sent': True
                    }, status=status.HTTP_201_CREATED)
                    
            except InterviewCode.DoesNotExist:
                return Response({
                    'error': 'Código de entrevista inválido.'
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                return Response({
                    'error': f'Error al registrar usuario: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_interview_code(request):
    """Crear un nuevo código de entrevista (solo para administradores)."""
    if not request.user.is_staff:
        return Response(
            {'error': 'No tienes permisos para realizar esta acción'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    try:
        data = json.loads(request.body)
        email = data.get('email')
        initial_rating = data.get('initial_rating', 0)
        notes = data.get('notes', '')
        
        if not email:
            return Response(
                {'error': 'El email es requerido'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verificar si ya existe un código para este email
        if InterviewCode.objects.filter(candidate_email=email).exists():
            return Response(
                {'error': 'Ya existe un código de entrevista para este email'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear nuevo código
        interview_code = InterviewCode.objects.create(
            email=email,
            initial_rating=initial_rating,
            notes=notes
        )
        
        return Response({
            'code': interview_code.code,
            'email': interview_code.email,
            'message': 'Código de entrevista creado exitosamente'
        }, status=status.HTTP_201_CREATED)
        
    except json.JSONDecodeError:
        return Response(
            {'error': 'Datos JSON inválidos'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': f'Error al crear código: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class DirectUserRegistrationView(APIView):
    """Vista directa para /api/v1/auth/register/ que reenvía a UserRegistrationView."""
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        # Importar la vista real y delegar
        from .api_views import UserRegistrationView
        return UserRegistrationView().post(request)

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        # Verificar si los campos están presentes
        if not email or not password:
            raise serializers.ValidationError({
                'detail': 'Email y contraseña son requeridos.',
                'error_type': 'missing_fields'
            })
        
        # Verificar si el usuario existe
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                'detail': f'No existe una cuenta con el email {email}. ¿Necesitas registrarte?',
                'error_type': 'user_not_found',
                'email': email
            })
        
        # Verificar la contraseña
        if not user.check_password(password):
            raise serializers.ValidationError({
                'detail': 'La contraseña ingresada es incorrecta. Verifica tu contraseña o usa "Olvidé mi contraseña".',
                'error_type': 'invalid_password',
                'email': email
            })
        
        # Verificar si el usuario está activo
        if not user.is_active:
            raise serializers.ValidationError({
                'detail': 'Tu cuenta ha sido desactivada. Contacta al soporte para reactivarla.',
                'error_type': 'account_disabled',
                'email': email
            })
        
        # Verificar si el email está confirmado
        try:
            email_address = EmailAddress.objects.get(user=user, primary=True)
            if not email_address.verified:
                raise serializers.ValidationError({
                    'detail': 'Tu cuenta no ha sido verificada. Por favor, revisa tu email (incluyendo la carpeta de spam) y confirma tu cuenta.',
                    'error_type': 'email_not_verified',
                    'email_verified': False,
                    'user_email': user.email,
                    'action_required': 'email_verification'
                })
        except EmailAddress.DoesNotExist:
            # Crear EmailAddress si no existe y marcar como no verificado
            EmailAddress.objects.create(
                user=user,
                email=user.email,
                primary=True,
                verified=False
            )
            raise serializers.ValidationError({
                'detail': 'Tu cuenta no ha sido verificada. Por favor, revisa tu email (incluyendo la carpeta de spam) y confirma tu cuenta.',
                'error_type': 'email_not_verified',
                'email_verified': False,
                'user_email': user.email,
                'action_required': 'email_verification'
            })
        
        # Si llegamos aquí, todo está bien, generar tokens
        try:
            data = super().validate(attrs)
            return data
        except Exception as e:
            raise serializers.ValidationError({
                'detail': 'Error generando tokens de autenticación. Intenta nuevamente.',
                'error_type': 'token_generation_error'
            })

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

class EmailConfirmationView(APIView):
    """Vista para confirmar el email del usuario."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, key):
        """Confirmar el email con la clave proporcionada."""
        try:
            from allauth.account.models import EmailConfirmation
            
            # Buscar la confirmación de email
            confirmation = EmailConfirmation.objects.get(key=key)
            
            # Verificar si no ha expirado
            if confirmation.key_expired():
                return Response({
                    'detail': 'El enlace de confirmación ha expirado.'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Confirmar el email
            confirmation.confirm(request)
            
            # Actualizar el usuario como verificado
            user = confirmation.email_address.user
            user.is_verified = True
            user.save()
            
            return Response({
                'detail': 'Email confirmado exitosamente.',
                'email': user.email
            }, status=status.HTTP_200_OK)
            
        except EmailConfirmation.DoesNotExist:
            return Response({
                'detail': 'Enlace de confirmación inválido.'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'detail': 'Error al confirmar el email.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Vistas de notificaciones
class UserNotificationsAPIView(APIView):
    """Vista para obtener notificaciones del usuario."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from .services import UserActivityService
        
        notifications = UserActivityService.get_user_notifications(request.user)
        
        notification_data = []
        for notification in notifications:
            notification_data.append({
                'id': notification.id,
                'title': notification.title,
                'message': notification.message,
                'notification_type': notification.notification_type,
                'is_read': notification.is_read,
                'is_important': notification.is_important,
                'created_at': notification.created_at.isoformat(),
                'read_at': notification.read_at.isoformat() if notification.read_at else None,
                'read': notification.is_read
            })
        
        return Response({
            'notifications': notification_data,
            'total_count': notifications.count(),
            'unread_count': UserActivityService.get_user_notifications(request.user, unread_only=True).count()
        })

class MarkNotificationReadAPIView(APIView):
    """Vista para marcar una notificación como leída."""
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, notification_id):
        from .services import UserActivityService
        
        try:
            notifications = UserActivityService.get_user_notifications(request.user)
            notification = notifications.get(id=notification_id)
            notification.status = 'read'
            notification.save()
            
            return Response({'success': True, 'message': 'Notificación marcada como leída'})
        except Exception as e:
            return Response(
                {'error': 'No se pudo marcar la notificación como leída'},
                status=status.HTTP_400_BAD_REQUEST
            )

class MarkAllNotificationsReadAPIView(APIView):
    """Vista para marcar todas las notificaciones como leídas."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        from .services import UserActivityService
        
        try:
            unread_notifications = UserActivityService.get_user_notifications(
                request.user, unread_only=True
            )
            
            for notification in unread_notifications:
                notification.status = 'read'
                notification.save()
            
            return Response({
                'success': True, 
                'message': f'{unread_notifications.count()} notificaciones marcadas como leídas'
            })
        except Exception as e:
            return Response(
                {'error': 'No se pudieron marcar las notificaciones como leídas'},
                status=status.HTTP_400_BAD_REQUEST
            )

class ResendEmailConfirmationView(APIView):
    """Vista para reenviar email de confirmación."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Reenviar email de confirmación a un usuario."""
        email = request.data.get('email')
        
        if not email:
            return Response({
                'error': 'El email es requerido'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            
            # Verificar si ya está verificado
            try:
                email_address = EmailAddress.objects.get(user=user, primary=True)
                if email_address.verified:
                    return Response({
                        'message': 'Esta cuenta ya está verificada'
                    }, status=status.HTTP_200_OK)
            except EmailAddress.DoesNotExist:
                # Crear EmailAddress si no existe
                email_address = EmailAddress.objects.create(
                    user=user,
                    email=user.email,
                    primary=True,
                    verified=False
                )
            
            # Enviar nuevo email de confirmación
            send_email_confirmation(request, user, signup=True)
            
            return Response({
                'message': f'Email de confirmación reenviado a {email}. Revisa tu bandeja de entrada y carpeta de spam.'
            }, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({
                'error': 'No existe un usuario con este email'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': f'Error al reenviar email: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)