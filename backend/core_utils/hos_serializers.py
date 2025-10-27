"""
Serializers for Advanced HOS Compliance Models
"""

from rest_framework import serializers
from django.contrib.auth import get_user_model
from .hos_models import (
    TeamDriving,
    ViolationWorkflow,
    ComplianceAnalytics,
    SleeperBerthPeriod,
    HOSRuleConfiguration,
    ComplianceAlert,
    HOSAuditLog
)
from log_sheets.models import Violation, LogEntry

User = get_user_model()


class TeamDrivingSerializer(serializers.ModelSerializer):
    """Serializer for TeamDriving model"""
    
    driver_1_name = serializers.CharField(source='driver_1.get_full_name', read_only=True)
    driver_2_name = serializers.CharField(source='driver_2.get_full_name', read_only=True)
    current_driver_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TeamDriving
        fields = [
            'id', 'team_id', 'driver_1', 'driver_1_name', 'driver_2', 'driver_2_name',
            'current_driver', 'current_driver_name', 'handoff_time', 'handoff_location',
            'coordination_notes', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_current_driver_name(self, obj):
        """Get the name of the current driver"""
        if obj.current_driver == 'driver_1':
            return obj.driver_1.get_full_name()
        elif obj.current_driver == 'driver_2':
            return obj.driver_2.get_full_name()
        return 'Unknown'


class ViolationWorkflowSerializer(serializers.ModelSerializer):
    """Serializer for ViolationWorkflow model"""
    
    violation_type = serializers.CharField(source='violation.violation_type', read_only=True)
    violation_description = serializers.CharField(source='violation.description', read_only=True)
    violation_severity = serializers.CharField(source='violation.severity', read_only=True)
    violation_occurred_at = serializers.DateTimeField(source='violation.occurred_at', read_only=True)
    driver_name = serializers.CharField(source='violation.driver.get_full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    
    class Meta:
        model = ViolationWorkflow
        fields = [
            'id', 'violation', 'violation_type', 'violation_description', 'violation_severity',
            'violation_occurred_at', 'driver_name', 'status', 'escalation_level',
            'resolution_notes', 'resolved_by', 'resolved_by_name', 'resolved_at',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ComplianceAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer for ComplianceAnalytics model"""
    
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    period_duration_days = serializers.SerializerMethodField()
    risk_level = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceAnalytics
        fields = [
            'id', 'driver', 'driver_name', 'period_start', 'period_end', 'period_duration_days',
            'total_violations', 'violations_by_type', 'violations_by_severity',
            'compliance_score', 'cycle_efficiency', 'restart_frequency', 'average_daily_hours',
            'risk_factors', 'risk_level', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_period_duration_days(self, obj):
        """Calculate period duration in days"""
        return (obj.period_end - obj.period_start).days + 1
    
    def get_risk_level(self, obj):
        """Determine risk level based on compliance score"""
        if obj.compliance_score >= 90:
            return 'low'
        elif obj.compliance_score >= 70:
            return 'medium'
        else:
            return 'high'


class SleeperBerthPeriodSerializer(serializers.ModelSerializer):
    """Serializer for SleeperBerthPeriod model"""
    
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    is_current = serializers.SerializerMethodField()
    
    class Meta:
        model = SleeperBerthPeriod
        fields = [
            'id', 'driver', 'driver_name', 'log_entry', 'start_time', 'end_time',
            'duration_hours', 'duration_formatted', 'is_valid_for_restart',
            'consecutive_hours', 'split_berth_period', 'related_period',
            'is_current', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_duration_formatted(self, obj):
        """Format duration as hours and minutes"""
        hours = int(obj.duration_hours)
        minutes = int((obj.duration_hours - hours) * 60)
        return f"{hours}h {minutes}m"
    
    def get_is_current(self, obj):
        """Check if this is a current sleeper berth period"""
        return obj.end_time is None


class HOSRuleConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for HOSRuleConfiguration model"""
    
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    rule_type_display = serializers.CharField(source='get_rule_type_display', read_only=True)
    severity_display = serializers.CharField(source='get_severity_display', read_only=True)
    
    class Meta:
        model = HOSRuleConfiguration
        fields = [
            'id', 'rule_id', 'rule_name', 'rule_type', 'rule_type_display',
            'description', 'severity', 'severity_display', 'is_enabled',
            'parameters', 'applies_to_cycle_types', 'applies_to_duty_statuses',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ComplianceAlertSerializer(serializers.ModelSerializer):
    """Serializer for ComplianceAlert model"""
    
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    alert_type_display = serializers.CharField(source='get_alert_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    time_since_created = serializers.SerializerMethodField()
    
    class Meta:
        model = ComplianceAlert
        fields = [
            'id', 'driver', 'driver_name', 'alert_type', 'alert_type_display',
            'priority', 'priority_display', 'title', 'message', 'action_required',
            'action_description', 'related_violation', 'related_log_entry',
            'is_read', 'is_resolved', 'resolved_at', 'resolved_by', 'resolved_by_name',
            'time_since_created', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_time_since_created(self, obj):
        """Calculate time since alert was created"""
        from django.utils import timezone
        now = timezone.now()
        delta = now - obj.created_at
        
        if delta.days > 0:
            return f"{delta.days} day{'s' if delta.days != 1 else ''} ago"
        elif delta.seconds > 3600:
            hours = delta.seconds // 3600
            return f"{hours} hour{'s' if hours != 1 else ''} ago"
        elif delta.seconds > 60:
            minutes = delta.seconds // 60
            return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
        else:
            return "Just now"


class HOSAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for HOSAuditLog model"""
    
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    action_type_display = serializers.CharField(source='get_action_type_display', read_only=True)
    time_since_timestamp = serializers.SerializerMethodField()
    
    class Meta:
        model = HOSAuditLog
        fields = [
            'id', 'driver', 'driver_name', 'action_type', 'action_type_display',
            'description', 'details', 'related_log_entry', 'related_violation',
            'timestamp', 'time_since_timestamp', 'ip_address', 'user_agent'
        ]
        read_only_fields = ['id', 'timestamp']


class HOSComplianceSummarySerializer(serializers.Serializer):
    """Serializer for HOS compliance summary"""
    
    can_drive = serializers.BooleanField()
    can_be_on_duty = serializers.BooleanField()
    needs_rest = serializers.BooleanField()
    compliance_score = serializers.FloatField()
    total_violations = serializers.IntegerField()
    cycle_progress = serializers.FloatField()
    risk_level = serializers.CharField()
    recommendations = serializers.ListField(child=serializers.DictField())


class ViolationResolutionSerializer(serializers.Serializer):
    """Serializer for violation resolution requests"""
    
    resolution_notes = serializers.CharField(max_length=1000)
    action = serializers.ChoiceField(choices=['resolve', 'dispute', 'escalate'], default='resolve')
    escalation_reason = serializers.CharField(max_length=500, required=False)


class TeamHandoffSerializer(serializers.Serializer):
    """Serializer for team driving handoff requests"""
    
    handoff_location = serializers.CharField(max_length=200)
    notes = serializers.CharField(max_length=500, required=False)


class ComplianceAnalyticsRequestSerializer(serializers.Serializer):
    """Serializer for compliance analytics requests"""
    
    period_start = serializers.DateField()
    period_end = serializers.DateField()
    include_violations = serializers.BooleanField(default=True)
    include_efficiency = serializers.BooleanField(default=True)
    include_risk_factors = serializers.BooleanField(default=True)


class HOSRuleUpdateSerializer(serializers.Serializer):
    """Serializer for HOS rule updates"""
    
    is_enabled = serializers.BooleanField()
    parameters = serializers.DictField(required=False)
    description = serializers.CharField(max_length=500, required=False)


class AlertResolutionSerializer(serializers.Serializer):
    """Serializer for alert resolution requests"""
    
    resolution_notes = serializers.CharField(max_length=1000)
    mark_as_read = serializers.BooleanField(default=True)


