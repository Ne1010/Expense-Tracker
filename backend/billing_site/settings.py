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
    'expenses.apps.ExpensesConfig',  # Use the proper app config
    'django_otp',
    'django_otp.plugins.otp_totp',
]

# ... rest of your settings ... 