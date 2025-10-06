from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.utils.crypto import get_random_string
import secrets


class Company(models.Model):
    name = models.CharField('Nome', max_length=200)
    cnpj = models.CharField('CNPJ', max_length=18, unique=True)
    email = models.EmailField('E-mail', blank=True, null=True)
    phone = models.CharField('Telefone', max_length=20, blank=True, null=True)
    is_active = models.BooleanField('Ativa', default=True)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='companies_created',
        verbose_name='Criado por'
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='companies_updated',
        verbose_name='Atualizado por'
    )

    class Meta:
        verbose_name = 'Empresa'
        verbose_name_plural = 'Empresas'
        ordering = ['name']

    def __str__(self):
        return self.name


class CustomUser(AbstractUser):
    companies = models.ManyToManyField(
        Company,
        related_name='users',
        verbose_name='Empresas',
        blank=True
    )
    phone = models.CharField('Telefone', max_length=20, blank=True, null=True)
    cpf = models.CharField('CPF', max_length=14, unique=True, blank=True, null=True)
    is_active = models.BooleanField('Ativo', default=True)
    reset_password_token = models.CharField('Token de Redefinição', max_length=100, blank=True, null=True)
    reset_password_token_expires = models.DateTimeField('Token Expira em', blank=True, null=True)
    must_change_password = models.BooleanField('Deve alterar senha', default=False)
    created_at = models.DateTimeField('Criado em', auto_now_add=True)
    updated_at = models.DateTimeField('Atualizado em', auto_now=True)
    created_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users_created',
        verbose_name='Criado por'
    )
    updated_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='users_updated',
        verbose_name='Atualizado por'
    )

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'
        ordering = ['username']

    def __str__(self):
        return f"{self.get_full_name() or self.username}"

    def generate_reset_token(self):
        """Gera um token seguro para redefinição de senha"""
        self.reset_password_token = secrets.token_urlsafe(32)
        from django.utils import timezone
        from datetime import timedelta
        self.reset_password_token_expires = timezone.now() + timedelta(hours=24)
        self.save()
        return self.reset_password_token

    @staticmethod
    def generate_temporary_password():
        """Gera uma senha temporária segura"""
        return get_random_string(12)
