from django.contrib import admin
from .models import AuditLog, SystemSettings, Notification, FileUpload


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Audit log admin configuration (read-only)"""
    list_display = ['user', 'action', 'model_name', 'object_id', 'timestamp', 'ip_address']
    list_filter = ['action', 'model_name', 'timestamp']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'description', 'ip_address']
    raw_id_fields = ['user']
    date_hierarchy = 'timestamp'
    readonly_fields = ['user', 'action', 'model_name', 'object_id', 'description', 'ip_address', 'user_agent', 'timestamp']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    """System settings admin configuration"""
    list_display = ['key', 'value', 'setting_type', 'is_public', 'updated_at']
    list_filter = ['setting_type', 'is_public', 'created_at']
    search_fields = ['key', 'value', 'description']
    
    fieldsets = (
        ('Setting', {'fields': ('key', 'value', 'setting_type', 'description')}),
        ('Visibility', {'fields': ('is_public',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Notification admin configuration"""
    list_display = ['user', 'title', 'notification_type', 'is_read', 'priority', 'created_at']
    list_filter = ['notification_type', 'is_read', 'priority', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'title', 'message']
    raw_id_fields = ['user']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('User & Type', {'fields': ('user', 'notification_type', 'priority')}),
        ('Content', {'fields': ('title', 'message', 'data')}),
        ('Action', {'fields': ('action_url', 'related_object_type', 'related_object_id')}),
        ('Delivery', {'fields': ('channels', 'expires_at')}),
        ('Status', {'fields': ('is_read', 'read_at')}),
        ('Timestamps', {'fields': ('created_at',)}),
    )
    readonly_fields = ['created_at']


@admin.register(FileUpload)
class FileUploadAdmin(admin.ModelAdmin):
    """File upload admin configuration"""
    list_display = ['user', 'original_filename', 'file_type', 'file_size_mb', 'is_public', 'created_at']
    list_filter = ['file_type', 'is_public', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'original_filename', 'description']
    raw_id_fields = ['user']
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('User & File', {'fields': ('user', 'file_type', 'original_filename', 'file_path')}),
        ('File Details', {'fields': ('file_size', 'mime_type', 'description')}),
        ('Visibility', {'fields': ('is_public',)}),
        ('Timestamps', {'fields': ('created_at',)}),
    )
    readonly_fields = ['created_at', 'file_size_mb']