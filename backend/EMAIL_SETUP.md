# Microsoft Graph Email Service Setup

## Overview
The email service has been updated to use **app-only authentication** with Microsoft Graph API, eliminating the need for user login or token caching.

## Configuration

### Environment Variables
Create a `.env` file in the `backend/` directory with the following variables:

```env
# Microsoft Graph API Configuration
MS_CLIENT_ID=b11001d0-8a8e-423a-b403-393a4ad78ce7
MS_CLIENT_SECRET=ipm8Q~u.qLAeWwmmm9nFHEtpM5B11PF1L33RBavS
MS_TENANT_ID=dcd98ff5-357f-450f-91dc-94ea4024b76c
MS_FROM_EMAIL=noreply@appglide.io
MS_TO_EMAIL=nehas@appglide.io
```

### Settings Configuration
The settings have been updated in `expense_manager/settings.py` to include:

```python
# Microsoft Graph API Configuration
MS_CLIENT_ID = env('MS_CLIENT_ID', default='b11001d0-8a8e-423a-b403-393a4ad78ce7')
MS_CLIENT_SECRET = env('MS_CLIENT_SECRET', default='ipm8Q~u.qLAeWwmmm9nFHEtpM5B11PF1L33RBavS')
MS_TENANT_ID = env('MS_TENANT_ID', default='dcd98ff5-357f-450f-91dc-94ea4024b76c')
MS_FROM_EMAIL = env('MS_FROM_EMAIL', default='noreply@appglide.io')
MS_TO_EMAIL = env('MS_TO_EMAIL', default='nehas@appglide.io')
```

## Usage

### Asynchronous Usage
```python
from expenses.services.email_service import GraphEmailService

service = GraphEmailService()
await service.send_expense_notification_email(
    subject="New Expense Created",
    body="A new expense has been submitted for approval.",
    to_email="nehas@appglide.io"
)
```

### Synchronous Usage
```python
from expenses.services.email_service import GraphEmailService

service = GraphEmailService()
service.send_expense_notification_email_sync(
    subject="New Expense Created",
    body="A new expense has been submitted for approval.",
    to_email="nehas@appglide.io"
)
```

### Standalone Function
```python
from expenses.services.email_service import send_expense_notification_email_sync

send_expense_notification_email_sync(
    subject="New Expense Created",
    body="A new expense has been submitted for approval.",
    to_email="nehas@appglide.io"
)
```

## Testing

Run the test script to verify the email service is working:

```bash
cd backend
python test_email_service.py
```

## Key Changes Made

1. **Authentication Method**: Changed from `PublicClientApplication` to `ConfidentialClientApplication`
2. **Token Management**: Removed token caching - now uses app-only authentication
3. **Email Sending**: Updated to send from `noreply@appglide.io` instead of user account
4. **API Endpoint**: Changed from `/me/sendMail` to `/users/{from_email}/sendMail`
5. **Scopes**: Updated to use `https://graph.microsoft.com/.default`

## Benefits

- ✅ **No User Login Required**: App-only authentication
- ✅ **No Token Caching**: Automatic token management
- ✅ **Secure**: Uses client secret authentication
- ✅ **Reliable**: No dependency on user sessions
- ✅ **Scalable**: Works across multiple instances

## Troubleshooting

If you encounter issues:

1. **Check Environment Variables**: Ensure all MS_* variables are set correctly
2. **Verify App Permissions**: Ensure the app has `Mail.Send` permission in Azure AD
3. **Check Network**: Ensure the server can reach `graph.microsoft.com`
4. **Review Logs**: Check the application logs for detailed error messages 