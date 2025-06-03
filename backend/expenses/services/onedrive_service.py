import os
import logging
import aiohttp
import requests
import webbrowser
from msal import PublicClientApplication, SerializableTokenCache
import base64
import json
from pathlib import Path

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

class OneDriveService:
    def __init__(self):
        self.client_id = "b11001d0-8a8e-423a-b403-393a4ad78ce7"
        self.tenant_id = "dcd98ff5-357f-450f-91dc-94ea4024b76c"
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        self.scope = ["Files.ReadWrite.AppFolder"]
        self.folder_name = "billing_uploads"
        self.token_cache_path = Path("onedrive_token_cache.json")

        # Initialize token cache
        self.token_cache = SerializableTokenCache()
        if self.token_cache_path.exists():
            try:
                with open(self.token_cache_path, 'r') as f:
                    self.token_cache.deserialize(f.read())
            except Exception as e:
                logger.error(f"Failed to load token cache: {e}")

        # Public client (no client_secret)
        self.app = PublicClientApplication(
            client_id=self.client_id,
            authority=self.authority,
            token_cache=self.token_cache
        )
        self.access_token = None

    def _save_token_cache(self):
        """Save token cache to file"""
        try:
            with open(self.token_cache_path, 'w') as f:
                f.write(self.token_cache.serialize())
            logger.info("✅ Token cache saved successfully")
        except Exception as e:
            logger.error(f"Failed to save token cache: {e}")

    async def get_access_token(self):
        try:
            # Try to get token silently first
            accounts = self.app.get_accounts()
            if accounts:
                result = self.app.acquire_token_silent(self.scope, account=accounts[0])
                if "access_token" in result:
                    self.access_token = result["access_token"]
                    self._save_token_cache()
                    return self.access_token

            # If silent token acquisition fails, try device flow
            flow = self.app.initiate_device_flow(scopes=self.scope)
            if "user_code" not in flow:
                raise ValueError("Failed to start device flow")

            # Print instructions for user
            print("\n=== OneDrive Authentication Required ===")
            print(f"Please go to: {flow['verification_uri']}")
            print(f"Enter this code: {flow['user_code']}")
            print("After signing in, the application will continue automatically.")
            print("This is a one-time process.\n")

            # Try to open the browser automatically
            try:
                webbrowser.open(flow['verification_uri'])
            except:
                pass  # Browser opening is optional

            # Wait for user to complete authentication
            result = self.app.acquire_token_by_device_flow(flow)

            if "access_token" in result:
                logger.info("✅ Access token acquired successfully")
                self.access_token = result["access_token"]
                self._save_token_cache()
                return self.access_token
            else:
                error_msg = result.get('error_description', 'Unknown error')
                logger.error(f"❌ Failed to acquire token: {error_msg}")
                raise Exception(f"Authentication failed: {error_msg}")

        except Exception as e:
            logger.error(f"❌ Exception during token acquisition: {str(e)}")
            raise Exception(f"Authentication failed: {str(e)}")

    async def create_folder(self):
        """Creates folder inside approot"""
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            payload = {
                "name": self.folder_name,
                "folder": {},
                "@microsoft.graph.conflictBehavior": "rename"
            }
            url = "https://graph.microsoft.com/v1.0/me/drive/special/approot/children"

            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, json=payload) as response:
                    if response.status in (200, 201):
                        data = await response.json()
                        logger.info(f"✅ Folder ready: {data['name']}")
                        return True
                    else:
                        text = await response.text()
                        logger.error(f"❌ Failed to create folder: {text}")
                        return False
        except Exception as e:
            logger.error(f"❌ Exception in create_folder: {str(e)}")
            return False

    async def upload_file_from_base64(self, base64_data, file_name):
        """Upload a file from base64 data to OneDrive"""
        try:
            if not self.access_token:
                await self.get_access_token()

            if not self.access_token:
                return {'success': False, 'error': 'Failed to get access token'}

            folder_ok = await self.create_folder()
            if not folder_ok:
                return {'success': False, 'error': 'Failed to create or access folder'}

            # Decode base64 data
            try:
                file_content = base64.b64decode(base64_data.split(',')[1] if ',' in base64_data else base64_data)
            except Exception as e:
                logger.error(f"❌ Failed to decode base64 data: {str(e)}")
                return {'success': False, 'error': 'Invalid file data'}

            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/octet-stream"
            }

            upload_url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{self.folder_name}/{file_name}:/content"
            
            async with aiohttp.ClientSession() as session:
                async with session.put(upload_url, headers=headers, data=file_content) as response:
                    if response.status in (200, 201):
                        result = await response.json()
                        logger.info("✅ File uploaded successfully")
                        return {
                            'success': True,
                            'file_id': result.get('id'),
                            'web_url': result.get('webUrl')
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Upload failed: {response.status} {error_text}")
                        return {
                            'success': False,
                            'error': f"Upload failed with status {response.status}"
                        }
        except Exception as e:
            logger.error(f"❌ Upload exception: {str(e)}")
            return {'success': False, 'error': str(e)}

    async def get_file_url(self, file_name):
        """Get the web URL for a file in OneDrive"""
        try:
            if not self.access_token:
                await self.get_access_token()

            headers = {
                "Authorization": f"Bearer {self.access_token}"
            }

            url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{self.folder_name}/{file_name}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            'success': True,
                            'web_url': result.get('webUrl')
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"❌ Failed to get file URL: {response.status} {error_text}")
                        return {
                            'success': False,
                            'error': f"Failed to get file URL with status {response.status}"
                        }
        except Exception as e:
            logger.error(f"❌ Get file URL exception: {str(e)}")
            return {'success': False, 'error': str(e)} 