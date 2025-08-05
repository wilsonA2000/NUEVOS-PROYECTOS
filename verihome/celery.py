"""
Configuración de Celery para VeriHome.

Este módulo configura Celery para manejar tareas asíncronas en la plataforma VeriHome.
"""

import os
from celery import Celery
from django.conf import settings

# Establecer el módulo de configuración de Django por defecto para Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')

# Crear instancia de Celery
app = Celery('verihome')

# Usar configuración de Django, con namespace 'CELERY'
app.config_from_object('django.conf:settings', namespace='CELERY')

# Autodescubrir tareas en todas las aplicaciones de Django
app.autodiscover_tasks()

# Configuración adicional de Celery
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone=settings.TIME_ZONE,
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutos
    task_soft_time_limit=25 * 60,  # 25 minutos
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
    worker_disable_rate_limits=False,
    result_expires=3600,  # 1 hora
)

# Configuración de rutas de tareas
app.conf.task_routes = {
    'core.tasks.*': {'queue': 'core'},
    'users.tasks.*': {'queue': 'users'},
    'properties.tasks.*': {'queue': 'properties'},
    'contracts.tasks.*': {'queue': 'contracts'},
    'payments.tasks.*': {'queue': 'payments'},
    'messaging.tasks.*': {'queue': 'messaging'},
    'notifications.tasks.*': {'queue': 'notifications'},
    'ratings.tasks.*': {'queue': 'ratings'},
}

# Tarea de debug para verificar que Celery está funcionando
@app.task(bind=True)
def debug_task(self):
    """Tarea de debug para verificar configuración de Celery."""
    print(f'Request: {self.request!r}')
    return 'Celery está funcionando correctamente!'

# Configuración del planificador de tareas
app.conf.beat_schedule = {
    # Limpieza de sesiones expiradas cada hora
    'cleanup-expired-sessions': {
        'task': 'core.tasks.cleanup_expired_sessions',
        'schedule': 3600.0,  # 1 hora
    },
    
    # Procesamiento de notificaciones pendientes cada 5 minutos
    'process-pending-notifications': {
        'task': 'notifications.tasks.process_pending_notifications',
        'schedule': 300.0,  # 5 minutos
    },
    
    # Backup de base de datos diario a las 2:00 AM
    'daily-database-backup': {
        'task': 'core.tasks.backup_database',
        'schedule': 86400.0,  # 24 horas
        'options': {'expires': 3600}
    },
    
    # Limpieza de archivos temporales cada 6 horas
    'cleanup-temp-files': {
        'task': 'core.tasks.cleanup_temp_files',
        'schedule': 21600.0,  # 6 horas
    },
    
    # Procesamiento de contratos expirados diariamente
    'process-expired-contracts': {
        'task': 'contracts.tasks.process_expired_contracts',
        'schedule': 86400.0,  # 24 horas
    },
    
    # Envío de recordatorios de pagos cada 12 horas
    'send-payment-reminders': {
        'task': 'payments.tasks.send_payment_reminders',
        'schedule': 43200.0,  # 12 horas
    },
    
    # Actualización de estadísticas cada hora
    'update-platform-statistics': {
        'task': 'core.tasks.update_platform_statistics',
        'schedule': 3600.0,  # 1 hora
    },
}

# Configuración de logging para Celery
app.conf.worker_log_format = '[%(asctime)s: %(levelname)s/%(processName)s] %(message)s'
app.conf.worker_task_log_format = '[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s'