from django.contrib import admin
from .models import DutyStatus, LogEntry, DailyLog, Violation, CycleStatus


@admin.register(DutyStatus)
class DutyStatusAdmin(admin.ModelAdmin):
    """Duty status admin configuration"""
    list_display = ['name', 'description', 'color_code']
    search_fields = ['name', 'description']


@admin.register(LogEntry)
class LogEntryAdmin(admin.ModelAdmin):
    """Log entry admin configuration"""
    list_display = ['driver', 'duty_status', 'start_time', 'end_time', 'duration_hours', 'is_certified']
    list_filter = ['duty_status', 'is_certified', 'is_editable', 'start_time', 'created_at']
    search_fields = ['driver__email', 'driver__first_name', 'driver__last_name', 'location', 'city', 'state']
    raw_id_fields = ['driver']
    date_hierarchy = 'start_time'
    
    fieldsets = (
        ('Driver & Status', {'fields': ('driver', 'duty_status')}),
        ('Time Period', {'fields': ('start_time', 'end_time', 'duration_hours')}),
        ('Location', {'fields': ('location', 'city', 'state')}),
        ('Details', {'fields': ('remarks', 'is_editable', 'is_certified', 'certified_at')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DailyLog)
class DailyLogAdmin(admin.ModelAdmin):
    """Daily log admin configuration"""
    list_display = ['driver', 'log_date', 'total_driving_hours', 'total_on_duty_hours', 'is_compliant', 'is_certified']
    list_filter = ['is_compliant', 'is_certified', 'has_violations', 'log_date', 'created_at']
    search_fields = ['driver__email', 'driver__first_name', 'driver__last_name']
    raw_id_fields = ['driver']
    date_hierarchy = 'log_date'
    
    fieldsets = (
        ('Driver & Date', {'fields': ('driver', 'log_date')}),
        ('HOS Totals', {'fields': ('total_driving_hours', 'total_on_duty_hours', 'total_off_duty_hours')}),
        ('Compliance', {'fields': ('has_violations', 'violation_details', 'is_compliant')}),
        ('Certification', {'fields': ('is_certified', 'certified_at', 'certification_ip')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Violation)
class ViolationAdmin(admin.ModelAdmin):
    """Violation admin configuration"""
    list_display = ['driver', 'violation_type', 'severity', 'occurred_at', 'is_resolved']
    list_filter = ['violation_type', 'severity', 'is_resolved', 'occurred_at', 'created_at']
    search_fields = ['driver__email', 'driver__first_name', 'driver__last_name', 'description']
    raw_id_fields = ['driver', 'daily_log']
    date_hierarchy = 'occurred_at'
    
    fieldsets = (
        ('Driver & Log', {'fields': ('driver', 'daily_log')}),
        ('Violation Details', {'fields': ('violation_type', 'severity', 'description', 'occurred_at', 'duration_over')}),
        ('Resolution', {'fields': ('is_resolved', 'resolution_notes', 'resolved_at')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(CycleStatus)
class CycleStatusAdmin(admin.ModelAdmin):
    """Cycle status admin configuration"""
    list_display = ['driver', 'cycle_type', 'hours_used_this_cycle', 'hours_available', 'can_drive', 'needs_rest']
    list_filter = ['cycle_type', 'can_drive', 'can_be_on_duty', 'needs_rest', 'cycle_start_date']
    search_fields = ['driver__email', 'driver__first_name', 'driver__last_name']
    raw_id_fields = ['driver']
    
    fieldsets = (
        ('Driver & Cycle', {'fields': ('driver', 'cycle_start_date', 'cycle_type')}),
        ('Hours Tracking', {'fields': ('hours_used_this_cycle', 'hours_available')}),
        ('Rest Tracking', {'fields': ('consecutive_off_duty_hours', 'last_30_min_break')}),
        ('Status', {'fields': ('can_drive', 'can_be_on_duty', 'needs_rest')}),
        ('Timestamps', {'fields': ('last_updated', 'created_at')}),
    )
    readonly_fields = ['created_at']