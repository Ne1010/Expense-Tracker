from django.core.files.storage import Storage
from django.conf import settings
from django.utils.deconstruct import deconstructible
from .services.onedrive_service import OneDriveService
import asyncio
import os
from pathlib import Path
import uuid
import tempfile
import logging

logger = logging.getLogger(__name__)

@deconstructible
class OneDriveStorage(Storage):
    def __init__(self):
        self.service = OneDriveService()
        self.master_folder = 'billing_uploads'

    def _open(self, name, mode='rb'):
        """Open a file from OneDrive"""
        try:
            # Get the file content from OneDrive
            file_content = asyncio.run(self.service.download_file(name))
            if not file_content:
                raise FileNotFoundError(f"File not found in OneDrive: {name}")
            
            # Create a temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False)
            temp_file.write(file_content)
            temp_file.close()
            
            # Open the temporary file
            return open(temp_file.name, mode)
        except Exception as e:
            logger.error(f"Error opening file from OneDrive: {str(e)}")
            raise

    def _save(self, name, content):
        """Save a file to OneDrive"""
        try:
            # Get the expense form instance
            instance = getattr(content, 'instance', None)
            if not instance or not instance.expense_title:
                raise ValueError("File must be associated with an expense form that has an expense title")

            # Generate a valid filename
            filename = self.generate_filename(name)
            
            # Get the expense title for the subfolder
            expense_title = instance.expense_title.title
            
            # Upload the file to OneDrive
            result = asyncio.run(self.service.upload_file(
                content.read(),
                expense_title,
                filename
            ))
            
            if not result['success']:
                raise Exception(f"Failed to upload to OneDrive: {result.get('error', 'Unknown error')}")
            
            # Return the path that will be stored in the database
            return f"{expense_title}/{filename}"
            
        except Exception as e:
            logger.error(f"Error saving file to OneDrive: {str(e)}")
            raise

    def delete(self, name):
        """Delete a file from OneDrive"""
        try:
            asyncio.run(self.service.delete_file(name))
        except Exception as e:
            logger.error(f"Error deleting file from OneDrive: {str(e)}")
            raise

    def exists(self, name):
        """Check if a file exists in OneDrive"""
        try:
            return asyncio.run(self.service.file_exists(name))
        except Exception as e:
            logger.error(f"Error checking file existence in OneDrive: {str(e)}")
            return False

    def url(self, name):
        """Get the URL for a file in OneDrive"""
        try:
            # Extract expense title and filename from the path
            parts = name.split('/')
            if len(parts) >= 2:
                expense_title = parts[0]
                filename = parts[1]
                result = asyncio.run(self.service.get_file_url(expense_title, filename))
                if result and result.get('success'):
                    return result.get('web_url')
                else:
                    logger.error(f"Failed to get file URL: {result.get('error', 'Unknown error')}")
                    return None
            else:
                logger.error(f"Invalid file path format: {name}")
                return None
        except Exception as e:
            logger.error(f"Error getting file URL from OneDrive: {str(e)}")
            return None

    def generate_filename(self, filename):
        """Generate a filename, preserving the original name"""
        # Just return the original filename, only sanitize if needed
        return os.path.basename(filename)

    def size(self, name):
        return 0

    def get_accessed_time(self, name):
        return None

    def get_created_time(self, name):
        return None

    def get_modified_time(self, name):
        return None