"""
Sistema de analíticas avanzado para calificaciones de VeriHome.
Incluye métricas, tendencias y detección de patrones.
"""

from django.db import models
from django.db.models import Avg, Count, Q, F
from django.utils import timezone
from datetime import timedelta, date
from decimal import Decimal
import json
from typing import Dict, List, Any, Optional

from .models import Rating, RatingCategory, UserRatingProfile
from users.models import User


class RatingAnalytics:
    """Clase para generar analíticas de calificaciones."""
    
    def __init__(self, user: Optional[User] = None, date_range: Optional[int] = 30):
        self.user = user
        self.date_range = date_range
        self.end_date = timezone.now()
        self.start_date = self.end_date - timedelta(days=date_range) if date_range else None
    
    def get_global_statistics(self) -> Dict[str, Any]:
        """Obtiene estadísticas globales de calificaciones."""
        queryset = Rating.objects.filter(
            is_active=True,
            moderation_status='approved'
        )
        
        if self.start_date:
            queryset = queryset.filter(created_at__gte=self.start_date)
        
        total_ratings = queryset.count()
        
        if total_ratings == 0:
            return self._empty_stats()
        
        # Estadísticas básicas
        avg_rating = queryset.aggregate(avg=Avg('overall_rating'))['avg'] or 0
        
        # Distribución por estrellas
        distribution = {}
        for i in range(1, 11):
            distribution[f'{i}_stars'] = queryset.filter(overall_rating=i).count()
        
        # Distribución por tipo
        type_distribution = {}
        for rating_type, display_name in Rating.RATING_TYPES:
            count = queryset.filter(rating_type=rating_type).count()
            type_distribution[rating_type] = {
                'count': count,
                'percentage': (count / total_ratings * 100) if total_ratings > 0 else 0,
                'display_name': display_name
            }
        
        # Tendencias semanales
        weekly_trends = self._get_weekly_trends(queryset)
        
        # Top usuarios mejor calificados
        top_users = self._get_top_rated_users()
        
        return {
            'total_ratings': total_ratings,
            'average_rating': round(avg_rating, 2),
            'distribution': distribution,
            'type_distribution': type_distribution,
            'weekly_trends': weekly_trends,
            'top_users': top_users,
            'response_rate': self._get_response_rate(queryset),
            'moderation_stats': self._get_moderation_stats(),
        }
    
    def get_user_analytics(self, target_user: User) -> Dict[str, Any]:
        """Obtiene analíticas específicas de un usuario."""
        received_ratings = Rating.objects.filter(
            reviewee=target_user,
            is_active=True,
            moderation_status='approved'
        )
        
        given_ratings = Rating.objects.filter(
            reviewer=target_user,
            is_active=True
        )
        
        if self.start_date:
            received_ratings = received_ratings.filter(created_at__gte=self.start_date)
            given_ratings = given_ratings.filter(created_at__gte=self.start_date)
        
        # Estadísticas de calificaciones recibidas
        received_stats = self._analyze_received_ratings(received_ratings)
        
        # Estadísticas de calificaciones dadas
        given_stats = self._analyze_given_ratings(given_ratings)
        
        # Tendencias temporales
        trends = self._get_user_trends(target_user)
        
        # Comparación con usuarios similares
        peer_comparison = self._get_peer_comparison(target_user)
        
        # Análisis de categorías
        category_analysis = self._analyze_user_categories(target_user)
        
        return {
            'user_id': target_user.id,
            'user_name': target_user.get_full_name(),
            'received_stats': received_stats,
            'given_stats': given_stats,
            'trends': trends,
            'peer_comparison': peer_comparison,
            'category_analysis': category_analysis,
            'reputation_score': self._calculate_reputation_score(target_user),
        }
    
    def get_property_analytics(self, property_id: str) -> Dict[str, Any]:
        """Obtiene analíticas de calificaciones para una propiedad específica."""
        ratings = Rating.objects.filter(
            property_id=property_id,
            is_active=True,
            moderation_status='approved'
        )
        
        if self.start_date:
            ratings = ratings.filter(created_at__gte=self.start_date)
        
        total_ratings = ratings.count()
        
        if total_ratings == 0:
            return self._empty_property_stats()
        
        avg_rating = ratings.aggregate(avg=Avg('overall_rating'))['avg'] or 0
        
        # Análisis por tipo de calificación
        landlord_ratings = ratings.filter(rating_type='tenant_to_landlord')
        tenant_ratings = ratings.filter(rating_type='landlord_to_tenant')
        
        # Análisis de categorías específicas de propiedad
        property_condition_ratings = RatingCategory.objects.filter(
            rating__in=ratings,
            category='property_condition'
        )
        
        cleanliness_ratings = RatingCategory.objects.filter(
            rating__in=ratings,
            category='cleanliness'
        )
        
        return {
            'property_id': property_id,
            'total_ratings': total_ratings,
            'average_rating': round(avg_rating, 2),
            'landlord_ratings': {
                'count': landlord_ratings.count(),
                'average': landlord_ratings.aggregate(avg=Avg('overall_rating'))['avg'] or 0
            },
            'tenant_ratings': {
                'count': tenant_ratings.count(),
                'average': tenant_ratings.aggregate(avg=Avg('overall_rating'))['avg'] or 0
            },
            'property_condition_avg': property_condition_ratings.aggregate(
                avg=Avg('score'))['avg'] or 0,
            'cleanliness_avg': cleanliness_ratings.aggregate(
                avg=Avg('score'))['avg'] or 0,
            'monthly_trends': self._get_property_monthly_trends(ratings),
        }
    
    def detect_suspicious_patterns(self) -> Dict[str, List[Dict]]:
        """Detecta patrones sospechosos en las calificaciones."""
        suspicious_patterns = {
            'potential_fake_reviews': [],
            'rating_bombers': [],
            'suspicious_clusters': [],
            'rapid_rating_users': []
        }
        
        # Detectar posibles calificaciones falsas
        fake_reviews = self._detect_fake_reviews()
        suspicious_patterns['potential_fake_reviews'] = fake_reviews
        
        # Detectar usuarios que dan siempre calificaciones muy altas o muy bajas
        rating_bombers = self._detect_rating_bombers()
        suspicious_patterns['rating_bombers'] = rating_bombers
        
        # Detectar grupos de calificaciones sospechosas
        suspicious_clusters = self._detect_suspicious_clusters()
        suspicious_patterns['suspicious_clusters'] = suspicious_clusters
        
        # Detectar usuarios que califican muy rápidamente
        rapid_raters = self._detect_rapid_raters()
        suspicious_patterns['rapid_rating_users'] = rapid_raters
        
        return suspicious_patterns
    
    def _empty_stats(self) -> Dict[str, Any]:
        """Retorna estadísticas vacías."""
        return {
            'total_ratings': 0,
            'average_rating': 0,
            'distribution': {},
            'type_distribution': {},
            'weekly_trends': [],
            'top_users': [],
            'response_rate': 0,
            'moderation_stats': {}
        }
    
    def _empty_property_stats(self) -> Dict[str, Any]:
        """Retorna estadísticas vacías para propiedades."""
        return {
            'property_id': None,
            'total_ratings': 0,
            'average_rating': 0,
            'landlord_ratings': {'count': 0, 'average': 0},
            'tenant_ratings': {'count': 0, 'average': 0},
            'property_condition_avg': 0,
            'cleanliness_avg': 0,
            'monthly_trends': []
        }
    
    def _get_weekly_trends(self, queryset) -> List[Dict]:
        """Obtiene tendencias semanales."""
        trends = []
        for i in range(4):  # Últimas 4 semanas
            week_start = self.end_date - timedelta(weeks=i+1)
            week_end = self.end_date - timedelta(weeks=i)
            
            week_ratings = queryset.filter(
                created_at__gte=week_start,
                created_at__lt=week_end
            )
            
            trends.append({
                'week': f'Semana {4-i}',
                'count': week_ratings.count(),
                'average': week_ratings.aggregate(avg=Avg('overall_rating'))['avg'] or 0
            })
        
        return trends
    
    def _get_top_rated_users(self, limit: int = 10) -> List[Dict]:
        """Obtiene los usuarios mejor calificados."""
        top_profiles = UserRatingProfile.objects.filter(
            total_ratings_received__gte=5  # Mínimo 5 calificaciones
        ).order_by('-average_rating')[:limit]
        
        return [{
            'user_id': profile.user.id,
            'user_name': profile.user.get_full_name(),
            'average_rating': float(profile.average_rating),
            'total_ratings': profile.total_ratings_received,
            'badges': profile.get_badge_display()
        } for profile in top_profiles]
    
    def _get_response_rate(self, queryset) -> float:
        """Calcula la tasa de respuesta a calificaciones."""
        total_ratings = queryset.count()
        ratings_with_response = queryset.filter(response__isnull=False).count()
        
        return (ratings_with_response / total_ratings * 100) if total_ratings > 0 else 0
    
    def _get_moderation_stats(self) -> Dict[str, int]:
        """Obtiene estadísticas de moderación."""
        return {
            'pending': Rating.objects.filter(moderation_status='pending').count(),
            'approved': Rating.objects.filter(moderation_status='approved').count(),
            'rejected': Rating.objects.filter(moderation_status='rejected').count(),
            'flagged': Rating.objects.filter(is_flagged=True).count()
        }
    
    def _analyze_received_ratings(self, ratings) -> Dict[str, Any]:
        """Analiza calificaciones recibidas por un usuario."""
        total = ratings.count()
        if total == 0:
            return {'total': 0, 'average': 0, 'distribution': {}}
        
        avg = ratings.aggregate(avg=Avg('overall_rating'))['avg'] or 0
        
        distribution = {}
        for i in range(1, 11):
            distribution[f'{i}_stars'] = ratings.filter(overall_rating=i).count()
        
        return {
            'total': total,
            'average': round(avg, 2),
            'distribution': distribution,
            'recent_trend': self._get_recent_trend(ratings)
        }
    
    def _analyze_given_ratings(self, ratings) -> Dict[str, Any]:
        """Analiza calificaciones dadas por un usuario."""
        total = ratings.count()
        if total == 0:
            return {'total': 0, 'average': 0, 'distribution': {}}
        
        avg = ratings.aggregate(avg=Avg('overall_rating'))['avg'] or 0
        
        # Analizar si el usuario es muy generoso o muy crítico
        high_ratings = ratings.filter(overall_rating__gte=8).count()
        low_ratings = ratings.filter(overall_rating__lte=4).count()
        
        rating_pattern = 'balanced'
        if high_ratings / total > 0.8:
            rating_pattern = 'generous'
        elif low_ratings / total > 0.8:
            rating_pattern = 'critical'
        
        return {
            'total': total,
            'average': round(avg, 2),
            'pattern': rating_pattern,
            'generosity_score': round(high_ratings / total * 100, 2) if total > 0 else 0
        }
    
    def _get_user_trends(self, user: User) -> Dict[str, List]:
        """Obtiene tendencias del usuario en el tiempo."""
        ratings = Rating.objects.filter(
            reviewee=user,
            is_active=True,
            moderation_status='approved'
        ).order_by('created_at')
        
        monthly_data = []
        current_month = date.today().replace(day=1)
        
        for i in range(6):  # Últimos 6 meses
            month_start = current_month - timedelta(days=i*30)
            month_end = month_start + timedelta(days=30)
            
            month_ratings = ratings.filter(
                created_at__date__gte=month_start,
                created_at__date__lt=month_end
            )
            
            monthly_data.append({
                'month': month_start.strftime('%Y-%m'),
                'count': month_ratings.count(),
                'average': month_ratings.aggregate(avg=Avg('overall_rating'))['avg'] or 0
            })
        
        return {
            'monthly_data': list(reversed(monthly_data)),
            'trend_direction': self._calculate_trend_direction(monthly_data)
        }
    
    def _get_peer_comparison(self, user: User) -> Dict[str, Any]:
        """Compara el usuario con sus pares."""
        user_profile = UserRatingProfile.objects.filter(user=user).first()
        if not user_profile:
            return {}
        
        # Comparar con usuarios del mismo tipo
        peer_profiles = UserRatingProfile.objects.filter(
            user__user_type=user.user_type,
            total_ratings_received__gte=3
        ).exclude(user=user)
        
        if not peer_profiles.exists():
            return {}
        
        peer_avg = peer_profiles.aggregate(avg=Avg('average_rating'))['avg'] or 0
        percentile = peer_profiles.filter(
            average_rating__lte=user_profile.average_rating
        ).count() / peer_profiles.count() * 100
        
        return {
            'peer_average': round(peer_avg, 2),
            'user_percentile': round(percentile, 1),
            'better_than_peers': user_profile.average_rating > peer_avg
        }
    
    def _analyze_user_categories(self, user: User) -> Dict[str, Any]:
        """Analiza las categorías de calificación del usuario."""
        category_ratings = RatingCategory.objects.filter(
            rating__reviewee=user,
            rating__is_active=True,
            rating__moderation_status='approved'
        )
        
        category_stats = {}
        for category_code, category_name in Rating.RATING_CATEGORIES:
            cat_ratings = category_ratings.filter(category=category_code)
            if cat_ratings.exists():
                avg_score = cat_ratings.aggregate(avg=Avg('score'))['avg'] or 0
                category_stats[category_code] = {
                    'name': category_name,
                    'average': round(avg_score, 2),
                    'count': cat_ratings.count()
                }
        
        # Encontrar fortalezas y debilidades
        if category_stats:
            strengths = sorted(category_stats.items(), 
                             key=lambda x: x[1]['average'], reverse=True)[:3]
            weaknesses = sorted(category_stats.items(), 
                              key=lambda x: x[1]['average'])[:3]
        else:
            strengths = []
            weaknesses = []
        
        return {
            'category_stats': category_stats,
            'strengths': [{'category': s[0], 'name': s[1]['name'], 
                         'score': s[1]['average']} for s in strengths],
            'weaknesses': [{'category': w[0], 'name': w[1]['name'], 
                          'score': w[1]['average']} for w in weaknesses]
        }
    
    def _calculate_reputation_score(self, user: User) -> Dict[str, Any]:
        """Calcula un score de reputación basado en múltiples factores."""
        profile = UserRatingProfile.objects.filter(user=user).first()
        if not profile:
            return {'score': 0, 'level': 'Nuevo'}
        
        # Factores del score
        avg_rating = float(profile.average_rating)
        total_ratings = profile.total_ratings_received
        response_rate = 0  # TODO: Implementar tasa de respuesta
        
        # Cálculo del score (0-1000)
        rating_score = (avg_rating / 10) * 400  # Máximo 400 puntos
        volume_score = min(total_ratings * 5, 300)  # Máximo 300 puntos
        engagement_score = response_rate * 100  # Máximo 100 puntos
        longevity_score = min(200, 200)  # TODO: Basado en antigüedad
        
        total_score = rating_score + volume_score + engagement_score + longevity_score
        
        # Determinar nivel
        if total_score >= 900:
            level = 'Experto'
        elif total_score >= 700:
            level = 'Avanzado'
        elif total_score >= 500:
            level = 'Intermedio'
        elif total_score >= 200:
            level = 'Principiante'
        else:
            level = 'Nuevo'
        
        return {
            'score': round(total_score),
            'level': level,
            'breakdown': {
                'rating': round(rating_score),
                'volume': round(volume_score),
                'engagement': round(engagement_score),
                'longevity': round(longevity_score)
            }
        }
    
    def _get_property_monthly_trends(self, ratings) -> List[Dict]:
        """Obtiene tendencias mensuales para una propiedad."""
        trends = []
        current_month = date.today().replace(day=1)
        
        for i in range(12):  # Últimos 12 meses
            month_start = current_month - timedelta(days=i*30)
            month_end = month_start + timedelta(days=30)
            
            month_ratings = ratings.filter(
                created_at__date__gte=month_start,
                created_at__date__lt=month_end
            )
            
            trends.append({
                'month': month_start.strftime('%Y-%m'),
                'count': month_ratings.count(),
                'average': month_ratings.aggregate(avg=Avg('overall_rating'))['avg'] or 0
            })
        
        return list(reversed(trends))
    
    def _detect_fake_reviews(self) -> List[Dict]:
        """Detecta posibles calificaciones falsas."""
        # Implementar algoritmos de detección de spam/fake reviews
        suspicious = []
        
        # Calificaciones de usuarios muy nuevos con puntuaciones extremas
        recent_extreme = Rating.objects.filter(
            reviewer__date_joined__gte=timezone.now() - timedelta(days=7),
            overall_rating__in=[1, 2, 9, 10],
            is_active=True
        )
        
        for rating in recent_extreme:
            suspicious.append({
                'rating_id': str(rating.id),
                'reason': 'New user with extreme rating',
                'confidence': 0.6
            })
        
        return suspicious
    
    def _detect_rating_bombers(self) -> List[Dict]:
        """Detecta usuarios que consistentemente dan calificaciones extremas."""
        bombers = []
        
        # Usuarios que dan solo calificaciones muy altas o muy bajas
        users_ratings = Rating.objects.filter(
            is_active=True
        ).values('reviewer').annotate(
            total=Count('id'),
            extreme_count=Count('id', filter=Q(overall_rating__in=[1, 2, 9, 10]))
        ).filter(total__gte=5)
        
        for user_data in users_ratings:
            extreme_ratio = user_data['extreme_count'] / user_data['total']
            if extreme_ratio > 0.9:  # 90% calificaciones extremas
                bombers.append({
                    'user_id': user_data['reviewer'],
                    'extreme_ratio': round(extreme_ratio, 2),
                    'total_ratings': user_data['total']
                })
        
        return bombers
    
    def _detect_suspicious_clusters(self) -> List[Dict]:
        """Detecta grupos de calificaciones sospechosas."""
        # Implementar detección de clusters sospechosos
        return []
    
    def _detect_rapid_raters(self) -> List[Dict]:
        """Detecta usuarios que califican demasiado rápido."""
        rapid_raters = []
        
        # Usuarios que han dado muchas calificaciones en poco tiempo
        recent_ratings = Rating.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=1)
        ).values('reviewer').annotate(
            count=Count('id')
        ).filter(count__gte=10)  # 10+ calificaciones en un día
        
        for user_data in recent_ratings:
            rapid_raters.append({
                'user_id': user_data['reviewer'],
                'ratings_count': user_data['count'],
                'timeframe': '24 hours'
            })
        
        return rapid_raters
    
    def _get_recent_trend(self, ratings) -> str:
        """Determina la tendencia reciente de calificaciones."""
        recent = ratings.filter(
            created_at__gte=timezone.now() - timedelta(days=30)
        )
        older = ratings.filter(
            created_at__lt=timezone.now() - timedelta(days=30),
            created_at__gte=timezone.now() - timedelta(days=60)
        )
        
        if not recent.exists() or not older.exists():
            return 'stable'
        
        recent_avg = recent.aggregate(avg=Avg('overall_rating'))['avg'] or 0
        older_avg = older.aggregate(avg=Avg('overall_rating'))['avg'] or 0
        
        if recent_avg > older_avg + 0.5:
            return 'improving'
        elif recent_avg < older_avg - 0.5:
            return 'declining'
        else:
            return 'stable'
    
    def _calculate_trend_direction(self, monthly_data: List[Dict]) -> str:
        """Calcula la dirección de la tendencia."""
        if len(monthly_data) < 3:
            return 'stable'
        
        recent_avg = sum(month['average'] for month in monthly_data[-3:]) / 3
        older_avg = sum(month['average'] for month in monthly_data[:3]) / 3
        
        if recent_avg > older_avg + 0.3:
            return 'improving'
        elif recent_avg < older_avg - 0.3:
            return 'declining'
        else:
            return 'stable'


class RatingRecommendationEngine:
    """Motor de recomendaciones para el sistema de calificaciones."""
    
    def __init__(self):
        pass
    
    def get_users_to_rate(self, user: User, limit: int = 10) -> List[Dict]:
        """Recomienda usuarios que el usuario actual podría calificar."""
        # Encontrar contratos completados sin calificación
        from contracts.models import Contract
        
        completed_contracts = Contract.objects.filter(
            Q(primary_party=user) | Q(secondary_party=user),
            status='completed'
        ).exclude(
            ratings__reviewer=user
        )
        
        recommendations = []
        for contract in completed_contracts[:limit]:
            other_party = contract.secondary_party if contract.primary_party == user else contract.primary_party
            
            recommendations.append({
                'user_id': other_party.id,
                'user_name': other_party.get_full_name(),
                'contract_id': contract.id,
                'property_title': contract.property.title if contract.property else '',
                'completion_date': contract.end_date,
                'suggested_rating_type': self._suggest_rating_type(user, other_party, contract)
            })
        
        return recommendations
    
    def get_improvement_suggestions(self, user: User) -> Dict[str, List[str]]:
        """Genera sugerencias de mejora basadas en las calificaciones recibidas."""
        profile = UserRatingProfile.objects.filter(user=user).first()
        if not profile or not profile.category_averages:
            return {'suggestions': []}
        
        suggestions = []
        
        # Analizar categorías con puntuación baja
        for category, average in profile.category_averages.items():
            if average < 6.0:  # Puntuación baja
                suggestion = self._get_improvement_suggestion(category, average)
                if suggestion:
                    suggestions.append(suggestion)
        
        # Sugerencias generales basadas en tendencias
        general_suggestions = self._get_general_suggestions(user)
        
        return {
            'category_suggestions': suggestions,
            'general_suggestions': general_suggestions
        }
    
    def _suggest_rating_type(self, rater: User, ratee: User, contract) -> str:
        """Sugiere el tipo de calificación basado en los roles."""
        if rater.user_type == 'landlord' and ratee.user_type == 'tenant':
            return 'landlord_to_tenant'
        elif rater.user_type == 'tenant' and ratee.user_type == 'landlord':
            return 'tenant_to_landlord'
        elif rater.user_type in ['tenant', 'landlord'] and ratee.user_type == 'service_provider':
            return 'client_to_service_provider'
        elif rater.user_type == 'service_provider' and ratee.user_type in ['tenant', 'landlord']:
            return 'service_provider_to_client'
        else:
            return 'general'
    
    def _get_improvement_suggestion(self, category: str, score: float) -> Optional[str]:
        """Genera sugerencia específica para una categoría."""
        suggestions = {
            'communication': 'Considera responder más rápidamente a mensajes y mantener una comunicación clara y frecuente.',
            'reliability': 'Cumple siempre con los compromisos acordados y comunica cualquier cambio con anticipación.',
            'cleanliness': 'Mantén las áreas comunes y la propiedad en excelente estado de limpieza.',
            'punctuality': 'Llega siempre a tiempo a las citas programadas y respeta los horarios acordados.',
            'professionalism': 'Mantén un trato profesional y respetuoso en todas las interacciones.',
            'property_condition': 'Asegúrate de que la propiedad esté en excelente estado antes de cada inquilino.',
            'payment_timeliness': 'Realiza todos los pagos puntualmente según lo acordado.',
            'responsiveness': 'Responde rápidamente a consultas y solicitudes de los demás usuarios.'
        }
        
        return suggestions.get(category)
    
    def _get_general_suggestions(self, user: User) -> List[str]:
        """Genera sugerencias generales de mejora."""
        suggestions = [
            'Solicita feedback específico para identificar áreas de mejora.',
            'Mantén un perfil completo y actualizado en la plataforma.',
            'Participa activamente en la comunicación durante los procesos.'
        ]
        
        # Sugerencias basadas en el tipo de usuario
        if user.user_type == 'landlord':
            suggestions.extend([
                'Proporciona descripciones detalladas y fotos actualizadas de tus propiedades.',
                'Establece expectativas claras desde el inicio del contrato.',
                'Realiza mantenimiento preventivo regular de tus propiedades.'
            ])
        elif user.user_type == 'tenant':
            suggestions.extend([
                'Trata la propiedad como si fuera tuya.',
                'Reporta problemas de mantenimiento de manera oportuna.',
                'Respeta las normas del edificio y la comunidad.'
            ])
        elif user.user_type == 'service_provider':
            suggestions.extend([
                'Documenta tu trabajo con fotos antes y después.',
                'Proporciona estimaciones detalladas y precisas.',
                'Mantén certificaciones y seguros actualizados.'
            ])
        
        return suggestions