"""
Optimizaciones de base de datos para VeriHome.
Incluye índices, queries optimizadas, connection pooling y monitoreo.
"""

import logging
from django.db import connection, connections, models
from django.db.models import Index, Q, Count, Avg, Sum, Min, Max
from django.core.management.base import BaseCommand
from django.conf import settings
from typing import List, Dict, Any, Optional
import time
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class DatabaseOptimizer:
    """Clase principal para optimizaciones de base de datos."""
    
    def __init__(self):
        self.connection = connection
        
    def create_performance_indexes(self):
        """Crear índices optimizados para mejor rendimiento."""
        indexes_to_create = [
            # Índices para User model
            {
                'table': 'users_user',
                'name': 'idx_user_email_active',
                'fields': ['email', 'is_active'],
                'unique': False
            },
            {
                'table': 'users_user',
                'name': 'idx_user_role_created',
                'fields': ['role', 'date_joined'],
                'unique': False
            },
            
            # Índices para Property model
            {
                'table': 'properties_property',
                'name': 'idx_property_type_status',
                'fields': ['property_type', 'status'],
                'unique': False
            },
            {
                'table': 'properties_property',
                'name': 'idx_property_location',
                'fields': ['city', 'state', 'country'],
                'unique': False
            },
            {
                'table': 'properties_property',
                'name': 'idx_property_price_range',
                'fields': ['rent_price', 'sale_price'],
                'unique': False
            },
            {
                'table': 'properties_property',
                'name': 'idx_property_landlord_created',
                'fields': ['landlord_id', 'created_at'],
                'unique': False
            },
            {
                'table': 'properties_property',
                'name': 'idx_property_featured_active',
                'fields': ['is_featured', 'is_active'],
                'unique': False
            },
            
            # Índices para Contract model
            {
                'table': 'contracts_contract',
                'name': 'idx_contract_property_status',
                'fields': ['property_id', 'status'],
                'unique': False
            },
            {
                'table': 'contracts_contract',
                'name': 'idx_contract_tenant_dates',
                'fields': ['tenant_id', 'start_date', 'end_date'],
                'unique': False
            },
            {
                'table': 'contracts_contract',
                'name': 'idx_contract_landlord_status',
                'fields': ['landlord_id', 'status'],
                'unique': False
            },
            
            # Índices para Message model
            {
                'table': 'messaging_message',
                'name': 'idx_message_conversation_created',
                'fields': ['conversation_id', 'created_at'],
                'unique': False
            },
            {
                'table': 'messaging_message',
                'name': 'idx_message_sender_read',
                'fields': ['sender_id', 'is_read'],
                'unique': False
            },
            
            # Índices para Payment model
            {
                'table': 'payments_payment',
                'name': 'idx_payment_contract_status',
                'fields': ['contract_id', 'status'],
                'unique': False
            },
            {
                'table': 'payments_payment',
                'name': 'idx_payment_due_date',
                'fields': ['due_date', 'status'],
                'unique': False
            },
            
            # Índices para Rating model
            {
                'table': 'ratings_rating',
                'name': 'idx_rating_target_type',
                'fields': ['target_user_id', 'rating_type'],
                'unique': False
            },
            {
                'table': 'ratings_rating',
                'name': 'idx_rating_author_created',
                'fields': ['author_id', 'created_at'],
                'unique': False
            },
            
            # Índices para PropertyView model
            {
                'table': 'properties_propertyview',
                'name': 'idx_property_view_property_date',
                'fields': ['property_id', 'viewed_at'],
                'unique': False
            },
            {
                'table': 'properties_propertyview',
                'name': 'idx_property_view_user_date',
                'fields': ['user_id', 'viewed_at'],
                'unique': False
            },
            
            # Índices para PropertyFavorite model
            {
                'table': 'properties_propertyfavorite',
                'name': 'idx_property_favorite_user_created',
                'fields': ['user_id', 'created_at'],
                'unique': False
            },
        ]
        
        for index_info in indexes_to_create:
            self._create_index_if_not_exists(index_info)
    
    def _create_index_if_not_exists(self, index_info: Dict[str, Any]):
        """Crear índice si no existe."""
        table = index_info['table']
        name = index_info['name']
        fields = index_info['fields']
        unique = index_info.get('unique', False)
        
        try:
            # Verificar si el índice ya existe
            with self.connection.cursor() as cursor:
                # Para SQLite
                if 'sqlite' in settings.DATABASES['default']['ENGINE']:
                    cursor.execute("""
                        SELECT name FROM sqlite_master 
                        WHERE type='index' AND name=?
                    """, [name])
                    
                    if not cursor.fetchone():
                        fields_str = ', '.join(fields)
                        unique_str = 'UNIQUE' if unique else ''
                        sql = f"CREATE {unique_str} INDEX {name} ON {table} ({fields_str})"
                        cursor.execute(sql)
                        logger.info(f"Índice creado: {name}")
                    else:
                        logger.debug(f"Índice ya existe: {name}")
                
                # Para PostgreSQL
                elif 'postgresql' in settings.DATABASES['default']['ENGINE']:
                    cursor.execute("""
                        SELECT indexname FROM pg_indexes 
                        WHERE indexname = %s
                    """, [name])
                    
                    if not cursor.fetchone():
                        fields_str = ', '.join(fields)
                        unique_str = 'UNIQUE' if unique else ''
                        sql = f"CREATE {unique_str} INDEX {name} ON {table} ({fields_str})"
                        cursor.execute(sql)
                        logger.info(f"Índice creado: {name}")
                    else:
                        logger.debug(f"Índice ya existe: {name}")
                        
        except Exception as e:
            logger.error(f"Error creando índice {name}: {e}")
    
    def analyze_query_performance(self, query: str, params: Optional[List] = None) -> Dict[str, Any]:
        """Analizar el rendimiento de una query."""
        params = params or []
        
        with self.connection.cursor() as cursor:
            # Medir tiempo de ejecución
            start_time = time.time()
            
            if 'sqlite' in settings.DATABASES['default']['ENGINE']:
                # Para SQLite, usar EXPLAIN QUERY PLAN
                explain_query = f"EXPLAIN QUERY PLAN {query}"
                cursor.execute(explain_query, params)
                explain_result = cursor.fetchall()
                
                # Ejecutar query real
                cursor.execute(query, params)
                result = cursor.fetchall()
                
            elif 'postgresql' in settings.DATABASES['default']['ENGINE']:
                # Para PostgreSQL, usar EXPLAIN ANALYZE
                explain_query = f"EXPLAIN (ANALYZE, BUFFERS) {query}"
                cursor.execute(explain_query, params)
                explain_result = cursor.fetchall()
                
                # Ejecutar query real
                cursor.execute(query, params)
                result = cursor.fetchall()
            
            end_time = time.time()
            execution_time = (end_time - start_time) * 1000  # en millisegundos
            
            return {
                'execution_time_ms': execution_time,
                'explain_plan': explain_result,
                'row_count': len(result),
                'query': query,
                'params': params
            }
    
    def optimize_connection_settings(self):
        """Optimizar configuraciones de conexión a la base de datos."""
        if 'sqlite' in settings.DATABASES['default']['ENGINE']:
            with self.connection.cursor() as cursor:
                # Optimizaciones para SQLite
                cursor.execute("PRAGMA journal_mode=WAL")
                cursor.execute("PRAGMA synchronous=NORMAL")
                cursor.execute("PRAGMA cache_size=10000")
                cursor.execute("PRAGMA temp_store=MEMORY")
                cursor.execute("PRAGMA mmap_size=268435456")  # 256MB
                cursor.execute("PRAGMA optimize")
                
                logger.info("SQLite optimizations applied")
                
        elif 'postgresql' in settings.DATABASES['default']['ENGINE']:
            with self.connection.cursor() as cursor:
                # Optimizaciones para PostgreSQL
                cursor.execute("SET work_mem = '32MB'")
                cursor.execute("SET maintenance_work_mem = '128MB'")
                cursor.execute("SET effective_cache_size = '1GB'")
                cursor.execute("SET random_page_cost = 1.1")
                
                logger.info("PostgreSQL optimizations applied")
    
    def vacuum_and_analyze(self):
        """Ejecutar VACUUM y ANALYZE para optimizar la base de datos."""
        try:
            with self.connection.cursor() as cursor:
                if 'sqlite' in settings.DATABASES['default']['ENGINE']:
                    cursor.execute("VACUUM")
                    cursor.execute("ANALYZE")
                    logger.info("SQLite VACUUM y ANALYZE ejecutados")
                    
                elif 'postgresql' in settings.DATABASES['default']['ENGINE']:
                    cursor.execute("VACUUM ANALYZE")
                    logger.info("PostgreSQL VACUUM ANALYZE ejecutado")
                    
        except Exception as e:
            logger.error(f"Error en VACUUM/ANALYZE: {e}")
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Obtener estadísticas de la base de datos."""
        stats = {}
        
        try:
            with self.connection.cursor() as cursor:
                if 'sqlite' in settings.DATABASES['default']['ENGINE']:
                    # Estadísticas de SQLite
                    cursor.execute("PRAGMA database_list")
                    databases = cursor.fetchall()
                    
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
                    tables = [row[0] for row in cursor.fetchall()]
                    
                    cursor.execute("SELECT name FROM sqlite_master WHERE type='index'")
                    indexes = [row[0] for row in cursor.fetchall()]
                    
                    # Tamaño de la base de datos
                    cursor.execute("PRAGMA page_count")
                    page_count = cursor.fetchone()[0]
                    cursor.execute("PRAGMA page_size")
                    page_size = cursor.fetchone()[0]
                    db_size = page_count * page_size
                    
                    stats = {
                        'engine': 'SQLite',
                        'databases': len(databases),
                        'tables': len(tables),
                        'indexes': len(indexes),
                        'size_bytes': db_size,
                        'size_mb': round(db_size / (1024 * 1024), 2),
                        'table_list': tables,
                        'index_list': indexes
                    }
                    
                elif 'postgresql' in settings.DATABASES['default']['ENGINE']:
                    # Estadísticas de PostgreSQL
                    cursor.execute("""
                        SELECT 
                            schemaname,
                            tablename,
                            attname,
                            n_distinct,
                            correlation
                        FROM pg_stats 
                        WHERE schemaname = 'public'
                        LIMIT 10
                    """)
                    pg_stats = cursor.fetchall()
                    
                    cursor.execute("""
                        SELECT 
                            pg_size_pretty(pg_database_size(current_database())) as size
                    """)
                    db_size = cursor.fetchone()[0]
                    
                    stats = {
                        'engine': 'PostgreSQL',
                        'size': db_size,
                        'stats_sample': pg_stats
                    }
                    
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas: {e}")
            stats['error'] = str(e)
        
        return stats

# Decorador para monitorear rendimiento de queries
@contextmanager
def monitor_query_performance(query_name: str = "Unknown"):
    """Context manager para monitorear el rendimiento de queries."""
    start_time = time.time()
    
    try:
        yield
    finally:
        end_time = time.time()
        execution_time = (end_time - start_time) * 1000
        
        if execution_time > 100:  # Más de 100ms
            logger.warning(f"Slow query detected: {query_name} - {execution_time:.2f}ms")
        elif execution_time > 50:  # Más de 50ms
            logger.info(f"Query performance: {query_name} - {execution_time:.2f}ms")
        else:
            logger.debug(f"Query performance: {query_name} - {execution_time:.2f}ms")

# Optimizaciones específicas para modelos
class OptimizedQuerySet(models.QuerySet):
    """QuerySet optimizado con prefetch y select_related automático."""
    
    def with_relations(self):
        """Incluir relaciones comunes para evitar N+1 queries."""
        return self.select_related().prefetch_related()
    
    def active(self):
        """Filtrar solo elementos activos."""
        if hasattr(self.model, 'is_active'):
            return self.filter(is_active=True)
        return self
    
    def recent(self, days: int = 30):
        """Filtrar elementos recientes."""
        from django.utils import timezone
        from datetime import timedelta
        
        if hasattr(self.model, 'created_at'):
            cutoff_date = timezone.now() - timedelta(days=days)
            return self.filter(created_at__gte=cutoff_date)
        return self

class OptimizedManager(models.Manager):
    """Manager optimizado con queries eficientes."""
    
    def get_queryset(self):
        return OptimizedQuerySet(self.model, using=self._db)
    
    def with_relations(self):
        return self.get_queryset().with_relations()
    
    def active(self):
        return self.get_queryset().active()
    
    def recent(self, days: int = 30):
        return self.get_queryset().recent(days)

# Utilidades para optimización de queries específicas
class PropertyQueryOptimizer:
    """Optimizaciones específicas para queries de propiedades."""
    
    @staticmethod
    def get_properties_with_stats():
        """Obtener propiedades con estadísticas calculadas."""
        from properties.models import Property
        
        return Property.objects.select_related(
            'landlord'
        ).prefetch_related(
            'images',
            'amenity_relations__amenity',
            'favorited_by',
            'property_views'
        ).annotate(
            views_count=Count('property_views'),
            favorites_count=Count('favorited_by'),
            avg_rating=Avg('property_ratings__rating')
        )
    
    @staticmethod
    def search_properties_optimized(filters: Dict[str, Any]):
        """Búsqueda optimizada de propiedades."""
        from properties.models import Property
        
        queryset = Property.objects.select_related('landlord')
        
        # Aplicar filtros de manera optimizada
        if filters.get('city'):
            queryset = queryset.filter(city__icontains=filters['city'])
        
        if filters.get('property_type'):
            queryset = queryset.filter(property_type=filters['property_type'])
        
        if filters.get('min_price'):
            queryset = queryset.filter(
                Q(rent_price__gte=filters['min_price']) |
                Q(sale_price__gte=filters['min_price'])
            )
        
        if filters.get('max_price'):
            queryset = queryset.filter(
                Q(rent_price__lte=filters['max_price']) |
                Q(sale_price__lte=filters['max_price'])
            )
        
        return queryset.order_by('-created_at')

class MessageQueryOptimizer:
    """Optimizaciones específicas para queries de mensajes."""
    
    @staticmethod
    def get_conversations_with_last_message():
        """Obtener conversaciones con el último mensaje."""
        from messaging.models import Conversation, Message
        
        return Conversation.objects.select_related(
            'participant1',
            'participant2'
        ).prefetch_related(
            models.Prefetch(
                'messages',
                queryset=Message.objects.order_by('-created_at')[:1],
                to_attr='last_message'
            )
        ).annotate(
            unread_count=Count(
                'messages',
                filter=Q(messages__is_read=False)
            )
        )

# Command para aplicar optimizaciones
class DatabaseOptimizationCommand(BaseCommand):
    """Comando de Django para aplicar optimizaciones de base de datos."""
    
    help = 'Aplica optimizaciones de base de datos'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--create-indexes',
            action='store_true',
            help='Crear índices de rendimiento',
        )
        parser.add_argument(
            '--vacuum',
            action='store_true',
            help='Ejecutar VACUUM y ANALYZE',
        )
        parser.add_argument(
            '--stats',
            action='store_true',
            help='Mostrar estadísticas de la base de datos',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Ejecutar todas las optimizaciones',
        )
    
    def handle(self, *args, **options):
        optimizer = DatabaseOptimizer()
        
        if options['create_indexes'] or options['all']:
            self.stdout.write('Creando índices de rendimiento...')
            optimizer.create_performance_indexes()
            self.stdout.write(
                self.style.SUCCESS('Índices creados exitosamente')
            )
        
        if options['vacuum'] or options['all']:
            self.stdout.write('Ejecutando VACUUM y ANALYZE...')
            optimizer.vacuum_and_analyze()
            self.stdout.write(
                self.style.SUCCESS('VACUUM y ANALYZE completados')
            )
        
        if options['stats'] or options['all']:
            self.stdout.write('Obteniendo estadísticas...')
            stats = optimizer.get_database_stats()
            self.stdout.write(f"Estadísticas: {stats}")
            
        if not any(options.values()):
            self.stdout.write(
                self.style.WARNING(
                    'No se especificaron opciones. Use --help para ver las opciones disponibles.'
                )
            )

# Instancia global del optimizador
db_optimizer = DatabaseOptimizer()