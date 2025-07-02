from rest_framework import serializers
from .models import User, ExpenseTitle, ExpenseForm, ExpenseAttachment
from django.shortcuts import get_object_or_404

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_admin']
        read_only_fields = ['is_admin']

class ExpenseTitleSerializer(serializers.ModelSerializer):
    created_by_username = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = ExpenseTitle
        fields = ['id', 'title', 'created_by', 'created_by_username', 'created_at']
        read_only_fields = ['created_by', 'created_by_username', 'created_at']

    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None

class ExpenseAttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    
    def get_url(self, obj):
        return obj.file.url if obj.file else None
    
    class Meta:
        model = ExpenseAttachment
        fields = ['id', 'file', 'url', 'uploaded_at']
        read_only_fields = ['id', 'url', 'uploaded_at']

class ExpenseFormSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    expense_title = ExpenseTitleSerializer(read_only=True)
    expense_title_id = serializers.IntegerField(write_only=True, required=False)
    attachments = ExpenseAttachmentSerializer(many=True, required=False, read_only=True)

    class Meta:
        model = ExpenseForm
        fields = [
            'id', 'expense_title', 'expense_title_id', 'user',
            'master_group', 'subgroup', 'amount', 'currency', 'date',
            'attachments', 'status', 'comments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['user', 'status', 'comments', 'created_at', 'updated_at']

    def validate(self, data):
        expense_title_id = data.get('expense_title_id')
        if expense_title_id is not None:
            try:
                data['expense_title'] = ExpenseTitle.objects.get(pk=expense_title_id.id if isinstance(expense_title_id, ExpenseTitle) else expense_title_id)
            except ExpenseTitle.DoesNotExist:
                raise serializers.ValidationError({'expense_title_id': 'Expense title with this ID does not exist.'})
        elif self.instance is None:
            # Only require expense_title_id for create operations
            raise serializers.ValidationError({'expense_title_id': 'This field is required.'})
        
        # Add these safely to avoid overwriting if already present
        data.setdefault('status', 'PENDING')
        data.setdefault('comments', 'Pending')
        print('VALIDATION DATA:', data)
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        if user.is_authenticated:
            validated_data['user'] = user
        else:
            validated_data['user'] = None

        # Pop attachments from validated_data as it's not a model field
        validated_data.pop('attachments', None)
        
        # First, create the expense form instance
        expense_form = ExpenseForm.objects.create(**validated_data)

        # Then, process attachments from the request context
        files = self.context['request'].FILES.getlist('attachments')
        for uploaded_file in files:
            attachment = ExpenseAttachment(expense_form=expense_form)
            # Attach the parent model instance to the file content itself
            # so the storage backend can access it.
            setattr(uploaded_file, 'instance', attachment)
            attachment.file = uploaded_file
            attachment.save()
            
        return expense_form

    def update(self, instance, validated_data):
        user = self.context['request'].user
        if user.is_authenticated:
            validated_data['user'] = user
        else:
            validated_data['user'] = None

        # Pop attachments from validated_data as it's not a model field
        validated_data.pop('attachments', None)
        
        instance = super().update(instance, validated_data)

        # Then, process attachments from the request context
        files = self.context['request'].FILES.getlist('attachments')
        for uploaded_file in files:
            attachment = ExpenseAttachment(expense_form=instance)
            # Attach the parent model instance to the file content
            setattr(uploaded_file, 'instance', attachment)
            attachment.file = uploaded_file
            attachment.save()

        return instance