from rest_framework import serializers
from .models import AuditLog, SystemSettings, Notification, FileUpload


class AuditLogSerializer(serializers.ModelSerializer):
    """Audit log serializer"""
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'action', 'action_display',
            'model_name', 'object_id', 'description', 'ip_address',
            'user_agent', 'timestamp'
        ]
        read_only_fields = ['id', 'timestamp']


class SystemSettingsSerializer(serializers.ModelSerializer):
    """System settings serializer"""
    class Meta:
        model = SystemSettings
        fields = [
            'id', 'key', 'value', 'setting_type', 'description',
            'is_public', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Notification serializer"""
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'title', 'message', 'notification_type', 'notification_type_display',
            'is_read', 'created_at', 'read_at', 'data', 'channels', 'priority', 
            'expires_at', 'action_url', 'related_object_type', 'related_object_id'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'read_at']


class FileUploadSerializer(serializers.ModelSerializer):
    """File upload serializer"""
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    file_size_mb = serializers.ReadOnlyField()
    
    class Meta:
        model = FileUpload
        fields = [
            'id', 'user', 'file_type', 'file_type_display', 'original_filename',
            'file_path', 'file_size', 'file_size_mb', 'mime_type', 'description',
            'is_public', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']



