#!/usr/bin/env python
"""
Test script for the updated email service with app-only authentication
"""
import os
import sys
import django

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_manager.settings')
django.setup()

from expenses.services.email_service import GraphEmailService

def test_email_service():
    """Test the email service with app-only authentication"""
    try:
        service = GraphEmailService()
        
        # Test synchronous email sending
        print("Testing synchronous email sending...")
        result = service.send_expense_notification_email_sync(
            subject="🧪 Test Email - App-Only Authentication",
            body="This is a test email sent using app-only authentication with Microsoft Graph API.\n\n"
                 "✅ If you receive this email, the configuration is working correctly!\n\n"
                 "Sent from: noreply@appglide.io\n"
                 "Sent to: nehas@appglide.io",
            to_email="nehas@appglide.io"
        )
        
        if result:
            print("✅ Email sent successfully!")
        else:
            print("❌ Email sending failed")
            
    except Exception as e:
        print(f"❌ Error testing email service: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Testing Microsoft Graph Email Service with App-Only Authentication")
    print("=" * 70)
    
    success = test_email_service()
    
    if success:
        print("\n🎉 Email service test completed successfully!")
    else:
        print("\n💥 Email service test failed!")
        sys.exit(1) 