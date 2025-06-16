"""
Vistas para el sistema de calificaciones de VeriHome.
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.http import JsonResponse
from django.db.models import Avg
from django.core.paginator import Paginator
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Rating, RatingCategory, RatingResponse, RatingReport, UserRatingProfile
from .forms import RatingForm, RatingResponseForm, RatingReportForm
from .serializers import (
    RatingSerializer, RatingDetailSerializer, RatingCategorySerializer,
    RatingResponseSerializer, RatingReportSerializer, UserRatingProfileSerializer
)
from contracts.models import Contract


# Vistas web
@login_required
def rating_dashboard(request):
    """Vista del panel de calificaciones del usuario."""
    # Obtener calificaciones recibidas
    ratings_received = Rating.objects.filter(
        reviewee=request.user,
        is_active=True,
        moderation_status='approved'
    ).order_by('-created_at')
    
    # Obtener calificaciones dadas
    ratings_given = Rating.objects.filter(
        reviewer=request.user,
        is_active=True
    ).order_by('-created_at')
    
    # Obtener perfil de calificaciones
    rating_profile, created = UserRatingProfile.objects.get_or_create(user=request.user)
    
    # Paginación
    page = request.GET.get('page', 1)
    paginator = Paginator(ratings_received, 10)
    ratings_page = paginator.get_page(page)
    
    context = {
        'ratings_received': ratings_page,
        'ratings_given': ratings_given,
        'rating_profile': rating_profile,
        'average_rating': ratings_received.aggregate(Avg('overall_rating'))['overall_rating__avg'],
    }
    
    return render(request, 'ratings/dashboard.html', context)


@login_required
def user_ratings(request, user_id):
    """Vista de calificaciones de un usuario específico."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    user = get_object_or_404(User, id=user_id)
    
    # Verificar si el usuario puede ver las calificaciones
    can_view = True  # Por defecto permitimos ver calificaciones públicas
    
    # Obtener calificaciones públicas
    ratings = Rating.objects.filter(
        reviewee=user,
        is_active=True,
        is_public=True,
        moderation_status='approved'
    ).order_by('-created_at')
    
    # Obtener perfil de calificaciones
    rating_profile, created = UserRatingProfile.objects.get_or_create(user=user)
    
    # Paginación
    page = request.GET.get('page', 1)
    paginator = Paginator(ratings, 10)
    ratings_page = paginator.get_page(page)
    
    context = {
        'rated_user': user,
        'ratings': ratings_page,
        'rating_profile': rating_profile,
        'can_rate': False,  # Por defecto no se puede calificar
        'average_rating': ratings.aggregate(Avg('overall_rating'))['overall_rating__avg'],
    }
    
    # Verificar si el usuario actual puede calificar al usuario visualizado
    if request.user.is_authenticated and request.user != user:
        # Verificar si tienen una relación contractual
        contracts = Contract.objects.filter(
            status='fully_signed',
            primary_party__in=[request.user, user],
            secondary_party__in=[request.user, user]
        )
        
        if contracts.exists():
            context['can_rate'] = True
            context['contracts'] = contracts
    
    return render(request, 'ratings/user_ratings.html', context)


@login_required
def create_rating(request, contract_id):
    """Vista para crear una calificación basada en un contrato."""
    contract = get_object_or_404(Contract, id=contract_id)
    
    # Verificar que el usuario sea parte del contrato
    if request.user not in [contract.primary_party, contract.secondary_party]:
        messages.error(request, "No tienes permiso para calificar este contrato.")
        return redirect('ratings:dashboard')
    
    # Determinar quién es la otra parte del contrato
    if request.user == contract.primary_party:
        reviewee = contract.secondary_party
        rating_type = 'landlord_to_tenant' if request.user.user_type == 'landlord' else 'tenant_to_landlord'
    else:
        reviewee = contract.primary_party
        rating_type = 'tenant_to_landlord' if request.user.user_type == 'tenant' else 'landlord_to_tenant'
    
    # Verificar si ya existe una calificación para este contrato
    existing_rating = Rating.objects.filter(
        reviewer=request.user,
        reviewee=reviewee,
        contract=contract
    ).first()
    
    if existing_rating:
        messages.info(request, "Ya has calificado a este usuario para este contrato.")
        return redirect('ratings:rating_detail', rating_id=existing_rating.id)
    
    if request.method == 'POST':
        form = RatingForm(request.POST)
        if form.is_valid():
            rating = form.save(commit=False)
            rating.reviewer = request.user
            rating.reviewee = reviewee
            rating.contract = contract
            rating.rating_type = rating_type
            
            # Si hay una propiedad asociada al contrato, la vinculamos
            if contract.property:
                rating.property = contract.property
            
            rating.save()
            
            # Guardar categorías de calificación
            for category, score in form.cleaned_data.items():
                if category.startswith('category_') and score:
                    category_name = category.replace('category_', '')
                    RatingCategory.objects.create(
                        rating=rating,
                        category=category_name,
                        score=score
                    )
            
            # Actualizar perfil de calificaciones del usuario calificado
            rating_profile, created = UserRatingProfile.objects.get_or_create(user=reviewee)
            rating_profile.update_statistics()
            
            messages.success(request, "Calificación enviada correctamente.")
            return redirect('ratings:rating_detail', rating_id=rating.id)
    else:
        form = RatingForm()
    
    context = {
        'form': form,
        'contract': contract,
        'reviewee': reviewee,
    }
    
    return render(request, 'ratings/create_rating.html', context)


@login_required
def rating_detail(request, rating_id):
    """Vista detallada de una calificación."""
    rating = get_object_or_404(Rating, id=rating_id)
    
    # Verificar permisos para ver la calificación
    if not rating.is_public and request.user not in [rating.reviewer, rating.reviewee]:
        messages.error(request, "No tienes permiso para ver esta calificación.")
        return redirect('ratings:dashboard')
    
    # Obtener categorías de calificación
    categories = rating.category_ratings.all()
    
    # Verificar si el usuario puede responder a la calificación
    can_respond = request.user == rating.reviewee and not hasattr(rating, 'response')
    
    context = {
        'rating': rating,
        'categories': categories,
        'can_respond': can_respond,
    }
    
    return render(request, 'ratings/rating_detail.html', context)


@login_required
def respond_to_rating(request, rating_id):
    """Vista para responder a una calificación."""
    rating = get_object_or_404(Rating, id=rating_id)
    
    # Verificar que el usuario sea el calificado
    if request.user != rating.reviewee:
        messages.error(request, "No puedes responder a una calificación que no es tuya.")
        return redirect('ratings:dashboard')
    
    # Verificar que no exista ya una respuesta
    if hasattr(rating, 'response'):
        messages.info(request, "Ya has respondido a esta calificación.")
        return redirect('ratings:rating_detail', rating_id=rating.id)
    
    if request.method == 'POST':
        form = RatingResponseForm(request.POST)
        if form.is_valid():
            response = form.save(commit=False)
            response.rating = rating
            response.responder = request.user
            response.save()
            
            messages.success(request, "Respuesta enviada correctamente.")
            return redirect('ratings:rating_detail', rating_id=rating.id)
    else:
        form = RatingResponseForm()
    
    context = {
        'form': form,
        'rating': rating,
    }
    
    return render(request, 'ratings/respond_to_rating.html', context)


@login_required
def report_rating(request, rating_id):
    """Vista para reportar una calificación inapropiada."""
    rating = get_object_or_404(Rating, id=rating_id)
    
    # Verificar si ya existe un reporte del usuario
    existing_report = RatingReport.objects.filter(
        rating=rating,
        reporter=request.user
    ).first()
    
    if existing_report:
        messages.info(request, "Ya has reportado esta calificación.")
        return redirect('ratings:rating_detail', rating_id=rating.id)
    
    if request.method == 'POST':
        form = RatingReportForm(request.POST)
        if form.is_valid():
            report = form.save(commit=False)
            report.rating = rating
            report.reporter = request.user
            report.save()
            
            # Marcar la calificación para revisión
            rating.is_flagged = True
            rating.save(update_fields=['is_flagged'])
            
            messages.success(request, "Reporte enviado correctamente. Un moderador revisará la calificación.")
            return redirect('ratings:rating_detail', rating_id=rating.id)
    else:
        form = RatingReportForm()
    
    context = {
        'form': form,
        'rating': rating,
    }
    
    return render(request, 'ratings/report_rating.html', context)


# Vistas de API
class RatingListCreateView(generics.ListCreateAPIView):
    """API para listar y crear calificaciones."""
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar calificaciones según el usuario."""
        user = self.request.user
        
        # Administradores pueden ver todas las calificaciones
        if user.is_staff:
            return Rating.objects.all().order_by('-created_at')
        
        # Usuarios normales ven sus calificaciones dadas y recibidas
        return Rating.objects.filter(
            models.Q(reviewer=user) | models.Q(reviewee=user, is_public=True)
        ).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Personalizar la creación de calificaciones."""
        contract_id = self.request.data.get('contract')
        reviewee_id = self.request.data.get('reviewee')
        
        if contract_id:
            contract = get_object_or_404(Contract, id=contract_id)
            
            # Verificar que el usuario sea parte del contrato
            if self.request.user not in [contract.primary_party, contract.secondary_party]:
                raise permissions.PermissionDenied("No tienes permiso para calificar este contrato.")
            
            # Determinar el tipo de calificación
            if self.request.user == contract.primary_party:
                rating_type = 'landlord_to_tenant' if self.request.user.user_type == 'landlord' else 'tenant_to_landlord'
            else:
                rating_type = 'tenant_to_landlord' if self.request.user.user_type == 'tenant' else 'landlord_to_tenant'
            
            # Guardar la calificación
            serializer.save(
                reviewer=self.request.user,
                rating_type=rating_type,
                contract=contract,
                property=contract.property
            )
        else:
            # Calificación general sin contrato
            serializer.save(reviewer=self.request.user, rating_type='general')


class RatingDetailView(generics.RetrieveUpdateDestroyAPIView):
    """API para ver, actualizar o eliminar una calificación específica."""
    serializer_class = RatingDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Rating.objects.all()
    
    def get_object(self):
        """Verificar permisos para acceder a la calificación."""
        obj = super().get_object()
        user = self.request.user
        
        # Verificar permisos
        if user.is_staff or user == obj.reviewer or (user == obj.reviewee and obj.is_public):
            return obj
        
        raise permissions.PermissionDenied("No tienes permiso para acceder a esta calificación.")
    
    def perform_update(self, serializer):
        """Personalizar la actualización de calificaciones."""
        # Solo el autor puede actualizar la calificación
        if self.request.user != self.get_object().reviewer:
            raise permissions.PermissionDenied("No puedes modificar una calificación que no es tuya.")
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """Personalizar la eliminación de calificaciones."""
        # Solo el autor o un administrador puede eliminar la calificación
        if self.request.user != instance.reviewer and not self.request.user.is_staff:
            raise permissions.PermissionDenied("No puedes eliminar una calificación que no es tuya.")
        
        instance.delete()


class RatingResponseCreateView(generics.CreateAPIView):
    """API para responder a una calificación."""
    serializer_class = RatingResponseSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        """Personalizar la creación de respuestas."""
        rating_id = self.kwargs.get('rating_id')
        rating = get_object_or_404(Rating, id=rating_id)
        
        # Verificar que el usuario sea el calificado
        if self.request.user != rating.reviewee:
            raise permissions.PermissionDenied("No puedes responder a una calificación que no es tuya.")
        
        # Verificar que no exista ya una respuesta
        if hasattr(rating, 'response'):
            return Response(
                {"detail": "Ya has respondido a esta calificación."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer.save(rating=rating, responder=self.request.user)


class RatingReportCreateView(generics.CreateAPIView):
    """API para reportar una calificación."""
    serializer_class = RatingReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def perform_create(self, serializer):
        """Personalizar la creación de reportes."""
        rating_id = self.kwargs.get('rating_id')
        rating = get_object_or_404(Rating, id=rating_id)
        
        # Verificar que no exista ya un reporte del usuario
        existing_report = RatingReport.objects.filter(
            rating=rating,
            reporter=self.request.user
        ).first()
        
        if existing_report:
            return Response(
                {"detail": "Ya has reportado esta calificación."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Guardar el reporte y marcar la calificación
        report = serializer.save(rating=rating, reporter=self.request.user)
        rating.is_flagged = True
        rating.save(update_fields=['is_flagged'])


class UserRatingsView(generics.ListAPIView):
    """API para obtener las calificaciones de un usuario específico."""
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar calificaciones por usuario."""
        user_id = self.kwargs.get('user_id')
        
        # Obtener calificaciones públicas
        return Rating.objects.filter(
            reviewee_id=user_id,
            is_active=True,
            is_public=True,
            moderation_status='approved'
        ).order_by('-created_at')


class UserRatingProfileView(generics.RetrieveAPIView):
    """API para obtener el perfil de calificaciones de un usuario."""
    serializer_class = UserRatingProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        """Obtener el perfil de calificaciones del usuario."""
        user_id = self.kwargs.get('user_id')
        profile, created = UserRatingProfile.objects.get_or_create(user_id=user_id)
        return profile


class ContractRatingsView(generics.ListAPIView):
    """API para obtener las calificaciones asociadas a un contrato."""
    serializer_class = RatingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar calificaciones por contrato."""
        contract_id = self.kwargs.get('contract_id')
        contract = get_object_or_404(Contract, id=contract_id)
        
        # Verificar que el usuario sea parte del contrato
        if self.request.user not in [contract.primary_party, contract.secondary_party]:
            raise permissions.PermissionDenied("No tienes permiso para ver estas calificaciones.")
        
        return Rating.objects.filter(contract=contract).order_by('-created_at')


class RatingCategoryListCreateView(generics.ListCreateAPIView):
    """API para listar y crear categorías de calificación."""
    serializer_class = RatingCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar categorías por calificación."""
        rating_id = self.request.query_params.get('rating_id')
        
        if rating_id:
            return RatingCategory.objects.filter(rating_id=rating_id)
        
        # Si no se especifica una calificación, devolver categorías del usuario
        return RatingCategory.objects.filter(
            rating__reviewer=self.request.user
        ).order_by('rating', 'category')
    
    def perform_create(self, serializer):
        """Personalizar la creación de categorías."""
        rating_id = self.request.data.get('rating')
        rating = get_object_or_404(Rating, id=rating_id)
        
        # Verificar que el usuario sea el autor de la calificación
        if self.request.user != rating.reviewer:
            raise permissions.PermissionDenied("No puedes añadir categorías a una calificación que no es tuya.")
        
        serializer.save()