"""
Comando de Django para monitorear el estado de la base de datos.
"""

from django.core.management.base import BaseCommand
from django.db import connection
from django.utils import timezone
import time


class Command(BaseCommand):
    help = 'Monitorea el estado de la base de datos y conexiones'

    def add_arguments(self, parser):
        parser.add_argument(
            '--interval',
            type=int,
            default=60,
            help='Intervalo en segundos para el monitoreo (default: 60)'
        )
        parser.add_argument(
            '--continuous',
            action='store_true',
            help='Ejecutar monitoreo continuo'
        )

    def handle(self, *args, **options):
        interval = options['interval']
        continuous = options['continuous']
        
        self.stdout.write(
            self.style.SUCCESS('Iniciando monitoreo de base de datos...')
        )
        
        try:
            if continuous:
                while True:
                    self.check_database_status()
                    time.sleep(interval)
            else:
                self.check_database_status()
                
        except KeyboardInterrupt:
            self.stdout.write(
                self.style.WARNING('\nMonitoreo interrumpido por el usuario')
            )

    def check_database_status(self):
        """Verifica el estado de la base de datos."""
        timestamp = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        
        try:
            with connection.cursor() as cursor:
                # Verificar conexión básica
                cursor.execute("SELECT 1")
                
                # Obtener información de conexiones
                cursor.execute("""
                    SELECT 
                        count(*) as total_connections,
                        count(*) FILTER (WHERE state = 'active') as active_connections,
                        count(*) FILTER (WHERE state = 'idle') as idle_connections
                    FROM pg_stat_activity 
                    WHERE datname = current_database()
                """)
                
                connections_info = cursor.fetchone()
                
                # Obtener tamaño de la base de datos
                cursor.execute("""
                    SELECT pg_size_pretty(pg_database_size(current_database()))
                """)
                
                db_size = cursor.fetchone()[0]
                
                # Obtener estadísticas de tablas principales
                cursor.execute("""
                    SELECT 
                        schemaname,
                        tablename,
                        n_tup_ins as inserts,
                        n_tup_upd as updates,
                        n_tup_del as deletes
                    FROM pg_stat_user_tables 
                    ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC 
                    LIMIT 10
                """)
                
                table_stats = cursor.fetchall()
                
                # Mostrar información
                self.stdout.write(f"\n[{timestamp}] Estado de la Base de Datos:")
                self.stdout.write(f"  Tamaño: {db_size}")
                self.stdout.write(f"  Conexiones totales: {connections_info[0]}")
                self.stdout.write(f"  Conexiones activas: {connections_info[1]}")
                self.stdout.write(f"  Conexiones inactivas: {connections_info[2]}")
                
                if table_stats:
                    self.stdout.write("  Tablas más activas:")
                    for stat in table_stats[:5]:
                        total_ops = stat[2] + stat[3] + stat[4]
                        if total_ops > 0:
                            self.stdout.write(
                                f"    {stat[1]}: {total_ops} operaciones "
                                f"(I:{stat[2]}, U:{stat[3]}, D:{stat[4]})"
                            )
                
                # Verificar consultas de larga duración
                cursor.execute("""
                    SELECT 
                        pid,
                        now() - pg_stat_activity.query_start AS duration,
                        query 
                    FROM pg_stat_activity 
                    WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
                    AND state = 'active'
                """)
                
                long_queries = cursor.fetchall()
                if long_queries:
                    self.stdout.write(
                        self.style.WARNING(
                            f"  ⚠️  {len(long_queries)} consultas de larga duración detectadas"
                        )
                    )
                    for query in long_queries:
                        self.stdout.write(f"    PID {query[0]}: {query[1]}")
                
                self.stdout.write(
                    self.style.SUCCESS("  ✅ Base de datos funcionando correctamente")
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"  ❌ Error al verificar base de datos: {str(e)}")
            )