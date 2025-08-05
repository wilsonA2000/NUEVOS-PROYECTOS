"""
Comando de mantenimiento para el sistema de auditoría.
Ejecuta tareas de limpieza, optimización y reportes automáticos.
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import logging

from core.audit_service import audit_service
from core.models import SystemAlert, SystemMetrics

logger = logging.getLogger('verihome.audit')


class Command(BaseCommand):
    help = 'Ejecuta tareas de mantenimiento del sistema de auditoría'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--task',
            type=str,
            choices=['cleanup', 'security_check', 'generate_alerts', 'optimize', 'all'],
            default='all',
            help='Tipo de tarea de mantenimiento a ejecutar'
        )
        parser.add_argument(
            '--retention-days',
            type=int,
            default=90,
            help='Días de retención para logs antiguos'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Ejecutar en modo de prueba sin realizar cambios'
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostrar información detallada'
        )
    
    def handle(self, *args, **options):
        task = options['task']
        retention_days = options['retention_days']
        dry_run = options['dry_run']
        verbose = options['verbose']
        
        start_time = timezone.now()
        
        if verbose:
            self.stdout.write(
                self.style.SUCCESS(f'Iniciando mantenimiento de auditoría: {start_time}')
            )
            if dry_run:
                self.stdout.write(
                    self.style.WARNING('MODO DE PRUEBA: No se realizarán cambios permanentes')
                )
        
        try:
            results = {}
            
            # Ejecutar tareas según la opción seleccionada
            if task in ['cleanup', 'all']:
                results['cleanup'] = self._run_cleanup(retention_days, dry_run, verbose)
            
            if task in ['security_check', 'all']:
                results['security'] = self._run_security_check(verbose)
            
            if task in ['generate_alerts', 'all']:
                results['alerts'] = self._generate_system_alerts(dry_run, verbose)
            
            if task in ['optimize', 'all']:
                results['optimization'] = self._run_optimization(dry_run, verbose)
            
            # Mostrar resumen final
            end_time = timezone.now()
            duration = (end_time - start_time).total_seconds()
            
            self._show_summary(results, duration, verbose)
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error durante el mantenimiento: {str(e)}')
            )
            logger.error(f'Error in audit maintenance command: {str(e)}')
            raise
    
    def _run_cleanup(self, retention_days: int, dry_run: bool, verbose: bool) -> dict:
        """Ejecuta limpieza de logs antiguos."""
        if verbose:
            self.stdout.write('Ejecutando limpieza de logs antiguos...')
        
        stats = audit_service.cleanup_old_logs(
            retention_days=retention_days,
            dry_run=dry_run
        )
        
        if verbose:
            self.stdout.write(
                f'Logs procesados para limpieza: {stats["total"]}'
            )
            self.stdout.write(
                f'  - Activity logs: {stats["activity_logs"]}'
            )
            self.stdout.write(
                f'  - User activity logs: {stats["user_activity_logs"]}'
            )
            self.stdout.write(
                f'  - Admin action logs: {stats["admin_action_logs"]}'
            )
        
        return stats
    
    def _run_security_check(self, verbose: bool) -> dict:
        """Ejecuta análisis de seguridad."""
        if verbose:
            self.stdout.write('Ejecutando análisis de seguridad...')
        
        # Análisis de las últimas 24 horas
        analysis = audit_service.analyze_security_events(timedelta(hours=24))
        
        if verbose:
            self.stdout.write(f'Risk score: {analysis["risk_score"]}/100')
            self.stdout.write(f'Failed logins: {analysis["failed_logins"]["total"]}')
            self.stdout.write(f'Suspicious IPs: {len(analysis["suspicious_ips"])}')
            self.stdout.write(f'Active impersonations: {analysis["active_impersonations"]}')
            
            # Mostrar IPs sospechosas si las hay
            if analysis["suspicious_ips"]:
                self.stdout.write('IPs sospechosas:')
                for ip_data in analysis["suspicious_ips"]:
                    self.stdout.write(f'  - {ip_data["ip_address"]}: {ip_data["failed_count"]} fallos')
        
        return analysis
    
    def _generate_system_alerts(self, dry_run: bool, verbose: bool) -> dict:
        """Genera alertas automáticas del sistema."""
        if verbose:
            self.stdout.write('Generando alertas del sistema...')
        
        alerts_created = 0
        
        # Verificar logs con muchos errores
        failed_activities_count = audit_service._get_general_stats(
            timezone.now() - timedelta(hours=1),
            timezone.now()
        ).get('failed_activities', 0)
        
        if failed_activities_count > 10:  # Umbral configurable
            if not dry_run:
                audit_service.create_system_alert(
                    title='Alto número de actividades fallidas',
                    description=f'Se detectaron {failed_activities_count} actividades fallidas en la última hora',
                    level='warning',
                    category='performance',
                    metadata={'failed_count': failed_activities_count}
                )
            alerts_created += 1
        
        # Verificar análisis de seguridad
        security_analysis = audit_service.analyze_security_events(timedelta(hours=1))
        risk_score = security_analysis.get('risk_score', 0)
        
        if risk_score > 50:  # Umbral de riesgo alto
            if not dry_run:
                audit_service.create_system_alert(
                    title='Score de riesgo de seguridad elevado',
                    description=f'El score de riesgo alcanzó {risk_score}/100',
                    level='error' if risk_score > 80 else 'warning',
                    category='security',
                    metadata={'risk_score': risk_score, 'analysis': security_analysis}
                )
            alerts_created += 1
        
        # Verificar espacio en disco (simulado)
        disk_usage = 75  # Esto se obtendría de métricas reales
        if disk_usage > 80:
            if not dry_run:
                audit_service.create_system_alert(
                    title='Uso de disco elevado',
                    description=f'El uso de disco alcanzó {disk_usage}%',
                    level='warning',
                    category='performance',
                    metadata={'disk_usage': disk_usage}
                )
            alerts_created += 1
        
        if verbose:
            self.stdout.write(f'Alertas {"simuladas" if dry_run else "creadas"}: {alerts_created}')
        
        return {
            'alerts_created': alerts_created,
            'risk_score': risk_score,
            'failed_activities': failed_activities_count
        }
    
    def _run_optimization(self, dry_run: bool, verbose: bool) -> dict:
        """Ejecuta optimizaciones del sistema."""
        if verbose:
            self.stdout.write('Ejecutando optimizaciones...')
        
        optimizations = 0
        
        # Resolver alertas antiguas automáticamente
        if not dry_run:
            auto_resolved = SystemAlert.objects.filter(
                auto_resolve_at__lte=timezone.now(),
                is_resolved=False
            ).update(
                is_resolved=True,
                resolved_at=timezone.now(),
                resolution_notes='Auto-resolved by maintenance task'
            )
            optimizations += auto_resolved
        else:
            auto_resolved = SystemAlert.objects.filter(
                auto_resolve_at__lte=timezone.now(),
                is_resolved=False
            ).count()
            optimizations += auto_resolved
        
        # Actualizar métricas del sistema
        if not dry_run:
            today = timezone.now().date()
            
            # Crear/actualizar métrica de mantenimiento
            SystemMetrics.objects.update_or_create(
                metric_type='maintenance_runs',
                date=today,
                defaults={'count': 1}
            )
            
            # Métrica de alertas activas
            active_alerts = SystemAlert.objects.filter(
                is_active=True,
                is_resolved=False
            ).count()
            
            SystemMetrics.objects.update_or_create(
                metric_type='active_alerts',
                date=today,
                defaults={'count': active_alerts}
            )
        
        if verbose:
            self.stdout.write(f'Alertas auto-resueltas: {auto_resolved}')
            self.stdout.write(f'Optimizaciones aplicadas: {optimizations}')
        
        return {
            'auto_resolved_alerts': auto_resolved,
            'total_optimizations': optimizations
        }
    
    def _show_summary(self, results: dict, duration: float, verbose: bool):
        """Muestra resumen de todas las tareas ejecutadas."""
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('RESUMEN DE MANTENIMIENTO DE AUDITORÍA'))
        self.stdout.write('='*60)
        
        if 'cleanup' in results:
            cleanup = results['cleanup']
            self.stdout.write(f'LIMPIEZA DE LOGS:')
            self.stdout.write(f'  Total de logs procesados: {cleanup["total"]}')
        
        if 'security' in results:
            security = results['security']
            self.stdout.write(f'ANÁLISIS DE SEGURIDAD:')
            self.stdout.write(f'  Risk score: {security["risk_score"]}/100')
            self.stdout.write(f'  IPs sospechosas: {len(security["suspicious_ips"])}')
        
        if 'alerts' in results:
            alerts = results['alerts']
            self.stdout.write(f'GENERACIÓN DE ALERTAS:')
            self.stdout.write(f'  Alertas creadas: {alerts["alerts_created"]}')
        
        if 'optimization' in results:
            opt = results['optimization']
            self.stdout.write(f'OPTIMIZACIONES:')
            self.stdout.write(f'  Alertas auto-resueltas: {opt["auto_resolved_alerts"]}')
        
        self.stdout.write(f'\nTiempo total de ejecución: {duration:.2f} segundos')
        self.stdout.write('='*60)
        
        # Determinar el estado general
        total_issues = 0
        if 'security' in results:
            total_issues += results['security']['risk_score'] // 20  # Convertir score a número de issues
        if 'alerts' in results:
            total_issues += results['alerts']['alerts_created']
        
        if total_issues == 0:
            self.stdout.write(
                self.style.SUCCESS('✓ Sistema en estado óptimo - No se detectaron problemas')
            )
        elif total_issues <= 3:
            self.stdout.write(
                self.style.WARNING(f'⚠ Se detectaron {total_issues} problemas menores')
            )
        else:
            self.stdout.write(
                self.style.ERROR(f'✗ Se detectaron {total_issues} problemas que requieren atención')
            )