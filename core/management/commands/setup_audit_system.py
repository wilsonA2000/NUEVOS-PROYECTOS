"""
Comando para configurar e inicializar el sistema completo de auditoría y logging.
Crea las estructuras necesarias, plantillas y configuraciones por defecto.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import os

from core.models import SystemAlert, SystemMetrics
from core.audit_service import audit_service

User = get_user_model()


class Command(BaseCommand):
    help = 'Configura e inicializa el sistema completo de auditoría y logging'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--create-alerts',
            action='store_true',
            help='Crear alertas de ejemplo del sistema'
        )
        parser.add_argument(
            '--create-metrics',
            action='store_true',
            help='Crear métricas iniciales del sistema'
        )
        parser.add_argument(
            '--test-logging',
            action='store_true',
            help='Ejecutar pruebas del sistema de logging'
        )
        parser.add_argument(
            '--setup-directories',
            action='store_true',
            help='Crear directorios necesarios para logs'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Ejecutar todas las tareas de configuración'
        )
    
    def handle(self, *args, **options):
        start_time = timezone.now()
        
        self.stdout.write(
            self.style.SUCCESS('Iniciando configuración del sistema de auditoría...')
        )
        
        tasks_completed = 0
        
        # Configurar directorios
        if options['setup_directories'] or options['all']:
            tasks_completed += self._setup_directories()
        
        # Crear alertas de ejemplo
        if options['create_alerts'] or options['all']:
            tasks_completed += self._create_sample_alerts()
        
        # Crear métricas iniciales
        if options['create_metrics'] or options['all']:
            tasks_completed += self._create_initial_metrics()
        
        # Ejecutar pruebas
        if options['test_logging'] or options['all']:
            tasks_completed += self._test_logging_system()
        
        # Mostrar resumen
        end_time = timezone.now()
        duration = (end_time - start_time).total_seconds()
        
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('CONFIGURACIÓN COMPLETADA'))
        self.stdout.write('='*60)
        self.stdout.write(f'Tareas completadas: {tasks_completed}')
        self.stdout.write(f'Tiempo total: {duration:.2f} segundos')
        
        # Mostrar información del sistema
        self._show_system_info()
        
        self.stdout.write('\n' + self.style.SUCCESS('✓ Sistema de auditoría configurado correctamente'))
        
        # Crear log de la configuración
        try:
            admin_user = User.objects.filter(is_superuser=True).first()
            if admin_user:
                audit_service.log_user_activity(
                    user=admin_user,
                    action_type='system_setup',
                    description='Audit system setup completed',
                    details={
                        'tasks_completed': tasks_completed,
                        'duration': duration,
                        'setup_time': start_time.isoformat()
                    },
                    success=True
                )
        except Exception as e:
            self.stdout.write(
                self.style.WARNING(f'No se pudo crear log de configuración: {str(e)}')
            )
    
    def _setup_directories(self) -> int:
        """Configura directorios necesarios para logs."""
        self.stdout.write('Configurando directorios de logs...')
        
        from django.conf import settings
        
        logs_dir = settings.BASE_DIR / 'logs'
        
        try:
            # Crear directorio principal de logs
            logs_dir.mkdir(exist_ok=True)
            
            # Crear subdirectorios específicos
            subdirs = ['security', 'activity', 'performance', 'errors', 'backups']
            for subdir in subdirs:
                (logs_dir / subdir).mkdir(exist_ok=True)
            
            # Crear archivo .gitkeep para preservar estructura
            for subdir in subdirs:
                gitkeep_file = logs_dir / subdir / '.gitkeep'
                gitkeep_file.touch()
            
            # Verificar permisos
            if os.access(logs_dir, os.W_OK):
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Directorios creados en: {logs_dir}')
                )
                return 1
            else:
                self.stdout.write(
                    self.style.WARNING(f'⚠ Directorio creado pero sin permisos de escritura: {logs_dir}')
                )
                return 0
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Error creando directorios: {str(e)}')
            )
            return 0
    
    def _create_sample_alerts(self) -> int:
        """Crea alertas de ejemplo del sistema."""
        self.stdout.write('Creando alertas de ejemplo...')
        
        alerts_created = 0
        
        sample_alerts = [
            {
                'title': 'Sistema de auditoría inicializado',
                'description': 'El sistema de auditoría ha sido configurado correctamente y está funcionando.',
                'level': 'info',
                'category': 'system',
                'metadata': {'setup_time': timezone.now().isoformat()}
            },
            {
                'title': 'Configuración de logging completada',
                'description': 'El sistema de logging ha sido configurado con archivos rotativos y múltiples niveles.',
                'level': 'info',
                'category': 'system',
                'metadata': {'log_levels': ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']}
            },
            {
                'title': 'Métricas de rendimiento activadas',
                'description': 'El monitoreo de rendimiento está activo y registrando métricas del sistema.',
                'level': 'info',
                'category': 'performance',
                'metadata': {'monitoring_active': True}
            }
        ]
        
        for alert_data in sample_alerts:
            try:
                alert = audit_service.create_system_alert(**alert_data)
                alerts_created += 1
                self.stdout.write(f'  ✓ Creada: {alert.title}')
            except Exception as e:
                self.stdout.write(f'  ✗ Error: {str(e)}')
        
        self.stdout.write(f'Alertas creadas: {alerts_created}')
        return alerts_created
    
    def _create_initial_metrics(self) -> int:
        """Crea métricas iniciales del sistema."""
        self.stdout.write('Creando métricas iniciales...')
        
        metrics_created = 0
        today = timezone.now().date()
        
        initial_metrics = [
            {'metric_type': 'system_startup', 'count': 1},
            {'metric_type': 'audit_system_setup', 'count': 1},
            {'metric_type': 'daily_users', 'count': User.objects.filter(last_login__date=today).count()},
            {'metric_type': 'total_users', 'count': User.objects.count()},
            {'metric_type': 'active_alerts', 'count': SystemAlert.objects.filter(is_active=True, is_resolved=False).count()}
        ]
        
        for metric_data in initial_metrics:
            try:
                metric, created = SystemMetrics.objects.update_or_create(
                    metric_type=metric_data['metric_type'],
                    date=today,
                    defaults={'count': metric_data['count']}
                )
                if created:
                    metrics_created += 1
                    self.stdout.write(f'  ✓ Métrica creada: {metric.metric_type} = {metric.count}')
                else:
                    self.stdout.write(f'  ↻ Métrica actualizada: {metric.metric_type} = {metric.count}')
            except Exception as e:
                self.stdout.write(f'  ✗ Error creando métrica {metric_data["metric_type"]}: {str(e)}')
        
        return metrics_created
    
    def _test_logging_system(self) -> int:
        """Ejecuta pruebas del sistema de logging."""
        self.stdout.write('Ejecutando pruebas del sistema de logging...')
        
        tests_passed = 0
        total_tests = 4
        
        # Test 1: Crear un log de actividad
        try:
            admin_user = User.objects.filter(is_superuser=True).first()
            if admin_user:
                audit_service.log_user_activity(
                    user=admin_user,
                    action_type='test',
                    description='Test del sistema de logging',
                    details={'test_type': 'system_setup', 'success': True}
                )
                tests_passed += 1
                self.stdout.write('  ✓ Test 1: Log de actividad - PASÓ')
            else:
                self.stdout.write('  ⚠ Test 1: No hay usuario admin para prueba')
        except Exception as e:
            self.stdout.write(f'  ✗ Test 1: Log de actividad - FALLÓ: {str(e)}')
        
        # Test 2: Crear alerta del sistema
        try:
            alert = audit_service.create_system_alert(
                title='Test de alerta del sistema',
                description='Esta es una alerta de prueba creada durante la configuración',
                level='info',
                category='system',
                metadata={'test': True},
                auto_resolve_after=timedelta(minutes=5)
            )
            tests_passed += 1
            self.stdout.write('  ✓ Test 2: Crear alerta - PASÓ')
        except Exception as e:
            self.stdout.write(f'  ✗ Test 2: Crear alerta - FALLÓ: {str(e)}')
        
        # Test 3: Análisis de seguridad
        try:
            analysis = audit_service.analyze_security_events(timedelta(hours=1))
            if isinstance(analysis, dict) and 'risk_score' in analysis:
                tests_passed += 1
                self.stdout.write('  ✓ Test 3: Análisis de seguridad - PASÓ')
            else:
                self.stdout.write('  ✗ Test 3: Análisis de seguridad - FALLÓ: Formato incorrecto')
        except Exception as e:
            self.stdout.write(f'  ✗ Test 3: Análisis de seguridad - FALLÓ: {str(e)}')
        
        # Test 4: Generar reporte
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=1)
            
            report = audit_service.generate_audit_report(
                start_date=start_date,
                end_date=end_date,
                include_sections=['general_stats']
            )
            
            if isinstance(report, dict) and 'report_id' in report:
                tests_passed += 1
                self.stdout.write('  ✓ Test 4: Generar reporte - PASÓ')
            else:
                self.stdout.write('  ✗ Test 4: Generar reporte - FALLÓ: Formato incorrecto')
        except Exception as e:
            self.stdout.write(f'  ✗ Test 4: Generar reporte - FALLÓ: {str(e)}')
        
        self.stdout.write(f'Tests pasados: {tests_passed}/{total_tests}')
        
        if tests_passed == total_tests:
            self.stdout.write(self.style.SUCCESS('✓ Todos los tests pasaron'))
        else:
            self.stdout.write(self.style.WARNING(f'⚠ {total_tests - tests_passed} tests fallaron'))
        
        return tests_passed
    
    def _show_system_info(self):
        """Muestra información del sistema configurado."""
        self.stdout.write('\nINFORMACIÓN DEL SISTEMA:')
        self.stdout.write('-' * 40)
        
        # Estadísticas de la base de datos
        try:
            total_users = User.objects.count()
            active_alerts = SystemAlert.objects.filter(is_active=True, is_resolved=False).count()
            total_metrics = SystemMetrics.objects.count()
            
            self.stdout.write(f'Usuarios totales: {total_users}')
            self.stdout.write(f'Alertas activas: {active_alerts}')
            self.stdout.write(f'Métricas registradas: {total_metrics}')
            
        except Exception as e:
            self.stdout.write(f'Error obteniendo estadísticas: {str(e)}')
        
        # Configuración de logging
        from django.conf import settings
        
        self.stdout.write('\nCONFIGURACIÓN DE LOGGING:')
        self.stdout.write('-' * 40)
        
        if hasattr(settings, 'LOGGING'):
            logging_config = settings.LOGGING
            handlers = logging_config.get('handlers', {})
            loggers = logging_config.get('loggers', {})
            
            self.stdout.write(f'Handlers configurados: {len(handlers)}')
            self.stdout.write(f'Loggers configurados: {len(loggers)}')
            
            # Mostrar archivos de log
            for handler_name, handler_config in handlers.items():
                if 'filename' in handler_config:
                    filename = handler_config['filename']
                    self.stdout.write(f'  {handler_name}: {filename}')
        
        # Comandos útiles
        self.stdout.write('\nCOMANDOS ÚTILES:')
        self.stdout.write('-' * 40)
        self.stdout.write('python manage.py audit_maintenance --task=all')
        self.stdout.write('python manage.py audit_maintenance --task=security_check')
        self.stdout.write('python manage.py audit_maintenance --task=cleanup --retention-days=90')
        self.stdout.write('python manage.py audit_maintenance --task=generate_alerts')
        
        # URLs importantes
        self.stdout.write('\nENDPOINTS DE API:')
        self.stdout.write('-' * 40)
        self.stdout.write('/api/v1/core/activity-logs/')
        self.stdout.write('/api/v1/core/system-alerts/')
        self.stdout.write('/api/v1/core/dashboard-stats/')
        self.stdout.write('/api/v1/core/security-analysis/')
        self.stdout.write('/api/v1/core/audit-reports/')
        self.stdout.write('/api/v1/core/export-logs/')