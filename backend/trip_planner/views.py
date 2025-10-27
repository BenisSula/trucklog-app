from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Trip, Location, RestStop, RouteSegment
from .serializers import (
    TripSerializer, LocationSerializer, RestStopSerializer, 
    RouteSegmentSerializer, PlanRouteSerializer
)
from .services import RouteService, RestStopPlanner, RouteOptimizer
from core_utils.models import AuditLog
from core_utils.hos_compliance import AdvancedHOSComplianceEngine, CycleType
import logging

logger = logging.getLogger(__name__)


class LocationViewSet(viewsets.ModelViewSet):
    """Location management viewset"""
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for locations
    
    def get_queryset(self):
        # Filter by search term if provided
        search = self.request.query_params.get('search', None)
        queryset = Location.objects.all()
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(city__icontains=search) |
                Q(state__icontains=search) |
                Q(zip_code__icontains=search)
            )
        
        return queryset.order_by('name')
    
    @action(detail=False, methods=['get'])
    def terminals(self, request):
        """Get all terminal locations"""
        terminals = Location.objects.filter(is_terminal=True)
        serializer = self.get_serializer(terminals, many=True)
        return Response(serializer.data)


class TripViewSet(viewsets.ModelViewSet):
    """Trip management viewset"""
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None  # Disable pagination for trips
    
    def get_queryset(self):
        # Users can only see their own trips unless they're staff
        if self.request.user.is_staff:
            return Trip.objects.all()
        return Trip.objects.filter(driver=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(driver=self.request.user)
    
    @action(detail=True, methods=['post'])
    def start_trip(self, request, pk=None):
        """Start a trip"""
        trip = self.get_object()
        if trip.status != 'planned':
            return Response(
                {'error': 'Trip can only be started if it is planned'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.utils import timezone
        trip.status = 'in_progress'
        trip.actual_start_time = timezone.now()
        trip.save()
        
        # Create audit log
        AuditLog.objects.create(
            user=request.user,
            action='update',
            model_name='Trip',
            object_id=str(trip.id),
            description=f'Trip started: {trip.trip_name}',
            ip_address=self.get_client_ip(request)
        )
        
        serializer = self.get_serializer(trip)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete_trip(self, request, pk=None):
        """Complete a trip"""
        trip = self.get_object()
        if trip.status != 'in_progress':
            return Response(
                {'error': 'Trip can only be completed if it is in progress'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.utils import timezone
        trip.status = 'completed'
        trip.actual_end_time = timezone.now()
        trip.save()
        
        # Create audit log
        AuditLog.objects.create(
            user=request.user,
            action='update',
            model_name='Trip',
            object_id=str(trip.id),
            description=f'Trip completed: {trip.trip_name}',
            ip_address=self.get_client_ip(request)
        )
        
        serializer = self.get_serializer(trip)
        return Response(serializer.data)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RestStopViewSet(viewsets.ModelViewSet):
    """Rest stop management viewset"""
    queryset = RestStop.objects.all()
    serializer_class = RestStopSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see rest stops for their own trips
        if self.request.user.is_staff:
            return RestStop.objects.all()
        return RestStop.objects.filter(trip__driver=self.request.user)
    
    @action(detail=True, methods=['post'])
    def start_rest(self, request, pk=None):
        """Start a rest stop"""
        rest_stop = self.get_object()
        if rest_stop.is_completed:
            return Response(
                {'error': 'Rest stop is already completed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.utils import timezone
        rest_stop.actual_start = timezone.now()
        rest_stop.save()
        
        serializer = self.get_serializer(rest_stop)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def complete_rest(self, request, pk=None):
        """Complete a rest stop"""
        rest_stop = self.get_object()
        if rest_stop.is_completed:
            return Response(
                {'error': 'Rest stop is already completed'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from django.utils import timezone
        rest_stop.actual_end = timezone.now()
        rest_stop.is_completed = True
        rest_stop.save()
        
        serializer = self.get_serializer(rest_stop)
        return Response(serializer.data)


class RouteSegmentViewSet(viewsets.ModelViewSet):
    """Route segment management viewset"""
    queryset = RouteSegment.objects.all()
    serializer_class = RouteSegmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see route segments for their own trips
        if self.request.user.is_staff:
            return RouteSegment.objects.all()
        return RouteSegment.objects.filter(trip__driver=self.request.user)


class PlanRouteView(generics.CreateAPIView):
    """Plan a new route with HOS compliance and route optimization"""
    serializer_class = PlanRouteSerializer
    permission_classes = [IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        trip_data = serializer.validated_data
        
        try:
            # Initialize routing services
            route_service = RouteService()
            rest_stop_planner = RestStopPlanner(route_service)
            route_optimizer = RouteOptimizer(route_service, rest_stop_planner)
            
            # Get origin and destination locations
            pickup_location = Location.objects.get(id=trip_data['pickup_location_id'])
            delivery_location = Location.objects.get(id=trip_data['delivery_location_id'])
            
            # Convert to coordinates
            origin = (pickup_location.longitude, pickup_location.latitude)
            destination = (delivery_location.longitude, delivery_location.latitude)
            
            # Get HOS status for the driver
            try:
                driver_profile = request.user.driverprofile
                cycle_type = CycleType(driver_profile.cycle_type) if driver_profile.cycle_type else CycleType.SEVENTY_EIGHT
            except:
                cycle_type = CycleType.SEVENTY_EIGHT
            
            # Get user's current HOS status
            from log_sheets.models import LogEntry
            from django.utils import timezone
            from datetime import timedelta
            
            eight_days_ago = timezone.now() - timedelta(days=8)
            log_entries = LogEntry.objects.filter(
                driver=request.user,
                start_time__gte=eight_days_ago
            ).order_by('start_time')
            
            # Convert to format expected by HOS compliance engine
            log_data = []
            for entry in log_entries:
                log_data.append({
                    'id': entry.id,
                    'start_time': entry.start_time,
                    'end_time': entry.end_time,
                    'duty_status': entry.duty_status.name
                })
            
            # Initialize HOS compliance engine
            engine = AdvancedHOSComplianceEngine(cycle_type)
            hos_status = engine.calculate_hos_status(log_data)
            
            # Optimize route with HOS compliance
            optimized_route = route_optimizer.optimize_trip(
                origin,
                destination,
                [],  # No waypoints for now
                {
                    'current_driving_hours': hos_status.hours_used_this_cycle,
                    'hours_since_break': 0,  # Would need to calculate this
                    'on_duty_hours': hos_status.hours_used_this_cycle,
                    'consecutive_off_duty_hours': hos_status.consecutive_off_duty_hours
                }
            )
            
            # Create the trip with optimized route data
            trip = Trip.objects.create(
                driver=request.user,
                **trip_data,
                distance_miles=optimized_route.get('total_distance_miles', 0),
                estimated_duration_hours=optimized_route.get('total_duration_hours', 0)
            )
            
            # Create route segments from optimized route
            for segment in optimized_route.get('segments', []):
                RouteSegment.objects.create(
                    trip=trip,
                    segment_order=len(trip.routesegment_set.all()),
                    start_latitude=segment['start'][1],
                    start_longitude=segment['start'][0],
                    end_latitude=segment['end'][1],
                    end_longitude=segment['end'][0],
                    distance_miles=segment['distance_meters'] / 1609.34,
                    estimated_duration_hours=segment['duration_seconds'] / 3600
                )
            
            # Create rest stops based on HOS requirements
            for rest_stop_data in optimized_route.get('rest_stops', []):
                RestStop.objects.create(
                    trip=trip,
                    location_name=rest_stop_data.get('location'),
                    planned_start=trip.planned_start_time,
                    planned_duration_minutes=30 if rest_stop_data['type'] == 'required_30_min' else 600,
                    is_required=rest_stop_data.get('severity') == 'required',
                    reason=rest_stop_data.get('description', '')
                )
            
            # Create audit log
            AuditLog.objects.create(
                user=request.user,
                action='create',
                model_name='Trip',
                object_id=str(trip.id),
                description=f'Route planned with optimization: {trip.trip_name}',
                ip_address=self.get_client_ip(request)
            )
            
            # Return enhanced response with route optimization details
            response_serializer = TripSerializer(trip)
            response_data = response_serializer.data
            response_data['route_optimization'] = {
                'optimized': optimized_route.get('optimized', False),
                'total_distance_miles': optimized_route.get('total_distance_miles', 0),
                'total_duration_hours': optimized_route.get('total_duration_hours', 0),
                'hos_compliant': optimized_route.get('hos_compliant', False),
                'rest_stops': optimized_route.get('rest_stops', [])
            }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error planning route: {str(e)}")
            return Response({
                'error': 'Failed to plan route',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class CalculateHOSView(generics.GenericAPIView):
    """Calculate HOS compliance for a planned trip with comprehensive violation detection"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        from django.utils import timezone
        from datetime import datetime
        import logging
        
        logger = logging.getLogger(__name__)
        
        try:
            # Get trip data from request
            trip_data = request.data
            hours_used_before_trip = float(trip_data.get('hours_used_before_trip', 0))
            planned_start_time = trip_data.get('planned_start_time')
            planned_end_time = trip_data.get('planned_end_time')
            
            if not planned_start_time or not planned_end_time:
                return Response({
                    'error': 'planned_start_time and planned_end_time are required'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Parse planned trip times
            try:
                if isinstance(planned_start_time, str):
                    planned_start = datetime.fromisoformat(planned_start_time.replace('Z', '+00:00'))
                else:
                    planned_start = planned_start_time
                    
                if isinstance(planned_end_time, str):
                    planned_end = datetime.fromisoformat(planned_end_time.replace('Z', '+00:00'))
                else:
                    planned_end = planned_end_time
            except ValueError as e:
                return Response({
                    'error': f'Invalid date format: {str(e)}'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate trip times
            if planned_start >= planned_end:
                return Response({
                    'error': 'planned_start_time must be before planned_end_time'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            if planned_start.replace(tzinfo=None) < datetime.now():
                return Response({
                    'error': 'planned_start_time cannot be in the past'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Calculate trip duration
            trip_duration = planned_end - planned_start
            trip_hours = trip_duration.total_seconds() / 3600
            
            # Basic HOS compliance check (simplified)
            cycle_limit = 70.0  # 70-hour cycle
            driving_limit = 11.0  # 11-hour driving limit
            on_duty_limit = 14.0  # 14-hour on-duty limit
            
            # Calculate remaining hours
            hours_available = cycle_limit - hours_used_before_trip
            remaining_hours_after_trip = hours_available - trip_hours
            
            # Check for violations
            violations = []
            warnings = []
            
            # Check if trip exceeds driving limit
            if trip_hours > driving_limit:
                violations.append({
                    'type': 'driving_over_11_hours',
                    'description': f'Trip duration ({trip_hours:.1f} hours) exceeds 11-hour driving limit',
                    'severity': 'critical',
                    'requires_immediate_action': True
                })
            
            # Check if trip would exceed cycle hours
            if hours_used_before_trip + trip_hours > cycle_limit:
                overage = (hours_used_before_trip + trip_hours) - cycle_limit
                violations.append({
                    'type': 'cycle_hours_exceeded',
                    'description': f'Trip would exceed 70-hour cycle limit by {overage:.1f} hours',
                    'severity': 'critical',
                    'requires_immediate_action': True
                })
            
            # Check for warnings
            if remaining_hours_after_trip < 5:
                warnings.append({
                    'type': 'low_cycle_hours',
                    'message': f'Only {remaining_hours_after_trip:.1f} hours remaining in cycle after this trip',
                    'severity': 'warning'
                })
            
            # Determine if driver can drive
            can_drive = len(violations) == 0 and hours_available > 0
            
            # Generate recommendations
            recommendations = []
            if violations:
                recommendations.append({
                    'type': 'delay_trip',
                    'message': 'Consider delaying the trip to avoid HOS violations',
                    'priority': 'high'
                })
            
            if remaining_hours_after_trip < 10:
                recommendations.append({
                    'type': 'cycle_restart',
                    'message': 'Consider a 34-hour restart to reset your cycle',
                    'priority': 'low'
                })
            
            # Return the HOS calculation results
            return Response({
                'can_drive': can_drive,
                'hours_available': float(hours_available),
                'hours_used': float(hours_used_before_trip),
                'trip_hours': float(trip_hours),
                'remaining_hours_after_trip': max(0, float(remaining_hours_after_trip)),
                'violations': violations,
                'warnings': warnings,
                'recommendations': recommendations,
                'hos_status': {
                    'compliant': len(violations) == 0,
                    'can_be_on_duty': can_drive,
                    'needs_rest': not can_drive,
                    'consecutive_off_duty_hours': 0.0,  # Simplified
                    'last_30_min_break': None,  # Simplified
                    'cycle_type': '70_8',
                    'cycle_progress_percent': round((float(hours_used_before_trip) / cycle_limit) * 100, 1)
                },
                'trip_analysis': {
                    'total_driving_hours': float(trip_hours),
                    'total_on_duty_hours': float(trip_hours),  # Simplified
                    'cycle_limit': float(cycle_limit),
                    'would_exceed_cycle': hours_used_before_trip + trip_hours > cycle_limit,
                    'would_exceed_driving': trip_hours > driving_limit,
                    'would_exceed_on_duty': trip_hours > on_duty_limit
                }
            })
            
        except ValueError as e:
            logger.error(f"Value error in HOS calculation: {str(e)}")
            return Response({
                'error': f'Invalid input data: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error calculating HOS compliance: {str(e)}")
            return Response({
                'error': 'Failed to calculate HOS compliance',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)