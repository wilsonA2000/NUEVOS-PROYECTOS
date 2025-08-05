"""
Comando de gestión para procesar notificaciones automáticas de calificaciones.
Se puede ejecutar como tarea programada (cron job).
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from ratings.notifications import RatingNotificationScheduler
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Comando para procesar notificaciones automáticas de calificaciones."""
    
    help = 'Procesa notificaciones automáticas del sistema de calificaciones'
    
    def add_arguments(self, parser):
        """Añadir argumentos al comando."""
        parser.add_argument(
            '--mode',
            type=str,
            choices=['daily', 'weekly', 'both'],
            default='daily',
            help='Tipo de notificaciones a procesar (daily/weekly/both)'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecutar en modo de prueba sin enviar notificaciones reales'
        )
        
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostrar información detallada'
        )
    
    def handle(self, *args, **options):
        """Ejecutar el comando."""
        self.verbosity = options['verbosity']
        self.dry_run = options['dry_run']
        self.verbose = options['verbose']
        mode = options['mode']
        
        if self.verbose or self.verbosity > 1:
            self.stdout.write(
                self.style.SUCCESS(
                    f"[{timezone.now()}] Iniciando procesamiento de notificaciones de calificaciones..."
                )
            )
        
        if self.dry_run:
            self.stdout.write(
                self.style.WARNING("MODO DE PRUEBA - No se enviarán notificaciones reales")
            )
        
        scheduler = RatingNotificationScheduler()
        
        try:
            if mode in ['daily', 'both']:
                self._process_daily_notifications(scheduler)
            
            if mode in ['weekly', 'both']:
                self._process_weekly_notifications(scheduler)
                
        except Exception as e:
            logger.error(f"Error processing rating notifications: {str(e)}")
            self.stdout.write(
                self.style.ERROR(f"Error: {str(e)}")
            )
            return
        
        if self.verbose or self.verbosity > 1:
            self.stdout.write(
                self.style.SUCCESS("Procesamiento de notificaciones completado.")
            )
    
    def _process_daily_notifications(self, scheduler):
        """Procesar notificaciones diarias."""
        if self.verbose:
            self.stdout.write("Procesando notificaciones diarias...")
        
        if not self.dry_run:
            results = scheduler.schedule_daily_notifications()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Notificaciones diarias enviadas: "
                    f"Recordatorios: {results['reminders_sent']}, "
                    f"Hitos: {results['milestone_notifications']}, "
                    f"Invitaciones: {results['contract_invitations']}, "
                    f"Expiradas: {results['expired_invitations']}"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING("Modo de prueba: Se habrían procesado notificaciones diarias")
            )
    
    def _process_weekly_notifications(self, scheduler):
        """Procesar notificaciones semanales."""
        if self.verbose:
            self.stdout.write("Procesando resúmenes semanales...")
        
        if not self.dry_run:
            summaries_sent = scheduler.schedule_weekly_summary()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Resúmenes semanales enviados: {summaries_sent}"
                )
            )
        else:
            self.stdout.write(
                self.style.WARNING("Modo de prueba: Se habrían enviado resúmenes semanales")
            )