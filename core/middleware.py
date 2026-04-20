"""
Middleware personalizado para VeriHome - Seguridad y Performance
"""

import time
import logging
from django.http import JsonResponse, HttpResponse
from django.core.cache import cache
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user_model
import re

User = get_user_model()
logger = logging.getLogger(__name__)


class RateLimitMiddleware(MiddlewareMixin):
    """Middleware para rate limiting por IP y usuario.

    BUG-E2E-04 fix: límites elevados para usuarios autenticados (antes 300/h
    bloqueaba tests E2E y dashboards con muchas tarjetas), granularidad por
    endpoint y exención explícita para localhost en DEBUG.
    """

    LOCAL_IPS = {"127.0.0.1", "::1", "localhost"}

    def __init__(self, get_response):
        super().__init__(get_response)
        self.rate_limits = {
            # Anti brute-force estricto para login/register/reset
            "auth_strict": {"requests": 10, "window": 60},  # 10/min
            "auth": {"requests": 60, "window": 300},  # 60 / 5 min (refresh, me)
            # Dashboards y navegación autenticada: suficiente para uso intensivo
            "api_authenticated": {"requests": 3000, "window": 3600},
            # API anónima (lista pública de propiedades, etc.)
            "api_anonymous": {"requests": 300, "window": 3600},
            "admin": {"requests": 1000, "window": 3600},
            "default": {"requests": 300, "window": 3600},
        }

    def process_request(self, request):
        """Procesa la request para aplicar rate limiting."""
        ip = self.get_client_ip(request)

        # BUG-E2E-04: exención local en desarrollo
        if settings.DEBUG and ip in self.LOCAL_IPS:
            return None

        endpoint_type = self.get_endpoint_type(request)
        limits = self.rate_limits.get(endpoint_type, self.rate_limits["default"])

        cache_key = f"rate_limit:{endpoint_type}:{ip}"
        if hasattr(request, "user") and request.user.is_authenticated:
            cache_key += f":{request.user.id}"

        current_requests = cache.get(cache_key, 0)

        if current_requests >= limits["requests"]:
            logger.warning(
                f"Rate limit exceeded for {ip} on {endpoint_type}: "
                f"{current_requests}/{limits['requests']}"
            )
            return JsonResponse(
                {
                    "error": "Rate limit exceeded",
                    "detail": f"Too many requests. Limit: {limits['requests']} per {limits['window']} seconds",
                    "retry_after": limits["window"],
                },
                status=429,
            )

        cache.set(cache_key, current_requests + 1, timeout=limits["window"])

        response = self.get_response(request)
        if hasattr(response, "__setitem__"):
            response["X-RateLimit-Limit"] = str(limits["requests"])
            response["X-RateLimit-Remaining"] = str(
                limits["requests"] - current_requests - 1
            )
            response["X-RateLimit-Reset"] = str(int(time.time()) + limits["window"])

        return response

    def get_client_ip(self, request):
        """Obtiene la IP real del cliente."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip

    # Endpoints con brute-force estricto
    _STRICT_AUTH_PATTERNS = (
        "/api/v1/users/auth/login/",
        "/api/v1/users/auth/register",
        "/api/v1/users/auth/forgot-password/",
        "/api/v1/users/auth/reset-password",
    )

    def get_endpoint_type(self, request):
        """Determina el tipo de endpoint basado en la ruta + autenticación."""
        path = request.path

        if any(path.startswith(p) for p in self._STRICT_AUTH_PATTERNS):
            return "auth_strict"
        if path.startswith("/api/v1/users/auth/") or path.startswith("/api/v1/auth/"):
            return "auth"
        if path.startswith("/admin/"):
            return "admin"
        if path.startswith("/api/"):
            if hasattr(request, "user") and request.user.is_authenticated:
                return "api_authenticated"
            return "api_anonymous"
        return "default"


class SecurityHeadersMiddleware(MiddlewareMixin):
    """Middleware para agregar headers de seguridad."""

    def process_response(self, request, response):
        """Agrega headers de seguridad a todas las respuestas."""

        # Headers básicos de seguridad
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        }

        # X-Frame-Options según entorno (sin restricciones en desarrollo)
        if not settings.DEBUG:
            # Solo agregar X-Frame-Options en producción
            security_headers["X-Frame-Options"] = "DENY"
        # En desarrollo NO agregamos X-Frame-Options para permitir iframes cross-origin

        # CSP específico para API vs frontend
        if request.path.startswith("/api/"):
            security_headers["Content-Security-Policy"] = "default-src 'none'"
        else:
            security_headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://api.mapbox.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: blob: https://*.mapbox.com; "
                "connect-src 'self' https://*.mapbox.com wss://*.mapbox.com;"
            )

        # HSTS en producción con HTTPS
        if not settings.DEBUG and request.is_secure():
            security_headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )

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
        if hasattr(request, "_start_time"):
            duration = time.time() - request._start_time

            # Log requests lentas
            if duration > 2.0:  # Más de 2 segundos
                logger.warning(
                    f"Slow request: {request.method} {request.path} "
                    f"took {duration:.2f}s from IP {self.get_client_ip(request)}"
                )

            # --- Slow query logging (Fase 3.2) ---
            # Cuando DEBUG=True o SLOW_QUERY_LOG=true en env, cada query
            # SQL que haya tardado más de SLOW_QUERY_THRESHOLD_MS se
            # loggea con tag `slow_query`. Útil para localizar N+1
            # problems y queries que hay que mover a raw SQL o caché.
            enabled = bool(
                getattr(settings, "DEBUG", False)
                or getattr(settings, "SLOW_QUERY_LOG", False)
            )
            if enabled:
                try:
                    from django.db import connection

                    threshold_ms = float(
                        getattr(settings, "SLOW_QUERY_THRESHOLD_MS", 500)
                    )
                    for q in connection.queries:
                        q_time_ms = float(q.get("time", 0)) * 1000
                        if q_time_ms >= threshold_ms:
                            sql_preview = (q.get("sql") or "")[:500]
                            logger.warning(
                                "slow_query %s %s %.1fms · %s",
                                request.method,
                                request.path,
                                q_time_ms,
                                sql_preview,
                                extra={
                                    "slow_query": True,
                                    "duration_ms": q_time_ms,
                                    "method": request.method,
                                    "path": request.path,
                                },
                            )
                except Exception:  # pragma: no cover
                    pass

            # Agregar header de timing
            response["X-Response-Time"] = f"{duration:.3f}s"

            # Cache de métricas agregadas
            metrics_key = f"metrics:{request.method}:{request.path.split('?')[0]}"
            current_metrics = cache.get(
                metrics_key,
                {"count": 0, "total_time": 0, "max_time": 0, "min_time": float("inf")},
            )

            current_metrics["count"] += 1
            current_metrics["total_time"] += duration
            current_metrics["max_time"] = max(current_metrics["max_time"], duration)
            current_metrics["min_time"] = min(current_metrics["min_time"], duration)

            cache.set(metrics_key, current_metrics, timeout=3600)  # 1 hora

        return response

    def get_client_ip(self, request):
        """Obtiene la IP real del cliente."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip


class CSRFExemptMiddleware(MiddlewareMixin):
    """Middleware para eximir ciertas rutas del CSRF."""

    def __init__(self, get_response):
        super().__init__(get_response)
        self.exempt_patterns = [
            re.compile(pattern) for pattern in getattr(settings, "CSRF_EXEMPT_URLS", [])
        ]

    def process_request(self, request):
        """Marca requests específicas como exentas de CSRF."""
        for pattern in self.exempt_patterns:
            if pattern.match(request.path):
                setattr(request, "_dont_enforce_csrf_checks", True)
                break


class BlockedIPMiddleware(MiddlewareMixin):
    """Middleware para bloquear IPs maliciosas."""

    def __init__(self, get_response):
        super().__init__(get_response)
        self.blocked_ips = cache.get("blocked_ips", set())
        self.blocked_user_agents = [
            "sqlmap",
            "nikto",
            "nmap",
            "masscan",
            "zap",
        ]

    def process_request(self, request):
        """Bloquea IPs y user agents maliciosos."""
        client_ip = self.get_client_ip(request)
        user_agent = request.META.get("HTTP_USER_AGENT", "").lower()

        # Verificar IP bloqueada
        if client_ip in self.blocked_ips:
            logger.warning(f"Blocked IP {client_ip} attempted access to {request.path}")
            return HttpResponse("Access Denied", status=403)

        # Verificar user agents maliciosos
        for blocked_ua in self.blocked_user_agents:
            if blocked_ua in user_agent:
                logger.warning(f"Blocked user agent {user_agent} from IP {client_ip}")
                # Agregar IP a lista de bloqueados temporalmente
                self.add_to_blocked_ips(client_ip, duration=3600)  # 1 hora
                return HttpResponse("Access Denied", status=403)

        return None

    def get_client_ip(self, request):
        """Obtiene la IP real del cliente."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            ip = x_forwarded_for.split(",")[0].strip()
        else:
            ip = request.META.get("REMOTE_ADDR")
        return ip

    def add_to_blocked_ips(self, ip, duration=3600):
        """Agrega una IP a la lista de bloqueados."""
        blocked_ips = cache.get("blocked_ips", set())
        blocked_ips.add(ip)
        cache.set("blocked_ips", blocked_ips, timeout=duration)
        logger.warning(f"IP {ip} blocked for {duration} seconds")


class APIVersioningMiddleware(MiddlewareMixin):
    """Middleware para manejar versionado de API."""

    def process_request(self, request):
        """Agrega información de versión de API."""
        if request.path.startswith("/api/"):
            # Extraer versión de la URL o headers
            version = "v1"  # Por defecto

            if "/v2/" in request.path:
                version = "v2"
            elif request.META.get("HTTP_API_VERSION"):
                version = request.META.get("HTTP_API_VERSION")

            request.api_version = version

        return None

    def process_response(self, request, response):
        """Agrega headers de versión de API."""
        if hasattr(request, "api_version"):
            response["API-Version"] = request.api_version
            response["API-Deprecated"] = "false"  # Para futuras deprecaciones

        return response
