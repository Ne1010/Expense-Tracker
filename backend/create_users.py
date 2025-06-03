import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_manager.settings')
django.setup()

from django.contrib.auth.models import User
from expenses.models import User as CustomUser
from rest_framework.authtoken.models import Token

def create_users():
    # Create regular user
    if not User.objects.filter(username='user').exists():
        user = User.objects.create_user(
            username='user',
            password='user123',
            email='user@example.com'
        )
        CustomUser.objects.create(
            user=user,
            is_admin=False
        )
        # Create token for regular user
        Token.objects.create(user=user)
        print("Regular user created successfully!")

    # Create admin user
    if not User.objects.filter(username='admin').exists():
        admin = User.objects.create_user(
            username='admin',
            password='admin123',
            email='admin@example.com'
        )
        CustomUser.objects.create(
            user=admin,
            is_admin=True
        )
        # Create token for admin user
        Token.objects.create(user=admin)
        print("Admin user created successfully!")

if __name__ == '__main__':
    create_users() 