import os
import json
import logging
import aiohttp
import requests
from pathlib import Path
from msal import ConfidentialClientApplication

logger = logging.getLogger(__name__)

class GraphEmailService:
    def __init__(self):
        self.client_id = os.environ.get("MS_CLIENT_ID", "b11001d0-8a8e-423a-b403-393a4ad78ce7")
        self.client_secret = os.environ.get("MS_CLIENT_SECRET", "ipm8Q~u.qLAeWwmmm9nFHEtpM5B11PF1L33RBavS")
        self.tenant_id = os.environ.get("MS_TENANT_ID", "dcd98ff5-357f-450f-91dc-94ea4024b76c")
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        self.scopes = ["https://graph.microsoft.com/.default"]
        self.from_email = "nehas@appglide.io"
        
        self.app = ConfidentialClientApplication(
            client_id=self.client_id,
            client_credential=self.client_secret,
            authority=self.authority,
        )
        self._logger = logger

    def _get_valid_access_token(self):
        """Get access token using app-only authentication"""
        result = self.app.acquire_token_for_client(scopes=self.scopes)
        if "access_token" not in result:
            error_msg = result.get('error_description', 'Unknown error')
            self._logger.error(f"Failed to acquire token: {error_msg}")
            raise Exception(f"Could not acquire access token: {error_msg}")
        return result["access_token"]

    async def send_expense_notification_email(self, subject, body, to_email, username):
        """Send email using Microsoft Graph API with app-only authentication"""
        access_token = self._get_valid_access_token()
        url = f"https://graph.microsoft.com/v1.0/users/{self.from_email}/sendMail"
        
        email_body = f"Hi {username},\n\n{body}"
        
        message = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "Text",
                    "content": email_body
                },
                "toRecipients": [
                    {"emailAddress": {"address": to_email}}
                ]
            }
        }
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=message) as response:
                if response.status in (202, 200):
                    self._logger.info(f"Email sent from {self.from_email} to {to_email}")
                    return True
                else:
                    text = await response.text()
                    self._logger.error(f"Failed to send email: {text}")
                    raise Exception(f"Failed to send email: {text}")

    def send_expense_notification_email_sync(self, subject, body, to_email, username):
        """Synchronous version of send_expense_notification_email"""
        access_token = self._get_valid_access_token()
        url = f"https://graph.microsoft.com/v1.0/users/{self.from_email}/sendMail"
        
        email_body = f"Hi {username},\n\n{body}"
        
        message = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "Text",
                    "content": email_body
                },
                "toRecipients": [
                    {"emailAddress": {"address": to_email}}
                ]
            }
        }
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, headers=headers, json=message)
        if response.status_code in (202, 200):
            self._logger.info(f"Email sent from {self.from_email} to {to_email}")
            return True
        else:
            self._logger.error(f"Failed to send email: {response.text}")
            raise Exception(f"Failed to send email: {response.text}")

def send_expense_notification_email_sync(subject, body, to_email, username):
    """Standalone function for synchronous email sending"""
    service = GraphEmailService()
    return service.send_expense_notification_email_sync(subject, body, to_email, username) 