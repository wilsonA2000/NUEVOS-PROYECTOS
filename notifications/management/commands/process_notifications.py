"""
Comando de gestión para procesar notificaciones programadas y fallidas.
Debe ejecutarse periódicamente (ej: cada minuto via cron).
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from notifications.notification_service import notification_service
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Procesa notificaciones programadas y reintenta entregas fallidas'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--scheduled-only',
            action='store_true',
            help='Solo procesar notificaciones programadas'
        )
        parser.add_argument(
            '--retries-only',
            action='store_true',
            help='Solo procesar reintentos de entregas fallidas'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecutar en modo de prueba sin procesar'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostrar información detallada'
        )
    
    def handle(self, *args, **options):
        start_time = timezone.now()
        
        if options['verbose']:
            self.stdout.write(
                self.style.SUCCESS(f'Iniciando procesamiento de notificaciones: {start_time}')
            )
        
        total_stats = {
            'scheduled': {'processed': 0, 'sent': 0, 'failed': 0, 'expired': 0},
            'retries': {'retried': 0, 'successful': 0, 'failed': 0}
        }
        
        try:
            # Procesar notificaciones programadas
            if not options['retries_only']:
                if options['dry_run']:
                    self.stdout.write('MODO DE PRUEBA: No se procesarán notificaciones programadas')
                else:
                    scheduled_stats = notification_service.process_scheduled_notifications()
                    total_stats['scheduled'] = scheduled_stats
                    
                    if options['verbose']:
                        self.stdout.write(
                            f'Notificaciones programadas: {scheduled_stats["processed"]} procesadas, '
                            f'{scheduled_stats["sent"]} enviadas, {scheduled_stats["failed"]} fallidas, '
                            f'{scheduled_stats["expired"]} expiradas'
                        )
            
            # Procesar reintentos
            if not options['scheduled_only']:
                if options['dry_run']:
                    self.stdout.write('MODO DE PRUEBA: No se procesarán reintentos')
                else:
                    retry_stats = notification_service.retry_failed_deliveries()
                    total_stats['retries'] = retry_stats
                    
                    if options['verbose']:
                        self.stdout.write(
                            f'Reintentos: {retry_stats["retried"]} intentados, '
                            f'{retry_stats["successful"]} exitosos, {retry_stats["failed"]} fallidos'
                        )
            
            # Mostrar resumen
            end_time = timezone.now()
            duration = (end_time - start_time).total_seconds()
            
            summary_message = (
                f'Procesamiento completado en {duration:.2f}s - '
                f'Programadas: {total_stats["scheduled"]["sent"]} enviadas, '
                f'Reintentos: {total_stats["retries"]["successful"]} exitosos'
            )
            
            if options['verbose'] or total_stats['scheduled']['sent'] > 0 or total_stats['retries']['successful'] > 0:
                self.stdout.write(self.style.SUCCESS(summary_message))
            
            # Mostrar estadísticas detalladas si hay actividad
            if any(total_stats['scheduled'].values()) or any(total_stats['retries'].values()):
                self._show_detailed_stats(total_stats)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error durante el procesamiento: {str(e)}')
            )
            logger.error(f'Error in process_notifications command: {str(e)}')
            raise
    
    def _show_detailed_stats(self, stats):
        """Muestra estadísticas detalladas del procesamiento."""
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.HTTP_INFO('ESTADÍSTICAS DETALLADAS'))
        self.stdout.write('='*50)
        
        # Notificaciones programadas
        scheduled = stats['scheduled']
        self.stdout.write('NOTIFICACIONES PROGRAMADAS:')
        self.stdout.write(f'  Procesadas: {scheduled["processed"]}')
        self.stdout.write(f'  Enviadas exitosamente: {scheduled["sent"]}')
        self.stdout.write(f'  Fallidas: {scheduled["failed"]}')
        self.stdout.write(f'  Expiradas: {scheduled["expired"]}')
        
        # Reintentos
        retries = stats['retries']
        self.stdout.write('\nREINTENTOS DE ENTREGAS:')
        self.stdout.write(f'  Intentos realizados: {retries["retried"]}')
        self.stdout.write(f'  Exitosos: {retries["successful"]}')
        self.stdout.write(f'  Fallidos: {retries["failed"]}')
        
        # Calcular tasas de éxito
        if scheduled['processed'] > 0:
            success_rate = (scheduled['sent'] / scheduled['processed']) * 100
            self.stdout.write(f'\nTasa de éxito programadas: {success_rate:.1f}%')
        
        if retries['retried'] > 0:
            retry_success_rate = (retries['successful'] / retries['retried']) * 100
            self.stdout.write(f'Tasa de éxito reintentos: {retry_success_rate:.1f}%')
        
        self.stdout.write('='*50 + '\n')