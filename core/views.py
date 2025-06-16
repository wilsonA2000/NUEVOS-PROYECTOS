"""
Vistas para la aplicación core de VeriHome.
Incluye la página principal y funcionalidades transversales.
"""

from django.shortcuts import render, redirect, get_object_or_404
from django.views.generic import TemplateView, ListView, DetailView, CreateView, UpdateView
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib import messages
from django.http import JsonResponse
from django.urls import reverse_lazy
from django.db.models import Count, Q, Sum, Avg
from django.utils import timezone
from datetime import timedelta
import django.db.models

from .models import (
    SiteConfiguration, Notification, ActivityLog, SystemAlert, 
    FAQ, SupportTicket, TicketResponse
)
from users.models import User
from properties.models import Property
from contracts.models import Contract
from messaging.models import MessageThread
from payments.models import Transaction


class HomeView(TemplateView):
    """Página principal de VeriHome."""
    template_name = 'core/home.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Obtener configuración del sitio
        context['site_config'] = SiteConfiguration.get_config()
        
        # Estadísticas generales para mostrar en el home
        context['stats'] = {
            'total_properties': Property.objects.filter(is_active=True).count(),
            'total_landlords': User.objects.filter(user_type='landlord', is_active=True).count(),
            'total_service_providers': User.objects.filter(user_type='service_provider', is_active=True).count(),
            'total_contracts': Contract.objects.filter(status='active').count(),
        }
        
        # Propiedades destacadas
        context['featured_properties'] = Property.objects.filter(
            is_featured=True, 
            is_active=True,
            status='available'
        ).select_related('landlord')[:6]
        
        # Testimonios y calificaciones altas (si el usuario está autenticado)
        if self.request.user.is_authenticated:
            from ratings.models import Rating
            context['recent_ratings'] = Rating.objects.filter(
                overall_rating__gte=8,
                is_public=True,
                moderation_status='approved'
            ).select_related('reviewer', 'reviewee')[:3]
        
        return context


class DashboardView(LoginRequiredMixin, TemplateView):
    """Dashboard personalizado según el tipo de usuario."""
    
    def get_template_names(self):
        user_type = self.request.user.user_type
        return [f'core/dashboard_{user_type}.html', 'core/dashboard_default.html']
    
    def dispatch(self, request, *args, **kwargs):
        # Redirección especial para prestadores de servicios
        if request.user.is_authenticated and request.user.user_type == 'service_provider':
            # Redirigir a página principal en lugar de lista de propiedades
            return super().dispatch(request, *args, **kwargs)
        return super().dispatch(request, *args, **kwargs)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        
        # Notificaciones no leídas
        context['unread_notifications'] = Notification.objects.filter(
            user=user, 
            is_read=False
        ).count()
        
        # Datos específicos según el tipo de usuario
        if user.user_type == 'landlord':
            context.update(self._get_landlord_context())
        elif user.user_type == 'tenant':
            context.update(self._get_tenant_context())
        elif user.user_type == 'service_provider':
            context.update(self._get_service_provider_context())
        
        # Mensajes no leídos
        from messaging.models import Message
        context['unread_messages'] = Message.objects.filter(
            recipient=user,
            is_read=False
        ).count()
        
        # Actividad reciente
        context['recent_activity'] = ActivityLog.objects.filter(
            user=user
        ).select_related('content_type')[:5]
        
        return context
    
    def _get_landlord_context(self):
        """Contexto específico para arrendadores."""
        user = self.request.user
        
        # Mis propiedades
        my_properties = Property.objects.filter(landlord=user)
        
        # Contratos activos
        active_contracts = Contract.objects.filter(
            primary_party=user,
            status='active'
        )
        
        # Pagos pendientes
        pending_payments = Transaction.objects.filter(
            payee=user,
            status='pending'
        )
        
        # Consultas recientes
        from properties.models import PropertyInquiry
        recent_inquiries = PropertyInquiry.objects.filter(
            property__landlord=user,
            status='new'
        )[:5]
        
        return {
            'my_properties_count': my_properties.count(),
            'available_properties': my_properties.filter(status='available').count(),
            'rented_properties': my_properties.filter(status='rented').count(),
            'active_contracts': active_contracts.count(),
            'pending_payments': pending_payments.count(),
            'recent_inquiries': recent_inquiries,
            'monthly_income': pending_payments.filter(
                transaction_type='rent_payment'
            ).aggregate(total=django.db.models.Sum('amount'))['total'] or 0,
        }
    
    def _get_tenant_context(self):
        """Contexto específico para arrendatarios."""
        user = self.request.user
        
        # Mis contratos
        my_contracts = Contract.objects.filter(
            secondary_party=user
        )
        
        # Pagos realizados
        my_payments = Transaction.objects.filter(
            payer=user
        )
        
        # Propiedades favoritas
        from properties.models import PropertyFavorite
        favorite_properties = PropertyFavorite.objects.filter(
            user=user
        ).count()
        
        # Próximos pagos
        upcoming_payments = Transaction.objects.filter(
            payer=user,
            status='pending',
            due_date__lte=timezone.now().date() + timedelta(days=7)
        )
        
        return {
            'active_contracts': my_contracts.filter(status='active').count(),
            'total_contracts': my_contracts.count(),
            'favorite_properties': favorite_properties,
            'upcoming_payments': upcoming_payments.count(),
            'monthly_rent': my_payments.filter(
                transaction_type='rent_payment',
                created_at__month=timezone.now().month
            ).aggregate(total=Sum('amount'))['total'] or 0,
        }
    
    def _get_service_provider_context(self):
        """Contexto específico para prestadores de servicios."""
        user = self.request.user
        
        # Mis servicios activos
        service_contracts = Contract.objects.filter(
            Q(primary_party=user) | Q(secondary_party=user),
            contract_type='service'
        )
        
        # Calificaciones recibidas
        from ratings.models import Rating
        my_ratings = Rating.objects.filter(
            reviewee=user,
            is_active=True
        )
        
        # Ingresos del mes
        monthly_income = Transaction.objects.filter(
            payee=user,
            status='completed',
            created_at__month=timezone.now().month
        ).aggregate(total=django.db.models.Sum('amount'))['total'] or 0
        
        # Portafolio
        from users.models import PortfolioItem
        portfolio_items = PortfolioItem.objects.filter(
            service_provider=user.service_provider_profile
        ).count() if hasattr(user, 'service_provider_profile') else 0
        
        return {
            'active_services': service_contracts.filter(status='active').count(),
            'total_services': service_contracts.count(),
            'average_rating': my_ratings.aggregate(
                avg=Avg('overall_rating')
            )['avg'] or 0,
            'total_ratings': my_ratings.count(),
            'monthly_income': monthly_income,
            'portfolio_items': portfolio_items,
        }


class NotificationListView(LoginRequiredMixin, ListView):
    """Lista de notificaciones del usuario."""
    model = Notification
    template_name = 'core/notifications.html'
    context_object_name = 'notifications'
    paginate_by = 20
    
    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).select_related('content_type').order_by('-created_at')


class MarkNotificationReadView(LoginRequiredMixin, TemplateView):
    """Marca una notificación como leída."""
    
    def post(self, request, pk):
        notification = get_object_or_404(
            Notification, 
            pk=pk, 
            user=request.user
        )
        notification.mark_as_read()
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True})
        
        return redirect('core:notifications')


class MarkAllNotificationsReadView(LoginRequiredMixin, TemplateView):
    """Marca todas las notificaciones como leídas."""
    
    def post(self, request):
        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        messages.success(request, 'Todas las notificaciones han sido marcadas como leídas.')
        
        if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
            return JsonResponse({'success': True})
        
        return redirect('core:notifications')


class AboutView(TemplateView):
    """Página sobre nosotros."""
    template_name = 'core/about.html'


class ContactView(TemplateView):
    """Página de contacto."""
    template_name = 'core/contact.html'


class FAQView(ListView):
    """Página de preguntas frecuentes."""
    model = FAQ
    template_name = 'core/faq.html'
    context_object_name = 'faqs'
    
    def get_queryset(self):
        return FAQ.objects.filter(is_published=True).order_by('category', 'order')
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Agrupar FAQs por categoría
        faqs_by_category = {}
        for faq in context['faqs']:
            category = faq.get_category_display()
            if category not in faqs_by_category:
                faqs_by_category[category] = []
            faqs_by_category[category].append(faq)
        
        context['faqs_by_category'] = faqs_by_category
        return context


class TermsView(TemplateView):
    """Términos y condiciones."""
    template_name = 'core/terms.html'


class PrivacyView(TemplateView):
    """Política de privacidad."""
    template_name = 'core/privacy.html'


class SupportView(LoginRequiredMixin, ListView):
    """Centro de soporte."""
    model = SupportTicket
    template_name = 'core/support.html'
    context_object_name = 'tickets'
    
    def get_queryset(self):
        return SupportTicket.objects.filter(
            created_by=self.request.user
        ).order_by('-created_at')


class CreateTicketView(LoginRequiredMixin, CreateView):
    """Crear nuevo ticket de soporte."""
    model = SupportTicket
    template_name = 'core/create_ticket.html'
    fields = ['subject', 'description', 'category', 'priority']
    success_url = reverse_lazy('core:support')
    
    def form_valid(self, form):
        form.instance.created_by = self.request.user
        messages.success(self.request, 'Tu ticket de soporte ha sido creado exitosamente.')
        return super().form_valid(form)


class TicketDetailView(LoginRequiredMixin, DetailView):
    """Detalle de ticket de soporte."""
    model = SupportTicket
    template_name = 'core/ticket_detail.html'
    context_object_name = 'ticket'
    
    def get_queryset(self):
        return SupportTicket.objects.filter(created_by=self.request.user)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context['responses'] = self.object.responses.order_by('created_at')
        return context


class GlobalSearchView(TemplateView):
    """Búsqueda global en la plataforma."""
    template_name = 'core/search_results.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        query = self.request.GET.get('q', '')
        
        if query:
            # Buscar en propiedades
            properties = Property.objects.filter(
                Q(title__icontains=query) |
                Q(description__icontains=query) |
                Q(address__icontains=query) |
                Q(city__icontains=query),
                is_active=True
            )[:10]
            
            # Buscar usuarios
            users = User.objects.filter(
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(email__icontains=query),
                is_active=True
            )[:10]
            
            context.update({
                'query': query,
                'properties': properties,
                'users': users,
            })
        
        return context


class AnalyticsView(LoginRequiredMixin, TemplateView):
    """Vista de analytics para usuarios premium."""
    template_name = 'core/analytics.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        user = self.request.user
        
        # Analytics básicos
        context['analytics'] = {
            'profile_views': ActivityLog.objects.filter(
                content_type__model='user',
                object_id=str(user.id),
                action_type='view'
            ).count(),
            'properties_viewed': Property.objects.filter(
                property_views__user=user
            ).distinct().count(),
            'messages_sent': MessageThread.objects.filter(
                created_by=user
            ).count(),
        }
        
        return context


class SystemStatusView(TemplateView):
    """Estado del sistema."""
    template_name = 'core/system_status.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Estado básico del sistema
        context['system_status'] = {
            'database': True,  # Simplificado para demo
            'messaging': True,
            'payments': True,
            'notifications': True,
        }
        
        # Estadísticas generales
        context['stats'] = {
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(
                last_login__gte=timezone.now() - timedelta(days=30)
            ).count(),
            'total_properties': Property.objects.count(),
            'active_contracts': Contract.objects.filter(status='active').count(),
        }
        
        return context
