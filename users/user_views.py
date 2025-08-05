"""
Vistas para que los usuarios vean su historial de actividad y acciones administrativas.
"""

from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.http import JsonResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import UserActivityLog, UserActionNotification, AdminActionLog
from .services import UserActivityService, AdminSessionService


@login_required
def user_activity_dashboard(request):
    """Dashboard de actividad del usuario."""
    
    # Obtener resumen de actividad
    activity_summary = UserActivityService.get_user_activity_summary(
        request.user, days=30
    )
    
    # Obtener notificaciones no leídas
    unread_notifications = UserActivityService.get_user_notifications(
        request.user, unread_only=True
    )
    
    # Obtener acciones administrativas recientes
    admin_actions = UserActivityService.get_admin_actions_on_user(
        request.user, days=30
    )[:5]
    
    context = {
        'activity_summary': activity_summary,
        'unread_notifications': unread_notifications,
        'admin_actions': admin_actions,
    }
    
    return render(request, 'users/activity_dashboard.html', context)


@login_required
def user_activity_history(request):
    """Historial completo de actividad del usuario."""
    
    # Filtros
    activity_type = request.GET.get('activity_type', '')
    performed_by_admin = request.GET.get('performed_by_admin', '')
    days = int(request.GET.get('days', 30))
    
    activities = UserActivityLog.objects.filter(user=request.user)
    
    if activity_type:
        activities = activities.filter(activity_type=activity_type)
    
    if performed_by_admin == 'admin':
        activities = activities.filter(performed_by_admin=True)
    elif performed_by_admin == 'user':
        activities = activities.filter(performed_by_admin=False)
    
    # Filtrar por días
    if days > 0:
        from datetime import timedelta
        start_date = timezone.now() - timedelta(days=days)
        activities = activities.filter(timestamp__gte=start_date)
    
    # Paginación
    paginator = Paginator(activities, 20)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Tipos de actividad disponibles
    activity_types = UserActivityLog.objects.filter(
        user=request.user
    ).values_list('activity_type', flat=True).distinct()
    
    context = {
        'page_obj': page_obj,
        'activity_type': activity_type,
        'performed_by_admin': performed_by_admin,
        'days': days,
        'activity_types': activity_types,
    }
    
    return render(request, 'users/activity_history.html', context)


@login_required
def admin_actions_on_user(request):
    """Acciones administrativas realizadas sobre el usuario."""
    
    # Filtros
    action_type = request.GET.get('action_type', '')
    success_filter = request.GET.get('success', '')
    days = int(request.GET.get('days', 90))
    
    admin_actions = UserActivityService.get_admin_actions_on_user(request.user, days)
    
    if action_type:
        admin_actions = admin_actions.filter(action_type=action_type)
    
    if success_filter == 'success':
        admin_actions = admin_actions.filter(success=True)
    elif success_filter == 'error':
        admin_actions = admin_actions.filter(success=False)
    
    # Paginación
    paginator = Paginator(admin_actions, 15)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Tipos de acción disponibles
    action_types = AdminActionLog.objects.filter(
        impersonation_session__impersonated_user=request.user
    ).values_list('action_type', flat=True).distinct()
    
    context = {
        'page_obj': page_obj,
        'action_type': action_type,
        'success_filter': success_filter,
        'days': days,
        'action_types': action_types,
    }
    
    return render(request, 'users/admin_actions.html', context)


@login_required
def user_notifications(request):
    """Notificaciones del usuario sobre acciones administrativas."""
    
    # Filtros
    notification_type = request.GET.get('notification_type', '')
    status_filter = request.GET.get('status', '')
    
    notifications = UserActivityService.get_user_notifications(request.user)
    
    if notification_type:
        notifications = notifications.filter(notification_type=notification_type)
    
    if status_filter:
        notifications = notifications.filter(status=status_filter)
    
    # Paginación
    paginator = Paginator(notifications, 15)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
        'notification_type': notification_type,
        'status_filter': status_filter,
    }
    
    return render(request, 'users/notifications.html', context)


@login_required
def impersonation_history(request):
    """Historial de sesiones de impersonación del usuario."""
    
    impersonation_sessions = AdminSessionService.get_impersonation_history(request.user)
    
    # Paginación
    paginator = Paginator(impersonation_sessions, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    context = {
        'page_obj': page_obj,
    }
    
    return render(request, 'users/impersonation_history.html', context)


@login_required
def activity_detail(request, activity_id):
    """Detalle de una actividad específica."""
    
    try:
        activity = UserActivityLog.objects.get(
            id=activity_id,
            user=request.user
        )
    except UserActivityLog.DoesNotExist:
        return redirect('user_activity_history')
    
    context = {
        'activity': activity,
    }
    
    return render(request, 'users/activity_detail.html', context)


@login_required
def admin_action_detail(request, action_id):
    """Detalle de una acción administrativa específica."""
    
    try:
        admin_action = AdminActionLog.objects.get(
            id=action_id,
            impersonation_session__impersonated_user=request.user
        )
    except AdminActionLog.DoesNotExist:
        return redirect('admin_actions_on_user')
    
    context = {
        'admin_action': admin_action,
    }
    
    return render(request, 'users/admin_action_detail.html', context)


@login_required
def mark_notification_read(request, notification_id):
    """Marcar una notificación como leída."""
    
    try:
        notification = UserActionNotification.objects.get(
            id=notification_id,
            user=request.user
        )
        notification.mark_as_read()
        return JsonResponse({'success': True})
    except UserActionNotification.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Notificación no encontrada'})


@login_required
def mark_all_notifications_read(request):
    """Marcar todas las notificaciones como leídas."""
    
    unread_notifications = UserActivityService.get_user_notifications(
        request.user, unread_only=True
    )
    
    for notification in unread_notifications:
        notification.mark_as_read()
    
    return JsonResponse({'success': True, 'count': unread_notifications.count()})


# API Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_user_activity_summary(request):
    """API para obtener resumen de actividad del usuario."""
    
    days = int(request.GET.get('days', 30))
    activity_summary = UserActivityService.get_user_activity_summary(
        request.user, days=days
    )
    
    return Response(activity_summary)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_user_notifications(request):
    """API para obtener notificaciones del usuario."""
    
    unread_only = request.GET.get('unread_only', 'false').lower() == 'true'
    notifications = UserActivityService.get_user_notifications(
        request.user, unread_only=unread_only
    )
    
    # Serializar notificaciones
    notification_data = []
    for notification in notifications:
        notification_data.append({
            'id': notification.id,
            'title': notification.title,
            'summary': notification.summary,
            'status': notification.status,
            'created_at': notification.created_at,
            'read_at': notification.read_at,
            'admin_action': {
                'action_type': notification.admin_action.get_action_type_display(),
                'description': notification.admin_action.action_description,
                'timestamp': notification.admin_action.timestamp,
                'admin_user': notification.admin_action.impersonation_session.admin_user.get_full_name(),
            } if notification.admin_action else None
        })
    
    return Response({
        'notifications': notification_data,
        'total_count': notifications.count(),
        'unread_count': UserActivityService.get_user_notifications(
            request.user, unread_only=True
        ).count()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def api_admin_actions_on_user(request):
    """API para obtener acciones administrativas sobre el usuario."""
    
    days = int(request.GET.get('days', 30))
    admin_actions = UserActivityService.get_admin_actions_on_user(
        request.user, days=days
    )
    
    # Serializar acciones
    actions_data = []
    for action in admin_actions:
        actions_data.append({
            'id': action.id,
            'action_type': action.get_action_type_display(),
            'description': action.action_description,
            'timestamp': action.timestamp,
            'success': action.success,
            'admin_user': action.impersonation_session.admin_user.get_full_name(),
            'changes': action.get_changes_summary(),
            'target_object': {
                'type': action.target_object_type,
                'name': action.target_object_name,
            } if action.target_object_name else None
        })
    
    return Response({
        'actions': actions_data,
        'total_count': admin_actions.count(),
        'successful_count': admin_actions.filter(success=True).count(),
        'failed_count': admin_actions.filter(success=False).count(),
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def api_mark_notification_read(request, notification_id):
    """API para marcar notificación como leída."""
    
    try:
        notification = UserActionNotification.objects.get(
            id=notification_id,
            user=request.user
        )
        notification.mark_as_read()
        return Response({'success': True})
    except UserActionNotification.DoesNotExist:
        return Response(
            {'success': False, 'error': 'Notificación no encontrada'},
            status=404
        ) 