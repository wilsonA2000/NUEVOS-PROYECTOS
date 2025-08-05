"""
Vistas para el dashboard de VeriHome.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import timedelta, datetime
from properties.models import Property
from contracts.models import Contract
from payments.models import Transaction
from ratings.models import Rating
from users.models import User
from django.contrib.auth import get_user_model

User = get_user_model()


class DashboardStatsView(APIView):
    """Vista para obtener estadísticas del dashboard."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtener estadísticas según el tipo de usuario y período."""
        user = request.user
        period = getattr(request, 'query_params', request.GET).get('period', 'month')
        
        # Calcular fechas según el período
        end_date = timezone.now()
        if period == 'week':
            start_date = end_date - timedelta(days=7)
            previous_start = start_date - timedelta(days=7)
        elif period == 'year':
            start_date = end_date - timedelta(days=365)
            previous_start = start_date - timedelta(days=365)
        else:  # month (default)
            start_date = end_date - timedelta(days=30)
            previous_start = start_date - timedelta(days=30)
        
        # Obtener estadísticas según el tipo de usuario
        if user.user_type == 'landlord':
            stats = self.get_landlord_stats(user, start_date, end_date, previous_start)
        elif user.user_type == 'tenant':
            stats = self.get_tenant_stats(user, start_date, end_date, previous_start)
        elif user.user_type == 'service_provider':
            stats = self.get_service_provider_stats(user, start_date, end_date, previous_start)
        else:
            stats = self.get_general_stats(start_date, end_date, previous_start)
        
        # Agregar actividades recientes
        stats['activities'] = self.get_recent_activities(user, limit=10)
        
        return Response(stats)
    
    def calculate_trend(self, current, previous):
        """Calcular tendencia porcentual."""
        if previous == 0:
            return 100 if current > 0 else 0
        return round(((current - previous) / previous) * 100, 1)
    
    def get_landlord_stats(self, user, start_date, end_date, previous_start):
        """Estadísticas para arrendadores."""
        # Propiedades
        properties = Property.objects.filter(landlord=user)
        total_properties = properties.count()
        occupied_properties = properties.filter(status='rented').count()
        available_properties = properties.filter(status='available').count()
        maintenance_properties = properties.filter(status='maintenance').count()
        
        # Propiedades anteriores para tendencia
        new_properties = properties.filter(created_at__gte=start_date).count()
        previous_new = properties.filter(
            created_at__gte=previous_start,
            created_at__lt=start_date
        ).count()
        
        # Finanzas
        payments = Transaction.objects.filter(
            property__landlord=user,
            status='completed',
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        monthly_income = payments.aggregate(total=Sum('amount'))['total'] or 0
        
        # Ingresos anteriores para tendencia
        previous_income = Transaction.objects.filter(
            property__landlord=user,
            status='completed',
            created_at__gte=previous_start,
            created_at__lt=start_date
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Gastos (por ahora simulados)
        monthly_expenses = monthly_income * 0.3  # 30% de gastos estimados
        pending_payments = Transaction.objects.filter(
            property__landlord=user,
            status='pending'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Contratos
        contracts = Contract.objects.filter(property__landlord=user)
        active_contracts = contracts.filter(status='active').count()
        expiring_soon = contracts.filter(
            status='active',
            end_date__lte=end_date + timedelta(days=30),
            end_date__gte=end_date
        ).count()
        pending_contracts = contracts.filter(status='pending').count()
        
        # Calificaciones
        ratings = Rating.objects.filter(reviewee=user)
        avg_rating = ratings.aggregate(avg=Avg('overall_rating'))['avg'] or 0
        total_ratings = ratings.count()
        rating_distribution = {}
        for i in range(1, 6):
            rating_distribution[i] = ratings.filter(overall_rating=i).count()
        
        return {
            'properties': {
                'total': total_properties,
                'occupied': occupied_properties,
                'available': available_properties,
                'maintenance': maintenance_properties,
                'trend': self.calculate_trend(new_properties, previous_new)
            },
            'finances': {
                'monthlyIncome': float(monthly_income),
                'monthlyExpenses': float(monthly_expenses),
                'pendingPayments': float(pending_payments),
                'profit': float(monthly_income - monthly_expenses),
                'trend': self.calculate_trend(monthly_income, previous_income)
            },
            'contracts': {
                'active': active_contracts,
                'expiringSoon': expiring_soon,
                'pending': pending_contracts,
                'total': contracts.count(),
                'trend': 0  # TODO: Calcular tendencia real
            },
            'users': {
                'tenants': User.objects.filter(user_type='tenant').count(),
                'landlords': User.objects.filter(user_type='landlord').count(),
                'serviceProviders': User.objects.filter(user_type='service_provider').count(),
                'newThisMonth': User.objects.filter(date_joined__gte=start_date).count(),
                'trend': 0  # TODO: Calcular tendencia real
            },
            'ratings': {
                'average': round(avg_rating, 1),
                'total': total_ratings,
                'distribution': rating_distribution
            }
        }
    
    def get_tenant_stats(self, user, start_date, end_date, previous_start):
        """Estadísticas para inquilinos."""
        # Contratos del inquilino
        contracts = Contract.objects.filter(secondary_party=user)
        active_contracts = contracts.filter(status='active').count()
        
        # Pagos realizados
        payments = Transaction.objects.filter(
            payer=user,
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        total_payments = payments.aggregate(total=Sum('amount'))['total'] or 0
        pending_payments = Transaction.objects.filter(
            payer=user,
            status='pending'
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Propiedades vistas/favoritas (simulado)
        viewed_properties = 15  # TODO: Implementar tracking real
        favorite_properties = 3  # TODO: Implementar favoritos
        
        return {
            'properties': {
                'viewed': viewed_properties,
                'favorites': favorite_properties,
                'available': Property.objects.filter(status='available').count(),
                'total': Property.objects.count(),
                'trend': 0
            },
            'finances': {
                'monthlyPayments': float(total_payments),
                'pendingPayments': float(pending_payments),
                'totalPaid': float(Transaction.objects.filter(payer=user, status='completed').aggregate(total=Sum('amount'))['total'] or 0),
                'nextPayment': float(pending_payments),
                'trend': 0
            },
            'contracts': {
                'active': active_contracts,
                'completed': contracts.filter(status='completed').count(),
                'total': contracts.count(),
                'currentProperty': contracts.filter(status='active').first(),
                'trend': 0
            },
            'services': {
                'requested': 0,  # TODO: Implementar servicios
                'completed': 0,
                'pending': 0,
                'total': 0,
                'trend': 0
            },
            'ratings': {
                'given': Rating.objects.filter(reviewer=user).count(),
                'properties_rated': Rating.objects.filter(reviewer=user, content_type__model='property').count(),
                'average_given': Rating.objects.filter(reviewer=user).aggregate(avg=Avg('overall_rating'))['avg'] or 0
            }
        }
    
    def get_service_provider_stats(self, user, start_date, end_date, previous_start):
        """Estadísticas para proveedores de servicios."""
        # TODO: Implementar cuando se cree el modelo de servicios
        return {
            'services': {
                'requested': 12,
                'completed': 8,
                'pending': 4,
                'cancelled': 1,
                'trend': 15.0
            },
            'finances': {
                'monthlyIncome': 45000.0,
                'pendingPayments': 8000.0,
                'completedPayments': 37000.0,
                'averagePerService': 5625.0,
                'trend': 12.5
            },
            'ratings': {
                'average': 4.7,
                'total': 28,
                'distribution': {5: 20, 4: 6, 3: 2, 2: 0, 1: 0}
            },
            'clients': {
                'total': 25,
                'new': 5,
                'recurring': 20,
                'satisfaction': 94,
                'trend': 8.0
            }
        }
    
    def get_general_stats(self, start_date, end_date, previous_start):
        """Estadísticas generales para administradores."""
        return {
            'overview': {
                'totalUsers': User.objects.count(),
                'totalProperties': Property.objects.count(),
                'totalContracts': Contract.objects.count(),
                'totalRevenue': float(Transaction.objects.filter(status='completed').aggregate(total=Sum('amount'))['total'] or 0)
            }
        }
    
    def get_recent_activities(self, user, limit=10):
        """Obtener actividades recientes relevantes para el usuario."""
        activities = []
        
        # Pagos recientes
        recent_payments = Transaction.objects.filter(
            Q(payer=user) | Q(property__landlord=user)
        ).order_by('-created_at')[:5]
        
        for payment in recent_payments:
            activities.append({
                'id': str(payment.id),
                'type': 'payment',
                'title': 'Pago recibido' if payment.property.landlord == user else 'Pago realizado',
                'description': f'{payment.description} - {payment.property.title}',
                'timestamp': payment.created_at.isoformat(),
                'status': 'success' if payment.status == 'completed' else 'warning',
                'user': {
                    'name': payment.payer.get_full_name() if payment.property.landlord == user else payment.property.landlord.get_full_name()
                }
            })
        
        # Contratos recientes
        recent_contracts = Contract.objects.filter(
            Q(secondary_party=user) | Q(property__landlord=user)
        ).order_by('-created_at')[:3]
        
        for contract in recent_contracts:
            activities.append({
                'id': str(contract.id),
                'type': 'contract',
                'title': 'Nuevo contrato' if contract.status == 'pending' else 'Contrato actualizado',
                'description': f'Contrato para {contract.property.title}',
                'timestamp': contract.created_at.isoformat(),
                'status': 'info' if contract.status == 'active' else 'warning'
            })
        
        # Ordenar por timestamp y limitar
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        return activities[:limit]


class DashboardChartsView(APIView):
    """Vista para obtener datos de gráficos del dashboard."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Obtener datos para los gráficos."""
        chart_type = getattr(request, 'query_params', request.GET).get('type', 'income')
        period = getattr(request, 'query_params', request.GET).get('period', '30')
        
        if chart_type == 'income':
            return Response(self.get_income_chart_data(request.user, int(period)))
        elif chart_type == 'occupancy':
            return Response(self.get_occupancy_chart_data(request.user))
        elif chart_type == 'ratings':
            return Response(self.get_ratings_chart_data(request.user))
        else:
            return Response({'error': 'Tipo de gráfico no válido'}, status=400)
    
    def get_income_chart_data(self, user, days=30):
        """Datos para el gráfico de ingresos."""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        data = []
        labels = []
        
        for i in range(days):
            date = start_date + timedelta(days=i)
            labels.append(date.strftime('%d/%m'))
            
            # Ingresos del día
            daily_income = Transaction.objects.filter(
                property__landlord=user,
                status='completed',
                created_at__date=date
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            data.append(float(daily_income))
        
        return {
            'labels': labels,
            'datasets': [{
                'label': 'Ingresos',
                'data': data
            }]
        }
    
    def get_occupancy_chart_data(self, user):
        """Datos para el gráfico de ocupación."""
        properties = Property.objects.filter(landlord=user)
        
        return {
            'labels': ['Ocupadas', 'Disponibles', 'Mantenimiento'],
            'datasets': [{
                'data': [
                    properties.filter(status='rented').count(),
                    properties.filter(status='available').count(),
                    properties.filter(status='maintenance').count()
                ]
            }]
        }
    
    def get_ratings_chart_data(self, user):
        """Datos para el gráfico de calificaciones."""
        ratings = Rating.objects.filter(reviewee=user)
        
        data = []
        for i in range(5, 0, -1):
            data.append(ratings.filter(overall_rating=i).count())
        
        return {
            'labels': ['5★', '4★', '3★', '2★', '1★'],
            'datasets': [{
                'label': 'Calificaciones',
                'data': data
            }]
        }