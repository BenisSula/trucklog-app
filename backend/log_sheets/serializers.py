from rest_framework import serializers
from .models import LogEntry, DailyLog, Violation, CycleStatus, DutyStatus


class DutyStatusSerializer(serializers.ModelSerializer):
    """Duty status serializer"""
    class Meta:
        model = DutyStatus
        fields = ['id', 'name', 'description', 'color_code']


class LogEntrySerializer(serializers.ModelSerializer):
    """Log entry serializer"""
    duty_status_name = serializers.CharField(source='duty_status.get_name_display', read_only=True)
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    
    class Meta:
        model = LogEntry
        fields = [
            'id', 'driver', 'driver_name', 'duty_status', 'duty_status_name',
            'start_time', 'end_time', 'duration_hours', 'location', 'city', 'state',
            'remarks', 'is_editable', 'is_certified', 'certified_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class DailyLogSerializer(serializers.ModelSerializer):
    """Daily log serializer"""
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    log_entries = LogEntrySerializer(many=True, read_only=True)
    violations = serializers.SerializerMethodField()
    
    class Meta:
        model = DailyLog
        fields = [
            'id', 'driver', 'driver_name', 'log_date', 'total_driving_hours',
            'total_on_duty_hours', 'total_off_duty_hours', 'has_violations',
            'violation_details', 'is_compliant', 'is_certified', 'certified_at',
            'certification_ip', 'log_entries', 'violations', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_violations(self, obj):
        """Get violations for this daily log"""
        violations = obj.violations.all()
        return ViolationSerializer(violations, many=True).data


class ViolationSerializer(serializers.ModelSerializer):
    """Violation serializer"""
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    violation_type_display = serializers.CharField(source='get_violation_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    
    class Meta:
        model = Violation
        fields = [
            'id', 'driver', 'driver_name', 'daily_log', 'violation_type',
            'violation_type_display', 'severity', 'severity_display',
            'description', 'occurred_at', 'duration_over', 'is_resolved',
            'resolution_notes', 'resolved_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CycleStatusSerializer(serializers.ModelSerializer):
    """Cycle status serializer"""
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    cycle_type_display = serializers.CharField(source='get_cycle_type_display', read_only=True)
    
    class Meta:
        model = CycleStatus
        fields = [
            'id', 'driver', 'driver_name', 'cycle_start_date', 'cycle_type',
            'cycle_type_display', 'hours_used_this_cycle', 'hours_available',
            'consecutive_off_duty_hours', 'last_30_min_break', 'can_drive',
            'can_be_on_duty', 'needs_rest', 'last_updated', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

