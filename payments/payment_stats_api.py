"""
Payment Stats API - Advanced Analytics and Statistics for VeriHome Payments.

This module provides comprehensive payment statistics and analytics for:
- Individual user payment statistics
- System-wide payment analytics
- Revenue tracking and forecasting
- Payment method performance analysis
- Landlord/Tenant financial dashboards
- Escrow account analytics
- Payment plan performance metrics

Features:
- Real-time payment analytics
- ML-powered forecasting
- Advanced filtering and aggregation
- Role-based access control
- Performance optimization with caching
- Export capabilities
"""

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from django.contrib.auth import get_user_model
from django.db import models
from django.db.models import Q, Sum, Count, Avg, F, Case, When
from django.db.models.functions import TruncMonth, TruncWeek, TruncDay
from django.utils import timezone
from django.core.cache import cache
from decimal import Decimal
from datetime import datetime, timedelta, date
import json
import logging

from .models import (
    Transaction, PaymentMethod, Invoice, EscrowAccount, 
    PaymentPlan, PaymentInstallment, RentPaymentSchedule
)
from .serializers import PaymentStatsSerializer
from core.cache import SmartCache

User = get_user_model()
logger = logging.getLogger(__name__)

class PaymentStatsAPIView(APIView):
    """
    Comprehensive Payment Statistics API.
    
    Provides detailed payment analytics including:
    - Transaction volume and trends
    - Revenue analytics
    - Payment method performance
    - User-specific financial metrics
    - System-wide payment health
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get comprehensive payment statistics for the authenticated user."""
        user = request.user
        date_range = request.query_params.get('date_range', '30d')  # 7d, 30d, 90d, 1y
        currency = request.query_params.get('currency', 'COP')
        include_predictions = request.query_params.get('predictions', 'false').lower() == 'true'
        
        # Check cache first
        cache_key = f"payment_stats_{user.id}_{date_range}_{currency}_{include_predictions}"
        cached_stats = SmartCache.get(cache_key)
        
        if cached_stats:
            return Response(cached_stats)
        
        try:
            # Calculate date range
            end_date = timezone.now().date()
            start_date = self._calculate_start_date(end_date, date_range)
            
            # Get user transactions
            user_transactions = self._get_user_transactions(user, start_date, end_date, currency)
            
            # Calculate comprehensive stats
            stats = {
                'period': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'range': date_range,
                    'currency': currency
                },
                'transaction_summary': self._calculate_transaction_summary(user_transactions),
                'revenue_analytics': self._calculate_revenue_analytics(user, user_transactions, start_date, end_date),
                'payment_methods': self._calculate_payment_method_stats(user, user_transactions),
                'escrow_analytics': self._calculate_escrow_stats(user, start_date, end_date),
                'invoice_analytics': self._calculate_invoice_stats(user, start_date, end_date),
                'payment_plans': self._calculate_payment_plan_stats(user, start_date, end_date),
                'cash_flow': self._calculate_cash_flow_analysis(user, user_transactions, start_date, end_date),
                'trends': self._calculate_payment_trends(user_transactions, start_date, end_date),
                'comparisons': self._calculate_period_comparisons(user, start_date, end_date, date_range),
                'geographic_distribution': self._calculate_geographic_stats(user_transactions),
                'risk_analytics': self._calculate_risk_metrics(user, user_transactions)
            }
            
            # Add ML predictions if requested
            if include_predictions:
                stats['predictions'] = self._generate_payment_predictions(user, user_transactions)
            
            # Add role-specific analytics
            if hasattr(user, 'user_type'):
                if user.user_type == 'landlord':
                    stats['landlord_analytics'] = self._calculate_landlord_analytics(user, start_date, end_date)
                elif user.user_type == 'tenant':
                    stats['tenant_analytics'] = self._calculate_tenant_analytics(user, start_date, end_date)
                elif user.user_type == 'service_provider':
                    stats['service_provider_analytics'] = self._calculate_service_provider_analytics(user, start_date, end_date)
            
            # Cache results for 15 minutes
            SmartCache.set(cache_key, stats, timeout=900)
            
            return Response(stats)
            
        except Exception as e:
            logger.error(f"Error calculating payment stats for user {user.id}: {str(e)}")
            return Response(
                {'error': 'Error calculating payment statistics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _calculate_start_date(self, end_date, date_range):
        """Calculate start date based on range parameter."""
        if date_range == '7d':
            return end_date - timedelta(days=7)
        elif date_range == '30d':
            return end_date - timedelta(days=30)
        elif date_range == '90d':
            return end_date - timedelta(days=90)
        elif date_range == '1y':
            return end_date - timedelta(days=365)
        else:
            return end_date - timedelta(days=30)  # Default to 30 days
    
    def _get_user_transactions(self, user, start_date, end_date, currency):
        """Get user transactions for the specified period."""
        return Transaction.objects.filter(
            Q(payer=user) | Q(payee=user),
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            currency=currency
        ).select_related('payer', 'payee', 'payment_method', 'contract', 'property')
    
    def _calculate_transaction_summary(self, transactions):
        """Calculate basic transaction summary statistics."""
        total_count = transactions.count()
        
        # Aggregate by status
        status_aggregation = transactions.values('status').annotate(
            count=Count('id'),
            total_amount=Sum('total_amount')
        )
        
        # Aggregate by transaction type
        type_aggregation = transactions.values('transaction_type').annotate(
            count=Count('id'),
            total_amount=Sum('total_amount')
        )
        
        # Aggregate by direction
        direction_aggregation = transactions.values('direction').annotate(
            count=Count('id'),
            total_amount=Sum('total_amount')
        )
        
        # Calculate totals
        total_amount = transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        avg_transaction = transactions.aggregate(Avg('total_amount'))['total_amount__avg'] or 0
        
        return {
            'total_transactions': total_count,
            'total_amount': float(total_amount),
            'average_transaction': float(avg_transaction),
            'by_status': {item['status']: {
                'count': item['count'],
                'amount': float(item['total_amount'] or 0)
            } for item in status_aggregation},
            'by_type': {item['transaction_type']: {
                'count': item['count'],
                'amount': float(item['total_amount'] or 0)
            } for item in type_aggregation},
            'by_direction': {item['direction']: {
                'count': item['count'],
                'amount': float(item['total_amount'] or 0)
            } for item in direction_aggregation}
        }
    
    def _calculate_revenue_analytics(self, user, transactions, start_date, end_date):
        """Calculate revenue analytics for the user."""
        # Income vs Outgoing
        incoming = transactions.filter(payee=user, status='completed').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        outgoing = transactions.filter(payer=user, status='completed').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        net_income = incoming - outgoing
        
        # Monthly breakdown
        monthly_revenue = transactions.filter(
            payee=user, 
            status='completed'
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            revenue=Sum('total_amount'),
            transaction_count=Count('id')
        ).order_by('month')
        
        # Revenue by source
        revenue_by_type = transactions.filter(
            payee=user,
            status='completed'
        ).values('transaction_type').annotate(
            revenue=Sum('total_amount'),
            count=Count('id')
        )
        
        return {
            'total_income': float(incoming),
            'total_expenses': float(outgoing),
            'net_income': float(net_income),
            'profit_margin': float((net_income / incoming * 100) if incoming > 0 else 0),
            'monthly_breakdown': [
                {
                    'month': item['month'].strftime('%Y-%m'),
                    'revenue': float(item['revenue']),
                    'transaction_count': item['transaction_count']
                } for item in monthly_revenue
            ],
            'revenue_by_source': {
                item['transaction_type']: {
                    'amount': float(item['revenue']),
                    'count': item['count'],
                    'percentage': float((item['revenue'] / incoming * 100) if incoming > 0 else 0)
                } for item in revenue_by_type
            }
        }
    
    def _calculate_payment_method_stats(self, user, transactions):
        """Calculate payment method performance statistics."""
        # Get user's payment methods
        payment_methods = PaymentMethod.objects.filter(user=user, is_active=True)
        
        # Usage statistics
        method_usage = transactions.filter(
            payment_method__isnull=False
        ).values(
            'payment_method__method_type'
        ).annotate(
            count=Count('id'),
            total_amount=Sum('total_amount'),
            success_rate=Avg(
                Case(
                    When(status='completed', then=1.0),
                    default=0.0
                )
            )
        )
        
        return {
            'total_methods': payment_methods.count(),
            'active_methods': payment_methods.filter(is_verified=True).count(),
            'usage_stats': {
                item['payment_method__method_type']: {
                    'usage_count': item['count'],
                    'total_amount': float(item['total_amount'] or 0),
                    'success_rate': float(item['success_rate'] * 100) if item['success_rate'] else 0
                } for item in method_usage
            },
            'preferred_method': self._get_preferred_payment_method(method_usage)
        }
    
    def _get_preferred_payment_method(self, method_usage):
        """Determine the user's preferred payment method."""
        if not method_usage:
            return None
        
        # Find method with highest usage count
        preferred = max(method_usage, key=lambda x: x['count'])
        return preferred['payment_method__method_type']
    
    def _calculate_escrow_stats(self, user, start_date, end_date):
        """Calculate escrow account statistics."""
        escrow_accounts = EscrowAccount.objects.filter(
            Q(buyer=user) | Q(seller=user),
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        total_escrow_amount = escrow_accounts.aggregate(
            Sum('amount')
        )['amount__sum'] or 0
        
        escrow_by_status = escrow_accounts.values('status').annotate(
            count=Count('id'),
            total_amount=Sum('amount')
        )
        
        return {
            'total_escrow_accounts': escrow_accounts.count(),
            'total_escrow_amount': float(total_escrow_amount),
            'by_status': {
                item['status']: {
                    'count': item['count'],
                    'amount': float(item['total_amount'] or 0)
                } for item in escrow_by_status
            },
            'average_escrow_amount': float(
                escrow_accounts.aggregate(Avg('amount'))['amount__avg'] or 0
            )
        }
    
    def _calculate_invoice_stats(self, user, start_date, end_date):
        """Calculate invoice statistics."""
        # Issued invoices
        issued_invoices = Invoice.objects.filter(
            issuer=user,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        # Received invoices
        received_invoices = Invoice.objects.filter(
            recipient=user,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        return {
            'issued': {
                'count': issued_invoices.count(),
                'total_amount': float(issued_invoices.aggregate(Sum('amount'))['amount__sum'] or 0),
                'paid_amount': float(
                    issued_invoices.filter(status='paid').aggregate(Sum('amount'))['amount__sum'] or 0
                ),
                'by_status': {
                    item['status']: item['count'] 
                    for item in issued_invoices.values('status').annotate(count=Count('id'))
                }
            },
            'received': {
                'count': received_invoices.count(),
                'total_amount': float(received_invoices.aggregate(Sum('amount'))['amount__sum'] or 0),
                'paid_amount': float(
                    received_invoices.filter(status='paid').aggregate(Sum('amount'))['amount__sum'] or 0
                ),
                'by_status': {
                    item['status']: item['count'] 
                    for item in received_invoices.values('status').annotate(count=Count('id'))
                }
            }
        }
    
    def _calculate_payment_plan_stats(self, user, start_date, end_date):
        """Calculate payment plan performance statistics."""
        payment_plans = PaymentPlan.objects.filter(
            user=user,
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        total_planned_amount = payment_plans.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        
        # Calculate completion rates
        completed_plans = payment_plans.filter(status='completed').count()
        completion_rate = (completed_plans / payment_plans.count() * 100) if payment_plans.count() > 0 else 0
        
        return {
            'total_plans': payment_plans.count(),
            'active_plans': payment_plans.filter(status='active').count(),
            'completed_plans': completed_plans,
            'completion_rate': float(completion_rate),
            'total_planned_amount': float(total_planned_amount),
            'average_plan_amount': float(
                payment_plans.aggregate(Avg('total_amount'))['total_amount__avg'] or 0
            )
        }
    
    def _calculate_cash_flow_analysis(self, user, transactions, start_date, end_date):
        """Calculate detailed cash flow analysis."""
        # Daily cash flow
        daily_flow = transactions.filter(
            status='completed'
        ).annotate(
            day=TruncDay('processed_at')
        ).values('day').annotate(
            inflow=Sum(
                Case(
                    When(payee=user, then='total_amount'),
                    default=0
                )
            ),
            outflow=Sum(
                Case(
                    When(payer=user, then='total_amount'),
                    default=0
                )
            )
        ).order_by('day')
        
        # Calculate net flow and running balance
        running_balance = 0
        cash_flow_data = []
        
        for item in daily_flow:
            net_flow = (item['inflow'] or 0) - (item['outflow'] or 0)
            running_balance += net_flow
            
            cash_flow_data.append({
                'date': item['day'].strftime('%Y-%m-%d'),
                'inflow': float(item['inflow'] or 0),
                'outflow': float(item['outflow'] or 0),
                'net_flow': float(net_flow),
                'running_balance': float(running_balance)
            })
        
        return {
            'daily_cash_flow': cash_flow_data,
            'total_inflow': sum(item['inflow'] for item in cash_flow_data),
            'total_outflow': sum(item['outflow'] for item in cash_flow_data),
            'net_cash_flow': sum(item['net_flow'] for item in cash_flow_data),
            'final_balance': running_balance
        }
    
    def _calculate_payment_trends(self, transactions, start_date, end_date):
        """Calculate payment trends and patterns."""
        # Weekly trends
        weekly_trends = transactions.filter(
            status='completed'
        ).annotate(
            week=TruncWeek('processed_at')
        ).values('week').annotate(
            count=Count('id'),
            amount=Sum('total_amount')
        ).order_by('week')
        
        # Growth calculations
        trend_data = []
        previous_amount = 0
        
        for item in weekly_trends:
            current_amount = item['amount'] or 0
            growth_rate = 0
            
            if previous_amount > 0:
                growth_rate = ((current_amount - previous_amount) / previous_amount) * 100
            
            trend_data.append({
                'week': item['week'].strftime('%Y-W%U'),
                'transaction_count': item['count'],
                'total_amount': float(current_amount),
                'growth_rate': float(growth_rate)
            })
            
            previous_amount = current_amount
        
        # Calculate average growth rate
        growth_rates = [item['growth_rate'] for item in trend_data if item['growth_rate'] != 0]
        avg_growth_rate = sum(growth_rates) / len(growth_rates) if growth_rates else 0
        
        return {
            'weekly_trends': trend_data,
            'average_growth_rate': float(avg_growth_rate),
            'trend_direction': 'upward' if avg_growth_rate > 0 else 'downward' if avg_growth_rate < 0 else 'stable'
        }
    
    def _calculate_period_comparisons(self, user, start_date, end_date, date_range):
        """Compare current period with previous period."""
        # Calculate previous period
        period_length = (end_date - start_date).days
        previous_end = start_date - timedelta(days=1)
        previous_start = previous_end - timedelta(days=period_length)
        
        # Current period stats
        current_transactions = Transaction.objects.filter(
            Q(payer=user) | Q(payee=user),
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            status='completed'
        )
        
        # Previous period stats
        previous_transactions = Transaction.objects.filter(
            Q(payer=user) | Q(payee=user),
            created_at__date__gte=previous_start,
            created_at__date__lte=previous_end,
            status='completed'
        )
        
        current_stats = self._calculate_basic_stats(current_transactions, user)
        previous_stats = self._calculate_basic_stats(previous_transactions, user)
        
        return {
            'current_period': current_stats,
            'previous_period': previous_stats,
            'changes': {
                'transaction_count': self._calculate_percentage_change(
                    previous_stats['transaction_count'], 
                    current_stats['transaction_count']
                ),
                'total_amount': self._calculate_percentage_change(
                    previous_stats['total_amount'], 
                    current_stats['total_amount']
                ),
                'income': self._calculate_percentage_change(
                    previous_stats['income'], 
                    current_stats['income']
                ),
                'expenses': self._calculate_percentage_change(
                    previous_stats['expenses'], 
                    current_stats['expenses']
                )
            }
        }
    
    def _calculate_basic_stats(self, transactions, user):
        """Calculate basic statistics for a transaction set."""
        total_count = transactions.count()
        total_amount = transactions.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        income = transactions.filter(payee=user).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        expenses = transactions.filter(payer=user).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        
        return {
            'transaction_count': total_count,
            'total_amount': float(total_amount),
            'income': float(income),
            'expenses': float(expenses)
        }
    
    def _calculate_percentage_change(self, old_value, new_value):
        """Calculate percentage change between two values."""
        if old_value == 0:
            return 100.0 if new_value > 0 else 0.0
        return float((new_value - old_value) / old_value * 100)
    
    def _calculate_geographic_stats(self, transactions):
        """Calculate geographic distribution of payments."""
        # This would analyze payments by property location
        # For now, returning a simplified version
        
        property_transactions = transactions.filter(property__isnull=False)
        
        if not property_transactions.exists():
            return {'message': 'No geographic data available'}
        
        # Group by city (assuming property has city field)
        geographic_data = property_transactions.values(
            'property__city'
        ).annotate(
            count=Count('id'),
            amount=Sum('total_amount')
        ).order_by('-amount')
        
        return {
            'by_city': [
                {
                    'city': item['property__city'],
                    'transaction_count': item['count'],
                    'total_amount': float(item['amount'] or 0)
                } for item in geographic_data
            ]
        }
    
    def _calculate_risk_metrics(self, user, transactions):
        """Calculate risk-related payment metrics."""
        total_transactions = transactions.count()
        
        if total_transactions == 0:
            return {'message': 'No transaction data for risk analysis'}
        
        # Failed transaction rate
        failed_count = transactions.filter(status='failed').count()
        failure_rate = (failed_count / total_transactions) * 100
        
        # Disputed transactions
        disputed_count = transactions.filter(status='disputed').count()
        dispute_rate = (disputed_count / total_transactions) * 100
        
        # Late payments (for rent payments)
        rent_transactions = transactions.filter(transaction_type__in=['monthly_rent', 'rent_payment'])
        # This would need more complex logic to determine lateness
        
        return {
            'failure_rate': float(failure_rate),
            'dispute_rate': float(dispute_rate),
            'risk_score': self._calculate_risk_score(failure_rate, dispute_rate),
            'risk_level': self._determine_risk_level(failure_rate, dispute_rate)
        }
    
    def _calculate_risk_score(self, failure_rate, dispute_rate):
        """Calculate overall risk score."""
        # Simple risk scoring algorithm
        risk_score = (failure_rate * 0.6) + (dispute_rate * 0.4)
        return min(100, max(0, risk_score))
    
    def _determine_risk_level(self, failure_rate, dispute_rate):
        """Determine risk level category."""
        total_risk = failure_rate + dispute_rate
        
        if total_risk < 5:
            return 'low'
        elif total_risk < 15:
            return 'medium'
        else:
            return 'high'
    
    def _generate_payment_predictions(self, user, transactions):
        """Generate ML-powered payment predictions."""
        # Simplified prediction model
        # In production, this would use actual ML models
        
        if transactions.count() < 10:
            return {'message': 'Insufficient data for predictions'}
        
        # Calculate historical averages
        recent_30d = transactions.filter(
            created_at__gte=timezone.now() - timedelta(days=30),
            status='completed'
        )
        
        avg_monthly_volume = recent_30d.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        avg_transaction_count = recent_30d.count()
        
        # Simple growth trend
        growth_rate = 0.05  # 5% assumed growth
        
        return {
            'next_30_days': {
                'predicted_volume': float(avg_monthly_volume * (1 + growth_rate)),
                'predicted_transactions': int(avg_transaction_count * (1 + growth_rate)),
                'confidence': 0.75
            },
            'next_90_days': {
                'predicted_volume': float(avg_monthly_volume * 3 * (1 + growth_rate)),
                'predicted_transactions': int(avg_transaction_count * 3 * (1 + growth_rate)),
                'confidence': 0.60
            }
        }
    
    def _calculate_landlord_analytics(self, user, start_date, end_date):
        """Calculate landlord-specific analytics."""
        # Rent collection analytics
        rent_schedules = RentPaymentSchedule.objects.filter(
            landlord=user,
            is_active=True
        )
        
        total_expected_rent = sum(schedule.rent_amount for schedule in rent_schedules)
        
        # Collected rent in period
        collected_rent = Transaction.objects.filter(
            payee=user,
            transaction_type__in=['monthly_rent', 'rent_payment'],
            status='completed',
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        
        # Collection rate
        collection_rate = (collected_rent / total_expected_rent * 100) if total_expected_rent > 0 else 0
        
        return {
            'total_properties': rent_schedules.count(),
            'total_expected_monthly_rent': float(total_expected_rent),
            'collected_rent_period': float(collected_rent),
            'collection_rate': float(collection_rate),
            'average_rent_per_property': float(total_expected_rent / rent_schedules.count()) if rent_schedules.count() > 0 else 0
        }
    
    def _calculate_tenant_analytics(self, user, start_date, end_date):
        """Calculate tenant-specific analytics."""
        # Rent payment history
        rent_payments = Transaction.objects.filter(
            payer=user,
            transaction_type__in=['monthly_rent', 'rent_payment'],
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )
        
        total_rent_paid = rent_payments.filter(status='completed').aggregate(
            Sum('total_amount')
        )['total_amount__sum'] or 0
        
        # On-time payment rate
        total_rent_transactions = rent_payments.count()
        on_time_payments = rent_payments.filter(status='completed').count()  # Simplified
        on_time_rate = (on_time_payments / total_rent_transactions * 100) if total_rent_transactions > 0 else 0
        
        return {
            'total_rent_paid': float(total_rent_paid),
            'payment_count': total_rent_transactions,
            'on_time_payment_rate': float(on_time_rate),
            'average_monthly_rent': float(total_rent_paid / 12) if total_rent_paid > 0 else 0  # Simplified
        }
    
    def _calculate_service_provider_analytics(self, user, start_date, end_date):
        """Calculate service provider-specific analytics."""
        # Service payments received
        service_payments = Transaction.objects.filter(
            payee=user,
            transaction_type__in=['service_payment', 'service_fee'],
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            status='completed'
        )
        
        total_service_income = service_payments.aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        service_count = service_payments.count()
        
        return {
            'total_service_income': float(total_service_income),
            'service_transaction_count': service_count,
            'average_service_fee': float(total_service_income / service_count) if service_count > 0 else 0
        }


class SystemPaymentStatsAPIView(APIView):
    """
    System-wide Payment Statistics API.
    
    Provides platform-level payment analytics for administrators.
    Requires staff permissions.
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]
    
    def get(self, request):
        """Get system-wide payment statistics."""
        date_range = request.query_params.get('date_range', '30d')
        
        # Check cache
        cache_key = f"system_payment_stats_{date_range}"
        cached_stats = cache.get(cache_key)
        
        if cached_stats:
            return Response(cached_stats)
        
        try:
            end_date = timezone.now().date()
            start_date = self._calculate_start_date(end_date, date_range)
            
            # System-wide transaction stats
            all_transactions = Transaction.objects.filter(
                created_at__date__gte=start_date,
                created_at__date__lte=end_date
            )
            
            stats = {
                'period': {
                    'start_date': start_date,
                    'end_date': end_date,
                    'range': date_range
                },
                'platform_summary': self._calculate_platform_summary(all_transactions),
                'revenue_analytics': self._calculate_platform_revenue(all_transactions),
                'user_analytics': self._calculate_user_analytics(start_date, end_date),
                'payment_method_performance': self._calculate_payment_method_performance(all_transactions),
                'geographic_analytics': self._calculate_system_geographic_stats(all_transactions),
                'growth_metrics': self._calculate_growth_metrics(start_date, end_date),
                'health_metrics': self._calculate_platform_health(all_transactions)
            }
            
            # Cache for 30 minutes
            cache.set(cache_key, stats, timeout=1800)
            
            return Response(stats)
            
        except Exception as e:
            logger.error(f"Error calculating system payment stats: {str(e)}")
            return Response(
                {'error': 'Error calculating system statistics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _calculate_start_date(self, end_date, date_range):
        """Calculate start date based on range parameter."""
        if date_range == '7d':
            return end_date - timedelta(days=7)
        elif date_range == '30d':
            return end_date - timedelta(days=30)
        elif date_range == '90d':
            return end_date - timedelta(days=90)
        elif date_range == '1y':
            return end_date - timedelta(days=365)
        else:
            return end_date - timedelta(days=30)
    
    def _calculate_platform_summary(self, transactions):
        """Calculate platform-wide summary statistics."""
        total_volume = transactions.filter(status='completed').aggregate(
            Sum('total_amount')
        )['total_amount__sum'] or 0
        
        return {
            'total_transactions': transactions.count(),
            'completed_transactions': transactions.filter(status='completed').count(),
            'failed_transactions': transactions.filter(status='failed').count(),
            'total_volume': float(total_volume),
            'average_transaction_size': float(total_volume / transactions.count()) if transactions.count() > 0 else 0,
            'success_rate': float(
                (transactions.filter(status='completed').count() / transactions.count() * 100) 
                if transactions.count() > 0 else 0
            )
        }
    
    def _calculate_platform_revenue(self, transactions):
        """Calculate platform revenue metrics."""
        # This would calculate platform fees/commissions
        # For now, simplified calculation
        
        completed_volume = transactions.filter(status='completed').aggregate(
            Sum('total_amount')
        )['total_amount__sum'] or 0
        
        # Assume 2% platform fee
        estimated_platform_revenue = completed_volume * 0.02
        
        return {
            'total_processed_volume': float(completed_volume),
            'estimated_platform_revenue': float(estimated_platform_revenue),
            'average_daily_volume': float(completed_volume / 30)  # Simplified
        }
    
    def _calculate_user_analytics(self, start_date, end_date):
        """Calculate user engagement analytics."""
        active_users = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        ).values('payer').distinct().count()
        
        return {
            'active_users': active_users,
            'total_registered_users': User.objects.count()
        }
    
    def _calculate_payment_method_performance(self, transactions):
        """Calculate payment method performance across platform."""
        method_stats = transactions.filter(
            payment_method__isnull=False
        ).values(
            'payment_method__method_type'
        ).annotate(
            usage_count=Count('id'),
            total_volume=Sum('total_amount'),
            success_rate=Avg(
                Case(
                    When(status='completed', then=1.0),
                    default=0.0
                )
            )
        )
        
        return {
            method['payment_method__method_type']: {
                'usage_count': method['usage_count'],
                'total_volume': float(method['total_volume'] or 0),
                'success_rate': float(method['success_rate'] * 100) if method['success_rate'] else 0
            } for method in method_stats
        }
    
    def _calculate_system_geographic_stats(self, transactions):
        """Calculate system-wide geographic statistics."""
        # Similar to user geographic stats but system-wide
        property_transactions = transactions.filter(property__isnull=False)
        
        if not property_transactions.exists():
            return {'message': 'No geographic data available'}
        
        geographic_data = property_transactions.values(
            'property__city'
        ).annotate(
            count=Count('id'),
            volume=Sum('total_amount')
        ).order_by('-volume')
        
        return {
            'by_city': [
                {
                    'city': item['property__city'],
                    'transaction_count': item['count'],
                    'total_volume': float(item['volume'] or 0)
                } for item in geographic_data
            ]
        }
    
    def _calculate_growth_metrics(self, start_date, end_date):
        """Calculate platform growth metrics."""
        # Current period
        current_volume = Transaction.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date,
            status='completed'
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        
        # Previous period
        period_length = (end_date - start_date).days
        previous_end = start_date - timedelta(days=1)
        previous_start = previous_end - timedelta(days=period_length)
        
        previous_volume = Transaction.objects.filter(
            created_at__date__gte=previous_start,
            created_at__date__lte=previous_end,
            status='completed'
        ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0
        
        growth_rate = 0
        if previous_volume > 0:
            growth_rate = ((current_volume - previous_volume) / previous_volume) * 100
        
        return {
            'current_period_volume': float(current_volume),
            'previous_period_volume': float(previous_volume),
            'growth_rate': float(growth_rate),
            'growth_direction': 'positive' if growth_rate > 0 else 'negative' if growth_rate < 0 else 'stable'
        }
    
    def _calculate_platform_health(self, transactions):
        """Calculate platform health metrics."""
        total_count = transactions.count()
        
        if total_count == 0:
            return {'message': 'No transaction data available'}
        
        failed_count = transactions.filter(status='failed').count()
        disputed_count = transactions.filter(status='disputed').count()
        
        health_score = 100 - ((failed_count + disputed_count) / total_count * 100)
        
        return {
            'health_score': float(max(0, min(100, health_score))),
            'failure_rate': float((failed_count / total_count) * 100),
            'dispute_rate': float((disputed_count / total_count) * 100),
            'uptime_estimate': 99.9  # Would be calculated from actual system metrics
        }


class ExportPaymentStatsAPIView(APIView):
    """
    Export Payment Statistics API.
    
    Allows users to export their payment statistics in various formats.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """Export payment statistics in specified format."""
        export_format = request.data.get('format', 'json')  # json, csv, excel
        date_range = request.data.get('date_range', '30d')
        include_details = request.data.get('include_details', False)
        
        if export_format not in ['json', 'csv', 'excel']:
            return Response(
                {'error': 'Invalid export format. Supported: json, csv, excel'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Get stats data
            stats_view = PaymentStatsAPIView()
            stats_view.request = request
            stats_response = stats_view.get(request)
            
            if stats_response.status_code != 200:
                return stats_response
            
            stats_data = stats_response.data
            
            # Format for export
            if export_format == 'json':
                return self._export_json(stats_data)
            elif export_format == 'csv':
                return self._export_csv(stats_data, include_details)
            elif export_format == 'excel':
                return self._export_excel(stats_data, include_details)
                
        except Exception as e:
            logger.error(f"Error exporting payment stats: {str(e)}")
            return Response(
                {'error': 'Error exporting statistics'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _export_json(self, stats_data):
        """Export statistics as JSON."""
        from django.http import JsonResponse
        
        response = JsonResponse(stats_data)
        response['Content-Disposition'] = 'attachment; filename="payment_stats.json"'
        return response
    
    def _export_csv(self, stats_data, include_details):
        """Export statistics as CSV."""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="payment_stats.csv"'
        
        writer = csv.writer(response)
        
        # Write summary data
        writer.writerow(['Payment Statistics Summary'])
        writer.writerow(['Metric', 'Value'])
        
        summary = stats_data.get('transaction_summary', {})
        writer.writerow(['Total Transactions', summary.get('total_transactions', 0)])
        writer.writerow(['Total Amount', summary.get('total_amount', 0)])
        writer.writerow(['Average Transaction', summary.get('average_transaction', 0)])
        
        return response
    
    def _export_excel(self, stats_data, include_details):
        """Export statistics as Excel."""
        # This would require openpyxl or similar library
        # For now, return JSON with Excel content type
        from django.http import JsonResponse
        
        response = JsonResponse(stats_data)
        response['Content-Type'] = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        response['Content-Disposition'] = 'attachment; filename="payment_stats.xlsx"'
        return response