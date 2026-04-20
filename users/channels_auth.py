"""JWT auth middleware para Django Channels (WebSocket).

El frontend (`websocketService.ts`) pasa el token de acceso JWT en la
query string como `?token=<jwt>`. El `AuthMiddlewareStack` por defecto
de Channels sólo autentica por cookie de sesión Django, por lo que las
conexiones WS quedaban anónimas y los consumidores cerraban con 4001.

Este middleware valida el token vía SimpleJWT y coloca el `User` en
`scope['user']`. Si el token falta o es inválido, el usuario queda como
`AnonymousUser` y el consumer cerrará la conexión según su política.
"""

from __future__ import annotations

from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser

User = get_user_model()


@database_sync_to_async
def _get_user_from_token(raw_token: str):
    """Resuelve un JWT a su User correspondiente.

    Devuelve `AnonymousUser` ante cualquier fallo (token inválido,
    expirado, malformado, etc.) para que el consumer decida si cerrar
    la conexión.
    """
    try:
        from rest_framework_simplejwt.tokens import UntypedToken
        from rest_framework_simplejwt.exceptions import (
            InvalidToken,
            TokenError,
        )

        try:
            validated = UntypedToken(raw_token)
        except (InvalidToken, TokenError):
            return AnonymousUser()

        user_id = validated.get("user_id")
        if not user_id:
            return AnonymousUser()
        try:
            return User.objects.get(pk=user_id, is_active=True)
        except User.DoesNotExist:
            return AnonymousUser()
    except Exception:  # pragma: no cover - auth no debe romper el WS
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """Lee `?token=<jwt>` del query string y puebla `scope['user']`."""

    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        params = parse_qs(query_string)
        tokens = params.get("token") or []
        if tokens:
            scope["user"] = await _get_user_from_token(tokens[0])
        else:
            # Deja que el siguiente middleware (AuthMiddlewareStack)
            # intente autenticar por sesión.
            if "user" not in scope:
                scope["user"] = AnonymousUser()
        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """Helper idiomático estilo `AuthMiddlewareStack`."""
    from channels.auth import AuthMiddlewareStack

    # Orden: primero intenta JWT del query string. Si no hay token,
    # cae al flujo de sesión.
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))
