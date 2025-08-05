"""
Sistema de cache avanzado con Redis para VeriHome.
Proporciona múltiples niveles de cache y estrategias optimizadas.
"""

import json
import hashlib
import logging
from datetime import timedelta
from typing import Any, Optional, Dict, List, Union, Callable
from functools import wraps
from django.core.cache import cache, caches
from django.core.cache.backends.base import InvalidCacheBackendError
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from django.core.serializers.json import DjangoJSONEncoder
import redis
from redis.exceptions import ConnectionError as RedisConnectionError

logger = logging.getLogger(__name__)

class CacheManager:
    """Gestor de cache con múltiples backends y estrategias."""
    
    def __init__(self):
        self.default_cache = caches['default']
        self.session_cache = caches.get('sessions', self.default_cache)
        self.query_cache = caches.get('query_cache', self.default_cache)
        self.redis_available = self._check_redis_availability()
        
    def _check_redis_availability(self) -> bool:
        """Verificar si Redis está disponible."""
        try:
            # Intentar conectar a Redis
            redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379')
            r = redis.from_url(redis_url)
            r.ping()
            return True
        except (RedisConnectionError, Exception) as e:
            logger.warning(f"Redis no disponible, usando cache local: {e}")
            return False
    
    def get(self, key: str, default: Any = None, cache_type: str = 'default') -> Any:
        """Obtener valor del cache."""
        try:
            cache_backend = self._get_cache_backend(cache_type)
            return cache_backend.get(key, default)
        except Exception as e:
            logger.error(f"Error al obtener del cache {key}: {e}")
            return default
    
    def set(self, key: str, value: Any, timeout: int = None, cache_type: str = 'default') -> bool:
        """Establecer valor en cache."""
        try:
            cache_backend = self._get_cache_backend(cache_type)
            cache_backend.set(key, value, timeout)
            return True
        except Exception as e:
            logger.error(f"Error al establecer en cache {key}: {e}")
            return False
    
    def delete(self, key: str, cache_type: str = 'default') -> bool:
        """Eliminar valor del cache."""
        try:
            cache_backend = self._get_cache_backend(cache_type)
            cache_backend.delete(key)
            return True
        except Exception as e:
            logger.error(f"Error al eliminar del cache {key}: {e}")
            return False
    
    def clear(self, cache_type: str = 'default') -> bool:
        """Limpiar cache completo."""
        try:
            cache_backend = self._get_cache_backend(cache_type)
            cache_backend.clear()
            return True
        except Exception as e:
            logger.error(f"Error al limpiar cache {cache_type}: {e}")
            return False
    
    def _get_cache_backend(self, cache_type: str):
        """Obtener backend de cache según el tipo."""
        if cache_type == 'sessions':
            return self.session_cache
        elif cache_type == 'queries':
            return self.query_cache
        else:
            return self.default_cache
    
    def get_or_set(self, key: str, default_func: Callable, timeout: int = 300, cache_type: str = 'default') -> Any:
        """Obtener del cache o establecer si no existe."""
        try:
            cache_backend = self._get_cache_backend(cache_type)
            value = cache_backend.get(key)
            if value is None:
                value = default_func()
                cache_backend.set(key, value, timeout)
            return value
        except Exception as e:
            logger.error(f"Error en get_or_set para {key}: {e}")
            return default_func()

# Instancia global del gestor de cache
cache_manager = CacheManager()

# Configuraciones de timeout por tipo de datos
CACHE_TIMEOUTS = {
    # Datos críticos y frecuentes
    'user_session': 3600,  # 1 hora
    'user_profile': 900,   # 15 minutos
    'user_permissions': 1800,  # 30 minutos
    
    # Propiedades
    'properties_list': 300,    # 5 minutos
    'property_detail': 600,    # 10 minutos
    'property_filters': 1800,  # 30 minutos
    'property_search': 180,    # 3 minutos
    
    # Contratos
    'contracts_list': 300,     # 5 minutos
    'contract_detail': 600,    # 10 minutos
    'contract_templates': 3600, # 1 hora
    
    # Mensajes
    'messages_list': 60,       # 1 minuto (datos dinámicos)
    'message_threads': 180,    # 3 minutos
    'unread_count': 30,        # 30 segundos
    
    # Estadísticas y reportes
    'dashboard_stats': 300,    # 5 minutos
    'analytics_data': 900,     # 15 minutos
    'system_health': 60,       # 1 minuto
    
    # Configuraciones
    'app_config': 3600,        # 1 hora
    'static_data': 7200,       # 2 horas
}

def generate_cache_key(*args, **kwargs) -> str:
    """Generar clave de cache única basada en argumentos."""
    key_data = {
        'args': args,
        'kwargs': sorted(kwargs.items()) if kwargs else {}
    }
    key_string = json.dumps(key_data, cls=DjangoJSONEncoder, sort_keys=True)
    return hashlib.md5(key_string.encode()).hexdigest()

def cache_result(key_prefix: str, timeout: int = 300, cache_type: str = 'default'):
    """Decorador para cachear resultados de funciones."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generar clave única
            cache_key = f"{key_prefix}:{generate_cache_key(*args, **kwargs)}"
            
            # Intentar obtener del cache
            cached_result = cache_manager.get(cache_key, cache_type=cache_type)
            if cached_result is not None:
                logger.debug(f"Cache hit para {cache_key}")
                return cached_result
            
            # Ejecutar función y cachear resultado
            logger.debug(f"Cache miss para {cache_key}")
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result, timeout, cache_type)
            
            return result
        return wrapper
    return decorator

def invalidate_cache_pattern(pattern: str, cache_type: str = 'default'):
    """Invalidar cache por patrón (requiere Redis)."""
    if not cache_manager.redis_available:
        logger.warning("Redis no disponible para invalidación por patrón")
        return False
    
    try:
        redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379')
        r = redis.from_url(redis_url)
        
        # Obtener claves que coincidan con el patrón
        keys = r.keys(f"*{pattern}*")
        if keys:
            r.delete(*keys)
            logger.info(f"Invalidadas {len(keys)} claves con patrón {pattern}")
        
        return True
    except Exception as e:
        logger.error(f"Error al invalidar cache por patrón {pattern}: {e}")
        return False

def cache_api_response(timeout: int = 300, vary_on: List[str] = None):
    """Decorador para cachear respuestas de API."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            # Generar clave basada en URL y parámetros
            cache_key_data = {
                'path': request.path,
                'method': request.method,
                'args': args,
                'kwargs': kwargs,
                'query_params': dict(request.GET.items()),
            }
            
            # Agregar headers específicos si se especifican
            if vary_on:
                for header in vary_on:
                    if header in request.headers:
                        cache_key_data[f'header_{header}'] = request.headers[header]
            
            cache_key = f"api_response:{generate_cache_key(cache_key_data)}"
            
            # Verificar cache
            cached_response = cache_manager.get(cache_key, cache_type='queries')
            if cached_response:
                logger.debug(f"API cache hit para {request.path}")
                return cached_response
            
            # Ejecutar vista y cachear respuesta
            response = view_func(request, *args, **kwargs)
            
            # Solo cachear respuestas exitosas
            if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
                cache_manager.set(cache_key, response, timeout, cache_type='queries')
                logger.debug(f"API response cacheada para {request.path}")
            
            return response
        return wrapper
    return decorator

class SmartCache:
    """Cache inteligente con estrategias avanzadas."""
    
    @staticmethod
    def get_properties_cache_key(filters: Dict = None, user_id: int = None) -> str:
        """Generar clave de cache para propiedades."""
        key_data = {
            'filters': filters or {},
            'user_id': user_id,
        }
        return f"properties:{generate_cache_key(key_data)}"
    
    @staticmethod
    def get_user_cache_key(user_id: int, data_type: str = 'profile') -> str:
        """Generar clave de cache para datos de usuario."""
        return f"user:{user_id}:{data_type}"
    
    @staticmethod
    def get_contract_cache_key(contract_id: int = None, user_id: int = None) -> str:
        """Generar clave de cache para contratos."""
        if contract_id:
            return f"contract:{contract_id}"
        elif user_id:
            return f"contracts:user:{user_id}"
        else:
            return "contracts:all"
    
    @staticmethod
    def cache_properties_list(properties_data: List[Dict], filters: Dict = None, user_id: int = None):
        """Cachear lista de propiedades con estrategia inteligente."""
        cache_key = SmartCache.get_properties_cache_key(filters, user_id)
        timeout = CACHE_TIMEOUTS.get('properties_list', 300)
        
        # Cachear lista principal
        cache_manager.set(cache_key, properties_data, timeout, 'queries')
        
        # Cachear propiedades individuales
        for prop in properties_data:
            prop_key = f"property:{prop.get('id')}"
            cache_manager.set(prop_key, prop, CACHE_TIMEOUTS.get('property_detail', 600))
    
    @staticmethod
    def invalidate_property_cache(property_id: int = None):
        """Invalidar cache relacionado con propiedades."""
        if property_id:
            # Invalidar propiedad específica
            cache_manager.delete(f"property:{property_id}")
        
        # Invalidar listas de propiedades (requiere Redis para patrones)
        if cache_manager.redis_available:
            invalidate_cache_pattern("properties:")
            invalidate_cache_pattern("property_search:")
        else:
            # Fallback: invalidar claves conocidas
            cache_manager.clear('queries')
    
    @staticmethod
    def cache_user_data(user_id: int, data: Dict, data_type: str = 'profile'):
        """Cachear datos de usuario."""
        cache_key = SmartCache.get_user_cache_key(user_id, data_type)
        timeout = CACHE_TIMEOUTS.get(f'user_{data_type}', 900)
        cache_manager.set(cache_key, data, timeout)
    
    @staticmethod
    def get_cached_user_data(user_id: int, data_type: str = 'profile') -> Optional[Dict]:
        """Obtener datos cacheados de usuario."""
        cache_key = SmartCache.get_user_cache_key(user_id, data_type)
        return cache_manager.get(cache_key)

# Decoradores específicos para VeriHome
def cache_property_list(timeout: int = None):
    """Cache específico para listas de propiedades."""
    timeout = timeout or CACHE_TIMEOUTS.get('properties_list', 300)
    return cache_result('properties_list', timeout, 'queries')

def cache_property_detail(timeout: int = None):
    """Cache específico para detalles de propiedades."""
    timeout = timeout or CACHE_TIMEOUTS.get('property_detail', 600)
    return cache_result('property_detail', timeout, 'queries')

def cache_user_profile(timeout: int = None):
    """Cache específico para perfiles de usuario."""
    timeout = timeout or CACHE_TIMEOUTS.get('user_profile', 900)
    return cache_result('user_profile', timeout)

def cache_dashboard_stats(timeout: int = None):
    """Cache específico para estadísticas del dashboard."""
    timeout = timeout or CACHE_TIMEOUTS.get('dashboard_stats', 300)
    return cache_result('dashboard_stats', timeout, 'queries')

# Utilidades de monitoreo
def get_cache_stats() -> Dict[str, Any]:
    """Obtener estadísticas del cache."""
    stats = {
        'redis_available': cache_manager.redis_available,
        'cache_backends': {},
    }
    
    try:
        # Estadísticas básicas de Django cache
        for cache_name in ['default', 'sessions', 'query_cache']:
            try:
                cache_backend = caches[cache_name]
                backend_info = {
                    'backend': str(cache_backend.__class__),
                    'location': getattr(cache_backend, '_cache', {}).get('location', 'N/A'),
                }
                stats['cache_backends'][cache_name] = backend_info
            except InvalidCacheBackendError:
                stats['cache_backends'][cache_name] = {'error': 'Backend not available'}
        
        # Si Redis está disponible, obtener estadísticas adicionales
        if cache_manager.redis_available:
            try:
                redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379')
                r = redis.from_url(redis_url)
                redis_info = r.info()
                stats['redis_info'] = {
                    'used_memory_human': redis_info.get('used_memory_human'),
                    'connected_clients': redis_info.get('connected_clients'),
                    'total_commands_processed': redis_info.get('total_commands_processed'),
                    'keyspace': redis_info.get('db0', {}),
                }
            except Exception as e:
                stats['redis_info'] = {'error': str(e)}
    
    except Exception as e:
        stats['error'] = str(e)
    
    return stats

def warm_up_cache():
    """Precalentar cache con datos frecuentemente accedidos."""
    logger.info("Iniciando precalentamiento de cache...")
    
    try:
        # Importar aquí para evitar dependencias circulares
        from properties.models import Property
        from users.models import User
        
        # Cachear propiedades más vistas
        featured_properties = Property.objects.filter(is_featured=True)[:10]
        properties_data = []
        for prop in featured_properties:
            prop_data = {
                'id': prop.id,
                'title': prop.title,
                'price': prop.price,
                'location': prop.location,
                # Agregar más campos según necesidad
            }
            properties_data.append(prop_data)
            
            # Cachear propiedad individual
            cache_key = f"property:{prop.id}"
            cache_manager.set(cache_key, prop_data, CACHE_TIMEOUTS.get('property_detail', 600))
        
        # Cachear lista de propiedades destacadas
        cache_manager.set(
            'properties:featured',
            properties_data,
            CACHE_TIMEOUTS.get('properties_list', 300),
            'queries'
        )
        
        logger.info(f"Cache precalentado con {len(properties_data)} propiedades destacadas")
        
    except Exception as e:
        logger.error(f"Error al precalentar cache: {e}")