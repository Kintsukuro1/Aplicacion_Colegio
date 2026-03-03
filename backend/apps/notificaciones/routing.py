"""
Configuración de routing para WebSockets en la app de notificaciones
"""
from django.urls import re_path

# Por ahora, websocket_urlpatterns vacío hasta migración completa de consumers
websocket_urlpatterns = []

# TODO: Descomentar cuando se migre consumers.py
# from . import consumers
# websocket_urlpatterns = [
#     re_path(r'ws/notificaciones/$', consumers.NotificacionesConsumer.as_asgi()),
# ]
