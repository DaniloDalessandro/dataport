from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags


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
