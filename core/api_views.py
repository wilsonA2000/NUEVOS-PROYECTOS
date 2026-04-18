"""
Vistas de API REST para la aplicación core de VeriHome.
"""

from rest_framework import viewsets, generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action, api_view, permission_classes
from django.db.models import Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from django.http import JsonResponse
from rest_framework.permissions import AllowAny
from django.conf import settings

from .models import Notification, ActivityLog, SystemAlert, ContactMessage, SupportTicket, TicketResponse, FAQ
from .serializers import NotificationSerializer, ActivityLogSerializer, SystemAlertSerializer, SupportTicketSerializer, TicketResponseSerializer
from django.core.mail import send_mail
from rest_framework.throttling import AnonRateThrottle
import logging

logger = logging.getLogger(__name__)


class ContactRateThrottle(AnonRateThrottle):
    """Limitar a 5 mensajes de contacto por hora por IP.

    Se desactiva en testing para evitar 429 espurios cuando múltiples
    test suites hacen POST al endpoint de contacto.
    """
    rate = '5/hour'

    def allow_request(self, request, view):
        if getattr(settings, 'TESTING', False):
            return True
        return super().allow_request(request, view)


class ContactMessageAPIView(APIView):
    """Endpoint público para recibir mensajes del formulario de contacto."""
    permission_classes = [AllowAny]
    throttle_classes = [ContactRateThrottle]

    def post(self, request):
        name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip()
        subject = request.data.get('subject', '').strip()
        message = request.data.get('message', '').strip()

        # Validación
        errors = {}
        if not name:
            errors['name'] = 'El nombre es obligatorio.'
        if not email:
            errors['email'] = 'El email es obligatorio.'
        if not subject:
            errors['subject'] = 'El asunto es obligatorio.'
        if not message:
            errors['message'] = 'El mensaje es obligatorio.'
        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

        # Obtener IP del cliente
        x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
        ip = x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR')

        # Guardar en base de datos
        contact = ContactMessage.objects.create(
            name=name,
            email=email,
            subject=subject,
            message=message,
            ip_address=ip,
        )

        # Enviar notificación por email al admin
        email_sent = False
        try:
            admin_email = getattr(settings, 'EMAIL_HOST_USER', '')
            if admin_email:
                send_mail(
                    subject=f'[VeriHome Contacto] {subject}',
                    message=(
                        f'Nuevo mensaje de contacto recibido:\n\n'
                        f'Nombre: {name}\n'
                        f'Email: {email}\n'
                        f'Asunto: {subject}\n\n'
                        f'Mensaje:\n{message}\n\n'
                        f'---\n'
                        f'IP: {ip}\n'
                        f'Fecha: {contact.created_at}\n'
                        f'ID: {contact.id}\n\n'
                        f'Responde directamente a este correo o gestiona desde el panel admin.'
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[admin_email],
                    fail_silently=False,
                    html_message=(
                        f'<h2>Nuevo mensaje de contacto</h2>'
                        f'<table style="border-collapse:collapse;width:100%;max-width:600px;">'
                        f'<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Nombre</td>'
                        f'<td style="padding:8px;border:1px solid #ddd;">{name}</td></tr>'
                        f'<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td>'
                        f'<td style="padding:8px;border:1px solid #ddd;"><a href="mailto:{email}">{email}</a></td></tr>'
                        f'<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Asunto</td>'
                        f'<td style="padding:8px;border:1px solid #ddd;">{subject}</td></tr>'
                        f'<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Mensaje</td>'
                        f'<td style="padding:8px;border:1px solid #ddd;">{message}</td></tr>'
                        f'</table>'
                        f'<br><small style="color:#888;">IP: {ip} | ID: {contact.id}</small>'
                    ),
                )
                email_sent = True
        except Exception as e:
            logger.warning(f'No se pudo enviar email de contacto: {e}')

        contact.email_notified = email_sent
        contact.save(update_fields=['email_notified'])

        # Auto-crear ticket de soporte para seguimiento interno
        try:
            from .models import SupportTicket
            # Determinar departamento según asunto
            subject_lower = subject.lower()
            if any(w in subject_lower for w in ['contrato', 'arriendo', 'legal', 'juridic']):
                dept = 'legal'
            elif any(w in subject_lower for w in ['pago', 'factura', 'cobro', 'dinero']):
                dept = 'billing'
            elif any(w in subject_lower for w in ['verificaci', 'visita', 'agente']):
                dept = 'verification_agents'
            elif any(w in subject_lower for w in ['servicio', 'mantenimiento', 'reparaci']):
                dept = 'technical'
            else:
                dept = 'general'

            SupportTicket.objects.create(
                subject=f'[Contacto Web] {subject}',
                description=f'Mensaje de {name} ({email}):\n\n{message}',
                category='other',
                department=dept,
                priority='normal',
                contact_message=contact,
                ip_address=ip,
            )
        except Exception as e:
            logger.warning(f'No se pudo crear ticket desde contacto: {e}')

        return Response(
            {'message': '¡Mensaje enviado exitosamente! Te responderemos pronto.', 'email_sent': email_sent},
            status=status.HTTP_201_CREATED,
        )


class FAQListAPIView(APIView):
    """Endpoint público para obtener FAQs publicadas."""
    permission_classes = [AllowAny]

    def get(self, request):
        category = request.query_params.get('category')
        qs = FAQ.objects.filter(is_published=True).order_by('category', 'order')
        if category:
            qs = qs.filter(category=category)
        data = [
            {
                'id': faq.id,
                'question': faq.question,
                'answer': faq.answer,
                'category': faq.category,
                'category_display': faq.get_category_display(),
            }
            for faq in qs
        ]
        return Response(data)


class SupportTicketViewSet(viewsets.ModelViewSet):
    """
    Gestión de tickets de soporte interno.
    Staff ve todos los tickets. Usuarios normales solo los suyos.
    """
    serializer_class = SupportTicketSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = SupportTicket.objects.select_related('created_by', 'assigned_to').prefetch_related('responses')
        if not self.request.user.is_staff:
            return qs.filter(created_by=self.request.user)

        # Filtros para staff
        dept = self.request.query_params.get('department')
        if dept:
            qs = qs.filter(department=dept)
        stat = self.request.query_params.get('status')
        if stat:
            qs = qs.filter(status=stat)
        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Asignar ticket a un miembro del staff."""
        ticket = self.get_object()
        if not request.user.is_staff:
            return Response({'error': 'Solo staff puede asignar tickets'}, status=status.HTTP_403_FORBIDDEN)
        staff_id = request.data.get('assigned_to')
        if staff_id:
            try:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                staff_user = User.objects.get(id=staff_id, is_staff=True)
                ticket.assigned_to = staff_user
            except User.DoesNotExist:
                return Response({'error': 'Usuario staff no encontrado'}, status=status.HTTP_404_NOT_FOUND)
        ticket.status = 'in_progress'
        ticket.save(update_fields=['assigned_to', 'status', 'updated_at'])
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=['post'])
    def respond(self, request, pk=None):
        """Agregar respuesta a un ticket. ADM-03: acepta `message` o `response`."""
        ticket = self.get_object()
        message = (request.data.get('message') or request.data.get('response') or '').strip()
        if not message:
            return Response({'error': 'El mensaje es obligatorio (campo `message` o `response`)'}, status=status.HTTP_400_BAD_REQUEST)
        is_internal = request.data.get('is_internal', False) and request.user.is_staff
        response_obj = TicketResponse.objects.create(
            ticket=ticket,
            author=request.user,
            message=message,
            is_internal=is_internal,
        )
        if request.user.is_staff and ticket.status == 'open':
            ticket.status = 'in_progress'
            ticket.save(update_fields=['status', 'updated_at'])
        return Response(TicketResponseSerializer(response_obj).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Marcar ticket como resuelto."""
        ticket = self.get_object()
        if not request.user.is_staff:
            return Response({'error': 'Solo staff puede resolver tickets'}, status=status.HTTP_403_FORBIDDEN)
        ticket.status = 'resolved'
        ticket.resolved_at = timezone.now()
        ticket.save(update_fields=['status', 'resolved_at', 'updated_at'])
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Cerrar ticket definitivamente."""
        ticket = self.get_object()
        ticket.status = 'closed'
        ticket.closed_at = timezone.now()
        ticket.save(update_fields=['status', 'closed_at', 'updated_at'])
        return Response(self.get_serializer(ticket).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas de tickets (solo staff)."""
        if not request.user.is_staff:
            return Response({'error': 'Solo staff'}, status=status.HTTP_403_FORBIDDEN)
        from django.db.models import Count
        qs = SupportTicket.objects.all()
        by_status = dict(qs.values_list('status').annotate(c=Count('id')).values_list('status', 'c'))
        by_dept = dict(qs.values_list('department').annotate(c=Count('id')).values_list('department', 'c'))
        by_priority = dict(qs.values_list('priority').annotate(c=Count('id')).values_list('priority', 'c'))
        open_tickets = qs.filter(status__in=['open', 'in_progress']).count()
        return Response({
            'total': qs.count(),
            'open': open_tickets,
            'by_status': by_status,
            'by_department': by_dept,
            'by_priority': by_priority,
        })


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet para notificaciones."""
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'count': count})
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """Marca todas las notificaciones como leídas."""
        updated = self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        # Log actividad (comentado temporalmente)
        # audit_service.log_user_activity(
        #     user=request.user,
        #     action_type='update',
        #     description=f'Marked {updated} notifications as read',
        #     details={'notifications_marked': updated},
        #     ip_address=get_client_ip(request),
        #     user_agent=request.META.get('HTTP_USER_AGENT', '')
        # )
        
        return Response({'message': f'Marked {updated} notifications as read'})
    
    def perform_create(self, serializer):
        notification = serializer.save(user=self.request.user)
        
        # Log actividad (comentado temporalmente)
        # audit_service.log_user_activity(
        #     user=self.request.user,
        #     action_type='create',
        #     description=f'Created notification: {notification.title}',
        #     target_object=notification,
        #     ip_address=get_client_ip(self.request),
        #     user_agent=self.request.META.get('HTTP_USER_AGENT', '')
        # )


class ActivityLogViewSet(viewsets.ModelViewSet):
    """ViewSet para logs de actividad."""
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ActivityLog.objects.filter(user=self.request.user).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Asegura que el log se asigne al usuario actual."""
        serializer.save(user=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Override create para manejar errores silenciosamente."""
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            # Los logs de actividad pueden fallar silenciosamente
            return Response({
                'message': 'Activity log creation failed but application continues',
                'error': str(e)
            }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def bulk(self, request):
        """Endpoint para crear múltiples logs de actividad en lote."""
        try:
            logs_data = request.data.get('logs', [])
            if not logs_data:
                return Response({'message': 'No logs provided'}, status=status.HTTP_400_BAD_REQUEST)
            
            created_logs = []
            for log_data in logs_data:
                # Agregar el usuario actual a cada log
                log_data['user'] = request.user.id
                serializer = ActivityLogSerializer(data=log_data)
                if serializer.is_valid():
                    created_logs.append(serializer.save())
            
            return Response({
                'message': f'Created {len(created_logs)} activity logs',
                'count': len(created_logs)
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # Log de actividad puede fallar silenciosamente para no interrumpir la app
            return Response({
                'message': 'Activity logs creation failed but application continues',
                'error': str(e)
            }, status=status.HTTP_200_OK)


class SystemAlertViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para alertas del sistema."""
    serializer_class = SystemAlertSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = SystemAlert.objects.filter(is_active=True).order_by('-created_at')


class UnreadNotificationCountAPIView(APIView):
    """Vista para obtener el conteo de notificaciones no leídas."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        count = Notification.objects.filter(
            user=request.user,
            is_read=False
        ).count()
        
        return Response({'count': count})


class MarkAllNotificationsReadAPIView(APIView):
    """Vista para marcar todas las notificaciones como leídas."""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return Response({'message': 'Todas las notificaciones han sido marcadas como leídas'})


class GlobalAuditLogAPIView(generics.ListAPIView):
    """
    ADM-04: listar audit trail global (todos los usuarios).
    Solo accesible a staff; soporta filtros por `user`, `activity_type`,
    `model_name` y `days` (últimos N días) vía query params.
    """
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        from users.serializers import UserActivityLogSerializer
        return UserActivityLogSerializer

    def get_queryset(self):
        from users.models.activity import UserActivityLog
        qs = UserActivityLog.objects.select_related('user').all()

        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)

        activity_type = self.request.query_params.get('activity_type')
        if activity_type:
            qs = qs.filter(activity_type=activity_type)

        model_name = self.request.query_params.get('model_name')
        if model_name:
            qs = qs.filter(model_name=model_name)

        days = self.request.query_params.get('days')
        if days:
            try:
                since = timezone.now() - timedelta(days=int(days))
                qs = qs.filter(timestamp__gte=since)
            except (ValueError, TypeError):
                pass

        # ADM-001: rango explícito de fechas (ISO 8601).
        date_from = self.request.query_params.get('date_from')
        if date_from:
            try:
                qs = qs.filter(timestamp__gte=datetime.fromisoformat(date_from))
            except (ValueError, TypeError):
                pass

        date_to = self.request.query_params.get('date_to')
        if date_to:
            try:
                qs = qs.filter(timestamp__lte=datetime.fromisoformat(date_to))
            except (ValueError, TypeError):
                pass

        return qs.order_by('-timestamp')


class SLADashboardAPIView(APIView):
    """
    ADM-02: dashboard de cumplimiento SLA de revisión jurídica de contratos.
    Solo staff. Devuelve contratos en revisión admin con estado del plazo
    (a tiempo, por vencer, vencido, escalado).
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from contracts.landlord_contract_models import LandlordControlledContract
        now = timezone.now()

        in_review = LandlordControlledContract.objects.filter(
            current_state__in=['PENDING_ADMIN_REVIEW', 'RE_PENDING_ADMIN']
        ).select_related('landlord', 'admin_reviewer')

        buckets = {'on_time': [], 'due_soon': [], 'overdue': [], 'escalated': []}
        for c in in_review:
            deadline = c.admin_review_deadline
            entry = {
                'id': str(c.id),
                'contract_number': c.contract_number,
                'landlord_email': c.landlord.email if c.landlord else None,
                'current_state': c.current_state,
                'admin_review_deadline': deadline.isoformat() if deadline else None,
                'admin_review_escalated': c.admin_review_escalated,
                'review_cycle_count': c.review_cycle_count,
            }
            if c.admin_review_escalated:
                buckets['escalated'].append(entry)
            elif not deadline:
                buckets['on_time'].append(entry)
            elif deadline < now:
                buckets['overdue'].append(entry)
            elif (deadline - now).days <= 1:
                buckets['due_soon'].append(entry)
            else:
                buckets['on_time'].append(entry)

        return Response({
            'generated_at': now.isoformat(),
            'totals': {k: len(v) for k, v in buckets.items()},
            'contracts': buckets,
        })


class DashboardStatsAPIView(APIView):
    """Vista para estadísticas del dashboard."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Notificaciones no leídas
        unread_notifications = Notification.objects.filter(
            user=user,
            is_read=False
        ).count()
        
        # Actividad reciente
        recent_activity = ActivityLog.objects.filter(
            user=user
        ).count()
        
        # Estadísticas según el tipo de usuario
        stats = {
            'unread_notifications': unread_notifications,
            'recent_activity': recent_activity,
        }
        
        if user.user_type == 'landlord':
            from properties.models import Property
            stats.update({
                'total_properties': Property.objects.filter(landlord=user).count(),
                'active_properties': Property.objects.filter(landlord=user, is_active=True).count(),
            })
        elif user.user_type == 'tenant':
            from contracts.models import Contract
            stats.update({
                'active_contracts': Contract.objects.filter(tenant=user, status='active').count(),
                'pending_contracts': Contract.objects.filter(tenant=user, status='pending').count(),
            })
        
        return Response(stats)


class SystemOverviewAPIView(APIView):
    """Vista para estadísticas generales del sistema."""
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        from django.contrib.auth import get_user_model
        from properties.models import Property
        from contracts.models import Contract
        
        User = get_user_model()
        
        # Estadísticas de usuarios
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        verified_users = User.objects.filter(is_verified=True).count()
        
        # Estadísticas de propiedades
        total_properties = Property.objects.count()
        active_properties = Property.objects.filter(is_active=True).count()
        
        # Estadísticas de contratos
        total_contracts = Contract.objects.count()
        active_contracts = Contract.objects.filter(status='active').count()
        
        # Alertas del sistema
        active_alerts = SystemAlert.objects.filter(is_active=True).count()
        critical_alerts = SystemAlert.objects.filter(is_active=True, level='critical').count()
        
        return Response({
            'users': {
                'total': total_users,
                'active': active_users,
                'verified': verified_users,
            },
            'properties': {
                'total': total_properties,
                'active': active_properties,
            },
            'contracts': {
                'total': total_contracts,
                'active': active_contracts,
            },
            'alerts': {
                'active': active_alerts,
                'critical': critical_alerts,
            },
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Endpoint de prueba para verificar la conexión al backend"""
    return Response({
        'status': 'ok',
        'message': 'Backend is running',
        'timestamp': '2024-01-01T00:00:00Z'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def test_connection(request):
    """Endpoint de prueba para verificar CORS y conexión"""
    return Response({
        'status': 'success',
        'message': 'Connection test successful',
        'cors_enabled': True,
        'api_version': 'v1'
    })


class AuditReportAPIView(APIView):
    """Vista para generar reportes de auditoría."""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        """Genera un reporte de auditoría personalizado."""
        try:
            start_date_str = request.data.get('start_date')
            end_date_str = request.data.get('end_date')
            sections = request.data.get('sections', [
                'general_stats', 'user_activities', 'admin_actions',
                'security_events', 'system_alerts', 'performance_metrics'
            ])
            
            if not start_date_str or not end_date_str:
                return Response(
                    {'error': 'start_date and end_date are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            
            report = audit_service.generate_audit_report(
                start_date=start_date,
                end_date=end_date,
                include_sections=sections
            )
            
            # Log de la generación del reporte
            audit_service.log_user_activity(
                user=request.user,
                action_type='generate_report',
                description='Generated audit report',
                details={
                    'report_id': report['report_id'],
                    'period_days': report['period']['days'],
                    'sections': sections
                },
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response(report)
            
        except Exception as e:
            logger.error(f"Failed to generate audit report: {str(e)}")
            return Response(
                {'error': 'Failed to generate audit report'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SecurityAnalysisAPIView(APIView):
    """Análisis de eventos de seguridad para AdminSecurityPanel."""
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        try:
            from .audit_service import audit_service as _audit
            from .models import SystemAlert, ActivityLog

            hours = int(getattr(request, "query_params", request.GET).get('hours', 24))
            analysis = _audit.analyze_security_events(timedelta(hours=hours))

            suspicious_ips = []
            for ip_data in analysis.get('suspicious_ips', []) or []:
                if isinstance(ip_data, dict):
                    suspicious_ips.append({
                        'ip': ip_data.get('ip') or ip_data.get('ip_address', ''),
                        'failed_attempts': ip_data.get('count', 0),
                        'last_attempt': str(ip_data.get('last_attempt') or ''),
                    })

            failed_logs = ActivityLog.objects.filter(
                action_type='login', success=False,
            ).order_by('-created_at').values(
                'ip_address', 'created_at',
            )[:20]
            recent_failed_logins = [
                {
                    'email': '',
                    'ip': r.get('ip_address') or '',
                    'timestamp': r['created_at'].isoformat() if r.get('created_at') else '',
                    'reason': 'invalid_credentials',
                }
                for r in failed_logs
            ]

            alerts = SystemAlert.objects.filter(
                is_active=True, is_resolved=False,
            ).order_by('-created_at').values(
                'id', 'category', 'title', 'level', 'created_at',
            )[:50]
            active_alerts = [
                {
                    'id': str(a['id']),
                    'type': a.get('category') or '',
                    'message': a.get('title') or '',
                    'severity': a.get('level') or 'low',
                    'created_at': a['created_at'].isoformat() if a.get('created_at') else '',
                }
                for a in alerts
            ]

            return Response({
                'risk_score': analysis.get('risk_score', 0),
                'suspicious_ips': suspicious_ips,
                'recent_failed_logins': recent_failed_logins,
                'active_alerts': active_alerts,
            })

        except Exception as e:
            logger.error(f"Failed to analyze security events: {str(e)}")
            return Response(
                {'error': 'Failed to analyze security events'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LogCleanupAPIView(APIView):
    """Vista para limpieza de logs antiguos."""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        """Ejecuta limpieza de logs antiguos."""
        try:
            retention_days = int(request.data.get('retention_days', 90))
            dry_run = request.data.get('dry_run', True)
            
            stats = audit_service.cleanup_old_logs(
                retention_days=retention_days,
                dry_run=dry_run
            )
            
            # Log de la acción de limpieza
            audit_service.log_user_activity(
                user=request.user,
                action_type='cleanup',
                description=f'Log cleanup {"simulated" if dry_run else "executed"}',
                details={
                    'retention_days': retention_days,
                    'dry_run': dry_run,
                    'stats': stats
                },
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response({
                'message': f'Log cleanup {"simulated" if dry_run else "completed"} successfully',
                'stats': stats
            })
            
        except Exception as e:
            logger.error(f"Failed to cleanup logs: {str(e)}")
            return Response(
                {'error': 'Failed to cleanup logs'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DashboardStatsAPIView(APIView):
    """Vista para estadísticas del dashboard de auditoría."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtiene estadísticas para el dashboard."""
        try:
            # Estadísticas básicas para usuarios normales
            if not request.user.is_staff:
                summary = audit_service.get_user_activity_summary(
                    user=request.user,
                    days=30
                )
                return Response({
                    'user_stats': summary,
                    'is_admin': False
                })
            
            # Estadísticas completas para administradores
            days = int(getattr(request, "query_params", request.GET).get('days', 7))
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            # Estadísticas generales
            total_activities = ActivityLog.objects.filter(
                timestamp__range=[start_date, end_date]
            ).count()
            
            unique_users = ActivityLog.objects.filter(
                timestamp__range=[start_date, end_date],
                user__isnull=False
            ).values('user').distinct().count()
            
            failed_activities = ActivityLog.objects.filter(
                timestamp__range=[start_date, end_date],
                success=False
            ).count()
            
            active_alerts = SystemAlert.objects.filter(
                is_active=True,
                is_resolved=False
            ).count()
            
            # Análisis de seguridad rápido
            security_analysis = audit_service.analyze_security_events(
                timedelta(hours=24)
            )
            
            stats = {
                'period_days': days,
                'total_activities': total_activities,
                'unique_users': unique_users,
                'failed_activities': failed_activities,
                'success_rate': ((total_activities - failed_activities) / total_activities * 100) if total_activities > 0 else 100,
                'active_alerts': active_alerts,
                'security_risk_score': security_analysis.get('risk_score', 0),
                'recent_security_events': {
                    'failed_logins': security_analysis.get('failed_logins', {}).get('total', 0),
                    'suspicious_ips': len(security_analysis.get('suspicious_ips', [])),
                    'active_impersonations': security_analysis.get('active_impersonations', 0)
                },
                'is_admin': True
            }
            
            return Response(stats)
            
        except Exception as e:
            logger.error(f"Failed to get dashboard stats: {str(e)}")
            return Response(
                {'error': 'Failed to get dashboard stats'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ExportLogsAPIView(APIView):
    """Vista para exportar logs de auditoría."""
    permission_classes = [permissions.IsAdminUser]
    
    def post(self, request):
        """Exporta logs en formato CSV o JSON."""
        try:
            start_date_str = request.data.get('start_date')
            end_date_str = request.data.get('end_date')
            format_type = request.data.get('format', 'csv')
            log_types = request.data.get('log_types', ['activity', 'user_activity', 'admin_action'])
            
            if not start_date_str or not end_date_str:
                return Response(
                    {'error': 'start_date and end_date are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
            
            # Recopilar logs según los tipos solicitados
            export_data = []
            
            if 'activity' in log_types:
                activities = ActivityLog.objects.filter(
                    timestamp__range=[start_date, end_date]
                ).values(
                    'id', 'user__email', 'action_type', 'description',
                    'timestamp', 'ip_address', 'success'
                )
                export_data.extend([{**activity, 'log_type': 'activity'} for activity in activities])
            
            if format_type == 'json':
                response = HttpResponse(
                    json.dumps(list(export_data), indent=2, default=str),
                    content_type='application/json'
                )
                response['Content-Disposition'] = f'attachment; filename="audit_logs_{start_date.date()}_{end_date.date()}.json"'
            else:
                # Formato CSV
                import csv
                from io import StringIO
                
                output = StringIO()
                writer = csv.writer(output)
                
                if export_data:
                    # Escribir headers
                    headers = list(export_data[0].keys())
                    writer.writerow(headers)
                    
                    # Escribir datos
                    for row in export_data:
                        writer.writerow([str(row.get(header, '')) for header in headers])
                
                response = HttpResponse(output.getvalue(), content_type='text/csv')
                response['Content-Disposition'] = f'attachment; filename="audit_logs_{start_date.date()}_{end_date.date()}.csv"'
            
            # Log de la exportación
            audit_service.log_user_activity(
                user=request.user,
                action_type='export',
                description=f'Exported {len(export_data)} log entries',
                details={
                    'format': format_type,
                    'log_types': log_types,
                    'period_start': start_date.isoformat(),
                    'period_end': end_date.isoformat(),
                    'records_exported': len(export_data)
                },
                ip_address=get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return response
            
        except Exception as e:
            logger.error(f"Failed to export logs: {str(e)}")
            return Response(
                {'error': 'Failed to export logs'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# MAINTENANCE ENDPOINTS
# ============================================

@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def maintenance_health_check(request):
    """Comprehensive system health check for admin dashboard."""
    import time

    result = {'overall': 'healthy'}

    # Database check
    try:
        from django.db import connection
        start = time.time()
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        db_latency = round((time.time() - start) * 1000, 1)
        result['database'] = {'status': 'healthy', 'latency_ms': db_latency}
    except Exception as e:
        result['database'] = {'status': 'unhealthy', 'latency_ms': 0, 'error': str(e)}
        result['overall'] = 'degraded'

    # Redis check
    try:
        from django.core.cache import caches
        start = time.time()
        cache = caches['default']
        cache.set('health_check', 'ok', 10)
        cache.get('health_check')
        redis_latency = round((time.time() - start) * 1000, 1)
        result['redis'] = {'status': 'healthy', 'latency_ms': redis_latency}
    except Exception:
        result['redis'] = {'status': 'fallback', 'latency_ms': 0}

    # Storage check
    try:
        import shutil
        import os
        media_root = getattr(settings, 'MEDIA_ROOT', '/tmp')
        if os.path.exists(media_root):
            total, used, free = shutil.disk_usage(media_root)
            usage_pct = round((used / total) * 100, 1)
            result['storage'] = {
                'status': 'healthy' if usage_pct < 85 else 'warning',
                'usage_percent': usage_pct,
            }
        else:
            result['storage'] = {'status': 'healthy', 'usage_percent': 0}
    except Exception:
        result['storage'] = {'status': 'unknown', 'usage_percent': 0}

    # Celery check
    try:
        from celery import current_app
        inspector = current_app.control.inspect(timeout=2)
        active = inspector.active()
        worker_count = len(active) if active else 0
        result['celery'] = {
            'status': 'healthy' if worker_count > 0 else 'warning',
            'active_workers': worker_count,
        }
    except Exception:
        result['celery'] = {'status': 'unavailable', 'active_workers': 0}

    return Response(result)


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def maintenance_clear_logs(request):
    """Clear logs older than 30 days."""
    try:
        cutoff = timezone.now() - timedelta(days=30)
        deleted_count, _ = ActivityLog.objects.filter(created_at__lt=cutoff).delete()
        return Response({
            'message': f'Se eliminaron {deleted_count} registros de log antiguos',
            'deleted_count': deleted_count,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def maintenance_clear_cache(request):
    """Clear all cache entries."""
    try:
        from django.core.cache import caches
        for cache_name in ['default', 'local_fallback']:
            try:
                caches[cache_name].clear()
            except Exception:
                pass
        return Response({'message': 'Cache limpiada exitosamente'})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def maintenance_clear_sessions(request):
    """Clear expired sessions."""
    try:
        from django.contrib.sessions.models import Session
        expired = Session.objects.filter(expire_date__lt=timezone.now())
        count = expired.count()
        expired.delete()
        return Response({
            'message': f'Se eliminaron {count} sesiones expiradas',
            'deleted_count': count,
        })
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def maintenance_optimize_db(request):
    """Run database optimization (VACUUM ANALYZE for PostgreSQL, integrity check for SQLite)."""
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            if connection.vendor == 'postgresql':
                cursor.execute('ANALYZE')
                msg = 'ANALYZE ejecutado exitosamente en PostgreSQL'
            else:
                cursor.execute('PRAGMA integrity_check')
                result = cursor.fetchone()
                msg = f'Integridad de SQLite: {result[0]}'
        return Response({'message': msg})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)