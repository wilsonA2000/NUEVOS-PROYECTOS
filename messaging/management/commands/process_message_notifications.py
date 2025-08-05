"""
Comando de gestión para procesar notificaciones de mensajería.
Envía resúmenes de mensajes no leídos y procesa timeouts de conversaciones.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from messaging.notifications import MessageNotificationScheduler
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Procesa notificaciones de mensajería programadas'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--frequency',
            type=str,
            default='daily',
            choices=['hourly', 'daily', 'weekly'],
            help='Frecuencia para resúmenes de mensajes no leídos'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecutar en modo de prueba sin enviar notificaciones'
        )
        parser.add_argument(
            '--process-timeouts',
            action='store_true',
            help='Procesar advertencias de timeout de conversaciones'
        )
        parser.add_argument(
            '--cleanup-old',
            action='store_true',
            help='Limpiar notificaciones antiguas'
        )
    
    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS(
                f'Iniciando procesamiento de notificaciones de mensajería...'
            )
        )
        
        scheduler = MessageNotificationScheduler()
        frequency = options['frequency']
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('MODO DE PRUEBA - No se enviarán notificaciones reales')
            )
        
        try:
            # Procesar resúmenes de mensajes no leídos
            self.stdout.write('Procesando resúmenes de mensajes no leídos...')
            
            if not dry_run:
                digest_results = scheduler.process_unread_digests(frequency)
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Resúmenes procesados: {digest_results["sent"]} enviados, '
                        f'{digest_results["failed"]} fallidos, '
                        f'{digest_results["skipped"]} omitidos'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING('Modo de prueba: resúmenes no enviados')
                )
            
            # Procesar timeouts de conversaciones si se solicita
            if options['process_timeouts']:
                self.stdout.write('Verificando timeouts de conversaciones...')
                
                if not dry_run:
                    timeout_results = scheduler.check_conversation_timeouts()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Timeouts verificados: {timeout_results["warnings_sent"]} advertencias enviadas '
                            f'de {timeout_results["conversations_checked"]} conversaciones verificadas'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING('Modo de prueba: advertencias de timeout no enviadas')
                    )
            
            # Limpiar notificaciones antiguas si se solicita
            if options['cleanup_old']:
                self.stdout.write('Limpiando notificaciones antiguas...')
                
                if not dry_run:
                    cleaned_count = scheduler.cleanup_old_notifications()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Notificaciones limpiadas: {cleaned_count} registros eliminados'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING('Modo de prueba: notificaciones no eliminadas')
                    )
            
            # Mostrar estadísticas generales
            self._show_stats()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Procesamiento de notificaciones completado exitosamente'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(
                    f'Error durante el procesamiento: {str(e)}'
                )
            )
            logger.error(f'Error in process_message_notifications command: {str(e)}')
            raise
    
    def _show_stats(self):
        """Muestra estadísticas generales del sistema de mensajería."""
        try:
            from messaging.models import MessageThread, Message
            from users.models import User
            
            # Estadísticas básicas
            total_threads = MessageThread.objects.count()
            active_threads = MessageThread.objects.filter(status='active').count()
            total_messages = Message.objects.count()
            unread_messages = Message.objects.filter(is_read=False).count()
            active_users = User.objects.filter(is_active=True).count()
            
            self.stdout.write('\n' + '='*50)
            self.stdout.write(self.style.HTTP_INFO('ESTADÍSTICAS DEL SISTEMA DE MENSAJERÍA'))
            self.stdout.write('='*50)
            self.stdout.write(f'Total de conversaciones: {total_threads}')
            self.stdout.write(f'Conversaciones activas: {active_threads}')
            self.stdout.write(f'Total de mensajes: {total_messages}')
            self.stdout.write(f'Mensajes no leídos: {unread_messages}')
            self.stdout.write(f'Usuarios activos: {active_users}')
            
            # Estadísticas de actividad reciente
            from datetime import timedelta
            week_ago = timezone.now() - timedelta(days=7)
            recent_threads = MessageThread.objects.filter(
                created_at__gte=week_ago
            ).count()
            recent_messages = Message.objects.filter(
                sent_at__gte=week_ago
            ).count()
            
            self.stdout.write(f'\nActividad de los últimos 7 días:')
            self.stdout.write(f'Nuevas conversaciones: {recent_threads}')
            self.stdout.write(f'Mensajes enviados: {recent_messages}')
            self.stdout.write('='*50 + '\n')
            
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(
                    f'No se pudieron obtener estadísticas: {str(e)}'
                )
            )