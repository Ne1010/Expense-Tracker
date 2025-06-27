from django.core.management.base import BaseCommand
from expenses.services.onedrive_service import OneDriveService
import webbrowser
import logging

class Command(BaseCommand):
    help = 'Performs interactive authentication with OneDrive to get a new refresh token.'

    def handle(self, *args, **options):
        logger = logging.getLogger(__name__)
        self.stdout.write("Starting OneDrive authentication process...")
        
        try:
            onedrive_service = OneDriveService()
            
            # Use ALL_SCOPES to ensure we get a refresh token
            flow = onedrive_service.app.initiate_device_flow(scopes=onedrive_service.ALL_SCOPES)

            if "user_code" not in flow:
                self.stdout.write(self.style.ERROR("Failed to initiate device flow. Response from Microsoft Graph was missing 'user_code'."))
                self.stdout.write(self.style.ERROR(f"Response from server: {flow}"))
                logger.error(f"Device flow initiation failed. Flow details: {flow}")
                return

            self.stdout.write(self.style.SUCCESS(
                f"\n1. To sign in, use a web browser to open the page: {flow['verification_uri']}"
                f"\n2. Enter the code: {flow['user_code']}"
                "\nThis command will wait for you to complete the authentication in your browser."
            ))

            try:
                webbrowser.open(flow['verification_uri'], new=2)
                self.stdout.write("Your web browser should have opened for you to authenticate. If not, please copy/paste the URL.")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Could not automatically open web browser: {e}. Please open the URL manually."))

            # This call will block until authentication is complete or timed out.
            result = onedrive_service.app.acquire_token_by_device_flow(flow)

            if "access_token" in result:
                onedrive_service._save_token_cache()
                self.stdout.write(self.style.SUCCESS('\nSuccessfully authenticated with OneDrive! The new token has been saved.'))
            else:
                error = result.get("error", "Unknown error")
                error_description = result.get("error_description", "No description available.")
                self.stdout.write(self.style.ERROR(f"\nAuthentication failed: {error} - {error_description}"))
                logger.error(f"Authentication failed. Result: {result}")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"An unexpected error occurred during authentication: {e}"))
            logger.exception("Unexpected error in onedrive_auth command") 