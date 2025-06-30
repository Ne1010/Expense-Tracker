from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.middleware.csrf import get_token
from django.http import JsonResponse, HttpResponse, Http404
from .models import User, ExpenseTitle, ExpenseForm, ExpenseAttachment
from .serializers import UserSerializer, ExpenseTitleSerializer, ExpenseFormSerializer
from rest_framework.views import APIView
from .services.onedrive_service import OneDriveService
from .services.email_service import send_expense_notification_email_sync
import logging
import asyncio
from rest_framework.exceptions import ValidationError

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
    permission_classes = [permissions.AllowAny]  # Or IsAuthenticated if you want

    def get_serializer_context(self):
        return {'request': self.request}

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
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            attachments = request.FILES.getlist('attachments')
            
            # Pass attachments through the context
            expense_form = serializer.save(attachments=attachments)
            
            # Send notification email to admin
            try:
                admin_user = User.objects.filter(is_staff=True, is_superuser=True).first()
                if admin_user and admin_user.email:
                    expense_title = expense_form.expense_title.title
                    submitted_by = expense_form.user.username if expense_form.user else 'A user'
                    subject = f"New Expense Submitted: {expense_title}"
                    body = f"A new expense titled '{expense_title}' has been submitted by {submitted_by}."
                    send_expense_notification_email_sync(
                        subject=subject,
                        body=body,
                        to_email=admin_user.email,
                        username='Admin',
                        from_admin=False  # From noreply
                    )
            except Exception as e:
                logger.error(f"Failed to send new expense submission email: {str(e)}")

            # Re-serialize the instance to include all fields
            response_serializer = self.get_serializer(expense_form)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            logger.error(f"Validation error creating expense form: {e.detail}")
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error creating expense form: {str(e)}")
            return Response(
                {"detail": f"Error creating expense form: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def update(self, request, *args, **kwargs):
        try:
            partial = kwargs.pop('partial', False)
            instance = self.get_object()
            serializer = self.get_serializer(instance, data=request.data, partial=partial)
            serializer.is_valid(raise_exception=True)
            self.perform_update(serializer)
            return Response(serializer.data)
        except ValidationError as e:
            logger.error(f"Validation error updating expense form: {e.detail}")
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating expense form: {str(e)}")
            return Response(
                {"detail": f"Error updating expense form: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def perform_update(self, serializer):
        serializer.save()

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        expense_form = self.get_object()
        status_value = request.data.get('status')
        comments = request.data.get('comments', '')

        if status_value not in dict(ExpenseForm.STATUS_CHOICES):
            return Response(
                {"detail": "Invalid status"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Store the old status for comparison
        old_status = expense_form.status
        
        expense_form.status = status_value
        expense_form.comments = comments
        expense_form.save()

        # Send email notifications for status changes
        if status_value in ['APPROVED', 'REJECTED'] and old_status != status_value:
            try:
                # Get expense details for the email
                expense_title = expense_form.expense_title.title
                amount = expense_form.amount
                currency = expense_form.currency
                master_group = expense_form.get_master_group_display()
                subgroup = expense_form.subgroup
                date = expense_form.date

                
                if status_value == 'APPROVED':
                    subject = f"✅ Expense Approved: {expense_title}"
                    body = f"""
🎉 EXPENSE APPROVED

Expense Details:
• Title: {expense_title}
• Amount: {amount} {currency}
• Category: {master_group} - {subgroup}
• Date: {date}


📝 Comments:
{comments if comments else "No comments provided"}

---
This is an automated notification from the Expense Management System.

                    """.strip()
                else:  # REJECTED
                    subject = f"❌ Expense Rejected: {expense_title}"
                    body = f"""
🚫 EXPENSE REJECTED

Expense Details:
• Title: {expense_title}
• Amount: {amount} {currency}
• Category: {master_group} - {subgroup}
• Date: {date}


📝 Comments:
{comments if comments else "No comments provided"}

Please review the comments and resubmit if necessary.

---
This is an automated notification from the Expense Management System.
                    """.strip()
                
                # Get the user details for sending the email
                user = expense_form.user
                if user and user.email:
                    send_expense_notification_email_sync(
                        subject=subject,
                        body=body,
                        to_email=user.email,
                        username=user.username,
                        from_admin=True # From admin to user
                    )
                    logger.info(f"Status change email sent successfully for expense: {expense_title} - Status: {status_value}")
                else:
                    logger.warning(f"Could not send email because user or email is missing for expense form {expense_form.id}")
                
            except Exception as e:
                logger.error(f"Failed to send status change email: {str(e)}")
                # Don't return error response here, just log it since the status update was successful

        # Check if status is being updated to 'SEND_FOR_APPROVAL'
        if status_value == 'SEND_FOR_APPROVAL' and old_status != 'SEND_FOR_APPROVAL':
            try:
                # Get admin users to notify
                admin_users = User.objects.filter(is_staff=True, is_superuser=True)
                if not admin_users.exists():
                    logger.warning("No admin users found to send 'Send for Approval' notification.")
                    return

                expense_title = expense_form.expense_title.title
                submitted_by = expense_form.user.username if expense_form.user else 'Unknown User'

                subject = f"⏳ Expense Submitted for Approval: {expense_title}"
                body = f"""
An expense has been submitted for your approval.

• Title: {expense_title}
• Submitted by: {submitted_by}

Please log in to the system to review and take action.
                """.strip()

                for admin in admin_users:
                    if admin.email:
                        send_expense_notification_email_sync(
                            subject=subject,
                            body=body,
                            to_email=admin.email,
                            username=admin.username,
                            from_admin=False # From noreply to admin
                        )
                        logger.info(f"Sent 'Send for Approval' notification to admin {admin.email}")

            except Exception as e:
                logger.error(f"Failed to send 'Send for Approval' email: {str(e)}")
        
        serializer = self.get_serializer(expense_form)
        return Response(serializer.data)

    @action(detail=True, methods=['delete'])
    def delete_attachment(self, request, pk=None):
        """
        Hard delete an attachment from both database and OneDrive
        """
        try:
            expense_form = self.get_object()
            attachment_id = request.data.get('attachment_id')
            
            if not attachment_id:
                return Response(
                    {"detail": "Attachment ID is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the attachment
            attachment = get_object_or_404(ExpenseAttachment, id=attachment_id, expense_form=expense_form)
            
            # Delete from OneDrive first
            service = OneDriveService()
            file_path = str(attachment.file)
            try:
                asyncio.run(service.delete_file(file_path))
                logger.info(f"Successfully deleted file from OneDrive: {file_path}")
            except Exception as e:
                logger.warning(f"Failed to delete file from OneDrive: {file_path}, error: {str(e)}")
                # Continue with database deletion even if OneDrive deletion fails
            
            # Delete from database
            attachment.delete()
            
            # Re-serialize the expense form to return updated data
            serializer = self.get_serializer(expense_form)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error deleting attachment: {str(e)}")
            return Response(
                {"detail": f"Error deleting attachment: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def send_for_approval(self, request, pk=None):
        expense_form = self.get_object()
        if expense_form.status not in ['PENDING', 'REJECTED']:
            return Response({"detail": "Only pending or rejected expenses can be sent for approval."}, status=status.HTTP_400_BAD_REQUEST)
        
        # Update status for all forms under the same title
        title = expense_form.expense_title
        forms_to_update = ExpenseForm.objects.filter(expense_title=title)
        forms_to_update.update(status='SEND_FOR_APPROVAL')
        
        # Send email notification to admin
        try:
            admin_user = User.objects.filter(is_staff=True, is_superuser=True).first()
            if not admin_user or not admin_user.email:
                logger.warning("Admin user not found or has no email, skipping notification.")
            else:
                expense_title = title.title
                user_name = expense_form.user.username if expense_form.user else "an unknown user"
                
                # Get expense details for email body
                amount = expense_form.amount
                currency = expense_form.currency
                master_group = expense_form.get_master_group_display()
                subgroup = expense_form.get_subgroup_display()
                date = expense_form.date

                subject = f"Expense Approval Required: {expense_title}"
                body = f"""
A new expense has been submitted for your approval.

Expense Details:
- Title: {expense_title}
- Submitted by: {user_name}
- Amount: {amount} {currency}
- Category: {master_group} - {subgroup}
- Date: {date}

Please review and approve/reject this expense by logging into the admin panel.

Login Link: http://localhost:3000/login
                """.strip()
                
                send_expense_notification_email_sync(
                    subject=subject,
                    body=body,
                    to_email=admin_user.email,
                    username='Admin',
                    from_admin=False  # From noreply to admin
                )
                logger.info(f"Sent 'for approval' notification to admin for expense title: {expense_title}")

        except Exception as e:
            logger.error(f"Failed to send 'for approval' email: {str(e)}")
            # Do not fail the request, just log the error
        
        serializer = self.get_serializer(forms_to_update, many=True)
        return Response(serializer.data)

class AttachmentProxyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, expense_title, filename):
        service = OneDriveService()
        try:
            file_content = asyncio.run(service.download_file(f"{expense_title}/{filename}"))
            if file_content is None:
                raise Http404("File not found on OneDrive")
            response = HttpResponse(file_content, content_type="application/octet-stream")
            response["Content-Disposition"] = f'attachment; filename="{filename}"'
            return response
        except Exception as e:
            return HttpResponse(f"Error: {str(e)}", status=500) 