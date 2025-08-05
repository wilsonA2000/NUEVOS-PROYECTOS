"""
Comando de gestión para actualizar perfiles de calificaciones.
Útil para mantener estadísticas actualizadas y detectar nuevos hitos.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Count
from ratings.models import UserRatingProfile, Rating
from ratings.analytics import RatingAnalytics
from users.models import User
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    """Comando para actualizar perfiles de calificaciones de usuarios."""
    
    help = 'Actualiza los perfiles de calificaciones y estadísticas de usuarios'
    
    def add_arguments(self, parser):
        """Añadir argumentos al comando."""
        parser.add_argument(
            '--user-id',
            type=str,
            help='Actualizar solo el perfil de un usuario específico'
        )
        
        parser.add_argument(
            '--create-missing',
            action='store_true',
            help='Crear perfiles faltantes para usuarios con calificaciones'
        )
        
        parser.add_argument(
            '--analytics',
            action='store_true',
            help='Generar analíticas globales después de la actualización'
        )
        
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Tamaño del lote para procesamiento (default: 100)'
        )
    
    def handle(self, *args, **options):
        """Ejecutar el comando."""
        self.verbosity = options['verbosity']
        user_id = options['user_id']
        create_missing = options['create_missing']
        generate_analytics = options['analytics']
        batch_size = options['batch_size']
        
        self.stdout.write(
            self.style.SUCCESS(
                f"[{timezone.now()}] Iniciando actualización de perfiles de calificaciones..."
            )
        )
        
        try:
            if user_id:
                self._update_single_user(user_id)
            else:
                self._update_all_users(create_missing, batch_size)
            
            if generate_analytics:
                self._generate_global_analytics()
                
        except Exception as e:
            logger.error(f"Error updating rating profiles: {str(e)}")
            self.stdout.write(
                self.style.ERROR(f"Error: {str(e)}")
            )
            return
        
        self.stdout.write(
            self.style.SUCCESS("Actualización de perfiles completada.")
        )
    
    def _update_single_user(self, user_id):
        """Actualizar perfil de un usuario específico."""
        try:
            user = User.objects.get(id=user_id)
            profile, created = UserRatingProfile.objects.get_or_create(user=user)
            
            old_stats = {
                'total': profile.total_ratings_received,
                'average': profile.average_rating
            }
            
            profile.update_statistics()
            
            action = "Creado" if created else "Actualizado"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{action} perfil para {user.get_full_name()}: "
                    f"{old_stats['total']} -> {profile.total_ratings_received} calificaciones, "
                    f"{old_stats['average']:.2f} -> {profile.average_rating:.2f} promedio"
                )
            )
            
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f"Usuario con ID {user_id} no encontrado")
            )
    
    def _update_all_users(self, create_missing, batch_size):
        """Actualizar todos los perfiles de usuarios."""
        # Obtener perfiles existentes
        existing_profiles = UserRatingProfile.objects.all()
        
        updated_count = 0
        created_count = 0
        
        if self.verbosity > 1:
            self.stdout.write(f"Actualizando {existing_profiles.count()} perfiles existentes...")
        
        # Actualizar perfiles existentes en lotes
        for i in range(0, existing_profiles.count(), batch_size):
            batch = existing_profiles[i:i + batch_size]
            
            for profile in batch:
                try:
                    profile.update_statistics()
                    updated_count += 1
                    
                    if self.verbosity > 2:
                        self.stdout.write(f"Actualizado: {profile.user.get_full_name()}")
                        
                except Exception as e:
                    logger.error(f"Error updating profile for user {profile.user.id}: {str(e)}")
            
            if self.verbosity > 1:
                self.stdout.write(f"Procesados {min(i + batch_size, existing_profiles.count())} perfiles...")
        
        # Crear perfiles faltantes si se solicita
        if create_missing:
            if self.verbosity > 1:
                self.stdout.write("Creando perfiles faltantes...")
            
            # Usuarios que han recibido calificaciones pero no tienen perfil
            users_with_ratings = User.objects.filter(
                ratings_received__isnull=False
            ).exclude(
                rating_profile__isnull=False
            ).distinct()
            
            for user in users_with_ratings:
                try:
                    profile, created = UserRatingProfile.objects.get_or_create(user=user)
                    if created:
                        profile.update_statistics()
                        created_count += 1
                        
                        if self.verbosity > 2:
                            self.stdout.write(f"Creado perfil para: {user.get_full_name()}")
                            
                except Exception as e:
                    logger.error(f"Error creating profile for user {user.id}: {str(e)}")
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Perfiles actualizados: {updated_count}, "
                f"Perfiles creados: {created_count}"
            )
        )
    
    def _generate_global_analytics(self):
        """Generar analíticas globales."""
        if self.verbosity > 1:
            self.stdout.write("Generando analíticas globales...")
        
        try:
            analytics = RatingAnalytics()
            global_stats = analytics.get_global_statistics()
            
            self.stdout.write(
                self.style.SUCCESS(
                    f"Estadísticas globales:\n"
                    f"  - Total de calificaciones: {global_stats['total_ratings']}\n"
                    f"  - Promedio general: {global_stats['average_rating']:.2f}\n"
                    f"  - Tasa de respuesta: {global_stats['response_rate']:.1f}%\n"
                    f"  - Calificaciones pendientes: {global_stats['moderation_stats']['pending']}\n"
                    f"  - Calificaciones marcadas: {global_stats['moderation_stats']['flagged']}"
                )
            )
            
            # Detectar patrones sospechosos
            suspicious = analytics.detect_suspicious_patterns()
            
            total_suspicious = sum(len(patterns) for patterns in suspicious.values())
            if total_suspicious > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f"Patrones sospechosos detectados: {total_suspicious} elementos requieren revisión"
                    )
                )
            
        except Exception as e:
            logger.error(f"Error generating analytics: {str(e)}")
            self.stdout.write(
                self.style.ERROR(f"Error generando analíticas: {str(e)}")
            )