from rest_framework import serializers
from .models import User, ExpenseTitle, ExpenseForm
from django.shortcuts import get_object_or_404

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_admin']
        read_only_fields = ['is_admin']

class ExpenseTitleSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseTitle
        fields = ['id', 'title', 'created_by', 'created_at']
        read_only_fields = ['created_by', 'created_at']

class ExpenseFormSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    expense_title = ExpenseTitleSerializer(read_only=True)
    expense_title_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = ExpenseForm
        fields = [
            'id', 'expense_title', 'expense_title_id', 'user',
            'master_group', 'subgroup', 'amount', 'currency', 'date',
            'attachment', 'status', 'comments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'status', 'comments', 'created_at', 'updated_at']

    def validate_expense_title_id(self, value):
        try:
            expense_title = ExpenseTitle.objects.get(pk=value)
            return expense_title
        except ExpenseTitle.DoesNotExist:
            raise serializers.ValidationError("Expense title with this ID does not exist.")

    def validate(self, data):
        # Handle expense_title_id conversion
        expense_title_id = data.pop('expense_title_id', None)
        if expense_title_id:
            data['expense_title'] = expense_title_id

        # Set default status and comments
        data['status'] = 'PENDING'
        data['comments'] = 'Pending'

        return data

    def create(self, validated_data):
        # For testing, we'll allow creation without a user
        if 'request' in self.context and self.context['request'].user.is_authenticated:
            validated_data['user'] = self.context['request'].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'request' in self.context and self.context['request'].user.is_authenticated:
            validated_data['user'] = self.context['request'].user
        return super().update(instance, validated_data)