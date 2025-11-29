from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.contrib.auth import get_user_model
from django.utils import timezone
from typing import Optional, Tuple

User = get_user_model()


class EmailService:
    @staticmethod
    def send_temporary_password(user, temporary_password, reset_token):
        """Envia email com senha temporária e link de redefinição"""
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

        subject = 'Bem-vindo ao Sistema - Senha Temporária'

        html_message = f"""
        <html>
        <body>
            <h2>Olá {user.get_full_name() or user.username}!</h2>
            <p>Sua conta foi criada com sucesso no sistema.</p>

            <h3>Dados de acesso:</h3>
            <p><strong>Usuário:</strong> {user.username}</p>
            <p><strong>Senha temporária:</strong> {temporary_password}</p>

            <p><strong>IMPORTANTE:</strong> Por segurança, você deve alterar sua senha no primeiro acesso.</p>

            <p>Clique no link abaixo para redefinir sua senha:</p>
            <p><a href="{reset_link}">Redefinir Senha</a></p>

            <p>Ou copie e cole este link no navegador:</p>
            <p>{reset_link}</p>

            <p>Este link expira em 24 horas.</p>

            <hr>
            <p style="color: #666; font-size: 12px;">
                Se você não solicitou esta conta, por favor ignore este email.
            </p>
        </body>
        </html>
        """

        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )

    @staticmethod
    def send_password_reset_email(user, reset_token):
        """Envia email com link de redefinição de senha"""
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"

        subject = 'Redefinição de Senha'

        html_message = f"""
        <html>
        <body>
            <h2>Olá {user.get_full_name() or user.username}!</h2>
            <p>Recebemos uma solicitação para redefinir sua senha.</p>

            <p>Clique no link abaixo para criar uma nova senha:</p>
            <p><a href="{reset_link}">Redefinir Senha</a></p>

            <p>Ou copie e cole este link no navegador:</p>
            <p>{reset_link}</p>

            <p>Este link expira em 24 horas.</p>

            <hr>
            <p style="color: #666; font-size: 12px;">
                Se você não solicitou a redefinição de senha, por favor ignore este email.
            </p>
        </body>
        </html>
        """

        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )


class UserService:
    """Service layer for user-related business logic"""

    @staticmethod
    def create_user_with_temporary_password(username: str, email: str, **extra_fields) -> Tuple[User, str]:
        """
        Creates a user with a temporary password and sends welcome email.

        Args:
            username: The username for the new user
            email: The email for the new user
            **extra_fields: Additional fields for user creation

        Returns:
            Tuple of (User instance, temporary password string)
        """
        # Generate temporary password
        temporary_password = User.generate_temporary_password()

        # Create user with temporary password
        user = User.objects.create_user(
            username=username,
            email=email,
            password=temporary_password,
            **extra_fields
        )

        # Set flag to force password change
        user.must_change_password = True

        # Generate reset token for password change
        reset_token = user.generate_reset_token()
        user.save()

        # Send welcome email with temporary password
        try:
            EmailService.send_temporary_password(user, temporary_password, reset_token)
        except Exception as e:
            # Log error but don't fail user creation
            print(f"Failed to send welcome email to {email}: {str(e)}")

        return user, temporary_password

    @staticmethod
    def get_user_by_email(email: str) -> Optional[User]:
        """
        Retrieves a user by email address.

        Args:
            email: The email to search for

        Returns:
            User instance if found, None otherwise
        """
        try:
            return User.objects.get(email=email)
        except User.DoesNotExist:
            return None

    @staticmethod
    def request_password_reset(email: str) -> Optional[User]:
        """
        Initiates password reset process by generating token and sending email.

        Args:
            email: Email address of the user requesting reset

        Returns:
            User instance if found, None otherwise (for security, same response either way)
        """
        user = UserService.get_user_by_email(email)

        if user:
            # Generate reset token
            reset_token = user.generate_reset_token()
            user.save()

            # Send reset email
            try:
                EmailService.send_password_reset_email(user, reset_token)
            except Exception as e:
                print(f"Failed to send password reset email to {email}: {str(e)}")

        # Always return None for security (don't reveal if email exists)
        return None

    @staticmethod
    def reset_password_with_token(token: str, new_password: str) -> Tuple[bool, Optional[str], Optional[User]]:
        """
        Resets user password using a valid reset token.

        Args:
            token: The password reset token
            new_password: The new password to set

        Returns:
            Tuple of (success: bool, error_message: Optional[str], user: Optional[User])
        """
        try:
            user = User.objects.get(reset_password_token=token)
        except User.DoesNotExist:
            return False, 'Token de redefinição inválido', None

        # Check if token is expired
        if user.reset_password_token_expires < timezone.now():
            return False, 'Token de redefinição expirado', None

        # Set new password
        user.set_password(new_password)
        user.must_change_password = False

        # Clear reset token
        user.reset_password_token = None
        user.reset_password_token_expires = None
        user.save()

        return True, None, user

    @staticmethod
    def change_password(user: User, old_password: str, new_password: str) -> Tuple[bool, Optional[str]]:
        """
        Changes user password after validating the old password.

        Args:
            user: The user whose password to change
            old_password: Current password for validation
            new_password: New password to set

        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        # Validate old password
        if not user.check_password(old_password):
            return False, 'Senha atual incorreta'

        # Set new password
        user.set_password(new_password)
        user.must_change_password = False
        user.save()

        return True, None

    @staticmethod
    def validate_user_credentials(email: str, password: str) -> Tuple[bool, Optional[User], Optional[str]]:
        """
        Validates user credentials for authentication.

        Args:
            email: User's email address
            password: User's password

        Returns:
            Tuple of (is_valid: bool, user: Optional[User], error_message: Optional[str])
        """
        user = UserService.get_user_by_email(email)

        if not user:
            return False, None, 'Credenciais inválidas'

        if not user.check_password(password):
            return False, None, 'Credenciais inválidas'

        if not user.is_active:
            return False, None, 'Usuário inativo'

        return True, user, None
