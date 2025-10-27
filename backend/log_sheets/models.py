from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

User = get_user_model()


class DutyStatus(models.Model):
    """Represents different duty statuses for HOS compliance"""
    STATUS_CHOICES = [
        ('off_duty', 'Off Duty'),
        ('sleeper_berth', 'Sleeper Berth'),
        ('driving', 'Driving'),
        ('on_duty_not_driving', 'On Duty - Not Driving'),
    ]
    
    name = models.CharField(max_length=30, choices=STATUS_CHOICES, unique=True)
    description = models.TextField(blank=True)
    color_code = models.CharField(max_length=7, default='#000000')  # Hex color for UI
    
    class Meta:
        db_table = 'duty_statuses'
        verbose_name = 'Duty Status'
        verbose_name_plural = 'Duty Statuses'
    
    def __str__(self):
        return self.get_name_display()


class LogEntry(models.Model):
    """Represents a single log entry for a specific time period"""
    driver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='log_entries')
    duty_status = models.ForeignKey(DutyStatus, on_delete=models.CASCADE, related_name='log_entries')
    
    # Time period
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration_hours = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01')), MaxValueValidator(Decimal('24.00'))]
    )
    
    # Location information
    location = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=2, blank=True)
    
    # Additional information
    remarks = models.TextField(blank=True)
    is_editable = models.BooleanField(default=True)
    is_certified = models.BooleanField(default=False)
    certified_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'log_entries'
        verbose_name = 'Log Entry'
        verbose_name_plural = 'Log Entries'
        ordering = ['start_time']
        unique_together = ['driver', 'start_time', 'end_time']
    
    def __str__(self):
        return f"{self.driver.get_full_name()} - {self.duty_status.get_name_display()} ({self.start_time.strftime('%m/%d %H:%M')})"


class DailyLog(models.Model):
    """Represents a complete daily log for a driver"""
    driver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_logs')
    log_date = models.DateField()
    
    # HOS totals for the day
    total_driving_hours = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('11.00'))],
        default=Decimal('0.00')
    )
    total_on_duty_hours = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('14.00'))],
        default=Decimal('0.00')
    )
    total_off_duty_hours = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('24.00'))],
        default=Decimal('0.00')
    )
    
    # Violations and compliance
    has_violations = models.BooleanField(default=False)
    violation_details = models.TextField(blank=True)
    is_compliant = models.BooleanField(default=True)
    
    # Certification
    is_certified = models.BooleanField(default=False)
    certified_at = models.DateTimeField(null=True, blank=True)
    certification_ip = models.GenericIPAddressField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'daily_logs'
        verbose_name = 'Daily Log'
        verbose_name_plural = 'Daily Logs'
        ordering = ['-log_date']
        unique_together = ['driver', 'log_date']
    
    def __str__(self):
        return f"{self.driver.get_full_name()} - {self.log_date.strftime('%m/%d/%Y')}"


class Violation(models.Model):
    """Represents HOS violations"""
    VIOLATION_TYPES = [
        ('driving_over_11', 'Driving Over 11 Hours'),
        ('on_duty_over_14', 'On Duty Over 14 Hours'),
        ('insufficient_rest', 'Insufficient Rest'),
        ('no_30_min_break', 'No 30-Minute Break'),
        ('driving_after_14', 'Driving After 14 Hours'),
        ('other', 'Other'),
    ]
    
    SEVERITY_LEVELS = [
        ('minor', 'Minor'),
        ('major', 'Major'),
        ('critical', 'Critical'),
    ]
    
    driver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='violations')
    daily_log = models.ForeignKey(DailyLog, on_delete=models.CASCADE, related_name='violations')
    violation_type = models.CharField(max_length=30, choices=VIOLATION_TYPES)
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS, default='minor')
    
    # Details
    description = models.TextField()
    occurred_at = models.DateTimeField()
    duration_over = models.DurationField(null=True, blank=True)
    
    # Resolution
    is_resolved = models.BooleanField(default=False)
    resolution_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'violations'
        verbose_name = 'Violation'
        verbose_name_plural = 'Violations'
        ordering = ['-occurred_at']
    
    def __str__(self):
        return f"{self.driver.get_full_name()} - {self.get_violation_type_display()} ({self.occurred_at.strftime('%m/%d/%Y %H:%M')})"


class CycleStatus(models.Model):
    """Tracks the driver's current HOS cycle status"""
    driver = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cycle_status')
    
    # Current cycle information
    cycle_start_date = models.DateField()
    cycle_type = models.CharField(
        max_length=20,
        choices=[
            ('70_8', '70/8 Hour Cycle'),
            ('60_7', '60/7 Hour Cycle'),
            ('34_hour', '34-Hour Restart'),
        ],
        default='70_8'
    )
    
    # Hours tracking
    hours_used_this_cycle = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('70.00'))],
        default=Decimal('0.00')
    )
    hours_available = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('70.00'))],
        default=Decimal('70.00')
    )
    
    # Rest tracking
    consecutive_off_duty_hours = models.DecimalField(
        max_digits=4, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('24.00'))],
        default=Decimal('0.00')
    )
    last_30_min_break = models.DateTimeField(null=True, blank=True)
    
    # Status
    can_drive = models.BooleanField(default=True)
    can_be_on_duty = models.BooleanField(default=True)
    needs_rest = models.BooleanField(default=False)
    
    # Metadata
    last_updated = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'cycle_statuses'
        verbose_name = 'Cycle Status'
        verbose_name_plural = 'Cycle Statuses'
    
    def __str__(self):
        return f"{self.driver.get_full_name()} - {self.hours_used_this_cycle}h used"