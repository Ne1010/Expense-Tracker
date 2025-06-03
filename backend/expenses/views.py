from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.middleware.csrf import get_token
from django.http import JsonResponse
from .models import User, ExpenseTitle, ExpenseForm
from .serializers import UserSerializer, ExpenseTitleSerializer, ExpenseFormSerializer
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_csrf_token(request):
    return JsonResponse({'csrfToken': get_token(request)})

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        # Allow read-only access for all users (including anonymous)
        if request.method in permissions.SAFE_METHODS:
            return True
        # For write operations, require authentication and admin status
        return request.user.is_authenticated and getattr(request.user, 'is_admin', False)

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
        try:
            return ExpenseTitle.objects.all()
        except Exception as e:
            logger.error(f"Error fetching expense titles: {str(e)}")
            return ExpenseTitle.objects.none()

    def perform_create(self, serializer):
        # Temporarily allow creation without authentication
        serializer.save(created_by=None)  # You might need to handle this in your model

    def list(self, request, *args, **kwargs):
        try:
            queryset = self.get_queryset()
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Error in list view: {str(e)}")
            return Response(
                {"detail": "Error fetching expense titles. Please try again."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ExpenseFormViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseFormSerializer
    permission_classes = [permissions.AllowAny]  # Temporarily allow all access for testing

    def get_queryset(self):
        queryset = ExpenseForm.objects.all()
        
        # Filter by expense_title_id if provided
        expense_title_id = self.request.query_params.get('expense_title_id')
        if expense_title_id:
            queryset = queryset.filter(expense_title_id=expense_title_id)
        
        # Apply user-based filtering only for authenticated users
        if self.request.user.is_authenticated:
            if not getattr(self.request.user, 'is_admin', False):
                queryset = queryset.filter(user=self.request.user)
            
        return queryset

    def create(self, request, *args, **kwargs):
        logger.info(f"Received form data: {request.data}")
        try:
            # Create and validate the serializer synchronously
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            logger.info(f"Validated data: {serializer.validated_data}")
            
            # Create the instance synchronously
            instance = serializer.save()
            logger.info(f"Created expense form with ID: {instance.id}")
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating expense form: {str(e)}")
            return Response(
                {"detail": f"Error creating expense form: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_401_UNAUTHORIZED
            )
            
        if not getattr(request.user, 'is_admin', False):
            return Response(
                {"detail": "Only admins can update status"},
                status=status.HTTP_403_FORBIDDEN
            )

        expense_form = self.get_object()
        status_value = request.data.get('status')
        comments = request.data.get('comments', '')

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