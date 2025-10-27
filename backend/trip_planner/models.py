from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

User = get_user_model()


class Location(models.Model):
    """Represents a geographical location"""
    name = models.CharField(max_length=200)
    address = models.TextField()
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    zip_code = models.CharField(max_length=10)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_terminal = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'locations'
        verbose_name = 'Location'
        verbose_name_plural = 'Locations'
        unique_together = ['latitude', 'longitude']
    
    def __str__(self):
        return f"{self.name}, {self.city}, {self.state}"


class Trip(models.Model):
    """Represents a truck trip with HOS compliance"""
    TRIP_STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    driver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='trips')
    trip_name = models.CharField(max_length=200)
    pickup_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='pickup_trips')
    delivery_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='delivery_trips')
    
    # Trip timing
    planned_start_time = models.DateTimeField()
    planned_end_time = models.DateTimeField()
    actual_start_time = models.DateTimeField(null=True, blank=True)
    actual_end_time = models.DateTimeField(null=True, blank=True)
    
    # Distance and route
    total_distance = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)  # in miles
    estimated_drive_time = models.DurationField(null=True, blank=True)
    actual_drive_time = models.DurationField(null=True, blank=True)
    
    # HOS compliance
    hours_used_before_trip = models.DecimalField(
        max_digits=4, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('70.00'))],
        default=Decimal('0.00')
    )
    hours_available = models.DecimalField(
        max_digits=4, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('0.00')), MaxValueValidator(Decimal('70.00'))],
        null=True, 
        blank=True
    )
    
    # Status and metadata
    status = models.CharField(max_length=20, choices=TRIP_STATUS_CHOICES, default='planned')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'trips'
        verbose_name = 'Trip'
        verbose_name_plural = 'Trips'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.trip_name} - {self.pickup_location.name} to {self.delivery_location.name}"


class RestStop(models.Model):
    """Represents a planned or actual rest stop during a trip"""
    REST_TYPE_CHOICES = [
        ('30_min', '30-Minute Break'),
        ('10_hour', '10-Hour Rest'),
        ('34_hour', '34-Hour Restart'),
        ('sleeper_berth', 'Sleeper Berth'),
    ]
    
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='rest_stops')
    location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='rest_stops')
    rest_type = models.CharField(max_length=20, choices=REST_TYPE_CHOICES)
    
    # Timing
    planned_start = models.DateTimeField()
    planned_end = models.DateTimeField()
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_end = models.DateTimeField(null=True, blank=True)
    
    # Status
    is_completed = models.BooleanField(default=False)
    is_required = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'rest_stops'
        verbose_name = 'Rest Stop'
        verbose_name_plural = 'Rest Stops'
        ordering = ['planned_start']
    
    def __str__(self):
        return f"{self.get_rest_type_display()} at {self.location.name}"


class RouteSegment(models.Model):
    """Represents a segment of the trip route"""
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='route_segments')
    from_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='route_from')
    to_location = models.ForeignKey(Location, on_delete=models.CASCADE, related_name='route_to')
    
    # Distance and timing
    distance = models.DecimalField(max_digits=8, decimal_places=2)  # in miles
    estimated_drive_time = models.DurationField()
    actual_drive_time = models.DurationField(null=True, blank=True)
    
    # Order in the route
    sequence = models.PositiveIntegerField()
    
    # Status
    is_completed = models.BooleanField(default=False)
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'route_segments'
        verbose_name = 'Route Segment'
        verbose_name_plural = 'Route Segments'
        ordering = ['trip', 'sequence']
        unique_together = ['trip', 'sequence']
    
    def __str__(self):
        return f"Segment {self.sequence}: {self.from_location.name} to {self.to_location.name}"