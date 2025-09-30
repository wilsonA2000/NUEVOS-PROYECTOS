"""
Configuración de Django para la plataforma VeriHome.

VeriHome - Plataforma Inmobiliaria Revolucionaria
Desarrollada para conectar arrendadores, arrendatarios y prestadores de servicios.
"""

import os
from pathlib import Path
from decouple import config
from datetime import timedelta

# Construir rutas dentro del proyecto como: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Configuraciones de seguridad
SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1,0.0.0.0,testserver', cast=lambda v: [s.strip() for s in v.split(',')]) + ['testserver']

# Definición de aplicaciones
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',
    
    # Third party apps
    'channels',
    'rest_framework',
    'rest_framework_simplejwt',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'corsheaders',
    'django_filters',
    'django_redis',
    'django_celery_beat',
    'django_celery_results',
    
    # Local apps
    'core.apps.CoreConfig',
    'users.apps.UsersConfig',
    'properties.apps.PropertiesConfig',
    'contracts.apps.ContractsConfig',
    'payments.apps.PaymentsConfig',
    'messaging.apps.MessagingConfig',
    'ratings.apps.RatingsConfig',
    'matching.apps.MatchingConfig',
    'requests.apps.RequestsConfig',
    'services.apps.ServicesConfig',
    'dashboard.apps.DashboardConfig',
    # 'analytics.apps.AnalyticsConfig',  # Comentado temporalmente
    # 'maintenance.apps.MaintenanceConfig',  # Comentado temporalmente
    # 'notifications.apps.NotificationsConfig',  # Comentado temporalmente
]

MIDDLEWARE = [
    # Security and performance middleware (orden importante)
    'core.middleware.BlockedIPMiddleware',
    'core.middleware.RateLimitMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.locale.LocaleMiddleware',
    'django.middleware.common.CommonMiddleware',
    'core.middleware.CSRFExemptMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',  # Deshabilitado para permitir iframes en desarrollo
    'allauth.account.middleware.AccountMiddleware',
    # Middleware de impersonación y logging
    'users.middleware.ImpersonationMiddleware',
    'users.middleware.AdminActionLoggingMiddleware',
    # Performance monitoring y security headers
    'core.middleware.PerformanceMonitoringMiddleware',
    'core.middleware.SecurityHeadersMiddleware',
    'core.middleware.APIVersioningMiddleware',
]

ROOT_URLCONF = 'verihome.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
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
        },
    },
]

WSGI_APPLICATION = 'verihome.wsgi.application'
ASGI_APPLICATION = 'verihome.asgi.application'

# Database Configuration
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# Import database configuration manager
import sys
sys.path.append(str(BASE_DIR / 'scripts' / 'database'))
from database_config import get_database_config, validate_database_config

try:
    # Validate and get database configuration
    validate_database_config()
    DATABASES = get_database_config()
except Exception as e:
    print(f"Database configuration error: {e}")
    # Fallback to SQLite for development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
SQLITE_FALLBACK = {
    'ENGINE': 'django.db.backends.sqlite3',
    'NAME': BASE_DIR / 'db.sqlite3',
}

# Configuración de cache - Comentado porque se define más abajo con Redis
# CACHES = {
#     'default': {
#         'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
#         'LOCATION': 'unique-snowflake',
#     }
# }

# Usar base de datos para sesiones temporalmente - Comentado porque se define más abajo con Redis
# SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Configuración de internacionalización
LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/Bogota'
USE_I18N = True
USE_TZ = True

LANGUAGES = [
    ('es', 'Español'),
    ('en', 'English'),
]

LOCALE_PATHS = [
    BASE_DIR / 'locale',
]

# Configuración de archivos estáticos
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'static'
STATICFILES_DIRS = [
    BASE_DIR / 'static' / 'frontend',  # Frontend React build
]

# Configuración de archivos multimedia
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Configuración de Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
}

# Configuración de JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# Configuración de CORS
# En desarrollo, permitir todos los orígenes
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Configuración específica de CORS para desarrollo
if DEBUG:
    CORS_ALLOWED_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://10.5.219.151:5173",  # IP adicional para desarrollo
    ]
else:
    # En producción usar dominios específicos
    CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='', cast=lambda v: [s.strip() for s in v.split(',') if s.strip()])

# Configuración de CSRF para APIs
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://10.5.219.151:5173",  # IP adicional para desarrollo
]

# Excluir rutas de API del CSRF
CSRF_EXEMPT_URLS = [
    r'^/api/v1/.*$',
]

# Configuración de Django Allauth
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

SITE_ID = 1

# Configuración de django-allauth
ACCOUNT_AUTHENTICATION_METHOD = 'email'
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_EMAIL_VERIFICATION = 'mandatory'
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_USER_MODEL_USERNAME_FIELD = None

ACCOUNT_EMAIL_SUBJECT_PREFIX = '[VeriHome] '
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_EMAIL_CONFIRMATION_EXPIRE_DAYS = 3
ACCOUNT_ADAPTER = 'users.adapters.VeriHomeAccountAdapter'

# Configuración de Crispy Forms
CRISPY_ALLOWED_TEMPLATE_PACKS = "tailwind"
CRISPY_TEMPLATE_PACK = "tailwind"

# Configuración de archivos de carga
FILE_UPLOAD_MAX_MEMORY_SIZE = 52428800  # 50MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800  # 50MB

# Configuración de seguridad
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# Configuración adicional de seguridad para desarrollo
if DEBUG:
    # Configuración específica para desarrollo
    SECURE_SSL_REDIRECT = False
    SECURE_HSTS_SECONDS = 0
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SECURE_PROXY_SSL_HEADER = None
    # Permitir iframes desde localhost para visualización de documentos
    X_FRAME_OPTIONS = 'SAMEORIGIN'
else:
    # Configuración para producción
    SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
    SECURE_HSTS_SECONDS = config('SECURE_HSTS_SECONDS', default=31536000, cast=int)
    SECURE_HSTS_INCLUDE_SUBDOMAINS = config('SECURE_HSTS_INCLUDE_SUBDOMAINS', default=True, cast=bool)
    SECURE_HSTS_PRELOAD = config('SECURE_HSTS_PRELOAD', default=True, cast=bool)
    SESSION_COOKIE_SECURE = config('SESSION_COOKIE_SECURE', default=True, cast=bool)
    CSRF_COOKIE_SECURE = config('CSRF_COOKIE_SECURE', default=True, cast=bool)
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Configuración personalizada de VeriHome
VERIHOME_SETTINGS = {
    'MAX_PROPERTY_IMAGES': 20,
    'MAX_PROFILE_IMAGE_SIZE': 5242880,  # 5MB
    'SUPPORTED_IMAGE_FORMATS': ['JPEG', 'PNG', 'WebP'],
    'CONTRACT_EXPIRY_DAYS': 365,
    'RATING_SCALE': (1, 10),
    'MESSAGE_ATTACHMENT_MAX_SIZE': 10485760,  # 10MB
}

# Configuración de Redis para caching y Celery
REDIS_URL = config('REDIS_URL', default='redis://localhost:6379')

# Sistema de caching con Redis y fallback local
try:
    # Intentar configurar Redis
    CACHES = {
        'default': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': f'{REDIS_URL}/1',
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'SERIALIZER': 'django_redis.serializers.json.JSONSerializer',
                'COMPRESSOR': 'django_redis.compressors.zlib.ZlibCompressor',
                'CONNECTION_POOL_KWARGS': {
                    'max_connections': 50,
                    'retry_on_timeout': True,
                },
                'IGNORE_EXCEPTIONS': True,  # No fallar si Redis no está disponible
            },
            'KEY_PREFIX': 'verihome',
            'TIMEOUT': 300,  # 5 minutos por defecto
        },
        'sessions': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': f'{REDIS_URL}/2',
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'IGNORE_EXCEPTIONS': True,
            },
            'KEY_PREFIX': 'verihome_sessions',
            'TIMEOUT': 3600,  # 1 hora
        },
        'query_cache': {
            'BACKEND': 'django_redis.cache.RedisCache',
            'LOCATION': f'{REDIS_URL}/3',
            'OPTIONS': {
                'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                'IGNORE_EXCEPTIONS': True,
            },
            'KEY_PREFIX': 'verihome_queries',
            'TIMEOUT': 900,  # 15 minutos
        },
        'local_fallback': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'verihome-fallback',
            'TIMEOUT': 300,
        }
    }
    
    # Si estamos en desarrollo y Redis no está disponible, usar fallback local
    if DEBUG:
        import redis
        try:
            # Probar conexión a Redis
            r = redis.from_url(REDIS_URL)
            r.ping()
        except (redis.ConnectionError, redis.TimeoutError):
            # Redis no disponible, usar cache local
            CACHES = {
                'default': {
                    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                    'LOCATION': 'verihome-default',
                    'TIMEOUT': 300,
                },
                'sessions': {
                    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                    'LOCATION': 'verihome-sessions',
                    'TIMEOUT': 3600,
                },
                'query_cache': {
                    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                    'LOCATION': 'verihome-queries',
                    'TIMEOUT': 900,
                },
                'local_fallback': {
                    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                    'LOCATION': 'verihome-fallback',
                    'TIMEOUT': 300,
                }
            }
            print("Usando cache local como fallback - Redis no disponible")
            
except ImportError:
    # Si django_redis no está disponible, usar cache local
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'verihome-default',
            'TIMEOUT': 300,
        },
        'sessions': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'verihome-sessions',
            'TIMEOUT': 3600,
        },
        'query_cache': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'verihome-queries',
            'TIMEOUT': 900,
        },
        'local_fallback': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'verihome-fallback',
            'TIMEOUT': 300,
        }
    }

# Configuración de sesiones con fallback
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'sessions'
SESSION_COOKIE_AGE = 3600  # 1 hora

# Si usamos cache local, usar sesiones de base de datos como fallback más robusto
if 'locmem' in CACHES['default']['BACKEND']:
    SESSION_ENGINE = 'django.contrib.sessions.backends.cached_db'

# Cache timeout settings
CACHE_TIMEOUTS = {
    'properties_list': 300,  # 5 minutos
    'property_detail': 600,  # 10 minutos
    'user_profile': 900,     # 15 minutos
    'property_filters': 1800, # 30 minutos
    'stats': 300,            # 5 minutos
}

# Configuración de Celery para tareas asíncronas
CELERY_BROKER_URL = f'{REDIS_URL}/0'
CELERY_RESULT_BACKEND = f'{REDIS_URL}/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutos
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000

# Configuración de tareas programadas de Celery
CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-sessions': {
        'task': 'core.tasks.cleanup_expired_sessions',
        'schedule': 3600.0,  # cada hora
    },
    'process-notifications': {
        'task': 'notifications.tasks.process_pending_notifications',
        'schedule': 300.0,  # cada 5 minutos
    },
    'backup-database': {
        'task': 'core.tasks.backup_database',
        'schedule': 86400.0,  # diario
    },
}

# Campo de clave primaria por defecto
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Configuración de Django Channels para WebSocket
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [REDIS_URL + '/4'],  # Usar base de datos 4 para channels
            "capacity": 1500,
            "expiry": 60,
            "group_expiry": 86400,  # 24 horas
            "symmetric_encryption_keys": [SECRET_KEY],
        },
    },
}

# Fallback para desarrollo sin Redis
if DEBUG:
    try:
        import redis
        r = redis.from_url(REDIS_URL)
        r.ping()
    except ImportError:
        # Redis no está instalado
        CHANNEL_LAYERS = {
            'default': {
                'BACKEND': 'channels.layers.InMemoryChannelLayer'
            }
        }
        print("Usando InMemoryChannelLayer - Redis no instalado")
    except Exception as e:
        # Redis está instalado pero no se puede conectar
        CHANNEL_LAYERS = {
            'default': {
                'BACKEND': 'channels.layers.InMemoryChannelLayer'
            }
        }
        print(f"Usando InMemoryChannelLayer - Redis no disponible: {e}")

# Modelo de usuario personalizado
AUTH_USER_MODEL = 'users.User'

# Configuración de Sentry para monitoreo y APM
# Comentado temporalmente para pruebas de conectividad
# import sentry_sdk
# from sentry_sdk.integrations.django import DjangoIntegration
# from sentry_sdk.integrations.redis import RedisIntegration
# from sentry_sdk.integrations.celery import CeleryIntegration
# from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration  # No necesario para este proyecto

SENTRY_DSN = config('SENTRY_DSN', default='')
SENTRY_ENVIRONMENT = config('SENTRY_ENVIRONMENT', default='development')

# Comentado temporalmente para pruebas de conectividad
# if SENTRY_DSN and not DEBUG:
#     sentry_sdk.init(
#         dsn=SENTRY_DSN,
#         environment=SENTRY_ENVIRONMENT,
#         integrations=[
#             DjangoIntegration(
#                 transaction_style='url',
#                 middleware_spans=True,
#                 signals_spans=True,
#                 cache_spans=True,
#             ),
#             RedisIntegration(),
#             CeleryIntegration(monitor_beat_tasks=True),
#             # SqlalchemyIntegration(),  # No necesario
#         ],
#         # Performance Monitoring
#         traces_sample_rate=0.1,  # 10% de las transacciones
#         profiles_sample_rate=0.1,  # 10% de profiling
#         
#         # Error sampling
#         sample_rate=1.0,
#         
#         # Release tracking
#         release=config('SENTRY_RELEASE', default='latest'),
#         
#         # PII filtering
#         send_default_pii=False,
#         
#         # Performance thresholds
#         before_send_transaction=lambda event, hint: event if event.get('transaction', '').startswith('/api/') else None,
#         
#         # Custom tags
#         initial_scope={
#             'tags': {
#                 'component': 'verihome-backend',
#                 'server': config('SERVER_NAME', default='unknown'),
#             }
#         }
#     )

# Configuración de Email
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='verihomeadmi@gmail.com')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='VeriHome Platform <verihomeadmi@gmail.com>')
SERVER_EMAIL = config('SERVER_EMAIL', default='VeriHome Platform <verihomeadmi@gmail.com>')

# Configuración anti-spam para Gmail
EMAIL_TIMEOUT = 30
EMAIL_USE_LOCALTIME = False

# Gmail configurado - usar SMTP para envío real
# En desarrollo también se enviarán emails reales

# Configuración de logging optimizada para VeriHome
import os

# Asegurar que el directorio de logs exista
os.makedirs(BASE_DIR / 'logs', exist_ok=True)

# Importar configuración personalizada de logging
from core.logging import get_logging_config

# Usar configuración optimizada según el modo debug
LOGGING = get_logging_config(debug_mode=DEBUG)

# Configuraciones adicionales específicas de VeriHome
if not DEBUG:
    # En producción, agregar más handlers específicos
    LOGGING['handlers'].update({
        'performance_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': BASE_DIR / 'logs/performance.log',
            'maxBytes': 10485760,  # 10MB
            'backupCount': 10,
            'formatter': 'json',
        },
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'include_html': True,
        }
    })
    
    # Agregar loggers específicos para módulos de VeriHome
    LOGGING['loggers'].update({
        'django.db.backends': {
            'handlers': ['performance_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'users': {
            'handlers': ['activity_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'contracts': {
            'handlers': ['activity_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'properties': {
            'handlers': ['activity_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'payments': {
            'handlers': ['activity_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'ratings': {
            'handlers': ['activity_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'messaging': {
            'handlers': ['activity_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'verihome.performance': {
            'handlers': ['performance_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'verihome.audit': {
            'handlers': ['activity_file', 'security_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['mail_admins', 'file'],
            'level': 'ERROR',
            'propagate': False,
        },
    })
else:
    # En desarrollo, logging más simple y claro
    LOGGING['loggers'].update({
        'users': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'properties': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    })

# =============================================================================
# DJANGO CHANNELS CONFIGURATION
# =============================================================================

# ASGI Application
ASGI_APPLICATION = 'verihome.asgi.application'

# Channel Layers Configuration con Redis y fallback local
try:
    # Intentar configurar Channel Layers con Redis
    import redis
    import channels_redis
    
    # Probar conexión a Redis si estamos en desarrollo
    if DEBUG:
        try:
            r = redis.from_url(REDIS_URL)
            r.ping()
            redis_available = True
        except (redis.ConnectionError, redis.TimeoutError, ConnectionRefusedError):
            redis_available = False
            print("WARNING: Redis no disponible para WebSocket - Usando InMemoryChannelLayer")
    else:
        # En producción, asumir que Redis está disponible
        redis_available = True
    
    if redis_available:
        CHANNEL_LAYERS = {
            'default': {
                'BACKEND': 'channels_redis.core.RedisChannelLayer',
                'CONFIG': {
                    "hosts": [('127.0.0.1', 6379)],
                    "capacity": 1500,  # Máximo número de mensajes en cola
                    "expiry": 60,       # TTL en segundos
                    "group_expiry": 86400,  # TTL para grupos (24 horas)
                    "symmetric_encryption_keys": [SECRET_KEY[:32]],  # Encriptación
                    "prefix": "verihome_channels:",
                },
            },
        }
        print("SUCCESS: Django Channels configurado con Redis")
    else:
        # Fallback a InMemoryChannelLayer para desarrollo
        CHANNEL_LAYERS = {
            'default': {
                'BACKEND': 'channels.layers.InMemoryChannelLayer',
                'CONFIG': {
                    "capacity": 300,    # Menor capacidad para memoria
                    "expiry": 60,
                },
            },
        }
        print("INFO: Django Channels usando InMemoryChannelLayer (desarrollo)")
        
except ImportError as e:
    # Si channels_redis no está disponible, usar InMemoryChannelLayer
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
            'CONFIG': {
                "capacity": 300,
                "expiry": 60,
            },
        },
    }
    print(f"WARNING: channels_redis no disponible: {e}")
    print("INFO: Usando InMemoryChannelLayer como fallback")

# WebSocket Settings
WEBSOCKET_ACCEPT_ALL = DEBUG  # Solo aceptar todas las conexiones en desarrollo
WEBSOCKET_PING_INTERVAL = 20  # Ping cada 20 segundos
WEBSOCKET_PING_TIMEOUT = 10   # Timeout de ping 10 segundos

# Configuración adicional para WebSocket
if DEBUG:
    # En desarrollo, configuración más permisiva
    CHANNEL_LAYERS['default']['CONFIG'].update({
        'expiry': 300,  # 5 minutos en desarrollo
    })
else:
    # En producción, configuración más estricta
    CHANNEL_LAYERS['default']['CONFIG'].update({
        'expiry': 60,   # 1 minuto en producción
        'capacity': 2000,  # Mayor capacidad en producción
    })

# =============================================================================
# CONFIGURACIONES DE SEGURIDAD PARA PRODUCCIÓN
# =============================================================================

if not DEBUG:
    # HTTPS y SSL Settings
    SECURE_HSTS_SECONDS = 31536000  # 1 año
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_SSL_REDIRECT = True
    
    # Cookies Security
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_HTTPONLY = True
    CSRF_COOKIE_SAMESITE = 'Lax'
    
    # Content Security
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_BROWSER_XSS_FILTER = True
    # En producción mantener seguridad estricta
    X_FRAME_OPTIONS = 'DENY'
    SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'
    
    # Additional Security Headers
    SECURE_CROSS_ORIGIN_OPENER_POLICY = 'same-origin'
    
    # CORS para producción más restrictivo
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [
        "https://verihome.com",
        "https://www.verihome.com",
        "https://app.verihome.com",
    ]
    
    # Email backend para producción
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_USE_TLS = True
    
else:
    # Configuraciones de desarrollo más permisivas (actuales)
    CORS_ALLOW_ALL_ORIGINS = True
# Frontend URL for invitation emails
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')
