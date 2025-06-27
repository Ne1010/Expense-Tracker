import os
import json
import logging
import aiohttp
from pathlib import Path
from msal import PublicClientApplication, SerializableTokenCache

logger = logging.getLogger(__name__)

class GraphEmailService:
    def __init__(self):
        self.client_id = os.environ.get("MS_CLIENT_ID", "b11001d0-8a8e-423a-b403-393a4ad78ce7")
        self.tenant_id = os.environ.get("MS_TENANT_ID", "dcd98ff5-357f-450f-91dc-94ea4024b76c")
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        self.token_cache_path = Path("onedrive_token_cache.json")
        self.token_cache = SerializableTokenCache()
        if self.token_cache_path.exists():
            try:
                with open(self.token_cache_path, "r") as f:
                    self.token_cache.deserialize(f.read())
            except Exception as e:
                logger.error(f"Failed to load token cache: {e}")
        self.app = PublicClientApplication(
            client_id=self.client_id,
            authority=self.authority,
            token_cache=self.token_cache,
        )
        self._logger = logger
        self.SCOPES = ["Mail.Send"]

    def _get_valid_access_token(self, force_refresh=False):
        accounts = self.app.get_accounts()
        if not accounts:
            raise Exception("No Microsoft account found in token cache. Please authenticate first.")
        result = self.app.acquire_token_silent(self.SCOPES, account=accounts[0], force_refresh=force_refresh)
        if not result or "access_token" not in result:
            raise Exception("Could not acquire access token for sending email.")
        return result["access_token"]

    async def send_expense_notification_email(self, subject, body, to_email="nehas@appglide.io"):
        access_token = self._get_valid_access_token()
        url = "https://graph.microsoft.com/v1.0/me/sendMail"
        message = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "Text",
                    "content": body
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
                    self._logger.info(f"Email sent to {to_email}")
                    return True
                else:
                    text = await response.text()
                    self._logger.error(f"Failed to send email: {text}")
                    raise Exception(f"Failed to send email: {text}")

def send_expense_notification_email_sync(subject, body, to_email="nehas@appglide.io"):
    import asyncio
    service = GraphEmailService()
    return asyncio.run(service.send_expense_notification_email(subject, body, to_email)) 