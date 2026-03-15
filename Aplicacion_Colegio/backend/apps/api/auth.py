from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.views import TokenObtainPairView

from backend.apps.api.services.auth_audit_service import AuthApiAuditService


class ColegioTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Extiende JWT con claims minimas de contexto para cliente movil."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['rbd_colegio'] = getattr(user, 'rbd_colegio', None)
        token['role'] = getattr(getattr(user, 'role', None), 'nombre', None)
        return token


class AuthTokenBurstThrottle(AnonRateThrottle):
    scope = 'auth_token_burst'


class AuthTokenSustainedThrottle(AnonRateThrottle):
    scope = 'auth_token_sustained'


class ColegioTokenObtainPairView(TokenObtainPairView):
    serializer_class = ColegioTokenObtainPairSerializer
    throttle_classes = [AuthTokenBurstThrottle, AuthTokenSustainedThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        user_id = None
        if response.status_code == status.HTTP_200_OK:
            refresh_token = response.data.get('refresh') if isinstance(response.data, dict) else None
            if refresh_token:
                try:
                    user_id = int(RefreshToken(refresh_token).get('user_id'))
                except (TokenError, TypeError, ValueError):
                    user_id = None

        try:
            AuthApiAuditService.audit_token_obtain(
                request=request,
                status_code=response.status_code,
                user_id=user_id,
                login_identifier=request.data.get('email') if hasattr(request, 'data') else None,
            )
        except Exception:
            # La auditoria nunca debe bloquear autenticacion.
            pass

        return response


class AuditedTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        try:
            AuthApiAuditService.audit_token_refresh(request=request, status_code=response.status_code)
        except Exception:
            pass
        return response


class AuditedTokenVerifyView(TokenVerifyView):
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        try:
            AuthApiAuditService.audit_token_verify(request=request, status_code=response.status_code)
        except Exception:
            pass
        return response


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get('refresh')
        if not refresh_token:
            response = Response({'detail': 'Debe enviar el refresh token.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                AuthApiAuditService.audit_logout(request=request, status_code=response.status_code, detail='missing_refresh')
            except Exception:
                pass
            return response

        try:
            token = RefreshToken(refresh_token)
            token_user_id = token.get('user_id')
            if token_user_id != request.user.id:
                response = Response(
                    {'detail': 'Refresh token no pertenece al usuario autenticado.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
                try:
                    AuthApiAuditService.audit_logout(request=request, status_code=response.status_code, detail='refresh_not_owned')
                except Exception:
                    pass
                return response

            try:
                token.blacklist()
                response = Response({'detail': 'Sesion cerrada.'}, status=status.HTTP_200_OK)
                try:
                    AuthApiAuditService.audit_logout(request=request, status_code=response.status_code, detail='logout_ok_blacklisted')
                except Exception:
                    pass
                return response
            except AttributeError:
                # Blacklist es opcional; si no esta configurado, se mantiene respuesta exitosa.
                response = Response(
                    {'detail': 'Sesion cerrada. Blacklist de tokens no esta habilitado.'},
                    status=status.HTTP_200_OK,
                )
                try:
                    AuthApiAuditService.audit_logout(request=request, status_code=response.status_code, detail='logout_ok_no_blacklist')
                except Exception:
                    pass
                return response
        except TokenError:
            response = Response({'detail': 'Refresh token invalido.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                AuthApiAuditService.audit_logout(request=request, status_code=response.status_code, detail='invalid_refresh')
            except Exception:
                pass
            return response
