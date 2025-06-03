from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from .storage import OneDriveStorage

class User(AbstractUser):
    is_admin = models.BooleanField(default=False)

class ExpenseTitle(models.Model):
    title = models.CharField(max_length=200)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class ExpenseForm(models.Model):
    MASTER_GROUPS = [
        ('TRAVEL', 'Travel'),
        ('OFFICE_SUPPLIES', 'Office Supplies'),
        ('UTILITIES', 'Utilities'),
    ]

    SUBGROUPS = {
        'TRAVEL': [
            ('TICKET', 'Ticket Expense'),
            ('FOOD', 'Food Expense'),
            ('HOSPITALITY', 'Hospitality Expense'),
        ],
        'OFFICE_SUPPLIES': [
            ('EQUIPMENT', 'Equipment'),
            ('STATIONERY', 'Stationery'),
        ],
        'UTILITIES': [
            ('INTERNET', 'Internet'),
            ('ELECTRICITY', 'Electricity'),
        ],
    }

    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
        ('INR', 'Indian Rupee'),
    ]

    expense_title = models.ForeignKey(ExpenseTitle, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    master_group = models.CharField(max_length=20, choices=MASTER_GROUPS)
    subgroup = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES)
    date = models.DateField()
    attachment = models.FileField(
        upload_to='expense_attachments/',
        storage=OneDriveStorage(),
        null=True,
        blank=True
    )
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    comments = models.TextField(blank=True, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_subgroup_choices(self):
        return dict(self.SUBGROUPS.get(self.master_group, [])) 