"""
Comando para migrar las 34 cláusulas hardcodeadas a la base de datos.

Este comando extrae las cláusulas del sistema anterior (pdf_generator.py)
y las migra a los nuevos modelos EditableContractClause para permitir
edición desde el panel de administración.

Uso:
    python manage.py migrate_clauses_to_db
    python manage.py migrate_clauses_to_db --force  # Sobrescribir si existen

Creado: Diciembre 2025
Autor: VeriHome - Sistema de Control Molecular de Contratos
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from contracts.clause_models import (
    EditableContractClause,
    ContractTypeTemplate,
    TemplateClauseAssignment
)


class Command(BaseCommand):
    help = 'Migra las 34 cláusulas hardcodeadas a la base de datos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Sobrescribir cláusulas existentes',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostrar qué se crearía sin ejecutar',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING(
            '\n=== MIGRACIÓN DE CLÁUSULAS A BASE DE DATOS ===\n'
        ))

        force = options.get('force', False)
        dry_run = options.get('dry_run', False)

        # Verificar si ya existen cláusulas
        existing_count = EditableContractClause.objects.count()
        if existing_count > 0 and not force:
            self.stdout.write(self.style.ERROR(
                f'Ya existen {existing_count} cláusulas en la base de datos.\n'
                f'Use --force para sobrescribir o elimine manualmente.'
            ))
            return

        # Definir las 34 cláusulas
        clauses_data = self._get_all_clauses()

        if dry_run:
            self.stdout.write(self.style.NOTICE('\n--- MODO DRY-RUN ---\n'))
            for clause in clauses_data:
                self.stdout.write(
                    f"  [{clause['number']:02d}] CLÁUSULA {clause['ordinal']} - {clause['title']}"
                )
                if clause.get('variables'):
                    self.stdout.write(f"      Variables: {', '.join(clause['variables'])}")
            self.stdout.write(self.style.SUCCESS(
                f'\nSe crearían {len(clauses_data)} cláusulas + 4 plantillas.'
            ))
            return

        # Ejecutar migración
        try:
            with transaction.atomic():
                if force and existing_count > 0:
                    self.stdout.write('Eliminando cláusulas existentes...')
                    EditableContractClause.objects.all().delete()
                    ContractTypeTemplate.objects.all().delete()

                # Crear cláusulas
                created_clauses = self._create_clauses(clauses_data)
                self.stdout.write(self.style.SUCCESS(
                    f'\n✓ Creadas {len(created_clauses)} cláusulas'
                ))

                # Crear plantillas por tipo de contrato
                self._create_templates(created_clauses)
                self.stdout.write(self.style.SUCCESS(
                    '✓ Creadas 4 plantillas de contrato'
                ))

            self.stdout.write(self.style.SUCCESS(
                '\n=== MIGRACIÓN COMPLETADA EXITOSAMENTE ===\n'
                'Ahora puede editar las cláusulas desde:\n'
                '  http://localhost:8000/admin/contracts/editablecontractclause/\n'
            ))

        except Exception as e:
            raise CommandError(f'Error durante la migración: {str(e)}')

    def _get_all_clauses(self):
        """Retorna las 34 cláusulas con su contenido y metadata"""
        return [
            # === PARTE 1: Cláusulas 1-6 ===
            {
                'number': 1,
                'ordinal': 'PRIMERA',
                'title': 'OBJETO',
                'content': """El ARRENDADOR entrega al ARRENDATARIO, y éste recibe a su entera satisfacción, el inmueble ubicado en {property_address}, para destinarlo exclusivamente a vivienda familiar, en las condiciones que se establecen en el presente contrato.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 1973 Código Civil',
                'variables': ['property_address'],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 2,
                'ordinal': 'SEGUNDA',
                'title': 'DESTINACIÓN',
                'content': """El inmueble objeto del presente contrato será destinado exclusivamente para vivienda del ARRENDATARIO y su núcleo familiar. Queda expresamente prohibido darle un uso diferente, comercial, industrial o profesional, subarrendar total o parcialmente, o ceder el contrato sin autorización previa y escrita del ARRENDADOR.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 4 Ley 820 de 2003',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_room'],
            },
            {
                'number': 3,
                'ordinal': 'TERCERA',
                'title': 'PRECIO',
                'content': """El ARRENDATARIO pagará al ARRENDADOR por concepto de canon de arrendamiento la suma de {monthly_rent} mensuales, pagaderos por anticipado dentro de los primeros {payment_day} días de cada mes, en el domicilio del ARRENDADOR o donde éste indique por escrito.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 18 Ley 820 de 2003',
                'variables': ['monthly_rent', 'payment_day'],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 4,
                'ordinal': 'CUARTA',
                'title': 'REAJUSTE',
                'content': """El canon de arrendamiento podrá ser incrementado anualmente en un porcentaje que no exceda el 100% del IPC certificado por el DANE para el año inmediatamente anterior, de conformidad con lo establecido en el artículo 20 de la Ley 820 de 2003.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 20 Ley 820 de 2003',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 5,
                'ordinal': 'QUINTA',
                'title': 'ENTREGA',
                'content': """El ARRENDADOR hace entrega del inmueble al ARRENDATARIO en perfectas condiciones de aseo, funcionamiento de servicios públicos, instalaciones y elementos que lo conforman. El ARRENDATARIO declara recibir el inmueble a su entera satisfacción, comprometiéndose a mantenerlo en igual estado.""",
                'category': 'standard',
                'legal_reference': 'Art. 1982 Código Civil',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 6,
                'ordinal': 'SEXTA',
                'title': 'TÉRMINO',
                'content': """El presente contrato tendrá una duración de {contract_duration_months} meses, contados a partir del {start_date}, y vencerá el {end_date}. El contrato se prorrogará automáticamente por períodos iguales, salvo que alguna de las partes manifieste su intención de terminarlo con una antelación mínima de tres (3) meses.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 5 Ley 820 de 2003',
                'variables': ['contract_duration_months', 'start_date', 'end_date'],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },

            # === PARTE 2: Cláusulas 7-15 ===
            {
                'number': 7,
                'ordinal': 'SÉPTIMA',
                'title': 'OBLIGACIONES DEL ARRENDATARIO',
                'content': """El ARRENDATARIO se obliga a: a) Pagar cumplidamente el canon de arrendamiento en la fecha convenida; b) Cuidar el inmueble como un buen padre de familia y mantenerlo en buen estado; c) Pagar oportunamente los servicios públicos domiciliarios; d) No subarrendar total o parcialmente el inmueble; e) Permitir al ARRENDADOR la inspección del inmueble en cualquier momento, previa cita; f) Restituir el inmueble al terminar el contrato en las mismas condiciones que lo recibió, salvo el deterioro natural por el uso legítimo.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 9 Ley 820 de 2003',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 8,
                'ordinal': 'OCTAVA',
                'title': 'OBLIGACIONES DEL ARRENDADOR',
                'content': """El ARRENDADOR se obliga a: a) Entregar el inmueble en condiciones de servir para el fin convenido; b) Mantener el inmueble en condiciones de servir para el fin convenido durante todo el tiempo del contrato; c) Realizar las reparaciones necesarias para conservar el inmueble en buen estado, excepto aquellas que por ley correspondan al ARRENDATARIO; d) No perturbar al ARRENDATARIO en el uso legítimo del inmueble.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 8 Ley 820 de 2003',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 9,
                'ordinal': 'NOVENA',
                'title': 'SERVICIOS PÚBLICOS',
                'content': """Los servicios públicos domiciliarios (energía eléctrica, acueducto, alcantarillado, gas natural, teléfono e internet) serán por cuenta del ARRENDATARIO, quien deberá cancelar oportunamente las facturas correspondientes. El ARRENDATARIO se obliga a no permitir la suspensión de ningún servicio durante la vigencia del contrato.""",
                'category': 'standard',
                'legal_reference': 'Art. 15 Ley 820 de 2003',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 10,
                'ordinal': 'DÉCIMA',
                'title': 'LÍNEA TELEFÓNICA',
                'content': """Si el inmueble cuenta con línea telefónica, el ARRENDATARIO podrá hacer uso de ella, asumiendo todos los gastos que se generen. Al terminar el contrato, deberá entregar la línea telefónica libre de deudas.""",
                'category': 'optional',
                'legal_reference': '',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial'],
            },
            {
                'number': 11,
                'ordinal': 'DÉCIMA PRIMERA',
                'title': 'REPARACIONES LOCATIVAS',
                'content': """Estarán a cargo del ARRENDATARIO las reparaciones locativas que según la ley y la costumbre son de su responsabilidad, tales como: el mantenimiento de pisos, pintura interior, enchapes, aparatos sanitarios, llaves, chapas, vidrios, cerraduras y en general el mantenimiento de elementos que se deterioren por el uso normal.""",
                'category': 'standard',
                'legal_reference': 'Art. 1998 Código Civil',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 12,
                'ordinal': 'DÉCIMA SEGUNDA',
                'title': 'REPARACIONES NECESARIAS',
                'content': """Las reparaciones necesarias para conservar el inmueble en buen estado que no sean locativas, serán por cuenta del ARRENDADOR. El ARRENDATARIO deberá dar aviso inmediato al ARRENDADOR de cualquier daño o deterioro que requiera reparación.""",
                'category': 'standard',
                'legal_reference': 'Art. 1985 Código Civil',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 13,
                'ordinal': 'DÉCIMA TERCERA',
                'title': 'MEJORAS Y REFORMAS',
                'content': """El ARRENDATARIO no podrá hacer mejoras, modificaciones o reformas al inmueble sin autorización previa y escrita del ARRENDADOR. Las mejoras que se hagan sin autorización quedarán a beneficio del inmueble sin derecho a reembolso alguno.""",
                'category': 'standard',
                'legal_reference': 'Art. 1994 Código Civil',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 14,
                'ordinal': 'DÉCIMA CUARTA',
                'title': 'FIJACIÓN DE AVISOS',
                'content': """El ARRENDATARIO no podrá fijar avisos, carteles, leyendas o hacer inscripciones en las paredes exteriores del inmueble, ni en las áreas comunes si las hubiere, sin previa autorización escrita del ARRENDADOR.""",
                'category': 'optional',
                'legal_reference': '',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial'],
            },
            {
                'number': 15,
                'ordinal': 'DÉCIMA QUINTA',
                'title': 'DEVOLUCIÓN SATISFACTORIA',
                'content': """Al término del contrato, cualquiera que sea la causa, el ARRENDATARIO se obliga a restituir el inmueble en perfecto estado de aseo y conservación, salvo el deterioro natural causado por el tiempo y el uso legítimo del inmueble. La entrega se hará mediante acta suscrita por las partes.""",
                'category': 'standard',
                'legal_reference': 'Art. 2005 Código Civil',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },

            # === PARTE 3: Cláusulas 16-25 ===
            {
                'number': 16,
                'ordinal': 'DÉCIMA SEXTA',
                'title': 'EFECTOS DEL INCUMPLIMIENTO',
                'content': """El incumplimiento de cualquiera de las obligaciones contraídas por el ARRENDATARIO, dará derecho al ARRENDADOR para exigir la terminación inmediata del contrato y la restitución del inmueble, sin perjuicio de la indemnización de perjuicios a que haya lugar.""",
                'category': 'standard',
                'legal_reference': 'Art. 22 Ley 820 de 2003',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 17,
                'ordinal': 'DÉCIMA SÉPTIMA',
                'title': 'EXENCIÓN DE RESPONSABILIDAD',
                'content': """El ARRENDADOR no será responsable por daños o pérdidas que sufran las personas o los bienes que se encuentren en el inmueble arrendado, salvo cuando tales daños o pérdidas provengan de su culpa o dolo.""",
                'category': 'standard',
                'legal_reference': 'Art. 1604 Código Civil',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 18,
                'ordinal': 'DÉCIMA OCTAVA',
                'title': 'EXTINCIÓN DEL DERECHO DEL PROPIETARIO',
                'content': """Si durante la vigencia del contrato el ARRENDADOR enajena el inmueble, el nuevo propietario no podrá alegar extinción del derecho del ARRENDATARIO durante el tiempo que falta para el vencimiento del contrato.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 2020 Código Civil',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 19,
                'ordinal': 'DÉCIMA NOVENA',
                'title': 'CLÁUSULA PENAL',
                'content': """En caso de incumplimiento de las obligaciones por parte del ARRENDATARIO, éste pagará al ARRENDADOR, a título de cláusula penal, una suma equivalente a dos (2) meses del valor del canon vigente al momento del incumplimiento, sin perjuicio de las demás acciones legales.""",
                'category': 'standard',
                'legal_reference': 'Art. 1592 Código Civil',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 20,
                'ordinal': 'VIGÉSIMA',
                'title': 'AUTORIZACIONES',
                'content': """El ARRENDADOR se obliga a obtener y mantener vigentes todas las autorizaciones, licencias y permisos que sean necesarios para el uso del inmueble como vivienda familiar.""",
                'category': 'standard',
                'legal_reference': '',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_room'],
            },
            {
                'number': 21,
                'ordinal': 'VIGÉSIMA PRIMERA',
                'title': 'ABANDONO DEL INMUEBLE',
                'content': """Se considera abandono del inmueble cuando el ARRENDATARIO no lo habite por un período superior a treinta (30) días consecutivos sin causa justificada y sin previo aviso al ARRENDADOR. El abandono será causal de terminación inmediata del contrato.""",
                'category': 'standard',
                'legal_reference': 'Art. 22 Ley 820 de 2003',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 22,
                'ordinal': 'VIGÉSIMA SEGUNDA',
                'title': 'COBRO EXTRAJUDICIAL',
                'content': """Para el cobro extrajudicial de las sumas adeudadas, el ARRENDADOR podrá acudir a centrales de riesgo crediticio y cobranza extrajudicial, previa comunicación al ARRENDATARIO con quince (15) días de anticipación.""",
                'category': 'standard',
                'legal_reference': 'Ley 1266 de 2008',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 23,
                'ordinal': 'VIGÉSIMA TERCERA',
                'title': 'DEUDORES SOLIDARIOS',
                'content': """Los deudores solidarios y codeudores que firmen este contrato, responden solidariamente con el ARRENDATARIO por todas las obligaciones derivadas del presente contrato, incluso después de su terminación.""",
                'category': 'guarantee',
                'legal_reference': 'Art. 1568 Código Civil',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 24,
                'ordinal': 'VIGÉSIMA CUARTA',
                'title': 'MÉRITO EJECUTIVO',
                'content': """Este contrato presta mérito ejecutivo para el cobro de todas las obligaciones que emanen del mismo, de conformidad con lo establecido en el artículo 422 del Código de Procedimiento Civil.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 422 CGP',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 25,
                'ordinal': 'VIGÉSIMA QUINTA',
                'title': 'CESIÓN Y SUBARRIENDO',
                'content': """El ARRENDATARIO no podrá ceder este contrato ni subarrendar el inmueble en todo o en parte, sin autorización previa y escrita del ARRENDADOR. La violación de esta cláusula será causal de terminación inmediata del contrato.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 17 Ley 820 de 2003',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },

            # === PARTE 4: Cláusulas 26-33 ===
            {
                'number': 26,
                'ordinal': 'VIGÉSIMA SEXTA',
                'title': 'CESIÓN POR EL ARRENDADOR',
                'content': """El ARRENDADOR podrá ceder libremente sus derechos derivados de este contrato, caso en el cual deberá informar por escrito al ARRENDATARIO sobre la persona del nuevo acreedor.""",
                'category': 'standard',
                'legal_reference': 'Art. 1959 Código Civil',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 27,
                'ordinal': 'VIGÉSIMA SÉPTIMA',
                'title': 'CAUSALES DE TERMINACIÓN POR EL ARRENDADOR',
                'content': """El ARRENDADOR podrá dar por terminado este contrato en cualquiera de los siguientes casos: a) Falta de pago del canon o de los servicios por más de dos (2) meses; b) Violación de cualquiera de las obligaciones consagradas en este contrato; c) Subarriendo total o parcial del inmueble; d) Cambio de destinación del inmueble; e) Destrucción o deterioro grave del inmueble por culpa del ARRENDATARIO.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 22 Ley 820 de 2003',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 28,
                'ordinal': 'VIGÉSIMA OCTAVA',
                'title': 'CAUSALES DE TERMINACIÓN POR EL ARRENDATARIO',
                'content': """El ARRENDATARIO podrá dar por terminado este contrato en cualquiera de los siguientes casos: a) Cuando el ARRENDADOR no cumpla con las reparaciones necesarias que le corresponden; b) Cuando sea privado o perturbado en el goce del inmueble; c) Por vicios ocultos del inmueble que lo hagan inadecuado para el fin del contrato.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 24 Ley 820 de 2003',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 29,
                'ordinal': 'VIGÉSIMA NOVENA',
                'title': 'GASTOS',
                'content': """Los gastos de escrituración, registro y timbre de este contrato serán por cuenta del ARRENDADOR. Los gastos de terminación del contrato, restitución del inmueble y demás que se generen serán por cuenta de quien los ocasione.""",
                'category': 'standard',
                'legal_reference': '',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 30,
                'ordinal': 'TRIGÉSIMA',
                'title': 'COPIA DEL CONTRATO',
                'content': """Cada una de las partes recibirá una copia de este contrato debidamente firmada. Para efectos probatorios, cualquiera de las copias tendrá el mismo valor legal.""",
                'category': 'standard',
                'legal_reference': 'Art. 3 Ley 820 de 2003',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 31,
                'ordinal': 'TRIGÉSIMA PRIMERA',
                'title': 'VISITAS',
                'content': """El ARRENDADOR tendrá derecho a inspeccionar el inmueble cuando lo considere necesario, previa cita con el ARRENDATARIO con una anticipación mínima de veinticuatro (24) horas, salvo en casos de emergencia.""",
                'category': 'standard',
                'legal_reference': '',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 32,
                'ordinal': 'TRIGÉSIMA SEGUNDA',
                'title': 'NOTIFICACIONES',
                'content': """Todas las comunicaciones relacionadas con este contrato se harán por escrito a las direcciones señaladas por las partes en este documento, o a las que posteriormente se informen por escrito. También serán válidas las notificaciones enviadas a los correos electrónicos registrados.""",
                'category': 'standard',
                'legal_reference': '',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
            {
                'number': 33,
                'ordinal': 'TRIGÉSIMA TERCERA',
                'title': 'VALIDEZ',
                'content': """Este contrato reemplaza y deja sin efecto cualquier acuerdo verbal o escrito anterior entre las partes sobre el mismo objeto. Las modificaciones a este contrato deberán constar por escrito y ser firmadas por ambas partes. Si alguna de las cláusulas de este contrato fuere declarada inexequible, las demás continuarán vigentes.""",
                'category': 'mandatory',
                'legal_reference': 'Art. 1602 Código Civil',
                'variables': [],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },

            # === CLÁUSULA 34: GARANTÍAS (Dinámica) ===
            {
                'number': 34,
                'ordinal': 'TRIGÉSIMA CUARTA',
                'title': 'GARANTÍAS DEL CONTRATO',
                'content': """Para garantizar el cumplimiento de las obligaciones derivadas del presente contrato, se constituye la siguiente garantía:

TIPO DE GARANTÍA: {guarantee_type}

En caso de garantía con CODEUDOR/FIADOR:

Comparece como CODEUDOR y deudor solidario: {codeudor_full_name}, mayor de edad, identificado(a) con {codeudor_document_type} No. {codeudor_document_number}, domiciliado(a) en {codeudor_address}, ciudad de {codeudor_city}, departamento de {codeudor_department}, teléfono {codeudor_phone}, correo electrónico {codeudor_email}.

DATOS LABORALES DEL CODEUDOR:
- Ocupación: {codeudor_occupation}
- Empresa/Empleador: {codeudor_employer}
- Dirección laboral: {codeudor_work_address}
- Teléfono laboral: {codeudor_work_phone}
- Ingresos mensuales declarados: {codeudor_monthly_income}
- Antigüedad laboral: {codeudor_employment_years} años

PATRIMONIO DEL CODEUDOR:
- Bienes inmuebles: {codeudor_real_estate}
- Vehículos: {codeudor_vehicles}
- Otros activos: {codeudor_other_assets}
- Obligaciones financieras: {codeudor_financial_obligations}

El CODEUDOR declara bajo la gravedad del juramento que la información suministrada es veraz y autoriza al ARRENDADOR para verificarla ante las entidades correspondientes.

El CODEUDOR se constituye en deudor solidario del ARRENDATARIO para todos los efectos del presente contrato, respondiendo con su patrimonio por el cumplimiento de todas las obligaciones, incluyendo pero no limitándose a: canon de arrendamiento, servicios públicos, reparaciones locativas, indemnizaciones y cláusula penal.

Esta garantía permanecerá vigente durante todo el término del contrato y sus prórrogas, y hasta seis (6) meses después de la restitución efectiva del inmueble.""",
                'category': 'guarantee',
                'legal_reference': 'Art. 16 Ley 820 de 2003, Art. 1568 Código Civil',
                'variables': [
                    'guarantee_type',
                    'codeudor_full_name',
                    'codeudor_document_type',
                    'codeudor_document_number',
                    'codeudor_address',
                    'codeudor_city',
                    'codeudor_department',
                    'codeudor_phone',
                    'codeudor_email',
                    'codeudor_occupation',
                    'codeudor_employer',
                    'codeudor_work_address',
                    'codeudor_work_phone',
                    'codeudor_monthly_income',
                    'codeudor_employment_years',
                    'codeudor_real_estate',
                    'codeudor_vehicles',
                    'codeudor_other_assets',
                    'codeudor_financial_obligations',
                ],
                'contract_types': ['rental_urban', 'rental_commercial', 'rental_room', 'rental_rural'],
            },
        ]

    def _create_clauses(self, clauses_data):
        """Crear las cláusulas en la base de datos"""
        created = []
        for data in clauses_data:
            clause = EditableContractClause.objects.create(
                clause_number=data['number'],
                ordinal_text=data['ordinal'],
                title=data['title'],
                content=data['content'],
                category=data['category'],
                legal_reference=data.get('legal_reference', ''),
                allowed_variables=data.get('variables', []),
                contract_types=data.get('contract_types', []),
                is_active=True,
                version=1,
            )
            created.append(clause)
            self.stdout.write(f"  ✓ Cláusula {data['number']:02d}: {data['title']}")
        return created

    def _create_templates(self, clauses):
        """Crear las 4 plantillas de contrato"""
        templates_config = [
            {
                'contract_type': 'rental_urban',
                'name': 'Contrato de Arrendamiento de Vivienda Urbana',
                'description': 'Plantilla estándar para arrendamiento de vivienda urbana según Ley 820 de 2003. Incluye todas las cláusulas obligatorias y estándar para protección de ambas partes.',
            },
            {
                'contract_type': 'rental_commercial',
                'name': 'Contrato de Arrendamiento de Local Comercial',
                'description': 'Plantilla para arrendamiento de locales comerciales. Incluye cláusulas específicas para uso comercial y modificaciones según el Código de Comercio.',
            },
            {
                'contract_type': 'rental_room',
                'name': 'Contrato de Arrendamiento de Habitación',
                'description': 'Plantilla simplificada para arrendamiento de habitaciones individuales dentro de una vivienda compartida.',
            },
            {
                'contract_type': 'rental_rural',
                'name': 'Contrato de Arrendamiento de Inmueble Rural',
                'description': 'Plantilla para arrendamiento de fincas, parcelas y propiedades rurales. Incluye consideraciones especiales para uso agrícola o pecuario.',
            },
        ]

        for config in templates_config:
            template = ContractTypeTemplate.objects.create(
                contract_type=config['contract_type'],
                name=config['name'],
                description=config['description'],
                is_active=True,
            )

            # Asignar cláusulas que apliquen a este tipo
            order = 1
            for clause in clauses:
                if config['contract_type'] in clause.contract_types:
                    TemplateClauseAssignment.objects.create(
                        template=template,
                        clause=clause,
                        order=order,
                        is_required=(clause.category == 'mandatory'),
                    )
                    order += 1

            self.stdout.write(f"  ✓ Plantilla: {config['name']} ({order-1} cláusulas)")
