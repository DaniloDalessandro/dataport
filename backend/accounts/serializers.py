from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Company

User = get_user_model()


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ['id', 'name', 'cnpj', 'email', 'phone', 'is_active',
                  'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class UserSerializer(serializers.ModelSerializer):
    companies = CompanySerializer(many=True, read_only=True)
    company_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Company.objects.all(),
        write_only=True,
        required=False,
        source='companies'
    )

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'phone', 'cpf', 'is_active', 'companies', 'company_ids',
                  'must_change_password', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'must_change_password']

    def create(self, validated_data):
        # Gera senha temporária
        temporary_password = User.generate_temporary_password()

        user = User.objects.create_user(
            **validated_data,
            password=temporary_password,
            must_change_password=True
        )

        # Gera token de redefinição
        reset_token = user.generate_reset_token()

        # Envia email
        from .services import EmailService
        EmailService.send_temporary_password(user, temporary_password, reset_token)

        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("As senhas não coincidem.")
        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError("As senhas não coincidem.")
        return data
