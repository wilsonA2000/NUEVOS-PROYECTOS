"""
Utilidades de caching para VeriHome - Sistema de caching inteligente.
"""

from django.core.cache import cache
from django.conf import settings
from django.utils.encoding import force_str
from functools import wraps
import hashlib
import json
import logging

logger = logging.getLogger(__name__)

def make_cache_key(*args, **kwargs):
    """Genera una clave de cache única basada en argumentos."""
    key_parts = []
    
    # Agregar argumentos posicionales
    for arg in args:
        if hasattr(arg, 'pk'):
            key_parts.append(f"{arg.__class__.__name__}_{arg.pk}")
        else:
            key_parts.append(str(arg))
    
    # Agregar argumentos con nombre
    for key, value in sorted(kwargs.items()):
        if hasattr(value, 'pk'):
            key_parts.append(f"{key}_{value.__class__.__name__}_{value.pk}")
        else:
            key_parts.append(f"{key}_{value}")
    
    # Crear hash único
    raw_key = "_".join(key_parts)
    if len(raw_key) > 200:  # Redis key length limit
        raw_key = hashlib.sha256(raw_key.encode()).hexdigest()
    
    return raw_key

def cache_queryset(cache_key, timeout=None, cache_alias='default'):
    """Decorator para cachear querysets."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generar clave de cache dinámica
            if callable(cache_key):
                key = cache_key(*args, **kwargs)
            else:
                key = cache_key
            
            # Intentar obtener del cache
            cached_result = cache.get(key, cache_alias=cache_alias)
            if cached_result is not None:
                logger.debug(f"Cache HIT: {key}")
                return cached_result
            
            # Ejecutar función y cachear resultado
            result = func(*args, **kwargs)
            
            # Determinar timeout
            actual_timeout = timeout or getattr(settings, 'CACHE_TIMEOUTS', {}).get('default', 300)
            
            # Cachear resultado
            cache.set(key, result, timeout=actual_timeout, cache_alias=cache_alias)
            logger.debug(f"Cache SET: {key} (timeout: {actual_timeout}s)")
            
            return result
        return wrapper
    return decorator

class CacheManager:
    """Gestor de cache para VeriHome."""
    
    @staticmethod
    def invalidate_property_cache(property_id):
        """Invalida el cache relacionado con una propiedad específica."""
        patterns = [
            f"property_detail_{property_id}",
            f"property_list_*",
            f"property_search_*",
            f"featured_properties",
            f"trending_properties",
            f"property_stats_*",
        ]
        
        for pattern in patterns:
            try:
                # Use SmartCache invalidation method for consistency
                from .cache import SmartCache
                SmartCache.invalidate_pattern(pattern)
            except Exception as e:
                logger.warning(f"Could not invalidate cache pattern {pattern}: {e}")
                # Fallback to simple delete
                try:
                    cache.delete(pattern)
                except Exception as delete_error:
                    logger.debug(f"Fallback delete also failed for {pattern}: {delete_error}")
    
    @staticmethod
    def invalidate_user_cache(user_id):
        """Invalida el cache relacionado con un usuario específico."""
        patterns = [
            f"user_profile_{user_id}",
            f"user_properties_{user_id}",
            f"user_favorites_{user_id}",
            f"user_stats_{user_id}",
        ]
        
        for pattern in patterns:
            try:
                # Use SmartCache invalidation method for consistency
                from .cache import SmartCache
                SmartCache.invalidate_pattern(pattern)
            except Exception as e:
                logger.warning(f"Could not invalidate cache pattern {pattern}: {e}")
                # Fallback to simple delete
                try:
                    cache.delete(pattern)
                except Exception as delete_error:
                    logger.debug(f"Fallback delete also failed for {pattern}: {delete_error}")
    
    @staticmethod
    def warm_up_cache():
        """Pre-carga el cache con datos frecuentemente accedidos."""
        from properties.models import Property
        from users.models import User
        
        # Cachear propiedades destacadas
        featured_properties = Property.objects.filter(
            is_featured=True, is_active=True
        ).select_related('landlord').prefetch_related('images')[:10]
        
        cache.set('featured_properties', list(featured_properties), timeout=1800)
        
        # Cachear estadísticas generales
        total_properties = Property.objects.filter(is_active=True).count()
        total_users = User.objects.filter(is_active=True).count()
        
        stats = {
            'total_properties': total_properties,
            'total_users': total_users,
        }
        
        cache.set('general_stats', stats, timeout=3600)
        
        logger.info("Cache warmed up successfully")

def cache_view_result(cache_key_func, timeout=None):
    """Decorator para cachear resultados de vistas API."""
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            # Generar clave de cache basada en la request
            cache_key = cache_key_func(request, *args, **kwargs)
            
            # Verificar cache
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                logger.debug(f"API Cache HIT: {cache_key}")
                return cached_response
            
            # Ejecutar vista
            response = view_func(self, request, *args, **kwargs)
            
            # Cachear solo respuestas exitosas
            if hasattr(response, 'status_code') and response.status_code == 200:
                actual_timeout = timeout or 300
                cache.set(cache_key, response, timeout=actual_timeout)
                logger.debug(f"API Cache SET: {cache_key}")
            
            return response
        return wrapper
    return decorator

def generate_property_list_cache_key(request, *args, **kwargs):
    """Genera clave de cache para lista de propiedades."""
    query_params = dict(request.GET)
    user_id = request.user.id if request.user.is_authenticated else 'anonymous'
    
    # Convertir UUIDs a strings para que sean serializables
    serializable_params = {}
    for key, value in query_params.items():
        if hasattr(value, '__iter__') and not isinstance(value, str):
            # Si es una lista, convertir cada elemento
            serializable_params[key] = [str(v) for v in value]
        else:
            # Convertir cualquier UUID u objeto a string
            serializable_params[key] = str(value)
    
    key_data = {
        'user_id': str(user_id),  # Convertir user_id a string también
        'params': serializable_params,
        'path': request.path
    }
    
    # Crear hash de los parámetros
    params_hash = hashlib.sha256(
        json.dumps(key_data, sort_keys=True).encode()
    ).hexdigest()[:16]
    
    return f"property_list_{params_hash}"

def generate_property_detail_cache_key(request, property_id, *args, **kwargs):
    """Genera clave de cache para detalle de propiedad."""
    user_id = request.user.id if request.user.is_authenticated else 'anonymous'
    return f"property_detail_{property_id}_{user_id}"

# Configuración de invalidación automática
CACHE_INVALIDATION_SIGNALS = {
    'properties.Property': [
        'property_list_*',
        'featured_properties',
        'trending_properties',
        'property_stats_*',
    ],
    'users.User': [
        'user_profile_*',
        'user_stats_*',
    ]
}

def invalidate_cache_on_signal(sender, instance, **kwargs):
    """Signal handler para invalidación automática de cache."""
    model_name = f"{sender._meta.app_label}.{sender._meta.model_name}"
    patterns = CACHE_INVALIDATION_SIGNALS.get(model_name, [])
    
    for pattern in patterns:
        try:
            # Use SmartCache invalidation method for consistency
            from .cache import SmartCache
            SmartCache.invalidate_pattern(pattern)
            logger.info(f"Auto-invalidated cache pattern: {pattern} for {model_name}")
        except Exception as e:
            logger.warning(f"Could not auto-invalidate cache pattern {pattern} for {model_name}: {e}")

class CacheStats:
    """Estadísticas de rendimiento del cache."""
    
    @staticmethod
    def get_cache_info():
        """Obtiene información del estado del cache."""
        try:
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            
            info = redis_conn.info()
            
            return {
                'redis_version': info.get('redis_version'),
                'used_memory': info.get('used_memory_human'),
                'connected_clients': info.get('connected_clients'),
                'total_commands_processed': info.get('total_commands_processed'),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'hit_rate': round(
                    info.get('keyspace_hits', 0) / 
                    max(info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0), 1) * 100, 2
                )
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {'error': str(e)}