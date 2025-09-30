"""
Servicios avanzados para el sistema de widgets del dashboard de VeriHome.
Sistema completo de procesamiento de datos, analytics y gestión de widgets.
"""

from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Avg, Q, F, Case, When, Value, IntegerField, FloatField
from django.db.models.functions import TruncDate, TruncHour, Extract, Coalesce
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from datetime import timedelta, datetime
import json
import hashlib
import logging
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
import asyncio
from concurrent.futures import ThreadPoolExecutor

from .models import DashboardWidget, UserDashboardLayout, UserWidgetConfig, WidgetDataCache
from properties.models import Property, PropertyImage, Amenity
from contracts.models import Contract
from payments.models import Transaction, Invoice
from ratings.models import Rating
from matching.models import MatchRequest, MatchNotification, MatchCriteria
from users.models import UserActivityLog
from messaging.models import Message, MessageThread

User = get_user_model()
logger = logging.getLogger(__name__)


class AdvancedDashboardDataService:
    """Servicio avanzado para procesamiento de datos del dashboard con analytics complejos."""
    
    def __init__(self, user: User):
        self.user = user
        self.user_type = user.user_type
        self.cache_prefix = f"dashboard_data_{user.id}"
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    async def get_comprehensive_dashboard_data(self, include_predictions: bool = True) -> Dict[str, Any]:
        """Obtiene datos completos del dashboard con análisis predictivo."""
        
        # Ejecutar consultas en paralelo
        tasks = [
            self._get_core_metrics_async(),
            self._get_financial_analytics_async(),
            self._get_user_behavior_analytics_async(),
            self._get_property_performance_async(),
            self._get_contract_insights_async(),
            self._get_matching_intelligence_async(),
            self._get_market_trends_async()
        ]
        
        if include_predictions:
            tasks.append(self._get_predictive_analytics_async())
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return {
            'core_metrics': results[0] if not isinstance(results[0], Exception) else {},
            'financial_analytics': results[1] if not isinstance(results[1], Exception) else {},
            'user_behavior': results[2] if not isinstance(results[2], Exception) else {},
            'property_performance': results[3] if not isinstance(results[3], Exception) else {},
            'contract_insights': results[4] if not isinstance(results[4], Exception) else {},
            'matching_intelligence': results[5] if not isinstance(results[5], Exception) else {},
            'market_trends': results[6] if not isinstance(results[6], Exception) else {},
            'predictions': results[7] if len(results) > 7 and not isinstance(results[7], Exception) else {},
            'generated_at': timezone.now(),
            'cache_info': self._get_cache_info()
        }
    
    async def _get_core_metrics_async(self) -> Dict[str, Any]:
        """Métricas core con análisis temporal detallado."""
        return await asyncio.get_event_loop().run_in_executor(
            self.executor, self._get_core_metrics
        )
    
    def _get_core_metrics(self) -> Dict[str, Any]:
        """Métricas core complejas con análisis temporal."""
        end_date = timezone.now()
        periods = {
            'daily': end_date - timedelta(days=1),
            'weekly': end_date - timedelta(days=7),
            'monthly': end_date - timedelta(days=30),
            'quarterly': end_date - timedelta(days=90),
            'yearly': end_date - timedelta(days=365)
        }
        
        metrics = {}
        
        if self.user_type == 'landlord':
            properties = Property.objects.filter(landlord=self.user)
            
            # Métricas básicas con tendencias
            for period_name, start_date in periods.items():
                metrics[period_name] = {
                    'properties': {
                        'total': properties.count(),
                        'occupied': properties.filter(status='rented').count(),
                        'available': properties.filter(status='available').count(),
                        'maintenance': properties.filter(status='maintenance').count(),
                        'new_properties': properties.filter(created_at__gte=start_date).count(),
                        'occupancy_rate': self._calculate_occupancy_rate(properties),
                        'avg_days_to_rent': self._calculate_avg_days_to_rent(properties, start_date),
                        'property_types_distribution': self._get_property_types_distribution(properties)
                    },
                    'revenue': {
                        'total': self._get_revenue_for_period(start_date, end_date),
                        'average_per_property': self._get_avg_revenue_per_property(start_date, end_date),
                        'growth_rate': self._calculate_revenue_growth_rate(period_name),
                        'top_earning_properties': self._get_top_earning_properties(start_date, end_date, 5)
                    },
                    'contracts': {
                        'active': Contract.objects.filter(property__landlord=self.user, status='active').count(),
                        'expiring_soon': self._get_expiring_contracts_count(30),
                        'renewal_rate': self._calculate_renewal_rate(start_date),
                        'avg_lease_duration': self._calculate_avg_lease_duration()
                    }
                }
        
        elif self.user_type == 'tenant':
            for period_name, start_date in periods.items():
                metrics[period_name] = {
                    'contracts': {
                        'active': Contract.objects.filter(secondary_party=self.user, status='active').count(),
                        'completed': Contract.objects.filter(secondary_party=self.user, status='completed').count(),
                        'satisfaction_score': self._calculate_tenant_satisfaction_score()
                    },
                    'payments': {
                        'total_paid': self._get_payments_for_period(start_date, end_date),
                        'on_time_rate': self._calculate_on_time_payment_rate(start_date),
                        'avg_payment_delay': self._calculate_avg_payment_delay(start_date)
                    },
                    'matching': {
                        'requests_sent': MatchRequest.objects.filter(tenant=self.user, created_at__gte=start_date).count(),
                        'acceptance_rate': self._calculate_match_acceptance_rate(start_date),
                        'avg_response_time': self._calculate_avg_match_response_time(start_date)
                    }
                }
        
        return metrics
    
    async def _get_financial_analytics_async(self) -> Dict[str, Any]:
        """Analytics financieros avanzados."""
        return await asyncio.get_event_loop().run_in_executor(
            self.executor, self._get_financial_analytics
        )
    
    def _get_financial_analytics(self) -> Dict[str, Any]:
        """Analytics financieros complejos con proyecciones."""
        if self.user_type not in ['landlord', 'service_provider']:
            return {}
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=365)  # Análisis anual
        
        # Análisis de ingresos por segmentos temporales
        revenue_analysis = self._analyze_revenue_patterns(start_date, end_date)
        
        # Análisis de gastos y ROI
        expense_analysis = self._analyze_expense_patterns(start_date, end_date)
        
        # Análisis de rentabilidad por propiedad
        property_profitability = self._analyze_property_profitability()
        
        # Proyecciones financieras
        financial_projections = self._generate_financial_projections()
        
        # Análisis de riesgo financiero
        risk_analysis = self._analyze_financial_risk()
        
        return {
            'revenue_analysis': revenue_analysis,
            'expense_analysis': expense_analysis,
            'property_profitability': property_profitability,
            'projections': financial_projections,
            'risk_analysis': risk_analysis,
            'kpis': self._calculate_financial_kpis(),
            'benchmarks': self._get_market_benchmarks()
        }
    
    def _analyze_revenue_patterns(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Análisis avanzado de patrones de ingresos."""
        transactions = Transaction.objects.filter(
            property__landlord=self.user,
            status='completed',
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        # Análisis temporal
        daily_revenue = transactions.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('date')
        
        hourly_patterns = transactions.annotate(
            hour=Extract('created_at', 'hour')
        ).values('hour').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('hour')
        
        # Análisis por tipo de propiedad
        property_type_revenue = transactions.values(
            'property__property_type'
        ).annotate(
            total=Sum('amount'),
            count=Count('id'),
            avg=Avg('amount')
        ).order_by('-total')
        
        # Detección de anomalías en ingresos
        anomalies = self._detect_revenue_anomalies(daily_revenue)
        
        # Estacionalidad
        seasonality = self._analyze_revenue_seasonality(daily_revenue)
        
        return {
            'daily_trends': list(daily_revenue),
            'hourly_patterns': list(hourly_patterns),
            'property_type_breakdown': list(property_type_revenue),
            'anomalies': anomalies,
            'seasonality': seasonality,
            'growth_metrics': self._calculate_revenue_growth_metrics(daily_revenue)
        }
    
    def _analyze_property_profitability(self) -> List[Dict[str, Any]]:
        """Análisis detallado de rentabilidad por propiedad."""
        properties = Property.objects.filter(landlord=self.user).annotate(
            total_revenue=Coalesce(Sum('transactions__amount', filter=Q(transactions__status='completed')), 0),
            transaction_count=Count('transactions', filter=Q(transactions__status='completed')),
            avg_monthly_revenue=Case(
                When(total_revenue__gt=0, then=F('total_revenue') / 12),
                default=Value(0),
                output_field=FloatField()
            ),
            occupancy_days=Case(
                When(status='rented', then=Value(365)),
                When(status='available', then=Value(0)),
                default=Value(182),
                output_field=IntegerField()
            )
        )
        
        profitability_data = []
        
        for property_obj in properties:
            # Calcular métricas avanzadas
            roi = self._calculate_property_roi(property_obj)
            cash_flow = self._calculate_property_cash_flow(property_obj)
            appreciation = self._estimate_property_appreciation(property_obj)
            risk_score = self._calculate_property_risk_score(property_obj)
            
            profitability_data.append({
                'property_id': str(property_obj.id),
                'title': property_obj.title,
                'total_revenue': float(property_obj.total_revenue),
                'avg_monthly_revenue': float(property_obj.avg_monthly_revenue),
                'roi': roi,
                'cash_flow': cash_flow,
                'appreciation_estimate': appreciation,
                'risk_score': risk_score,
                'profitability_grade': self._grade_property_profitability(roi, cash_flow, risk_score),
                'recommendations': self._generate_property_recommendations(property_obj, roi, risk_score)
            })
        
        return sorted(profitability_data, key=lambda x: x['roi'], reverse=True)
    
    async def _get_user_behavior_analytics_async(self) -> Dict[str, Any]:
        """Analytics de comportamiento de usuario."""
        return await asyncio.get_event_loop().run_in_executor(
            self.executor, self._get_user_behavior_analytics
        )
    
    def _get_user_behavior_analytics(self) -> Dict[str, Any]:
        """Análisis complejo del comportamiento del usuario."""
        end_date = timezone.now()
        start_date = end_date - timedelta(days=90)
        
        # Actividad del usuario
        activities = UserActivityLog.objects.filter(
            user=self.user,
            timestamp__gte=start_date
        )
        
        # Patrones de uso por día de la semana y hora
        usage_patterns = activities.annotate(
            weekday=Extract('timestamp', 'week_day'),
            hour=Extract('timestamp', 'hour')
        ).values('weekday', 'hour').annotate(
            count=Count('id')
        )
        
        # Análisis de características más utilizadas
        feature_usage = activities.values('activity_type').annotate(
            count=Count('id'),
            avg_duration=Avg('duration_seconds')
        ).order_by('-count')
        
        # Análisis de eficiencia del usuario
        efficiency_metrics = self._calculate_user_efficiency_metrics(activities)
        
        # Predicción de abandono (churn prediction)
        churn_risk = self._calculate_churn_risk()
        
        # Segmentación del usuario
        user_segment = self._determine_user_segment()
        
        return {
            'usage_patterns': list(usage_patterns),
            'feature_usage': list(feature_usage),
            'efficiency_metrics': efficiency_metrics,
            'churn_risk': churn_risk,
            'user_segment': user_segment,
            'engagement_score': self._calculate_engagement_score(activities),
            'satisfaction_indicators': self._analyze_satisfaction_indicators()
        }
    
    def _calculate_user_efficiency_metrics(self, activities) -> Dict[str, Any]:
        """Calcula métricas de eficiencia del usuario."""
        total_sessions = activities.values('session_id').distinct().count()
        avg_session_duration = activities.aggregate(
            avg_duration=Avg('duration_seconds')
        )['avg_duration'] or 0
        
        # Tasa de completación de tareas
        completed_tasks = activities.filter(activity_type__contains='completed').count()
        started_tasks = activities.filter(activity_type__contains='started').count()
        completion_rate = (completed_tasks / max(started_tasks, 1)) * 100
        
        # Tiempo promedio entre acciones
        activity_intervals = self._calculate_activity_intervals(activities)
        
        return {
            'total_sessions': total_sessions,
            'avg_session_duration': float(avg_session_duration),
            'completion_rate': completion_rate,
            'avg_activity_interval': activity_intervals,
            'productivity_score': self._calculate_productivity_score(
                completion_rate, avg_session_duration, activity_intervals
            )
        }
    
    async def _get_matching_intelligence_async(self) -> Dict[str, Any]:
        """Intelligence de matching avanzado."""
        return await asyncio.get_event_loop().run_in_executor(
            self.executor, self._get_matching_intelligence
        )
    
    def _get_matching_intelligence(self) -> Dict[str, Any]:
        """Sistema de inteligencia de matching avanzado."""
        if self.user_type not in ['landlord', 'tenant']:
            return {}
        
        end_date = timezone.now()
        start_date = end_date - timedelta(days=180)
        
        # Análisis de matches
        if self.user_type == 'landlord':
            matches = MatchRequest.objects.filter(landlord=self.user, created_at__gte=start_date)
            success_analysis = self._analyze_landlord_match_success(matches)
            optimization_suggestions = self._generate_landlord_optimization_suggestions()
        else:
            matches = MatchRequest.objects.filter(tenant=self.user, created_at__gte=start_date)
            success_analysis = self._analyze_tenant_match_success(matches)
            optimization_suggestions = self._generate_tenant_optimization_suggestions()
        
        # Análisis de patrones de matching
        matching_patterns = self._analyze_matching_patterns(matches)
        
        # Predicción de éxito de matches futuros
        success_predictions = self._predict_matching_success()
        
        # Análisis de competencia
        competition_analysis = self._analyze_market_competition()
        
        return {
            'success_analysis': success_analysis,
            'matching_patterns': matching_patterns,
            'success_predictions': success_predictions,
            'competition_analysis': competition_analysis,
            'optimization_suggestions': optimization_suggestions,
            'market_positioning': self._analyze_market_positioning()
        }
    
    async def _get_predictive_analytics_async(self) -> Dict[str, Any]:
        """Analytics predictivos avanzados."""
        return await asyncio.get_event_loop().run_in_executor(
            self.executor, self._get_predictive_analytics
        )
    
    def _get_predictive_analytics(self) -> Dict[str, Any]:
        """Sistema de analytics predictivos usando machine learning simulado."""
        
        # Predicción de ingresos
        revenue_forecast = self._forecast_revenue()
        
        # Predicción de ocupación
        occupancy_forecast = self._forecast_occupancy()
        
        # Predicción de mercado
        market_forecast = self._forecast_market_trends()
        
        # Identificación de oportunidades
        opportunities = self._identify_opportunities()
        
        # Análisis de riesgo predictivo
        risk_forecast = self._forecast_risks()
        
        return {
            'revenue_forecast': revenue_forecast,
            'occupancy_forecast': occupancy_forecast,
            'market_forecast': market_forecast,
            'opportunities': opportunities,
            'risk_forecast': risk_forecast,
            'confidence_scores': self._calculate_prediction_confidence(),
            'recommendations': self._generate_strategic_recommendations()
        }
    
    # Métodos auxiliares complejos
    
    def _calculate_occupancy_rate(self, properties) -> float:
        """Calcula tasa de ocupación con análisis temporal."""
        total = properties.count()
        if total == 0:
            return 0.0
        
        occupied = properties.filter(status='rented').count()
        return round((occupied / total) * 100, 2)
    
    def _calculate_avg_days_to_rent(self, properties, start_date: datetime) -> float:
        """Calcula días promedio para rentar una propiedad."""
        recently_rented = properties.filter(
            status='rented',
            updated_at__gte=start_date
        )
        
        total_days = 0
        count = 0
        
        for prop in recently_rented:
            # Simular cálculo basado en actividad
            days_to_rent = (prop.updated_at - prop.created_at).days
            if days_to_rent > 0:
                total_days += days_to_rent
                count += 1
        
        return round(total_days / max(count, 1), 1)
    
    def _detect_revenue_anomalies(self, daily_revenue) -> List[Dict[str, Any]]:
        """Detecta anomalías en los ingresos usando análisis estadístico."""
        if not daily_revenue:
            return []
        
        revenues = [item['total'] for item in daily_revenue]
        if len(revenues) < 7:
            return []
        
        # Calcular media y desviación estándar
        mean_revenue = sum(revenues) / len(revenues)
        variance = sum((x - mean_revenue) ** 2 for x in revenues) / len(revenues)
        std_dev = variance ** 0.5
        
        # Detectar outliers (> 2 desviaciones estándar)
        anomalies = []
        threshold = 2 * std_dev
        
        for item in daily_revenue:
            if abs(float(item['total']) - mean_revenue) > threshold:
                anomalies.append({
                    'date': item['date'],
                    'revenue': float(item['total']),
                    'expected': mean_revenue,
                    'deviation': abs(float(item['total']) - mean_revenue),
                    'type': 'spike' if float(item['total']) > mean_revenue else 'drop'
                })
        
        return anomalies
    
    def _forecast_revenue(self) -> Dict[str, Any]:
        """Predice ingresos futuros usando análisis de tendencias."""
        # Obtener datos históricos
        end_date = timezone.now()
        start_date = end_date - timedelta(days=365)
        
        historical_data = Transaction.objects.filter(
            property__landlord=self.user,
            status='completed',
            created_at__gte=start_date
        ).annotate(
            month=TruncDate('created_at')
        ).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')
        
        if len(historical_data) < 3:
            return {'error': 'Insufficient data for forecasting'}
        
        # Análisis de tendencia simple (regresión lineal básica)
        revenues = [float(item['total']) for item in historical_data]
        
        # Calcular tendencia
        n = len(revenues)
        sum_x = sum(range(n))
        sum_y = sum(revenues)
        sum_xy = sum(i * revenues[i] for i in range(n))
        sum_x2 = sum(i * i for i in range(n))
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
        intercept = (sum_y - slope * sum_x) / n
        
        # Generar predicciones para los próximos 6 meses
        predictions = []
        for i in range(6):
            future_index = n + i
            predicted_revenue = slope * future_index + intercept
            
            # Agregar factor de estacionalidad
            seasonal_factor = self._get_seasonal_factor(i + 1)
            adjusted_prediction = predicted_revenue * seasonal_factor
            
            predictions.append({
                'month': i + 1,
                'predicted_revenue': max(0, adjusted_prediction),
                'confidence': max(0.1, 1 - (i * 0.15))  # Confianza decrece con el tiempo
            })
        
        return {
            'predictions': predictions,
            'trend': 'increasing' if slope > 0 else 'decreasing',
            'growth_rate': slope,
            'total_predicted': sum(p['predicted_revenue'] for p in predictions)
        }
    
    def _get_seasonal_factor(self, month_ahead: int) -> float:
        """Calcula factor estacional basado en patrones históricos."""
        # Factores estacionales simplificados (en un sistema real sería más complejo)
        seasonal_factors = {
            1: 0.95,  # Enero - menor actividad
            2: 0.98,  # Febrero
            3: 1.05,  # Marzo - incremento
            4: 1.08,  # Abril - alta temporada
            5: 1.10,  # Mayo - pico
            6: 1.02,  # Junio - normalización
        }
        
        current_month = timezone.now().month
        future_month = ((current_month + month_ahead - 1) % 12) + 1
        
        return seasonal_factors.get(future_month, 1.0)
    
    def _calculate_churn_risk(self) -> Dict[str, Any]:
        """Calcula riesgo de abandono del usuario."""
        # Factores de riesgo
        recent_activity = UserActivityLog.objects.filter(
            user=self.user,
            timestamp__gte=timezone.now() - timedelta(days=30)
        ).count()
        
        # Actividad reciente (factor principal)
        activity_score = min(recent_activity / 50, 1.0)  # Normalizar a 0-1
        
        # Satisfacción (basada en ratings)
        satisfaction_score = self._calculate_satisfaction_score()
        
        # Engagement con la plataforma
        engagement_score = self._calculate_engagement_score(
            UserActivityLog.objects.filter(user=self.user)
        )
        
        # Calcular riesgo combinado
        risk_score = 1 - ((activity_score + satisfaction_score + engagement_score) / 3)
        
        return {
            'risk_score': risk_score,
            'risk_level': self._classify_risk_level(risk_score),
            'factors': {
                'low_activity': recent_activity < 10,
                'low_satisfaction': satisfaction_score < 0.6,
                'low_engagement': engagement_score < 0.5
            },
            'recommendations': self._generate_retention_recommendations(risk_score)
        }
    
    def _get_cache_info(self) -> Dict[str, Any]:
        """Información del estado del cache."""
        cache_keys = cache.keys(f"{self.cache_prefix}*") if hasattr(cache, 'keys') else []
        
        return {
            'cached_items': len(cache_keys),
            'cache_prefix': self.cache_prefix,
            'last_refresh': timezone.now().isoformat()
        }


class AdvancedWidgetDataProvider:
    """Proveedor avanzado de datos para widgets con procesamiento complejo."""
    
    def __init__(self, widget: DashboardWidget, user: User):
        self.widget = widget
        self.user = user
        self.user_type = user.user_type
        self.widget_type = widget.widget_type
        self.filter_config = widget.filter_config or {}
        self.data_service = AdvancedDashboardDataService(user)
    
    async def get_advanced_widget_data(self) -> Dict[str, Any]:
        """Obtiene datos avanzados para el widget con procesamiento asíncrono."""
        cache_key = f"widget_data_{self.widget.id}_{self.user.id}_{self.widget_type}"
        
        # Intentar obtener del cache primero
        cached_data = cache.get(cache_key)
        if cached_data and not self.widget.needs_refresh():
            return {
                'data': cached_data,
                'from_cache': True,
                'cache_key': cache_key,
                'timestamp': timezone.now()
            }
        
        # Generar datos frescos
        try:
            method_name = f'_get_advanced_{self.widget_type}_data'
            
            if hasattr(self, method_name):
                widget_data = await getattr(self, method_name)()
            else:
                widget_data = await self._get_default_widget_data()
            
            # Guardar en cache
            cache_timeout = self.widget.refresh_interval if self.widget.refresh_interval > 0 else 300
            cache.set(cache_key, widget_data, timeout=cache_timeout)
            
            # Actualizar cache en base de datos también
            WidgetDataCache.objects.update_or_create(
                widget=self.widget,
                user=self.user,
                cache_key=cache_key,
                defaults={
                    'cached_data': widget_data,
                    'expires_at': timezone.now() + timedelta(seconds=cache_timeout),
                    'data_source': self.widget_type,
                    'query_parameters': self.filter_config
                }
            )
            
            return {
                'data': widget_data,
                'from_cache': False,
                'cache_key': cache_key,
                'timestamp': timezone.now()
            }
            
        except Exception as e:
            logger.error(f"Error generating widget data: {str(e)}")
            return {
                'error': str(e),
                'widget_type': self.widget_type,
                'timestamp': timezone.now()
            }
    
    async def _get_advanced_stats_overview_data(self) -> Dict[str, Any]:
        """Datos avanzados para resumen de estadísticas."""
        comprehensive_data = await self.data_service.get_comprehensive_dashboard_data()
        
        core_metrics = comprehensive_data.get('core_metrics', {})
        monthly_data = core_metrics.get('monthly', {})
        
        advanced_stats = []
        
        if self.user_type == 'landlord':
            properties_data = monthly_data.get('properties', {})
            revenue_data = monthly_data.get('revenue', {})
            
            advanced_stats = [
                {
                    'label': 'Portfolio Value',
                    'value': self._calculate_portfolio_value(),
                    'format': 'currency',
                    'icon': 'trending_up',
                    'color': 'primary',
                    'change': self._calculate_portfolio_change(),
                    'breakdown': self._get_portfolio_breakdown()
                },
                {
                    'label': 'Occupancy Rate',
                    'value': properties_data.get('occupancy_rate', 0),
                    'format': 'percentage',
                    'icon': 'home',
                    'color': 'success',
                    'benchmark': self._get_market_occupancy_benchmark(),
                    'prediction': self._predict_occupancy_trend()
                },
                {
                    'label': 'Revenue Efficiency',
                    'value': self._calculate_revenue_efficiency(),
                    'format': 'percentage',
                    'icon': 'analytics',
                    'color': 'info',
                    'components': self._get_efficiency_components()
                },
                {
                    'label': 'Tenant Satisfaction',
                    'value': self._calculate_aggregate_satisfaction(),
                    'format': 'rating',
                    'icon': 'star',
                    'color': 'warning',
                    'trend': self._get_satisfaction_trend(),
                    'alerts': self._get_satisfaction_alerts()
                }
            ]
        
        return {
            'title': 'Advanced Portfolio Overview',
            'stats': advanced_stats,
            'summary_insights': self._generate_summary_insights(comprehensive_data),
            'action_items': self._generate_action_items(comprehensive_data),
            'performance_grade': self._calculate_overall_performance_grade()
        }
    
    async def _get_advanced_financial_summary_data(self) -> Dict[str, Any]:
        """Datos financieros avanzados con análisis predictivo."""
        comprehensive_data = await self.data_service.get_comprehensive_dashboard_data()
        financial_data = comprehensive_data.get('financial_analytics', {})
        
        return {
            'title': 'Advanced Financial Analytics',
            'revenue_analysis': financial_data.get('revenue_analysis', {}),
            'profitability_matrix': self._create_profitability_matrix(),
            'cash_flow_forecast': self._generate_cash_flow_forecast(),
            'risk_metrics': financial_data.get('risk_analysis', {}),
            'optimization_opportunities': self._identify_financial_opportunities(),
            'tax_optimization': self._analyze_tax_optimization(),
            'investment_recommendations': self._generate_investment_recommendations()
        }
    
    def _calculate_portfolio_value(self) -> float:
        """Calcula el valor total del portfolio."""
        if self.user_type != 'landlord':
            return 0.0
        
        properties = Property.objects.filter(landlord=self.user)
        total_value = 0.0
        
        for prop in properties:
            # Estimar valor basado en ingresos (método de capitalización)
            annual_income = prop.rent_price * 12 if prop.rent_price else 0
            estimated_value = annual_income * 10  # Cap rate del 10%
            total_value += estimated_value
        
        return total_value
    
    def _create_profitability_matrix(self) -> Dict[str, Any]:
        """Crea matriz de rentabilidad por propiedad y período."""
        if self.user_type != 'landlord':
            return {}
        
        properties = Property.objects.filter(landlord=self.user)
        matrix = []
        
        for prop in properties:
            monthly_data = []
            for month in range(12):
                # Simular datos mensuales (en sistema real sería data real)
                base_revenue = float(prop.rent_price) if prop.rent_price else 0
                seasonal_factor = 1 + (month % 4 - 2) * 0.05  # Variación estacional
                monthly_revenue = base_revenue * seasonal_factor
                monthly_expenses = monthly_revenue * 0.3  # 30% gastos estimados
                profit = monthly_revenue - monthly_expenses
                
                monthly_data.append({
                    'month': month + 1,
                    'revenue': monthly_revenue,
                    'expenses': monthly_expenses,
                    'profit': profit,
                    'margin': (profit / max(monthly_revenue, 1)) * 100
                })
            
            matrix.append({
                'property_id': str(prop.id),
                'property_title': prop.title,
                'monthly_data': monthly_data,
                'annual_totals': {
                    'revenue': sum(m['revenue'] for m in monthly_data),
                    'expenses': sum(m['expenses'] for m in monthly_data),
                    'profit': sum(m['profit'] for m in monthly_data)
                }
            })
        
        return {
            'properties': matrix,
            'portfolio_totals': self._calculate_portfolio_totals(matrix)
        }


class DashboardAnalyticsEngine:
    """Motor de analytics avanzado para el dashboard."""
    
    def __init__(self):
        self.cache_timeout = 3600  # 1 hora
    
    def get_comprehensive_system_analytics(self) -> Dict[str, Any]:
        """Analytics completos del sistema de dashboard."""
        
        # Métricas de uso del sistema
        usage_metrics = self._analyze_system_usage()
        
        # Performance del sistema
        performance_metrics = self._analyze_system_performance()
        
        # Análisis de widgets más efectivos
        widget_effectiveness = self._analyze_widget_effectiveness()
        
        # Patrones de uso por tipo de usuario
        user_patterns = self._analyze_user_patterns()
        
        # Optimizaciones recomendadas
        optimization_recommendations = self._generate_system_optimizations()
        
        return {
            'usage_metrics': usage_metrics,
            'performance_metrics': performance_metrics,
            'widget_effectiveness': widget_effectiveness,
            'user_patterns': user_patterns,
            'optimization_recommendations': optimization_recommendations,
            'system_health': self._calculate_system_health_score(),
            'generated_at': timezone.now()
        }
    
    def _analyze_widget_effectiveness(self) -> List[Dict[str, Any]]:
        """Analiza la efectividad de cada tipo de widget."""
        widget_stats = []
        
        for widget_type, display_name in DashboardWidget.WIDGET_TYPES:
            widgets = DashboardWidget.objects.filter(widget_type=widget_type, is_active=True)
            
            if widgets.exists():
                # Métricas de uso
                total_users = UserWidgetConfig.objects.filter(
                    widget__widget_type=widget_type,
                    is_enabled=True
                ).count()
                
                # Interacciones (basado en cache hits)
                cache_hits = WidgetDataCache.objects.filter(
                    widget__widget_type=widget_type,
                    created_at__gte=timezone.now() - timedelta(days=30)
                ).count()
                
                # Tiempo promedio en widget (simulado)
                avg_time_spent = cache_hits * 1.5  # Aproximación
                
                # Score de efectividad
                effectiveness_score = self._calculate_widget_effectiveness_score(
                    total_users, cache_hits, avg_time_spent
                )
                
                widget_stats.append({
                    'widget_type': widget_type,
                    'display_name': display_name,
                    'total_users': total_users,
                    'cache_hits': cache_hits,
                    'avg_time_spent': avg_time_spent,
                    'effectiveness_score': effectiveness_score,
                    'adoption_rate': self._calculate_adoption_rate(widget_type),
                    'retention_rate': self._calculate_widget_retention_rate(widget_type),
                    'recommendations': self._generate_widget_improvement_recommendations(widget_type)
                })
        
        return sorted(widget_stats, key=lambda x: x['effectiveness_score'], reverse=True)
    
    def _calculate_widget_effectiveness_score(self, users: int, hits: int, time_spent: float) -> float:
        """Calcula score de efectividad de un widget."""
        if users == 0:
            return 0.0
        
        # Factores ponderados
        user_adoption = min(users / 100, 1.0) * 0.4  # 40% peso
        usage_frequency = min(hits / (users * 30), 1.0) * 0.4  # 40% peso
        engagement = min(time_spent / (users * 5), 1.0) * 0.2  # 20% peso
        
        return (user_adoption + usage_frequency + engagement) * 100
    
    def _generate_system_optimizations(self) -> List[Dict[str, Any]]:
        """Genera recomendaciones de optimización del sistema."""
        optimizations = []
        
        # Análisis de cache
        expired_cache = WidgetDataCache.objects.filter(
            expires_at__lt=timezone.now()
        ).count()
        
        if expired_cache > 100:
            optimizations.append({
                'category': 'Cache Management',
                'priority': 'high',
                'title': 'Clean Expired Cache Entries',
                'description': f'Remove {expired_cache} expired cache entries to improve performance',
                'estimated_impact': 'Medium',
                'effort': 'Low'
            })
        
        # Análisis de widgets subutilizados
        underutilized_widgets = DashboardWidget.objects.filter(
            is_active=True,
            userwidgetconfig__isnull=True
        ).count()
        
        if underutilized_widgets > 5:
            optimizations.append({
                'category': 'Widget Optimization',
                'priority': 'medium',
                'title': 'Review Underutilized Widgets',
                'description': f'{underutilized_widgets} widgets have no users. Consider removal or improvement.',
                'estimated_impact': 'Low',
                'effort': 'Medium'
            })
        
        # Análisis de performance
        slow_widgets = self._identify_slow_widgets()
        if slow_widgets:
            optimizations.append({
                'category': 'Performance',
                'priority': 'high',
                'title': 'Optimize Slow Widgets',
                'description': f'Optimize {len(slow_widgets)} widgets with slow load times',
                'estimated_impact': 'High',
                'effort': 'High',
                'affected_widgets': slow_widgets
            })
        
        return optimizations
    
    def _identify_slow_widgets(self) -> List[str]:
        """Identifica widgets con tiempos de carga lentos."""
        # En un sistema real, esto analizaría métricas de tiempo de respuesta
        # Por ahora simulamos basándose en tipos de widgets complejos
        complex_widgets = [
            'property_performance',
            'matching_intelligence', 
            'predictive_analytics',
            'financial_summary'
        ]
        
        return complex_widgets
    
    def _calculate_system_health_score(self) -> Dict[str, Any]:
        """Calcula score de salud general del sistema."""
        
        # Métricas de salud
        total_widgets = DashboardWidget.objects.filter(is_active=True).count()
        total_users = UserDashboardLayout.objects.count()
        active_users = UserDashboardLayout.objects.filter(
            last_accessed__gte=timezone.now() - timedelta(days=7)
        ).count()
        
        # Cache health
        total_cache = WidgetDataCache.objects.count()
        valid_cache = WidgetDataCache.objects.filter(
            expires_at__gt=timezone.now()
        ).count()
        
        cache_health = (valid_cache / max(total_cache, 1)) * 100
        user_activity = (active_users / max(total_users, 1)) * 100
        system_utilization = min((total_widgets * active_users) / 1000, 1) * 100
        
        # Score combinado
        health_score = (cache_health * 0.3 + user_activity * 0.4 + system_utilization * 0.3)
        
        return {
            'overall_score': round(health_score, 1),
            'status': self._classify_health_status(health_score),
            'components': {
                'cache_health': round(cache_health, 1),
                'user_activity': round(user_activity, 1),
                'system_utilization': round(system_utilization, 1)
            },
            'recommendations': self._generate_health_recommendations(health_score)
        }
    
    def _classify_health_status(self, score: float) -> str:
        """Clasifica el estado de salud del sistema."""
        if score >= 90:
            return 'excellent'
        elif score >= 75:
            return 'good'
        elif score >= 60:
            return 'fair'
        elif score >= 40:
            return 'poor'
        else:
            return 'critical'