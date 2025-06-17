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
    attachment1_url = serializers.SerializerMethodField()
    attachment2_url = serializers.SerializerMethodField()

    class Meta:
        model = ExpenseForm
        fields = [
            'id', 'expense_title', 'expense_title_id', 'user',
            'master_group', 'subgroup', 'amount', 'currency', 'date',
            'attachment1', 'attachment2', 'attachment1_url', 'attachment2_url',
            'status', 'comments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'status', 'comments', 'created_at', 'updated_at']

    def get_attachment1_url(self, obj):
        return obj.attachment1.url if obj.attachment1 else None

    def get_attachment2_url(self, obj):
        return obj.attachment2.url if obj.attachment2 else None

    def validate_expense_title_id(self, value):
        try:
            expense_title = ExpenseTitle.objects.get(pk=value)
            return expense_title
        except ExpenseTitle.DoesNotExist:
            raise serializers.ValidationError("Expense title with this ID does not exist.")

    def validate(self, data):
        expense_title_id = data.pop('expense_title_id', None)
        if expense_title_id:
            data['expense_title'] = expense_title_id

        data['status'] = 'PENDING'
        data['comments'] = 'Pending'

        return data

    def create(self, validated_data):
        # Create the instance first with all data except attachments
        attachment1 = validated_data.pop('attachment1', None)
        attachment2 = validated_data.pop('attachment2', None)
        
        if 'request' in self.context and self.context['request'].user.is_authenticated:
            validated_data['user'] = self.context['request'].user
            
        instance = super().create(validated_data)
        
        # Now handle the attachments if they exist
        if attachment1:
            attachment1.instance = instance
            instance.attachment1 = attachment1
            
        if attachment2:
            attachment2.instance = instance
            instance.attachment2 = attachment2
            
        instance.save()
        return instance

    def update(self, instance, validated_data):
        if 'request' in self.context and self.context['request'].user.is_authenticated:
            validated_data['user'] = self.context['request'].user
        
        attachment1 = validated_data.pop('attachment1', None)
        attachment2 = validated_data.pop('attachment2', None)
        
        instance = super().update(instance, validated_data)
        
        if attachment1:
            attachment1.instance = instance
            instance.attachment1 = attachment1
            
        if attachment2:
            attachment2.instance = instance
            instance.attachment2 = attachment2
            
        instance.save()
        return instance