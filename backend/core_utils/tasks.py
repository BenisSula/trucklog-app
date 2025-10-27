"""
Background tasks using Celery
"""

from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

User = get_user_model()


@shared_task
def send_notification_email(user_id, subject, message):
    """
    Send notification email to user
    """
    try:
        user = User.objects.get(id=user_id)
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return f"Email sent to {user.email}"
    except User.DoesNotExist:
        return f"User with id {user_id} not found"


@shared_task
def send_websocket_notification(user_id, message_type, message_data):
    """
    Send real-time notification via WebSocket
    """
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"notifications_{user_id}",
        {
            'type': message_type,
            'data': message_data
        }
    )
    return f"WebSocket notification sent to user {user_id}"


@shared_task
def process_trip_route(trip_id):
    """
    Process trip route calculation in background using OpenRouteService
    
    This task optimizes routes, calculates accurate distances and times,
    and plans rest stops based on HOS compliance requirements.
    """
    from trip_planner.models import Trip, RouteSegment, RestStop
    from trip_planner.services import RouteService, RestStopPlanner, RouteOptimizer
    from core_utils.hos_compliance import HOSComplianceEngine, CycleType
    from log_sheets.models import LogEntry
    from django.utils import timezone
    from datetime import timedelta
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Get the trip
        trip = Trip.objects.get(id=trip_id)
        
        # Initialize routing services
        route_service = RouteService()
        rest_stop_planner = RestStopPlanner(route_service)
        route_optimizer = RouteOptimizer(route_service, rest_stop_planner)
        
        # Get origin and destination
        pickup_loc = trip.pickup_location
        delivery_loc = trip.delivery_location
        
        origin = (pickup_loc.longitude, pickup_loc.latitude)
        destination = (delivery_loc.longitude, delivery_loc.latitude)
        
        # Get HOS status
        try:
            driver_profile = trip.driver.driverprofile
            cycle_type = CycleType(driver_profile.cycle_type) if driver_profile.cycle_type else CycleType.SEVENTY_EIGHT
        except:
            cycle_type = CycleType.SEVENTY_EIGHT
        
        # Get user's recent log entries
        eight_days_ago = timezone.now() - timedelta(days=8)
        log_entries = LogEntry.objects.filter(
            driver=trip.driver,
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
        
        # Calculate HOS status
        engine = HOSComplianceEngine(cycle_type)
        hos_status = engine.calculate_hos_status(log_data)
        
        # Optimize route
        optimized_route = route_optimizer.optimize_trip(
            origin,
            destination,
            [],
            {
                'current_driving_hours': hos_status.hours_used_this_cycle,
                'hours_since_break': 0,
                'on_duty_hours': hos_status.hours_used_this_cycle,
                'consecutive_off_duty_hours': hos_status.consecutive_off_duty_hours
            }
        )
        
        # Update trip with optimized data
        trip.distance_miles = optimized_route.get('total_distance_miles', 0)
        trip.estimated_duration_hours = optimized_route.get('total_duration_hours', 0)
        trip.save()
        
        # Update or create route segments
        RouteSegment.objects.filter(trip=trip).delete()
        for i, segment in enumerate(optimized_route.get('segments', [])):
            RouteSegment.objects.create(
                trip=trip,
                segment_order=i,
                start_latitude=segment['start'][1],
                start_longitude=segment['start'][0],
                end_latitude=segment['end'][1],
                end_longitude=segment['end'][0],
                distance_miles=segment['distance_meters'] / 1609.34,
                estimated_duration_hours=segment['duration_seconds'] / 3600
            )
        
        # Update or create rest stops
        RestStop.objects.filter(trip=trip).delete()
        for rest_stop_data in optimized_route.get('rest_stops', []):
            RestStop.objects.create(
                trip=trip,
                location_name=rest_stop_data.get('location'),
                planned_start=trip.planned_start_time,
                planned_duration_minutes=30 if rest_stop_data['type'] == 'required_30_min' else 600,
                is_required=rest_stop_data.get('severity') == 'required',
                reason=rest_stop_data.get('description', '')
            )
        
        logger.info(f"Route processed successfully for trip {trip_id}")
        return {
            'success': True,
            'trip_id': trip_id,
            'distance_miles': optimized_route.get('total_distance_miles', 0),
            'duration_hours': optimized_route.get('total_duration_hours', 0),
            'rest_stops': len(optimized_route.get('rest_stops', []))
        }
        
    except Trip.DoesNotExist:
        logger.error(f"Trip {trip_id} not found")
        return {'success': False, 'error': 'Trip not found'}
        
    except Exception as e:
        logger.error(f"Error processing trip route {trip_id}: {str(e)}")
        return {'success': False, 'error': str(e)}


@shared_task
def generate_log_sheet(driver_id, start_date, end_date):
    """
    Generate log sheet for driver in background
    """
    # This would generate the actual log sheet
    # For now, just a placeholder
    return f"Log sheet generated for driver {driver_id} from {start_date} to {end_date}"


@shared_task
def check_hos_compliance(driver_id=None):
    """
    Check HOS compliance for driver or all active drivers
    """
    from log_sheets.models import LogEntry, Violation
    from core_utils.violation_detector import ViolationDetector
    from django.utils import timezone
    from datetime import timedelta
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        if driver_id:
            # Check specific driver
            drivers_to_check = [driver_id]
        else:
            # Check all active drivers
            recent_date = timezone.now() - timedelta(days=8)
            drivers_to_check = LogEntry.objects.filter(
                start_time__gte=recent_date
            ).values_list('driver', flat=True).distinct()
        
        detector = ViolationDetector()
        violations_created = 0
        
        for driver_id in drivers_to_check:
            # Get driver's log entries for the last 8 days
            recent_date = timezone.now() - timedelta(days=8)
            log_entries = LogEntry.objects.filter(
                driver_id=driver_id,
                start_time__gte=recent_date
            ).order_by('start_time')
            
            # Convert to format expected by violation detector
            log_data = []
            for entry in log_entries:
                log_data.append({
                    'id': entry.id,
                    'start_time': entry.start_time,
                    'end_time': entry.end_time,
                    'duty_status': entry.duty_status.name
                })
            
            # Detect violations
            violations = detector.detect_violations(log_data, driver_id)
            
            # Create violation records
            for violation in violations:
                violation_obj, created = Violation.objects.get_or_create(
                    driver_id=driver_id,
                    violation_type=violation.violation_type,
                    occurred_at=violation.occurred_at,
                    defaults={
                        'description': violation.description,
                        'severity': violation.severity.value,
                        'duration_over': violation.duration_over,
                        'log_entry_id': violation.log_entry_id,
                        'is_resolved': False,
                    }
                )
                
                if created:
                    violations_created += 1
                    
                    # Send notification for critical violations
                    if violation.requires_immediate_action:
                        send_websocket_notification.delay(
                            driver_id,
                            'hos_violation',
                            {
                                'message': violation.description,
                                'violation_type': violation.violation_type,
                                'severity': violation.severity.value,
                                'requires_immediate_action': True
                            }
                        )
        
        logger.info(f"HOS compliance check completed. Created {violations_created} new violations.")
        return f"Created {violations_created} new violations"
        
    except Exception as e:
        logger.error(f"Error in HOS compliance check: {str(e)}")
        raise


