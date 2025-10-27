from rest_framework import serializers
from .models import Trip, Location, RestStop, RouteSegment


class LocationSerializer(serializers.ModelSerializer):
    """Location serializer"""
    class Meta:
        model = Location
        fields = [
            'id', 'name', 'address', 'city', 'state', 'zip_code',
            'latitude', 'longitude', 'is_terminal', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RestStopSerializer(serializers.ModelSerializer):
    """Rest stop serializer"""
    location_name = serializers.CharField(source='location.name', read_only=True)
    
    class Meta:
        model = RestStop
        fields = [
            'id', 'trip', 'location', 'location_name', 'rest_type',
            'planned_start', 'planned_end', 'actual_start', 'actual_end',
            'is_completed', 'is_required', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RouteSegmentSerializer(serializers.ModelSerializer):
    """Route segment serializer"""
    from_location_name = serializers.CharField(source='from_location.name', read_only=True)
    to_location_name = serializers.CharField(source='to_location.name', read_only=True)
    
    class Meta:
        model = RouteSegment
        fields = [
            'id', 'trip', 'from_location', 'to_location', 'from_location_name',
            'to_location_name', 'distance', 'estimated_drive_time', 'actual_drive_time',
            'sequence', 'is_completed', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TripSerializer(serializers.ModelSerializer):
    """Trip serializer"""
    pickup_location_name = serializers.CharField(source='pickup_location.name', read_only=True)
    delivery_location_name = serializers.CharField(source='delivery_location.name', read_only=True)
    driver_name = serializers.CharField(source='driver.get_full_name', read_only=True)
    rest_stops = RestStopSerializer(many=True, read_only=True)
    route_segments = RouteSegmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = Trip
        fields = [
            'id', 'driver', 'driver_name', 'trip_name', 'pickup_location', 'delivery_location',
            'pickup_location_name', 'delivery_location_name', 'planned_start_time',
            'planned_end_time', 'actual_start_time', 'actual_end_time', 'total_distance',
            'estimated_drive_time', 'actual_drive_time', 'hours_used_before_trip',
            'hours_available', 'status', 'notes', 'rest_stops', 'route_segments',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'driver', 'created_at', 'updated_at']


class PlanRouteSerializer(serializers.Serializer):
    """Route planning serializer"""
    trip_name = serializers.CharField(max_length=200)
    pickup_location_id = serializers.IntegerField()
    delivery_location_id = serializers.IntegerField()
    planned_start_time = serializers.DateTimeField()
    hours_used_before_trip = serializers.DecimalField(max_digits=4, decimal_places=2, default=0.00)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_pickup_location_id(self, value):
        try:
            Location.objects.get(id=value)
        except Location.DoesNotExist:
            raise serializers.ValidationError("Pickup location does not exist")
        return value
    
    def validate_delivery_location_id(self, value):
        try:
            Location.objects.get(id=value)
        except Location.DoesNotExist:
            raise serializers.ValidationError("Delivery location does not exist")
        return value
    
    def validate(self, attrs):
        if attrs['pickup_location_id'] == attrs['delivery_location_id']:
            raise serializers.ValidationError("Pickup and delivery locations must be different")
        return attrs

