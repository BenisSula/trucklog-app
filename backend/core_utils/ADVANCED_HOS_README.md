# Advanced HOS Compliance System

This document describes the comprehensive Advanced Hours of Service (HOS) Compliance System implemented in the TruckLog application, providing enterprise-grade FMCSA compliance features with advanced analytics, team driving support, and violation resolution workflows.

## Overview

The Advanced HOS Compliance System provides:

- **34-Hour Restart Logic**: Advanced restart detection with sleeper berth validation
- **Sleeper Berth Tracking**: Comprehensive sleeper berth period management with split berth support
- **Team Driving Support**: Coordination and handoff management for team drivers
- **Violation Resolution Workflow**: Complete workflow for managing HOS violations
- **Compliance Analytics**: Detailed analytics and reporting for compliance metrics
- **Scalable Rule Engine**: Configurable rules for different compliance scenarios
- **Secure Data Processing**: Enterprise-grade security and audit logging

## Architecture

### Core Components

#### 1. AdvancedHOSComplianceEngine (`core_utils/hos_compliance.py`)
The main compliance engine with comprehensive FMCSA rule implementation:

```python
class AdvancedHOSComplianceEngine:
    """Advanced HOS Compliance Engine with comprehensive features"""
    
    def calculate_advanced_hos_status(
        self, 
        log_entries: List[Dict], 
        current_time: datetime = None,
        team_driving_info: Optional[TeamDrivingInfo] = None
    ) -> HOSStatus:
        """Calculate advanced HOS status with comprehensive compliance checking"""
```

**Key Features:**
- 34-hour restart detection with sleeper berth validation
- Split sleeper berth period support
- Team driving coordination
- Comprehensive violation detection
- Compliance analytics calculation
- Restart recommendations

#### 2. HOSRuleEngine (`core_utils/hos_compliance.py`)
Scalable rule handling system for configurable compliance:

```python
class HOSRuleEngine:
    """Scalable rule handling system for HOS compliance"""
    
    def add_custom_rule(self, rule_id: str, rule_config: Dict[str, Any]) -> bool:
        """Add a custom rule to the engine"""
    
    def update_rule(self, rule_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing rule"""
```

**Default Rules:**
- 11-hour driving limit
- 14-hour on-duty limit
- 30-minute break requirement
- Cycle hours limit
- 34-hour restart validation
- Sleeper berth split validation

#### 3. ViolationResolutionWorkflow (`core_utils/hos_compliance.py`)
Complete workflow management for violation resolution:

```python
class ViolationResolutionWorkflow:
    """Violation resolution workflow management"""
    
    def resolve_violation(
        self, 
        violation: Violation, 
        resolution_notes: str, 
        resolved_by: str,
        action: str = 'resolve'
    ) -> bool:
        """Resolve a violation with workflow validation"""
```

**Workflow States:**
- Pending
- In Review
- Resolved
- Disputed
- Escalated

#### 4. TeamDrivingCoordinator (`core_utils/hos_compliance.py`)
Team driving coordination and management:

```python
class TeamDrivingCoordinator:
    """Team driving coordination and management"""
    
    def create_team(self, team_id: str, driver_1_id: str, driver_2_id: str) -> bool:
        """Create a new team driving setup"""
    
    def handoff_driving(self, team_id: str, handoff_location: str, notes: str = "") -> bool:
        """Coordinate driving handoff between team members"""
```

### Database Models

#### Enhanced Models (`core_utils/hos_models.py`)

1. **TeamDriving**: Team driving coordination
2. **ViolationWorkflow**: Violation resolution workflow tracking
3. **ComplianceAnalytics**: Compliance metrics and analytics
4. **SleeperBerthPeriod**: Sleeper berth period tracking
5. **HOSRuleConfiguration**: Configurable HOS rules
6. **ComplianceAlert**: Compliance alerts and notifications
7. **HOSAuditLog**: Comprehensive audit logging

### API Endpoints

#### Advanced HOS Compliance API (`core_utils/hos_views.py`)

**Core Endpoints:**
- `POST /api/core-utils/hos/compliance/calculate/` - Calculate advanced HOS status
- `GET /api/core-utils/hos/compliance/summary/` - Get compliance summary

**Violation Management:**
- `GET /api/core-utils/hos/violation-workflows/` - List violation workflows
- `POST /api/core-utils/hos/violation-workflows/{id}/resolve/` - Resolve violation
- `POST /api/core-utils/hos/violation-workflows/{id}/escalate/` - Escalate violation

**Team Driving:**
- `GET /api/core-utils/hos/team-driving/` - List team driving setups
- `POST /api/core-utils/hos/team-driving/` - Create team driving setup
- `POST /api/core-utils/hos/team-driving/{id}/handoff/` - Coordinate handoff

**Analytics & Reporting:**
- `GET /api/core-utils/hos/compliance-analytics/` - List compliance analytics
- `GET /api/core-utils/hos/compliance-analytics/current_period/` - Current period analytics

**Alerts & Notifications:**
- `GET /api/core-utils/hos/compliance-alerts/` - List compliance alerts
- `POST /api/core-utils/hos/compliance-alerts/{id}/mark_read/` - Mark alert as read
- `POST /api/core-utils/hos/compliance-alerts/{id}/resolve/` - Resolve alert

**Rule Management:**
- `GET /api/core-utils/hos/hos-rules/` - List HOS rules (Admin only)
- `POST /api/core-utils/hos/hos-rules/{id}/toggle/` - Toggle rule status (Admin only)

## Key Features

### 1. 34-Hour Restart Logic

**Advanced Restart Detection:**
```python
def _is_valid_34_hour_restart(self, off_duty_entry: Dict, all_entries: List[Dict]) -> bool:
    """Enhanced 34-hour restart validation with sleeper berth support"""
    
    # Must be at least 34 hours off duty
    if duration < timedelta(hours=34):
        return False
    
    # Check for consecutive off-duty time (no on-duty periods during the break)
    # Allow sleeper berth time during 34-hour restart
    for entry in all_entries:
        if (entry['start_time'] > start_time and 
            entry['end_time'] < end_time and
            entry['duty_status'] in [DutyStatus.DRIVING.value, DutyStatus.ON_DUTY_NOT_DRIVING.value]):
            return False
    
    return True
```

**Features:**
- Validates consecutive 34+ hour off-duty periods
- Allows sleeper berth time during restart
- Prevents invalid restart attempts
- Tracks restart frequency and recommendations

### 2. Sleeper Berth Tracking

**Split Berth Support:**
```python
def _validate_split_sleeper_berth(self, sleeper_periods: List[SleeperBerthPeriod]) -> List[SleeperBerthPeriod]:
    """Validate split sleeper berth periods according to FMCSA rules"""
    
    # Check for valid split berth (minimum 2 hours each period, total 8+ hours)
    for i in range(len(sorted_periods) - 1):
        current_period = sorted_periods[i]
        next_period = sorted_periods[i + 1]
        
        # Check if periods are within 24 hours of each other
        time_between = next_period.start_time - current_period.end_time
        if time_between <= timedelta(hours=24):
            total_hours = current_period.duration_hours + next_period.duration_hours
            
            # Check if both periods are at least 2 hours and total is 8+ hours
            if (current_period.duration_hours >= Decimal('2.0') and 
                next_period.duration_hours >= Decimal('2.0') and 
                total_hours >= Decimal('8.0')):
                
                current_period.split_berth_period = True
                next_period.split_berth_period = True
```

**Features:**
- Tracks individual sleeper berth periods
- Validates split berth periods (2+2 hours minimum)
- Calculates consecutive hours
- Determines restart eligibility

### 3. Team Driving Support

**Team Coordination:**
```python
def handoff_driving(self, team_id: str, handoff_location: str, notes: str = "") -> bool:
    """Coordinate driving handoff between team members"""
    
    # Switch current driver
    if team_info.current_driver == TeamDrivingRole.DRIVER_1:
        team_info.current_driver = TeamDrivingRole.DRIVER_2
    else:
        team_info.current_driver = TeamDrivingRole.DRIVER_1
    
    team_info.handoff_time = timezone.now()
    team_info.handoff_location = handoff_location
    team_info.coordination_notes = notes
```

**Features:**
- Team creation and management
- Driving handoff coordination
- Location and time tracking
- Coordination notes and history

### 4. Violation Resolution Workflow

**Workflow Management:**
```python
def resolve_violation(
    self, 
    violation: Violation, 
    resolution_notes: str, 
    resolved_by: str,
    action: str = 'resolve'
) -> bool:
    """Resolve a violation with workflow validation"""
    
    if action not in self.workflow_steps.get(violation.status, []):
        raise ValidationError(f"Action '{action}' not allowed for status '{violation.status.value}'")
    
    violation.resolution_notes = resolution_notes
    violation.resolved_by = resolved_by
    violation.resolved_at = timezone.now()
    violation.status = ViolationStatus.RESOLVED
```

**Features:**
- Multi-step workflow with validation
- Escalation support
- Resolution tracking
- Audit trail maintenance

### 5. Compliance Analytics

**Comprehensive Metrics:**
```python
def _calculate_compliance_analytics(
    self, 
    log_entries: List[Dict], 
    violations: List[Violation], 
    current_time: datetime
) -> ComplianceAnalytics:
    """Calculate comprehensive compliance analytics"""
    
    # Count violations by type and severity
    for violation in violations:
        analytics.violations_by_type[violation.violation_type] = analytics.violations_by_type.get(violation.violation_type, 0) + 1
        analytics.violations_by_severity[violation.severity.value] = analytics.violations_by_severity.get(violation.severity.value, 0) + 1
    
    # Calculate compliance score (100 - penalty points)
    penalty_points = 0
    for violation in violations:
        if violation.severity == ViolationSeverity.CRITICAL:
            penalty_points += 20
        elif violation.severity == ViolationSeverity.MAJOR:
            penalty_points += 10
        elif violation.severity == ViolationSeverity.MINOR:
            penalty_points += 5
    
    analytics.compliance_score = max(Decimal('0.00'), Decimal('100.00') - Decimal(str(penalty_points)))
```

**Metrics:**
- Compliance score calculation
- Violation frequency analysis
- Cycle efficiency tracking
- Restart frequency monitoring
- Risk factor identification

## Usage Examples

### Calculate Advanced HOS Status

```python
# POST /api/core-utils/hos/compliance/calculate/
{
    "cycle_type": "70_8",
    "include_analytics": true,
    "include_recommendations": true,
    "days_back": 8
}

# Response
{
    "can_drive": true,
    "can_be_on_duty": true,
    "needs_rest": false,
    "hours_used_this_cycle": 45.5,
    "hours_available": 24.5,
    "consecutive_off_duty_hours": 2.5,
    "last_30_min_break": "2024-01-15T10:30:00Z",
    "cycle_type": "70_8",
    "cycle_start_date": "2024-01-08T00:00:00Z",
    "violations": [],
    "sleeper_berth_periods": [
        {
            "start_time": "2024-01-14T22:00:00Z",
            "end_time": "2024-01-15T08:00:00Z",
            "duration_hours": 10.0,
            "is_valid_for_restart": false,
            "split_berth_period": false
        }
    ],
    "analytics": {
        "total_violations": 0,
        "violations_by_type": {},
        "violations_by_severity": {},
        "compliance_score": 100.0,
        "cycle_efficiency": 85.5,
        "restart_frequency": 1.2,
        "average_daily_hours": 11.2,
        "risk_factors": []
    },
    "recommendations": {
        "last_restart": null,
        "time_since_restart_hours": null,
        "current_cycle_hours": 45.5,
        "cycle_limit": 70.0,
        "cycle_progress_percent": 65.0,
        "recommendations": [
            {
                "type": "plan_restart",
                "message": "Plan for a 34-hour restart within the next few days",
                "priority": "medium"
            }
        ]
    }
}
```

### Create Team Driving Setup

```python
# POST /api/core-utils/hos/team-driving/
{
    "team_id": "TEAM_001",
    "driver_1": 1,
    "driver_2": 2,
    "coordination_notes": "Team driving setup for long haul route"
}

# Response
{
    "id": 1,
    "team_id": "TEAM_001",
    "driver_1": 1,
    "driver_1_name": "John Smith",
    "driver_2": 2,
    "driver_2_name": "Jane Doe",
    "current_driver": "driver_1",
    "current_driver_name": "John Smith",
    "handoff_time": null,
    "handoff_location": "",
    "coordination_notes": "Team driving setup for long haul route",
    "is_active": true,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z"
}
```

### Coordinate Team Handoff

```python
# POST /api/core-utils/hos/team-driving/1/handoff/
{
    "handoff_location": "Rest Area 45, I-95 North",
    "notes": "Driver 1 completed 8 hours, switching to Driver 2"
}

# Response
{
    "id": 1,
    "team_id": "TEAM_001",
    "driver_1": 1,
    "driver_1_name": "John Smith",
    "driver_2": 2,
    "driver_2_name": "Jane Doe",
    "current_driver": "driver_2",
    "current_driver_name": "Jane Doe",
    "handoff_time": "2024-01-15T14:30:00Z",
    "handoff_location": "Rest Area 45, I-95 North",
    "coordination_notes": "Driver 1 completed 8 hours, switching to Driver 2",
    "is_active": true,
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T14:30:00Z"
}
```

### Resolve Violation

```python
# POST /api/core-utils/hos/violation-workflows/1/resolve/
{
    "resolution_notes": "Violation resolved after driver took required 10-hour break",
    "action": "resolve"
}

# Response
{
    "id": 1,
    "violation": 1,
    "violation_type": "driving_over_11",
    "violation_description": "Drove for 11.5 hours without 10-hour break",
    "violation_severity": "major",
    "violation_occurred_at": "2024-01-15T08:00:00Z",
    "driver_name": "John Smith",
    "status": "resolved",
    "escalation_level": 0,
    "resolution_notes": "Violation resolved after driver took required 10-hour break",
    "resolved_by": 1,
    "resolved_by_name": "John Smith",
    "resolved_at": "2024-01-15T16:00:00Z",
    "created_at": "2024-01-15T08:00:00Z",
    "updated_at": "2024-01-15T16:00:00Z"
}
```

## Security Features

### Data Protection
- **User Isolation**: Users can only access their own data unless they're staff
- **Admin Controls**: Rule configuration and audit logs restricted to admin users
- **Audit Logging**: Complete audit trail for all HOS-related actions
- **Input Validation**: Comprehensive validation for all API inputs

### Compliance Tracking
- **Immutable Logs**: HOS audit logs cannot be modified once created
- **Resolution Tracking**: Complete workflow tracking for violation resolution
- **Escalation Support**: Multi-level escalation for critical violations
- **Alert System**: Real-time alerts for compliance issues

## Performance Considerations

### Optimization Features
- **Efficient Calculations**: Optimized algorithms for HOS calculations
- **Caching Support**: Built-in support for caching compliance results
- **Batch Processing**: Support for bulk operations on log entries
- **Database Indexing**: Proper indexing on frequently queried fields

### Scalability
- **Rule Engine**: Scalable rule system for custom compliance requirements
- **Modular Design**: Modular architecture for easy extension
- **API-First**: RESTful API design for easy integration
- **Database Agnostic**: Works with any Django-supported database

## Integration Points

### Frontend Integration
- **Real-time Updates**: WebSocket support for real-time compliance updates
- **Dashboard Integration**: Compliance metrics for dashboard display
- **Alert Notifications**: Real-time alert notifications
- **Mobile Support**: Responsive design for mobile devices

### External Systems
- **ELD Integration**: Ready for Electronic Logging Device integration
- **Reporting Systems**: Export capabilities for compliance reporting
- **Audit Systems**: Integration with external audit systems
- **Notification Systems**: Integration with external notification services

## Monitoring and Maintenance

### Health Checks
- **System Health**: Built-in health check endpoints
- **Compliance Status**: Real-time compliance status monitoring
- **Performance Metrics**: Performance monitoring for compliance calculations
- **Error Tracking**: Comprehensive error tracking and logging

### Maintenance Tasks
- **Data Cleanup**: Automated cleanup of old audit logs
- **Analytics Generation**: Automated generation of compliance analytics
- **Rule Updates**: Support for rule updates without system downtime
- **Backup Support**: Integration with backup systems

## Future Enhancements

### Planned Features
- **Machine Learning**: ML-based compliance prediction
- **Advanced Analytics**: More sophisticated analytics and reporting
- **Integration APIs**: Additional integration APIs for external systems
- **Mobile App**: Dedicated mobile application for drivers

### Extensibility
- **Plugin System**: Plugin architecture for custom compliance rules
- **Custom Metrics**: Support for custom compliance metrics
- **Third-party Integrations**: Enhanced third-party system integrations
- **Advanced Workflows**: More sophisticated workflow management

This Advanced HOS Compliance System provides a comprehensive, scalable, and secure solution for FMCSA compliance management, with advanced features for team driving, violation resolution, and compliance analytics.
