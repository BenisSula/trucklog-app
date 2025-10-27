"""
ASGI config for trucklog_backend project.
"""

import os
import django
from django.core.asgi import get_asgi_application

# Setup Django first
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'trucklog_backend.settings')
django.setup()

# Import after Django setup
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from core_utils.routing import websocket_urlpatterns

# Get Django ASGI application
django_asgi_app = get_asgi_application()

# Create the main ASGI application
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})