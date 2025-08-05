"""
Middleware personalizado para VeriHome - Seguridad y Performance
"""

import time
import json
import logging
from django.http import JsonResponse, HttpResponse
from django.core.cache import cache
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied
from datetime import timedelta
import re

User = get_user_model()
logger = logging.getLogger(__name__)

class RateLimitMiddleware(MiddlewareMixin):
    """Middleware para rate limiting por IP y usuario."""
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.rate_limits = {
            'api': {'requests': 1000, 'window': 3600},  # 1000 req/hour para API
            'auth': {'requests': 100, 'window': 900},    # 100 req/15min para auth (temporal)
            'admin': {'requests': 1000, 'window': 3600},  # 1000 req/hour para admin (desarrollo)
            'default': {'requests': 100, 'window': 3600}, # 100 req/hour por defecto
        }
    
    def process_request(self, request):
        """Procesa la request para aplicar rate limiting."""
        # Obtener IP del cliente
        ip = self.get_client_ip(request)
        
        # Determinar el tipo de endpoint
        endpoint_type = self.get_endpoint_type(request.path)
        
        # Obtener límites
        limits = self.rate_limits.get(endpoint_type, self.rate_limits['default'])
        
        # Crear clave de cache
        cache_key = f"rate_limit:{endpoint_type}:{ip}"
        if hasattr(request, 'user') and request.user.is_authenticated:
            cache_key += f":{request.user.id}"
        
        # Verificar límite
        current_requests = cache.get(cache_key, 0)
        
        if current_requests >= limits['requests']:
            logger.warning(
                f"Rate limit exceeded for {ip} on {endpoint_type}: "
                f"{current_requests}/{limits['requests']}"
            )
            return JsonResponse({
                'error': 'Rate limit exceeded',
                'detail': f"Too many requests. Limit: {limits['requests']} per {limits['window']} seconds",
                'retry_after': limits['window']
            }, status=429)
        
        # Incrementar contador
        cache.set(cache_key, current_requests + 1, timeout=limits['window'])
        
        # Agregar headers informativos
        response = self.get_response(request)
        if hasattr(response, '__setitem__'):
            response['X-RateLimit-Limit'] = str(limits['requests'])
            response['X-RateLimit-Remaining'] = str(limits['requests'] - current_requests - 1)
            response['X-RateLimit-Reset'] = str(int(time.time()) + limits['window'])
        
        return response
    
    def get_client_ip(self, request):
        """Obtiene la IP real del cliente."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def get_endpoint_type(self, path):
        """Determina el tipo de endpoint basado en la ruta."""
        if path.startswith('/api/v1/auth/'):
            return 'auth'
        elif path.startswith('/admin/'):
            return 'admin'
        elif path.startswith('/api/'):
            return 'api'
        else:
            return 'default'

class SecurityHeadersMiddleware(MiddlewareMixin):
    """Middleware para agregar headers de seguridad."""
    
    def process_response(self, request, response):
        """Agrega headers de seguridad a todas las respuestas."""
        
        # Headers básicos de seguridad
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        }
        
        # CSP específico para API vs frontend
        if request.path.startswith('/api/'):
            security_headers['Content-Security-Policy'] = "default-src 'none'"
        else:
            security_headers['Content-Security-Policy'] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.mapbox.com; "
                "style-src 'self' 'unsafe-inline' fonts.googleapis.com *.mapbox.com; "
                "font-src 'self' fonts.gstatic.com; "
                "img-src 'self' data: *.mapbox.com; "
                "connect-src 'self' *.mapbox.com;"
            )
        
        # HSTS en producción con HTTPS
        if not settings.DEBUG and request.is_secure():
            security_headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # Aplicar headers
        for header, value in security_headers.items():
            response[header] = value
        
        return response

class PerformanceMonitoringMiddleware(MiddlewareMixin):
    """Middleware para monitorear performance de requests."""
    
    def process_request(self, request):
        """Registra el inicio de la request."""
        request._start_time = time.time()
    
    def process_response(self, request, response):
        """Registra métricas de performance."""
        if hasattr(request, '_start_time'):
            duration = time.time() - request._start_time
            
            # Log requests lentas
            if duration > 2.0:  # Más de 2 segundos
                logger.warning(
                    f"Slow request: {request.method} {request.path} "
                    f"took {duration:.2f}s from IP {self.get_client_ip(request)}"
                )
            
            # Agregar header de timing
            response['X-Response-Time'] = f"{duration:.3f}s"
            
            # Métricas para Sentry/APM
            if hasattr(request, 'user') and request.user.is_authenticated:
                user_type = getattr(request.user, 'user_type', 'unknown')
            else:
                user_type = 'anonymous'
            
            # Cache de métricas agregadas
            metrics_key = f"metrics:{request.method}:{request.path.split('?')[0]}"
            current_metrics = cache.get(metrics_key, {
                'count': 0,
                'total_time': 0,
                'max_time': 0,
                'min_time': float('inf')
            })
            
            current_metrics['count'] += 1
            current_metrics['total_time'] += duration
            current_metrics['max_time'] = max(current_metrics['max_time'], duration)
            current_metrics['min_time'] = min(current_metrics['min_time'], duration)
            
            cache.set(metrics_key, current_metrics, timeout=3600)  # 1 hora
        
        return response
    
    def get_client_ip(self, request):
        """Obtiene la IP real del cliente."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class CSRFExemptMiddleware(MiddlewareMixin):
    """Middleware para eximir ciertas rutas del CSRF."""
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.exempt_patterns = [
            re.compile(pattern) for pattern in getattr(settings, 'CSRF_EXEMPT_URLS', [])
        ]
    
    def process_request(self, request):
        """Marca requests específicas como exentas de CSRF."""
        for pattern in self.exempt_patterns:
            if pattern.match(request.path):
                setattr(request, '_dont_enforce_csrf_checks', True)
                break

class BlockedIPMiddleware(MiddlewareMixin):
    """Middleware para bloquear IPs maliciosas."""
    
    def __init__(self, get_response):
        super().__init__(get_response)
        self.blocked_ips = cache.get('blocked_ips', set())
        self.blocked_user_agents = [
            'sqlmap',
            'nikto',
            'nmap',
            'masscan',
            'zap',
        ]
    
    def process_request(self, request):
        """Bloquea IPs y user agents maliciosos."""
        client_ip = self.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        
        # Verificar IP bloqueada
        if client_ip in self.blocked_ips:
            logger.warning(f"Blocked IP {client_ip} attempted access to {request.path}")
            return HttpResponse('Access Denied', status=403)
        
        # Verificar user agents maliciosos
        for blocked_ua in self.blocked_user_agents:
            if blocked_ua in user_agent:
                logger.warning(f"Blocked user agent {user_agent} from IP {client_ip}")
                # Agregar IP a lista de bloqueados temporalmente
                self.add_to_blocked_ips(client_ip, duration=3600)  # 1 hora
                return HttpResponse('Access Denied', status=403)
        
        return None
    
    def get_client_ip(self, request):
        """Obtiene la IP real del cliente."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def add_to_blocked_ips(self, ip, duration=3600):
        """Agrega una IP a la lista de bloqueados."""
        blocked_ips = cache.get('blocked_ips', set())
        blocked_ips.add(ip)
        cache.set('blocked_ips', blocked_ips, timeout=duration)
        logger.warning(f"IP {ip} blocked for {duration} seconds")

class APIVersioningMiddleware(MiddlewareMixin):
    """Middleware para manejar versionado de API."""
    
    def process_request(self, request):
        """Agrega información de versión de API."""
        if request.path.startswith('/api/'):
            # Extraer versión de la URL o headers
            version = 'v1'  # Por defecto
            
            if '/v2/' in request.path:
                version = 'v2'
            elif request.META.get('HTTP_API_VERSION'):
                version = request.META.get('HTTP_API_VERSION')
            
            request.api_version = version
        
        return None
    
    def process_response(self, request, response):
        """Agrega headers de versión de API."""
        if hasattr(request, 'api_version'):
            response['API-Version'] = request.api_version
            response['API-Deprecated'] = 'false'  # Para futuras deprecaciones
        
        return response