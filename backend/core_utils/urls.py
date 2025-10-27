from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .hos_urls import urlpatterns as hos_urlpatterns

router = DefaultRouter()
router.register(r'notifications', views.NotificationViewSet)
router.register(r'file-uploads', views.FileUploadViewSet)
router.register(r'settings', views.SystemSettingsViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit_logs'),
    path('health-check/', views.HealthCheckView.as_view(), name='health_check'),
    path('file-cleanup/', views.FileCleanupView.as_view(), name='file_cleanup'),
    
    # Advanced HOS Compliance API
    path('hos/', include(hos_urlpatterns)),
]

