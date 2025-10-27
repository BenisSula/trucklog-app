from django.contrib import admin
from .models import Location, Trip, RestStop, RouteSegment


@admin.register(Location)
class LocationAdmin(admin.ModelAdmin):
    """Location admin configuration"""
    list_display = ['name', 'city', 'state', 'zip_code', 'is_terminal', 'created_at']
    list_filter = ['is_terminal', 'state', 'created_at']
    search_fields = ['name', 'city', 'state', 'zip_code', 'address']
    ordering = ['name']


@admin.register(Trip)
class TripAdmin(admin.ModelAdmin):
    """Trip admin configuration"""
    list_display = ['trip_name', 'driver', 'pickup_location', 'delivery_location', 'status', 'planned_start_time']
    list_filter = ['status', 'planned_start_time', 'created_at']
    search_fields = ['trip_name', 'driver__email', 'pickup_location__name', 'delivery_location__name']
    raw_id_fields = ['driver', 'pickup_location', 'delivery_location']
    date_hierarchy = 'planned_start_time'
    
    fieldsets = (
        ('Trip Information', {'fields': ('driver', 'trip_name', 'status', 'notes')}),
        ('Locations', {'fields': ('pickup_location', 'delivery_location')}),
        ('Timing', {'fields': ('planned_start_time', 'planned_end_time', 'actual_start_time', 'actual_end_time')}),
        ('Distance & Time', {'fields': ('total_distance', 'estimated_drive_time', 'actual_drive_time')}),
        ('HOS Information', {'fields': ('hours_used_before_trip', 'hours_available')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(RestStop)
class RestStopAdmin(admin.ModelAdmin):
    """Rest stop admin configuration"""
    list_display = ['trip', 'location', 'rest_type', 'planned_start', 'is_completed', 'is_required']
    list_filter = ['rest_type', 'is_completed', 'is_required', 'planned_start']
    search_fields = ['trip__trip_name', 'location__name', 'notes']
    raw_id_fields = ['trip', 'location']
    date_hierarchy = 'planned_start'


@admin.register(RouteSegment)
class RouteSegmentAdmin(admin.ModelAdmin):
    """Route segment admin configuration"""
    list_display = ['trip', 'from_location', 'to_location', 'sequence', 'distance', 'is_completed']
    list_filter = ['is_completed', 'sequence', 'created_at']
    search_fields = ['trip__trip_name', 'from_location__name', 'to_location__name']
    raw_id_fields = ['trip', 'from_location', 'to_location']
    ordering = ['trip', 'sequence']