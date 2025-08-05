"""
Vistas para el sistema de administración avanzada y impersonación.
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from django.db.models import Q, Count
from django.core.paginator import Paginator
from django.contrib.auth import get_user_model
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import (
    AdminImpersonationSession, AdminActionLog, AdminPermission,
    User, UserProfile
)
from .serializers import UserSerializer, UserProfileSerializer

User = get_user_model()


def is_superuser(user):
    """Verificar si el usuario es superusuario."""
    return user.is_superuser


@login_required
@user_passes_test(is_superuser)
def admin_dashboard(request):
    """Dashboard principal para administradores."""
    
    # Estadísticas generales
    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()
    total_contracts = Contract.objects.count() if 'contracts' in apps else 0
    total_payments = Transaction.objects.count() if 'payments' in apps else 0
    total_properties = Property.objects.count() if 'properties' in apps else 0
    
    # Sesiones de impersonación activas
    active_impersonations = AdminImpersonationSession.objects.filter(
        is_active=True
    ).count()
    
    # Acciones administrativas recientes
    recent_actions = AdminActionLog.objects.select_related(
        'impersonation_session__admin_user',
        'impersonation_session__impersonated_user'
    ).order_by('-timestamp')[:10]
    
    context = {
        'total_users': total_users,
        'active_users': active_users,
        'total_contracts': total_contracts,
        'total_payments': total_payments,
        'total_properties': total_properties,
        'active_impersonations': active_impersonations,
        'recent_actions': recent_actions,
    }
    
    return render(request, 'users/admin/dashboard.html', context)


@login_required
@user_passes_test(is_superuser)
def user_management(request):
    """Gestión de usuarios."""
    
    # Filtros
    search = request.GET.get('search', '')
    user_type = request.GET.get('user_type', '')
    status_filter = request.GET.get('status', '')
    
    users = User.objects.select_related('profile').all()
    
    if search:
        users = users.filter(
            Q(email__icontains=search) |
            Q(first_name__icontains=search) |
            Q(last_name__icontains=search) |
            Q(profile__phone__icontains=search)
        )
    
    if user_type:
        users = users.filter(profile__user_type=user_type)
    
    if status_filter == 'active':
        users = users.filter(is_active=True)
    elif status_filter == 'inactive':
        users = users.filter(is_active=False)
    
    # Paginación
    paginator = Paginator(users, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'search': search,
        'user_type': user_type,
        'status_filter': status_filter,
    }
    
    return render(request, 'users/admin/user_management.html', context)


@login_required
@user_passes_test(is_superuser)
def start_impersonation(request, user_id):
    """Iniciar impersonación de un usuario."""
    
    target_user = get_object_or_404(User, id=user_id)
    
    # Verificar que no esté ya impersonando
    if request.session.get('impersonation_id'):
        messages.error(request, 'Ya tienes una sesión de impersonación activa.')
        return redirect('admin_dashboard')
    
    # Crear sesión de impersonación
    impersonation = AdminImpersonationSession.objects.create(
        admin_user=request.user,
        impersonated_user=target_user,
        session_key=request.session.session_key,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        reason=request.POST.get('reason', '')
    )
    
    # Guardar ID en sesión
    request.session['impersonation_id'] = impersonation.id
    
    messages.success(
        request, 
        f'Ahora estás impersonando a {target_user.get_full_name()}'
    )
    
    # Redirigir al dashboard del usuario
    return redirect('dashboard')


@login_required
@user_passes_test(is_superuser)
def stop_impersonation(request):
    """Detener la impersonación actual."""
    
    impersonation_id = request.session.get('impersonation_id')
    
    if impersonation_id:
        try:
            impersonation = AdminImpersonationSession.objects.get(
                id=impersonation_id,
                admin_user=request.user,
                is_active=True
            )
            
            # Terminar sesión
            impersonation.ended_at = timezone.now()
            impersonation.is_active = False
            impersonation.save()
            
            # Limpiar sesión
            del request.session['impersonation_id']
            
            messages.success(request, 'Sesión de impersonación terminada.')
            
        except AdminImpersonationSession.DoesNotExist:
            messages.error(request, 'No se encontró la sesión de impersonación.')
    
    return redirect('admin_dashboard')


@login_required
@user_passes_test(is_superuser)
def impersonation_sessions(request):
    """Listar sesiones de impersonación."""
    
    sessions = AdminImpersonationSession.objects.select_related(
        'admin_user', 'impersonated_user'
    ).order_by('-started_at')
    
    # Filtros
    admin_user = request.GET.get('admin_user', '')
    status_filter = request.GET.get('status', '')
    
    if admin_user:
        sessions = sessions.filter(admin_user__email__icontains=admin_user)
    
    if status_filter == 'active':
        sessions = sessions.filter(is_active=True)
    elif status_filter == 'ended':
        sessions = sessions.filter(is_active=False)
    
    # Paginación
    paginator = Paginator(sessions, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'admin_user': admin_user,
        'status_filter': status_filter,
    }
    
    return render(request, 'users/admin/impersonation_sessions.html', context)


@login_required
@user_passes_test(is_superuser)
def admin_action_logs(request):
    """Registro de acciones administrativas."""
    
    actions = AdminActionLog.objects.select_related(
        'impersonation_session__admin_user',
        'impersonation_session__impersonated_user'
    ).order_by('-timestamp')
    
    # Filtros
    action_type = request.GET.get('action_type', '')
    admin_user = request.GET.get('admin_user', '')
    success_filter = request.GET.get('success', '')
    
    if action_type:
        actions = actions.filter(action_type=action_type)
    
    if admin_user:
        actions = actions.filter(
            impersonation_session__admin_user__email__icontains=admin_user
        )
    
    if success_filter == 'success':
        actions = actions.filter(success=True)
    elif success_filter == 'error':
        actions = actions.filter(success=False)
    
    # Paginación
    paginator = Paginator(actions, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'action_type': action_type,
        'admin_user': admin_user,
        'success_filter': success_filter,
        'action_types': AdminActionLog.ACTION_TYPES,
    }
    
    return render(request, 'users/admin/action_logs.html', context)


@login_required
@user_passes_test(is_superuser)
def admin_permissions(request):
    """Gestión de permisos administrativos."""
    
    permissions = AdminPermission.objects.select_related(
        'admin_user', 'granted_by'
    ).order_by('admin_user', 'module', 'permission_type')
    
    # Filtros
    admin_user = request.GET.get('admin_user', '')
    module = request.GET.get('module', '')
    
    if admin_user:
        permissions = permissions.filter(
            admin_user__email__icontains=admin_user
        )
    
    if module:
        permissions = permissions.filter(module=module)
    
    # Paginación
    paginator = Paginator(permissions, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'admin_user': admin_user,
        'module': module,
        'modules': AdminPermission.PERMISSION_MODULES,
        'permission_types': AdminPermission.PERMISSION_TYPES,
    }
    
    return render(request, 'users/admin/permissions.html', context)


# API Views para funcionalidades administrativas
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_start_impersonation(request):
    """API para iniciar impersonación."""
    
    if not request.user.is_superuser:
        return Response(
            {'error': 'No tienes permisos para impersonar usuarios'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    user_id = request.data.get('user_id')
    reason = request.data.get('reason', '')
    
    if not user_id:
        return Response(
            {'error': 'user_id es requerido'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response(
            {'error': 'Usuario no encontrado'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Crear sesión de impersonación
    impersonation = AdminImpersonationSession.objects.create(
        admin_user=request.user,
        impersonated_user=target_user,
        session_key=request.session.session_key,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', ''),
        reason=reason
    )
    
    request.session['impersonation_id'] = impersonation.id
    
    return Response({
        'success': True,
        'message': f'Impersonando a {target_user.get_full_name()}',
        'impersonation_id': impersonation.id
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_stop_impersonation(request):
    """API para detener impersonación."""
    
    impersonation_id = request.session.get('impersonation_id')
    
    if not impersonation_id:
        return Response(
            {'error': 'No hay sesión de impersonación activa'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        impersonation = AdminImpersonationSession.objects.get(
            id=impersonation_id,
            admin_user=request.user,
            is_active=True
        )
        
        impersonation.ended_at = timezone.now()
        impersonation.is_active = False
        impersonation.save()
        
        del request.session['impersonation_id']
        
        return Response({
            'success': True,
            'message': 'Sesión de impersonación terminada'
        })
        
    except AdminImpersonationSession.DoesNotExist:
        return Response(
            {'error': 'Sesión de impersonación no encontrada'},
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_admin_stats(request):
    """API para estadísticas administrativas."""
    
    if not request.user.is_superuser:
        return Response(
            {'error': 'No tienes permisos de administrador'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Importar modelos dinámicamente para evitar errores de importación
    try:
        from contracts.models import Contract
        from payments.models import Transaction
        from properties.models import Property
        
        stats = {
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'total_contracts': Contract.objects.count(),
            'total_payments': Transaction.objects.count(),
            'total_properties': Property.objects.count(),
            'active_impersonations': AdminImpersonationSession.objects.filter(
                is_active=True
            ).count(),
            'recent_actions': AdminActionLog.objects.count(),
        }
    except ImportError:
        # Si algún modelo no está disponible
        stats = {
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'total_contracts': 0,
            'total_payments': 0,
            'total_properties': 0,
            'active_impersonations': AdminImpersonationSession.objects.filter(
                is_active=True
            ).count(),
            'recent_actions': AdminActionLog.objects.count(),
        }
    
    return Response(stats) 