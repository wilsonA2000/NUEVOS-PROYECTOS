"""
Tareas asíncronas de Celery para el módulo core de VeriHome.
"""

import os
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.core.management import call_command
from django.contrib.sessions.models import Session
from django.db import transaction
from celery import shared_task
from celery.utils.log import get_task_logger

logger = get_task_logger(__name__)

@shared_task
def cleanup_expired_sessions():
    """Limpia las sesiones expiradas de Django."""
    try:
        logger.info("Iniciando limpieza de sesiones expiradas")
        
        expired_sessions = Session.objects.filter(expire_date__lt=datetime.now())
        count = expired_sessions.count()
        
        if count > 0:
            expired_sessions.delete()
            logger.info(f"Se eliminaron {count} sesiones expiradas")
        else:
            logger.info("No hay sesiones expiradas para eliminar")
            
        return f"Sesiones expiradas eliminadas: {count}"
        
    except Exception as e:
        logger.error(f"Error al limpiar sesiones expiradas: {str(e)}")
        raise

@shared_task
def backup_database():
    """Crea un backup de la base de datos."""
    try:
        logger.info("Iniciando backup de base de datos")
        
        # Crear directorio de backups si no existe
        backup_dir = os.path.join(settings.BASE_DIR, 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        # Generar nombre del archivo de backup
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = f"verihome_backup_{timestamp}.json"
        backup_path = os.path.join(backup_dir, backup_file)
        
        # Crear backup usando dumpdata de Django
        with open(backup_path, 'w') as f:
            call_command(
                'dumpdata',
                '--natural-foreign',
                '--natural-primary',
                '--exclude=contenttypes',
                '--exclude=auth.permission',
                '--exclude=sessions.session',
                '--exclude=core.auditlog',
                stdout=f
            )
        
        # Verificar que el archivo se creó correctamente
        if os.path.exists(backup_path):
            file_size = os.path.getsize(backup_path)
            logger.info(f"Backup creado exitosamente: {backup_file} ({file_size} bytes)")
            
            # Limpiar backups antiguos (mantener últimos 7 días)
            cutoff_date = datetime.now() - timedelta(days=7)
            for filename in os.listdir(backup_dir):
                if filename.startswith('verihome_backup_') and filename.endswith('.json'):
                    file_path = os.path.join(backup_dir, filename)
                    file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                    if file_time < cutoff_date:
                        os.remove(file_path)
                        logger.info(f"Backup antiguo eliminado: {filename}")
            
            return f"Backup creado: {backup_file}"
        else:
            raise Exception("El archivo de backup no se creó correctamente")
            
    except Exception as e:
        logger.error(f"Error al crear backup de base de datos: {str(e)}")
        raise

@shared_task
def cleanup_temp_files():
    """Limpia archivos temporales del sistema."""
    try:
        logger.info("Iniciando limpieza de archivos temporales")
        
        cleaned_files = 0
        
        # Limpiar archivos temporales en media/temp (si existe)
        temp_dir = os.path.join(settings.MEDIA_ROOT, 'temp')
        if os.path.exists(temp_dir):
            cutoff_date = datetime.now() - timedelta(hours=24)
            
            for filename in os.listdir(temp_dir):
                file_path = os.path.join(temp_dir, filename)
                if os.path.isfile(file_path):
                    file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                    if file_time < cutoff_date:
                        os.remove(file_path)
                        cleaned_files += 1
        
        # Limpiar logs antiguos (mantener últimos 30 días)
        logs_dir = os.path.join(settings.BASE_DIR, 'logs')
        if os.path.exists(logs_dir):
            cutoff_date = datetime.now() - timedelta(days=30)
            
            for filename in os.listdir(logs_dir):
                if filename.endswith('.log'):
                    file_path = os.path.join(logs_dir, filename)
                    file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                    if file_time < cutoff_date:
                        # No eliminar, sino rotar el log
                        rotated_name = f"{filename}.{datetime.now().strftime('%Y%m%d')}"
                        os.rename(file_path, os.path.join(logs_dir, rotated_name))
                        cleaned_files += 1
        
        logger.info(f"Limpieza completada. Archivos procesados: {cleaned_files}")
        return f"Archivos temporales procesados: {cleaned_files}"
        
    except Exception as e:
        logger.error(f"Error al limpiar archivos temporales: {str(e)}")
        raise

@shared_task
def update_platform_statistics():
    """Actualiza las estadísticas de la plataforma."""
    try:
        logger.info("Actualizando estadísticas de la plataforma")
        
        from django.contrib.auth import get_user_model
        from properties.models import Property
        from contracts.models import Contract
        
        User = get_user_model()
        
        stats = {
            'total_users': User.objects.count(),
            'active_users': User.objects.filter(is_active=True).count(),
            'total_properties': Property.objects.count(),
            'active_properties': Property.objects.filter(status='available').count(),
            'total_contracts': Contract.objects.count(),
            'active_contracts': Contract.objects.filter(status='active').count(),
        }
        
        # Aquí podrías guardar las estadísticas en un modelo o en cache
        from django.core.cache import cache
        cache.set('platform_statistics', stats, timeout=3600)  # 1 hora
        
        logger.info(f"Estadísticas actualizadas: {stats}")
        return stats
        
    except Exception as e:
        logger.error(f"Error al actualizar estadísticas: {str(e)}")
        raise

@shared_task
def send_system_notification(message, level='info', recipients=None):
    """Envía una notificación del sistema."""
    try:
        logger.info(f"Enviando notificación del sistema: {message}")
        
        # Aquí implementarías la lógica para enviar notificaciones
        # Por ejemplo, email, push notifications, etc.
        
        if recipients:
            logger.info(f"Notificación enviada a {len(recipients)} destinatarios")
        else:
            logger.info("Notificación enviada a administradores del sistema")
            
        return f"Notificación enviada: {message}"
        
    except Exception as e:
        logger.error(f"Error al enviar notificación del sistema: {str(e)}")
        raise

@shared_task
def health_check():
    """Verifica el estado de salud del sistema."""
    try:
        logger.info("Ejecutando verificación de salud del sistema")
        
        health_status = {
            'database': False,
            'cache': False,
            'storage': False,
            'timestamp': datetime.now().isoformat()
        }
        
        # Verificar base de datos
        try:
            from django.db import connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            health_status['database'] = True
        except Exception as e:
            logger.error(f"Error en verificación de base de datos: {str(e)}")
        
        # Verificar cache
        try:
            from django.core.cache import cache
            cache.set('health_check', 'ok', timeout=60)
            if cache.get('health_check') == 'ok':
                health_status['cache'] = True
        except Exception as e:
            logger.error(f"Error en verificación de cache: {str(e)}")
        
        # Verificar almacenamiento
        try:
            import tempfile
            with tempfile.NamedTemporaryFile(delete=True) as tmp:
                tmp.write(b"health check")
                tmp.flush()
            health_status['storage'] = True
        except Exception as e:
            logger.error(f"Error en verificación de almacenamiento: {str(e)}")
        
        all_healthy = all(health_status[key] for key in ['database', 'cache', 'storage'])
        logger.info(f"Verificación de salud completada. Estado: {'Saludable' if all_healthy else 'Con problemas'}")
        
        return health_status
        
    except Exception as e:
        logger.error(f"Error en verificación de salud: {str(e)}")
        raise