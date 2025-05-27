from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import User, ExpenseTitle, ExpenseForm
from .serializers import UserSerializer, ExpenseTitleSerializer, ExpenseFormSerializer

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_admin

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        if self.request.user.is_admin:
            return User.objects.all()
        return User.objects.filter(id=self.request.user.id)

class ExpenseTitleViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseTitleSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        if self.request.user.is_admin:
            return ExpenseTitle.objects.all()
        return ExpenseTitle.objects.filter(created_by=self.request.user)

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            return Response(
                {"detail": "Only authenticated users can create expense titles"},
                status=status.HTTP_403_FORBIDDEN
            )

class ExpenseFormViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseFormSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        if self.request.user.is_admin:
            return ExpenseForm.objects.all()
        return ExpenseForm.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
        else:
            return Response(
                {"detail": "Authentication required to create expense forms."}, 
                status=status.HTTP_401_UNAUTHORIZED 
            )

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        if not request.user.is_admin:
            return Response(
                {"detail": "Only admins can update status"},
                status=status.HTTP_403_FORBIDDEN
            )

        expense_form = self.get_object()
        status_value = request.data.get('status')
        comments = request.data.get('comments', '')

        print('Received status value:', status_value)
        if status_value not in dict(ExpenseForm.STATUS_CHOICES):
            return Response(
                {"detail": "Invalid status"},
                status=status.HTTP_400_BAD_REQUEST
            )

        expense_form.status = status_value
        expense_form.comments = comments
        expense_form.save()

        serializer = self.get_serializer(expense_form)
        return Response(serializer.data) 