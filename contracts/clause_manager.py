"""
Sistema de gestión de cláusulas dinámicas por tipo de contrato.
Permite personalizar las cláusulas según el tipo de propiedad y contrato.
"""

from typing import Dict, List, Tuple


class ContractClauseManager:
    """Gestor de cláusulas dinámicas para contratos."""
    
    # Cláusulas base que aplican a todos los contratos
    BASE_CLAUSES = [
        {
            'number': 1,
            'ordinal': 'PRIMERA',
            'title': 'OBJETO',
            'content': 'EL ARRENDADOR entrega a título de arrendamiento, a EL ARRENDATARIO, el inmueble ubicado en {property_address} del municipio de {property_city}, y cuyos linderos se encuentran relacionados en documento separado que hace parte integral de este contrato y a su turno, EL ARRENDATARIO se obliga a pagar a EL ARRENDADOR el precio establecido en el clausulado del presente contrato.',
            'applies_to': ['all']
        },
        {
            'number': 2,
            'ordinal': 'SEGUNDA',
            'title': 'DESTINACIÓN',
            'content': 'EL ARRENDATARIO destinará el inmueble arrendado única y exclusivamente para {property_destination}, destinación que no podrá ser cambiada. En el evento que esto ocurra, EL ARRENDADOR puede dar por terminado el arrendamiento, exigir la entrega inmediata del inmueble arrendado y solicitar el pago de la correspondiente indemnización de perjuicios o de las penalidades a que haya lugar.',
            'applies_to': ['all'],
            'paragraphs': [
                {
                    'type': 'PARÁGRAFO PRIMERO',
                    'content': 'EL ARRENDATARIO no destinará el inmueble para fines ilícitos, y en consecuencia se obliga de forma especial a no utilizarlo para ocultar o depositar armas, explosivos o dineros de grupos terroristas o artículos de contrabando o hurtados, o para que en él se elaboren, almacenen o vendan drogas, estupefacientes o sustancias alucinógenas y afines.'
                }
            ]
        },
        {
            'number': 3,
            'ordinal': 'TERCERA',
            'title': 'PRECIO',
            'content': 'El precio mensual del arrendamiento es de {monthly_rent_text} el cual deberá ser pagado por EL ARRENDATARIO, de forma anticipada los primeros cinco (05) días hábiles de cada mes, cualquiera que sea la fecha de inicio de la vigencia del presente contrato.',
            'applies_to': ['all'],
            'paragraphs': [
                {
                    'type': 'PARÁGRAFO PRIMERO',
                    'content': 'Se conviene que los períodos de pago del canon de Arrendamiento no serán divisibles, salvo el primero si la fecha de iniciación del contrato no coincide con la fecha en la que principia el mes calendario.'
                },
                {
                    'type': 'PARÁGRAFO SEGUNDO',
                    'content': 'En caso de mora en el pago del precio del arrendamiento, EL ARRENDATARIO, además del saldo en mora reconocerá y pagará durante ella a EL ARRENDADOR los intereses de mora liquidados a la tasa máxima permitida además de los honorarios por gestión de cobranza.'
                }
            ]
        }
    ]
    
    # Cláusulas específicas por tipo de contrato
    SPECIFIC_CLAUSES = {
        'rental_urban': [
            {
                'number': 7,
                'ordinal': 'SÉPTIMA',
                'title': 'SERVICIOS PÚBLICOS URBANOS',
                'content': 'Los servicios de energía eléctrica, gas, acueducto, alcantarillado, teléfono, internet, televisión por cable, recolección de basuras, estarán a cargo y deberán ser pagados directamente por EL ARRENDATARIO de manera puntual y hasta que el inmueble sea formalmente restituido.',
                'applies_to': ['rental_urban']
            },
            {
                'number': 8,
                'ordinal': 'OCTAVA',
                'title': 'ADMINISTRACIÓN Y PORTERÍA',
                'content': 'En caso de que el inmueble se encuentre sometido al régimen de propiedad horizontal, EL ARRENDATARIO deberá cancelar oportunamente las cuotas de administración, portería, vigilancia y demás gastos comunes que se generen.',
                'applies_to': ['rental_urban']
            }
        ],
        'rental_commercial': [
            {
                'number': 7,
                'ordinal': 'SÉPTIMA',
                'title': 'USO COMERCIAL',
                'content': 'EL ARRENDATARIO podrá destinar el inmueble exclusivamente para {commercial_activity}. Cualquier cambio en el tipo de actividad comercial deberá ser previamente autorizado por escrito por EL ARRENDADOR.',
                'applies_to': ['rental_commercial']
            },
            {
                'number': 8,
                'ordinal': 'OCTAVA',
                'title': 'LICENCIAS Y PERMISOS',
                'content': 'EL ARRENDATARIO se obliga a obtener y mantener vigentes todas las licencias, permisos y autorizaciones necesarias para el desarrollo de su actividad comercial, así como cumplir con todas las normas municipales, departamentales y nacionales aplicables.',
                'applies_to': ['rental_commercial']
            },
            {
                'number': 9,
                'ordinal': 'NOVENA',
                'title': 'HORARIOS DE FUNCIONAMIENTO',
                'content': 'EL ARRENDATARIO se compromete a respetar los horarios de funcionamiento establecidos por las autoridades competentes y a no generar ruidos o molestias que afecten la tranquilidad del sector.',
                'applies_to': ['rental_commercial']
            }
        ],
        'rental_rural': [
            {
                'number': 7,
                'ordinal': 'SÉPTIMA',
                'title': 'USO DEL TERRENO',
                'content': 'EL ARRENDATARIO destinará el terreno exclusivamente para {rural_use}. No podrá realizar construcciones permanentes sin previa autorización escrita de EL ARRENDADOR.',
                'applies_to': ['rental_rural']
            },
            {
                'number': 8,
                'ordinal': 'OCTAVA',
                'title': 'CONSERVACIÓN AMBIENTAL',
                'content': 'EL ARRENDATARIO se compromete a hacer un uso responsable del terreno, respetando las normas ambientales vigentes y evitando cualquier tipo de contaminación o deterioro del suelo.',
                'applies_to': ['rental_rural']
            }
        ],
        'rental_room': [
            {
                'number': 7,
                'ordinal': 'SÉPTIMA',
                'title': 'USO COMPARTIDO',
                'content': 'EL ARRENDATARIO tendrá derecho al uso exclusivo de la habitación arrendada y al uso compartido de las áreas comunes según se establezca en el inventario adjunto.',
                'applies_to': ['rental_room']
            },
            {
                'number': 8,
                'ordinal': 'OCTAVA',
                'title': 'NORMAS DE CONVIVENCIA',
                'content': 'EL ARRENDATARIO se compromete a respetar las normas de convivencia establecidas para la cohabitación pacífica con otros ocupantes del inmueble.',
                'applies_to': ['rental_room']
            }
        ]
    }
    
    # Cláusulas opcionales que el arrendador puede seleccionar
    OPTIONAL_CLAUSES = {
        'pets': {
            'title': 'MASCOTAS',
            'content': 'EL ARRENDATARIO {pets_permission} tener mascotas en el inmueble. En caso de autorización, se deberá pagar un depósito adicional de {pet_deposit} y mantener al día las vacunas y documentación sanitaria.',
            'variables': ['pets_permission', 'pet_deposit']
        },
        'smoking': {
            'title': 'PROHIBICIÓN DE FUMAR',
            'content': 'Queda expresamente prohibido fumar al interior del inmueble arrendado. El incumplimiento de esta cláusula será causal de terminación inmediata del contrato.',
            'variables': []
        },
        'parking': {
            'title': 'ESTACIONAMIENTO',
            'content': 'EL ARRENDADOR otorga a EL ARRENDATARIO el derecho de uso de {parking_spaces} espacio(s) de estacionamiento identificado(s) como {parking_numbers}.',
            'variables': ['parking_spaces', 'parking_numbers']
        },
        'furniture': {
            'title': 'MOBILIARIO',
            'content': 'El inmueble se entrega {furniture_status}. EL ARRENDATARIO se responsabiliza por el cuidado y mantenimiento del mobiliario incluido según inventario adjunto.',
            'variables': ['furniture_status']
        },
        'improvements': {
            'title': 'MEJORAS Y MODIFICACIONES',
            'content': 'EL ARRENDATARIO {improvements_permission} realizar mejoras o modificaciones al inmueble. Cualquier mejora realizada con autorización quedará en beneficio del inmueble sin derecho a compensación.',
            'variables': ['improvements_permission']
        }
    }
    
    def get_clauses_for_contract_type(self, contract_type: str, selected_optional_clauses: List[str] = None) -> List[Dict]:
        """Obtiene todas las cláusulas aplicables para un tipo de contrato específico."""
        if selected_optional_clauses is None:
            selected_optional_clauses = []
            
        clauses = []
        
        # Agregar cláusulas base
        clauses.extend(self.BASE_CLAUSES)
        
        # Agregar cláusulas específicas del tipo de contrato
        if contract_type in self.SPECIFIC_CLAUSES:
            clauses.extend(self.SPECIFIC_CLAUSES[contract_type])
        
        # Agregar cláusulas opcionales seleccionadas
        clause_number = len(clauses) + 1
        for optional_clause_key in selected_optional_clauses:
            if optional_clause_key in self.OPTIONAL_CLAUSES:
                optional_clause = self.OPTIONAL_CLAUSES[optional_clause_key].copy()
                optional_clause['number'] = clause_number
                optional_clause['ordinal'] = self._get_ordinal(clause_number)
                clauses.append(optional_clause)
                clause_number += 1
        
        return clauses
    
    def get_available_optional_clauses(self, contract_type: str) -> Dict[str, Dict]:
        """Obtiene las cláusulas opcionales disponibles para un tipo de contrato."""
        # Por ahora todas las cláusulas opcionales están disponibles para todos los tipos
        # En el futuro se puede filtrar por tipo de contrato
        return self.OPTIONAL_CLAUSES
    
    def format_clause_content(self, clause_content: str, context: Dict) -> str:
        """Formatea el contenido de una cláusula con las variables del contexto."""
        try:
            return clause_content.format(**context)
        except KeyError as e:
            # Si falta alguna variable, devolver el contenido sin formatear
            return clause_content
    
    def _get_ordinal(self, number: int) -> str:
        """Convierte un número a su equivalente ordinal en español."""
        ordinales = {
            1: 'PRIMERA', 2: 'SEGUNDA', 3: 'TERCERA', 4: 'CUARTA', 5: 'QUINTA',
            6: 'SEXTA', 7: 'SÉPTIMA', 8: 'OCTAVA', 9: 'NOVENA', 10: 'DÉCIMA',
            11: 'UNDÉCIMA', 12: 'DUODÉCIMA', 13: 'DECIMOTERCERA', 14: 'DECIMOCUARTA', 15: 'DECIMOQUINTA',
            16: 'DECIMOSEXTA', 17: 'DECIMOSÉPTIMA', 18: 'DECIMOCTAVA', 19: 'DECIMONOVENA', 20: 'VIGÉSIMA'
        }
        return ordinales.get(number, f'CLÁUSULA {number}')
    
    def get_contract_destinations(self, contract_type: str) -> Dict[str, str]:
        """Obtiene las destinaciones típicas para cada tipo de contrato."""
        destinations = {
            'rental_urban': {
                'vivienda': 'vivienda familiar',
                'vivienda_estudiantes': 'vivienda para estudiantes',
                'vivienda_profesionales': 'vivienda para profesionales'
            },
            'rental_commercial': {
                'oficina': 'oficina o actividades administrativas',
                'local_comercial': 'local comercial',
                'restaurante': 'establecimiento de alimentos y bebidas',
                'consultorio': 'consultorio profesional',
                'almacen': 'almacén o depósito'
            },
            'rental_rural': {
                'agricultura': 'actividades agrícolas',
                'ganaderia': 'actividades ganaderas',
                'recreacion': 'recreación y descanso',
                'mixto': 'uso mixto agropecuario'
            },
            'rental_room': {
                'habitacion': 'habitación en vivienda compartida',
                'estudiante': 'habitación para estudiante',
                'temporal': 'alojamiento temporal'
            }
        }
        return destinations.get(contract_type, {})


# Instancia global del gestor de cláusulas
clause_manager = ContractClauseManager()