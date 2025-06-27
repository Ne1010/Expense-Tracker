from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token

User = get_user_model()

class Command(BaseCommand):
    help = 'Creates admin and regular users with predefined credentials'

    def handle(self, *args, **kwargs):
        # Create admin user
        admin_user, admin_created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@example.com',
                'is_staff': True,
                'is_superuser': True
            }
        )
        if admin_created:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('Successfully created admin user'))
        else:
            admin_user.set_password('admin123')
            admin_user.save()
            self.stdout.write(self.style.SUCCESS('Admin user already exists, password updated'))

        # Create regular user
        regular_user, user_created = User.objects.get_or_create(
            username='user1',
            defaults={
                'email': 'user@example.com',
                'is_staff': False,
                'is_superuser': False
            }
        )
        if user_created:
            regular_user.set_password('user123')
            regular_user.save()
            self.stdout.write(self.style.SUCCESS('Successfully created regular user "user1"'))
        else:
            regular_user.set_password('user123')
            regular_user.save()
            self.stdout.write(self.style.SUCCESS('Regular user "user1" already exists, password updated'))

        # Create or update tokens
        admin_token, _ = Token.objects.get_or_create(user=admin_user)
        user_token, _ = Token.objects.get_or_create(user=regular_user)

        self.stdout.write(self.style.SUCCESS('Successfully created/updated tokens')) 