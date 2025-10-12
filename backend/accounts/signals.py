from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.db import transaction
from .models import CustomUser, InternalProfile, ExternalProfile


@receiver(pre_save, sender=CustomUser)
def validate_user_profile_type(sender, instance, **kwargs):
    """
    Pre-save signal to validate user data before saving.
    Ensures data consistency based on profile type.
    """
    # If profile type changed, we need to handle profile migration
    if instance.pk:
        try:
            old_instance = CustomUser.objects.get(pk=instance.pk)
            if old_instance.profile_type != instance.profile_type:
                # Profile type changed - need to handle profile deletion/creation
                # This will be handled by post_save signal
                pass
        except CustomUser.DoesNotExist:
            pass


@receiver(post_save, sender=CustomUser)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """
    Post-save signal to automatically create the appropriate profile
    when a user is created or updated.

    Creates InternalProfile for internal users and ExternalProfile for external users.
    Handles profile type changes by deleting old profile and creating new one.
    """
    # Avoid recursion by checking if we're in a signal handler
    if kwargs.get('raw', False):
        return

    # Use atomic transaction to ensure data consistency
    with transaction.atomic():
        if instance.profile_type == 'interno':
            # Create or get internal profile
            InternalProfile.objects.get_or_create(user=instance)

            # Delete external profile if it exists
            try:
                if hasattr(instance, 'external_profile'):
                    instance.external_profile.delete()
            except ExternalProfile.DoesNotExist:
                pass

        elif instance.profile_type == 'externo':
            # For external profiles, we need company_name and external_type
            # These should be provided separately through the admin or API
            # We'll create the profile only if it doesn't exist
            # This prevents errors when creating user without profile data

            # Delete internal profile if it exists
            try:
                if hasattr(instance, 'internal_profile'):
                    instance.internal_profile.delete()
            except InternalProfile.DoesNotExist:
                pass

            # Note: ExternalProfile creation is handled separately
            # because it requires additional required fields (company_name, external_type)
            # The admin or API should handle this creation explicitly


@receiver(post_save, sender=InternalProfile)
def ensure_internal_profile_consistency(sender, instance, created, **kwargs):
    """
    Ensure the user associated with an internal profile has the correct profile_type.
    """
    if kwargs.get('raw', False):
        return

    if instance.user.profile_type != 'interno':
        instance.user.profile_type = 'interno'
        instance.user.save(update_fields=['profile_type'])


@receiver(post_save, sender=ExternalProfile)
def ensure_external_profile_consistency(sender, instance, created, **kwargs):
    """
    Ensure the user associated with an external profile has the correct profile_type.
    """
    if kwargs.get('raw', False):
        return

    if instance.user.profile_type != 'externo':
        instance.user.profile_type = 'externo'
        instance.user.save(update_fields=['profile_type'])
