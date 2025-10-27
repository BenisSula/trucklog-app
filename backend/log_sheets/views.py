from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.http import HttpResponse
from datetime import datetime
import csv
import json
from .models import LogEntry, DailyLog, Violation, CycleStatus, DutyStatus
from .serializers import (
    LogEntrySerializer, DailyLogSerializer, ViolationSerializer,
    CycleStatusSerializer, DutyStatusSerializer
)
from core_utils.models import AuditLog
from .export_service import LogSheetExporter, LogComplianceValidator
from .bulk_operations import BulkLogOperations
from .certification_workflow import CertificationWorkflow


class DutyStatusViewSet(viewsets.ReadOnlyModelViewSet):
    """Duty status viewset (read-only)"""
    queryset = DutyStatus.objects.all()
    serializer_class = DutyStatusSerializer
    permission_classes = [IsAuthenticated]


class LogEntryViewSet(viewsets.ModelViewSet):
    """Log entry management viewset"""
    queryset = LogEntry.objects.all()
    serializer_class = LogEntrySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own log entries unless they're staff
        if self.request.user.is_staff:
            return LogEntry.objects.all()
        return LogEntry.objects.filter(driver=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(driver=self.request.user)
    
    @action(detail=True, methods=['post'])
    def certify(self, request, pk=None):
        """Certify a log entry"""
        log_entry = self.get_object()
        if log_entry.is_certified:
            return Response(
                {'error': 'Log entry is already certified'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        log_entry.is_certified = True
        log_entry.certified_at = timezone.now()
        log_entry.save()
        
        # Create audit log
        AuditLog.objects.create(
            user=request.user,
            action='certify',
            model_name='LogEntry',
            object_id=str(log_entry.id),
            description=f'Log entry certified: {log_entry.start_time}',
            ip_address=self.get_client_ip(request)
        )
        
        serializer = self.get_serializer(log_entry)
        return Response(serializer.data)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class DailyLogViewSet(viewsets.ModelViewSet):
    """Daily log management viewset"""
    queryset = DailyLog.objects.all()
    serializer_class = DailyLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own daily logs unless they're staff
        if self.request.user.is_staff:
            return DailyLog.objects.all()
        return DailyLog.objects.filter(driver=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(driver=self.request.user)
    
    @action(detail=True, methods=['post'])
    def certify(self, request, pk=None):
        """Certify a daily log"""
        daily_log = self.get_object()
        if daily_log.is_certified:
            return Response(
                {'error': 'Daily log is already certified'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        daily_log.is_certified = True
        daily_log.certified_at = timezone.now()
        daily_log.certification_ip = self.get_client_ip(request)
        daily_log.save()
        
        # Create audit log
        AuditLog.objects.create(
            user=request.user,
            action='certify',
            model_name='DailyLog',
            object_id=str(daily_log.id),
            description=f'Daily log certified: {daily_log.log_date}',
            ip_address=self.get_client_ip(request)
        )
        
        serializer = self.get_serializer(daily_log)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current day's log"""
        today = timezone.now().date()
        try:
            daily_log = DailyLog.objects.get(driver=request.user, log_date=today)
            serializer = self.get_serializer(daily_log)
            return Response(serializer.data)
        except DailyLog.DoesNotExist:
            return Response(
                {'error': 'No log found for today'}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class ViolationViewSet(viewsets.ModelViewSet):
    """Violation management viewset"""
    queryset = Violation.objects.all()
    serializer_class = ViolationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own violations unless they're staff
        if self.request.user.is_staff:
            return Violation.objects.all()
        return Violation.objects.filter(driver=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(driver=self.request.user)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a violation"""
        violation = self.get_object()
        if violation.is_resolved:
            return Response(
                {'error': 'Violation is already resolved'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        resolution_notes = request.data.get('resolution_notes', '')
        violation.is_resolved = True
        violation.resolution_notes = resolution_notes
        violation.resolved_at = timezone.now()
        violation.save()
        
        serializer = self.get_serializer(violation)
        return Response(serializer.data)


class CycleStatusViewSet(viewsets.ModelViewSet):
    """Cycle status management viewset"""
    queryset = CycleStatus.objects.all()
    serializer_class = CycleStatusSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own cycle status unless they're staff
        if self.request.user.is_staff:
            return CycleStatus.objects.all()
        return CycleStatus.objects.filter(driver=self.request.user)
    
    def perform_create(self, serializer):
        serializer.save(driver=self.request.user)
    
    @action(detail=False, methods=['get'])
    def my_status(self, request):
        """Get current user's cycle status"""
        try:
            cycle_status = CycleStatus.objects.get(driver=request.user)
            serializer = self.get_serializer(cycle_status)
            return Response(serializer.data)
        except CycleStatus.DoesNotExist:
            return Response(
                {'error': 'Cycle status not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class GenerateLogSheetView(generics.GenericAPIView):
    """Generate a log sheet for a specific date range"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        from django.utils import timezone
        
        try:
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            
            if not start_date or not end_date:
                return Response(
                    {'error': 'start_date and end_date are required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
            # Parse dates
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_dt = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get log entries for the date range
            start_datetime = timezone.make_aware(datetime.combine(start_dt, datetime.min.time()))
            end_datetime = timezone.make_aware(datetime.combine(end_dt, datetime.max.time()))
            
            log_entries = LogEntry.objects.filter(
                driver=request.user,
                start_time__gte=start_datetime,
                start_time__lte=end_datetime
            ).order_by('start_time')
            
            # Group entries by date
            daily_logs = {}
            for entry in log_entries:
                entry_date = entry.start_time.date()
                if entry_date not in daily_logs:
                    daily_logs[entry_date] = {
                        'date': entry_date,
                        'entries': [],
                        'driving_hours': 0.0,
                        'on_duty_hours': 0.0,
                        'off_duty_hours': 0.0,
                    }
                
                duration = (entry.end_time - entry.start_time).total_seconds() / 3600
                
                if entry.duty_status.name == 'driving':
                    daily_logs[entry_date]['driving_hours'] += duration
                elif entry.duty_status.name in ['on_duty_not_driving', 'driving']:
                    daily_logs[entry_date]['on_duty_hours'] += duration
                else:
                    daily_logs[entry_date]['off_duty_hours'] += duration
                
                daily_logs[entry_date]['entries'].append({
                    'id': entry.id,
                    'duty_status': entry.duty_status.name,
                    'start_time': entry.start_time.isoformat(),
                    'end_time': entry.end_time.isoformat(),
                    'location': entry.location,
                    'city': entry.city,
                    'state': entry.state,
                    'remarks': entry.remarks,
                    'is_certified': entry.is_certified,
                })
            
            # Generate log sheet data
            log_sheet_data = {
                'driver_name': f"{request.user.first_name} {request.user.last_name}",
                'driver_id': request.user.id,
                'start_date': start_date,
                'end_date': end_date,
                'generated_at': timezone.now().isoformat(),
                'daily_logs': list(daily_logs.values()),
                'total_entries': len(log_entries)
            }
            
            # Generate unique log sheet ID
            log_sheet_id = f"log_{request.user.id}_{start_dt.strftime('%Y%m%d')}_{end_dt.strftime('%Y%m%d')}"
            
            return Response({
                'log_sheet_id': log_sheet_id,
                'start_date': start_date,
                'end_date': end_date,
                'total_entries': len(log_entries),
                'daily_logs_count': len(daily_logs),
                'download_url': f'/api/logs/sheet/{log_sheet_id}.pdf',
                'data': log_sheet_data
            })
            
        except Exception as e:
            return Response({
                'error': 'Failed to generate log sheet',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExportLogsView(generics.GenericAPIView):
    """Export logs in various formats"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        from django.utils import timezone
        from datetime import datetime
        
        try:
            format_type = request.data.get('format', 'pdf')
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            
            if not start_date or not end_date:
                return Response(
                    {'error': 'start_date and end_date are required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Parse dates
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_dt = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get log entries for the date range
            start_datetime = timezone.make_aware(datetime.combine(start_dt, datetime.min.time()))
            end_datetime = timezone.make_aware(datetime.combine(end_dt, datetime.max.time()))
            
            log_entries = LogEntry.objects.filter(
                driver=request.user,
                start_time__gte=start_datetime,
                start_time__lte=end_datetime
            ).order_by('start_time')
            
            if format_type == 'csv':
                return self._export_csv(log_entries, start_date, end_date)
            elif format_type == 'json':
                return self._export_json(log_entries, start_date, end_date)
            elif format_type == 'pdf':
                return self._export_pdf(log_entries, start_date, end_date)
            else:
                return Response({
                    'error': f'Unsupported format: {format_type}'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'error': 'Failed to export logs',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def _export_csv(self, log_entries, start_date, end_date):
        """Export logs as CSV"""
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="logs_{start_date}_to_{end_date}.csv"'
        
        writer = csv.writer(response)
        writer.writerow([
            'Date', 'Start Time', 'End Time', 'Duty Status', 
            'Location', 'City', 'State', 'Remarks', 'Certified'
        ])
        
        for entry in log_entries:
            writer.writerow([
                entry.start_time.date(),
                entry.start_time.time(),
                entry.end_time.time(),
                entry.duty_status.name,
                entry.location,
                entry.city,
                entry.state,
                entry.remarks,
                'Yes' if entry.is_certified else 'No'
            ])
        
        return response
    
    def _export_json(self, log_entries, start_date, end_date):
        """Export logs as JSON"""
        data = {
            'driver_name': f"{self.request.user.first_name} {self.request.user.last_name}",
            'driver_id': self.request.user.id,
            'start_date': start_date,
            'end_date': end_date,
            'exported_at': timezone.now().isoformat(),
            'entries': []
        }
        
        for entry in log_entries:
            data['entries'].append({
                'id': entry.id,
                'date': entry.start_time.date().isoformat(),
                'start_time': entry.start_time.isoformat(),
                'end_time': entry.end_time.isoformat(),
                'duty_status': entry.duty_status.name,
                'location': entry.location,
                'city': entry.city,
                'state': entry.state,
                'remarks': entry.remarks,
                'is_certified': entry.is_certified,
                'created_at': entry.created_at.isoformat(),
            })
        
        response = HttpResponse(
            json.dumps(data, indent=2),
            content_type='application/json'
        )
        response['Content-Disposition'] = f'attachment; filename="logs_{start_date}_to_{end_date}.json"'
        return response
    
    def _export_pdf(self, log_entries, start_date, end_date):
        """Export logs as PDF (placeholder)"""
        # This would use reportlab or similar to generate PDF
        # For now, return a JSON response with PDF generation info
        return Response({
            'message': 'PDF export would be implemented here',
            'format': 'pdf',
            'start_date': start_date,
            'end_date': end_date,
            'entries_count': len(log_entries),
            'download_url': f'/api/logs/export/logs_{start_date}_to_{end_date}.pdf'
        })


class CheckComplianceView(generics.GenericAPIView):
    """Check HOS compliance for current status with real-time updates and violation alerts"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        from core_utils.hos_compliance import HOSComplianceEngine, CycleType
        from core_utils.tasks import send_websocket_notification
        from django.utils import timezone
        import logging
        
        logger = logging.getLogger(__name__)
        
        try:
            # Get user's driver profile to determine cycle type
            try:
                driver_profile = request.user.driverprofile
                cycle_type = CycleType(driver_profile.cycle_type) if driver_profile.cycle_type else CycleType.SEVENTY_EIGHT
            except:
                cycle_type = CycleType.SEVENTY_EIGHT
            
            # Get user's log entries for the last 8 days
            eight_days_ago = timezone.now() - timezone.timedelta(days=8)
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
            
            # Initialize HOS compliance engine with user's cycle type
            engine = HOSComplianceEngine(cycle_type)
            
            # Calculate HOS status
            hos_status = engine.calculate_hos_status(log_data)
            
            # Get or create current cycle status
            cycle_status, created = CycleStatus.objects.get_or_create(
                driver=request.user,
                defaults={
                    'cycle_start_date': hos_status.cycle_start_date.date(),
                    'cycle_type': cycle_type.value,
                    'hours_used_this_cycle': hos_status.hours_used_this_cycle,
                    'hours_available': hos_status.hours_available,
                    'consecutive_off_duty_hours': hos_status.consecutive_off_duty_hours,
                    'last_30_min_break': hos_status.last_30_min_break,
                    'can_drive': hos_status.can_drive,
                    'can_be_on_duty': hos_status.can_be_on_duty,
                    'needs_rest': hos_status.needs_rest,
                }
            )
            
            # Check if status has changed significantly
            status_changed = False
            if not created:
                if (cycle_status.can_drive != hos_status.can_drive or 
                    cycle_status.can_be_on_duty != hos_status.can_be_on_duty or
                    cycle_status.needs_rest != hos_status.needs_rest):
                    status_changed = True
                
                # Update cycle status
                cycle_status.hours_used_this_cycle = hos_status.hours_used_this_cycle
                cycle_status.hours_available = hos_status.hours_available
                cycle_status.consecutive_off_duty_hours = hos_status.consecutive_off_duty_hours
                cycle_status.last_30_min_break = hos_status.last_30_min_break
                cycle_status.can_drive = hos_status.can_drive
                cycle_status.can_be_on_duty = hos_status.can_be_on_duty
                cycle_status.needs_rest = hos_status.needs_rest
                cycle_status.save()
            
            # Process violations and create violation records
            new_violations = []
            for violation in hos_status.violations:
                # Check if this violation already exists
                existing_violation = Violation.objects.filter(
                    driver=request.user,
                    violation_type=violation.violation_type,
                    occurred_at__date=violation.occurred_at.date(),
                    is_resolved=False
                ).first()
                
                if not existing_violation:
                    # Create new violation record
                    violation_obj = Violation.objects.create(
                        driver=request.user,
                        violation_type=violation.violation_type,
                        description=violation.description,
                        severity=violation.severity,
                        occurred_at=violation.occurred_at,
                        duration_over=violation.duration_over,
                        is_resolved=False
                    )
                    new_violations.append(violation_obj)
                    
                    # Send real-time notification for critical violations
                    if violation.severity == 'critical':
                        send_websocket_notification.delay(
                            request.user.id,
                            'hos_violation',
                            {
                                'message': violation.description,
                                'violation_type': violation.violation_type,
                                'severity': violation.severity,
                                'requires_immediate_action': True,
                                'occurred_at': violation.occurred_at.isoformat()
                            }
                        )
                        logger.warning(f"Critical HOS violation detected for user {request.user.id}: {violation.description}")
            
            # Send real-time HOS status update if status changed
            if status_changed or new_violations:
                send_websocket_notification.delay(
                    request.user.id,
                    'compliance_update',
                    {
                        'can_drive': hos_status.can_drive,
                        'can_be_on_duty': hos_status.can_be_on_duty,
                        'needs_rest': hos_status.needs_rest,
                        'hours_used': float(hos_status.hours_used_this_cycle),
                        'hours_available': float(hos_status.hours_available),
                        'violations_count': len(hos_status.violations),
                        'new_violations_count': len(new_violations)
                    }
                )
            
            # Convert violations to serializable format
            violations_data = []
            for violation in hos_status.violations:
                violations_data.append({
                    'violation_type': violation.violation_type,
                    'description': violation.description,
                    'severity': violation.severity,
                    'occurred_at': violation.occurred_at.isoformat(),
                    'duration_over': str(violation.duration_over) if violation.duration_over else None
                })
            
            # Calculate additional status information
            current_time = timezone.now()
            time_until_break_needed = None
            if hos_status.needs_rest:
                # Calculate when driver can drive again (after 10-hour break)
                if hos_status.consecutive_off_duty_hours < 10:
                    time_until_break_needed = 10 - float(hos_status.consecutive_off_duty_hours)
            
            # Calculate cycle progress
            cycle_progress = float(hos_status.hours_used_this_cycle) / float(engine.limits.cycle_hours) * 100
            
            return Response({
                'compliant': len(hos_status.violations) == 0,
                'hours_used': float(hos_status.hours_used_this_cycle),
                'hours_available': float(hos_status.hours_available),
                'can_drive': hos_status.can_drive,
                'can_be_on_duty': hos_status.can_be_on_duty,
                'needs_rest': hos_status.needs_rest,
                'consecutive_off_duty_hours': float(hos_status.consecutive_off_duty_hours),
                'last_30_min_break': hos_status.last_30_min_break.isoformat() if hos_status.last_30_min_break else None,
                'cycle_type': hos_status.cycle_type.value,
                'cycle_start_date': hos_status.cycle_start_date.isoformat(),
                'cycle_progress_percent': round(cycle_progress, 1),
                'time_until_break_needed': time_until_break_needed,
                'violations': violations_data,
                'status_changed': status_changed,
                'new_violations_count': len(new_violations),
                'last_updated': current_time.isoformat()
            })
            
        except Exception as e:
            logger.error(f"Error calculating HOS compliance for user {request.user.id}: {str(e)}")
            return Response({
                'error': 'Failed to calculate HOS compliance',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class HOSStatusView(generics.GenericAPIView):
    """Get real-time HOS status for dashboard"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, *args, **kwargs):
        from core_utils.hos_compliance import CycleType
        from django.utils import timezone
        import logging
        
        logger = logging.getLogger(__name__)
        
        try:
            # Get user's driver profile to determine cycle type
            try:
                driver_profile = request.user.driverprofile
                cycle_type = CycleType(driver_profile.cycle_type) if driver_profile.cycle_type else CycleType.SEVENTY_EIGHT
            except:
                cycle_type = CycleType.SEVENTY_EIGHT
            
            # Get current cycle status
            try:
                cycle_status = CycleStatus.objects.get(driver=request.user)
            except CycleStatus.DoesNotExist:
                # If no cycle status exists, trigger a compliance check
                from .views import CheckComplianceView
                compliance_view = CheckComplianceView()
                compliance_response = compliance_view.get(request)
                if compliance_response.status_code == 200:
                    cycle_status = CycleStatus.objects.get(driver=request.user)
                else:
                    return Response({
                        'error': 'Unable to determine HOS status'
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Get recent violations
            recent_violations = Violation.objects.filter(
                driver=request.user,
                is_resolved=False
            ).order_by('-occurred_at')[:5]
            
            violations_data = []
            for violation in recent_violations:
                violations_data.append({
                    'id': violation.id,
                    'violation_type': violation.violation_type,
                    'description': violation.description,
                    'severity': violation.severity,
                    'occurred_at': violation.occurred_at.isoformat(),
                    'duration_over': str(violation.duration_over) if violation.duration_over else None
                })
            
            # Calculate status indicators
            current_time = timezone.now()
            time_since_last_break = None
            if cycle_status.last_30_min_break:
                time_since_last_break = (current_time - cycle_status.last_30_min_break).total_seconds() / 3600
            
            # Calculate cycle progress
            cycle_progress = float(cycle_status.hours_used_this_cycle) / float(cycle_status.hours_used_this_cycle + cycle_status.hours_available) * 100 if (cycle_status.hours_used_this_cycle + cycle_status.hours_available) > 0 else 0
            
            # Determine status color and message
            status_color = 'green'
            status_message = 'Compliant'
            
            if not cycle_status.can_drive:
                status_color = 'red'
                status_message = 'Cannot Drive'
            elif cycle_status.needs_rest:
                status_color = 'yellow'
                status_message = 'Needs Rest'
            elif cycle_progress > 80:
                status_color = 'orange'
                status_message = 'Approaching Limit'
            
            return Response({
                # Flatten structure to match frontend expectations
                'can_drive': cycle_status.can_drive,
                'can_be_on_duty': cycle_status.can_be_on_duty,
                'needs_rest': cycle_status.needs_rest,
                'hours_used': float(cycle_status.hours_used_this_cycle),
                'hours_available': float(cycle_status.hours_available),
                'consecutive_off_duty_hours': float(cycle_status.consecutive_off_duty_hours),
                'violations_count': len(violations_data),
                'last_30_min_break': cycle_status.last_30_min_break.isoformat() if cycle_status.last_30_min_break else None,
                'cycle_progress_percent': round(cycle_progress, 1),
                'status_color': status_color,
                'status_message': status_message,
                'updated_at': cycle_status.last_updated.isoformat(),
                
                # Additional detailed data for dashboard
                'detailed': {
                    'cycle': {
                        'type': cycle_status.cycle_type,
                        'start_date': cycle_status.cycle_start_date.isoformat(),
                        'progress_percent': round(cycle_progress, 1)
                    },
                    'breaks': {
                        'last_30_min_break': cycle_status.last_30_min_break.isoformat() if cycle_status.last_30_min_break else None,
                        'time_since_last_break': time_since_last_break
                    },
                    'violations': {
                        'count': len(violations_data),
                        'recent': violations_data
                    }
                }
            })
            
        except Exception as e:
            logger.error(f"Error getting HOS status for user {request.user.id}: {str(e)}")
            return Response({
                'error': 'Failed to get HOS status',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ViolationResolveView(generics.GenericAPIView):
    """Resolve a HOS violation"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        violation_id = kwargs.get('violation_id')
        
        try:
            violation = Violation.objects.get(id=violation_id, driver=request.user)
            violation.is_resolved = True
            violation.resolved_at = timezone.now()
            violation.resolved_by = request.user
            violation.save()
            
            # Send notification that violation was resolved
            from core_utils.tasks import send_websocket_notification
            send_websocket_notification.delay(
                request.user.id,
                'violation_resolved',
                {
                    'message': f'Violation resolved: {violation.description}',
                    'violation_type': violation.violation_type,
                    'resolved_at': violation.resolved_at.isoformat()
                }
            )
            
            return Response({
                'message': 'Violation resolved successfully',
                'violation_id': violation.id
            })
            
        except Violation.DoesNotExist:
            return Response({
                'error': 'Violation not found'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                'error': 'Failed to resolve violation',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class EnhancedExportLogsView(generics.GenericAPIView):
    """Enhanced export logs with PDF, Excel, CSV and compliance validation"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        from django.utils import timezone
        from datetime import datetime
        
        try:
            format_type = request.data.get('format', 'pdf')
            start_date = request.data.get('start_date')
            end_date = request.data.get('end_date')
            include_compliance = request.data.get('include_compliance', True)
            
            if not start_date or not end_date:
                return Response(
                    {'error': 'start_date and end_date are required'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Parse dates
            try:
                start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_dt = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get log entries for the date range
            start_datetime = timezone.make_aware(datetime.combine(start_dt, datetime.min.time()))
            end_datetime = timezone.make_aware(datetime.combine(end_dt, datetime.max.time()))
            
            log_entries = LogEntry.objects.filter(
                driver=request.user,
                start_time__gte=start_datetime,
                start_time__lte=end_datetime
            ).order_by('start_time')
            
            if not log_entries.exists():
                return Response({
                    'error': 'No log entries found for the specified date range'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Create exporter
            exporter = LogSheetExporter(request.user, list(log_entries), start_date, end_date)
            
            # Export based on format
            if format_type == 'csv':
                return exporter.export_csv()
            elif format_type == 'excel':
                return exporter.export_excel()
            elif format_type == 'pdf':
                return exporter.export_pdf()
            else:
                return Response({
                    'error': f'Unsupported format: {format_type}. Supported formats: csv, excel, pdf'
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return Response({
                'error': 'Failed to export logs',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BulkLogOperationsView(generics.GenericAPIView):
    """Bulk operations on log entries"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        operation = request.data.get('operation')
        
        if operation == 'create':
            return self._bulk_create(request)
        elif operation == 'update':
            return self._bulk_update(request)
        elif operation == 'delete':
            return self._bulk_delete(request)
        elif operation == 'certify':
            return self._bulk_certify(request)
        elif operation == 'validate':
            return self._bulk_validate(request)
        else:
            return Response({
                'error': f'Unsupported operation: {operation}. Supported operations: create, update, delete, certify, validate'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def _bulk_create(self, request):
        """Bulk create log entries"""
        log_data = request.data.get('log_data', [])
        if not log_data:
            return Response({
                'error': 'log_data is required for bulk create operation'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        bulk_ops = BulkLogOperations(request.user)
        results = bulk_ops.bulk_create_logs(log_data)
        
        return Response(results)
    
    def _bulk_update(self, request):
        """Bulk update log entries"""
        update_data = request.data.get('update_data', [])
        if not update_data:
            return Response({
                'error': 'update_data is required for bulk update operation'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        bulk_ops = BulkLogOperations(request.user)
        results = bulk_ops.bulk_update_logs(update_data)
        
        return Response(results)
    
    def _bulk_delete(self, request):
        """Bulk delete log entries"""
        log_ids = request.data.get('log_ids', [])
        if not log_ids:
            return Response({
                'error': 'log_ids is required for bulk delete operation'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        bulk_ops = BulkLogOperations(request.user)
        results = bulk_ops.bulk_delete_logs(log_ids)
        
        return Response(results)
    
    def _bulk_certify(self, request):
        """Bulk certify log entries"""
        log_ids = request.data.get('log_ids', [])
        certification_data = request.data.get('certification_data', {})
        
        if not log_ids:
            return Response({
                'error': 'log_ids is required for bulk certify operation'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        bulk_ops = BulkLogOperations(request.user)
        results = bulk_ops.bulk_certify_logs(log_ids, certification_data)
        
        return Response(results)
    
    def _bulk_validate(self, request):
        """Bulk validate log entries"""
        log_ids = request.data.get('log_ids', [])
        if not log_ids:
            return Response({
                'error': 'log_ids is required for bulk validate operation'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        bulk_ops = BulkLogOperations(request.user)
        results = bulk_ops.bulk_validate_logs(log_ids)
        
        return Response(results)


class LogComplianceValidationView(generics.GenericAPIView):
    """Validate log entries for FMCSA compliance"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        log_ids = request.data.get('log_ids', [])
        
        if not log_ids:
            return Response({
                'error': 'log_ids is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Get log entries
            log_entries = LogEntry.objects.filter(
                id__in=log_ids,
                driver=request.user
            )
            
            if not log_entries.exists():
                return Response({
                    'error': 'No log entries found for the provided IDs'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Validate compliance
            validator = LogComplianceValidator(request.user)
            validation_result = validator.validate_logs(list(log_entries))
            
            return Response(validation_result)
            
        except Exception as e:
            return Response({
                'error': 'Failed to validate compliance',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class CertificationWorkflowView(generics.GenericAPIView):
    """Manage log certification workflow"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        action_type = request.data.get('action')
        
        if action_type == 'initiate':
            return self._initiate_certification(request)
        elif action_type == 'review':
            return self._review_certification(request)
        elif action_type == 'finalize':
            return self._finalize_certification(request)
        else:
            return Response({
                'error': f'Unsupported action: {action_type}. Supported actions: initiate, review, finalize'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, *args, **kwargs):
        certification_id = request.query_params.get('certification_id')
        status_filter = request.query_params.get('status')
        
        workflow = CertificationWorkflow(request.user)
        
        if certification_id:
            # Get specific certification status
            result = workflow.get_certification_status(certification_id)
        else:
            # Get all user certifications
            result = workflow.get_user_certifications(status_filter)
        
        return Response(result)
    
    def _initiate_certification(self, request):
        """Initiate certification workflow"""
        log_ids = request.data.get('log_ids', [])
        certification_data = request.data.get('certification_data', {})
        
        if not log_ids:
            return Response({
                'error': 'log_ids is required for certification initiation'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        workflow = CertificationWorkflow(request.user)
        results = workflow.initiate_certification(log_ids, certification_data)
        
        return Response(results)
    
    def _review_certification(self, request):
        """Review a certification request"""
        certification_id = request.data.get('certification_id')
        review_data = request.data.get('review_data', {})
        
        if not certification_id:
            return Response({
                'error': 'certification_id is required for certification review'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        workflow = CertificationWorkflow(request.user)
        results = workflow.review_certification(certification_id, review_data)
        
        return Response(results)
    
    def _finalize_certification(self, request):
        """Finalize a certification"""
        certification_id = request.data.get('certification_id')
        finalization_data = request.data.get('finalization_data', {})
        
        if not certification_id:
            return Response({
                'error': 'certification_id is required for certification finalization'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        workflow = CertificationWorkflow(request.user)
        results = workflow.finalize_certification(certification_id, finalization_data)
        
        return Response(results)