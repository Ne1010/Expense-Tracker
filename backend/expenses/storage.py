from django.core.files.storage import Storage
from django.conf import settings
from django.utils.deconstruct import deconstructible
from .services.onedrive_service import OneDriveService
import asyncio
import base64
import os
from pathlib import Path
import uuid

@deconstructible
class OneDriveStorage(Storage):
    def __init__(self):
        self.onedrive = OneDriveService()
        self._ensure_onedrive_initialized()

    def _ensure_onedrive_initialized(self):
        """Ensure OneDrive is initialized by getting an access token"""
        try:
            asyncio.run(self.onedrive.get_access_token())
        except Exception as e:
            print(f"Failed to initialize OneDrive: {str(e)}")

    def _get_valid_name(self, name):
        """Get a valid filename for OneDrive"""
        return name.replace('\\', '/').replace('//', '/')

    def generate_filename(self, filename):
        """Generate a unique filename for the file"""
        ext = os.path.splitext(filename)[1]
        return f"{uuid.uuid4().hex}{ext}"

    def _open(self, name, mode='rb'):
        """Open a file from OneDrive"""
        raise NotImplementedError("OneDrive storage does not support direct file opening")

    def _save(self, name, content):
        """Save a file to OneDrive"""
        try:
            # Read the file content
            content.seek(0)
            file_content = content.read()
            
            # Convert to base64
            base64_content = base64.b64encode(file_content).decode('utf-8')
            
            # Upload to OneDrive
            result = asyncio.run(self.onedrive.upload_file_from_base64(
                base64_content,
                self._get_valid_name(name)
            ))
            
            if result['success']:
                return name
            else:
                raise Exception(f"Failed to upload to OneDrive: {result['error']}")
        except Exception as e:
            raise Exception(f"Error saving file to OneDrive: {str(e)}")

    def delete(self, name):
        """Delete a file from OneDrive"""
        # Not implemented as we want to keep files in OneDrive
        pass

    def exists(self, name):
        """Check if a file exists in OneDrive"""
        # Not implemented as we don't need to check existence
        return False

    def url(self, name):
        """Get the URL for a file in OneDrive"""
        try:
            # Get the file URL from OneDrive
            result = asyncio.run(self.onedrive.get_file_url(self._get_valid_name(name)))
            if result['success']:
                return result['web_url']
            return None
        except Exception as e:
            print(f"Error getting OneDrive URL: {str(e)}")
            return None

    def size(self, name):
        """Get the size of a file in OneDrive"""
        # Not implemented as we don't need file size
        return 0

    def get_accessed_time(self, name):
        """Get the last accessed time of a file in OneDrive"""
        # Not implemented as we don't need access time
        return None

    def get_created_time(self, name):
        """Get the creation time of a file in OneDrive"""
        # Not implemented as we don't need creation time
        return None

    def get_modified_time(self, name):
        """Get the last modified time of a file in OneDrive"""
        # Not implemented as we don't need modified time
        return None 