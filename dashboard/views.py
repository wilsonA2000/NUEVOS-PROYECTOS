"""
Vistas para el dashboard de VeriHome.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from datetime import timedelta, datetime
from properties.models import Property, PropertyFavorite, PropertyView
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
                'trend': self.calculate_trend(
                    contracts.filter(created_at__gte=start_date).count(),
                    contracts.filter(created_at__gte=previous_start, created_at__lt=start_date).count()
                )
            },
            'users': {
                'tenants': User.objects.filter(user_type='tenant').count(),
                'landlords': User.objects.filter(user_type='landlord').count(),
                'serviceProviders': User.objects.filter(user_type='service_provider').count(),
                'newThisMonth': User.objects.filter(date_joined__gte=start_date).count(),
                'trend': self.calculate_trend(
                    User.objects.filter(date_joined__gte=start_date).count(),
                    User.objects.filter(date_joined__gte=previous_start, date_joined__lt=start_date).count()
                )
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
        previous_payments = Transaction.objects.filter(
            payer=user,
            created_at__gte=previous_start,
            created_at__lt=start_date
        ).aggregate(total=Sum('amount'))['total'] or 0
        pending_payments = Transaction.objects.filter(
            payer=user,
            status='pending'
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Propiedades vistas/favoritas (datos reales)
        viewed_properties = PropertyView.objects.filter(user=user).values('property').distinct().count()
        previous_viewed = PropertyView.objects.filter(
            user=user,
            viewed_at__gte=previous_start,
            viewed_at__lt=start_date
        ).values('property').distinct().count()
        current_viewed = PropertyView.objects.filter(
            user=user,
            viewed_at__gte=start_date
        ).values('property').distinct().count()
        favorite_properties = PropertyFavorite.objects.filter(user=user).count()

        # Servicios solicitados por el inquilino (requests app)
        try:
            from requests.models import ServiceRequest as RequestsServiceRequest
            tenant_services = RequestsServiceRequest.objects.filter(requester=user)
            services_requested = tenant_services.filter(created_at__gte=start_date).count()
            services_completed = tenant_services.filter(status='completed').count()
            services_pending = tenant_services.filter(status__in=['pending', 'in_progress']).count()
            previous_services = tenant_services.filter(
                created_at__gte=previous_start, created_at__lt=start_date
            ).count()
        except Exception:
            services_requested = 0
            services_completed = 0
            services_pending = 0
            previous_services = 0

        return {
            'properties': {
                'viewed': viewed_properties,
                'favorites': favorite_properties,
                'available': Property.objects.filter(status='available').count(),
                'total': Property.objects.count(),
                'trend': self.calculate_trend(current_viewed, previous_viewed)
            },
            'finances': {
                'monthlyPayments': float(total_payments),
                'pendingPayments': float(pending_payments),
                'totalPaid': float(Transaction.objects.filter(payer=user, status='completed').aggregate(total=Sum('amount'))['total'] or 0),
                'nextPayment': float(pending_payments),
                'trend': self.calculate_trend(total_payments, previous_payments)
            },
            'contracts': {
                'active': active_contracts,
                'completed': contracts.filter(status='completed').count(),
                'total': contracts.count(),
                'currentProperty': contracts.filter(status='active').first(),
                'trend': self.calculate_trend(
                    contracts.filter(created_at__gte=start_date).count(),
                    contracts.filter(created_at__gte=previous_start, created_at__lt=start_date).count()
                )
            },
            'services': {
                'requested': services_requested,
                'completed': services_completed,
                'pending': services_pending,
                'total': services_requested + services_completed + services_pending,
                'trend': self.calculate_trend(services_requested, previous_services)
            },
            'ratings': {
                'given': Rating.objects.filter(reviewer=user).count(),
                'properties_rated': Rating.objects.filter(reviewer=user, property__isnull=False).count(),
                'average_given': Rating.objects.filter(reviewer=user).aggregate(avg=Avg('overall_rating'))['avg'] or 0
            }
        }
    
    def get_service_provider_stats(self, user, start_date, end_date, previous_start):
        """Estadísticas para proveedores de servicios."""
        # Calificaciones reales del proveedor
        ratings = Rating.objects.filter(reviewee=user)
        avg_rating = ratings.aggregate(avg=Avg('overall_rating'))['avg'] or 0
        total_ratings = ratings.count()
        rating_distribution = {}
        for i in range(1, 6):
            rating_distribution[i] = ratings.filter(overall_rating=i).count()

        # Pagos reales
        payments_received = Transaction.objects.filter(
            property__landlord=user,
            status='completed',
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        monthly_income = payments_received.aggregate(total=Sum('amount'))['total'] or 0
        previous_income = Transaction.objects.filter(
            property__landlord=user,
            status='completed',
            created_at__gte=previous_start,
            created_at__lt=start_date
        ).aggregate(total=Sum('amount'))['total'] or 0
        pending_payments = Transaction.objects.filter(
            property__landlord=user,
            status='pending'
        ).aggregate(total=Sum('amount'))['total'] or 0

        # Service stats reales desde services.ServiceRequest
        # Service model uses contact_email, not a FK to User, so filter by email
        try:
            from services.models import ServiceRequest, Service
            user_services = Service.objects.filter(contact_email=user.email)
            provider_requests = ServiceRequest.objects.filter(service__in=user_services)
            current_requested = provider_requests.filter(created_at__gte=start_date).count()
            previous_requested = provider_requests.filter(
                created_at__gte=previous_start, created_at__lt=start_date
            ).count()
            completed_services = provider_requests.filter(status='completed').count()
            pending_services = provider_requests.filter(status__in=['pending', 'contacted', 'in_progress']).count()
            cancelled_services = provider_requests.filter(status='cancelled').count()
        except Exception:
            current_requested = 0
            previous_requested = 0
            completed_services = 0
            pending_services = 0
            cancelled_services = 0

        # Client stats reales
        try:
            from services.models import ServiceRequest, Service
            user_services = Service.objects.filter(contact_email=user.email)
            provider_requests_all = ServiceRequest.objects.filter(service__in=user_services)
            total_clients = provider_requests_all.values('requester_email').distinct().count()
            new_clients = provider_requests_all.filter(
                created_at__gte=start_date
            ).values('requester_email').distinct().count()
            previous_clients = provider_requests_all.filter(
                created_at__gte=previous_start,
                created_at__lt=start_date
            ).values('requester_email').distinct().count()
            recurring_clients = provider_requests_all.values('requester_email').annotate(
                count=Count('id')
            ).filter(count__gt=1).count()
        except Exception:
            total_clients = 0
            new_clients = 0
            previous_clients = 0
            recurring_clients = 0

        return {
            'services': {
                'requested': current_requested,
                'completed': completed_services,
                'pending': pending_services,
                'cancelled': cancelled_services,
                'trend': self.calculate_trend(current_requested, previous_requested)
            },
            'finances': {
                'monthlyIncome': float(monthly_income),
                'pendingPayments': float(pending_payments),
                'completedPayments': float(monthly_income),
                'averagePerService': float(monthly_income / max(completed_services, 1)),
                'trend': self.calculate_trend(monthly_income, previous_income)
            },
            'ratings': {
                'average': round(avg_rating, 1),
                'total': total_ratings,
                'distribution': rating_distribution
            },
            'clients': {
                'total': total_clients,
                'new': new_clients,
                'recurring': recurring_clients,
                'satisfaction': round(avg_rating * 20, 1),
                'trend': self.calculate_trend(new_clients, previous_clients)
            }
        }
    
    def get_general_stats(self, start_date, end_date, previous_start):
        """Estadísticas generales para administradores."""
        total_users = User.objects.count()
        new_users = User.objects.filter(date_joined__gte=start_date).count()
        previous_new_users = User.objects.filter(
            date_joined__gte=previous_start, date_joined__lt=start_date
        ).count()

        total_properties = Property.objects.count()
        new_properties = Property.objects.filter(created_at__gte=start_date).count()
        previous_new_properties = Property.objects.filter(
            created_at__gte=previous_start, created_at__lt=start_date
        ).count()

        total_contracts = Contract.objects.count()
        new_contracts = Contract.objects.filter(created_at__gte=start_date).count()
        previous_new_contracts = Contract.objects.filter(
            created_at__gte=previous_start, created_at__lt=start_date
        ).count()

        total_revenue = float(Transaction.objects.filter(
            status='completed'
        ).aggregate(total=Sum('amount'))['total'] or 0)
        current_revenue = float(Transaction.objects.filter(
            status='completed', created_at__gte=start_date
        ).aggregate(total=Sum('amount'))['total'] or 0)
        previous_revenue = float(Transaction.objects.filter(
            status='completed',
            created_at__gte=previous_start,
            created_at__lt=start_date
        ).aggregate(total=Sum('amount'))['total'] or 0)

        return {
            'overview': {
                'totalUsers': total_users,
                'totalProperties': total_properties,
                'totalContracts': total_contracts,
                'totalRevenue': total_revenue,
                'activeContracts': Contract.objects.filter(status='active').count(),
                'occupiedProperties': Property.objects.filter(status='rented').count(),
            },
            'users': {
                'total': total_users,
                'tenants': User.objects.filter(user_type='tenant').count(),
                'landlords': User.objects.filter(user_type='landlord').count(),
                'serviceProviders': User.objects.filter(user_type='service_provider').count(),
                'newThisMonth': new_users,
                'trend': self.calculate_trend(new_users, previous_new_users)
            },
            'properties': {
                'total': total_properties,
                'available': Property.objects.filter(status='available').count(),
                'occupied': Property.objects.filter(status='rented').count(),
                'maintenance': Property.objects.filter(status='maintenance').count(),
                'newThisMonth': new_properties,
                'trend': self.calculate_trend(new_properties, previous_new_properties)
            },
            'contracts': {
                'total': total_contracts,
                'active': Contract.objects.filter(status='active').count(),
                'pending': Contract.objects.filter(status='pending').count(),
                'completed': Contract.objects.filter(status='completed').count(),
                'newThisMonth': new_contracts,
                'trend': self.calculate_trend(new_contracts, previous_new_contracts)
            },
            'finances': {
                'totalRevenue': total_revenue,
                'currentPeriod': current_revenue,
                'previousPeriod': previous_revenue,
                'pendingPayments': float(Transaction.objects.filter(
                    status='pending'
                ).aggregate(total=Sum('amount'))['total'] or 0),
                'trend': self.calculate_trend(current_revenue, previous_revenue)
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


class DashboardExportView(APIView):
    """Vista para exportar datos del dashboard."""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Exporta los datos del dashboard en formato CSV."""
        import csv
        from django.http import HttpResponse
        
        user = request.user
        period = request.query_params.get('period', 'month')
        
        # Calcular fechas según el período
        end_date = timezone.now()
        if period == 'week':
            start_date = end_date - timedelta(days=7)
        elif period == 'year':
            start_date = end_date - timedelta(days=365)
        else:  # month (default)
            start_date = end_date - timedelta(days=30)
        
        # Crear respuesta HTTP con CSV
        response = HttpResponse(
            content_type='text/csv',
            headers={'Content-Disposition': f'attachment; filename="dashboard-export-{period}.csv"'},
        )
        
        writer = csv.writer(response)
        
        if user.user_type == 'landlord':
            self._export_landlord_data(writer, user, start_date, end_date)
        elif user.user_type == 'tenant':
            self._export_tenant_data(writer, user, start_date, end_date)
        elif user.user_type == 'service_provider':
            self._export_service_provider_data(writer, user, start_date, end_date)
        else:
            self._export_general_data(writer, start_date, end_date)
        
        return response
    
    def _export_landlord_data(self, writer, user, start_date, end_date):
        """Exporta datos específicos para arrendadores."""
        # Encabezados
        writer.writerow([
            'Fecha', 'Tipo', 'Descripción', 'Propiedad', 'Monto', 'Estado'
        ])
        
        # Transacciones
        transactions = Transaction.objects.filter(
            property__landlord=user,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).order_by('-created_at')
        
        for transaction in transactions:
            writer.writerow([
                transaction.created_at.strftime('%Y-%m-%d %H:%M'),
                'Pago',
                transaction.description,
                transaction.property.title,
                float(transaction.amount),
                transaction.status
            ])
        
        # Contratos
        contracts = Contract.objects.filter(
            property__landlord=user,
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        for contract in contracts:
            writer.writerow([
                contract.created_at.strftime('%Y-%m-%d %H:%M'),
                'Contrato',
                f'Contrato con {contract.secondary_party.get_full_name()}',
                contract.property.title,
                float(contract.property.rent_price) if contract.property.rent_price else 0,
                contract.status
            ])
    
    def _export_tenant_data(self, writer, user, start_date, end_date):
        """Exporta datos específicos para inquilinos."""
        writer.writerow([
            'Fecha', 'Tipo', 'Descripción', 'Propiedad', 'Monto', 'Estado'
        ])
        
        # Pagos realizados
        transactions = Transaction.objects.filter(
            payer=user,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).order_by('-created_at')
        
        for transaction in transactions:
            writer.writerow([
                transaction.created_at.strftime('%Y-%m-%d %H:%M'),
                'Pago Realizado',
                transaction.description,
                transaction.property.title if transaction.property else 'N/A',
                float(transaction.amount),
                transaction.status
            ])
        
        # Contratos
        contracts = Contract.objects.filter(
            secondary_party=user,
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        for contract in contracts:
            writer.writerow([
                contract.created_at.strftime('%Y-%m-%d %H:%M'),
                'Contrato',
                f'Contrato para {contract.property.title}',
                contract.property.title,
                float(contract.property.rent_price) if contract.property.rent_price else 0,
                contract.status
            ])
    
    def _export_service_provider_data(self, writer, user, start_date, end_date):
        """Exporta datos específicos para proveedores de servicios."""
        writer.writerow([
            'Fecha', 'Tipo', 'Descripción', 'Cliente', 'Presupuesto', 'Estado'
        ])

        # Solicitudes de servicio reales
        try:
            from services.models import ServiceRequest, Service
            user_services = Service.objects.filter(contact_email=user.email)
            service_requests = ServiceRequest.objects.filter(
                service__in=user_services,
                created_at__gte=start_date,
                created_at__lte=end_date
            ).select_related('service').order_by('-created_at')

            for sr in service_requests:
                writer.writerow([
                    sr.created_at.strftime('%Y-%m-%d %H:%M'),
                    'Solicitud de Servicio',
                    sr.message[:100] if sr.message else sr.service.name,
                    sr.requester_name,
                    sr.budget_range or 'N/A',
                    sr.get_status_display()
                ])
        except Exception:
            pass

        # Transacciones
        transactions = Transaction.objects.filter(
            property__landlord=user,
            created_at__gte=start_date,
            created_at__lte=end_date
        ).order_by('-created_at')

        for transaction in transactions:
            writer.writerow([
                transaction.created_at.strftime('%Y-%m-%d %H:%M'),
                'Pago Recibido',
                transaction.description,
                transaction.payer.get_full_name() if transaction.payer else 'N/A',
                float(transaction.amount),
                transaction.status
            ])
    
    def _export_general_data(self, writer, start_date, end_date):
        """Exporta datos generales para administradores."""
        writer.writerow([
            'Fecha', 'Tipo', 'Descripción', 'Usuario', 'Monto', 'Estado'
        ])
        
        # Todas las transacciones del período
        transactions = Transaction.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        ).order_by('-created_at')
        
        for transaction in transactions:
            writer.writerow([
                transaction.created_at.strftime('%Y-%m-%d %H:%M'),
                'Transacción',
                transaction.description,
                transaction.payer.get_full_name() if transaction.payer else 'N/A',
                float(transaction.amount),
                transaction.status
            ])