"""
Modelos para el sistema de matching entre arrendadores y arrendatarios de VeriHome.
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

User = get_user_model()


class MatchRequest(models.Model):
    """Solicitudes de match entre arrendatarios y propiedades."""
    
    MATCH_STATUS = [
        ('pending', 'Pendiente'),
        ('viewed', 'Vista por Arrendador'),
        ('accepted', 'Aceptada'),
        ('rejected', 'Rechazada'),
        ('expired', 'Expirada'),
        ('cancelled', 'Cancelada'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Baja'),
        ('medium', 'Media'),
        ('high', 'Alta'),
        ('urgent', 'Urgente'),
    ]
    
    # IDs
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match_code = models.CharField('Código de Match', max_length=12, unique=True, editable=False)
    
    # Relaciones principales
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='match_requests',
        verbose_name='Propiedad'
    )
    tenant = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='match_requests_sent',
        verbose_name='Arrendatario'
    )
    landlord = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='match_requests_received',
        verbose_name='Arrendador'
    )
    
    # Estado del match
    status = models.CharField('Estado', max_length=20, choices=MATCH_STATUS, default='pending')
    priority = models.CharField('Prioridad', max_length=10, choices=PRIORITY_LEVELS, default='medium')
    
    # Información del arrendatario
    tenant_message = models.TextField(
        'Mensaje del arrendatario',
        max_length=1000,
        help_text='Mensaje personalizado del arrendatario al arrendador'
    )
    tenant_phone = models.CharField('Teléfono de contacto', max_length=15, blank=True)
    tenant_email = models.EmailField('Email de contacto', blank=True)
    
    # Información financiera del interesado
    monthly_income = models.DecimalField(
        'Ingresos mensuales',
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )
    employment_type = models.CharField(
        'Tipo de empleo',
        max_length=50,
        choices=[
            ('employed', 'Empleado'),
            ('self_employed', 'Independiente'),
            ('freelancer', 'Freelancer'),
            ('student', 'Estudiante'),
            ('retired', 'Pensionado'),
            ('unemployed', 'Desempleado'),
            ('other', 'Otro')
        ],
        blank=True
    )
    
    # Preferencias específicas
    preferred_move_in_date = models.DateField('Fecha preferida de mudanza', null=True, blank=True)
    lease_duration_months = models.PositiveIntegerField(
        'Duración deseada del contrato (meses)',
        default=12,
        validators=[MinValueValidator(1), MaxValueValidator(60)]
    )
    
    # Referencias del arrendatario
    has_rental_references = models.BooleanField('Tiene referencias de alquiler', default=False)
    has_employment_proof = models.BooleanField('Tiene comprobante de ingresos', default=False)
    has_credit_check = models.BooleanField('Autoriza verificación crediticia', default=False)
    
    # Información adicional
    number_of_occupants = models.PositiveIntegerField('Número de ocupantes', default=1)
    has_pets = models.BooleanField('Tiene mascotas', default=False)
    pet_details = models.TextField('Detalles de mascotas', max_length=500, blank=True)
    smoking_allowed = models.BooleanField('Fumador', default=False)
    
    # Respuesta del arrendador
    landlord_response = models.TextField('Respuesta del arrendador', max_length=1000, blank=True)
    landlord_notes = models.TextField('Notas privadas del arrendador', max_length=500, blank=True)
    
    # Fechas importantes
    created_at = models.DateTimeField('Fecha de solicitud', auto_now_add=True)
    viewed_at = models.DateTimeField('Vista por arrendador', null=True, blank=True)
    responded_at = models.DateTimeField('Fecha de respuesta', null=True, blank=True)
    expires_at = models.DateTimeField('Fecha de expiración', null=True, blank=True)
    
    # Seguimiento
    follow_up_count = models.PositiveIntegerField('Número de seguimientos', default=0)
    last_follow_up = models.DateTimeField('Último seguimiento', null=True, blank=True)
    
    # Estado del contrato
    has_contract = models.BooleanField('Tiene contrato', default=False)
    contract_generated_at = models.DateTimeField('Fecha de generación del contrato', null=True, blank=True)
    
    # Datos del workflow (sincronización con PropertyInterestRequest)
    workflow_stage = models.IntegerField('Etapa del workflow', default=1, help_text="1=Visita, 2=Documentos, 3=Contrato")
    workflow_status = models.CharField('Estado del workflow', max_length=30, default='pending', help_text="Estado específico dentro de la etapa")
    workflow_data = models.JSONField('Datos del workflow', default=dict, blank=True)
    
    class Meta:
        verbose_name = 'Solicitud de Match'
        verbose_name_plural = 'Solicitudes de Match'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['landlord', 'status']),
            models.Index(fields=['tenant', 'created_at']),
        ]
    
    def __str__(self):
        return f"Match {self.match_code} - {self.tenant.get_full_name()} → {self.property.title}"
    
    def save(self, *args, **kwargs):
        if not self.match_code:
            self.match_code = self.generate_match_code()
        
        if not self.expires_at and self.status == 'pending':
            # Expira en 7 días
            self.expires_at = timezone.now() + timezone.timedelta(days=7)
        
        # Auto-llenar datos de contacto si están vacíos
        if not self.tenant_email:
            self.tenant_email = self.tenant.email
        
        super().save(*args, **kwargs)
    
    def generate_match_code(self):
        """Genera un código único para el match."""
        import random
        import string
        
        while True:
            code = 'MT-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            if not MatchRequest.objects.filter(match_code=code).exists():
                return code
    
    def mark_as_viewed(self):
        """Marca la solicitud como vista por el arrendador."""
        if self.status == 'pending':
            self.status = 'viewed'
            self.viewed_at = timezone.now()
            self.save()
    
    def accept_match(self, landlord_message=''):
        """Acepta la solicitud de match y crea el Contract asociado."""
        self.status = 'accepted'
        self.responded_at = timezone.now()
        self.landlord_response = landlord_message
        self.workflow_stage = 1
        self.workflow_status = 'visit_pending'
        self.save()

        from .services import MatchingMessagingService
        MatchingMessagingService.create_match_thread(self)

        self._ensure_contract_exists()

    def _ensure_contract_exists(self):
        """Crea el Contract legacy y su LandlordControlledContract sincronizado.

        BIO-02: el flujo biométrico exige que ambos registros existan con el
        MISMO UUID (ver StartBiometricAuthenticationAPIView). Además, el
        endpoint /tenant/contracts/{id}/approve_contract/ del serializer del
        tenant busca el LCC, por lo que sin este par sincronizado el tenant
        queda bloqueado y solo puede avanzar pasando por el formulario manual
        del landlord.
        """
        from contracts.models import Contract
        from contracts.landlord_contract_models import LandlordControlledContract
        from datetime import timedelta

        if Contract.objects.filter(match_request=self).exists():
            return

        months = self.lease_duration_months or 12
        start = self.preferred_move_in_date or timezone.now().date()
        end = start + timedelta(days=30 * months)
        monthly_rent = self.property.rent_price

        shared_id = uuid.uuid4()

        Contract.objects.create(
            id=shared_id,
            match_request=self,
            contract_type='rental_urban',
            primary_party=self.landlord,
            secondary_party=self.tenant,
            property=self.property,
            title=f'Contrato {self.property.title}',
            description=f'Arrendamiento vinculado al match {self.match_code}',
            content='',
            start_date=start,
            end_date=end,
            status='draft',
            monthly_rent=monthly_rent,
        )

        # LCC sincronizado (mismo UUID) en estado 'BOTH_REVIEWING' para que el
        # tenant pueda ejecutar approve_contract sin requerir que el landlord
        # pase por el formulario manual de creación.
        LandlordControlledContract.objects.create(
            id=shared_id,
            landlord=self.landlord,
            tenant=self.tenant,
            property=self.property,
            contract_type='rental_urban',
            title=f'Contrato {self.property.title}',
            description=f'Arrendamiento vinculado al match {self.match_code}',
            current_state='BOTH_REVIEWING',
            tenant_identifier=self.tenant.email,
            start_date=start,
            end_date=end,
            economic_terms={
                'monthly_rent': str(monthly_rent) if monthly_rent is not None else '0',
                'currency': 'COP',
            },
            contract_terms={
                'duration_months': months,
                'start_date': start.isoformat(),
                'end_date': end.isoformat(),
            },
            landlord_approved=True,
            landlord_approved_at=timezone.now(),
            admin_reviewed=True,
            admin_reviewed_at=timezone.now(),
        )
    
    def reject_match(self, landlord_message=''):
        """Rechaza la solicitud de match y limpia todos los datos asociados."""
        from django.db import transaction
        
        with transaction.atomic():
            # 1. Cambiar status del match
            old_status = self.status
            self.status = 'rejected'
            self.responded_at = timezone.now()
            self.landlord_response = landlord_message
            self.save()
            
            # 2. LIMPIAR TODOS LOS DATOS ASOCIADOS AL MATCH RECHAZADO
            self._cleanup_associated_data()
            
            # 3. Enviar notificación de rechazo
            from .services import MatchingMessagingService
            MatchingMessagingService.send_match_rejection_message(self)
            
            # 4. Log de la limpieza
            print(f"🧹 Match {self.match_code} rechazado y datos limpiados completamente")
    
    def _cleanup_associated_data(self):
        """Limpia todos los datos asociados a este match cuando es rechazado."""
        
        print(f"🧹 INICIANDO LIMPIEZA COMPLETA para match {self.match_code}")
        
        # 1. ELIMINAR CONTRATOS ASOCIADOS
        from contracts.models import Contract, ContractSignature, BiometricAuthentication, ContractDocument
        contracts = Contract.objects.filter(
            variables_data__workflow_match_id=str(self.id)
        )
        contract_count = contracts.count()
        if contract_count > 0:
            print(f"   📄 Eliminando {contract_count} contrato(s) asociado(s)")
            # Eliminar firmas y autenticaciones relacionadas
            for contract in contracts:
                ContractSignature.objects.filter(contract=contract).delete()
                BiometricAuthentication.objects.filter(contract=contract).delete() 
                ContractDocument.objects.filter(contract=contract).delete()
            contracts.delete()
        
        # 2. ELIMINAR DOCUMENTOS DEL INQUILINO Y PROPERTYINTERESTREQUEST
        from requests.models import TenantDocument, PropertyInterestRequest
        
        # Buscar PropertyInterestRequest asociado
        property_requests = PropertyInterestRequest.objects.filter(
            requester=self.tenant,
            property=self.property
        )
        doc_count = 0
        prop_request_count = property_requests.count()
        
        for prop_request in property_requests:
            # Eliminar documentos asociados
            tenant_docs = TenantDocument.objects.filter(property_request=prop_request)
            doc_count += tenant_docs.count()
            if tenant_docs.exists():
                print(f"   📋 Eliminando {tenant_docs.count()} documento(s) del inquilino")
                tenant_docs.delete()
        
        # Eliminar las PropertyInterestRequest completamente
        if prop_request_count > 0:
            print(f"   📄 Eliminando {prop_request_count} solicitud(es) de propiedad")
            property_requests.delete()
        
        # 3. ELIMINAR MENSAJES DEL HILO DE CONVERSACIÓN
        from messaging.models import Message, MessageThread as Thread
        try:
            # Buscar hilo de conversación específico de este match
            thread = Thread.objects.filter(
                participants__in=[self.landlord, self.tenant]
            ).filter(
                participants__in=[self.landlord, self.tenant]
            ).distinct().first()
            
            if thread:
                message_count = Message.objects.filter(thread=thread).count()
                if message_count > 0:
                    print(f"   💬 Eliminando {message_count} mensaje(s) del hilo")
                    Message.objects.filter(thread=thread).delete()
                    # No eliminar el thread, solo los mensajes
        except Exception as e:
            print(f"   ⚠️  Error limpiando mensajes: {e}")
        
        # 4. LIMPIAR DATOS DEL WORKFLOW EN EL MATCH
        if hasattr(self, 'workflow_data') and self.workflow_data:
            print("   🔄 Limpiando datos de workflow")
            self.workflow_data = {}
            self.current_stage = 1  # Resetear a etapa inicial
            self.save(update_fields=['workflow_data', 'current_stage'])
        
        # 5. LIBERAR LA PROPIEDAD PARA NUEVAS SOLICITUDES
        # No marcar como no disponible, solo limpiar reservas temporales
        if self.property:
            print(f"   🏠 Liberando propiedad {self.property.title} para nuevas solicitudes")
            # La propiedad queda disponible automáticamente
        
        print(f"✅ Limpieza completa terminada para match {self.match_code}")
        print(f"   • {contract_count} contratos eliminados")
        print(f"   • {prop_request_count} solicitudes de propiedad eliminadas")
        print(f"   • {doc_count} documentos de inquilino eliminados")
        print("   • Mensajes del hilo de conversación limpiados")
        print("   • Propiedad liberada para nuevas solicitudes")
        print("   • Datos de workflow reiniciados")
        print("🎯 El inquilino puede solicitar nuevamente sin datos residuales")
    
    def is_expired(self):
        """Verifica si la solicitud ha expirado."""
        return self.expires_at and timezone.now() > self.expires_at
    
    def can_follow_up(self):
        """Verifica si se puede hacer seguimiento."""
        if self.status not in ['pending', 'viewed']:
            return False
        
        if not self.last_follow_up:
            return True
        
        # Permitir seguimiento cada 2 días
        return timezone.now() > self.last_follow_up + timezone.timedelta(days=2)
    
    def create_notification(self, notification_type):
        """Crea una notificación relacionada con el match."""
        from .utils import create_match_notification
        create_match_notification(self, notification_type)
    
    def get_compatibility_score(self):
        """Calcula un puntaje de compatibilidad básico."""
        score = 0
        
        # Verificación de ingresos (30 puntos)
        if self.monthly_income and self.property.rent_price:
            income_ratio = float(self.monthly_income) / float(self.property.rent_price)
            if income_ratio >= 3:
                score += 30
            elif income_ratio >= 2.5:
                score += 20
            elif income_ratio >= 2:
                score += 10
        
        # Referencias y documentos (25 puntos)
        if self.has_rental_references:
            score += 10
        if self.has_employment_proof:
            score += 10
        if self.has_credit_check:
            score += 5
        
        # Mascotas compatibilidad (15 puntos)
        if self.has_pets == self.property.pets_allowed:
            score += 15
        elif not self.has_pets:
            score += 10
        
        # Fumador compatibilidad (10 puntos)
        if self.smoking_allowed == getattr(self.property, 'smoking_allowed', False):
            score += 10
        elif not self.smoking_allowed:
            score += 5
        
        # Duración del contrato (10 puntos)
        if 6 <= self.lease_duration_months <= 24:
            score += 10
        
        # Mensaje personalizado (10 puntos)
        if len(self.tenant_message) > 100:
            score += 10
        elif len(self.tenant_message) > 50:
            score += 5
        
        return min(score, 100)  # Máximo 100 puntos
    
    def can_create_contract(self):
        """Verifica si el match puede crear un contrato."""
        # Solo matches aceptados pueden generar contratos
        if self.status != 'accepted':
            return False
        
        # No debe tener ya un contrato
        if self.has_contract:
            return False
        
        # Debe tener información financiera mínima
        if not self.monthly_income or not self.has_employment_proof:
            return False
        
        # La propiedad debe estar activa
        if not self.property.is_active or self.property.status != 'available':
            return False
        
        return True
    
    def get_contract(self):
        """Obtiene el Contract (legacy) asociado si existe."""
        from contracts.models import Contract
        return Contract.objects.filter(match_request=self).first()

    def auto_create_contract(self):
        """
        ✅ GENERA AUTOMÁTICAMENTE UN CONTRATO DESDE EL MATCH APROBADO
        Vincula el contrato con este match y copia todos los datos relevantes.

        BUG-E2E-03: crea AMBOS modelos (Contract legacy + LandlordControlledContract)
        en la misma transacción atómica, compartiendo el mismo UUID, para que los
        endpoints del sistema nuevo (approve_contract, etc.) encuentren el contrato.
        """
        from contracts.models import Contract
        from contracts.landlord_contract_models import LandlordControlledContract
        from django.db import transaction
        from django.utils import timezone
        from dateutil.relativedelta import relativedelta

        # Validaciones
        if self.has_contract:
            raise ValueError("Ya existe un contrato para este match")

        if self.status != 'accepted':
            raise ValueError("El match debe estar aceptado para generar contrato")

        if not self.property:
            raise ValueError("El match debe tener una propiedad asociada")

        # Calcular fechas del contrato
        start_date = self.preferred_move_in_date or (timezone.now().date() + timezone.timedelta(days=7))
        end_date = start_date + relativedelta(months=self.lease_duration_months)

        monthly_rent = self.property.rent_price

        with transaction.atomic():
            # Crear contrato legacy con datos del match
            contract = Contract.objects.create(
                match_request=self,  # ✅ VÍNCULO CON MATCH
                contract_type='rental_urban',
                title=f"Contrato de Arrendamiento - {self.property.title}",
                description=f"Generado automáticamente desde match {self.match_code}",
                content="Contrato de arrendamiento de vivienda urbana",

                # Partes del contrato
                primary_party=self.landlord,
                secondary_party=self.tenant,

                # Fechas
                start_date=start_date,
                end_date=end_date,

                # Información financiera
                monthly_rent=monthly_rent,
                security_deposit=monthly_rent * 1,  # 1 mes de depósito

                # Estado inicial
                status='draft',

                # Variables adicionales del match
                variables_data={
                    'match_code': self.match_code,
                    'monthly_income': float(self.monthly_income) if self.monthly_income else None,
                    'employment_type': self.employment_type,
                    'number_of_occupants': self.number_of_occupants,
                    'has_pets': self.has_pets,
                    'pet_details': self.pet_details,
                    'lease_duration_months': self.lease_duration_months,
                    'workflow_match_id': str(self.id),
                }
            )

            # BUG-E2E-03: crear LandlordControlledContract espejo con mismo UUID
            # para que el sistema nuevo encuentre el contrato cuando el tenant
            # lo aprueba desde /api/v1/contracts/tenant/contracts/{id}/approve_contract/
            try:
                LandlordControlledContract.objects.get_or_create(
                    id=contract.id,
                    defaults={
                        'contract_number': contract.contract_number,
                        'landlord': self.landlord,
                        'tenant': self.tenant,
                        'property': self.property,
                        'contract_type': 'rental_urban',
                        'title': contract.title,
                        'description': contract.description or '',
                        'current_state': 'TENANT_REVIEWING',  # listo para que tenant revise
                        'start_date': start_date,
                        'end_date': end_date,
                        'economic_terms': {
                            'monthly_rent': float(monthly_rent) if monthly_rent else 0,
                            'security_deposit': float(monthly_rent) if monthly_rent else 0,
                        },
                        'contract_terms': {
                            'duration_months': self.lease_duration_months,
                        },
                        'property_data': {
                            'title': self.property.title,
                            'address': self.property.address,
                            'city': self.property.city,
                        },
                        'landlord_approved': True,
                        'landlord_approved_at': timezone.now(),
                    }
                )
            except Exception as exc:
                # No fallar la creación del Contract legacy si el espejo falla.
                # Se puede sincronizar después con scripts/fixes/sync_biometric_contract.py
                import logging
                logging.getLogger(__name__).warning(
                    f"auto_create_contract: no se pudo crear LandlordControlledContract espejo: {exc}"
                )

        # Actualizar estado del match
        self.has_contract = True
        self.contract_generated_at = timezone.now()
        self.workflow_stage = 3  # Etapa 3: Contrato
        self.workflow_status = 'contract_ready'

        # Guardar en workflow_data
        if not self.workflow_data:
            self.workflow_data = {}

        self.workflow_data.update({
            'contract_id': str(contract.id),
            'contract_number': contract.contract_number,
            'contract_created_at': contract.created_at.isoformat(),
        })

        self.save()

        return contract


class MatchCriteria(models.Model):
    """Criterios de búsqueda y matching para arrendatarios."""
    
    tenant = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='match_criteria',
        verbose_name='Arrendatario'
    )
    
    # Criterios de ubicación
    preferred_cities = models.JSONField(
        'Ciudades preferidas',
        default=list,
        blank=True,
        help_text='Lista de ciudades donde busca propiedad'
    )
    max_distance_km = models.PositiveIntegerField(
        'Distancia máxima (km)',
        default=10,
        help_text='Distancia máxima desde puntos de interés'
    )
    
    # Criterios financieros
    min_price = models.DecimalField(
        'Precio mínimo',
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    max_price = models.DecimalField(
        'Precio máximo',
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # Criterios de propiedad
    property_types = models.JSONField(
        'Tipos de propiedad',
        default=list,
        blank=True,
        help_text='Tipos de propiedad de interés'
    )
    min_bedrooms = models.PositiveIntegerField('Mínimo dormitorios', default=1)
    min_bathrooms = models.PositiveIntegerField('Mínimo baños', default=1)
    min_area = models.PositiveIntegerField('Área mínima (m²)', null=True, blank=True)
    
    # Amenidades requeridas
    required_amenities = models.JSONField(
        'Amenidades requeridas',
        default=list,
        blank=True,
        help_text='Amenidades que debe tener la propiedad'
    )
    
    # Preferencias especiales
    pets_required = models.BooleanField('Requiere que permitan mascotas', default=False)
    smoking_required = models.BooleanField('Requiere que permitan fumar', default=False)
    furnished_required = models.BooleanField('Requiere amueblado', default=False)
    parking_required = models.BooleanField('Requiere estacionamiento', default=False)
    
    # Configuración de notificaciones
    auto_apply_enabled = models.BooleanField('Auto-aplicar a matches', default=False)
    notification_frequency = models.CharField(
        'Frecuencia de notificaciones',
        max_length=20,
        choices=[
            ('immediate', 'Inmediata'),
            ('daily', 'Diaria'),
            ('weekly', 'Semanal'),
            ('monthly', 'Mensual')
        ],
        default='daily'
    )
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    last_search = models.DateTimeField('Última búsqueda', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Criterio de Match'
        verbose_name_plural = 'Criterios de Match'
    
    def __str__(self):
        return f"Criterios de {self.tenant.get_full_name()}"
    
    def find_matching_properties(self):
        """Encuentra propiedades que coinciden con los criterios."""
        from properties.models import Property
        
        queryset = Property.objects.filter(
            is_active=True,
            status='available'
        )
        
        # Filtrar por precio
        if self.min_price:
            queryset = queryset.filter(rent_price__gte=self.min_price)
        if self.max_price:
            queryset = queryset.filter(rent_price__lte=self.max_price)
        
        # Filtrar por tipo de propiedad
        if self.property_types:
            queryset = queryset.filter(property_type__in=self.property_types)
        
        # Filtrar por características
        if self.min_bedrooms:
            queryset = queryset.filter(bedrooms__gte=self.min_bedrooms)
        if self.min_bathrooms:
            queryset = queryset.filter(bathrooms__gte=self.min_bathrooms)
        if self.min_area:
            queryset = queryset.filter(total_area__gte=self.min_area)
        
        # Filtrar por ciudades
        if self.preferred_cities:
            queryset = queryset.filter(city__in=self.preferred_cities)
        
        # Filtrar por preferencias especiales
        if self.pets_required:
            queryset = queryset.filter(pets_allowed=True)
        if self.parking_required:
            queryset = queryset.filter(parking_spaces__gt=0)
        
        return queryset
    
    def get_match_score(self, property):
        """Calcula el puntaje de match para una propiedad específica."""
        score = 0
        
        # Precio (30 puntos)
        if self.max_price and property.rent_price <= self.max_price:
            price_ratio = float(property.rent_price) / float(self.max_price)
            score += int(30 * (1 - price_ratio))
        
        # Ubicación (25 puntos)
        if property.city in self.preferred_cities:
            score += 25
        
        # Características (20 puntos)
        if property.bedrooms >= self.min_bedrooms:
            score += 7
        if property.bathrooms >= self.min_bathrooms:
            score += 7
        if not self.min_area or property.total_area >= self.min_area:
            score += 6
        
        # Amenidades (15 puntos)
        if self.required_amenities:
            property_amenities = property.amenities.values_list('name', flat=True)
            matching_amenities = len(set(self.required_amenities) & set(property_amenities))
            score += int(15 * matching_amenities / len(self.required_amenities))
        
        # Preferencias especiales (10 puntos)
        special_score = 0
        if self.pets_required and property.pets_allowed:
            special_score += 3
        if self.parking_required and property.parking_spaces > 0:
            special_score += 3
        if self.furnished_required and getattr(property, 'is_furnished', False):
            special_score += 4
        score += special_score
        
        return min(score, 100)


class MatchNotification(models.Model):
    """Notificaciones relacionadas con el sistema de matching."""
    
    NOTIFICATION_TYPES = [
        ('new_match_found', 'Nuevo Match Encontrado'),
        ('match_request_received', 'Solicitud de Match Recibida'),
        ('match_accepted', 'Match Aceptado'),
        ('match_rejected', 'Match Rechazado'),
        ('match_expired', 'Match Expirado'),
        ('follow_up_reminder', 'Recordatorio de Seguimiento'),
        ('criteria_updated', 'Criterios Actualizados'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Relaciones
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='match_notifications',
        verbose_name='Usuario'
    )
    match_request = models.ForeignKey(
        MatchRequest,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Solicitud de Match',
        null=True,
        blank=True
    )
    
    # Contenido
    notification_type = models.CharField('Tipo', max_length=30, choices=NOTIFICATION_TYPES)
    title = models.CharField('Título', max_length=200)
    message = models.TextField('Mensaje', max_length=1000)
    
    # Estado
    is_read = models.BooleanField('Leída', default=False)
    is_sent = models.BooleanField('Enviada', default=False)
    
    # Metadatos
    metadata = models.JSONField('Metadatos', default=dict, blank=True)
    
    # Fechas
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    read_at = models.DateTimeField('Fecha de lectura', null=True, blank=True)
    sent_at = models.DateTimeField('Fecha de envío', null=True, blank=True)
    
    class Meta:
        verbose_name = 'Notificación de Match'
        verbose_name_plural = 'Notificaciones de Match'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
            models.Index(fields=['notification_type', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.user.get_full_name()}"
    
    def mark_as_read(self):
        """Marca la notificación como leída."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
    
    def mark_as_sent(self):
        """Marca la notificación como enviada."""
        if not self.is_sent:
            self.is_sent = True
            self.sent_at = timezone.now()
            self.save()


class MatchAnalytics(models.Model):
    """Analíticas del sistema de matching."""
    
    date = models.DateField('Fecha', unique=True)
    
    # Métricas de solicitudes
    total_requests_created = models.PositiveIntegerField('Solicitudes creadas', default=0)
    total_requests_viewed = models.PositiveIntegerField('Solicitudes vistas', default=0)
    total_requests_accepted = models.PositiveIntegerField('Solicitudes aceptadas', default=0)
    total_requests_rejected = models.PositiveIntegerField('Solicitudes rechazadas', default=0)
    
    # Métricas de conversión
    view_rate = models.FloatField('Tasa de visualización', default=0.0)
    acceptance_rate = models.FloatField('Tasa de aceptación', default=0.0)
    response_rate = models.FloatField('Tasa de respuesta', default=0.0)
    
    # Métricas de tiempo
    avg_response_time_hours = models.FloatField('Tiempo promedio de respuesta (horas)', default=0.0)
    avg_match_score = models.FloatField('Puntaje promedio de match', default=0.0)
    
    # Metadatos
    created_at = models.DateTimeField('Fecha de creación', auto_now_add=True)
    updated_at = models.DateTimeField('Última actualización', auto_now=True)
    
    class Meta:
        verbose_name = 'Analítica de Match'
        verbose_name_plural = 'Analíticas de Match'
        ordering = ['-date']
    
    def __str__(self):
        return f"Analíticas {self.date}"
    
    @classmethod
    def calculate_daily_analytics(cls, date=None):
        """Calcula las analíticas para un día específico."""
        if not date:
            date = timezone.now().date()
        
        requests = MatchRequest.objects.filter(created_at__date=date)
        
        total_created = requests.count()
        total_viewed = requests.filter(status__in=['viewed', 'accepted', 'rejected']).count()
        total_accepted = requests.filter(status='accepted').count()
        total_rejected = requests.filter(status='rejected').count()
        
        view_rate = (total_viewed / total_created * 100) if total_created > 0 else 0
        acceptance_rate = (total_accepted / total_viewed * 100) if total_viewed > 0 else 0
        response_rate = ((total_accepted + total_rejected) / total_created * 100) if total_created > 0 else 0
        
        # Calcular tiempo promedio de respuesta
        responded_requests = requests.filter(responded_at__isnull=False)
        if responded_requests.exists():
            total_response_time = sum([
                (req.responded_at - req.created_at).total_seconds() / 3600 
                for req in responded_requests
            ])
            avg_response_time = total_response_time / responded_requests.count()
        else:
            avg_response_time = 0
        
        # Calcular puntaje promedio
        scores = [req.get_compatibility_score() for req in requests]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        analytics, created = cls.objects.get_or_create(
            date=date,
            defaults={
                'total_requests_created': total_created,
                'total_requests_viewed': total_viewed,
                'total_requests_accepted': total_accepted,
                'total_requests_rejected': total_rejected,
                'view_rate': view_rate,
                'acceptance_rate': acceptance_rate,
                'response_rate': response_rate,
                'avg_response_time_hours': avg_response_time,
                'avg_match_score': avg_score,
            }
        )
        
        if not created:
            # Actualizar si ya existe
            analytics.total_requests_created = total_created
            analytics.total_requests_viewed = total_viewed
            analytics.total_requests_accepted = total_accepted
            analytics.total_requests_rejected = total_rejected
            analytics.view_rate = view_rate
            analytics.acceptance_rate = acceptance_rate
            analytics.response_rate = response_rate
            analytics.avg_response_time_hours = avg_response_time
            analytics.avg_match_score = avg_score
            analytics.save()
        
        return analytics