"""
ASGI config for verihome project.

It exposes the ASGI callable as a module-level variable named ``application``.
Configura WebSocket routing para mensajería en tiempo real.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'verihome.settings')
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from messaging.routing import websocket_urlpatterns
from users.channels_auth import JWTAuthMiddlewareStack

application = ProtocolTypeRouter({
    # Django HTTP handling
    "http": get_asgi_application(),

    # WebSocket handling
    # JWTAuthMiddlewareStack lee ?token=<jwt> del query string (frontend
    # usa websocketService.ts con ese patrón). Si no hay token, cae al
    # AuthMiddlewareStack (sesión).
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
