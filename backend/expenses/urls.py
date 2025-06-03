from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token
from . import views

router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'expense-titles', views.ExpenseTitleViewSet, basename='expense-title')
router.register(r'expense-forms', views.ExpenseFormViewSet, basename='expense-form')

urlpatterns = [
    path('', include(router.urls)),
    path('csrf-token/', views.get_csrf_token, name='csrf-token'),
    path('token/', obtain_auth_token, name='api_token_auth'),
] 