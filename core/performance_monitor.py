"""
Monitor de Performance para VeriHome
Sistema de monitoreo en tiempo real de métricas de rendimiento
"""

import time
import psutil
import threading
from django.core.management.base import BaseCommand
from django.core.cache import cache
from django.db import connection
from django.conf import settings
import json
import logging
from datetime import datetime, timedelta
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Monitor de performance en tiempo real."""
    
    def __init__(self):
        self.metrics = defaultdict(lambda: deque(maxlen=100))
        self.alerts = []
        self.running = False
        self.check_interval = 30  # 30 segundos
        
        # Thresholds de alerta
        self.thresholds = {
            'cpu_percent': 80,
            'memory_percent': 85,
            'disk_percent': 90,
            'response_time_avg': 2.0,  # segundos
            'error_rate': 5.0,  # porcentaje
            'active_connections': 100,
            'cache_hit_rate': 90,  # mínimo esperado
        }
    
    def start_monitoring(self):
        """Inicia el monitoreo en un hilo separado."""
        self.running = True
        monitoring_thread = threading.Thread(target=self._monitor_loop)
        monitoring_thread.daemon = True
        monitoring_thread.start()
        logger.info("Performance monitoring started")
    
    def stop_monitoring(self):
        """Detiene el monitoreo."""
        self.running = False
        logger.info("Performance monitoring stopped")
    
    def _monitor_loop(self):
        """Loop principal de monitoreo."""
        while self.running:
            try:
                self._collect_system_metrics()
                self._collect_django_metrics()
                self._collect_cache_metrics()
                self._collect_database_metrics()
                self._check_alerts()
                self._store_metrics()
                
                time.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(self.check_interval)
    
    def _collect_system_metrics(self):
        """Recolecta métricas del sistema."""
        # CPU
        cpu_percent = psutil.cpu_percent(interval=1)
        self.metrics['cpu_percent'].append({
            'timestamp': datetime.now(),
            'value': cpu_percent
        })
        
        # Memoria
        memory = psutil.virtual_memory()
        self.metrics['memory_percent'].append({
            'timestamp': datetime.now(),
            'value': memory.percent
        })
        self.metrics['memory_available'].append({
            'timestamp': datetime.now(),
            'value': memory.available / (1024**3)  # GB
        })
        
        # Disco
        disk = psutil.disk_usage('/')
        self.metrics['disk_percent'].append({
            'timestamp': datetime.now(),
            'value': disk.percent
        })
        
        # Network I/O
        net_io = psutil.net_io_counters()
        self.metrics['network_bytes_sent'].append({
            'timestamp': datetime.now(),
            'value': net_io.bytes_sent
        })
        self.metrics['network_bytes_recv'].append({
            'timestamp': datetime.now(),
            'value': net_io.bytes_recv
        })
        
        # Procesos
        self.metrics['process_count'].append({
            'timestamp': datetime.now(),
            'value': len(psutil.pids())
        })
    
    def _collect_django_metrics(self):
        """Recolecta métricas específicas de Django."""
        # Request metrics desde cache
        request_metrics = cache.get('django_request_metrics', {})
        
        if request_metrics:
            # Tiempo de respuesta promedio
            total_time = request_metrics.get('total_response_time', 0)
            total_requests = request_metrics.get('total_requests', 1)
            avg_response_time = total_time / total_requests
            
            self.metrics['response_time_avg'].append({
                'timestamp': datetime.now(),
                'value': avg_response_time
            })
            
            # Rate de errores
            total_errors = request_metrics.get('total_errors', 0)
            error_rate = (total_errors / total_requests) * 100 if total_requests > 0 else 0
            
            self.metrics['error_rate'].append({
                'timestamp': datetime.now(),
                'value': error_rate
            })
            
            # Requests por minuto
            self.metrics['requests_per_minute'].append({
                'timestamp': datetime.now(),
                'value': request_metrics.get('requests_per_minute', 0)
            })
    
    def _collect_cache_metrics(self):
        """Recolecta métricas del cache Redis."""
        try:
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            info = redis_conn.info()
            
            # Memory usage
            self.metrics['redis_memory'].append({
                'timestamp': datetime.now(),
                'value': info.get('used_memory', 0) / (1024**2)  # MB
            })
            
            # Connected clients
            self.metrics['redis_clients'].append({
                'timestamp': datetime.now(),
                'value': info.get('connected_clients', 0)
            })
            
            # Hit rate
            hits = info.get('keyspace_hits', 0)
            misses = info.get('keyspace_misses', 0)
            total = hits + misses
            hit_rate = (hits / total) * 100 if total > 0 else 0
            
            self.metrics['cache_hit_rate'].append({
                'timestamp': datetime.now(),
                'value': hit_rate
            })
            
            # Operations per second
            self.metrics['redis_ops_per_sec'].append({
                'timestamp': datetime.now(),
                'value': info.get('instantaneous_ops_per_sec', 0)
            })
            
        except Exception as e:
            logger.error(f"Error collecting Redis metrics: {e}")
    
    def _collect_database_metrics(self):
        """Recolecta métricas de la base de datos."""
        try:
            # Conexiones activas
            with connection.cursor() as cursor:
                if 'postgresql' in settings.DATABASES['default']['ENGINE']:
                    cursor.execute("""
                        SELECT count(*) 
                        FROM pg_stat_activity 
                        WHERE state = 'active'
                    """)
                    active_connections = cursor.fetchone()[0]
                    
                    self.metrics['active_connections'].append({
                        'timestamp': datetime.now(),
                        'value': active_connections
                    })
                    
                    # Query performance
                    cursor.execute("""
                        SELECT 
                            avg(mean_exec_time) as avg_time,
                            sum(calls) as total_calls
                        FROM pg_stat_statements 
                        WHERE query NOT LIKE '%pg_stat_statements%'
                        LIMIT 1
                    """)
                    
                    result = cursor.fetchone()
                    if result:
                        avg_query_time, total_calls = result
                        self.metrics['avg_query_time'].append({
                            'timestamp': datetime.now(),
                            'value': avg_query_time or 0
                        })
                        self.metrics['total_db_calls'].append({
                            'timestamp': datetime.now(),
                            'value': total_calls or 0
                        })
                        
        except Exception as e:
            logger.error(f"Error collecting database metrics: {e}")
    
    def _check_alerts(self):
        """Verifica si alguna métrica supera los thresholds."""
        current_time = datetime.now()
        
        for metric_name, threshold in self.thresholds.items():
            if metric_name in self.metrics and self.metrics[metric_name]:
                latest_metric = self.metrics[metric_name][-1]
                value = latest_metric['value']
                
                # Verificar threshold
                if metric_name == 'cache_hit_rate':
                    # Para hit rate, alertar si está DEBAJO del threshold
                    if value < threshold:
                        self._create_alert(metric_name, value, threshold, 'below')
                else:
                    # Para otras métricas, alertar si está ARRIBA del threshold
                    if value > threshold:
                        self._create_alert(metric_name, value, threshold, 'above')
    
    def _create_alert(self, metric_name, current_value, threshold, direction):
        """Crea una alerta cuando se supera un threshold."""
        alert = {
            'timestamp': datetime.now(),
            'metric': metric_name,
            'current_value': current_value,
            'threshold': threshold,
            'direction': direction,
            'severity': self._get_alert_severity(metric_name, current_value, threshold)
        }
        
        self.alerts.append(alert)
        
        # Log de la alerta
        logger.warning(
            f"PERFORMANCE ALERT: {metric_name} is {direction} threshold. "
            f"Current: {current_value}, Threshold: {threshold}"
        )
        
        # Guardar en cache para dashboard
        cache.set('performance_alerts', self.alerts[-10:], timeout=3600)
    
    def _get_alert_severity(self, metric_name, current_value, threshold):
        """Determina la severidad de la alerta."""
        if metric_name in ['cpu_percent', 'memory_percent']:
            if current_value > threshold * 1.2:
                return 'critical'
            elif current_value > threshold * 1.1:
                return 'high'
            else:
                return 'medium'
        
        elif metric_name == 'response_time_avg':
            if current_value > threshold * 2:
                return 'critical'
            elif current_value > threshold * 1.5:
                return 'high'
            else:
                return 'medium'
        
        return 'medium'
    
    def _store_metrics(self):
        """Almacena métricas agregadas en cache."""
        # Preparar datos para almacenar
        metrics_summary = {}
        
        for metric_name, metric_data in self.metrics.items():
            if metric_data:
                latest = metric_data[-1]
                values = [m['value'] for m in list(metric_data)[-10:]]  # Últimos 10 valores
                
                metrics_summary[metric_name] = {
                    'current': latest['value'],
                    'timestamp': latest['timestamp'].isoformat(),
                    'avg_last_10': sum(values) / len(values),
                    'max_last_10': max(values),
                    'min_last_10': min(values),
                }
        
        # Guardar en cache
        cache.set('performance_metrics_summary', metrics_summary, timeout=300)
        
        # Guardar histórico en cache separado
        historical_data = cache.get('performance_historical', {})
        current_hour = datetime.now().replace(minute=0, second=0, microsecond=0)
        
        if current_hour.isoformat() not in historical_data:
            historical_data[current_hour.isoformat()] = metrics_summary
            
        # Mantener solo últimas 24 horas
        cutoff_time = current_hour - timedelta(hours=24)
        historical_data = {
            k: v for k, v in historical_data.items() 
            if datetime.fromisoformat(k) > cutoff_time
        }
        
        cache.set('performance_historical', historical_data, timeout=86400)  # 24 horas
    
    def get_current_metrics(self):
        """Obtiene las métricas actuales."""
        return cache.get('performance_metrics_summary', {})
    
    def get_alerts(self):
        """Obtiene las alertas actuales."""
        return cache.get('performance_alerts', [])
    
    def get_historical_data(self, hours=24):
        """Obtiene datos históricos."""
        historical_data = cache.get('performance_historical', {})
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        return {
            k: v for k, v in historical_data.items() 
            if datetime.fromisoformat(k) > cutoff_time
        }

# Instancia global del monitor
performance_monitor = PerformanceMonitor()

# Comando de Django para ejecutar el monitor
class Command(BaseCommand):
    """Comando para ejecutar el monitor de performance."""
    
    help = 'Start performance monitoring'
    
    def handle(self, *args, **options):
        """Ejecuta el monitor."""
        self.stdout.write("Starting VeriHome Performance Monitor...")
        
        try:
            performance_monitor.start_monitoring()
            
            # Mantener el proceso vivo
            while True:
                time.sleep(60)
                self.stdout.write(f"Monitor running... {datetime.now()}")
                
        except KeyboardInterrupt:
            self.stdout.write("Stopping monitor...")
            performance_monitor.stop_monitoring()
            self.stdout.write("Monitor stopped.")

def get_performance_report():
    """Genera un reporte de performance completo."""
    metrics = performance_monitor.get_current_metrics()
    alerts = performance_monitor.get_alerts()
    
    report = {
        'timestamp': datetime.now().isoformat(),
        'system_health': 'healthy',  # Por defecto
        'metrics': metrics,
        'active_alerts': len(alerts),
        'alerts': alerts[-5:],  # Últimas 5 alertas
        'recommendations': []
    }
    
    # Determinar estado del sistema
    critical_alerts = [a for a in alerts if a.get('severity') == 'critical']
    high_alerts = [a for a in alerts if a.get('severity') == 'high']
    
    if critical_alerts:
        report['system_health'] = 'critical'
    elif high_alerts:
        report['system_health'] = 'warning'
    elif alerts:
        report['system_health'] = 'degraded'
    
    # Generar recomendaciones
    if metrics.get('cpu_percent', {}).get('current', 0) > 80:
        report['recommendations'].append(
            "High CPU usage detected. Consider scaling up or optimizing code."
        )
    
    if metrics.get('memory_percent', {}).get('current', 0) > 85:
        report['recommendations'].append(
            "High memory usage detected. Check for memory leaks or scale up."
        )
    
    if metrics.get('cache_hit_rate', {}).get('current', 100) < 80:
        report['recommendations'].append(
            "Low cache hit rate. Review caching strategy."
        )
    
    return report