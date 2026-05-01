import base64
import binascii
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from rest_framework import serializers

from .models import (
    FieldVisitAct,
    FieldVisitRequest,
    VerificationAgent,
    VerificationReport,
    VerificationVisit,
)

User = get_user_model()


def _decode_base64_image(payload, prefix):
    """Convierte un data URL base64 a ContentFile o devuelve None."""
    if not payload or not isinstance(payload, str):
        return None
    if not payload.startswith("data:"):
        return None
    try:
        header, b64data = payload.split(";base64,", 1)
        ext = header.split("/")[-1].split(";")[0] or "jpg"
        decoded = base64.b64decode(b64data, validate=True)
    except (ValueError, binascii.Error):
        return None
    return ContentFile(decoded, name=f"{prefix}.{ext}")


def _verdict_from_score(total):
    """Replica `classifyDigitalScore` del frontend (umbrales 0.40 / 0.25)."""
    total = Decimal(str(total))
    if total >= Decimal("0.40"):
        return "aprobado"
    if total >= Decimal("0.25"):
        return "observado"
    return "rechazado"


class VerificationAgentSerializer(serializers.ModelSerializer):
    # VER-01: queryset explícito para permitir POST /verification/agents/ con
    # user=<uuid>. Sin esto DRF levanta AssertionError (PrimaryKeyRelatedField
    # sin queryset o read_only=True) al procesar el request.
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    current_week_visits = serializers.IntegerField(read_only=True)
    has_capacity = serializers.BooleanField(read_only=True)

    class Meta:
        model = VerificationAgent
        fields = [
            "id",
            "user",
            "user_name",
            "user_email",
            "agent_code",
            "specialization",
            "service_areas",
            "certifications",
            "max_weekly_visits",
            "is_available",
            "availability_notes",
            "total_visits_completed",
            "average_rating",
            "current_week_visits",
            "has_capacity",
            "hired_at",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "agent_code",
            "total_visits_completed",
            "average_rating",
            "created_at",
        ]


class VerificationVisitSerializer(serializers.ModelSerializer):
    agent_name = serializers.CharField(
        source="agent.user.get_full_name", read_only=True, default="Sin asignar"
    )
    agent_code = serializers.CharField(
        source="agent.agent_code", read_only=True, default=""
    )
    target_user_name = serializers.CharField(
        source="target_user.get_full_name", read_only=True
    )
    target_user_email = serializers.EmailField(
        source="target_user.email", read_only=True
    )
    visit_type_display = serializers.CharField(
        source="get_visit_type_display", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    has_report = serializers.SerializerMethodField()

    class Meta:
        model = VerificationVisit
        fields = [
            "id",
            "visit_number",
            "visit_type",
            "visit_type_display",
            "agent",
            "agent_name",
            "agent_code",
            "target_user",
            "target_user_name",
            "target_user_email",
            "property_ref",
            "status",
            "status_display",
            "scheduled_date",
            "scheduled_time",
            "visit_address",
            "visit_city",
            "started_at",
            "completed_at",
            "duration_minutes",
            "agent_notes",
            "cancellation_reason",
            "verification_passed",
            "has_report",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "visit_number",
            "duration_minutes",
            "created_at",
            "updated_at",
        ]

    def get_has_report(self, obj):
        return hasattr(obj, "report") and obj.report is not None


class VerificationReportSerializer(serializers.ModelSerializer):
    visit_number = serializers.CharField(source="visit.visit_number", read_only=True)
    condition_display = serializers.CharField(
        source="get_overall_condition_display", read_only=True
    )

    class Meta:
        model = VerificationReport
        fields = [
            "id",
            "visit",
            "visit_number",
            "overall_condition",
            "condition_display",
            "initial_rating",
            "identity_verified",
            "document_type_verified",
            "document_number_verified",
            "property_exists",
            "property_matches_description",
            "property_condition_notes",
            "person_lives_at_address",
            "person_cooperative",
            "references_verified",
            "findings",
            "recommendations",
            "risk_flags",
            "photo_evidence",
            "approved_by_admin",
            "admin_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class FieldVisitRequestSerializer(serializers.ModelSerializer):
    """
    Onboarding VeriHome ID. Recibe el payload `VeriHomeIDDigitalResult`
    del frontend (incluye base64 de las 3 imágenes) y persiste el registro.
    """

    cedula_anverso = serializers.CharField(write_only=True, allow_null=True)
    cedula_reverso = serializers.CharField(write_only=True, allow_null=True)
    selfie = serializers.CharField(
        write_only=True, source="selfie_liveness_b64", allow_null=True
    )

    cedula_anverso_url = serializers.SerializerMethodField(read_only=True)
    cedula_reverso_url = serializers.SerializerMethodField(read_only=True)
    selfie_url = serializers.SerializerMethodField(read_only=True)

    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_full_name = serializers.CharField(
        source="user.get_full_name", read_only=True
    )

    class Meta:
        model = FieldVisitRequest
        fields = [
            "id",
            "user",
            "user_email",
            "user_full_name",
            "document_type_declared",
            "document_number_declared",
            "full_name_declared",
            "cedula_anverso",
            "cedula_reverso",
            "selfie",
            "cedula_anverso_url",
            "cedula_reverso_url",
            "selfie_url",
            "ocr_data",
            "liveness_data",
            "face_match_data",
            "digital_score",
            "digital_score_total",
            "digital_verdict",
            "scheduled_visit",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "user",
            "digital_verdict",
            "scheduled_visit",
            "status",
            "created_at",
            "updated_at",
        ]

    def get_cedula_anverso_url(self, obj):
        return obj.cedula_anverso.url if obj.cedula_anverso else None

    def get_cedula_reverso_url(self, obj):
        return obj.cedula_reverso.url if obj.cedula_reverso else None

    def get_selfie_url(self, obj):
        return obj.selfie_liveness.url if obj.selfie_liveness else None

    def validate_digital_score_total(self, value):
        if value is None:
            raise serializers.ValidationError("digital_score_total es obligatorio")
        if value < 0 or value > Decimal("0.5"):
            raise serializers.ValidationError(
                "digital_score_total debe estar entre 0.0 y 0.5"
            )
        return value

    def create(self, validated_data):
        request = self.context["request"]
        anverso_b64 = validated_data.pop("cedula_anverso", None)
        reverso_b64 = validated_data.pop("cedula_reverso", None)
        selfie_b64 = validated_data.pop("selfie_liveness_b64", None)

        verdict = _verdict_from_score(validated_data["digital_score_total"])
        status_value = "rejected" if verdict == "rechazado" else "digital_completed"

        instance = FieldVisitRequest.objects.create(
            user=request.user,
            digital_verdict=verdict,
            status=status_value,
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            ip_address=_client_ip(request),
            **validated_data,
        )

        anverso_file = _decode_base64_image(anverso_b64, "cedula_anverso")
        if anverso_file:
            instance.cedula_anverso.save(anverso_file.name, anverso_file, save=False)
        reverso_file = _decode_base64_image(reverso_b64, "cedula_reverso")
        if reverso_file:
            instance.cedula_reverso.save(reverso_file.name, reverso_file, save=False)
        selfie_file = _decode_base64_image(selfie_b64, "selfie_liveness")
        if selfie_file:
            instance.selfie_liveness.save(selfie_file.name, selfie_file, save=False)

        if anverso_file or reverso_file or selfie_file:
            instance.save(
                update_fields=[
                    "cedula_anverso",
                    "cedula_reverso",
                    "selfie_liveness",
                    "updated_at",
                ]
            )

        return instance


def _client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class FieldVisitActSerializer(serializers.ModelSerializer):
    """
    Acta consolidada VeriHome ID. Lectura full + edición de payload por
    el agente. Las firmas y el sellado del bloque se manejan por
    acciones dedicadas (`parties-sign`, `lawyer-sign`).
    """

    field_request = serializers.PrimaryKeyRelatedField(
        queryset=FieldVisitRequest.objects.all()
    )
    visit = serializers.PrimaryKeyRelatedField(
        queryset=VerificationVisit.objects.all()
    )
    visit_number = serializers.CharField(source="visit.visit_number", read_only=True)
    target_user_email = serializers.EmailField(
        source="field_request.user.email", read_only=True
    )
    target_user_name = serializers.CharField(
        source="field_request.user.get_full_name", read_only=True
    )
    digital_score_total = serializers.DecimalField(
        source="field_request.digital_score_total",
        max_digits=4,
        decimal_places=3,
        read_only=True,
    )
    digital_verdict = serializers.CharField(
        source="field_request.digital_verdict", read_only=True
    )
    final_verdict_display = serializers.CharField(
        source="get_final_verdict_display", read_only=True
    )
    lawyer_email = serializers.EmailField(
        source="lawyer_user.email", read_only=True, default=None
    )
    pdf_url = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = FieldVisitAct
        fields = [
            "id",
            "act_number",
            "field_request",
            "visit",
            "visit_number",
            "target_user_email",
            "target_user_name",
            "payload",
            "pdf_file",
            "pdf_url",
            "pdf_sha256",
            "verified_signature",
            "verified_signed_at",
            "agent_signature",
            "agent_signed_at",
            "lawyer_user",
            "lawyer_email",
            "lawyer_signed_at",
            "lawyer_tp_number",
            "lawyer_full_name",
            "lawyer_cc",
            "lawyer_certificate_fingerprint",
            "prev_act",
            "prev_hash",
            "payload_hash",
            "final_hash",
            "block_number",
            "status",
            "status_display",
            "geolocation_lat",
            "geolocation_lng",
            "ip_address",
            "visit_score_breakdown",
            "visit_score_total",
            "digital_score_total",
            "digital_verdict",
            "total_score",
            "final_verdict",
            "final_verdict_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "act_number",
            "pdf_file",
            "pdf_sha256",
            "verified_signed_at",
            "agent_signed_at",
            "lawyer_user",
            "lawyer_signed_at",
            "lawyer_tp_number",
            "lawyer_full_name",
            "lawyer_cc",
            "lawyer_certificate_fingerprint",
            "prev_act",
            "prev_hash",
            "payload_hash",
            "final_hash",
            "block_number",
            "status",
            "ip_address",
            "total_score",
            "final_verdict",
            "created_at",
            "updated_at",
        ]

    def get_pdf_url(self, obj):
        return obj.pdf_file.url if obj.pdf_file else None
