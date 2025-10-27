"""
Enhanced HOS Models for Advanced Compliance Features
Extends existing models with team driving, violation workflow, and analytics support
"""

from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class TeamDriving(models.Model):
    """Team driving coordination and management"""
    
    TEAM_ROLES = [
        ('driver_1', 'Driver 1'),
        ('driver_2', 'Driver 2'),
        ('relief_driver', 'Relief Driver'),
    ]
    
    team_id = models.CharField(max_length=50, unique=True)
    driver_1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='team_driver_1')
    driver_2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='team_driver_2')
    current_driver = models.CharField(max_length=20, choices=TEAM_ROLES, default='driver_1')
    
    # Coordination details
    handoff_time = models.DateTimeField(null=True, blank=True)
    handoff_location = models.CharField(max_length=200, blank=True)
    coordination_notes = models.TextField(blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'team_driving'
        verbose_name = 'Team Driving'
        verbose_name_plural = 'Team Driving'
    
    def __str__(self):
        return f"Team {self.team_id}: {self.driver_1.get_full_name()} & {self.driver_2.get_full_name()}"


class ViolationWorkflow(models.Model):
    """Violation resolution workflow tracking"""
    
    WORKFLOW_STATUS = [
        ('pending', 'Pending'),
        ('in_review', 'In Review'),
        ('resolved', 'Resolved'),
        ('disputed', 'Disputed'),
        ('escalated', 'Escalated'),
    ]
    
    ESCALATION_LEVELS = [
        (0, 'No Escalation'),
        (1, 'Supervisor'),
        (2, 'Manager'),
        (3, 'Director'),
        (4, 'Executive'),
    ]
    
    violation = models.OneToOneField('log_sheets.Violation', on_delete=models.CASCADE, related_name='workflow')
    status = models.CharField(max_length=20, choices=WORKFLOW_STATUS, default='pending')
    escalation_level = models.IntegerField(choices=ESCALATION_LEVELS, default=0)
    
    # Resolution details
    resolution_notes = models.TextField(blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_violations')
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Workflow tracking
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'violation_workflows'
        verbose_name = 'Violation Workflow'
        verbose_name_plural = 'Violation Workflows'
    
    def __str__(self):
        return f"Workflow for {self.violation.violation_type} - {self.get_status_display()}"


class ComplianceAnalytics(models.Model):
    """Compliance analytics and metrics tracking"""
    
    driver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='compliance_analytics')
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Metrics
    total_violations = models.IntegerField(default=0)
    violations_by_type = models.JSONField(default=dict)
    violations_by_severity = models.JSONField(default=dict)
    compliance_score = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        default=Decimal('100.00')
    )
    
    # Efficiency metrics
    cycle_efficiency = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('100.00'))],
        default=Decimal('0.00')
    )
    restart_frequency = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        default=Decimal('0.00')
    )
    average_daily_hours = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('24.00'))],
        default=Decimal('0.00')
    )
    
    # Risk factors
    risk_factors = models.JSONField(default=list)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'compliance_analytics'
        verbose_name = 'Compliance Analytics'
        verbose_name_plural = 'Compliance Analytics'
        unique_together = ['driver', 'period_start', 'period_end']
    
    def __str__(self):
        return f"{self.driver.get_full_name()} - {self.period_start} to {self.period_end}"


class SleeperBerthPeriod(models.Model):
    """Sleeper berth period tracking for advanced HOS compliance"""
    
    driver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sleeper_berth_periods')
    log_entry = models.ForeignKey('log_sheets.LogEntry', on_delete=models.CASCADE, related_name='sleeper_berth_period')
    
    # Period details
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration_hours = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01')), MaxValueValidator(Decimal('24.00'))]
    )
    
    # Validation flags
    is_valid_for_restart = models.BooleanField(default=False)
    consecutive_hours = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('24.00'))],
        default=Decimal('0.00')
    )
    split_berth_period = models.BooleanField(default=False)
    
    # Related periods for split berth validation
    related_period = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'sleeper_berth_periods'
        verbose_name = 'Sleeper Berth Period'
        verbose_name_plural = 'Sleeper Berth Periods'
    
    def __str__(self):
        return f"{self.driver.get_full_name()} - Sleeper Berth {self.start_time.strftime('%m/%d %H:%M')}"


class HOSRuleConfiguration(models.Model):
    """Configurable HOS rules for scalable compliance"""
    
    RULE_TYPES = [
        ('driving_limit', 'Driving Limit'),
        ('on_duty_limit', 'On Duty Limit'),
        ('break_requirement', 'Break Requirement'),
        ('cycle_limit', 'Cycle Limit'),
        ('restart_requirement', 'Restart Requirement'),
        ('sleeper_berth', 'Sleeper Berth'),
        ('custom', 'Custom Rule'),
    ]
    
    SEVERITY_LEVELS = [
        ('minor', 'Minor'),
        ('major', 'Major'),
        ('critical', 'Critical'),
    ]
    
    rule_id = models.CharField(max_length=50, unique=True)
    rule_name = models.CharField(max_length=100)
    rule_type = models.CharField(max_length=30, choices=RULE_TYPES)
    description = models.TextField()
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='major')
    
    # Rule configuration
    is_enabled = models.BooleanField(default=True)
    parameters = models.JSONField(default=dict)
    
    # Applicability
    applies_to_cycle_types = models.JSONField(default=list)  # List of cycle types this rule applies to
    applies_to_duty_statuses = models.JSONField(default=list)  # List of duty statuses this rule applies to
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'hos_rule_configurations'
        verbose_name = 'HOS Rule Configuration'
        verbose_name_plural = 'HOS Rule Configurations'
    
    def __str__(self):
        return f"{self.rule_name} ({self.get_rule_type_display()})"


class ComplianceAlert(models.Model):
    """Compliance alerts and notifications"""
    
    ALERT_TYPES = [
        ('violation', 'Violation'),
        ('approaching_limit', 'Approaching Limit'),
        ('restart_recommended', 'Restart Recommended'),
        ('team_coordination', 'Team Coordination'),
        ('compliance_score', 'Compliance Score'),
    ]
    
    PRIORITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    
    driver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='compliance_alerts')
    alert_type = models.CharField(max_length=30, choices=ALERT_TYPES)
    priority = models.CharField(max_length=10, choices=PRIORITY_LEVELS, default='medium')
    
    # Alert details
    title = models.CharField(max_length=200)
    message = models.TextField()
    action_required = models.BooleanField(default=False)
    action_description = models.TextField(blank=True)
    
    # Related objects
    related_violation = models.ForeignKey('log_sheets.Violation', on_delete=models.CASCADE, null=True, blank=True)
    related_log_entry = models.ForeignKey('log_sheets.LogEntry', on_delete=models.CASCADE, null=True, blank=True)
    
    # Status
    is_read = models.BooleanField(default=False)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_alerts')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'compliance_alerts'
        verbose_name = 'Compliance Alert'
        verbose_name_plural = 'Compliance Alerts'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} - {self.driver.get_full_name()}"


class HOSAuditLog(models.Model):
    """Audit log for HOS compliance actions"""
    
    ACTION_TYPES = [
        ('log_entry_created', 'Log Entry Created'),
        ('log_entry_modified', 'Log Entry Modified'),
        ('log_entry_certified', 'Log Entry Certified'),
        ('violation_detected', 'Violation Detected'),
        ('violation_resolved', 'Violation Resolved'),
        ('restart_initiated', 'Restart Initiated'),
        ('team_handoff', 'Team Handoff'),
        ('rule_modified', 'Rule Modified'),
        ('compliance_calculated', 'Compliance Calculated'),
    ]
    
    driver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='hos_audit_logs')
    action_type = models.CharField(max_length=30, choices=ACTION_TYPES)
    
    # Action details
    description = models.TextField()
    details = models.JSONField(default=dict)
    
    # Related objects
    related_log_entry = models.ForeignKey('log_sheets.LogEntry', on_delete=models.CASCADE, null=True, blank=True)
    related_violation = models.ForeignKey('log_sheets.Violation', on_delete=models.CASCADE, null=True, blank=True)
    
    # Metadata
    timestamp = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        db_table = 'hos_audit_logs'
        verbose_name = 'HOS Audit Log'
        verbose_name_plural = 'HOS Audit Logs'
        ordering = ['-timestamp']
    
    def __str__(self):
        return f"{self.get_action_type_display()} - {self.driver.get_full_name()} at {self.timestamp}"


# Signal handlers for automatic compliance checking
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


@receiver(post_save, sender='log_sheets.LogEntry')
def check_compliance_on_log_entry_save(sender, instance, created, **kwargs):
    """Automatically check compliance when log entry is saved"""
    from .hos_compliance import create_compliance_engine
    
    try:
        # Get driver's recent log entries
        recent_entries = sender.objects.filter(
            driver=instance.driver,
            start_time__gte=timezone.now() - timezone.timedelta(days=8)
        ).order_by('start_time')
        
        # Convert to dict format for compliance engine
        log_entries = []
        for entry in recent_entries:
            log_entries.append({
                'start_time': entry.start_time,
                'end_time': entry.end_time,
                'duty_status': entry.duty_status.name,
                'location': entry.location,
                'remarks': entry.remarks
            })
        
        # Calculate compliance status
        engine = create_compliance_engine()
        hos_status = engine.calculate_advanced_hos_status(log_entries)
        
        # Create alerts for violations
        for violation in hos_status.violations:
            ComplianceAlert.objects.create(
                driver=instance.driver,
                alert_type='violation',
                priority='critical' if violation.severity.value == 'critical' else 'high',
                title=f"HOS Violation: {violation.violation_type}",
                message=violation.description,
                action_required=violation.requires_immediate_action,
                action_description=violation.compliance_impact,
                related_log_entry=instance
            )
        
        # Create alerts for approaching limits
        if hos_status.needs_rest:
            ComplianceAlert.objects.create(
                driver=instance.driver,
                alert_type='approaching_limit',
                priority='medium',
                title="Approaching HOS Limits",
                message="You are approaching your HOS limits and may need rest soon.",
                action_required=False,
                related_log_entry=instance
            )
        
        # Log the compliance check
        HOSAuditLog.objects.create(
            driver=instance.driver,
            action_type='compliance_calculated',
            description=f"Compliance calculated for log entry {instance.id}",
            details={
                'can_drive': hos_status.can_drive,
                'can_be_on_duty': hos_status.can_be_on_duty,
                'needs_rest': hos_status.needs_rest,
                'violations_count': len(hos_status.violations),
                'compliance_score': float(hos_status.compliance_analytics.compliance_score) if hos_status.compliance_analytics else 100.0
            },
            related_log_entry=instance
        )
        
    except Exception as e:
        logger.error(f"Failed to check compliance for log entry {instance.id}: {e}")


@receiver(post_save, sender='log_sheets.Violation')
def create_violation_workflow(sender, instance, created, **kwargs):
    """Create workflow entry when violation is created"""
    if created:
        try:
            ViolationWorkflow.objects.create(
                violation=instance,
                status='pending'
            )
        except Exception as e:
            logger.error(f"Failed to create workflow for violation {instance.id}: {e}")
