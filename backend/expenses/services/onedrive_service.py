import os
import logging
import aiohttp
import webbrowser
from msal import PublicClientApplication, SerializableTokenCache
from pathlib import Path
from functools import wraps

# --- Decorator for token refresh/retry ---
def with_token_refresh(func):
    @wraps(func)
    async def wrapper(self, *args, **kwargs):
        try:
            access_token = self._get_valid_access_token(force_refresh=False)
            return await func(self, *args, access_token=access_token, **kwargs)
        except Exception as e:
            if "InvalidAuthenticationToken" in str(e) or "token is expired" in str(e):
                self._logger.info("Token expired, retrying with forced refresh...")
                access_token = self._get_valid_access_token(force_refresh=True)
                return await func(self, *args, access_token=access_token, **kwargs)
            raise
    return wrapper

class OneDriveService:
    # Define scopes at the class level
    RESOURCE_SCOPES = ["Files.ReadWrite.All", "Files.ReadWrite.AppFolder"]
    ALL_SCOPES = RESOURCE_SCOPES + ["offline_access"]

    def __init__(self):
        self.client_id = os.environ.get("MS_CLIENT_ID", "b11001d0-8a8e-423a-b403-393a4ad78ce7")
        self.tenant_id = os.environ.get("MS_TENANT_ID", "dcd98ff5-357f-450f-91dc-94ea4024b76c")
        self.authority = f"https://login.microsoftonline.com/{self.tenant_id}"
        self.folder_name = "billing_uploads"
        self.token_cache_path = Path("onedrive_token_cache.json")
        self.subfolder_cache = set()  # Cache for created subfolders

        self.token_cache = SerializableTokenCache()
        if self.token_cache_path.exists():
            try:
                with open(self.token_cache_path, "r") as f:
                    self.token_cache.deserialize(f.read())
            except Exception as e:
                logging.error(f"Failed to load token cache: {e}")

        self.app = PublicClientApplication(
            client_id=self.client_id,
            authority=self.authority,
            token_cache=self.token_cache,
        )
        self._logger = logging.getLogger(__name__)

    def _save_token_cache(self):
        try:
            with open(self.token_cache_path, "w") as f:
                f.write(self.token_cache.serialize())
            self._logger.info("Token cache saved successfully")
        except Exception as e:
            self._logger.error(f"Failed to save token cache: {e}")

    def _get_valid_access_token(self, force_refresh=False):
        accounts = self.app.get_accounts()
        if not accounts:
            raise Exception("No accounts found. Please authenticate with OneDrive.")
        # Use only RESOURCE_SCOPES for silent token acquisition
        result = self.app.acquire_token_silent(self.RESOURCE_SCOPES, account=accounts[0], force_refresh=force_refresh)
        if not result or "access_token" not in result:
            self._logger.warning("Silent token refresh failed — refresh token may be expired.")
            raise Exception("🔒 Your session has expired. Please reconnect to OneDrive.")
        self._save_token_cache()
        return result["access_token"]

    def _sanitize_folder_name(self, name):
        invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
        for char in invalid_chars:
            name = name.replace(char, "_")
        return name.strip(". ")

    @with_token_refresh
    async def create_folder(self, access_token=None):
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{self.folder_name}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    self._logger.info(f"Folder '{self.folder_name}' already exists")
                    return True
                elif response.status != 404:
                    text = await response.text()
                    self._logger.error(f"Error checking folder: {text}")
                    raise Exception(text)
        payload = {
            "name": self.folder_name,
            "folder": {},
            "@microsoft.graph.conflictBehavior": "fail",
        }
        create_url = "https://graph.microsoft.com/v1.0/me/drive/special/approot/children"
        async with aiohttp.ClientSession() as session:
            async with session.post(create_url, headers=headers, json=payload) as response:
                if response.status in (200, 201):
                    self._logger.info("Folder created successfully")
                    return True
                else:
                    text = await response.text()
                    self._logger.error(f"Failed to create folder: {text}")
                    raise Exception(text)

    @with_token_refresh
    async def create_subfolder(self, expense_title, access_token=None):
        await self.create_folder()
        subfolder = self._sanitize_folder_name(expense_title)
        if subfolder in self.subfolder_cache:
            self._logger.info(f"Subfolder '{subfolder}' found in cache")
            return True
        full_path = f"{self.folder_name}/{subfolder}"
        self._logger.info(f"Using folder path: {full_path}")
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        check_url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{full_path}"
        async with aiohttp.ClientSession() as session:
            async with session.get(check_url, headers=headers) as response:
                if response.status == 200:
                    self._logger.info(f"Subfolder '{subfolder}' already exists")
                    self.subfolder_cache.add(subfolder)
                    return True
                elif response.status != 404:
                    text = await response.text()
                    self._logger.error(f"Error checking subfolder: {text}")
                    raise Exception(text)
        payload = {
            "name": subfolder,
            "folder": {},
            "@microsoft.graph.conflictBehavior": "fail",
        }
        create_url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{self.folder_name}:/children"
        async with aiohttp.ClientSession() as session:
            async with session.post(create_url, headers=headers, json=payload) as response:
                if response.status in (200, 201):
                    self._logger.info(f"Subfolder '{subfolder}' created successfully")
                    self.subfolder_cache.add(subfolder)
                    return True
                else:
                    text = await response.text()
                    self._logger.error(f"Failed to create subfolder: {text}")
                    raise Exception(text)

    @with_token_refresh
    async def upload_file(self, file_content, expense_title, file_name, access_token=None):
        await self.create_folder()
        await self.create_subfolder(expense_title)
        subfolder = self._sanitize_folder_name(expense_title)
        full_path = f"{self.folder_name}/{subfolder}/{file_name}"
        upload_url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{full_path}:/content"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/octet-stream",
        }
        async with aiohttp.ClientSession() as session:
            async with session.put(upload_url, headers=headers, data=file_content) as response:
                if response.status in (200, 201):
                    result = await response.json()
                    self._logger.info(f"File uploaded to {full_path}")
                    return {
                        "success": True,
                        "file_id": result.get("id"),
                        "web_url": result.get("webUrl")
                    }
                else:
                    text = await response.text()
                    self._logger.error(f"Upload failed: {text}")
                    raise Exception(text)

    @with_token_refresh
    async def get_file_url(self, expense_title, file_name, access_token=None):
        subfolder = self._sanitize_folder_name(expense_title)
        full_path = f"{self.folder_name}/{subfolder}/{file_name}"
        url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{full_path}"
        headers = {
            "Authorization": f"Bearer {access_token}",
        }
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    result = await response.json()
                    self._logger.info(f"File URL retrieved for {full_path}")
                    return {"success": True, "web_url": result.get("webUrl")}
                elif response.status == 404:
                    self._logger.warning(f"File not found: {full_path}")
                    return {"success": False, "error": "File not found in OneDrive."}
                else:
                    text = await response.text()
                    self._logger.error(f"Failed to get file URL: {text}")
                    raise Exception(text)

    @with_token_refresh
    async def file_exists(self, expense_title, file_name, access_token=None):
        subfolder = self._sanitize_folder_name(expense_title)
        full_path = f"{self.folder_name}/{subfolder}/{file_name}"
        url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{full_path}"
        headers = {
            "Authorization": f"Bearer {access_token}",
        }
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                return response.status == 200

    @with_token_refresh
    async def download_file(self, file_path, access_token=None):
        parts = file_path.split('/')
        if len(parts) >= 2:
            expense_title = parts[0]
            filename = parts[1]
        else:
            self._logger.error(f"Invalid file path format: {file_path}")
            raise Exception(f"Invalid file path format: {file_path}")
        subfolder = self._sanitize_folder_name(expense_title)
        full_path = f"{self.folder_name}/{subfolder}/{filename}"
        url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{full_path}:/content"
        headers = {
            "Authorization": f"Bearer {access_token}",
        }
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers) as response:
                if response.status == 200:
                    content = await response.read()
                    self._logger.info(f"File downloaded from {full_path}")
                    return content
                else:
                    text = await response.text()
                    self._logger.error(f"Failed to download file: {text}")
                    raise Exception(text)

    @with_token_refresh
    async def delete_file(self, file_path, access_token=None):
        parts = file_path.split('/')
        if len(parts) >= 2:
            expense_title = parts[0]
            filename = parts[1]
        else:
            self._logger.error(f"Invalid file path format: {file_path}")
            raise Exception(f"Invalid file path format: {file_path}")
        subfolder = self._sanitize_folder_name(expense_title)
        full_path = f"{self.folder_name}/{subfolder}/{filename}"
        url = f"https://graph.microsoft.com/v1.0/me/drive/special/approot:/{full_path}"
        headers = {
            "Authorization": f"Bearer {access_token}",
        }
        async with aiohttp.ClientSession() as session:
            async with session.delete(url, headers=headers) as response:
                if response.status in (200, 204):
                    self._logger.info(f"File deleted from {full_path}")
                    return True
                else:
                    text = await response.text()
                    self._logger.error(f"Failed to delete file: {text}")
                    raise Exception(text)