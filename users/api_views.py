"""
Vistas de API REST para la aplicación de usuarios de VeriHome.
"""

from rest_framework import viewsets, generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db import transaction
import json
from .models import LandlordProfile, TenantProfile, ServiceProviderProfile, UserResume, UserSettings, InterviewCode, PortfolioItem, UserActivityLog
from .candidate_evaluation_service import CandidateEvaluationService
from .serializers import (
    UserSerializer, UserRegistrationSerializer, UserProfileSerializer, 
    UserResumeSerializer, UserSettingsSerializer, InterviewCodeVerificationSerializer,
    LandlordProfileSerializer, TenantProfileSerializer, ServiceProviderProfileSerializer,
    PortfolioItemSerializer, UserActivityLogSerializer, UserActivityStatsSerializer
)
from rest_framework.decorators import api_view, permission_classes
from django.core.mail import send_mail
from allauth.account.models import EmailAddress
from allauth.account.utils import send_email_confirmation
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.utils import timezone

User = get_user_model()

# ViewSets básicos
class UserViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para visualizar usuarios."""
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

class LandlordProfileViewSet(viewsets.ModelViewSet):
    """ViewSet para perfiles de propietarios."""
    queryset = LandlordProfile.objects.all()
    serializer_class = LandlordProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

class TenantProfileViewSet(viewsets.ModelViewSet):
    """ViewSet para perfiles de inquilinos."""
    queryset = TenantProfile.objects.all()
    serializer_class = TenantProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

class ServiceProviderProfileViewSet(viewsets.ModelViewSet):
    """ViewSet para perfiles de proveedores de servicios."""
    queryset = ServiceProviderProfile.objects.all()
    serializer_class = ServiceProviderProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

class PortfolioItemViewSet(viewsets.ModelViewSet):
    """ViewSet para elementos de portafolio de proveedores de servicios."""
    queryset = PortfolioItem.objects.all()
    serializer_class = PortfolioItemSerializer
    permission_classes = [permissions.IsAuthenticated]

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
        query = getattr(self.request, "query_params", self.request.GET).get('q', '')
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
        query = getattr(self.request, "query_params", self.request.GET).get('q', '')
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

    def patch(self, request):
        """Actualizar parcialmente el perfil del usuario actual."""
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PublicProfileView(APIView):
    """Vista para obtener información pública de un usuario."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        """Obtener información pública de un usuario específico."""
        try:
            user = User.objects.get(id=user_id)
            
            # Crear respuesta con información pública básica
            profile_data = {
                'id': str(user.id),
                'full_name': user.get_full_name(),
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'user_type': user.user_type,
                'phone': getattr(user, 'phone_number', None),
                'document_number': getattr(user, 'document_number', None),
                'city': getattr(user, 'city', None),
                'country': getattr(user, 'country', None),
                'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                'is_verified': EmailAddress.objects.filter(user=user, verified=True).exists(),
            }
            
            # Agregar información específica según el tipo de usuario
            if user.user_type == 'tenant':
                try:
                    tenant_profile = TenantProfile.objects.get(user=user)
                    profile_data.update({
                        'monthly_income': getattr(tenant_profile, 'monthly_income', None),
                        'job_title': getattr(tenant_profile, 'job_title', None),
                        'company': getattr(tenant_profile, 'company', None),
                        'employment_type': getattr(tenant_profile, 'employment_type', None),
                        'education_level': getattr(tenant_profile, 'education_level', None),
                        'has_pets': getattr(tenant_profile, 'has_pets', False),
                        'pet_details': getattr(tenant_profile, 'pet_details', None),
                        'references': getattr(tenant_profile, 'references', []),
                        'rental_history': getattr(tenant_profile, 'rental_history', []),
                        'emergency_contact': getattr(tenant_profile, 'emergency_contact', None),
                    })
                except TenantProfile.DoesNotExist:
                    profile_data.update({
                        'monthly_income': None,
                        'job_title': None,
                        'company': None,
                        'employment_type': None,
                        'education_level': None,
                        'has_pets': False,
                        'pet_details': None,
                        'references': [],
                        'rental_history': [],
                        'emergency_contact': None,
                    })
            
            elif user.user_type == 'landlord':
                try:
                    landlord_profile = LandlordProfile.objects.get(user=user)
                    profile_data.update({
                        'company_name': landlord_profile.company_name,
                        'properties_count': landlord_profile.properties_count if hasattr(landlord_profile, 'properties_count') else 0,
                        'years_experience': landlord_profile.years_experience if hasattr(landlord_profile, 'years_experience') else 0,
                        'rating': landlord_profile.rating if hasattr(landlord_profile, 'rating') else 0,
                    })
                except LandlordProfile.DoesNotExist:
                    pass
            
            elif user.user_type == 'service_provider':
                try:
                    service_profile = ServiceProviderProfile.objects.get(user=user)
                    profile_data.update({
                        'services': service_profile.services if hasattr(service_profile, 'services') else [],
                        'experience_years': service_profile.experience_years if hasattr(service_profile, 'experience_years') else 0,
                        'rating': service_profile.rating if hasattr(service_profile, 'rating') else 0,
                        'hourly_rate': service_profile.hourly_rate if hasattr(service_profile, 'hourly_rate') else None,
                    })
                except ServiceProviderProfile.DoesNotExist:
                    pass
            
            # Agregar información de resume si existe
            try:
                user_resume = UserResume.objects.get(user=user)
                profile_data['resume'] = {
                    'education_level': user_resume.education_level,
                    'institution_name': user_resume.institution_name,
                    'field_of_study': user_resume.field_of_study,
                    'current_employer': user_resume.current_employer,
                    'current_position': user_resume.current_position,
                    'employment_type': user_resume.employment_type,
                    'monthly_salary': float(user_resume.monthly_salary) if user_resume.monthly_salary else None,
                    'credit_score': user_resume.credit_score,
                    'eviction_history': user_resume.eviction_history,
                    'criminal_records': user_resume.criminal_records if hasattr(user_resume, 'criminal_records') else False,
                    'reference1_name': user_resume.reference1_name,
                    'reference2_name': user_resume.reference2_name,
                }
            except UserResume.DoesNotExist:
                profile_data['resume'] = None
                
            return Response(profile_data)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            # Log del error para debug
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Error en PublicProfileView: {str(e)}', exc_info=True)
            
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PublicResumeView(APIView):
    """Vista para obtener la hoja de vida completa de un usuario."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        """Obtener la hoja de vida detallada de un usuario específico."""
        try:
            user = User.objects.get(id=user_id)
            
            # Solo permitir a arrendadores ver CVs de arrendatarios
            if user.user_type != 'tenant':
                return Response(
                    {'error': 'Solo se puede ver la hoja de vida de arrendatarios'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Verificar que el solicitante sea un arrendador
            if request.user.user_type != 'landlord':
                return Response(
                    {'error': 'Solo los arrendadores pueden ver hojas de vida'}, 
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Información básica del usuario
            resume_data = {
                'user_info': {
                    'id': str(user.id),
                    'full_name': user.get_full_name(),
                    'email': user.email,
                    'phone': getattr(user, 'phone_number', None),
                    'user_type': user.user_type,
                    'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                    'is_verified': EmailAddress.objects.filter(user=user, verified=True).exists(),
                }
            }
            
            # Intentar obtener el resume
            try:
                user_resume = UserResume.objects.get(user=user)
                
                # Información personal extendida
                resume_data['personal_info'] = {
                    'date_of_birth': user_resume.date_of_birth.isoformat() if user_resume.date_of_birth else None,
                    'nationality': user_resume.nationality,
                    'marital_status': user_resume.marital_status,
                    'dependents': user_resume.dependents,
                }
                
                # Información educativa
                resume_data['education'] = {
                    'level': user_resume.education_level,
                    'level_display': user_resume.get_education_level_display(),
                    'institution_name': user_resume.institution_name,
                    'field_of_study': user_resume.field_of_study,
                    'graduation_year': user_resume.graduation_year,
                    'gpa': float(user_resume.gpa) if user_resume.gpa else None,
                }
                
                # Información laboral detallada
                resume_data['employment'] = {
                    'current_employer': user_resume.current_employer,
                    'current_position': user_resume.current_position,
                    'employment_type': user_resume.employment_type,
                    'employment_type_display': user_resume.get_employment_type_display(),
                    'start_date': user_resume.start_date.isoformat() if user_resume.start_date else None,
                    'end_date': user_resume.end_date.isoformat() if user_resume.end_date else None,
                    'monthly_salary': float(user_resume.monthly_salary) if user_resume.monthly_salary else None,
                    'supervisor_name': user_resume.supervisor_name,
                    'supervisor_phone': user_resume.supervisor_phone,
                    'supervisor_email': user_resume.supervisor_email,
                }
                
                # Información financiera (limitada por privacidad)
                resume_data['financial'] = {
                    'monthly_expenses': float(user_resume.monthly_expenses) if user_resume.monthly_expenses else None,
                    'credit_score': user_resume.credit_score,
                    'bank_name': user_resume.bank_name,  # Solo nombre del banco
                    'account_type': user_resume.account_type,
                    # NO incluimos número de cuenta por seguridad
                }
                
                # Contacto de emergencia
                resume_data['emergency_contact'] = {
                    'name': user_resume.emergency_contact_name,
                    'phone': user_resume.emergency_contact_phone,
                    'relation': user_resume.emergency_contact_relation,
                    'address': user_resume.emergency_contact_address,
                }
                
                # Referencias personales
                resume_data['references'] = [
                    {
                        'name': user_resume.reference1_name,
                        'phone': user_resume.reference1_phone,
                        'email': user_resume.reference1_email,
                        'relation': user_resume.reference1_relation,
                        'type': 'personal'
                    },
                    {
                        'name': user_resume.reference2_name,
                        'phone': user_resume.reference2_phone,
                        'email': user_resume.reference2_email,
                        'relation': user_resume.reference2_relation,
                        'type': 'personal'
                    }
                ]
                
                # Filtrar referencias vacías
                resume_data['references'] = [
                    ref for ref in resume_data['references'] 
                    if ref['name'] and ref['phone']
                ]
                
                # Historial de vivienda
                resume_data['housing_history'] = {
                    'previous_addresses': user_resume.previous_addresses,
                    'rental_history': user_resume.rental_history,
                    'eviction_history': user_resume.eviction_history,
                    'eviction_details': user_resume.eviction_details if user_resume.eviction_history else None,
                }
                
                # Estado de documentos de verificación
                resume_data['document_verification'] = {
                    'id_document': {
                        'status': user_resume.id_document_status,
                        'has_file': bool(user_resume.id_document)
                    },
                    'proof_of_income': {
                        'status': user_resume.proof_of_income_status,
                        'has_file': bool(user_resume.proof_of_income)
                    },
                    'bank_statement': {
                        'status': user_resume.bank_statement_status,
                        'has_file': bool(user_resume.bank_statement)
                    },
                    'employment_letter': {
                        'status': user_resume.employment_letter_status,
                        'has_file': bool(user_resume.employment_letter)
                    },
                    'tax_return': {
                        'status': user_resume.tax_return_status,
                        'has_file': bool(user_resume.tax_return)
                    },
                    'credit_report': {
                        'status': user_resume.credit_report_status,
                        'has_file': bool(user_resume.credit_report)
                    },
                }
                
                # Información adicional
                resume_data['additional_info'] = {
                    'criminal_record': user_resume.criminal_record,
                    'criminal_record_details': user_resume.criminal_record_details if user_resume.criminal_record else None,
                }
                
                # Estado de verificación
                resume_data['verification'] = {
                    'is_complete': user_resume.is_complete,
                    'verification_score': user_resume.verification_score,
                    'verified_at': user_resume.verified_at.isoformat() if user_resume.verified_at else None,
                    'verified_by': user_resume.verified_by.get_full_name() if user_resume.verified_by else None,
                }
                
                # Metadatos
                resume_data['metadata'] = {
                    'created_at': user_resume.created_at.isoformat(),
                    'updated_at': user_resume.updated_at.isoformat(),
                }
                
            except UserResume.DoesNotExist:
                resume_data['error'] = 'El usuario no ha completado su hoja de vida'
                resume_data['has_resume'] = False
                return Response(resume_data, status=status.HTTP_404_NOT_FOUND)
            
            resume_data['has_resume'] = True
            return Response(resume_data)
            
        except User.DoesNotExist:
            return Response(
                {'error': 'Usuario no encontrado'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            # Log del error para debug
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Error en PublicResumeView: {str(e)}', exc_info=True)
            
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request):
        """Actualizar el perfil del usuario actual."""
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        """Actualizar parcialmente el perfil del usuario actual."""
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
            # Si no existe resume, crear uno nuevo
            serializer = UserResumeSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save(user=request.user)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
            # Extraer datos básicos del request
            email = request.data.get('email')
            password = request.data.get('password')
            password2 = request.data.get('password2')
            first_name = request.data.get('first_name', '')
            last_name = request.data.get('last_name', '')
            user_type = request.data.get('user_type', 'tenant')
            interview_code_str = request.data.get('interview_code', '').strip().upper()
            
            # Extraer datos de contacto
            phone_number = request.data.get('phone_number', '')
            whatsapp = request.data.get('whatsapp', '')
            
            # Extraer datos personales
            date_of_birth = request.data.get('date_of_birth')
            gender = request.data.get('gender')
            nationality = request.data.get('nationality', 'Colombiana')
            marital_status = request.data.get('marital_status')
            
            # Extraer datos de ubicación
            country = request.data.get('country', 'Colombia')
            state = request.data.get('state', '')
            city = request.data.get('city', '')
            postal_code = request.data.get('postal_code', '')
            current_address = request.data.get('current_address', '')
            
            # Extraer datos laborales y financieros
            employment_status = request.data.get('employment_status')
            monthly_income = request.data.get('monthly_income', 0)
            currency = request.data.get('currency', 'COP')
            employer_name = request.data.get('employer_name', '')
            job_title = request.data.get('job_title', '')
            years_employed = request.data.get('years_employed')
            
            # Extraer datos específicos por tipo de usuario
            company_name = request.data.get('company_name', '')
            total_properties = request.data.get('total_properties', 0)
            years_experience = request.data.get('years_experience', 0)
            business_name = request.data.get('business_name', '')
            service_category = request.data.get('service_category', '')
            hourly_rate = request.data.get('hourly_rate', 0)
            hourly_rate_currency = request.data.get('hourly_rate_currency', 'COP')
            
            # Extraer datos de arrendatarios
            budget_range = request.data.get('budget_range', 'medium')
            move_in_date = request.data.get('move_in_date')
            pets = request.data.get('pets', False)
            rental_history = request.data.get('rental_history', False)
            family_size = request.data.get('family_size', 1)
            
            # Extraer datos de preferencias
            source = request.data.get('source', 'direct')
            marketing_consent = request.data.get('marketing_consent', False)
            
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
                    interview_code_obj = InterviewCode.objects.get(code=interview_code_str)
                    
                    # Verificar que el email coincida
                    if interview_code_obj.email != email:
                        return Response({
                            'error': 'El email no coincide con el código de entrevista'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # Verificar que el código sea válido
                    if not interview_code_obj.is_valid():
                        return Response({
                            'error': 'Código de entrevista inválido o expirado'
                        }, status=status.HTTP_400_BAD_REQUEST)
                    
                    # El tipo de usuario debe coincidir con el código
                    if interview_code_obj.user_type != user_type:
                        return Response({
                            'error': f'El tipo de usuario debe ser: {interview_code_obj.get_user_type_display()}'
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
                    whatsapp=whatsapp,
                    date_of_birth=date_of_birth if date_of_birth else None,
                    gender=gender,
                    nationality=nationality,
                    marital_status=marital_status,
                    country=country,
                    state=state,
                    city=city,
                    postal_code=postal_code,
                    current_address=current_address,
                    employment_status=employment_status,
                    monthly_income=monthly_income if monthly_income else None,
                    currency=currency,
                    employer_name=employer_name,
                    job_title=job_title,
                    years_employed=years_employed if years_employed else None,
                    family_size=family_size if family_size else 1,
                    pets=pets,
                    rental_history=rental_history,
                    total_properties=total_properties if total_properties else 0,
                    years_experience=years_experience if years_experience else 0,
                    company_name=company_name,
                    business_name=business_name,
                    service_category=service_category,
                    hourly_rate=hourly_rate if hourly_rate else None,
                    hourly_rate_currency=hourly_rate_currency,
                    budget_range=budget_range,
                    move_in_date=move_in_date if move_in_date else None,
                    source=source,
                    marketing_consent=marketing_consent,
                    is_verified=False  # No verificado hasta confirmar email
                )
                
                # Si hay código de entrevista, asignarlo y marcar como usado
                if interview_code_obj:
                    interview_code_obj.use_code(user)
                    user.interview_code = interview_code_obj
                    user.initial_rating = interview_code_obj.interview_rating if interview_code_obj.interview_rating is not None else 0
                    user.save()
                
                # Crear EmailAddress para django-allauth
                email_address, created = EmailAddress.objects.get_or_create(
                    user=user,
                    email=user.email,
                    defaults={'primary': True, 'verified': False}
                )
                
                # Enviar email de confirmación con debugging exhaustivo
                print(f"🚀 INICIANDO send_email_confirmation para {user.email}")
                print(f"📧 EmailAddress creada: {email_address}, Primary: {email_address.primary}, Verified: {email_address.verified}")
                
                # Verificar imports antes de llamar la función
                print(f"🔍 send_email_confirmation import exitoso: {send_email_confirmation}")
                print(f"🔍 User ID: {user.id}, Email: {user.email}")
                print(f"🔍 Request object: {request}")
                
                try:
                    print("🔄 Llamando send_email_confirmation...")
                    
                    # SOLUCIÓN: Crear manualmente el EmailConfirmation porque send_email_confirmation no lo está haciendo
                    from allauth.account.models import EmailConfirmation
                    from django.utils.crypto import get_random_string
                    
                    # Crear el EmailConfirmation manualmente
                    print("🔧 Creando EmailConfirmation manualmente...")
                    confirmation_key = get_random_string(64).lower()
                    email_confirmation = EmailConfirmation.objects.create(
                        email_address=email_address,
                        key=confirmation_key,
                        sent=None  # Se marcará como enviado después
                    )
                    print(f"✅ EmailConfirmation creado manualmente: {confirmation_key}")
                    
                    # Ahora llamar al adaptador para enviar el email
                    from django.conf import settings
                    adapter = settings.ACCOUNT_ADAPTER
                    from django.utils.module_loading import import_string
                    adapter_class = import_string(adapter)
                    adapter_instance = adapter_class()
                    
                    print("📧 Enviando email con adaptador personalizado...")
                    adapter_instance.send_confirmation_mail(request, email_confirmation, signup=True)
                    
                    # Marcar como enviado
                    from django.utils import timezone
                    email_confirmation.sent = timezone.now()
                    email_confirmation.save()
                    
                    print("✅ Email de confirmación enviado correctamente")
                    print(f"🔑 Key creada: {confirmation_key}")
                    
                    # Verificar que se creó correctamente
                    confirmations = EmailConfirmation.objects.filter(email_address__user=user)
                    print(f"📧 EmailConfirmations en base de datos: {confirmations.count()}")
                    for conf in confirmations:
                        print(f"🔑 Key: {conf.key}, Created: {conf.created}, Sent: {conf.sent}")
                        
                except Exception as e:
                    print(f"❌ ERROR CRÍTICO enviando email de confirmación: {e}")
                    print(f"❌ Tipo de error: {type(e).__name__}")
                    print(f"❌ Error args: {e.args}")
                    import traceback
                    print("❌ Stack trace completo:")
                    traceback.print_exc()
                    
                    # IMPORTANTE: Fallar el registro si el email no se puede enviar
                    return Response({
                        'error': f'Error enviando email de confirmación: {str(e)}',
                        'user_created': True,
                        'user_id': str(user.id),
                        'email_error': True
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
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


# Activity Logs API Views
class UserActivityLogListAPIView(generics.ListAPIView):
    """Vista para listar los registros de actividad del usuario autenticado."""
    serializer_class = UserActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar solo los registros del usuario autenticado."""
        return UserActivityLog.objects.filter(user=self.request.user)


class UserActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para los registros de actividad del usuario."""
    serializer_class = UserActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar solo los registros del usuario autenticado."""
        queryset = UserActivityLog.objects.filter(user=self.request.user)
        
        # Filtros opcionales
        activity_type = self.request.query_params.get('activity_type', None)
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type)
        
        # Filtro por fecha (últimos N días)
        days = self.request.query_params.get('days', None)
        if days:
            try:
                days = int(days)
                from datetime import timedelta
                from django.utils import timezone
                since = timezone.now() - timedelta(days=days)
                queryset = queryset.filter(timestamp__gte=since)
            except (ValueError, TypeError):
                pass
        
        # Filtro por modelo relacionado
        model_name = self.request.query_params.get('model_name', None)
        if model_name:
            queryset = queryset.filter(model_name=model_name)
        
        return queryset.order_by('-timestamp')


class UserActivityStatsAPIView(APIView):
    """Vista para obtener estadísticas de actividad del usuario."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtener estadísticas de actividad del usuario autenticado."""
        # Obtener parámetros de consulta
        days = request.query_params.get('days', 30)
        try:
            days = int(days)
            if days < 1 or days > 365:
                days = 30
        except (ValueError, TypeError):
            days = 30
        
        # Obtener estadísticas usando el método del modelo
        stats = UserActivityLog.get_user_stats(request.user, days=days)
        
        # Agregar metadatos adicionales
        stats['period_days'] = days
        stats['generated_at'] = timezone.now()
        
        # Serializar y retornar
        serializer = UserActivityStatsSerializer(stats)
        return Response(serializer.data, status=status.HTTP_200_OK)


class CreateActivityLogAPIView(APIView):
    """Vista para crear registros de actividad desde el frontend."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Crear un nuevo registro de actividad."""
        required_fields = ['activity_type']
        
        # Validar campos requeridos
        for field in required_fields:
            if field not in request.data:
                return Response({
                    'error': f'El campo {field} es requerido'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        activity_type = request.data.get('activity_type')
        
        # Validar que el tipo de actividad sea válido
        valid_types = [choice[0] for choice in UserActivityLog.ACTIVITY_TYPES]
        if activity_type not in valid_types:
            return Response({
                'error': f'Tipo de actividad inválido. Opciones válidas: {valid_types}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Crear el registro usando el método del modelo
            activity_log = UserActivityLog.log_activity(
                user=request.user,
                activity_type=activity_type,
                description=request.data.get('description', ''),
                model_name=request.data.get('model_name', ''),
                object_id=request.data.get('object_id', ''),
                object_repr=request.data.get('object_repr', ''),
                metadata=request.data.get('metadata', {}),
                request=request
            )
            
            # Serializar y retornar el registro creado
            serializer = UserActivityLogSerializer(activity_log)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'error': f'Error al crear registro de actividad: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ActivityTypesAPIView(APIView):
    """Vista para obtener los tipos de actividad disponibles."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtener la lista de tipos de actividad disponibles."""
        activity_types = [
            {
                'value': choice[0],
                'label': choice[1],
            }
            for choice in UserActivityLog.ACTIVITY_TYPES
        ]
        
        return Response({
            'activity_types': activity_types,
            'total_types': len(activity_types)
        }, status=status.HTTP_200_OK)


class ForgotPasswordView(APIView):
    """Vista para solicitar restablecimiento de contraseña."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Envía email de restablecimiento de contraseña."""
        email = request.data.get('email')
        
        if not email:
            return Response(
                {'error': 'El email es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(email=email)
            
            # Generar token de reset
            from django.contrib.auth.tokens import default_token_generator
            from django.utils.http import urlsafe_base64_encode
            from django.utils.encoding import force_bytes
            
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Construir URL de reset
            reset_url = f"http://localhost:5173/reset-password?token={token}&uid={uid}"
            
            # Enviar email
            subject = 'Restablecer contraseña - VeriHome'
            message = f"""
            Hola {user.first_name or 'Usuario'},
            
            Has solicitado restablecer tu contraseña en VeriHome.
            
            Haz clic en el siguiente enlace para restablecer tu contraseña:
            {reset_url}
            
            Si no solicitaste este cambio, puedes ignorar este email.
            
            Este enlace expirará en 24 horas.
            
            Saludos,
            El equipo de VeriHome
            """
            
            send_mail(
                subject,
                message,
                'verihomeadmi@gmail.com',
                [email],
                fail_silently=False,
            )
            
            return Response(
                {'message': 'Se ha enviado un email con instrucciones para restablecer tu contraseña'},
                status=status.HTTP_200_OK
            )
            
        except User.DoesNotExist:
            # No revelar si el email existe o no por seguridad
            return Response(
                {'message': 'Si el email existe en nuestro sistema, recibirás instrucciones para restablecer tu contraseña'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': 'Error al enviar el email. Por favor, intenta nuevamente.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ResetPasswordView(APIView):
    """Vista para restablecer la contraseña con token."""
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Restablece la contraseña del usuario."""
        token = request.data.get('token')
        uid = request.data.get('uid')
        new_password = request.data.get('newPassword')
        
        if not all([token, uid, new_password]):
            return Response(
                {'error': 'Token, UID y nueva contraseña son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from django.contrib.auth.tokens import default_token_generator
            from django.utils.http import urlsafe_base64_decode
            
            # Decodificar UID
            user_id = urlsafe_base64_decode(uid).decode()
            user = User.objects.get(pk=user_id)
            
            # Verificar token
            if not default_token_generator.check_token(user, token):
                return Response(
                    {'error': 'Token inválido o expirado'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validar contraseña
            if len(new_password) < 8:
                return Response(
                    {'error': 'La contraseña debe tener al menos 8 caracteres'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Cambiar contraseña
            user.set_password(new_password)
            user.save()
            
            # Registrar actividad
            UserActivityLog.objects.create(
                user=user,
                activity_type='password_reset',
                description='Contraseña restablecida exitosamente',
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response(
                {'message': 'Contraseña restablecida exitosamente'},
                status=status.HTTP_200_OK
            )
            
        except (User.DoesNotExist, ValueError, TypeError):
            return Response(
                {'error': 'Token inválido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': 'Error al restablecer la contraseña'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CandidateEvaluationView(APIView):
    """Vista unificada para evaluación completa de candidatos."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request, user_id):
        """
        Obtiene evaluación completa de un candidato incluyendo scoring automático.
        
        Query parameters:
        - property_id: ID de propiedad específica para evaluar compatibilidad
        """
        try:
            # Verificar que el usuario solicitante sea landlord
            if request.user.user_type != 'landlord':
                return Response(
                    {'error': 'Solo los arrendadores pueden evaluar candidatos'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Obtener candidato
            try:
                candidate = User.objects.get(id=user_id, user_type='tenant')
            except User.DoesNotExist:
                return Response(
                    {'error': 'Candidato no encontrado'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Obtener propiedad y match request si se especifican
            property_obj = None
            match_request = None
            property_interest_request = None
            property_id = request.query_params.get('property_id')
            match_request_id = request.query_params.get('match_request_id')
            
            # Buscar MatchRequest específico primero
            if match_request_id:
                try:
                    from matching.models import MatchRequest
                    match_request = MatchRequest.objects.get(
                        id=match_request_id,
                        landlord=request.user,
                        tenant=candidate
                    )
                    # Si hay match_request, usar su propiedad
                    property_obj = match_request.property
                except MatchRequest.DoesNotExist:
                    # Si no se encuentra en MatchRequest, intentar buscar en PropertyInterestRequest
                    try:
                        from requests.models import PropertyInterestRequest
                        
                        # Log para debug
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.info(f"Buscando PropertyInterestRequest con ID: {match_request_id}")
                        
                        property_request = PropertyInterestRequest.objects.get(
                            id=match_request_id,
                            assignee=request.user,
                            requester=candidate
                        )
                        
                        logger.info(f"PropertyInterestRequest encontrado: {property_request}")
                        
                        # Obtener la propiedad del PropertyInterestRequest
                        property_obj = property_request.property
                        
                        # Mantener match_request como None pero guardar property_request para el servicio
                        match_request = None
                        property_interest_request = property_request
                        
                    except PropertyInterestRequest.DoesNotExist as e:
                        logger.error(f"PropertyInterestRequest no encontrado: {e}")
                        # Intentar buscar sin filtrar por assignee y requester
                        try:
                            property_request = PropertyInterestRequest.objects.get(id=match_request_id)
                            
                            # Verificar que el usuario tenga permisos
                            if property_request.assignee != request.user:
                                return Response(
                                    {'error': 'No tienes permisos para ver esta solicitud'}, 
                                    status=status.HTTP_403_FORBIDDEN
                                )
                            
                            property_obj = property_request.property
                            match_request = None
                            property_interest_request = property_request
                            
                        except PropertyInterestRequest.DoesNotExist:
                            return Response(
                                {'error': f'Solicitud con ID {match_request_id} no encontrada'}, 
                                status=status.HTTP_404_NOT_FOUND
                            )
                    except Exception as e:
                        logger.error(f"Error inesperado buscando PropertyInterestRequest: {e}")
                        return Response(
                            {'error': f'Error procesando solicitud: {str(e)}'}, 
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR
                        )
            elif property_id:
                try:
                    from properties.models import Property
                    property_obj = Property.objects.get(id=property_id, landlord=request.user)
                except Property.DoesNotExist:
                    return Response(
                        {'error': 'Propiedad no encontrada o no pertenece al usuario'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Crear servicio de evaluación con información de matching
            evaluation_service = CandidateEvaluationService(
                candidate, 
                property_obj, 
                match_request, 
                property_interest_request
            )
            
            # Obtener evaluación completa
            evaluation_data = evaluation_service.get_full_evaluation()
            
            # Agregar información adicional del perfil público
            profile_data = self._get_public_profile_data(candidate)
            evaluation_data.update(profile_data)
            
            # Agregar comparación si hay propiedad específica
            if property_obj:
                comparison = evaluation_service.compare_with_other_candidates(property_id)
                evaluation_data['comparison'] = comparison
            
            return Response(evaluation_data)
            
        except Exception as e:
            # Log del error para debug
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Error en CandidateEvaluationView: {str(e)}', exc_info=True)
            
            return Response(
                {'error': f'Error interno del servidor: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_public_profile_data(self, candidate):
        """Obtiene datos de perfil público del candidato."""
        profile_data = {
            'basic_info': {
                'id': str(candidate.id),
                'full_name': candidate.get_full_name(),
                'first_name': candidate.first_name,
                'last_name': candidate.last_name,
                'email': candidate.email,
                'phone': getattr(candidate, 'phone_number', None),
                'city': getattr(candidate, 'city', None),
                'country': getattr(candidate, 'country', None),
                'date_joined': candidate.date_joined.isoformat() if candidate.date_joined else None,
                'is_verified': EmailAddress.objects.filter(user=candidate, verified=True).exists(),
            }
        }
        
        # Agregar información del TenantProfile si existe
        try:
            tenant_profile = TenantProfile.objects.get(user=candidate)
            profile_data['tenant_info'] = {
                'monthly_income': getattr(tenant_profile, 'monthly_income', None),
                'job_title': getattr(tenant_profile, 'job_title', None),
                'company': getattr(tenant_profile, 'company', None),
                'employment_type': getattr(tenant_profile, 'employment_type', None),
                'education_level': getattr(tenant_profile, 'education_level', None),
                'has_pets': getattr(tenant_profile, 'has_pets', False),
                'pet_details': getattr(tenant_profile, 'pet_details', None),
                'emergency_contact': getattr(tenant_profile, 'emergency_contact', None),
            }
        except TenantProfile.DoesNotExist:
            profile_data['tenant_info'] = None
        
        return profile_data
    
    def post(self, request, user_id):
        """Manejar decisiones de matching (aceptar/rechazar)."""
        try:
            # Verificar que el usuario solicitante sea landlord
            if request.user.user_type != 'landlord':
                return Response(
                    {'error': 'Solo los arrendadores pueden tomar decisiones de matching'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Obtener parámetros
            match_request_id = request.data.get('match_request_id')
            action = request.data.get('action')  # 'accept' or 'reject'
            
            if not match_request_id or not action:
                return Response(
                    {'error': 'match_request_id y action son requeridos'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if action not in ['accept', 'reject']:
                return Response(
                    {'error': 'action debe ser "accept" o "reject"'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener el match request o property interest request
            from matching.models import MatchRequest
            from requests.models import PropertyInterestRequest
            
            match_request = None
            property_request = None
            
            # Intentar primero con MatchRequest
            try:
                match_request = MatchRequest.objects.get(
                    id=match_request_id,
                    landlord=request.user,
                    tenant_id=user_id
                )
            except MatchRequest.DoesNotExist:
                # Si no se encuentra MatchRequest, buscar en PropertyInterestRequest
                try:
                    property_request = PropertyInterestRequest.objects.get(
                        id=match_request_id,
                        assignee=request.user,
                        requester_id=user_id
                    )
                except PropertyInterestRequest.DoesNotExist:
                    return Response(
                        {'error': 'Match request no encontrado'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            
            # Actualizar estado del match
            if action == 'accept':
                if match_request:
                    match_request.status = 'accepted'
                    match_request.save()
                    match_code = match_request.match_code
                    match_status = match_request.status
                else:  # PropertyInterestRequest
                    property_request.status = 'accepted'
                    property_request.save()
                    match_code = f"REQ-{str(property_request.id)[:8]}"
                    match_status = property_request.status
                    
                message = '¡Match aceptado! Ahora pueden comunicarse a través del sistema de mensajes.'
                success_type = 'match_accepted'
            else:  # reject
                if match_request:
                    match_request.status = 'rejected'
                    match_request.save()
                    match_code = match_request.match_code
                    match_status = match_request.status
                else:  # PropertyInterestRequest
                    property_request.status = 'rejected'
                    property_request.save()
                    match_code = f"REQ-{str(property_request.id)[:8]}"
                    match_status = property_request.status
                    
                message = 'Match rechazado. El candidato será notificado.'
                success_type = 'match_rejected'
            
            return Response({
                'status': 'success',
                'type': success_type,
                'message': message,
                'match_status': match_status,
                'match_code': match_code,
                'can_message': match_status == 'accepted'
            })
            
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f'Error en match decision: {str(e)}', exc_info=True)
            return Response(
                {'error': f'Error interno: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# ADM-05: endpoints de impersonación (admin)
# ============================================================================

class ImpersonationSessionsAPIView(APIView):
    """Lista las sesiones de impersonación activas/recientes. Solo staff."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from users.models import AdminImpersonationSession
        active_only = request.query_params.get('active') == 'true'
        qs = AdminImpersonationSession.objects.select_related('admin_user', 'impersonated_user').order_by('-started_at')
        if active_only:
            qs = qs.filter(ended_at__isnull=True)
        qs = qs[:100]
        data = [
            {
                'id': str(s.id),
                'admin': s.admin_user.email if s.admin_user else None,
                'impersonating': s.impersonated_user.email if s.impersonated_user else None,
                'started_at': s.started_at.isoformat() if s.started_at else None,
                'ended_at': s.ended_at.isoformat() if s.ended_at else None,
                'reason': getattr(s, 'reason', ''),
            }
            for s in qs
        ]
        return Response({'sessions': data, 'count': len(data)})


class StartImpersonationAPIView(APIView):
    """Inicia una sesión de impersonación. Solo staff."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        from users.models import AdminImpersonationSession
        target_id = request.data.get('user_id')
        reason = request.data.get('reason', '')
        if not target_id:
            return Response({'error': 'user_id requerido'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target = User.objects.get(id=target_id)
        except User.DoesNotExist:
            return Response({'error': 'Usuario objetivo no existe'}, status=status.HTTP_404_NOT_FOUND)
        session = AdminImpersonationSession.objects.create(
            admin_user=request.user,
            impersonated_user=target,
            reason=reason,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        return Response({'session_id': str(session.id), 'impersonating': target.email}, status=status.HTTP_201_CREATED)


class StopImpersonationAPIView(APIView):
    """Termina la sesión de impersonación activa del admin. Solo staff."""
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        from users.models import AdminImpersonationSession
        from django.utils import timezone as _tz
        session = AdminImpersonationSession.objects.filter(
            admin_user=request.user,
            ended_at__isnull=True,
        ).order_by('-started_at').first()
        if not session:
            return Response({'detail': 'No hay sesión activa'}, status=status.HTTP_404_NOT_FOUND)
        session.ended_at = _tz.now()
        session.save(update_fields=['ended_at'])
        return Response({'detail': 'Sesión finalizada', 'session_id': str(session.id)})