"""
Comando para crear plantillas de contratos por defecto del sistema.
Crea plantillas estándar para diferentes tipos de contratos inmobiliarios.
"""

from django.core.management.base import BaseCommand
from contracts.models import ContractTemplate
import json


class Command(BaseCommand):
    help = 'Crea plantillas de contratos por defecto del sistema'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Sobrescribir plantillas existentes'
        )
        parser.add_argument(
            '--template-type',
            type=str,
            help='Crear solo plantillas de un tipo específico'
        )
    
    def handle(self, *args, **options):
        force = options.get('force', False)
        template_type_filter = options.get('template_type')
        
        self.stdout.write('Creando plantillas de contratos por defecto...')
        
        templates_data = self._get_templates_data()
        created_count = 0
        updated_count = 0
        skipped_count = 0
        
        for template_data in templates_data:
            # Filtrar por tipo si se especifica
            if template_type_filter and template_data['template_type'] != template_type_filter:
                continue
            
            try:
                template, created = ContractTemplate.objects.get_or_create(
                    name=template_data['name'],
                    template_type=template_data['template_type'],
                    defaults=template_data
                )
                
                if created:
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f'[OK] Creada: {template.name}')
                    )
                elif force:
                    # Actualizar plantilla existente
                    for key, value in template_data.items():
                        if key not in ['name', 'template_type']:  # No cambiar identificadores
                            setattr(template, key, value)
                    template.save()
                    updated_count += 1
                    self.stdout.write(
                        self.style.WARNING(f'[UPDATE] Actualizada: {template.name}')
                    )
                else:
                    skipped_count += 1
                    self.stdout.write(
                        self.style.HTTP_INFO(f'[SKIP] Omitida (ya existe): {template.name}')
                    )
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'[ERROR] Error creando {template_data["name"]}: {str(e)}')
                )
        
        # Mostrar resumen
        self.stdout.write('\\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('RESUMEN DE CREACIÓN DE PLANTILLAS'))
        self.stdout.write('='*50)
        self.stdout.write(f'Plantillas creadas: {created_count}')
        self.stdout.write(f'Plantillas actualizadas: {updated_count}')
        self.stdout.write(f'Plantillas omitidas: {skipped_count}')
        self.stdout.write(f'Total procesadas: {created_count + updated_count + skipped_count}')
        
        if created_count > 0 or updated_count > 0:
            self.stdout.write(
                self.style.SUCCESS(f'\\n[OK] Proceso completado exitosamente')
            )
    
    def _get_templates_data(self):
        """Devuelve los datos de todas las plantillas por defecto."""
        return [
            # Plantilla de Arrendamiento de Vivienda Urbana
            {
                'name': 'Contrato de Arrendamiento de Vivienda Urbana',
                'template_type': 'rental_urban',
                'content': '''CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA

Entre los suscritos a saber: {{ primary_party.get_full_name }}, mayor de edad, identificado(a) con {{ primary_party.profile.identification_type }} número {{ primary_party.profile.identification_number }}, quien en adelante se denominará EL ARRENDADOR, y {{ secondary_party.get_full_name }}, mayor de edad, identificado(a) con {{ secondary_party.profile.identification_type }} número {{ secondary_party.profile.identification_number }}, quien en adelante se denominará EL ARRENDATARIO, hemos convenido celebrar el presente contrato de arrendamiento que se regirá por las siguientes cláusulas:

PRIMERA. OBJETO DEL CONTRATO: El ARRENDADOR da en arrendamiento al ARRENDATARIO el inmueble ubicado en {{ property.address }}, {{ property.city }}, {{ property.state }}, con las siguientes características:

- Tipo de inmueble: {{ property.property_type }}
- Área: {{ property.area }} metros cuadrados
- Habitaciones: {{ property.bedrooms }}
- Baños: {{ property.bathrooms }}
{% if property.description %}
- Descripción adicional: {{ property.description }}
{% endif %}

SEGUNDA. DESTINACIÓN: El inmueble arrendado se destinará exclusivamente para vivienda familiar del ARRENDATARIO. No podrá destinarse para otros fines sin autorización expresa y escrita del ARRENDADOR.

TERCERA. TÉRMINO: El presente contrato tendrá una duración de {{ contract_duration_months }} meses, contados a partir del {{ start_date }} y hasta el {{ end_date }}, fecha en la cual terminará sin necesidad de preaviso.

CUARTA. CANON DE ARRENDAMIENTO: El ARRENDATARIO pagará al ARRENDADOR por concepto de canon de arrendamiento la suma de ${{ monthly_rent }} mensuales, pagaderos por mes vencido dentro de los primeros cinco (5) días de cada mes.

QUINTA. DEPÓSITO DE GARANTÍA: El ARRENDATARIO entrega al ARRENDADOR la suma de ${{ security_deposit }} como depósito para garantizar el cumplimiento de las obligaciones del contrato y los perjuicios que pueda ocasionar.

SEXTA. INCREMENTO: El canon de arrendamiento será incrementado anualmente en un porcentaje que no exceda el índice de precios al consumidor certificado por el DANE para el año inmediatamente anterior.

SÉPTIMA. SERVICIOS PÚBLICOS: Los servicios públicos domiciliarios correrán por cuenta del ARRENDATARIO, quien deberá mantenerlos al día durante la vigencia del contrato.

OCTAVA. REPARACIONES: Las reparaciones locativas menores estarán a cargo del ARRENDATARIO. Las reparaciones estructurales serán responsabilidad del ARRENDADOR.

NOVENA. MORA: En caso de mora en el pago del canon de arrendamiento, el ARRENDATARIO pagará intereses moratorios del {{ late_fee_percentage }}% mensual sobre la suma adeudada.

DÉCIMA. ENTREGA: El inmueble se entrega en perfecto estado de aseo y funcionamiento, comprometiéndose el ARRENDATARIO a devolverlo en las mismas condiciones.

Para constancia se firma en {{ city_name }} el {{ contract_date }}.

_________________________                    _________________________
{{ primary_party.get_full_name }}           {{ secondary_party.get_full_name }}
ARRENDADOR                                   ARRENDATARIO
C.C. {{ primary_party.profile.identification_number }}    C.C. {{ secondary_party.profile.identification_number }}''',
                'variables': [
                    'primary_party', 'secondary_party', 'property', 'start_date', 
                    'end_date', 'monthly_rent', 'security_deposit', 'contract_duration_months',
                    'late_fee_percentage', 'city_name', 'contract_date'
                ],
                'is_default': True,
                'is_active': True
            },
            
            # Plantilla de Arrendamiento de Local Comercial
            {
                'name': 'Contrato de Arrendamiento de Local Comercial',
                'template_type': 'rental_commercial',
                'content': '''CONTRATO DE ARRENDAMIENTO DE LOCAL COMERCIAL

Entre {{ primary_party.get_full_name }}, identificado(a) con {{ primary_party.profile.identification_type }} número {{ primary_party.profile.identification_number }}, quien actúa en calidad de ARRENDADOR, y {{ secondary_party.get_full_name }}, identificado(a) con {{ secondary_party.profile.identification_type }} número {{ secondary_party.profile.identification_number }}, quien actúa en calidad de ARRENDATARIO, se celebra el presente contrato comercial de arrendamiento:

PRIMERO. OBJETO: Se da en arrendamiento el local comercial ubicado en {{ property.address }}, con área de {{ property.area }} metros cuadrados, destinado para actividades comerciales lícitas.

SEGUNDO. DESTINACIÓN: El inmueble se destinará exclusivamente para {{ commercial_activity }}, quedando prohibido el cambio de destinación sin autorización previa y escrita del arrendador.

TERCERO. TÉRMINO: El contrato tendrá vigencia de {{ contract_duration_months }} meses, desde {{ start_date }} hasta {{ end_date }}.

CUARTO. CANON: El arrendatario pagará mensualmente ${{ monthly_rent }} por concepto de canon de arrendamiento, más IVA cuando aplique.

QUINTO. GARANTÍA: Se constituye garantía mediante {{ guarantee_type }} por valor de ${{ security_deposit }}.

SEXTO. LICENCIAS Y PERMISOS: El arrendatario se obliga a obtener todas las licencias y permisos necesarios para el funcionamiento del establecimiento comercial.

SÉPTIMO. MEJORAS: Las mejoras que realice el arrendatario quedarán en beneficio del inmueble sin derecho a compensación alguna.

OCTAVO. SUBARRIENDO: Queda prohibido el subarriendo total o parcial sin autorización expresa del arrendador.

En constancia se firma en {{ city_name }} a los {{ contract_date }}.

_________________________                    _________________________
ARRENDADOR                                   ARRENDATARIO''',
                'variables': [
                    'primary_party', 'secondary_party', 'property', 'start_date',
                    'end_date', 'monthly_rent', 'security_deposit', 'contract_duration_months',
                    'commercial_activity', 'guarantee_type', 'city_name', 'contract_date'
                ],
                'is_default': True,
                'is_active': True
            },
            
            # Plantilla de Arrendamiento de Habitación
            {
                'name': 'Contrato de Arrendamiento de Habitación',
                'template_type': 'rental_room',
                'content': '''CONTRATO DE ARRENDAMIENTO DE HABITACIÓN

Entre {{ primary_party.get_full_name }} (ARRENDADOR) y {{ secondary_party.get_full_name }} (ARRENDATARIO), se acuerda el arrendamiento de una habitación con las siguientes condiciones:

PRIMERA. OBJETO: Se arrienda la habitación {{ room_number }} ubicada en {{ property.address }}, incluyendo {{ included_areas }}.

SEGUNDA. TÉRMINO: Desde {{ start_date }} hasta {{ end_date }} ({{ contract_duration_months }} meses).

TERCERA. CANON: ${{ monthly_rent }} mensuales{% if utilities_included %}, incluye servicios públicos{% endif %}.

CUARTA. DEPÓSITO: ${{ security_deposit }} como garantía.

QUINTA. USO COMÚN: El arrendatario tendrá derecho al uso de {{ common_areas }}.

SEXTA. NORMAS DE CONVIVENCIA:
- Horario de silencio: {{ quiet_hours }}
- Visitantes: {{ visitor_policy }}
- Mascotas: {{ pet_policy }}

SÉPTIMA. SERVICIOS: {{ utility_arrangement }}

OCTAVA. ENTREGA: La habitación se entrega amoblada con {{ furniture_included }}.

Firmado en {{ city_name }} el {{ contract_date }}.

_________________________                    _________________________
ARRENDADOR                                   ARRENDATARIO''',
                'variables': [
                    'primary_party', 'secondary_party', 'property', 'room_number',
                    'start_date', 'end_date', 'monthly_rent', 'security_deposit',
                    'contract_duration_months', 'included_areas', 'utilities_included',
                    'common_areas', 'quiet_hours', 'visitor_policy', 'pet_policy',
                    'utility_arrangement', 'furniture_included', 'city_name', 'contract_date'
                ],
                'is_default': True,
                'is_active': True
            },
            
            # Plantilla de Arrendamiento Rural
            {
                'name': 'Contrato de Arrendamiento de Terreno Rural',
                'template_type': 'rental_rural',
                'content': '''CONTRATO DE ARRENDAMIENTO DE TERRENO RURAL

{{ primary_party.get_full_name }} (ARRENDADOR) arrienda a {{ secondary_party.get_full_name }} (ARRENDATARIO) el terreno rural ubicado en {{ property.address }}, {{ property.city }}.

CARACTERÍSTICAS DEL TERRENO:
- Área total: {{ property.area }} hectáreas
- Linderos: {{ property_boundaries }}
- Destinación: {{ land_use }}
- Servicios disponibles: {{ available_services }}

TÉRMINO: {{ contract_duration_months }} meses ({{ start_date }} - {{ end_date }})

CANON: ${{ monthly_rent }} mensuales

DESTINACIÓN: El terreno se destinará exclusivamente para {{ agricultural_use }}.

MEJORAS: {{ improvements_policy }}

CONSERVACIÓN: El arrendatario se compromete a mantener la conservación del suelo y recursos naturales conforme a la normativa ambiental vigente.

AGUA: {{ water_rights }}

ACCESO: {{ access_rights }}

Firmado en {{ city_name }}, {{ contract_date }}.

_________________________                    _________________________
ARRENDADOR                                   ARRENDATARIO''',
                'variables': [
                    'primary_party', 'secondary_party', 'property', 'start_date',
                    'end_date', 'monthly_rent', 'contract_duration_months',
                    'property_boundaries', 'land_use', 'available_services',
                    'agricultural_use', 'improvements_policy', 'water_rights',
                    'access_rights', 'city_name', 'contract_date'
                ],
                'is_default': True,
                'is_active': True
            },
            
            # Plantilla de Prestación de Servicios
            {
                'name': 'Contrato de Prestación de Servicios Inmobiliarios',
                'template_type': 'service_provider',
                'content': '''CONTRATO DE PRESTACIÓN DE SERVICIOS INMOBILIARIOS

Entre {{ primary_party.get_full_name }} (CONTRATANTE) y {{ secondary_party.get_full_name }} (PRESTADOR DE SERVICIOS), se acuerda la prestación de servicios inmobiliarios:

OBJETO: {{ service_description }}

ALCANCE:
{{ service_scope }}

OBLIGACIONES DEL PRESTADOR:
- {{ service_obligations }}

OBLIGACIONES DEL CONTRATANTE:
- {{ client_obligations }}

VALOR: ${{ service_amount }}

FORMA DE PAGO: {{ payment_terms }}

TÉRMINO: {{ service_duration }}

CONFIDENCIALIDAD: {{ confidentiality_clause }}

TERMINACIÓN: {{ termination_conditions }}

Firmado en {{ city_name }}, {{ contract_date }}.

_________________________                    _________________________
CONTRATANTE                                  PRESTADOR DE SERVICIOS''',
                'variables': [
                    'primary_party', 'secondary_party', 'service_description',
                    'service_scope', 'service_obligations', 'client_obligations',
                    'service_amount', 'payment_terms', 'service_duration',
                    'confidentiality_clause', 'termination_conditions',
                    'city_name', 'contract_date'
                ],
                'is_default': True,
                'is_active': True
            }
        ]