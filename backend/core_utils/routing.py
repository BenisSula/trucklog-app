"""
WebSocket routing configuration for real-time features
"""

from django.urls import path, re_path
from .consumers import NotificationConsumer, TripUpdateConsumer

websocket_urlpatterns = [
    re_path(r'ws/notifications/(?P<user_id>\d+)/$', NotificationConsumer.as_asgi()),
    path('ws/notifications/', NotificationConsumer.as_asgi()),
    path('ws/trips/<int:trip_id>/', TripUpdateConsumer.as_asgi()),
]