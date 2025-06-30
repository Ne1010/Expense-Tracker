import environ
import os
from pathlib import Path
from logging.handlers import RotatingFileHandler

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables
env = environ.Env()
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# SECURITY
SECRET_KEY = env('SECRET_KEY', default='django-insecure-9^4_riyo$$z2=lexmco*@ikb29^g*he4v9td^#8q(2d=uq+go_')
DEBUG = env.bool('DEBUG', default=True)
ALLOWED_HOSTS = ['*']

# Applications
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'expenses',
    'django_admin_logs',
    'django_otp',
    'django_otp.plugins.otp_totp',
]

DJANGO_ADMIN_LOGS_DELETABLE = True
DJANGO_ADMIN_LOGS_ENABLED = True

# Middleware
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django_otp.middleware.OTPMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# URLs and Templates
ROOT_URLCONF = 'expense_manager.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'expense_manager.wsgi.application'

# Database: Attempt SQL Server, fallback to SQLite
try:
    DATABASES = {
        'default': {
            'ENGINE': 'mssql',
            'NAME': env('SQL_SERVER_DB', default='Billing'),
            'USER': '',
            'PASSWORD': '', 
            'HOST': env('SQL_SERVER_HOST', default='DELL\\SQLEXPRESS'),
            'PORT': '',
            'OPTIONS': {
                'driver': 'ODBC Driver 17 for SQL Server',
                'trusted_connection': 'yes',
            },
        }
    }

    from django.db import connections
    connections['default'].cursor()
    print("SQL Server connection successful")

except Exception as e:
    print(f"SQL Server connection failed: {str(e)}")
    print("Falling back to SQLite")
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Custom user model
AUTH_USER_MODEL = 'expenses.User'

# Authentication Validators
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Localization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# Static Files
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Media Files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Django Auto Field
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
}

# CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:8000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = True
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

# CSRF
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
]

# Session Cookie
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'

LOG_DIR = os.path.join(BASE_DIR, 'logs')
os.makedirs(LOG_DIR, exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,

    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} - {name}: {message}',
            'style': '{',
        },
    },

    'filters': {
        'info_only': {
            '()': 'django.utils.log.CallbackFilter',
            'callback': lambda record: record.levelno == 20,  # INFO = 20
        },
        'warn_and_above': {
            '()': 'django.utils.log.CallbackFilter',
            'callback': lambda record: record.levelno >= 30,  # WARNING and above
        },
    },

    'handlers': {
        'info_file': {
            'level': 'INFO',
            'filters': ['info_only'],
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOG_DIR, 'info.log'),
            'maxBytes': 2 * 1024 * 1024,
            'backupCount': 3,
            'formatter': 'verbose',
        },
        'error_file': {
            'level': 'WARNING',
            'filters': ['warn_and_above'],
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': os.path.join(LOG_DIR, 'error.log'),
            'maxBytes': 2 * 1024 * 1024,
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },

    'loggers': {
        'django': {
            'handlers': ['info_file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'expenses.services.onedrive_service': {
            'handlers': ['info_file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
        'expenses.storage': {
            'handlers': ['info_file', 'error_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },

    'root': {
        'handlers': ['info_file', 'error_file'],
        'level': 'INFO',
    },
}

# Microsoft Graph API Configuration
MS_CLIENT_ID = env('MS_CLIENT_ID', default='b11001d0-8a8e-423a-b403-393a4ad78ce7')
MS_CLIENT_SECRET = env('MS_CLIENT_SECRET', default='ipm8Q~u.qLAeWwmmm9nFHEtpM5B11PF1L33RBavS')
MS_TENANT_ID = env('MS_TENANT_ID', default='dcd98ff5-357f-450f-91dc-94ea4024b76c')
MS_FROM_EMAIL = env('MS_FROM_EMAIL', default='noreply@appglide.io')
MS_TO_EMAIL = env('MS_TO_EMAIL', default='nehas@appglide.io') 