"""
Configuraciones de rendimiento para VeriHome.
Incluye optimizaciones de database, cache, y configuraciones de producción.
"""

import os
from pathlib import Path

# Database optimization settings
DATABASE_OPTIMIZATION = {
    'default': {
        'OPTIONS': {
            # SQLite optimizations
            'init_command': """
                PRAGMA journal_mode=WAL;
                PRAGMA synchronous=NORMAL;
                PRAGMA cache_size=1000;
                PRAGMA temp_store=MEMORY;
                PRAGMA mmap_size=268435456;
            """,
            'timeout': 20,
        },
        'CONN_MAX_AGE': 600,  # 10 minutes connection pooling
        'CONN_HEALTH_CHECKS': True,
    }
}

# PostgreSQL optimizations (for production)
POSTGRESQL_OPTIMIZATION = {
    'default': {
        'OPTIONS': {
            'options': '-c default_transaction_isolation=read-committed',
            'sslmode': 'require',
        },
        'CONN_MAX_AGE': 600,
        'CONN_HEALTH_CHECKS': True,
        'ATOMIC_REQUESTS': True,
    }
}

# Cache configuration templates
CACHE_CONFIGURATIONS = {
    'redis_optimized': {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': 'redis://localhost:6379/1',
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
                'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 100,
                    'retry_on_timeout': True,
                    'socket_keepalive': True,
                    'socket_keepalive_options': {},
                    'health_check_interval': 30,
                },
                'IGNORE_EXCEPTIONS': True,
            },
            'KEY_PREFIX': 'verihome',
            'TIMEOUT': 300,
        },
        'sessions': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': 'redis://localhost:6379/2',
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'retry_on_timeout': True,
                },
                'IGNORE_EXCEPTIONS': True,
            },
            'KEY_PREFIX': 'verihome_sessions',
            'TIMEOUT': 3600,
        },
        'query_cache': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': 'redis://localhost:6379/3',
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'retry_on_timeout': True,
                },
                'IGNORE_EXCEPTIONS': True,
            },
            'KEY_PREFIX': 'verihome_queries',
            'TIMEOUT': 900,
        },
        'templates': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': 'redis://localhost:6379/4',
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 20,
                    'retry_on_timeout': True,
                },
                'IGNORE_EXCEPTIONS': True,
            },
            'KEY_PREFIX': 'verihome_templates',
            'TIMEOUT': 3600,
        },
    }
}

# Session optimization
SESSION_OPTIMIZATION = {
    'SESSION_ENGINE': 'django.contrib.sessions.backends.cached_db',
    'SESSION_CACHE_ALIAS': 'sessions',
    'SESSION_COOKIE_AGE': 3600,  # 1 hour
    'SESSION_COOKIE_HTTPONLY': True,
    'SESSION_COOKIE_SECURE': True,  # For HTTPS
    'SESSION_COOKIE_SAMESITE': 'Lax',
    'SESSION_SAVE_EVERY_REQUEST': False,
    'SESSION_EXPIRE_AT_BROWSER_CLOSE': False,
}

# Static files optimization
STATIC_FILES_OPTIMIZATION = {
    'STATICFILES_STORAGE': 'django.contrib.staticfiles.storage.ManifestStaticFilesStorage',
    'STATICFILES_FINDERS': [
        'django.contrib.staticfiles.finders.FileSystemFinder',
        'django.contrib.staticfiles.finders.AppDirectoriesFinder',
    ],
    'STATIC_URL': '/static/',
    'STATIC_ROOT': 'staticfiles/',
    'STATICFILES_DIRS': [],
    'WHITENOISE_MAX_AGE': 31536000,  # 1 year
    'WHITENOISE_SKIP_COMPRESS_EXTENSIONS': ['jpg', 'jpeg', 'png', 'gif', 'webp', 'zip', 'gz', 'tgz', 'bz2', 'tbz', 'xz', 'br'],
}

# Media files optimization
MEDIA_FILES_OPTIMIZATION = {
    'MEDIA_URL': '/media/',
    'MEDIA_ROOT': 'media/',
    'FILE_UPLOAD_MAX_MEMORY_SIZE': 52428800,  # 50MB
    'DATA_UPLOAD_MAX_MEMORY_SIZE': 52428800,  # 50MB
    'FILE_UPLOAD_PERMISSIONS': 0o644,
    'FILE_UPLOAD_DIRECTORY_PERMISSIONS': 0o755,
}

# Logging optimization
LOGGING_OPTIMIZATION = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'json': {
            'format': '{"level": "%(levelname)s", "time": "%(asctime)s", "module": "%(module)s", "message": "%(message)s"}',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/performance.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 5,
            'formatter': 'json',
        },
        'error_file': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': 'logs/errors.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console', 'file'],
            'level': 'WARNING',  # Solo queries problemáticas
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'error_file'],
            'level': 'ERROR',
            'propagate': False,
        },
        'verihome.performance': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'verihome.cache': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Security optimizations for production
SECURITY_OPTIMIZATION = {
    'SECURE_SSL_REDIRECT': True,
    'SECURE_HSTS_SECONDS': 31536000,  # 1 year
    'SECURE_HSTS_INCLUDE_SUBDOMAINS': True,
    'SECURE_HSTS_PRELOAD': True,
    'SECURE_CONTENT_TYPE_NOSNIFF': True,
    'SECURE_BROWSER_XSS_FILTER': True,
    'SECURE_PROXY_SSL_HEADER': ('HTTP_X_FORWARDED_PROTO', 'https'),
    'SESSION_COOKIE_SECURE': True,
    'CSRF_COOKIE_SECURE': True,
    'CSRF_COOKIE_HTTPONLY': True,
    'X_FRAME_OPTIONS': 'DENY',
}

# Middleware optimizations
MIDDLEWARE_OPTIMIZATION = [
    # Security middleware (first)
    'django.middleware.security.SecurityMiddleware',
    
    # Compression middleware (early)
    'django.middleware.gzip.GZipMiddleware',
    
    # Cache middleware (early for caching)
    'django.middleware.cache.UpdateCacheMiddleware',
    
    # CORS (before common middleware)
    'corsheaders.middleware.CorsMiddleware',
    
    # Standard Django middleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    
    # Custom middleware (after Django middleware)
    'core.middleware.PerformanceMonitoringMiddleware',
    'core.middleware.SecurityHeadersMiddleware',
    
    # Cache middleware (last for caching)
    'django.middleware.cache.FetchFromCacheMiddleware',
]

# Email optimization
EMAIL_OPTIMIZATION = {
    'EMAIL_BACKEND': 'django.core.mail.backends.smtp.EmailBackend',
    'EMAIL_HOST': 'smtp.gmail.com',
    'EMAIL_PORT': 587,
    'EMAIL_USE_TLS': True,
    'EMAIL_USE_SSL': False,
    'EMAIL_TIMEOUT': 60,
    'EMAIL_SSL_CERTFILE': None,
    'EMAIL_SSL_KEYFILE': None,
}

# Celery optimization
CELERY_OPTIMIZATION = {
    'CELERY_BROKER_URL': 'redis://localhost:6379/0',
    'CELERY_RESULT_BACKEND': 'redis://localhost:6379/0',
    'CELERY_ACCEPT_CONTENT': ['json'],
    'CELERY_TASK_SERIALIZER': 'json',
    'CELERY_RESULT_SERIALIZER': 'json',
    'CELERY_TIMEZONE': 'America/Bogota',
    'CELERY_ENABLE_UTC': True,
    'CELERY_TASK_TRACK_STARTED': True,
    'CELERY_TASK_TIME_LIMIT': 30 * 60,  # 30 minutes
    'CELERY_WORKER_PREFETCH_MULTIPLIER': 1,
    'CELERY_WORKER_MAX_TASKS_PER_CHILD': 1000,
    'CELERY_WORKER_DISABLE_RATE_LIMITS': False,
    'CELERY_TASK_ACKS_LATE': True,
    'CELERY_WORKER_PREFETCH_MULTIPLIER': 1,
    
    # Optimizations for production
    'CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP': True,
    'CELERY_BROKER_CONNECTION_RETRY': True,
    'CELERY_BROKER_CONNECTION_MAX_RETRIES': 10,
    'CELERY_RESULT_BACKEND_ALWAYS_RETRY': True,
    'CELERY_RESULT_BACKEND_MAX_RETRIES': 10,
    
    # Memory optimizations
    'CELERY_WORKER_MAX_MEMORY_PER_CHILD': 200000,  # 200MB
    'CELERY_TASK_SOFT_TIME_LIMIT': 25 * 60,  # 25 minutes
}

# Template optimization
TEMPLATE_OPTIMIZATION = {
    'TEMPLATES': [
        {
            'BACKEND': 'django.template.backends.django.DjangoTemplates',
            'DIRS': ['templates'],
            'APP_DIRS': True,
            'OPTIONS': {
                'context_processors': [
                    'django.template.context_processors.debug',
                    'django.template.context_processors.request',
                    'django.contrib.auth.context_processors.auth',
                    'django.contrib.messages.context_processors.messages',
                    'django.template.context_processors.i18n',
                    'django.template.context_processors.media',
                    'django.template.context_processors.static',
                    'django.template.context_processors.tz',
                ],
                'debug': False,  # Always False in production
                'loaders': [
                    ('django.template.loaders.cached.Loader', [
                        'django.template.loaders.filesystem.Loader',
                        'django.template.loaders.app_directories.Loader',
                    ]),
                ],
            },
        },
    ]
}

# API optimization
API_OPTIMIZATION = {
    'REST_FRAMEWORK': {
        'DEFAULT_RENDERER_CLASSES': [
            'rest_framework.renderers.JSONRenderer',
        ],
        'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
        'PAGE_SIZE': 20,
        'DEFAULT_FILTER_BACKENDS': [
            'django_filters.rest_framework.DjangoFilterBackend',
            'rest_framework.filters.SearchFilter',
            'rest_framework.filters.OrderingFilter',
        ],
        'DEFAULT_THROTTLE_CLASSES': [
            'rest_framework.throttling.AnonRateThrottle',
            'rest_framework.throttling.UserRateThrottle'
        ],
        'DEFAULT_THROTTLE_RATES': {
            'anon': '100/hour',
            'user': '1000/hour'
        },
        'DEFAULT_VERSIONING_CLASS': 'rest_framework.versioning.AcceptHeaderVersioning',
        'DEFAULT_VERSION': 'v1',
        'ALLOWED_VERSIONS': ['v1'],
        'VERSION_PARAM': 'version',
    }
}

# CORS optimization
CORS_OPTIMIZATION = {
    'CORS_ALLOWED_ORIGINS': [
        # Add your frontend URLs here
    ],
    'CORS_ALLOW_CREDENTIALS': True,
    'CORS_ALLOW_ALL_ORIGINS': False,  # Never True in production
    'CORS_ALLOW_METHODS': [
        'DELETE',
        'GET',
        'OPTIONS',
        'PATCH',
        'POST',
        'PUT',
    ],
    'CORS_ALLOW_HEADERS': [
        'accept',
        'accept-encoding',
        'authorization',
        'content-type',
        'dnt',
        'origin',
        'user-agent',
        'x-csrftoken',
        'x-requested-with',
    ],
    'CORS_PREFLIGHT_MAX_AGE': 86400,  # 24 hours
}

# Compression optimization
COMPRESSION_OPTIMIZATION = {
    'USE_GZIP': True,
    'GZIP_CONTENT_TYPES': [
        'text/plain',
        'text/html',
        'text/css',
        'text/xml',
        'text/javascript',
        'application/xml',
        'application/xhtml+xml',
        'application/rss+xml',
        'application/javascript',
        'application/x-javascript',
        'application/json',
        'image/svg+xml',
    ],
}

def apply_performance_settings(settings_dict):
    """
    Aplicar configuraciones de rendimiento a settings.
    
    Args:
        settings_dict: Diccionario de configuraciones de Django
    """
    # Aplicar optimizaciones de base de datos
    if 'sqlite3' in settings_dict.get('DATABASES', {}).get('default', {}).get('ENGINE', ''):
        settings_dict['DATABASES']['default'].update(DATABASE_OPTIMIZATION['default'])
    elif 'postgresql' in settings_dict.get('DATABASES', {}).get('default', {}).get('ENGINE', ''):
        settings_dict['DATABASES']['default'].update(POSTGRESQL_OPTIMIZATION['default'])
    
    # Aplicar configuraciones de cache si Redis está disponible
    try:
        import redis
        redis_client = redis.Redis(host='localhost', port=6379, db=0)
        redis_client.ping()
        settings_dict['CACHES'] = CACHE_CONFIGURATIONS['redis_optimized']
    except:
        # Mantener configuración de cache existente
        pass
    
    # Aplicar optimizaciones de sesión
    settings_dict.update(SESSION_OPTIMIZATION)
    
    # Aplicar optimizaciones de archivos estáticos
    settings_dict.update(STATIC_FILES_OPTIMIZATION)
    
    # Aplicar optimizaciones de archivos multimedia
    settings_dict.update(MEDIA_FILES_OPTIMIZATION)
    
    # Aplicar optimizaciones de Celery
    settings_dict.update(CELERY_OPTIMIZATION)
    
    # Aplicar optimizaciones de API
    settings_dict.update(API_OPTIMIZATION)
    
    # Aplicar optimizaciones de CORS
    settings_dict.update(CORS_OPTIMIZATION)
    
    # En producción, aplicar optimizaciones de seguridad
    if not settings_dict.get('DEBUG', False):
        settings_dict.update(SECURITY_OPTIMIZATION)
        settings_dict['MIDDLEWARE'] = MIDDLEWARE_OPTIMIZATION
        settings_dict.update(TEMPLATE_OPTIMIZATION)
    
    return settings_dict