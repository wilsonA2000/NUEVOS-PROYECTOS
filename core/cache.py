"""
Sistema de cache avanzado para VeriHome.
Importa y expone las utilidades de cache_utils para compatibilidad.
"""

from django.core.cache import cache
from functools import wraps
import logging

# Importar todo desde cache_utils para mantener compatibilidad
from .cache_utils import *

logger = logging.getLogger(__name__)

# Versión del módulo
__version__ = '1.0.0'

# Configuraciones por defecto
DEFAULT_CACHE_TIMEOUT = 300  # 5 minutos
LONG_CACHE_TIMEOUT = 3600    # 1 hora
SHORT_CACHE_TIMEOUT = 60     # 1 minuto

# Patrones de cache comunes
CACHE_PATTERNS = {
    'properties': 'verihome:properties:*',
    'users': 'verihome:users:*',
    'contracts': 'verihome:contracts:*',
    'messages': 'verihome:messages:*',
    'dashboard': 'verihome:dashboard:*',
}

# Timeouts para diferentes tipos de cache
CACHE_TIMEOUTS = {
    'short': 60,        # 1 minuto
    'medium': 300,      # 5 minutos
    'long': 3600,       # 1 hora
    'properties': 900,  # 15 minutos
    'users': 1800,      # 30 minutos
    'search': 300,      # 5 minutos
}

# Manager de cache simple
class CacheManager:
    @staticmethod
    def get(key, default=None):
        return cache.get(key, default)
    
    @staticmethod
    def set(key, value, timeout=DEFAULT_CACHE_TIMEOUT):
        return cache.set(key, value, timeout)
    
    @staticmethod
    def delete(key):
        return cache.delete(key)

# Instancia global del manager
cache_manager = CacheManager()

# Decorador para cache de respuestas API
def cache_api_response(timeout=DEFAULT_CACHE_TIMEOUT, key_prefix='api'):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generar clave única
            cache_key = f"{key_prefix}:{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Intentar obtener del cache
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Ejecutar función y cachear resultado
            result = func(*args, **kwargs)
            cache.set(cache_key, result, timeout)
            return result
        return wrapper
    return decorator

# Funciones específicas de cache
def cache_property_list(properties, timeout=CACHE_TIMEOUTS['properties']):
    """Cachear lista de propiedades."""
    key = 'verihome:properties:list'
    cache.set(key, properties, timeout)
    return properties

def cache_property_detail(property_obj, timeout=CACHE_TIMEOUTS['properties']):
    """Cachear detalle de propiedad."""
    key = f'verihome:property:{property_obj.id}'
    cache.set(key, property_obj, timeout)
    return property_obj

# Clase SmartCache para compatibilidad
class SmartCache:
    @staticmethod
    def get_or_set(key, callable_func, timeout=DEFAULT_CACHE_TIMEOUT):
        """Obtener del cache o ejecutar función."""
        result = cache.get(key)
        if result is None:
            result = callable_func()
            cache.set(key, result, timeout)
        return result
    
    @staticmethod
    def invalidate_pattern(pattern):
        """Invalidar keys que coincidan con el patrón de manera eficiente."""
        try:
            from django.core.cache.backends.base import BaseCache
            from django.core.cache.backends.redis import RedisCache
            
            # Verificar si tenemos Redis disponible
            if hasattr(cache, '_cache') and hasattr(cache._cache, 'get_client'):
                # Redis cache - usar pattern matching
                try:
                    redis_client = cache._cache.get_client()
                    keys_to_delete = []
                    
                    # Usar SCAN para encontrar keys que coincidan
                    for key in redis_client.scan_iter(match=pattern):
                        if isinstance(key, bytes):
                            key = key.decode('utf-8')
                        keys_to_delete.append(key)
                    
                    if keys_to_delete:
                        redis_client.delete(*keys_to_delete)
                        logger.info(f"Deleted {len(keys_to_delete)} cache keys matching pattern: {pattern}")
                    else:
                        logger.debug(f"No cache keys found matching pattern: {pattern}")
                        
                except Exception as redis_error:
                    logger.warning(f"Redis pattern invalidation failed: {redis_error}")
                    # Fallback a invalidación específica
                    _invalidate_known_keys(pattern)
            else:
                # Memoria local o otro backend - usar lista conocida
                _invalidate_known_keys(pattern)
                
        except Exception as e:
            logger.error(f"Could not invalidate cache pattern {pattern}: {e}")
            # Solo como último recurso, invalidar keys específicas conocidas
            _invalidate_known_keys(pattern)
    
    @staticmethod
    def invalidate_all():
        """Limpiar todo el cache - solo para casos de emergencia."""
        logger.warning("EMERGENCY: Clearing entire cache")
        cache.clear()


def _invalidate_known_keys(pattern):
    """Fallback para invalidar keys conocidas basadas en el patrón."""
    # Mapeo de patrones a keys específicas conocidas
    pattern_mappings = {
        'verihome:properties:*': [
            'verihome:properties:list',
            'verihome:properties:featured',
            'verihome:properties:trending',
            'verihome:properties:search',
            'verihome:properties:stats',
        ],
        'verihome:users:*': [
            'verihome:users:stats',
            'verihome:users:active',
            'verihome:users:profiles',
        ],
        'verihome:contracts:*': [
            'verihome:contracts:active',
            'verihome:contracts:pending',
            'verihome:contracts:stats',
        ],
        'verihome:messages:*': [
            'verihome:messages:unread',
            'verihome:messages:threads',
            'verihome:messages:stats',
        ],
        'verihome:dashboard:*': [
            'verihome:dashboard:widgets',
            'verihome:dashboard:stats',
            'verihome:dashboard:notifications',
        ],
    }
    
    # Obtener keys específicas para el patrón
    keys_to_delete = pattern_mappings.get(pattern, [])
    
    # También intentar con el patrón directo
    if pattern.endswith('*'):
        base_pattern = pattern[:-1]
        # Agregar algunas variaciones comunes
        common_suffixes = ['list', 'detail', 'stats', 'search', 'featured']
        for suffix in common_suffixes:
            keys_to_delete.append(f"{base_pattern}{suffix}")
    else:
        keys_to_delete.append(pattern)
    
    # Eliminar keys individuales
    deleted_count = 0
    for key in keys_to_delete:
        try:
            if cache.get(key) is not None:
                cache.delete(key)
                deleted_count += 1
        except Exception as e:
            logger.debug(f"Could not delete cache key {key}: {e}")
    
    if deleted_count > 0:
        logger.info(f"Deleted {deleted_count} specific cache keys for pattern: {pattern}")
    else:
        logger.debug(f"No known cache keys found for pattern: {pattern}")

# Exportar lo que necesitan otros módulos
__all__ = [
    'cache_manager',
    'cache_api_response', 
    'cache_property_list',
    'cache_property_detail',
    'SmartCache',
    'CACHE_TIMEOUTS',
    'CacheManager',
    'DEFAULT_CACHE_TIMEOUT',
    'LONG_CACHE_TIMEOUT',
    'SHORT_CACHE_TIMEOUT',
]