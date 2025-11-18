from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Company, InternalProfile, ExternalProfile


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ['name', 'cnpj', 'email', 'phone', 'is_active', 'created_by', 'created_at']
    list_filter = ['is_active', 'created_at', 'created_by']
    search_fields = ['name', 'cnpj', 'email']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by']

    fieldsets = (
        ('Informações Básicas', {
            'fields': ('name', 'cnpj', 'email', 'phone')
        }),
        ('Endereço', {
            'fields': ('address',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Auditoria', {
            'fields': ('created_at', 'created_by', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'cpf', 'is_active', 'is_staff', 'created_by']
    list_filter = ['is_active', 'is_staff', 'is_superuser', 'companies', 'created_by']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'cpf']
    ordering = ['username']
    filter_horizontal = ['companies', 'groups', 'user_permissions']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'updated_by', 'last_login', 'date_joined']

    fieldsets = (
        ('Credenciais', {
            'fields': ('username', 'password')
        }),
        ('Informações Pessoais', {
            'fields': ('first_name', 'last_name', 'email', 'cpf', 'phone')
        }),
        ('Empresas', {
            'fields': ('companies',)
        }),
        ('Permissões', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions'),
            'classes': ('collapse',)
        }),
        ('Auditoria', {
            'fields': ('last_login', 'date_joined', 'created_at', 'created_by', 'updated_at', 'updated_by'),
            'classes': ('collapse',)
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'password1', 'password2', 'email', 'first_name', 'last_name', 'cpf', 'phone', 'companies'),
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        obj.updated_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(InternalProfile)
class InternalProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'department', 'position', 'employee_id', 'created_at']
    list_filter = ['department', 'created_at']
    search_fields = ['user__username', 'user__email', 'employee_id', 'department', 'position']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ExternalProfile)
class ExternalProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'company_name', 'external_type', 'cnpj', 'created_at']
    list_filter = ['external_type', 'created_at']
    search_fields = ['user__username', 'user__email', 'company_name', 'cnpj']
    readonly_fields = ['created_at', 'updated_at']
