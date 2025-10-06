from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


class Company(models.Model):
    name = models.CharField('Nome', max_length=200)
    cnpj = models.CharField('CNPJ', max_length=18, unique=True)
    email = models.EmailField('E-mail', blank=True, null=True)
    phone = models.CharField('Telefone', max_length=20, blank=True, null=True)
    address = models.CharField('Endereço', max_length=300, blank=True, null=True)
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
