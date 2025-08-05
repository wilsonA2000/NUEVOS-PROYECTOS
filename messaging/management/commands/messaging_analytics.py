"""
Comando de gestión para generar analíticas del sistema de mensajería.
Proporciona estadísticas detalladas sobre el uso y rendimiento del sistema.
"""

from django.core.management.base import BaseCommand
from django.db.models import Count, Avg, Max, Min, Q
from django.utils import timezone
from datetime import timedelta
import json


class Command(BaseCommand):
    help = 'Genera analíticas del sistema de mensajería'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Número de días para el análisis (por defecto: 30)'
        )
        parser.add_argument(
            '--format',
            type=str,
            default='text',
            choices=['text', 'json'],
            help='Formato de salida (text o json)'
        )
        parser.add_argument(
            '--user-id',
            type=int,
            help='ID de usuario específico para analizar'
        )
        parser.add_argument(
            '--export-file',
            type=str,
            help='Archivo para exportar los resultados'
        )
    
    def handle(self, *args, **options):
        days = options['days']
        output_format = options['format']
        user_id = options['user_id']
        export_file = options['export_file']
        
        # Calcular fecha de inicio
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Generando analíticas de mensajería para los últimos {days} días...'
            )
        )
        
        try:
            analytics_data = self._generate_analytics(start_date, end_date, user_id)
            
            if output_format == 'json':
                output = json.dumps(analytics_data, indent=2, default=str)
            else:
                output = self._format_text_output(analytics_data, days)
            
            if export_file:
                with open(export_file, 'w', encoding='utf-8') as f:
                    f.write(output)
                self.stdout.write(
                    self.style.SUCCESS(f'Analíticas exportadas a: {export_file}')
                )
            else:
                self.stdout.write(output)
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error generando analíticas: {str(e)}')
            )
            raise
    
    def _generate_analytics(self, start_date, end_date, user_id=None):
        """Genera datos de analíticas del sistema de mensajería."""
        from messaging.models import MessageThread, Message, MessageReaction
        from users.models import User
        
        analytics = {
            'period': {
                'start_date': start_date,
                'end_date': end_date,
                'days': (end_date - start_date).days
            }
        }
        
        # Filtros base
        thread_filter = Q(created_at__gte=start_date, created_at__lte=end_date)
        message_filter = Q(sent_at__gte=start_date, sent_at__lte=end_date)
        
        if user_id:
            thread_filter &= Q(participants__id=user_id)
            message_filter &= Q(Q(sender_id=user_id) | Q(recipient_id=user_id))
            analytics['user_id'] = user_id
        
        # Estadísticas de conversaciones
        threads = MessageThread.objects.filter(thread_filter)
        analytics['conversations'] = {
            'total_created': threads.count(),
            'by_type': dict(threads.values('thread_type').annotate(
                count=Count('id')
            ).values_list('thread_type', 'count')),
            'by_status': dict(threads.values('status').annotate(
                count=Count('id')
            ).values_list('status', 'count')),
            'avg_messages_per_thread': threads.annotate(
                msg_count=Count('messages')
            ).aggregate(avg=Avg('msg_count'))['avg'] or 0
        }
        
        # Estadísticas de mensajes
        messages = Message.objects.filter(message_filter)
        analytics['messages'] = {
            'total_sent': messages.count(),
            'by_type': dict(messages.values('message_type').annotate(
                count=Count('id')
            ).values_list('message_type', 'count')),
            'read_rate': self._calculate_read_rate(messages),
            'avg_length': messages.aggregate(
                avg=Avg('content')
            )['avg'] or 0 if messages.exists() else 0,
            'with_attachments': messages.filter(
                attachments__isnull=False
            ).distinct().count()
        }
        
        # Estadísticas de usuarios
        if not user_id:
            analytics['users'] = self._get_user_analytics(start_date, end_date)
        
        # Estadísticas de actividad por día
        analytics['daily_activity'] = self._get_daily_activity(start_date, end_date, user_id)
        
        # Estadísticas de respuesta
        analytics['response_times'] = self._get_response_time_analytics(messages)
        
        # Estadísticas de reacciones
        reactions = MessageReaction.objects.filter(
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        if user_id:
            reactions = reactions.filter(user_id=user_id)
        
        analytics['reactions'] = {
            'total': reactions.count(),
            'by_type': dict(reactions.values('reaction_type').annotate(
                count=Count('id')
            ).values_list('reaction_type', 'count'))
        }
        
        return analytics
    
    def _calculate_read_rate(self, messages):
        """Calcula la tasa de lectura de mensajes."""
        total = messages.count()
        if total == 0:
            return 0
        read = messages.filter(is_read=True).count()
        return round((read / total) * 100, 2)
    
    def _get_user_analytics(self, start_date, end_date):
        """Obtiene analíticas de usuarios."""
        from messaging.models import Message
        from users.models import User
        
        # Usuarios más activos enviando mensajes
        top_senders = Message.objects.filter(
            sent_at__gte=start_date,
            sent_at__lte=end_date
        ).values('sender__id', 'sender__first_name', 'sender__last_name').annotate(
            message_count=Count('id')
        ).order_by('-message_count')[:10]
        
        # Usuarios más activos recibiendo mensajes
        top_recipients = Message.objects.filter(
            sent_at__gte=start_date,
            sent_at__lte=end_date
        ).values('recipient__id', 'recipient__first_name', 'recipient__last_name').annotate(
            message_count=Count('id')
        ).order_by('-message_count')[:10]
        
        return {
            'top_senders': list(top_senders),
            'top_recipients': list(top_recipients),
            'total_active_users': Message.objects.filter(
                sent_at__gte=start_date,
                sent_at__lte=end_date
            ).values('sender').distinct().count()
        }
    
    def _get_daily_activity(self, start_date, end_date, user_id=None):
        """Obtiene actividad diaria."""
        from messaging.models import Message, MessageThread
        
        daily_data = []
        current_date = start_date.date()
        
        while current_date <= end_date.date():
            message_filter = Q(sent_at__date=current_date)
            thread_filter = Q(created_at__date=current_date)
            
            if user_id:
                message_filter &= Q(Q(sender_id=user_id) | Q(recipient_id=user_id))
                thread_filter &= Q(participants__id=user_id)
            
            daily_messages = Message.objects.filter(message_filter).count()
            daily_threads = MessageThread.objects.filter(thread_filter).count()
            
            daily_data.append({
                'date': current_date,
                'messages': daily_messages,
                'new_conversations': daily_threads
            })
            
            current_date += timedelta(days=1)
        
        return daily_data
    
    def _get_response_time_analytics(self, messages):
        """Calcula analíticas de tiempo de respuesta."""
        # Para un análisis más complejo, aquí se podría implementar
        # la lógica para calcular tiempos de respuesta reales
        return {
            'avg_response_time_hours': 0,  # Placeholder
            'median_response_time_hours': 0,  # Placeholder
            'fastest_response_minutes': 0,  # Placeholder
            'slowest_response_hours': 0,  # Placeholder
        }
    
    def _format_text_output(self, analytics, days):
        """Formatea la salida en texto legible."""
        output = []
        output.append('='*60)
        output.append(f'ANALÍTICAS DE MENSAJERÍA - ÚLTIMOS {days} DÍAS')
        output.append('='*60)
        
        # Período
        output.append(f'Período: {analytics["period"]["start_date"].strftime("%Y-%m-%d")} - {analytics["period"]["end_date"].strftime("%Y-%m-%d")}')
        
        if 'user_id' in analytics:
            output.append(f'Usuario ID: {analytics["user_id"]}')
        
        output.append('')
        
        # Conversaciones
        conv = analytics['conversations']
        output.append('CONVERSACIONES:')
        output.append(f'  Total creadas: {conv["total_created"]}')
        output.append(f'  Promedio mensajes por conversación: {conv["avg_messages_per_thread"]:.1f}')
        
        if conv['by_type']:
            output.append('  Por tipo:')
            for type_name, count in conv['by_type'].items():
                output.append(f'    {type_name}: {count}')
        
        if conv['by_status']:
            output.append('  Por estado:')
            for status, count in conv['by_status'].items():
                output.append(f'    {status}: {count}')
        
        output.append('')
        
        # Mensajes
        msg = analytics['messages']
        output.append('MENSAJES:')
        output.append(f'  Total enviados: {msg["total_sent"]}')
        output.append(f'  Tasa de lectura: {msg["read_rate"]}%')
        output.append(f'  Con archivos adjuntos: {msg["with_attachments"]}')
        
        if msg['by_type']:
            output.append('  Por tipo:')
            for type_name, count in msg['by_type'].items():
                output.append(f'    {type_name}: {count}')
        
        output.append('')
        
        # Reacciones
        reactions = analytics['reactions']
        output.append('REACCIONES:')
        output.append(f'  Total: {reactions["total"]}')
        
        if reactions['by_type']:
            output.append('  Por tipo:')
            for reaction_type, count in reactions['by_type'].items():
                output.append(f'    {reaction_type}: {count}')
        
        output.append('')
        
        # Usuarios (solo si no es análisis de usuario específico)
        if 'users' in analytics:
            users = analytics['users']
            output.append('USUARIOS:')
            output.append(f'  Total usuarios activos: {users["total_active_users"]}')
            
            if users['top_senders']:
                output.append('  Top remitentes:')
                for sender in users['top_senders'][:5]:
                    name = f"{sender['sender__first_name']} {sender['sender__last_name']}"
                    output.append(f'    {name}: {sender["message_count"]} mensajes')
        
        output.append('')
        output.append('='*60)
        
        return '\n'.join(output)