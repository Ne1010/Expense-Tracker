import os
import logging
import aiohttp
import webbrowser
from msal import PublicClientApplication, SerializableTokenCache
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
        self.access_token = None

    def _save_token_cache(self):
        try:
            with open(self.token_cache_path, "w") as f:
                f.write(self.token_cache.serialize())
            logger.info("✅ Token cache saved successfully")
        except Exception as e:
            logger.error(f"Failed to save token cache: {e}")

    async def get_access_token(self):
        accounts = self.app.get_accounts()
        if accounts:
            result = self.app.acquire_token_silent(self.scope, account=accounts[0])
            if "access_token" in result:
                self.access_token = result["access_token"]
                self._save_token_cache()
                logger.info("✅ Access token acquired silently")
                return self.access_token

        flow = self.app.initiate_device_flow(scopes=self.scope)
        if "user_code" not in flow:
            raise ValueError("Failed to start device flow")

        print("\n=== OneDrive Authentication Required ===")
        print(f"Please go to: {flow['verification_uri']}")
        print(f"Enter this code: {flow['user_code']}")
        print("After signing in, the application will continue automatically.\n")

        try:
            webbrowser.open(flow["verification_uri"])
        except:
            pass

        result = self.app.acquire_token_by_device_flow(flow)
        if "access_token" in result:
            self.access_token = result["access_token"]
            self._save_token_cache()
            logger.info("✅ Access token acquired via device flow")
            return self.access_token
        else:
            error_msg = result.get("error_description", "Unknown error")
            logger.error(f"❌ Failed to acquire token: {error_msg}")
            raise Exception(f"Authentication failed: {error_msg}")

    def _sanitize_folder_name(self, name):
        invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
        for char in invalid_chars:
            name = name.replace(char, "_")
        return name.strip(". ")

    async def create_folder(self):
        if not self.access_token:
            await self.get_access_token()

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{self.folder_name}"

        # Check if the folder exists first
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    logger.info(f"✅ Folder '{self.folder_name}' already exists")
                    return True
                elif response.status != 404:
                    text = await response.text()
                    logger.error(f"❌ Error checking folder: {text}")
                    return False

        # If not found, create it
        payload = {
            "name": self.folder_name,
            "folder": {},
            "@microsoft.graph.conflictBehavior": "fail",  # fail if exists
        }
        create_url = "https://graph.microsoft.com/v1.0/me/drive/special/approot/children"
        async with aiohttp.ClientSession() as session:
            async with session.post(create_url, headers=headers, json=payload) as response:
                if response.status in (200, 201):
                    logger.info("✅ Folder created successfully")
                    return True
                else:
                    text = await response.text()
                    logger.error(f"❌ Failed to create folder: {text}")
                    return False

    async def upload_file(self, file_content, expense_title, file_name):
        if not self.access_token:
            await self.get_access_token()

        await self.create_folder()

        # Only sanitize the expense title for the folder name, keep original filename
        subfolder = self._sanitize_folder_name(expense_title)
        full_path = f"{self.folder_name}/{subfolder}/{file_name}"

        upload_url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{full_path}:/content"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/octet-stream",
        }

        async with aiohttp.ClientSession() as session:
            async with session.put(upload_url, headers=headers, data=file_content) as response:
                if response.status in (200, 201):
                    result = await response.json()
                    logger.info(f"✅ File uploaded to {full_path}")
                    return {
                        "success": True,
                        "file_id": result.get("id"),
                        "web_url": result.get("webUrl"),
                    }
                else:
                    text = await response.text()
                    logger.error(f"❌ Upload failed: {text}")
                    return {"success": False, "error": text}

    async def get_file_url(self, expense_title, file_name):
        if not self.access_token:
            await self.get_access_token()

        subfolder = self._sanitize_folder_name(expense_title)
        full_path = f"{self.folder_name}/{subfolder}/{file_name}"

        url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{full_path}"

        headers = {
            "Authorization": f"Bearer {self.access_token}",
        }

        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    result = await response.json()
                    logger.info(f"✅ File URL retrieved for {full_path}")
                    return {"success": True, "web_url": result.get("webUrl")}
                else:
                    text = await response.text()
                    logger.error(f"❌ Failed to get file URL: {text}")
                    return {"success": False, "error": text}