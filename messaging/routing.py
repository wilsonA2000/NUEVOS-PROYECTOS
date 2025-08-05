"""
Routing WebSocket para la aplicación de mensajería.
Define las rutas WebSocket para diferentes tipos de conexiones en tiempo real.
"""

from django.urls import re_path, path
from . import consumers

websocket_urlpatterns = [
    # WebSocket para mensajería en tiempo real
    re_path(r'ws/messaging/$', consumers.MessageConsumer.as_asgi()),
    
    # WebSocket para notificaciones generales
    re_path(r'ws/notifications/$', consumers.NotificationConsumer.as_asgi()),
    
    # WebSocket para conversaciones específicas
    re_path(r'ws/messaging/thread/(?P<thread_id>\d+)/$', consumers.ThreadConsumer.as_asgi()),
    
    # WebSocket para estados de usuario (online/offline)
    re_path(r'ws/user-status/$', consumers.UserStatusConsumer.as_asgi()),
]