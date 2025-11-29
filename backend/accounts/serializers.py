from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
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
        """Create user using UserService layer"""
        from .services import UserService

        # Extract username and email from validated data
        username = validated_data.pop('username')
        email = validated_data.pop('email')

        # Use service layer to create user with temporary password
        user, _ = UserService.create_user_with_temporary_password(
            username=username,
            email=email,
            **validated_data
        )

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


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom serializer to allow login with email instead of username"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(required=True, write_only=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Remove username field requirement
        if 'username' in self.fields:
            del self.fields['username']

    def validate(self, attrs):
        """Validate credentials using UserService layer"""
        from .services import UserService

        # Get email and password from request
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            # Use service layer to validate credentials
            is_valid, user, error_message = UserService.validate_user_credentials(email, password)

            if not is_valid:
                raise serializers.ValidationError({'non_field_errors': [error_message]})

            # Add username to attrs for parent validation
            attrs[self.username_field] = user.username

        # Call parent validation
        data = super().validate(attrs)

        # Add user data to response
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'profile_type': getattr(self.user, 'profile_type', None),
            'is_superuser': self.user.is_superuser,
        }

        return data
