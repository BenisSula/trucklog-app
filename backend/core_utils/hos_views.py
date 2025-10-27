"""
Advanced HOS Compliance API Views
Provides comprehensive API endpoints for advanced HOS compliance features
"""

from rest_framework import viewsets, generics, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.utils import timezone
from django.db import transaction, models
from django.core.exceptions import ValidationError
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from .hos_compliance import (
    AdvancedHOSComplianceEngine, 
    CycleType, 
    ViolationResolutionWorkflow,
    TeamDrivingCoordinator,
    create_compliance_engine,
    validate_log_entry,
    calculate_cycle_efficiency,
    get_compliance_summary
)
from .hos_models import (
    TeamDriving, 
    ViolationWorkflow, 
    ComplianceAnalytics, 
    SleeperBerthPeriod,
    HOSRuleConfiguration,
    ComplianceAlert,
    HOSAuditLog
)
from .hos_serializers import (
    TeamDrivingSerializer,
    ViolationWorkflowSerializer,
    ComplianceAnalyticsSerializer,
    SleeperBerthPeriodSerializer,
    HOSRuleConfigurationSerializer,
    ComplianceAlertSerializer,
    HOSAuditLogSerializer
)
from log_sheets.models import LogEntry, Violation
from log_sheets.serializers import LogEntrySerializer, ViolationSerializer

logger = logging.getLogger(__name__)


class AdvancedHOSComplianceView(generics.GenericAPIView):
    """Advanced HOS compliance calculation and analysis"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Calculate advanced HOS compliance status"""
        try:
            # Get parameters
            cycle_type = request.data.get('cycle_type', '70_8')
            include_analytics = request.data.get('include_analytics', True)
            include_recommendations = request.data.get('include_recommendations', True)
            
            # Convert cycle type
            try:
                cycle_enum = CycleType(cycle_type)
            except ValueError:
                return Response(
                    {'error': f'Invalid cycle type: {cycle_type}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get driver's log entries
            days_back = request.data.get('days_back', 8)
            start_date = timezone.now() - timedelta(days=days_back)
            
            log_entries = LogEntry.objects.filter(
                driver=request.user,
                start_time__gte=start_date
            ).order_by('start_time')
            
            # Convert to dict format
            log_data = []
            for entry in log_entries:
                log_data.append({
                    'start_time': entry.start_time,
                    'end_time': entry.end_time,
                    'duty_status': entry.duty_status.name,
                    'location': entry.location,
                    'remarks': entry.remarks
                })
            
            # Calculate compliance status
            engine = create_compliance_engine(cycle_enum)
            hos_status = engine.calculate_advanced_hos_status(log_data)
            
            # Prepare response
            response_data = {
                'can_drive': hos_status.can_drive,
                'can_be_on_duty': hos_status.can_be_on_duty,
                'needs_rest': hos_status.needs_rest,
                'hours_used_this_cycle': float(hos_status.hours_used_this_cycle),
                'hours_available': float(hos_status.hours_available),
                'consecutive_off_duty_hours': float(hos_status.consecutive_off_duty_hours),
                'last_30_min_break': hos_status.last_30_min_break.isoformat() if hos_status.last_30_min_break else None,
                'cycle_type': hos_status.cycle_type.value,
                'cycle_start_date': hos_status.cycle_start_date.isoformat(),
                'violations': [
                    {
                        'violation_type': v.violation_type,
                        'description': v.description,
                        'severity': v.severity.value,
                        'occurred_at': v.occurred_at.isoformat(),
                        'duration_over': str(v.duration_over) if v.duration_over else None,
                        'status': v.status.value,
                        'requires_immediate_action': v.requires_immediate_action,
                        'compliance_impact': v.compliance_impact
                    }
                    for v in hos_status.violations
                ],
                'sleeper_berth_periods': [
                    {
                        'start_time': p.start_time.isoformat(),
                        'end_time': p.end_time.isoformat() if p.end_time else None,
                        'duration_hours': float(p.duration_hours),
                        'is_valid_for_restart': p.is_valid_for_restart,
                        'split_berth_period': p.split_berth_period
                    }
                    for p in hos_status.sleeper_berth_periods
                ]
            }
            
            # Add analytics if requested
            if include_analytics and hos_status.compliance_analytics:
                analytics = hos_status.compliance_analytics
                response_data['analytics'] = {
                    'total_violations': analytics.total_violations,
                    'violations_by_type': analytics.violations_by_type,
                    'violations_by_severity': analytics.violations_by_severity,
                    'compliance_score': float(analytics.compliance_score),
                    'cycle_efficiency': float(analytics.cycle_efficiency),
                    'restart_frequency': float(analytics.restart_frequency),
                    'average_daily_hours': float(analytics.average_daily_hours),
                    'risk_factors': analytics.risk_factors
                }
            
            # Add recommendations if requested
            if include_recommendations:
                response_data['recommendations'] = hos_status.restart_recommendations
            
            # Add team driving info if available
            if hos_status.team_driving_info:
                response_data['team_driving'] = {
                    'team_id': hos_status.team_driving_info.team_id,
                    'current_driver': hos_status.team_driving_info.current_driver.value,
                    'handoff_time': hos_status.team_driving_info.handoff_time.isoformat() if hos_status.team_driving_info.handoff_time else None,
                    'handoff_location': hos_status.team_driving_info.handoff_location
                }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Failed to calculate HOS compliance: {e}")
            return Response(
                {'error': 'Failed to calculate compliance status', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ViolationResolutionViewSet(viewsets.ModelViewSet):
    """Violation resolution workflow management"""
    queryset = ViolationWorkflow.objects.all()
    serializer_class = ViolationWorkflowSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own violation workflows unless they're staff
        if self.request.user.is_staff:
            return ViolationWorkflow.objects.all()
        return ViolationWorkflow.objects.filter(violation__driver=self.request.user)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a violation"""
        workflow = self.get_object()
        
        try:
            resolution_notes = request.data.get('resolution_notes', '')
            action = request.data.get('action', 'resolve')
            
            if not resolution_notes:
                return Response(
                    {'error': 'Resolution notes are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use the workflow system
            workflow_manager = ViolationResolutionWorkflow()
            success = workflow_manager.resolve_violation(
                workflow.violation,
                resolution_notes,
                request.user.get_full_name(),
                action
            )
            
            if success:
                workflow.refresh_from_db()
                return Response(ViolationWorkflowSerializer(workflow).data)
            else:
                return Response(
                    {'error': 'Failed to resolve violation'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Failed to resolve violation {pk}: {e}")
            return Response(
                {'error': 'Failed to resolve violation', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        """Escalate a violation"""
        workflow = self.get_object()
        
        try:
            escalation_reason = request.data.get('escalation_reason', '')
            
            if not escalation_reason:
                return Response(
                    {'error': 'Escalation reason is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use the workflow system
            workflow_manager = ViolationResolutionWorkflow()
            success = workflow_manager.escalate_violation(
                workflow.violation,
                escalation_reason
            )
            
            if success:
                workflow.refresh_from_db()
                return Response(ViolationWorkflowSerializer(workflow).data)
            else:
                return Response(
                    {'error': 'Failed to escalate violation'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Failed to escalate violation {pk}: {e}")
            return Response(
                {'error': 'Failed to escalate violation', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TeamDrivingViewSet(viewsets.ModelViewSet):
    """Team driving coordination management"""
    queryset = TeamDriving.objects.all()
    serializer_class = TeamDrivingSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see teams they're part of unless they're staff
        if self.request.user.is_staff:
            return TeamDriving.objects.all()
        return TeamDriving.objects.filter(
            models.Q(driver_1=self.request.user) | models.Q(driver_2=self.request.user)
        )
    
    def perform_create(self, serializer):
        # Ensure the creating user is one of the drivers
        driver_1 = serializer.validated_data['driver_1']
        driver_2 = serializer.validated_data['driver_2']
        
        if self.request.user not in [driver_1, driver_2]:
            raise ValidationError("You can only create teams you're part of")
        
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def handoff(self, request, pk=None):
        """Coordinate driving handoff"""
        team = self.get_object()
        
        try:
            handoff_location = request.data.get('handoff_location', '')
            notes = request.data.get('notes', '')
            
            if not handoff_location:
                return Response(
                    {'error': 'Handoff location is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Use the team coordinator
            coordinator = TeamDrivingCoordinator()
            success = coordinator.handoff_driving(
                team.team_id,
                handoff_location,
                notes
            )
            
            if success:
                # Update the team record
                team.handoff_time = timezone.now()
                team.handoff_location = handoff_location
                team.coordination_notes = notes
                
                # Switch current driver
                if team.current_driver == 'driver_1':
                    team.current_driver = 'driver_2'
                else:
                    team.current_driver = 'driver_1'
                
                team.save()
                
                return Response(TeamDrivingSerializer(team).data)
            else:
                return Response(
                    {'error': 'Failed to coordinate handoff'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Failed to handoff driving for team {pk}: {e}")
            return Response(
                {'error': 'Failed to coordinate handoff', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ComplianceAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """Compliance analytics and reporting"""
    queryset = ComplianceAnalytics.objects.all()
    serializer_class = ComplianceAnalyticsSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own analytics unless they're staff
        if self.request.user.is_staff:
            return ComplianceAnalytics.objects.all()
        return ComplianceAnalytics.objects.filter(driver=self.request.user)
    
    @action(detail=False, methods=['get'])
    def current_period(self, request):
        """Get analytics for current period"""
        try:
            # Calculate current period (last 30 days)
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=30)
            
            analytics = ComplianceAnalytics.objects.filter(
                driver=request.user,
                period_start=start_date,
                period_end=end_date
            ).first()
            
            if analytics:
                return Response(ComplianceAnalyticsSerializer(analytics).data)
            else:
                # Generate analytics if not available
                analytics = self._generate_analytics(request.user, start_date, end_date)
                return Response(ComplianceAnalyticsSerializer(analytics).data)
                
        except Exception as e:
            logger.error(f"Failed to get current period analytics: {e}")
            return Response(
                {'error': 'Failed to get analytics', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_analytics(self, user, start_date, end_date):
        """Generate analytics for a period"""
        # Get log entries for the period
        log_entries = LogEntry.objects.filter(
            driver=user,
            start_time__date__gte=start_date,
            start_time__date__lte=end_date
        )
        
        # Get violations for the period
        violations = Violation.objects.filter(
            driver=user,
            occurred_at__date__gte=start_date,
            occurred_at__date__lte=end_date
        )
        
        # Calculate metrics
        total_violations = violations.count()
        violations_by_type = {}
        violations_by_severity = {}
        
        for violation in violations:
            violations_by_type[violation.violation_type] = violations_by_type.get(violation.violation_type, 0) + 1
            violations_by_severity[violation.severity] = violations_by_severity.get(violation.severity, 0) + 1
        
        # Calculate compliance score
        penalty_points = 0
        for violation in violations:
            if violation.severity == 'critical':
                penalty_points += 20
            elif violation.severity == 'major':
                penalty_points += 10
            elif violation.severity == 'minor':
                penalty_points += 5
        
        compliance_score = max(Decimal('0.00'), Decimal('100.00') - Decimal(str(penalty_points)))
        
        # Calculate efficiency
        cycle_efficiency = calculate_cycle_efficiency([
            {
                'start_time': entry.start_time,
                'end_time': entry.end_time,
                'duty_status': entry.duty_status.name
            }
            for entry in log_entries
        ])
        
        # Calculate average daily hours
        daily_hours = {}
        for entry in log_entries:
            date = entry.start_time.date()
            if date not in daily_hours:
                daily_hours[date] = 0
            daily_hours[date] += (entry.end_time - entry.start_time).total_seconds() / 3600
        
        average_daily_hours = Decimal(str(sum(daily_hours.values()) / len(daily_hours))) if daily_hours else Decimal('0.00')
        
        # Create analytics record
        analytics = ComplianceAnalytics.objects.create(
            driver=user,
            period_start=start_date,
            period_end=end_date,
            total_violations=total_violations,
            violations_by_type=violations_by_type,
            violations_by_severity=violations_by_severity,
            compliance_score=compliance_score,
            cycle_efficiency=cycle_efficiency,
            average_daily_hours=average_daily_hours
        )
        
        return analytics


class ComplianceAlertViewSet(viewsets.ModelViewSet):
    """Compliance alerts and notifications"""
    queryset = ComplianceAlert.objects.all()
    serializer_class = ComplianceAlertSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own alerts unless they're staff
        if self.request.user.is_staff:
            return ComplianceAlert.objects.all()
        return ComplianceAlert.objects.filter(driver=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark an alert as read"""
        alert = self.get_object()
        alert.is_read = True
        alert.save()
        return Response(ComplianceAlertSerializer(alert).data)
    
    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve an alert"""
        alert = self.get_object()
        
        try:
            resolution_notes = request.data.get('resolution_notes', '')
            
            alert.is_resolved = True
            alert.resolved_at = timezone.now()
            alert.resolved_by = request.user
            alert.message += f"\nResolved: {resolution_notes}"
            alert.save()
            
            return Response(ComplianceAlertSerializer(alert).data)
            
        except Exception as e:
            logger.error(f"Failed to resolve alert {pk}: {e}")
            return Response(
                {'error': 'Failed to resolve alert', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread alerts"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})


class HOSRuleConfigurationViewSet(viewsets.ModelViewSet):
    """HOS rule configuration management"""
    queryset = HOSRuleConfiguration.objects.all()
    serializer_class = HOSRuleConfigurationSerializer
    permission_classes = [IsAdminUser]  # Only admins can modify rules
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Toggle rule enabled/disabled status"""
        rule = self.get_object()
        rule.is_enabled = not rule.is_enabled
        rule.save()
        return Response(HOSRuleConfigurationSerializer(rule).data)


class HOSAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """HOS audit log (read-only for security)"""
    queryset = HOSAuditLog.objects.all()
    serializer_class = HOSAuditLogSerializer
    permission_classes = [IsAdminUser]  # Only admins can view audit logs
    
    def get_queryset(self):
        # Filter by driver if specified
        driver_id = self.request.query_params.get('driver_id')
        if driver_id:
            return HOSAuditLog.objects.filter(driver_id=driver_id)
        return HOSAuditLog.objects.all()


class SleeperBerthPeriodViewSet(viewsets.ReadOnlyModelViewSet):
    """Sleeper berth period tracking"""
    queryset = SleeperBerthPeriod.objects.all()
    serializer_class = SleeperBerthPeriodSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own sleeper berth periods unless they're staff
        if self.request.user.is_staff:
            return SleeperBerthPeriod.objects.all()
        return SleeperBerthPeriod.objects.filter(driver=self.request.user)


class HOSComplianceSummaryView(generics.GenericAPIView):
    """Get a summary of HOS compliance status"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get compliance summary"""
        try:
            # Get recent log entries
            days_back = int(request.query_params.get('days_back', 8))
            start_date = timezone.now() - timedelta(days=days_back)
            
            log_entries = LogEntry.objects.filter(
                driver=request.user,
                start_time__gte=start_date
            ).order_by('start_time')
            
            # Convert to dict format
            log_data = []
            for entry in log_entries:
                log_data.append({
                    'start_time': entry.start_time,
                    'end_time': entry.end_time,
                    'duty_status': entry.duty_status.name,
                    'location': entry.location,
                    'remarks': entry.remarks
                })
            
            # Calculate compliance status
            engine = create_compliance_engine()
            hos_status = engine.calculate_advanced_hos_status(log_data)
            
            # Get summary
            summary = get_compliance_summary(hos_status)
            
            return Response(summary)
            
        except Exception as e:
            logger.error(f"Failed to get compliance summary: {e}")
            return Response(
                {'error': 'Failed to get compliance summary', 'details': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
