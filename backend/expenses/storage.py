from django.core.files.storage import Storage
from django.utils.deconstruct import deconstructible
from .services.onedrive_service import OneDriveService
import asyncio
import os
import tempfile
import logging

logger = logging.getLogger(__name__)

@deconstructible
class OneDriveStorage(Storage):
    def __init__(self):
        self.service = OneDriveService()
        self.master_folder = 'billing_uploads'

    def _open(self, name, mode='rb'):
        try:
            file_content = asyncio.run(self.service.download_file(name))
            if not file_content:
                logger.error(f"File not found or empty in OneDrive: {name}")
                raise FileNotFoundError(f"File not found in OneDrive: {name}")

            temp_file = tempfile.NamedTemporaryFile(delete=False)
            temp_file.write(file_content)
            temp_file.close()
            return open(temp_file.name, mode)
        except FileNotFoundError:
            raise
        except Exception as e:
            logger.error(f"Error opening file from OneDrive: {str(e)}")
            raise FileNotFoundError(f"Error accessing file from OneDrive: {str(e)}")

    def _save(self, name, content):
        try:
            instance = getattr(content, 'instance', None)

            expense_title = None
            if instance and hasattr(instance, 'expense_form') and instance.expense_form and instance.expense_form.expense_title:
                expense_title = instance.expense_form.expense_title.title
            elif hasattr(instance, 'expense_title') and instance.expense_title:
                expense_title = instance.expense_title.title
            elif hasattr(instance, 'expense_form') and instance.expense_form and hasattr(instance.expense_form, 'expense_title_id'):
                from .models import ExpenseTitle
                try:
                    expense_title_obj = ExpenseTitle.objects.get(id=instance.expense_form.expense_title_id)
                    expense_title = expense_title_obj.title
                except ExpenseTitle.DoesNotExist:
                    pass

            if not expense_title:
                raise Exception(f"❌ Cannot determine expense_title for file: {name}. Upload aborted.")

            expense_title = self._sanitize_folder_name(expense_title)
            filename = os.path.basename(name)

            result = asyncio.run(self.service.upload_file(
                content.read(),
                expense_title,
                filename
            ))

            if not result['success']:
                logger.error(f"Failed to upload to OneDrive for '{expense_title}': {result.get('error', 'Unknown error')}")
                raise Exception(f"Upload to OneDrive failed: {result.get('error', 'Unknown error')}")

            return f"{expense_title}/{filename}"

        except Exception as e:
            logger.error(f"Error saving file to OneDrive: {str(e)}")
            raise

    def _sanitize_folder_name(self, name):
        invalid_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
        for char in invalid_chars:
            name = name.replace(char, "_")
        return name.strip(". ")

    def delete(self, name):
        try:
            asyncio.run(self.service.delete_file(name))
        except Exception as e:
            logger.error(f"Error deleting file from OneDrive: {str(e)}")
            raise

    def exists(self, name):
        try:
            parts = name.split('/')
            if len(parts) >= 2:
                expense_title = parts[0]
                filename = parts[1]
                return asyncio.run(self.service.file_exists(expense_title, filename))
            return False
        except Exception as e:
            logger.error(f"Error checking file existence in OneDrive: {str(e)}")
            return False

    def url(self, name):
        try:
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
        return os.path.basename(filename)

    def size(self, name): return 0
    def get_accessed_time(self, name): return None
    def get_created_time(self, name): return None
    def get_modified_time(self, name): return None