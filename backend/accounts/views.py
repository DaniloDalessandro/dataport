from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import Company
from .serializers import (
    CompanySerializer,
    UserSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    ChangePasswordSerializer,
    CustomTokenObtainPairSerializer
)
from .services import EmailService

User = get_user_model()


class CompanyViewSet(viewsets.ModelViewSet):
    queryset = Company.objects.all()
    serializer_class = CompanySerializer
    permission_classes = [IsAuthenticated]


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def request_password_reset(self, request):
        """Solicita redefinição de senha"""
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']

        try:
            user = User.objects.get(email=email)
            reset_token = user.generate_reset_token()
            EmailService.send_password_reset_email(user, reset_token)
            return Response(
                {'message': 'Email de redefinição enviado com sucesso.'},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            # Por segurança, não revelar se o email existe
            return Response(
                {'message': 'Se o email existir, um link de redefinição será enviado.'},
                status=status.HTTP_200_OK
            )

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def reset_password(self, request):
        """Redefine a senha usando o token"""
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['token']
        new_password = serializer.validated_data['new_password']

        try:
            user = User.objects.get(
                reset_password_token=token,
                reset_password_token_expires__gt=timezone.now()
            )

            user.set_password(new_password)
            user.reset_password_token = None
            user.reset_password_token_expires = None
            user.must_change_password = False
            user.save()

            return Response(
                {'message': 'Senha redefinida com sucesso.'},
                status=status.HTTP_200_OK
            )
        except User.DoesNotExist:
            return Response(
                {'error': 'Token inválido ou expirado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def change_password(self, request):
        """Altera a senha do usuário autenticado"""
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        # Verifica a senha antiga
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'error': 'Senha antiga incorreta.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Define a nova senha
        user.set_password(serializer.validated_data['new_password'])
        user.must_change_password = False
        user.save()

        return Response(
            {'message': 'Senha alterada com sucesso.'},
            status=status.HTTP_200_OK
        )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Retorna os dados do usuário autenticado"""
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Custom login view with email support"""
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class LogoutView(APIView):
    """Logout view that blacklists the refresh token"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
            return Response(
                {"message": "Logout realizado com sucesso."},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"error": "Token inválido ou já utilizado."},
                status=status.HTTP_400_BAD_REQUEST
            )
