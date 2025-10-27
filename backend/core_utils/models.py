from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.conf import settings
from django.db.models import JSONField
from django.core.serializers.json import DjangoJSONEncoder
from django.utils.translation import gettext_lazy as _

User = get_user_model()


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        INFO = 'info', _('Information')
        SUCCESS = 'success', _('Success')
        WARNING = 'warning', _('Warning')
        ERROR = 'error', _('Error')
        HOS_VIOLATION = 'hos_violation', _('HOS Violation')
        TRIP_UPDATE = 'trip_update', _('Trip Update')
        MAINTENANCE = 'maintenance', _('Vehicle Maintenance')
        DOCUMENT = 'document', _('Document')
        SYSTEM = 'system', _('System')

    class NotificationChannel(models.TextChoices):
        IN_APP = 'in_app', _('In-App')
        EMAIL = 'email', _('Email')
        PUSH = 'push', _('Push Notification')
        SMS = 'sms', _('SMS')

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.INFO)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    data = JSONField(encoder=DjangoJSONEncoder, null=True, blank=True)
    channels = models.JSONField(default=list, help_text="List of channels to send the notification to")
    priority = models.PositiveSmallIntegerField(default=0, help_text="Higher number means higher priority")
    expires_at = models.DateTimeField(null=True, blank=True)
    action_url = models.URLField(null=True, blank=True)
    related_object_type = models.CharField(max_length=100, null=True, blank=True)
    related_object_id = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
            models.Index(fields=['created_at']),
            models.Index(fields=['notification_type']),
        ]

    def __str__(self):
        return f"{self.get_notification_type_display()}: {self.title}"

    def mark_as_read(self, save=True):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            if save:
                self.save(update_fields=['is_read', 'read_at'])

    def get_absolute_url(self):
        return self.action_url or '#'


class UserNotificationPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_preferences')
    email_enabled = models.BooleanField(default=True, help_text="Enable email notifications")
    push_enabled = models.BooleanField(default=True, help_text="Enable push notifications")
    sms_enabled = models.BooleanField(default=False, help_text="Enable SMS notifications")
    in_app_enabled = models.BooleanField(default=True, help_text="Enable in-app notifications")
    
    # Notification type preferences
    notification_preferences = JSONField(
        default=dict,
        help_text="JSON structure defining notification type preferences"
    )
    
    # Quiet hours settings
    quiet_hours_enabled = models.BooleanField(default=False, help_text="Enable quiet hours")
    quiet_hours_start = models.TimeField(default='22:00:00', help_text="Start time for quiet hours (HH:MM:SS)")
    quiet_hours_end = models.TimeField(default='06:00:00', help_text="End time for quiet hours (HH:MM:SS)")
    
    # Sound and vibration
    sound_enabled = models.BooleanField(default=True, help_text="Enable notification sounds")
    vibration_enabled = models.BooleanField(default=True, help_text="Enable device vibration")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("User Notification Preference")
        verbose_name_plural = _("User Notification Preferences")

    def __str__(self):
        return f"Notification preferences for {self.user.email}"

    def is_quiet_hours(self):
        if not self.quiet_hours_enabled:
            return False
            
        now = timezone.now().time()
        if self.quiet_hours_start < self.quiet_hours_end:
            return self.quiet_hours_start <= now <= self.quiet_hours_end
        else:  # Overnight
            return now >= self.quiet_hours_start or now <= self.quiet_hours_end


class AuditLog(models.Model):
    """Audit log for tracking changes to sensitive data"""
    ACTION_TYPES = [
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('certify', 'Certify Log'),
        ('violation', 'Violation Created'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_TYPES)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=100, blank=True)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'audit_logs'
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.user} - {self.get_action_display()} - {self.timestamp}"


class SystemSettings(models.Model):
    """System-wide settings and configuration"""
    SETTING_TYPES = [
        ('string', 'String'),
        ('integer', 'Integer'),
        ('boolean', 'Boolean'),
        ('decimal', 'Decimal'),
        ('json', 'JSON'),
    ]
    
    key = models.CharField(max_length=100, unique=True)
    value = models.TextField()
    setting_type = models.CharField(max_length=20, choices=SETTING_TYPES, default='string')
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)  # Can be accessed by frontend
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'system_settings'
        verbose_name = 'System Setting'
        verbose_name_plural = 'System Settings'
    
    def __str__(self):
        return f"{self.key}: {self.value}"
    
    def get_typed_value(self):
        """Return the value cast to the appropriate type"""
        if self.setting_type == 'integer':
            return int(self.value)
        elif self.setting_type == 'boolean':
            return self.value.lower() in ('true', '1', 'yes', 'on')
        elif self.setting_type == 'decimal':
            from decimal import Decimal
            return Decimal(self.value)
        elif self.setting_type == 'json':
            import json
            return json.loads(self.value)
        else:
            return self.value


# Notification model is already defined above - removing duplicate


class FileUpload(models.Model):
    """File uploads for various purposes"""
    FILE_TYPES = [
        ('log_export', 'Log Export'),
        ('document', 'Document'),
        ('image', 'Image'),
        ('other', 'Other'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='file_uploads')
    file_type = models.CharField(max_length=20, choices=FILE_TYPES, default='other')
    original_filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.PositiveIntegerField()  # in bytes
    mime_type = models.CharField(max_length=100)
    
    # Metadata
    description = models.TextField(blank=True)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'file_uploads'
        verbose_name = 'File Upload'
        verbose_name_plural = 'File Uploads'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.original_filename} ({self.get_file_type_display()})"
    
    @property
    def file_size_mb(self):
        """Return file size in MB"""
        return round(self.file_size / (1024 * 1024), 2)