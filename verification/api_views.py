"""
API Views para el módulo de Verificación Presencial de VeriHome.
"""

from rest_framework import serializers, viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings

from .models import (
    FieldVisitAct,
    FieldVisitRequest,
    VerificationAgent,
    VerificationReport,
    VerificationVisit,
)
from .serializers import (
    FieldVisitActSerializer,
    FieldVisitRequestSerializer,
    VerificationAgentSerializer,
    VerificationReportSerializer,
    VerificationVisitSerializer,
)
from .services.act_pdf import save_act_pdf
from .services.hash_chain import seal_act, verify_chain


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class IsLawyer(permissions.BasePermission):
    """
    Permite acciones reservadas al abogado certificador (Wilson). Requiere
    `is_staff=True` y email coincidente con `settings.LAWYER_EMAIL`.
    """

    def has_permission(self, request, view):
        user = request.user
        lawyer_email = getattr(settings, "LAWYER_EMAIL", "") or ""
        return bool(
            user
            and user.is_authenticated
            and user.is_staff
            and lawyer_email
            and user.email.lower() == lawyer_email.lower()
        )


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
            scheduled_date=timezone.localdate(),
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
            description=f"Visita {visit.visit_number} completada: {'aprobada' if visit.verification_passed else 'rechazada'}",
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

    @action(detail=False, methods=["get"], url_path="status")
    def status_endpoint(self, request):
        """
        Estado consolidado del onboarding VeriHome ID del usuario actual.
        Lo consume el frontend para banners, gates y deshabilitar
        acciones críticas (crear propiedad, aplicar match, biometría).
        """
        user = request.user
        last = (
            FieldVisitRequest.objects.filter(user=user).order_by("-created_at").first()
        )
        act = None
        if last:
            from .models import FieldVisitAct

            act = (
                FieldVisitAct.objects.filter(field_request=last)
                .order_by("-created_at")
                .first()
            )

        is_verified = bool(getattr(user, "is_verified", False))
        if not last:
            next_step = "start_onboarding"
        elif last.status == "rejected":
            next_step = "start_onboarding"
        elif last.status in ("digital_completed", "visit_scheduled"):
            next_step = "wait_visit"
        else:
            next_step = "complete" if is_verified else "wait_visit"

        return Response(
            {
                "is_verified": is_verified,
                "has_onboarding": last is not None,
                "onboarding_status": last.status if last else None,
                "digital_verdict": last.digital_verdict if last else None,
                "digital_score_total": (
                    str(last.digital_score_total) if last else None
                ),
                "act_status": act.status if act else None,
                "block_number": act.block_number if act else None,
                "next_step": next_step,
                "blocking_actions": [
                    "create_property",
                    "apply_match",
                    "start_biometric",
                ]
                if not is_verified
                else [],
            }
        )


class FieldVisitActViewSet(viewsets.ModelViewSet):
    """
    Acta de visita VeriHome ID. Ciclo: draft → signed_by_parties →
    signed_by_lawyer → sealed.

    - Staff y agente asignado pueden crear borrador y editar payload.
    - Sólo el abogado (`IsLawyer`) sella el bloque y cierra la cadena.
    """

    serializer_class = FieldVisitActSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffOrAssignedAgent]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = FieldVisitAct.objects.select_related(
            "field_request",
            "field_request__user",
            "visit",
            "visit__agent",
            "visit__agent__user",
            "lawyer_user",
        ).all()
        if not self.request.user.is_staff:
            qs = qs.filter(visit__agent__user=self.request.user)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    def perform_create(self, serializer):
        visit = serializer.validated_data["visit"]
        field_request = serializer.validated_data["field_request"]
        if visit.status not in ("scheduled", "in_progress", "completed"):
            raise serializers.ValidationError(
                {"visit": "La visita debe estar programada o en curso."}
            )
        if field_request.user_id != visit.target_user_id:
            raise serializers.ValidationError(
                {
                    "field_request": (
                        "El usuario del onboarding no coincide con el "
                        "destinatario de la visita."
                    )
                }
            )
        serializer.save(
            ip_address=_client_ip_from_request(self.request),
            status="draft",
        )

    def http_method_not_allowed(self, request, *args, **kwargs):
        # PUT excluido vía http_method_names. Devolvemos 405 con mensaje
        # explicativo en lugar del genérico de DRF.
        from rest_framework.exceptions import MethodNotAllowed

        if request.method == "PUT":
            raise MethodNotAllowed(
                "PUT",
                detail="Use PATCH para editar el borrador del acta.",
            )
        return super().http_method_not_allowed(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        # PATCH solo se permite mientras el acta está en draft.
        instance = self.get_object()
        if instance.status != "draft":
            return Response(
                {"detail": "Solo se puede editar el acta en estado draft."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="visit-score")
    def update_visit_score(self, request, pk=None):
        """
        Actualiza `visit_score_breakdown` (sub-puntajes 0.0-0.5) y
        `visit_score_total` del acta. Solo en estado draft. El total
        debe estar en [0, 0.5]; cada sub-puntaje en [0, 0.5].
        El final_verdict y total_score se recalculan al save().
        """
        from decimal import Decimal, InvalidOperation

        act = self.get_object()
        if act.status != "draft":
            return Response(
                {"detail": "El score de visita solo se edita en draft."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        breakdown = request.data.get("visit_score_breakdown") or {}
        total_raw = request.data.get("visit_score_total")
        if total_raw is None:
            return Response(
                {"detail": "`visit_score_total` es obligatorio."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            total = Decimal(str(total_raw))
        except (InvalidOperation, ValueError):
            return Response(
                {"detail": "`visit_score_total` debe ser numérico."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if total < Decimal("0") or total > Decimal("0.5"):
            return Response(
                {"detail": "`visit_score_total` debe estar entre 0.0 y 0.5."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not isinstance(breakdown, dict):
            return Response(
                {"detail": "`visit_score_breakdown` debe ser un objeto."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        for key, value in breakdown.items():
            try:
                v = Decimal(str(value))
            except (InvalidOperation, ValueError):
                return Response(
                    {"detail": f"`{key}` debe ser numérico."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if v < Decimal("0") or v > Decimal("0.5"):
                return Response(
                    {"detail": f"`{key}` debe estar entre 0.0 y 0.5."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        act.visit_score_breakdown = breakdown
        act.visit_score_total = total
        act.save()
        return Response(self.get_serializer(act).data)

    @action(detail=True, methods=["post"], url_path="parties-sign")
    def parties_sign(self, request, pk=None):
        """
        Captura las firmas del verificado y del agente. Requiere ambas
        en el body (`verified_signature`, `agent_signature`) como JSON
        con `data` (data URL) y opcional `geolocation_lat/lng`.
        """
        act = self.get_object()
        if act.status != "draft":
            return Response(
                {"detail": "Solo se firman actas en draft."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        verified_sig = request.data.get("verified_signature")
        agent_sig = request.data.get("agent_signature")
        if not verified_sig or not agent_sig:
            return Response(
                {"detail": ("Se requieren `verified_signature` y `agent_signature`.")},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        act.verified_signature = verified_sig
        act.verified_signed_at = now
        act.agent_signature = agent_sig
        act.agent_signed_at = now
        if request.data.get("geolocation_lat") is not None:
            act.geolocation_lat = request.data.get("geolocation_lat")
            act.geolocation_lng = request.data.get("geolocation_lng")
        act.status = "signed_by_parties"
        act.save()
        return Response(self.get_serializer(act).data)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        """Descarga el PDF del acta (si ya fue generado)."""
        from django.http import FileResponse, HttpResponseNotFound

        act = self.get_object()
        if not act.pdf_file:
            return HttpResponseNotFound("El acta aún no tiene PDF generado.")
        return FileResponse(
            act.pdf_file.open("rb"),
            as_attachment=True,
            filename=f"{act.act_number}.pdf",
        )

    @action(detail=True, methods=["post"], url_path="generate-pdf")
    def generate_pdf(self, request, pk=None):
        """
        Renderiza el PDF del acta y lo persiste con su sha256. Requerido
        antes de la firma del abogado.
        """
        act = self.get_object()
        if act.status not in ("signed_by_parties",):
            return Response(
                {"detail": "Solo se genera PDF tras firmas de verificado y agente."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        sha256 = save_act_pdf(act)
        return Response(
            {
                "pdf_url": act.pdf_file.url if act.pdf_file else None,
                "pdf_sha256": sha256,
            }
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="lawyer-sign",
        permission_classes=[permissions.IsAuthenticated, IsLawyer],
    )
    def lawyer_sign(self, request, pk=None):
        """
        Wilson firma el acta como abogado titulado y cierra el bloque
        de la cadena. Requiere PDF generado previamente y firmas de
        verificado y agente.
        """
        act = self.get_object()
        if act.status != "signed_by_parties":
            return Response(
                {
                    "detail": (
                        "El acta debe estar firmada por verificado y agente "
                        "antes de la firma del abogado."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not act.pdf_sha256:
            return Response(
                {"detail": "El PDF del acta debe generarse antes de firmar."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        act.lawyer_user = request.user
        act.lawyer_signed_at = now
        act.lawyer_tp_number = settings.LAWYER_TP_NUMBER
        act.lawyer_full_name = settings.LAWYER_FULL_NAME
        act.lawyer_cc = settings.LAWYER_CC
        act.status = "signed_by_lawyer"
        act.save()
        seal_act(act, lawyer_signed_at=now)
        act.save()

        try:
            from core.audit_service import log_activity

            log_activity(
                request,
                action_type="verihome_id.act_sealed",
                description=(
                    f"Acta {act.act_number} sellada en bloque "
                    f"#{act.block_number} (final_hash={act.final_hash[:12]}…)"
                ),
                target_object=act,
                details={
                    "act_number": act.act_number,
                    "block_number": act.block_number,
                    "final_hash": act.final_hash,
                },
                success=True,
            )
        except Exception:
            pass

        return Response(self.get_serializer(act).data)

    @action(
        detail=False,
        methods=["get"],
        url_path="verify-chain",
        permission_classes=[permissions.IsAuthenticated, IsStaffUser],
    )
    def verify_chain_endpoint(self, request):
        """Recorre la cadena entera y reporta inconsistencias."""
        return Response(verify_chain())

    @action(
        detail=False,
        methods=["get"],
        url_path="scoring",
        permission_classes=[permissions.IsAuthenticated, IsStaffUser],
    )
    def scoring(self, request):
        """
        Ranking de candidatos VeriHome ID. Filtros opcionales:
          - verdict={aprobado|observado|rechazado}
          - status={draft|signed_by_parties|signed_by_lawyer|sealed}
          - min_score (decimal 0-1)
          - max_score (decimal 0-1)
        Orden por defecto: total_score DESC.
        """
        from decimal import Decimal, InvalidOperation

        qs = FieldVisitAct.objects.select_related(
            "field_request", "field_request__user", "visit", "visit__agent"
        ).all()

        verdict = request.query_params.get("verdict")
        if verdict:
            qs = qs.filter(final_verdict=verdict)

        status_filter = request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        for param, op in (("min_score", "gte"), ("max_score", "lte")):
            value = request.query_params.get(param)
            if value:
                try:
                    qs = qs.filter(**{f"total_score__{op}": Decimal(value)})
                except (InvalidOperation, ValueError):
                    return Response(
                        {"detail": f"Valor inválido en `{param}`."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        agent_id = request.query_params.get("agent_id")
        if agent_id:
            qs = qs.filter(visit__agent_id=agent_id)

        qs = qs.order_by("-total_score", "-created_at")
        now = timezone.now()
        results = [
            {
                "act_id": str(act.id),
                "act_number": act.act_number,
                "user_id": str(act.field_request.user_id),
                "user_email": act.field_request.user.email,
                "user_name": act.field_request.user.get_full_name(),
                "digital_score_total": str(act.field_request.digital_score_total or 0),
                "digital_verdict": act.field_request.digital_verdict,
                "visit_score_total": str(act.visit_score_total or 0),
                "visit_score_breakdown": act.visit_score_breakdown or {},
                "total_score": str(act.total_score),
                "final_verdict": act.final_verdict,
                "status": act.status,
                "block_number": act.block_number,
                "sealed": act.status == "sealed",
                "agent_id": (
                    str(act.visit.agent_id)
                    if act.visit and act.visit.agent_id
                    else None
                ),
                "agent_name": (
                    act.visit.agent.user.get_full_name()
                    if act.visit and act.visit.agent
                    else None
                ),
                "days_waiting": (now - act.created_at).days,
                "created_at": act.created_at.isoformat(),
            }
            for act in qs
        ]
        summary = {
            "total": len(results),
            "aprobados": sum(1 for r in results if r["final_verdict"] == "aprobado"),
            "observados": sum(1 for r in results if r["final_verdict"] == "observado"),
            "rechazados": sum(1 for r in results if r["final_verdict"] == "rechazado"),
        }
        return Response({"summary": summary, "results": results})

    @action(
        detail=False,
        methods=["get"],
        url_path="analytics",
        permission_classes=[permissions.IsAuthenticated, IsStaffUser],
    )
    def analytics(self, request):
        """
        Métricas agregadas de actas VeriHome ID para dashboards.

        Filtros opcionales:
          - agent_id=<uuid>            limita al agente
          - months=<int>               ventana temporal (default 6, máx 24)

        Responde:
          - summary: totales globales y promedios.
          - by_verdict, by_status: conteos para gráficos de torta/barras.
          - timeline: evolución mensual por veredicto.
          - subscore_avg: promedio por sub-puntaje de visita.
        """
        from decimal import Decimal
        from collections import defaultdict
        from datetime import timedelta

        qs = FieldVisitAct.objects.select_related("field_request", "visit").all()

        agent_id = request.query_params.get("agent_id")
        if agent_id:
            qs = qs.filter(visit__agent_id=agent_id)

        try:
            months = min(max(int(request.query_params.get("months") or 6), 1), 24)
        except (TypeError, ValueError):
            months = 6

        window_start = timezone.localdate().replace(day=1) - timedelta(
            days=31 * (months - 1)
        )
        recent_qs = qs.filter(created_at__date__gte=window_start)

        by_verdict = {"aprobado": 0, "observado": 0, "rechazado": 0}
        by_status = {
            "draft": 0,
            "signed_by_parties": 0,
            "signed_by_lawyer": 0,
            "sealed": 0,
        }
        subscore_sum: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        subscore_count: dict[str, int] = defaultdict(int)
        timeline_buckets: dict[str, dict[str, int]] = defaultdict(
            lambda: {"total": 0, "aprobado": 0, "observado": 0, "rechazado": 0}
        )

        total_score_sum = Decimal("0")
        visit_score_sum = Decimal("0")
        digital_score_sum = Decimal("0")

        for act in qs:
            by_verdict[act.final_verdict] = by_verdict.get(act.final_verdict, 0) + 1
            by_status[act.status] = by_status.get(act.status, 0) + 1
            total_score_sum += act.total_score or Decimal("0")
            visit_score_sum += act.visit_score_total or Decimal("0")
            digital_score_sum += act.field_request.digital_score_total or Decimal("0")
            for key, value in (act.visit_score_breakdown or {}).items():
                try:
                    subscore_sum[key] += Decimal(str(value))
                    subscore_count[key] += 1
                except Exception:
                    continue

        for act in recent_qs:
            month_key = act.created_at.strftime("%Y-%m")
            bucket = timeline_buckets[month_key]
            bucket["total"] += 1
            bucket[act.final_verdict] = bucket.get(act.final_verdict, 0) + 1

        total = qs.count()
        avg = lambda s: float((s / total).quantize(Decimal("0.001"))) if total else 0.0  # noqa: E731

        timeline = [{"month": k, **v} for k, v in sorted(timeline_buckets.items())]

        subscore_avg = {
            key: float(
                (subscore_sum[key] / subscore_count[key]).quantize(Decimal("0.001"))
            )
            for key in subscore_sum
            if subscore_count[key] > 0
        }

        return Response(
            {
                "summary": {
                    "total": total,
                    "aprobados": by_verdict.get("aprobado", 0),
                    "observados": by_verdict.get("observado", 0),
                    "rechazados": by_verdict.get("rechazado", 0),
                    "avg_total_score": avg(total_score_sum),
                    "avg_visit_score": avg(visit_score_sum),
                    "avg_digital_score": avg(digital_score_sum),
                    "sealed_count": by_status.get("sealed", 0),
                    "draft_count": by_status.get("draft", 0),
                },
                "by_verdict": by_verdict,
                "by_status": by_status,
                "timeline": timeline,
                "subscore_avg": subscore_avg,
                "window_months": months,
            }
        )


def _client_ip_from_request(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class EmailOtpRateThrottle(UserRateThrottle):
    """Limita request/verify de OTP email a 10/hora por usuario."""

    rate = "10/hour"
    scope = "email_otp"


class EmailOtpViewSet(viewsets.GenericViewSet):
    """
    C10 · Verificación email vía OTP de 6 dígitos.

    Endpoints:
      - POST /verification/email-otp/request/  → genera + envía código.
      - POST /verification/email-otp/verify/   → valida código y marca
        el sub-puntaje `email_otp` (+0.05) en el acta draft del usuario.
    """

    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [EmailOtpRateThrottle]

    def _bump_visit_score(self, user, key: str, value):
        """
        Si el usuario tiene una FieldVisitAct en draft, suma `value` al
        sub-puntaje `key` (clamp a 0.05). Best-effort; sin lock.
        """
        from decimal import Decimal as _D

        from .models import FieldVisitAct

        act = (
            FieldVisitAct.objects.filter(field_request__user=user, status="draft")
            .order_by("-created_at")
            .first()
        )
        if not act:
            return None
        breakdown = dict(act.visit_score_breakdown or {})
        current = _D(str(breakdown.get(key, 0)))
        breakdown[key] = float(min(_D("0.05"), current + _D(str(value))))
        act.visit_score_breakdown = breakdown
        total = sum(_D(str(v)) for v in breakdown.values())
        act.visit_score_total = min(_D("0.5"), total).quantize(_D("0.001"))
        act.save()
        return act

    @action(detail=False, methods=["post"], url_path="request")
    def request_otp(self, request):
        """Genera código de 6 dígitos y lo envía al email del usuario."""
        import secrets

        from .models import EmailVerificationOTP

        user = request.user
        if not user.email:
            return Response(
                {"detail": "Tu cuenta no tiene email registrado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        # Anti-spam: 1 request por minuto.
        recent = (
            EmailVerificationOTP.objects.filter(user=user, created_at__gte=now)
            .order_by("-created_at")
            .first()
        )
        last = (
            EmailVerificationOTP.objects.filter(user=user)
            .order_by("-created_at")
            .first()
        )
        if (
            last
            and (now - last.created_at).total_seconds()
            < EmailVerificationOTP.OTP_MIN_INTERVAL_SECONDS
        ):
            wait = int(
                EmailVerificationOTP.OTP_MIN_INTERVAL_SECONDS
                - (now - last.created_at).total_seconds()
            )
            return Response(
                {
                    "detail": f"Esperá {wait} segundos antes de pedir otro código.",
                    "retry_after_seconds": wait,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        _ = recent  # noqa: F841 (reservado por si querés expandir)

        # Invalidar OTPs activos previos
        EmailVerificationOTP.objects.filter(
            user=user, consumed_at__isnull=True, expires_at__gt=now
        ).update(expires_at=now)

        code = f"{secrets.randbelow(1_000_000):06d}"
        expires_at = now + timezone.timedelta(
            minutes=EmailVerificationOTP.OTP_VALIDITY_MINUTES
        )
        EmailVerificationOTP.objects.create(
            user=user,
            email=user.email,
            code_hash=EmailVerificationOTP.hash_code(code),
            expires_at=expires_at,
            ip_address=_client_ip_from_request(request),
        )

        try:
            send_mail(
                subject="[VeriHome] Tu código de verificación",
                message=(
                    f"Hola {user.get_full_name() or user.email},\n\n"
                    f"Tu código de verificación VeriHome ID es: {code}\n\n"
                    f"Vence en {EmailVerificationOTP.OTP_VALIDITY_MINUTES} minutos.\n"
                    "Si no solicitaste este código, ignorá este mensaje.\n\n"
                    "Equipo VeriHome"
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
            )
        except Exception:
            pass

        payload = {
            "message": "Código enviado a tu email.",
            "expires_at": expires_at.isoformat(),
            "validity_minutes": EmailVerificationOTP.OTP_VALIDITY_MINUTES,
        }
        # Solo en desarrollo / tests E2E exponemos el código en la respuesta
        # para que Playwright pueda continuar sin acceso al mail.outbox.
        if settings.DEBUG:
            payload["debug_code"] = code
        return Response(payload, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="verify")
    def verify_otp(self, request):
        """Valida el código y otorga sub-puntaje email_otp."""
        from .models import EmailVerificationOTP

        user = request.user
        code = str(request.data.get("code") or "").strip()
        if not code.isdigit() or len(code) != 6:
            return Response(
                {"detail": "El código debe ser 6 dígitos numéricos."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        otp = (
            EmailVerificationOTP.objects.filter(
                user=user, consumed_at__isnull=True, expires_at__gt=now
            )
            .order_by("-created_at")
            .first()
        )
        if not otp:
            return Response(
                {"detail": "No hay código activo. Solicitá uno nuevo."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp.code_hash != EmailVerificationOTP.hash_code(code):
            otp.attempts += 1
            update_fields = ["attempts"]
            # 5 intentos fallidos invalidan el OTP.
            if otp.attempts >= 5:
                otp.expires_at = now
                update_fields.append("expires_at")
            otp.save(update_fields=update_fields)
            return Response(
                {
                    "detail": "Código incorrecto.",
                    "attempts": otp.attempts,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp.consumed_at = now
        otp.save(update_fields=["consumed_at"])

        # Bonus en el acta draft si existe.
        act = self._bump_visit_score(user, key="email_otp", value="0.05")
        return Response(
            {
                "message": "Email verificado.",
                "email_otp_score": 0.05,
                "act_id": str(act.id) if act else None,
                "visit_score_total": str(act.visit_score_total) if act else None,
                "final_verdict": act.final_verdict if act else None,
            },
            status=status.HTTP_200_OK,
        )


class PublicReceiptRateThrottle(UserRateThrottle):
    """Limita upload de recibos a 10/hora por usuario."""

    rate = "10/hour"
    scope = "public_receipt"


def _normalize_address(value: str) -> set[str]:
    """
    Normaliza una dirección colombiana para comparación por tokens.

    Pasa a minúsculas, elimina acentos, expande abreviaciones comunes
    (cl→calle, cr/cra/kr→carrera, av→avenida) y deja solo tokens
    alfanuméricos relevantes (>=2 caracteres).
    """
    import re
    import unicodedata

    if not value:
        return set()
    text = unicodedata.normalize("NFD", str(value))
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s#-]", " ", text)
    abbrev = {
        "cl": "calle",
        "cll": "calle",
        "cra": "carrera",
        "cr": "carrera",
        "kr": "carrera",
        "k": "carrera",
        "av": "avenida",
        "avda": "avenida",
        "trv": "transversal",
        "tv": "transversal",
        "dg": "diagonal",
        "diag": "diagonal",
        "no": "",
        "n": "",
        "nro": "",
    }
    tokens = []
    for raw in text.split():
        raw = raw.strip("#-")
        if not raw:
            continue
        tokens.append(abbrev.get(raw, raw))
    return {t for t in tokens if len(t) >= 2}


def _address_match_score(declared: str, reference: str):
    """
    Calcula similitud Jaccard entre dos direcciones tokenizadas y
    normalizadas. Retorna `Decimal` con 3 decimales en [0, 1].
    """
    from decimal import Decimal as _D

    a = _normalize_address(declared)
    b = _normalize_address(reference)
    if not a or not b:
        return _D("0.000")
    inter = len(a & b)
    union = len(a | b)
    if union == 0:
        return _D("0.000")
    return (_D(inter) / _D(union)).quantize(_D("0.001"))


class PublicReceiptViewSet(viewsets.GenericViewSet):
    """
    C10b · Sube recibo público (luz/agua/gas) para validar dirección.

    Endpoint:
      - POST /verification/receipts/upload/ (multipart)
        Campos: image (file), receipt_type, declared_address,
        issue_date (YYYY-MM-DD), declared_amount? (decimal), ocr_text?

    Reglas:
      - Fecha emisión <60 días respecto a `timezone.localdate()`.
      - Token-Jaccard(declared_address, user.current_address) >= 0.6.
      - Cumple ambas → +0.05 al sub-puntaje `public_receipt` del acta
        draft del usuario (idempotente: si ya está acreditado, sólo
        responde con el acta sin acumular).
      - Cualquier upload (aceptado o rechazado) queda persistido para
        auditoría en visita presencial.
      - Anti-spam: 1 upload por minuto + throttle DRF 10/hora.
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [PublicReceiptRateThrottle]

    def _bump_visit_score(self, user, key: str, value):
        """
        Suma idempotente al sub-puntaje `key` del acta draft del usuario.
        Idempotente: si ya está en el techo (0.05) no acumula. Best-effort,
        sin lock. Devuelve la act actualizada o `None` si no hay draft.
        """
        from decimal import Decimal as _D

        from .models import FieldVisitAct

        act = (
            FieldVisitAct.objects.filter(field_request__user=user, status="draft")
            .order_by("-created_at")
            .first()
        )
        if not act:
            return None
        breakdown = dict(act.visit_score_breakdown or {})
        current = _D(str(breakdown.get(key, 0)))
        cap = _D("0.05")
        breakdown[key] = float(min(cap, current + _D(str(value))))
        act.visit_score_breakdown = breakdown
        total = sum(_D(str(v)) for v in breakdown.values())
        act.visit_score_total = min(_D("0.5"), total).quantize(_D("0.001"))
        act.save()
        return act

    @action(detail=False, methods=["post"], url_path="upload")
    def upload(self, request):
        """Recibe el recibo, valida fecha + dirección, persiste y acredita."""
        from datetime import date as _date
        from decimal import Decimal as _D, InvalidOperation

        from .models import PublicReceipt

        user = request.user
        data = request.data
        image = request.FILES.get("image")
        receipt_type = (data.get("receipt_type") or "").strip().lower()
        declared_address = (data.get("declared_address") or "").strip()
        issue_date_raw = (data.get("issue_date") or "").strip()
        declared_amount_raw = (data.get("declared_amount") or "").strip()
        ocr_text = (data.get("ocr_text") or "").strip()

        valid_types = {choice[0] for choice in PublicReceipt.RECEIPT_TYPE_CHOICES}
        if receipt_type not in valid_types:
            return Response(
                {
                    "detail": (
                        "Tipo de recibo inválido. Usá "
                        f"{', '.join(sorted(valid_types))}."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not image:
            return Response(
                {"detail": "Adjuntá la imagen del recibo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not declared_address:
            return Response(
                {"detail": "Indicá la dirección que figura en el recibo."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            issue_date = _date.fromisoformat(issue_date_raw)
        except ValueError:
            return Response(
                {"detail": "La fecha de emisión debe ser YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        declared_amount = None
        if declared_amount_raw:
            try:
                declared_amount = _D(declared_amount_raw)
            except InvalidOperation:
                return Response(
                    {"detail": "El monto declarado no es un número válido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Anti-spam: 1 upload por minuto.
        now = timezone.now()
        last = PublicReceipt.objects.filter(user=user).order_by("-created_at").first()
        if (
            last
            and (now - last.created_at).total_seconds()
            < PublicReceipt.MIN_INTERVAL_SECONDS
        ):
            wait = int(
                PublicReceipt.MIN_INTERVAL_SECONDS
                - (now - last.created_at).total_seconds()
            )
            return Response(
                {
                    "detail": (f"Esperá {wait} segundos antes de subir otro recibo."),
                    "retry_after_seconds": wait,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        today = timezone.localdate()
        age_days = (today - issue_date).days
        match_score = _address_match_score(
            declared_address, getattr(user, "current_address", "") or ""
        )

        if age_days < 0:
            verdict_status = "rejected"
            rejection_reason = "issue_date_in_future"
        elif age_days > PublicReceipt.MAX_AGE_DAYS:
            verdict_status = "rejected"
            rejection_reason = "receipt_too_old"
        elif match_score < PublicReceipt.ADDRESS_MATCH_THRESHOLD:
            verdict_status = "rejected"
            rejection_reason = "address_mismatch"
        else:
            verdict_status = "accepted"
            rejection_reason = ""

        receipt = PublicReceipt.objects.create(
            user=user,
            image=image,
            receipt_type=receipt_type,
            ocr_text=ocr_text[:8000],
            declared_amount=declared_amount,
            declared_address=declared_address,
            issue_date=issue_date,
            address_match_score=match_score,
            status=verdict_status,
            rejection_reason=rejection_reason,
            ip_address=_client_ip_from_request(request),
        )

        act = None
        if verdict_status == "accepted":
            act = self._bump_visit_score(user, key="public_receipt", value="0.05")

        return Response(
            {
                "id": str(receipt.id),
                "status": verdict_status,
                "rejection_reason": rejection_reason or None,
                "address_match_score": str(match_score),
                "public_receipt_score": 0.05 if verdict_status == "accepted" else 0.0,
                "act_id": str(act.id) if act else None,
                "visit_score_total": str(act.visit_score_total) if act else None,
                "final_verdict": act.final_verdict if act else None,
            },
            status=(
                status.HTTP_201_CREATED
                if verdict_status == "accepted"
                else status.HTTP_200_OK
            ),
        )
