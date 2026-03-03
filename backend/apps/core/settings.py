"""
Django settings for core project.

Migrado desde sistema_antiguo/core/settings.py
Compatible con estructura backend/apps/
"""

from pathlib import Path
import os
import sys
from distutils.util import strtobool
from decouple import config


# Build paths inside the project like this: BASE_DIR / 'subdir'.
# BASE_DIR apunta a la raíz del proyecto (donde está manage.py)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent


# Quick-start development settings - unsuitable for production
SECRET_KEY = config('SECRET_KEY')
_debug_raw = str(config('DEBUG', default='False'))
try:
    DEBUG = bool(strtobool(_debug_raw))
except ValueError:
    DEBUG = False
DEBUG_TOOLBAR_ENABLED = config('DEBUG_TOOLBAR_ENABLED', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')


# Application definition

INSTALLED_APPS = [
    # Django Channels debe ir ANTES de django.contrib.staticfiles
    'daphne',  # ASGI server para Channels
    
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # API
    'rest_framework',

    # Security Apps
    'axes',
    
    # Channels
    'channels',
    
    # Development Tools
    'django_extensions',

    # Apps migradas a backend.apps.*
    'backend.apps.accounts',
    'backend.apps.institucion',
    'backend.apps.cursos',
    'backend.apps.academico',
    'backend.apps.matriculas',
    'backend.apps.notificaciones',
    'backend.apps.mensajeria',
    'backend.apps.comunicados',
    'backend.apps.auditoria',  # Sistema de auditoría (Ley 20.370)
    'backend.apps.subscriptions',  # Sistema de suscripciones y monetización
    'backend.apps.core',  # Modelos mejorados Fase 3
]

if DEBUG and DEBUG_TOOLBAR_ENABLED:
    INSTALLED_APPS.append('debug_toolbar')

AUTH_USER_MODEL = 'accounts.User'
LOGIN_URL = 'accounts:login'
LOGIN_REDIRECT_URL = 'dashboard'
LOGOUT_REDIRECT_URL = 'accounts:index'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'backend.apps.core.middleware.tenant.TenantMiddleware',
    
    # Middleware de suscripción (debe ir DESPUÉS de AuthenticationMiddleware)
    'backend.apps.subscriptions.middleware.SubscriptionMiddleware',
    
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    
    # Django-axes debe ir DESPUÉS de AuthenticationMiddleware
    'axes.middleware.AxesMiddleware',
    
    # Middleware de auditoría
    'backend.apps.auditoria.middleware.AuditoriaMiddleware',
    
    # Middleware de rendimiento (solo en DEBUG)
    'backend.apps.core.middleware.performance.QueryCountDebugMiddleware',
    'backend.apps.core.middleware.performance.SlowRequestLoggerMiddleware',
]

if DEBUG and DEBUG_TOOLBAR_ENABLED:
    MIDDLEWARE.insert(2, 'debug_toolbar.middleware.DebugToolbarMiddleware')

INTERNAL_IPS = config('INTERNAL_IPS', default='127.0.0.1,localhost').split(',')

ROOT_URLCONF = 'backend.apps.core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [os.path.join(BASE_DIR, 'frontend', 'templates')],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.apps.core.wsgi.application'

# ASGI Application para Django Channels (WebSocket)
ASGI_APPLICATION = 'backend.apps.core.routing.application'

# Configuración de Channel Layers
# Usar Redis en producción, InMemory en desarrollo
REDIS_URL = config('REDIS_URL', default=None)

if REDIS_URL:
    # Producción: Redis para escalabilidad
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [REDIS_URL],
            },
        },
    }
else:
    # Desarrollo: InMemory (solo para testing local)
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }


# Database
# Usar PostgreSQL en producción, SQLite en desarrollo
DATABASE_URL = config('DATABASE_URL', default=None)
DB_ENGINE = config('DB_ENGINE', default='sqlite')

if DATABASE_URL:
    # Producción: Usar DATABASE_URL (formato: postgresql://user:pass@host:port/dbname)
    import dj_database_url
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
elif DB_ENGINE == 'postgresql':
    # Producción: PostgreSQL con variables individuales
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': config('DB_NAME', default='colegio_db'),
            'USER': config('DB_USER', default='colegio_user'),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST': config('DB_HOST', default='localhost'),
            'PORT': config('DB_PORT', default='5432'),
            'CONN_MAX_AGE': 600,
            'CONN_HEALTH_CHECKS': True,
        }
    }
elif DB_ENGINE == 'mssql':
    # Alternativa: SQL Server (para Windows con AD auth)
    DATABASES = {
        'default': {
            'ENGINE': 'mssql',
            'NAME': config('DB_NAME', default='colegio_db'),
            'HOST': config('DB_HOST', default='localhost'),
            'USER': '',
            'PASSWORD': '',
            'OPTIONS': {
                'driver': 'ODBC Driver 17 for SQL Server',
                'extra_params': 'TrustServerCertificate=yes;Trusted_Connection=yes;',
            },
        }
    }
else:
    # Desarrollo: SQLite (solo para desarrollo local)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
        'OPTIONS': {
            'user_attributes': ('username', 'email', 'nombre', 'apellido_paterno', 'apellido_materno'),
            'max_similarity': 0.5,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    # Validadores personalizados para seguridad reforzada
    {
        'NAME': 'backend.apps.accounts.validators.ComplexityPasswordValidator',
    },
    {
        'NAME': 'backend.apps.accounts.validators.NoRepeatingCharactersValidator',
        'OPTIONS': {
            'max_repeating': 2,
        }
    },
    {
        'NAME': 'backend.apps.accounts.validators.NoSpacesValidator',
    },
    {
        'NAME': 'backend.apps.accounts.validators.ChileanPasswordValidator',
    },
]


# Internationalization
LANGUAGE_CODE = config('LANGUAGE_CODE', default='es-cl')
TIME_ZONE = config('TIME_ZONE', default='America/Santiago')
USE_I18N = True
USE_TZ = True


# Static files
STATIC_URL = 'static/'
STATICFILES_DIRS = [
    os.path.join(BASE_DIR, 'frontend', 'static'),
]

# Required for `python manage.py collectstatic`
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# File upload settings
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB

# SEGURIDAD: Solo extensiones de archivos de negocio. Nunca permitir .py, .js, .html u otros ejecutables.
# Si necesitas ampliar esta lista, evaluar riesgos de seguridad primero.
ALLOWED_UPLOAD_EXTENSIONS = {
    # Documentos
    '.pdf', '.doc', '.docx', '.txt', '.odt', '.rtf',
    # Presentaciones
    '.ppt', '.pptx', '.odp',
    # Hojas de cálculo
    '.xls', '.xlsx', '.ods', '.csv',
    # Imágenes
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp',
    # Archivos comprimidos (solo formatos comunes)
    '.zip',
}

# SEGURIDAD: Solo MIME types seguros. Nunca text/html, application/javascript u otros ejecutables.
ALLOWED_MIME_TYPES = {
    # Documentos
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.oasis.opendocument.text',
    'application/rtf',
    # Presentaciones
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.oasis.opendocument.presentation',
    # Hojas de cálculo
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.oasis.opendocument.spreadsheet',
    'text/csv',
    # Imágenes
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    # Archivos comprimidos
    'application/zip',
    'application/x-zip-compressed',
}

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Email Configuration
# Usar SMTP en producción, Console en desarrollo
EMAIL_HOST = config('EMAIL_HOST', default=None)

if EMAIL_HOST:
    # Producción: SMTP real (ej: SendGrid, Gmail, AWS SES)
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = EMAIL_HOST
    EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
    EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
    EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
    EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
    EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
    EMAIL_TIMEOUT = config('EMAIL_TIMEOUT', default=10, cast=int)
else:
    # Desarrollo: Console (imprime emails en terminal)
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@colegio.cl')
SERVER_EMAIL = config('SERVER_EMAIL', default='root@localhost')


# ============================================================================
# CONFIGURACIÓN DE SEGURIDAD
# ============================================================================

# Django-Axes: Protección contra fuerza bruta
AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesStandaloneBackend',
    'django.contrib.auth.backends.ModelBackend',
]

AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = 1  # 1 hora
AXES_LOCK_OUT_AT_FAILURE = True
AXES_RESET_ON_SUCCESS = True
AXES_LOCKOUT_TEMPLATE = None
AXES_LOCKOUT_URL = None
AXES_VERBOSE = True
AXES_ENABLED = True
AXES_ENABLE_ACCESS_FAILURE_LOG = True
AXES_RESET_COOL_OFF_ON_FAILURE_DURING_LOCKOUT = False
AXES_LOCKOUT_PARAMETERS = ["username", "ip_address"]

# Configuración de Captcha (hCaptcha)
# SEGURIDAD: Nunca commitear las claves reales. Rotar inmediatamente si fueron expuestas.
HCAPTCHA_SITEKEY = config('HCAPTCHA_SITEKEY', default='')
HCAPTCHA_SECRET = config('HCAPTCHA_SECRET', default='')
HCAPTCHA_ENABLED = config('HCAPTCHA_ENABLED', default=False, cast=bool)

# Seguridad de Sesiones y Cookies
SESSION_COOKIE_SECURE = False  # True en producción con HTTPS
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_AGE = 3600 * 8  # 8 horas
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = False

# CSRF Protection
CSRF_COOKIE_SECURE = False  # True en producción con HTTPS
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_USE_SESSIONS = False
CSRF_FAILURE_VIEW = 'django.views.csrf.csrf_failure'

# Seguridad General
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'


# ============================================================================
# CONFIGURACIÓN DE CACHÉ Y RENDIMIENTO
# ============================================================================

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'TIMEOUT': 300,
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
        }
    },
    'template_cache': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'template-cache',
        'TIMEOUT': 600,
        'OPTIONS': {
            'MAX_ENTRIES': 500,
        }
    },
}

CACHE_TIMEOUT_SHORT = 60
CACHE_TIMEOUT_MEDIUM = 300
CACHE_TIMEOUT_LONG = 1800
CACHE_TIMEOUT_VERY_LONG = 3600

CONN_MAX_AGE = 600  # 10 minutos


# Configuración de Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {name} {module}.{funcName}:{lineno} - {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
        'simple': {
            'format': '[{levelname}] {asctime} - {message}',
            'style': '{',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'filters': {
        'require_debug_false': {
            '()': 'django.utils.log.RequireDebugFalse',
        },
        'require_debug_true': {
            '()': 'django.utils.log.RequireDebugTrue',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
            'filters': ['require_debug_true'],
        },
        'file_errors': {
            'level': 'ERROR',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'errors.log'),
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'file_general': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(BASE_DIR, 'logs', 'general.log'),
            'maxBytes': 1024 * 1024 * 10,  # 10 MB
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file_general', 'file_errors'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file_errors'],
            'level': 'ERROR',
            'propagate': False,
        },
        'backend.apps': {
            'handlers': ['console', 'file_general', 'file_errors'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Crear directorio de logs si no existe
LOGS_DIR = os.path.join(BASE_DIR, 'logs')
if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)

# Configuraciones HTTPS para producción
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
else:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False

# Test settings
if 'test' in sys.argv:
    # Disable custom password validators for tests
    AUTH_PASSWORD_VALIDATORS = [
        {
            'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
            'OPTIONS': {
                'min_length': 1,  # Very short for tests
            }
        },
    ]
