"""
Modelos para Sistema de Control Molecular de Contratos
Permite editar cláusulas desde el panel de administración Django
sin necesidad de modificar código Python.

Creado: Diciembre 2025
Autor: VeriHome - Sistema de Gestión Inmobiliaria
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class EditableContractClause(models.Model):
    """
    Cláusula editable desde panel admin - Control Molecular

    Cada cláusula puede ser editada, versionada y asignada a diferentes
    tipos de contrato sin necesidad de modificar código.
    """

    CLAUSE_CATEGORIES = [
        ('mandatory', 'Obligatoria por Ley'),
        ('standard', 'Estándar'),
        ('optional', 'Opcional'),
        ('guarantee', 'Garantías'),
    ]

    CONTRACT_TYPES = [
        ('rental_urban', 'Arrendamiento de Vivienda Urbana'),
        ('rental_commercial', 'Arrendamiento de Local Comercial'),
        ('rental_room', 'Arrendamiento de Habitación'),
        ('rental_rural', 'Arrendamiento de Inmueble Rural'),
    ]

    # Identificación
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clause_number = models.PositiveIntegerField(
        'Número de Cláusula',
        help_text='Número secuencial (1-34 para cláusulas estándar)'
    )
    ordinal_text = models.CharField(
        'Texto Ordinal',
        max_length=50,
        help_text='Ej: PRIMERA, SEGUNDA, TERCERA...'
    )

    # Contenido
    title = models.CharField(
        'Título',
        max_length=200,
        help_text='Ej: OBJETO, PRECIO, TÉRMINO...'
    )
    content = models.TextField(
        'Contenido con Variables',
        help_text='Use {variable} para insertar datos dinámicos. Ej: {property_address}, {monthly_rent}'
    )

    # Clasificación
    category = models.CharField(
        'Categoría',
        max_length=20,
        choices=CLAUSE_CATEGORIES,
        default='standard'
    )
    contract_types = models.JSONField(
        'Tipos de Contrato Aplicables',
        default=list,
        help_text='Lista de tipos de contrato donde aplica esta cláusula'
    )
    legal_reference = models.CharField(
        'Referencia Legal',
        max_length=200,
        blank=True,
        help_text='Ej: Art. 1973 Código Civil, Ley 820 de 2003'
    )

    # Variables permitidas (para validación y autocompletado)
    allowed_variables = models.JSONField(
        'Variables Permitidas',
        default=list,
        blank=True,
        help_text='Lista de variables que se pueden usar en esta cláusula'
    )

    # PARÁGRAFO opcional
    has_paragraph = models.BooleanField(
        'Tiene Parágrafo',
        default=False,
        help_text='Marcar para agregar un parágrafo a esta cláusula'
    )
    paragraph_text = models.TextField(
        'Texto del Parágrafo',
        blank=True,
        help_text='Texto del parágrafo. Puede usar {variables} igual que en el contenido principal.'
    )

    # Control de versiones
    version = models.PositiveIntegerField(
        'Versión',
        default=1,
        help_text='Se incrementa automáticamente al editar'
    )
    is_active = models.BooleanField(
        'Activa',
        default=True,
        help_text='Desmarcar para ocultar sin eliminar'
    )

    # Auditoría
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_clauses',
        verbose_name='Creado por'
    )
    created_at = models.DateTimeField('Fecha de Creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última Modificación', auto_now=True)

    class Meta:
        verbose_name = 'Cláusula Editable'
        verbose_name_plural = 'Cláusulas Editables'
        ordering = ['clause_number']
        unique_together = [['clause_number', 'version']]

    def __str__(self):
        return f"CLÁUSULA {self.ordinal_text} - {self.title}"

    def save(self, *args, **kwargs):
        """Incrementar versión si hay cambios en contenido"""
        if self.pk:
            try:
                old = EditableContractClause.objects.get(pk=self.pk)
                if old.content != self.content:
                    # Crear snapshot de versión anterior
                    ClauseVersion.objects.create(
                        clause=self,
                        version_number=self.version,
                        content_snapshot=old.content,
                        title_snapshot=old.title,
                        change_reason='Actualización de contenido',
                        changed_by=getattr(self, '_changed_by', None)
                    )
                    self.version += 1
            except EditableContractClause.DoesNotExist:
                pass
        super().save(*args, **kwargs)

    def get_rendered_content(self, context: dict) -> str:
        """
        Renderizar contenido con variables interpoladas.

        Args:
            context: Diccionario con variables {property_address: '...', monthly_rent: '...'}

        Returns:
            Contenido con variables reemplazadas
        """
        try:
            return self.content.format(**context)
        except KeyError:
            # Si falta una variable, retornar con placeholder visible
            return self.content.replace('{', '[FALTA: ').replace('}', ']')

    def get_rendered_paragraph(self, context: dict) -> str:
        """
        Renderizar parágrafo con variables interpoladas.

        Args:
            context: Diccionario con variables

        Returns:
            Texto del parágrafo con variables reemplazadas, o cadena vacía si no tiene
        """
        if not self.has_paragraph or not self.paragraph_text:
            return ''
        try:
            return self.paragraph_text.format(**context)
        except KeyError:
            return self.paragraph_text.replace('{', '[FALTA: ').replace('}', ']')

    @classmethod
    def get_available_variables(cls) -> list:
        """Retorna lista de todas las variables disponibles con descripción"""
        return [
            {'var': '{property_address}', 'desc': 'Dirección completa del inmueble'},
            {'var': '{property_city}', 'desc': 'Ciudad del inmueble'},
            {'var': '{property_department}', 'desc': 'Departamento del inmueble'},
            {'var': '{property_type}', 'desc': 'Tipo de inmueble (casa, apartamento, etc.)'},
            {'var': '{property_area}', 'desc': 'Área en metros cuadrados'},
            {'var': '{monthly_rent}', 'desc': 'Canon mensual formateado ($1,500,000)'},
            {'var': '{monthly_rent_words}', 'desc': 'Canon en letras'},
            {'var': '{payment_day}', 'desc': 'Día de pago (1-31)'},
            {'var': '{contract_duration_months}', 'desc': 'Duración del contrato en meses'},
            {'var': '{start_date}', 'desc': 'Fecha de inicio del contrato'},
            {'var': '{end_date}', 'desc': 'Fecha de vencimiento calculada'},
            {'var': '{landlord_name}', 'desc': 'Nombre completo del arrendador'},
            {'var': '{landlord_document}', 'desc': 'Documento del arrendador'},
            {'var': '{landlord_address}', 'desc': 'Dirección del arrendador'},
            {'var': '{tenant_name}', 'desc': 'Nombre completo del arrendatario'},
            {'var': '{tenant_document}', 'desc': 'Documento del arrendatario'},
            {'var': '{codeudor_full_name}', 'desc': 'Nombre del codeudor/garante'},
            {'var': '{codeudor_document_type}', 'desc': 'Tipo de documento del codeudor'},
            {'var': '{codeudor_document_number}', 'desc': 'Número de documento del codeudor'},
            {'var': '{codeudor_address}', 'desc': 'Dirección del codeudor'},
            {'var': '{codeudor_phone}', 'desc': 'Teléfono del codeudor'},
            {'var': '{codeudor_email}', 'desc': 'Email del codeudor'},
            {'var': '{codeudor_occupation}', 'desc': 'Ocupación del codeudor'},
            {'var': '{codeudor_monthly_income}', 'desc': 'Ingresos mensuales del codeudor'},
            {'var': '{codeudor_employer}', 'desc': 'Empleador del codeudor'},
            {'var': '{guarantee_type}', 'desc': 'Tipo de garantía'},
            {'var': '{guarantee_amount}', 'desc': 'Monto de la garantía'},
            {'var': '{deposit_amount}', 'desc': 'Monto del depósito'},
            {'var': '{admin_fee}', 'desc': 'Cuota de administración'},
            {'var': '{current_date}', 'desc': 'Fecha actual'},
            {'var': '{contract_number}', 'desc': 'Número de contrato'},
        ]


class ClauseVersion(models.Model):
    """
    Historial de versiones para auditoría legal.

    Cada vez que se modifica una cláusula, se guarda un snapshot
    de la versión anterior para poder rastrear cambios.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    clause = models.ForeignKey(
        EditableContractClause,
        on_delete=models.CASCADE,
        related_name='versions',
        verbose_name='Cláusula'
    )
    version_number = models.PositiveIntegerField('Número de Versión')

    # Snapshot del contenido
    content_snapshot = models.TextField('Contenido en esta Versión')
    title_snapshot = models.CharField('Título en esta Versión', max_length=200, blank=True)

    # Auditoría
    change_reason = models.TextField(
        'Razón del Cambio',
        blank=True,
        help_text='Motivo de la modificación (para auditoría legal)'
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name='Modificado por'
    )
    changed_at = models.DateTimeField('Fecha del Cambio', auto_now_add=True)

    class Meta:
        verbose_name = 'Versión de Cláusula'
        verbose_name_plural = 'Versiones de Cláusulas'
        ordering = ['-version_number']
        unique_together = [['clause', 'version_number']]

    def __str__(self):
        return f"{self.clause.title} - v{self.version_number}"


class ContractTypeTemplate(models.Model):
    """
    Plantilla completa por tipo de contrato.

    Define qué cláusulas y en qué orden se incluyen para cada
    tipo de contrato (urbano, comercial, habitación, rural).
    """

    CONTRACT_TYPES = [
        ('rental_urban', 'Arrendamiento de Vivienda Urbana'),
        ('rental_commercial', 'Arrendamiento de Local Comercial'),
        ('rental_room', 'Arrendamiento de Habitación'),
        ('rental_rural', 'Arrendamiento de Inmueble Rural'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contract_type = models.CharField(
        'Tipo de Contrato',
        max_length=20,
        choices=CONTRACT_TYPES,
        unique=True
    )
    name = models.CharField(
        'Nombre Descriptivo',
        max_length=200,
        help_text='Ej: Contrato de Arrendamiento de Vivienda Urbana - Ley 820 de 2003'
    )
    description = models.TextField(
        'Descripción',
        blank=True,
        help_text='Descripción detallada de cuándo usar esta plantilla'
    )

    # Cláusulas asignadas (orden importa)
    clauses = models.ManyToManyField(
        EditableContractClause,
        through='TemplateClauseAssignment',
        verbose_name='Cláusulas'
    )

    # Control
    is_active = models.BooleanField(
        'Activa',
        default=True,
        help_text='Desmarcar para deshabilitar esta plantilla'
    )
    last_reviewed = models.DateTimeField(
        'Última Revisión Admin',
        null=True,
        blank=True,
        help_text='Fecha de última revisión por el administrador legal'
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_templates',
        verbose_name='Revisado por'
    )

    # Timestamps
    created_at = models.DateTimeField('Fecha de Creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última Modificación', auto_now=True)

    class Meta:
        verbose_name = 'Plantilla de Contrato'
        verbose_name_plural = 'Plantillas de Contratos'
        ordering = ['contract_type']

    def __str__(self):
        return f"{self.get_contract_type_display()}"

    def get_ordered_clauses(self):
        """Retorna cláusulas en el orden definido para esta plantilla"""
        return self.clauses.filter(
            is_active=True,
            templateclauseassignment__template=self
        ).order_by('templateclauseassignment__order')

    def mark_as_reviewed(self, user):
        """Marca la plantilla como revisada por el admin"""
        self.last_reviewed = timezone.now()
        self.reviewed_by = user
        self.save(update_fields=['last_reviewed', 'reviewed_by', 'updated_at'])


class TemplateClauseAssignment(models.Model):
    """
    Asignación de cláusulas a plantillas con orden específico.

    Permite definir qué cláusulas van en cada plantilla y en qué orden.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        ContractTypeTemplate,
        on_delete=models.CASCADE,
        verbose_name='Plantilla'
    )
    clause = models.ForeignKey(
        EditableContractClause,
        on_delete=models.CASCADE,
        verbose_name='Cláusula'
    )
    order = models.PositiveIntegerField(
        'Orden en Plantilla',
        help_text='Número de orden (1, 2, 3...)'
    )
    is_required = models.BooleanField(
        'Obligatoria',
        default=True,
        help_text='Si es obligatoria, siempre se incluye en el contrato'
    )

    class Meta:
        verbose_name = 'Asignación de Cláusula'
        verbose_name_plural = 'Asignaciones de Cláusulas'
        ordering = ['order']
        unique_together = [['template', 'clause'], ['template', 'order']]

    def __str__(self):
        return f"{self.template.contract_type} - #{self.order}: {self.clause.title}"
