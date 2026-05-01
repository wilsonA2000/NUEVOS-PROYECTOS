"""
Módulo de Verificación Presencial de VeriHome.

Gestiona agentes de campo, visitas de verificación, reportes
y asignación de calificaciones iniciales a usuarios y propiedades.
"""

from decimal import Decimal

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()


class VerificationAgent(models.Model):
    """
    Perfil de agente de verificación.
    Un agente es un usuario staff que realiza visitas presenciales
    para verificar propietarios, inquilinos y propiedades.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="agent_profile",
        limit_choices_to={"is_staff": True},
        verbose_name="Usuario",
    )

    # Datos profesionales
    agent_code = models.CharField(
        "Código de agente", max_length=20, unique=True, blank=True
    )
    specialization = models.CharField(
        "Especialización",
        max_length=30,
        choices=[
            ("residential", "Residencial"),
            ("commercial", "Comercial"),
            ("both", "Residencial y Comercial"),
        ],
        default="both",
    )
    service_areas = models.JSONField(
        "Zonas de cobertura",
        default=list,
        help_text="Lista de barrios/zonas que cubre",
    )
    certifications = models.JSONField(
        "Certificaciones",
        default=list,
        help_text="Certificaciones profesionales del agente",
    )

    # Capacidad y disponibilidad
    max_weekly_visits = models.PositiveIntegerField("Máximo visitas/semana", default=15)
    is_available = models.BooleanField("Disponible", default=True)
    availability_notes = models.TextField("Notas de disponibilidad", blank=True)

    # Métricas
    total_visits_completed = models.PositiveIntegerField(
        "Total visitas completadas", default=0
    )
    average_rating = models.DecimalField(
        "Calificación promedio",
        max_digits=3,
        decimal_places=2,
        default=5.00,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )

    # Fechas
    hired_at = models.DateField("Fecha de contratación", default=timezone.now)
    created_at = models.DateTimeField("Fecha de registro", auto_now_add=True)
    updated_at = models.DateTimeField("Última actualización", auto_now=True)

    class Meta:
        verbose_name = "Agente de Verificación"
        verbose_name_plural = "Agentes de Verificación"
        ordering = ["-total_visits_completed"]

    def __str__(self):
        return f"[{self.agent_code}] {self.user.get_full_name()}"

    def save(self, *args, **kwargs):
        if not self.agent_code:
            from core.numbering import next_global_serial

            self.agent_code = next_global_serial(
                VerificationAgent, "AGT", "agent_code", padding=4
            )
        super().save(*args, **kwargs)

    @property
    def current_week_visits(self):
        from datetime import timedelta

        week_start = timezone.now() - timedelta(days=timezone.now().weekday())
        return self.assigned_visits.filter(
            scheduled_date__gte=week_start.date(),
            status__in=["scheduled", "in_progress", "completed"],
        ).count()

    @property
    def has_capacity(self):
        return self.current_week_visits < self.max_weekly_visits and self.is_available


class VerificationVisit(models.Model):
    """
    Visita de verificación presencial.
    Registra cuándo un agente visita a un propietario, inquilino
    o una propiedad para verificar su autenticidad.
    """

    VISIT_TYPES = [
        ("landlord", "Verificación de Arrendador"),
        ("tenant", "Verificación de Arrendatario"),
        ("property", "Verificación de Propiedad"),
        ("service_provider", "Verificación de Prestador de Servicios"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pendiente de Asignación"),
        ("scheduled", "Programada"),
        ("in_progress", "En Progreso"),
        ("completed", "Completada"),
        ("cancelled", "Cancelada"),
        ("rescheduled", "Reprogramada"),
        ("no_show", "No Asistió"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit_number = models.CharField(
        "Número de visita", max_length=20, unique=True, blank=True
    )

    # Tipo y asignación
    visit_type = models.CharField("Tipo de visita", max_length=20, choices=VISIT_TYPES)
    agent = models.ForeignKey(
        VerificationAgent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_visits",
        verbose_name="Agente asignado",
    )
    status = models.CharField(
        "Estado", max_length=15, choices=STATUS_CHOICES, default="pending"
    )

    # Persona a verificar
    target_user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="verification_visits",
        verbose_name="Persona a verificar",
    )
    # Propiedad (opcional, solo para verificación de inmuebles)
    property_ref = models.ForeignKey(
        "properties.Property",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="verification_visits",
        verbose_name="Propiedad a verificar",
    )

    # Programación
    scheduled_date = models.DateField("Fecha programada", null=True, blank=True)
    scheduled_time = models.TimeField("Hora programada", null=True, blank=True)
    visit_address = models.TextField("Dirección de la visita")
    visit_city = models.CharField("Ciudad", max_length=100, default="Bucaramanga")

    # Ejecución
    started_at = models.DateTimeField("Hora de inicio real", null=True, blank=True)
    completed_at = models.DateTimeField("Hora de finalización", null=True, blank=True)
    duration_minutes = models.PositiveIntegerField(
        "Duración (minutos)", null=True, blank=True
    )

    # Notas
    agent_notes = models.TextField("Notas del agente", blank=True)
    cancellation_reason = models.TextField("Motivo de cancelación", blank=True)

    # Resultado
    verification_passed = models.BooleanField("Verificación aprobada", null=True)

    # Fechas
    created_at = models.DateTimeField("Fecha de creación", auto_now_add=True)
    updated_at = models.DateTimeField("Última actualización", auto_now=True)

    class Meta:
        verbose_name = "Visita de Verificación"
        verbose_name_plural = "Visitas de Verificación"
        ordering = ["-scheduled_date", "-scheduled_time"]

    def __str__(self):
        return f"{self.visit_number} - {self.get_visit_type_display()} - {self.target_user.get_full_name()}"

    def save(self, *args, **kwargs):
        if not self.visit_number:
            from core.numbering import next_serial

            self.visit_number = next_serial(
                VerificationVisit,
                timezone.now().year,
                "VIS",
                "visit_number",
                padding=5,
            )
        if self.started_at and self.completed_at:
            self.duration_minutes = int(
                (self.completed_at - self.started_at).total_seconds() / 60
            )
        super().save(*args, **kwargs)


class VerificationReport(models.Model):
    """
    Reporte de verificación generado por el agente después de la visita.
    Contiene hallazgos, calificación inicial y evidencias fotográficas.
    """

    CONDITION_CHOICES = [
        ("excellent", "Excelente"),
        ("good", "Bueno"),
        ("acceptable", "Aceptable"),
        ("needs_improvement", "Necesita Mejoras"),
        ("rejected", "Rechazado"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    visit = models.OneToOneField(
        VerificationVisit,
        on_delete=models.CASCADE,
        related_name="report",
        verbose_name="Visita asociada",
    )

    # Evaluación general
    overall_condition = models.CharField(
        "Estado general",
        max_length=20,
        choices=CONDITION_CHOICES,
    )
    initial_rating = models.PositiveSmallIntegerField(
        "Calificación inicial",
        validators=[MinValueValidator(1), MaxValueValidator(10)],
        help_text="Calificación de 1 a 10 asignada por el agente",
    )

    # Verificación de identidad
    identity_verified = models.BooleanField("Identidad verificada", default=False)
    document_type_verified = models.CharField(
        "Tipo de documento", max_length=20, blank=True
    )
    document_number_verified = models.CharField(
        "Número de documento", max_length=30, blank=True
    )

    # Verificación de propiedad (si aplica)
    property_exists = models.BooleanField("Propiedad existe físicamente", null=True)
    property_matches_description = models.BooleanField(
        "Coincide con descripción", null=True
    )
    property_condition_notes = models.TextField(
        "Observaciones del inmueble", blank=True
    )

    # Verificación de persona
    person_lives_at_address = models.BooleanField(
        "Persona vive en la dirección", null=True
    )
    person_cooperative = models.BooleanField("Persona cooperativa", default=True)
    references_verified = models.BooleanField("Referencias verificadas", default=False)

    # Hallazgos
    findings = models.TextField("Hallazgos principales")
    recommendations = models.TextField("Recomendaciones", blank=True)
    risk_flags = models.JSONField(
        "Alertas de riesgo",
        default=list,
        help_text="Lista de alertas identificadas durante la verificación",
    )

    # Evidencias fotográficas
    photo_evidence = models.JSONField(
        "Evidencias fotográficas",
        default=list,
        help_text="URLs de fotos tomadas durante la visita",
    )

    # Aprobación
    approved_by_admin = models.BooleanField("Aprobado por admin", default=False)
    admin_notes = models.TextField("Notas del administrador", blank=True)

    # Fechas
    created_at = models.DateTimeField("Fecha del reporte", auto_now_add=True)
    updated_at = models.DateTimeField("Última actualización", auto_now=True)

    class Meta:
        verbose_name = "Reporte de Verificación"
        verbose_name_plural = "Reportes de Verificación"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Reporte {self.visit.visit_number} - {self.get_overall_condition_display()} ({self.initial_rating}/10)"


def _field_visit_upload_path(instance, filename):
    return f"verihome_id/{instance.user_id}/{instance.id}/{filename}"


class FieldVisitRequest(models.Model):
    """
    Solicitud de visita de campo VeriHome ID.

    Persiste el output del flujo digital (`VeriHomeIDDigitalResult` del
    frontend) y queda como trigger para programar la `VerificationVisit`
    presencial. Conserva imágenes (anverso/reverso/selfie) en disco y los
    datos estructurados de OCR/liveness/face match en JSON, junto con el
    score parcial digital y un veredicto.
    """

    DOCUMENT_TYPES = [
        ("cedula_ciudadania", "Cédula de Ciudadanía"),
        ("cedula_extranjeria", "Cédula de Extranjería"),
        ("tarjeta_identidad", "Tarjeta de Identidad"),
        ("pasaporte", "Pasaporte"),
    ]

    VERDICT_CHOICES = [
        ("aprobado", "Aprobado para visita"),
        ("observado", "Observado — requiere revisión"),
        ("rechazado", "Rechazado"),
    ]

    STATUS_CHOICES = [
        ("digital_completed", "Flujo digital completado"),
        ("visit_scheduled", "Visita presencial programada"),
        ("visit_completed", "Visita presencial completada"),
        ("rejected", "Rechazado en flujo digital"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="field_visit_requests",
        verbose_name="Usuario solicitante",
    )

    document_type_declared = models.CharField(
        "Tipo de documento declarado", max_length=30, choices=DOCUMENT_TYPES
    )
    document_number_declared = models.CharField(
        "Número de documento declarado", max_length=30
    )
    full_name_declared = models.CharField(
        "Nombre completo declarado", max_length=200
    )

    cedula_anverso = models.ImageField(
        "Cédula anverso",
        upload_to=_field_visit_upload_path,
        null=True,
        blank=True,
    )
    cedula_reverso = models.ImageField(
        "Cédula reverso",
        upload_to=_field_visit_upload_path,
        null=True,
        blank=True,
    )
    selfie_liveness = models.ImageField(
        "Selfie con liveness",
        upload_to=_field_visit_upload_path,
        null=True,
        blank=True,
    )

    ocr_data = models.JSONField(
        "Datos OCR",
        null=True,
        blank=True,
        help_text="ParsedColombianID: número, nombres, apellidos, fechas",
    )
    liveness_data = models.JSONField(
        "Datos liveness",
        null=True,
        blank=True,
        help_text="LivenessResult sin imagen (head turns + métricas)",
    )
    face_match_data = models.JSONField(
        "Match facial",
        null=True,
        blank=True,
        help_text="FaceMatchResult cédula↔selfie (similarity + threshold)",
    )

    digital_score = models.JSONField(
        "Score digital desglosado",
        help_text="VerihomeIdScoreBreakdown con sub-puntajes y observaciones",
    )
    digital_score_total = models.DecimalField(
        "Score digital total",
        max_digits=4,
        decimal_places=3,
        validators=[MinValueValidator(0), MaxValueValidator(0.5)],
        help_text="Score parcial 0.0–0.5 (la visita en campo aporta el resto)",
    )
    digital_verdict = models.CharField(
        "Veredicto digital", max_length=20, choices=VERDICT_CHOICES
    )

    scheduled_visit = models.OneToOneField(
        VerificationVisit,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="field_visit_request",
        verbose_name="Visita presencial vinculada",
    )

    status = models.CharField(
        "Estado", max_length=30, choices=STATUS_CHOICES, default="digital_completed"
    )

    user_agent = models.CharField("User-Agent", max_length=500, blank=True)
    ip_address = models.GenericIPAddressField("Dirección IP", null=True, blank=True)

    created_at = models.DateTimeField("Fecha de creación", auto_now_add=True)
    updated_at = models.DateTimeField("Última actualización", auto_now=True)

    class Meta:
        verbose_name = "Solicitud de Visita VeriHome ID"
        verbose_name_plural = "Solicitudes de Visita VeriHome ID"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return (
            f"VeriHome ID {self.user.email} "
            f"({self.digital_verdict}, {self.digital_score_total})"
        )


def _field_visit_act_pdf_path(instance, filename):
    return f"verihome_id/acts/{instance.field_request.user_id}/{instance.id}/{filename}"


class FieldVisitAct(models.Model):
    """
    Acta consolidada de la visita de campo VeriHome ID.

    Reúne las 10 secciones del flujo (`docs/strategy/VERIHOME_ID_FIELD_VISIT_FLOW.md`)
    en un único documento legalmente vinculante. Ciclo de firmas:
    verificado → agente → abogado titulado (Wilson). Al firmar el abogado
    se cierra el bloque de la cadena con `final_hash` referenciando el
    acta inmediatamente anterior, dando integridad probatoria estilo
    Merkle/blockchain ligero.

    Cumple Ley 527/1999 (mensajes de datos), Ley 1581/2012 (datos
    personales) y Ley 820/2003 (arrendamiento).
    """

    STATUS_CHOICES = [
        ("draft", "Borrador del agente"),
        ("signed_by_parties", "Firmada por verificado y agente"),
        ("signed_by_lawyer", "Firmada por abogado titulado"),
        ("sealed", "Sellada en cadena"),
    ]

    FINAL_VERDICT_CHOICES = [
        ("aprobado", "Aprobado"),
        ("observado", "Observado"),
        ("rechazado", "Rechazado"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    act_number = models.CharField(
        "Número de acta", max_length=20, unique=True, blank=True
    )

    field_request = models.OneToOneField(
        FieldVisitRequest,
        on_delete=models.PROTECT,
        related_name="act",
        verbose_name="Solicitud VeriHome ID",
    )
    visit = models.OneToOneField(
        VerificationVisit,
        on_delete=models.PROTECT,
        related_name="act",
        verbose_name="Visita presencial",
    )

    payload = models.JSONField(
        "Contenido del acta",
        default=dict,
        help_text=(
            "Secciones I-VIII consolidadas: identificación, agente, "
            "consentimiento, biometría, cruces oficiales, validación "
            "documental, inmueble, score y observaciones."
        ),
    )

    visit_score_breakdown = models.JSONField(
        "Score de visita desglosado",
        default=dict,
        blank=True,
        help_text=(
            "Sub-puntajes 0.0-0.5 asignados por el agente: "
            "{cedula_real, observacion_visual, recibo_publico, "
            "comprobante_laboral, email_otp, telefono_otp, "
            "cruces_oficiales, inmueble_existe}"
        ),
    )
    visit_score_total = models.DecimalField(
        "Score visita total",
        max_digits=4,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(0), MaxValueValidator(0.5)],
        help_text="Score parcial 0.0-0.5 que aporta la visita presencial",
    )
    total_score = models.DecimalField(
        "Score compuesto total",
        max_digits=4,
        decimal_places=3,
        default=Decimal("0.000"),
        validators=[MinValueValidator(0), MaxValueValidator(1)],
        help_text=(
            "Suma del score digital (0.0-0.5) + score visita (0.0-0.5). "
            "Se actualiza automáticamente al save()."
        ),
    )
    final_verdict = models.CharField(
        "Veredicto final",
        max_length=20,
        choices=FINAL_VERDICT_CHOICES,
        default="rechazado",
        help_text=(
            "≥0.80 aprobado · ≥0.55 observado · <0.55 rechazado. "
            "Se recalcula automáticamente al save() con visit_score_total."
        ),
    )

    pdf_file = models.FileField(
        "PDF del acta",
        upload_to=_field_visit_act_pdf_path,
        null=True,
        blank=True,
        max_length=255,
    )
    pdf_sha256 = models.CharField("SHA-256 del PDF", max_length=64, blank=True)

    verified_signature = models.JSONField(
        "Firma del verificado", null=True, blank=True
    )
    verified_signed_at = models.DateTimeField(
        "Fecha firma verificado", null=True, blank=True
    )
    agent_signature = models.JSONField("Firma del agente", null=True, blank=True)
    agent_signed_at = models.DateTimeField(
        "Fecha firma agente", null=True, blank=True
    )

    lawyer_user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="signed_acts",
        verbose_name="Abogado certificador",
    )
    lawyer_signed_at = models.DateTimeField(
        "Fecha firma abogado", null=True, blank=True
    )
    lawyer_tp_number = models.CharField(
        "T.P. abogado", max_length=20, blank=True
    )
    lawyer_full_name = models.CharField(
        "Nombre completo abogado", max_length=200, blank=True
    )
    lawyer_cc = models.CharField("Cédula abogado", max_length=30, blank=True)
    lawyer_certificate_fingerprint = models.CharField(
        "Huella certificado .p12",
        max_length=64,
        blank=True,
        help_text="Reservado para firma PAdES futura (C13).",
    )

    prev_act = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="next_act",
        verbose_name="Acta anterior en cadena",
    )
    prev_hash = models.CharField("Hash anterior", max_length=64, blank=True)
    payload_hash = models.CharField("Hash de payload + PDF", max_length=64, blank=True)
    final_hash = models.CharField(
        "Hash final del bloque", max_length=64, blank=True, db_index=True
    )
    block_number = models.PositiveIntegerField(
        "Número de bloque", null=True, blank=True, unique=True
    )

    status = models.CharField(
        "Estado", max_length=20, choices=STATUS_CHOICES, default="draft"
    )

    geolocation_lat = models.DecimalField(
        "Latitud", max_digits=9, decimal_places=6, null=True, blank=True
    )
    geolocation_lng = models.DecimalField(
        "Longitud", max_digits=9, decimal_places=6, null=True, blank=True
    )
    ip_address = models.GenericIPAddressField("Dirección IP", null=True, blank=True)

    created_at = models.DateTimeField("Fecha creación", auto_now_add=True)
    updated_at = models.DateTimeField("Última actualización", auto_now=True)

    class Meta:
        verbose_name = "Acta VeriHome ID"
        verbose_name_plural = "Actas VeriHome ID"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["block_number"]),
        ]

    def __str__(self):
        return f"{self.act_number or '(sin número)'} · {self.get_status_display()}"

    def recompute_score(self) -> None:
        """
        Recalcula `total_score` y `final_verdict` a partir de
        `digital_score_total` (FieldVisitRequest) + `visit_score_total`.
        Umbrales: ≥0.80 aprobado · ≥0.55 observado · <0.55 rechazado.
        """
        digital = self.field_request.digital_score_total or Decimal("0.000")
        visit = self.visit_score_total or Decimal("0.000")
        self.total_score = (digital + visit).quantize(Decimal("0.001"))
        if self.total_score >= Decimal("0.80"):
            self.final_verdict = "aprobado"
        elif self.total_score >= Decimal("0.55"):
            self.final_verdict = "observado"
        else:
            self.final_verdict = "rechazado"

    def save(self, *args, **kwargs):
        if not self.act_number:
            from core.numbering import next_serial

            self.act_number = next_serial(
                FieldVisitAct,
                timezone.now().year,
                "ACT",
                "act_number",
                padding=5,
            )
        if self.field_request_id:
            self.recompute_score()
        super().save(*args, **kwargs)
