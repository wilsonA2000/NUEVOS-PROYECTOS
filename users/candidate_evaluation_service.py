"""
Servicio de Evaluación de Candidatos para VeriHome.
Proporciona scoring automático y análisis de candidatos para arrendadores.
"""

from decimal import Decimal
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from django.utils import timezone
from django.db.models import Avg, Count, Q


class CandidateEvaluationService:
    """Servicio para evaluar candidatos de forma integral."""
    
    # Pesos para el scoring
    SCORING_WEIGHTS = {
        'financial': {
            'income_ratio': 20,      # Ratio ingreso/renta
            'credit_score': 15,      # Score crediticio
            'employment': 10,        # Estabilidad laboral
            'savings': 5,           # Ahorros/respaldo financiero
        },
        'background': {
            'no_evictions': 15,      # Sin desalojos
            'no_criminal': 10,       # Sin antecedentes
            'references': 10,        # Referencias válidas
        },
        'compatibility': {
            'pets': 5,              # Compatibilidad mascotas
            'smoking': 5,           # Política de fumar
            'occupancy': 10,        # Tamaño familia vs propiedad
        }
    }
    
    # Umbrales para calificación
    THRESHOLDS = {
        'income_ratio': {
            'excellent': 4.0,   # 4x o más
            'good': 3.0,        # 3x-4x
            'acceptable': 2.5,   # 2.5x-3x
            'poor': 2.0         # Menos de 2.5x
        },
        'credit_score': {
            'excellent': 750,
            'good': 700,
            'acceptable': 650,
            'poor': 600
        },
        'employment_months': {
            'excellent': 24,    # 2+ años
            'good': 12,         # 1-2 años
            'acceptable': 6,     # 6-12 meses
            'poor': 3           # Menos de 6 meses
        }
    }
    
    def __init__(self, candidate_user, property_obj=None, match_request=None, property_interest_request=None):
        """
        Inicializa el servicio de evaluación.
        
        Args:
            candidate_user: Usuario candidato (tenant)
            property_obj: Propiedad específica para evaluar compatibilidad
            match_request: MatchRequest específico si existe
            property_interest_request: PropertyInterestRequest como alternativa
        """
        self.candidate = candidate_user
        self.property = property_obj
        self.match_request = match_request
        self.property_interest_request = property_interest_request
        self.resume = getattr(candidate_user, 'resume', None)
        self.tenant_profile = getattr(candidate_user, 'tenant_profile', None)
        
        # Log para debug
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"CandidateEvaluationService iniciado - match_request: {match_request}, property_interest_request: {property_interest_request}")
        
    def calculate_overall_score(self) -> Dict:
        """
        Calcula el score general del candidato.
        
        Returns:
            Dict con score total y desglose por categorías
        """
        scores = {
            'financial': self._calculate_financial_score(),
            'background': self._calculate_background_score(),
            'compatibility': self._calculate_compatibility_score()
        }
        
        total_score = sum(scores.values())
        
        return {
            'total': round(total_score, 1),
            'breakdown': scores,
            'rating': self._get_rating_label(total_score),
            'recommendation': self._get_recommendation(total_score)
        }
    
    def _calculate_financial_score(self) -> float:
        """Calcula score financiero del candidato."""
        score = 0
        
        if not self.resume:
            return 0
            
        # Ratio ingreso/renta
        if self.property and self.resume.monthly_salary:
            rent_amount = self.property.rent_price or 0
            if rent_amount > 0:
                ratio = float(self.resume.monthly_salary) / float(rent_amount)
                if ratio >= 4.0:
                    score += self.SCORING_WEIGHTS['financial']['income_ratio']
                elif ratio >= 3.0:
                    score += self.SCORING_WEIGHTS['financial']['income_ratio'] * 0.75
                elif ratio >= 2.5:
                    score += self.SCORING_WEIGHTS['financial']['income_ratio'] * 0.5
                elif ratio >= 2.0:
                    score += self.SCORING_WEIGHTS['financial']['income_ratio'] * 0.25
        
        # Score crediticio
        if self.resume.credit_score:
            credit = self.resume.credit_score
            if credit >= 750:
                score += self.SCORING_WEIGHTS['financial']['credit_score']
            elif credit >= 700:
                score += self.SCORING_WEIGHTS['financial']['credit_score'] * 0.8
            elif credit >= 650:
                score += self.SCORING_WEIGHTS['financial']['credit_score'] * 0.6
            elif credit >= 600:
                score += self.SCORING_WEIGHTS['financial']['credit_score'] * 0.4
        
        # Estabilidad laboral
        if self.resume.start_date:
            months_employed = self._calculate_employment_duration()
            if months_employed >= 24:
                score += self.SCORING_WEIGHTS['financial']['employment']
            elif months_employed >= 12:
                score += self.SCORING_WEIGHTS['financial']['employment'] * 0.75
            elif months_employed >= 6:
                score += self.SCORING_WEIGHTS['financial']['employment'] * 0.5
            elif months_employed >= 3:
                score += self.SCORING_WEIGHTS['financial']['employment'] * 0.25
        
        return round(score, 1)
    
    def _calculate_background_score(self) -> float:
        """Calcula score de antecedentes del candidato."""
        score = 0
        
        if not self.resume:
            return 0
        
        # Sin historial de desalojos
        if not self.resume.eviction_history:
            score += self.SCORING_WEIGHTS['background']['no_evictions']
        
        # Sin antecedentes penales
        if not getattr(self.resume, 'criminal_records', False):
            score += self.SCORING_WEIGHTS['background']['no_criminal']
        
        # Referencias válidas
        references_count = 0
        if self.resume.reference1_name and self.resume.reference1_phone:
            references_count += 1
        if self.resume.reference2_name and self.resume.reference2_phone:
            references_count += 1
            
        if references_count == 2:
            score += self.SCORING_WEIGHTS['background']['references']
        elif references_count == 1:
            score += self.SCORING_WEIGHTS['background']['references'] * 0.5
        
        return round(score, 1)
    
    def _calculate_compatibility_score(self) -> float:
        """Calcula score de compatibilidad con la propiedad."""
        score = 0
        
        if not self.property:
            # Sin propiedad específica, dar puntaje neutral
            return self.SCORING_WEIGHTS['compatibility']['occupancy'] * 0.5
        
        # Compatibilidad de mascotas
        if self.tenant_profile:
            has_pets = getattr(self.tenant_profile, 'has_pets', False)
            allows_pets = getattr(self.property, 'allows_pets', True)
            
            if not has_pets or allows_pets:
                score += self.SCORING_WEIGHTS['compatibility']['pets']
        
        # Política de fumar (asumiendo no fumador si no se especifica)
        score += self.SCORING_WEIGHTS['compatibility']['smoking']
        
        # Ocupación adecuada
        if self.resume:
            dependents = self.resume.dependents or 0
            family_size = 1 + dependents  # Usuario + dependientes
            
            bedrooms = getattr(self.property, 'bedrooms', 1) or 1
            # Regla general: máx 2 personas por habitación
            max_occupancy = bedrooms * 2
            
            if family_size <= bedrooms + 1:  # Ocupación ideal
                score += self.SCORING_WEIGHTS['compatibility']['occupancy']
            elif family_size <= max_occupancy:  # Ocupación aceptable
                score += self.SCORING_WEIGHTS['compatibility']['occupancy'] * 0.7
            else:  # Sobre-ocupación
                score += 0
        
        return round(score, 1)
    
    def _calculate_employment_duration(self) -> int:
        """Calcula meses de empleo actual."""
        if not self.resume or not self.resume.start_date:
            return 0
            
        end_date = self.resume.end_date or timezone.now().date()
        duration = (end_date.year - self.resume.start_date.year) * 12
        duration += end_date.month - self.resume.start_date.month
        
        return max(0, duration)
    
    def _get_rating_label(self, score: float) -> str:
        """Obtiene etiqueta de calificación basada en score."""
        if score >= 85:
            return 'excelente'
        elif score >= 70:
            return 'muy_bueno'
        elif score >= 55:
            return 'bueno'
        elif score >= 40:
            return 'aceptable'
        else:
            return 'requiere_revision'
    
    def _get_recommendation(self, score: float) -> str:
        """Genera recomendación basada en score."""
        if score >= 85:
            return 'Candidato altamente recomendado. Proceso de aprobación rápida sugerido.'
        elif score >= 70:
            return 'Muy buen candidato. Se recomienda proceder con el proceso.'
        elif score >= 55:
            return 'Candidato aceptable. Considerar solicitar garantías adicionales.'
        elif score >= 40:
            return 'Candidato con algunas reservas. Evaluar cuidadosamente y solicitar co-firmante.'
        else:
            return 'Candidato no cumple criterios mínimos. Se sugiere explorar otras opciones.'
    
    def get_red_flags(self) -> List[Dict]:
        """Identifica alertas rojas en el perfil del candidato."""
        red_flags = []
        
        if not self.resume:
            red_flags.append({
                'type': 'critical',
                'message': 'Sin información de hoja de vida',
                'field': 'resume'
            })
            return red_flags
        
        # Verificar ratio ingreso/renta
        if self.property and self.resume.monthly_salary:
            rent = self.property.rent_price or 0
            if rent > 0:
                ratio = float(self.resume.monthly_salary) / float(rent)
                if ratio < 2.5:
                    red_flags.append({
                        'type': 'warning' if ratio >= 2.0 else 'critical',
                        'message': f'Ratio ingreso/renta bajo: {ratio:.1f}x',
                        'field': 'income_ratio'
                    })
        
        # Verificar historial de desalojos
        if self.resume.eviction_history:
            red_flags.append({
                'type': 'critical',
                'message': 'Historial de desalojo previo',
                'field': 'eviction_history'
            })
        
        # Verificar antecedentes penales
        if getattr(self.resume, 'criminal_records', False):
            red_flags.append({
                'type': 'critical',
                'message': 'Antecedentes penales reportados',
                'field': 'criminal_records'
            })
        
        # Verificar score crediticio
        if self.resume.credit_score and self.resume.credit_score < 600:
            red_flags.append({
                'type': 'warning',
                'message': f'Score crediticio bajo: {self.resume.credit_score}',
                'field': 'credit_score'
            })
        
        # Verificar estabilidad laboral
        months_employed = self._calculate_employment_duration()
        if months_employed < 6:
            red_flags.append({
                'type': 'warning',
                'message': f'Empleo reciente: {months_employed} meses',
                'field': 'employment_duration'
            })
        
        # Verificar referencias
        has_ref1 = bool(self.resume.reference1_name and self.resume.reference1_phone)
        has_ref2 = bool(self.resume.reference2_name and self.resume.reference2_phone)
        if not has_ref1 and not has_ref2:
            red_flags.append({
                'type': 'warning',
                'message': 'Sin referencias verificables',
                'field': 'references'
            })
        
        return red_flags
    
    def get_green_flags(self) -> List[Dict]:
        """Identifica aspectos positivos del candidato."""
        green_flags = []
        
        if not self.resume:
            return green_flags
        
        # Excelente ratio ingreso/renta
        if self.property and self.resume.monthly_salary:
            rent = self.property.rent_price or 0
            if rent > 0:
                ratio = float(self.resume.monthly_salary) / float(rent)
                if ratio >= 4.0:
                    green_flags.append({
                        'type': 'excellent',
                        'message': f'Excelente ratio ingreso/renta: {ratio:.1f}x',
                        'field': 'income_ratio'
                    })
        
        # Excelente score crediticio
        if self.resume.credit_score and self.resume.credit_score >= 750:
            green_flags.append({
                'type': 'excellent',
                'message': f'Score crediticio excelente: {self.resume.credit_score}',
                'field': 'credit_score'
            })
        
        # Empleo estable
        months_employed = self._calculate_employment_duration()
        if months_employed >= 24:
            years = months_employed // 12
            green_flags.append({
                'type': 'excellent',
                'message': f'Empleo estable: {years}+ años',
                'field': 'employment_duration'
            })
        
        # Sin historial negativo
        if not self.resume.eviction_history and not getattr(self.resume, 'criminal_records', False):
            green_flags.append({
                'type': 'good',
                'message': 'Historial limpio sin desalojos ni antecedentes',
                'field': 'background'
            })
        
        # Referencias completas
        if self.resume.reference1_name and self.resume.reference2_name:
            green_flags.append({
                'type': 'good',
                'message': 'Referencias completas proporcionadas',
                'field': 'references'
            })
        
        return green_flags
    
    def get_verification_status(self) -> Dict:
        """Obtiene el estado de verificación de documentos y datos."""
        verifications = {
            'identity': False,
            'income': False,
            'employment': False,
            'references': False,
            'background': False,
            'total_verified': 0,
            'total_pending': 0
        }
        
        if not self.resume:
            verifications['total_pending'] = 5
            return verifications
        
        # Verificación de identidad
        if self.resume.id_document:
            verifications['identity'] = True
            verifications['total_verified'] += 1
        else:
            verifications['total_pending'] += 1
        
        # Verificación de ingresos (basado en campos existentes)
        if self.resume.monthly_salary:
            verifications['income'] = True
            verifications['total_verified'] += 1
        else:
            verifications['total_pending'] += 1
        
        # Verificación de empleo (basado en campos existentes)
        if self.resume.current_employer and self.resume.current_position:
            verifications['employment'] = True
            verifications['total_verified'] += 1
        else:
            verifications['total_pending'] += 1
        
        # Verificación de referencias
        if self.resume.reference1_name and self.resume.reference2_name:
            verifications['references'] = True
            verifications['total_verified'] += 1
        else:
            verifications['total_pending'] += 1
        
        # Verificación de antecedentes (basado en campos existentes)
        if not self.resume.eviction_history and not getattr(self.resume, 'criminal_records', False):
            verifications['background'] = True
            verifications['total_verified'] += 1
        else:
            verifications['total_pending'] += 1
        
        verifications['verification_percentage'] = (
            verifications['total_verified'] / 5 * 100
        )
        
        return verifications
    
    def compare_with_other_candidates(self, property_id) -> Dict:
        """
        Compara este candidato con otros para la misma propiedad.
        
        Args:
            property_id: ID de la propiedad
            
        Returns:
            Dict con ranking y comparación
        """
        # TODO: Implementar cuando se tenga el modelo de aplicaciones
        # Por ahora retornar datos simulados
        return {
            'rank': 2,
            'total_candidates': 5,
            'better_than_percentage': 60,
            'strengths_vs_others': [
                'Mayor ingreso que promedio',
                'Mejor score crediticio',
                'Empleo más estable'
            ],
            'weaknesses_vs_others': [
                'Menos tiempo de referencias',
                'Familia más grande'
            ]
        }
    
    def get_full_evaluation(self) -> Dict:
        """
        Obtiene evaluación completa del candidato.
        
        Returns:
            Dict con toda la información de evaluación
        """
        score_data = self.calculate_overall_score()
        
        # Calcular ratio ingreso/renta si es posible
        income_ratio = None
        if self.property and self.resume and self.resume.monthly_salary:
            rent = self.property.rent_price or 0
            if rent > 0:
                income_ratio = float(self.resume.monthly_salary) / float(rent)
        
        return {
            'candidate': {
                'id': str(self.candidate.id),
                'name': self.candidate.get_full_name(),
                'email': self.candidate.email,
                'phone': getattr(self.candidate, 'phone_number', None)
            },
            'score': score_data,
            'verihome_rating': {
                'initial_rating': getattr(self.candidate, 'initial_rating', None),
                'verification_score': self.resume.verification_score if self.resume else None,
                'verified_by': self.resume.verified_by.get_full_name() if self.resume and self.resume.verified_by else None,
                'verified_at': self.resume.verified_at.isoformat() if self.resume and self.resume.verified_at else None,
                'is_verified': getattr(self.candidate, 'is_verified', False)
            },
            'financial_metrics': {
                'monthly_income': float(self.resume.monthly_salary) if self.resume and self.resume.monthly_salary else None,
                'income_ratio': round(income_ratio, 2) if income_ratio else None,
                'credit_score_verified': self.resume.verification_score if self.resume else None,  # Score oficial de VeriHome
                'credit_score_reported': self.resume.credit_score if self.resume else None,  # Score auto-reportado
                'employment_months': self._calculate_employment_duration()
            },
            'verification_status': self.get_verification_status(),
            'red_flags': self.get_red_flags(),
            'green_flags': self.get_green_flags(),
            'rental_history': self._get_rental_history(),
            'match_request_info': self._get_match_request_info(),
            'recommendation': score_data['recommendation']
        }
    
    def _get_rental_history(self) -> List[Dict]:
        """Obtiene historial de rentas formateado."""
        if not self.resume or not self.resume.rental_history:
            return []
        
        history = []
        for rental in self.resume.rental_history[:5]:  # Últimas 5 rentas
            history.append({
                'address': rental.get('address', 'No especificada'),
                'duration': rental.get('duration', 'No especificada'),
                'monthly_rent': rental.get('monthly_rent', 0),
                'end_reason': rental.get('end_reason', 'No especificado'),
                'landlord_contact': rental.get('landlord_contact', None)
            })
        
        return history
    
    def _get_match_request_info(self) -> Dict:
        """Obtiene información completa del MatchRequest o PropertyInterestRequest."""
        # Priorizar MatchRequest si existe
        if self.match_request:
            return {
                'id': str(self.match_request.id),
                'match_code': self.match_request.match_code,
                'status': self.match_request.status,
                'status_display': self.match_request.get_status_display(),
                'priority': self.match_request.priority,
                'priority_display': self.match_request.get_priority_display(),
                'tenant_message': self.match_request.tenant_message,
                'tenant_phone': self.match_request.tenant_phone,
                'tenant_email': self.match_request.tenant_email,
                'preferred_move_in_date': self.match_request.preferred_move_in_date.isoformat() if self.match_request.preferred_move_in_date else None,
                'lease_duration_months': self.match_request.lease_duration_months,
                'monthly_income': float(self.match_request.monthly_income) if self.match_request.monthly_income else None,
                'employment_type': self.match_request.employment_type,
                'number_of_occupants': self.match_request.number_of_occupants,
                'has_pets': self.match_request.has_pets,
                'pet_details': self.match_request.pet_details,
                'smoking_allowed': self.match_request.smoking_allowed,
                'has_rental_references': self.match_request.has_rental_references,
                'has_employment_proof': self.match_request.has_employment_proof,
                'has_credit_check': self.match_request.has_credit_check,
                'created_at': self.match_request.created_at.isoformat() if hasattr(self.match_request, 'created_at') else None,
                'updated_at': self.match_request.updated_at.isoformat() if hasattr(self.match_request, 'updated_at') else None
            }
        
        # Usar PropertyInterestRequest como alternativa
        elif self.property_interest_request:
            try:
                return {
                    'id': str(self.property_interest_request.id),
                    'match_code': f"REQ-{str(self.property_interest_request.id)[:8]}",
                    'status': getattr(self.property_interest_request, 'status', 'pending'),
                    'status_display': self.property_interest_request.get_status_display() if hasattr(self.property_interest_request, 'get_status_display') else 'Pendiente',
                    'priority': 'medium',  # Default priority
                    'priority_display': 'Medium',
                    'tenant_message': getattr(self.property_interest_request, 'description', ''),
                    'tenant_phone': getattr(self.candidate, 'phone', ''),
                    'tenant_email': self.candidate.email,
                    'preferred_move_in_date': self.property_interest_request.preferred_move_in_date.isoformat() if hasattr(self.property_interest_request, 'preferred_move_in_date') and self.property_interest_request.preferred_move_in_date else None,
                    'lease_duration_months': getattr(self.property_interest_request, 'lease_duration_months', 12),
                    'monthly_income': float(self.property_interest_request.monthly_income) if hasattr(self.property_interest_request, 'monthly_income') and self.property_interest_request.monthly_income else None,
                    'employment_type': getattr(self.property_interest_request, 'employment_type', ''),
                    'number_of_occupants': getattr(self.property_interest_request, 'number_of_occupants', 1),
                    'has_pets': getattr(self.property_interest_request, 'has_pets', False),
                    'pet_details': getattr(self.property_interest_request, 'pet_details', ''),
                    'smoking_allowed': getattr(self.property_interest_request, 'smoking_allowed', False),
                    'has_rental_references': getattr(self.property_interest_request, 'has_rental_references', False),
                    'has_employment_proof': getattr(self.property_interest_request, 'has_employment_proof', False),
                    'has_credit_check': getattr(self.property_interest_request, 'has_credit_check', False),
                    'created_at': self.property_interest_request.created_at.isoformat() if hasattr(self.property_interest_request, 'created_at') else None,
                    'updated_at': self.property_interest_request.updated_at.isoformat() if hasattr(self.property_interest_request, 'updated_at') else None
                }
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error extrayendo datos de PropertyInterestRequest: {e}")
                return None
        
        return None