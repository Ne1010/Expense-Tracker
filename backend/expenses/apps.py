from django.apps import AppConfig

class ExpensesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'expenses'

    def ready(self):
        # Import signals only when the app is ready
        try:
            import expenses.signals  # noqa
        except ImportError:
            pass 