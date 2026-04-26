"""
API Views para el módulo de Verificación Presencial de VeriHome.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from .models import (
    FieldVisitRequest,
    VerificationAgent,
    VerificationReport,
    VerificationVisit,
)
from .serializers import (
    FieldVisitRequestSerializer,
    VerificationAgentSerializer,
    VerificationReportSerializer,
    VerificationVisitSerializer,
)


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class IsStaffOrAssignedAgent(permissions.BasePermission):
    """
    Permite acceso a staff (CRUD completo) o al agente asignado para acciones
    sobre sus propias visitas (start/complete/cancel). VER-03.
    """

    AGENT_ACTIONS = {"start", "complete", "cancel", "retrieve", "list"}

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.user.is_staff:
            return True
        # Las acciones de agente requieren que el usuario tenga perfil
        # VerificationAgent; en caso contrario, 403.
        if getattr(view, "action", None) not in self.AGENT_ACTIONS:
            return False
        return VerificationAgent.objects.filter(user=request.user).exists()

    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        # Solo si el usuario es el agente asignado a esta visita
        agent = getattr(obj, "agent", None)
        return bool(agent and getattr(agent, "user_id", None) == request.user.id)


class VerificationAgentViewSet(viewsets.ModelViewSet):
    """CRUD de agentes de verificación. Solo staff."""

    serializer_class = VerificationAgentSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]

    def get_queryset(self):
        qs = VerificationAgent.objects.select_related("user").all()
        available = self.request.query_params.get("available")
        if available == "true":
            qs = qs.filter(is_available=True)
        return qs

    @action(detail=False, methods=["get"])
    def available(self, request):
        """Listar agentes con capacidad disponible esta semana."""
        agents = self.get_queryset().filter(is_available=True)
        available_agents = [a for a in agents if a.has_capacity]
        serializer = self.get_serializer(available_agents, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Estadísticas generales de agentes."""
        total = VerificationAgent.objects.count()
        available = VerificationAgent.objects.filter(is_available=True).count()
        visits_today = VerificationVisit.objects.filter(
            scheduled_date=timezone.now().date(),
            status__in=["scheduled", "in_progress"],
        ).count()
        visits_pending = VerificationVisit.objects.filter(status="pending").count()
        visits_completed_month = VerificationVisit.objects.filter(
            status="completed",
            completed_at__month=timezone.now().month,
            completed_at__year=timezone.now().year,
        ).count()
        return Response(
            {
                "total_agents": total,
                "available_agents": available,
                "visits_today": visits_today,
                "visits_pending_assignment": visits_pending,
                "visits_completed_this_month": visits_completed_month,
            }
        )


class VerificationVisitViewSet(viewsets.ModelViewSet):
    """CRUD de visitas de verificación. Staff o agente asignado (para sus visitas)."""

    serializer_class = VerificationVisitSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrAssignedAgent]

    def get_queryset(self):
        qs = VerificationVisit.objects.select_related(
            "agent", "agent__user", "target_user", "property_ref"
        ).all()
        # Agentes no-staff solo ven SUS visitas
        if not self.request.user.is_staff:
            qs = qs.filter(agent__user=self.request.user)

        # Filtros
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        visit_type = self.request.query_params.get("type")
        if visit_type:
            qs = qs.filter(visit_type=visit_type)

        agent_id = self.request.query_params.get("agent")
        if agent_id:
            qs = qs.filter(agent_id=agent_id)

        return qs

    @action(detail=True, methods=["post"])
    def assign_agent(self, request, pk=None):
        """Asignar un agente a una visita pendiente."""
        visit = self.get_object()
        # VER-02: aceptamos tanto 'agent_id' (legado) como 'agent' (DRF estándar).
        agent_id = request.data.get("agent_id") or request.data.get("agent")

        if visit.status not in ("pending", "rescheduled"):
            return Response(
                {
                    "error": "Solo se pueden asignar agentes a visitas pendientes o reprogramadas"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            agent = VerificationAgent.objects.get(id=agent_id)
        except VerificationAgent.DoesNotExist:
            return Response(
                {"error": "Agente no encontrado"}, status=status.HTTP_404_NOT_FOUND
            )

        if not agent.has_capacity:
            return Response(
                {
                    "error": f"El agente {agent.agent_code} no tiene capacidad disponible esta semana"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        visit.agent = agent
        visit.status = "scheduled"
        visit.save(update_fields=["agent", "status", "updated_at"])

        # Notificar al agente
        if agent.user.email:
            try:
                send_mail(
                    subject=f"[VeriHome] Nueva visita asignada: {visit.visit_number}",
                    message=(
                        f"Se le ha asignado una nueva visita de verificación.\n\n"
                        f"Número: {visit.visit_number}\n"
                        f"Tipo: {visit.get_visit_type_display()}\n"
                        f"Persona: {visit.target_user.get_full_name()}\n"
                        f"Dirección: {visit.visit_address}, {visit.visit_city}\n"
                        f"Fecha: {visit.scheduled_date}\n"
                        f"Hora: {visit.scheduled_time}\n"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[agent.user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

        serializer = self.get_serializer(visit)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Marcar visita como iniciada."""
        visit = self.get_object()
        if visit.status != "scheduled":
            return Response(
                {"error": "Solo se pueden iniciar visitas programadas"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        visit.status = "in_progress"
        visit.started_at = timezone.now()
        visit.save(update_fields=["status", "started_at", "updated_at"])
        return Response(self.get_serializer(visit).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Marcar visita como completada."""
        visit = self.get_object()
        if visit.status != "in_progress":
            return Response(
                {"error": "Solo se pueden completar visitas en progreso"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        visit.status = "completed"
        visit.completed_at = timezone.now()
        visit.verification_passed = request.data.get("passed", True)
        visit.agent_notes = request.data.get("notes", "")
        visit.save(
            update_fields=[
                "status",
                "completed_at",
                "verification_passed",
                "agent_notes",
                "duration_minutes",
                "updated_at",
            ]
        )

        # Incrementar contador del agente
        if visit.agent:
            visit.agent.total_visits_completed += 1
            visit.agent.save(update_fields=["total_visits_completed", "updated_at"])

        # Notificar al usuario verificado
        if visit.target_user.email:
            result = "aprobada" if visit.verification_passed else "requiere ajustes"
            try:
                send_mail(
                    subject=f"[VeriHome] Resultado de su verificación: {result}",
                    message=(
                        f"Estimado/a {visit.target_user.get_full_name()},\n\n"
                        f"Su visita de verificación {visit.visit_number} ha sido completada.\n"
                        f"Resultado: {result.upper()}\n\n"
                        f"Equipo VeriHome"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[visit.target_user.email],
                    fail_silently=True,
                )
            except Exception:
                pass

        # 1.9.7: auditoría unificada de visitas completadas.
        from core.audit_service import log_activity

        log_activity(
            request,
            action_type="verification.visit_complete",
            description=f'Visita {visit.visit_number} completada: {"aprobada" if visit.verification_passed else "rechazada"}',
            target_object=visit,
            details={
                "visit_number": visit.visit_number,
                "verification_passed": visit.verification_passed,
                "agent_id": str(visit.agent_id) if visit.agent_id else None,
            },
            success=visit.verification_passed,
        )

        return Response(self.get_serializer(visit).data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancelar una visita."""
        visit = self.get_object()
        if visit.status in ("completed", "cancelled"):
            return Response(
                {"error": "No se puede cancelar esta visita"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        visit.status = "cancelled"
        visit.cancellation_reason = request.data.get("reason", "")
        visit.save(update_fields=["status", "cancellation_reason", "updated_at"])
        return Response(self.get_serializer(visit).data)


class VerificationReportViewSet(viewsets.ModelViewSet):
    """CRUD de reportes de verificación. Solo staff."""

    serializer_class = VerificationReportSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]

    def get_queryset(self):
        return VerificationReport.objects.select_related(
            "visit", "visit__agent", "visit__target_user"
        ).all()

    def perform_create(self, serializer):
        report = serializer.save()
        # Marcar usuario como verificado si el reporte es positivo
        if report.identity_verified and report.overall_condition in (
            "excellent",
            "good",
            "acceptable",
        ):
            user = report.visit.target_user
            user.is_verified = True
            user.verification_date = timezone.now()
            user.save(update_fields=["is_verified", "verification_date"])

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Admin aprueba el reporte de verificación."""
        report = self.get_object()
        report.approved_by_admin = True
        report.admin_notes = request.data.get("notes", "")
        report.save(update_fields=["approved_by_admin", "admin_notes", "updated_at"])
        return Response(self.get_serializer(report).data)


class FieldVisitOnboardingThrottle(UserRateThrottle):
    """Limita el envío de onboardings VeriHome ID por usuario."""

    scope = "field_visit_onboarding"


class FieldVisitRequestViewSet(viewsets.GenericViewSet):
    """
    Onboarding VeriHome ID.

    - POST /api/v1/verification/onboarding/  → crea registro a partir del
      payload `VeriHomeIDDigitalResult` del frontend.
    - GET  /api/v1/verification/onboarding/me/ → último onboarding del user.
    - GET  /api/v1/verification/onboarding/    → staff: lista todos.
    """

    serializer_class = FieldVisitRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = FieldVisitRequest.objects.select_related("user", "scheduled_visit").all()
        if not self.request.user.is_staff:
            qs = qs.filter(user=self.request.user)
        return qs

    def get_throttles(self):
        if self.action == "create":
            return [FieldVisitOnboardingThrottle()]
        return super().get_throttles()

    def list(self, request):
        if not request.user.is_staff:
            return Response(
                {"detail": "Solo staff puede listar todos los onboardings."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def create(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()

        try:
            from core.audit_service import log_activity

            log_activity(
                request,
                action_type="verihome_id.onboarding_complete",
                description=(
                    f"Onboarding VeriHome ID completado "
                    f"({instance.digital_verdict}, score={instance.digital_score_total})"
                ),
                target_object=instance,
                details={
                    "verdict": instance.digital_verdict,
                    "score_total": str(instance.digital_score_total),
                    "document_type": instance.document_type_declared,
                },
                success=instance.digital_verdict != "rechazado",
            )
        except Exception:
            pass

        return Response(
            self.get_serializer(instance).data, status=status.HTTP_201_CREATED
        )

    @action(detail=False, methods=["get"], url_path="me")
    def me(self, request):
        """Último onboarding del usuario actual (o 404 si no tiene)."""
        instance = (
            FieldVisitRequest.objects.filter(user=request.user)
            .order_by("-created_at")
            .first()
        )
        if not instance:
            return Response(
                {"detail": "No hay onboarding registrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(self.get_serializer(instance).data)
