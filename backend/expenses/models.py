from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from .storage import OneDriveStorage
from decimal import Decimal

class User(AbstractUser):
    is_admin = models.BooleanField(default=False)

    class Meta:
        app_label = 'expenses'

class ExpenseTitle(models.Model):
    title = models.CharField(max_length=200)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

    class Meta:
        app_label = 'expenses'

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
        ('SEND_FOR_APPROVAL', 'Send for Approval'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    CURRENCY_CHOICES = [
        ('CAD', 'Canadian Dollar'),
        ('USD', 'US Dollar'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
        ('INR', 'Indian Rupee'),
    ]

    expense_title = models.ForeignKey(ExpenseTitle, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    master_group = models.CharField(max_length=20, choices=MASTER_GROUPS)
    subgroup = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=19, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES)
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    comments = models.TextField(blank=True, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def get_subgroup_display(self):
        """Returns the display name for the current subgroup."""
        return dict(self.SUBGROUPS.get(self.master_group, [])).get(self.subgroup, self.subgroup)

    def get_subgroup_choices(self):
        return dict(self.SUBGROUPS.get(self.master_group, []))

    def __str__(self):
        return f"{self.expense_title.title} - {self.amount} {self.get_currency_display()}"

    class Meta:
        app_label = 'expenses'

class ExpenseAttachment(models.Model):
    expense_form = models.ForeignKey(ExpenseForm, related_name='attachments', on_delete=models.CASCADE)
    file = models.FileField(
        upload_to='expense_attachments/',
        storage=OneDriveStorage(),
        null=False
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Attachment for {self.expense_form.id}"

    class Meta:
        app_label = 'expenses'