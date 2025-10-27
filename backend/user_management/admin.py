from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, DriverProfile


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """User admin configuration"""
    list_display = ['email', 'first_name', 'last_name', 'is_driver', 'is_staff', 'date_joined']
    list_filter = ['is_driver', 'is_staff', 'is_active', 'date_joined']
    search_fields = ['email', 'first_name', 'last_name', 'license_number']
    ordering = ['email']
    
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('first_name', 'last_name', 'phone_number')}),
        ('Driver info', {'fields': ('license_number', 'company_name', 'is_driver')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'first_name', 'last_name', 'password1', 'password2'),
        }),
    )


@admin.register(DriverProfile)
class DriverProfileAdmin(admin.ModelAdmin):
    """Driver profile admin configuration"""
    list_display = ['user', 'cdl_number', 'cdl_state', 'carrier_name', 'cycle_type']
    list_filter = ['cycle_type', 'cdl_state', 'created_at']
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'cdl_number', 'carrier_name']
    raw_id_fields = ['user']
    
    fieldsets = (
        ('Driver', {'fields': ('user',)}),
        ('CDL Information', {'fields': ('cdl_number', 'cdl_state', 'cdl_expiry', 'medical_cert_expiry')}),
        ('Company Information', {'fields': ('dot_number', 'carrier_name', 'home_terminal')}),
        ('Settings', {'fields': ('timezone', 'cycle_type')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ['created_at', 'updated_at']