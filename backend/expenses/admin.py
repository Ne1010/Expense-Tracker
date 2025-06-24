from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, ExpenseTitle, ExpenseForm, ExpenseAttachment
from django import forms

class ExpenseAttachmentInline(admin.TabularInline):
    model = ExpenseAttachment
    extra = 1
    readonly_fields = ('file_path_display',)

    def file_path_display(self, obj):
        return obj.file.name if obj.file else "-"
    file_path_display.short_description = "OneDrive Path"

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'is_admin', 'is_staff')
    list_filter = ('is_admin', 'is_staff', 'is_superuser')
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('is_admin',)}),
    )

@admin.register(ExpenseTitle)
class ExpenseTitleAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_by', 'created_at')
    list_filter = ('created_by', 'created_at')
    search_fields = ('title',)

class ExpenseFormAdminForm(forms.ModelForm):
    class Meta:
        model = ExpenseForm
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            # When editing an existing instance, set choices based on existing master_group
            master_group = self.instance.master_group
            subgroup_choices = self.instance.SUBGROUPS.get(master_group, [])
            self.fields['subgroup'].choices = subgroup_choices
        elif 'master_group' in self.initial:
            # When adding a new instance with initial data, set choices
            master_group = self.initial['master_group']
            # Need an instance to access SUBGROUPS dictionary defined in model
            subgroup_choices = ExpenseForm.SUBGROUPS.get(master_group, [])
            self.fields['subgroup'].choices = subgroup_choices
        else:
            # For a new instance without initial data, start with empty choices
            self.fields['subgroup'].choices = []

@admin.register(ExpenseForm)
class ExpenseFormAdmin(admin.ModelAdmin):
    form = ExpenseFormAdminForm
    list_display = ('expense_title', 'user', 'master_group', 'subgroup', 'amount', 'currency', 'status')
    list_filter = ('master_group', 'status', 'currency', 'created_at')
    search_fields = ('user__username', 'expense_title__title')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [ExpenseAttachmentInline]

@admin.register(ExpenseAttachment)
class ExpenseAttachmentAdmin(admin.ModelAdmin):
    list_display = ('expense_form', 'file', 'uploaded_at')
    readonly_fields = ('file_path_display',)

    def file_path_display(self, obj):
        return obj.file.name if obj.file else "-"
    file_path_display.short_description = "OneDrive Path" 