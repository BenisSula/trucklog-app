"""
Advanced FMCSA Hours of Service (HOS) Compliance Engine
Implements comprehensive FMCSA regulations with advanced features:
- 34-hour restart logic with sleeper berth validation
- Team driving support and coordination
- Violation resolution workflow
- Compliance analytics and reporting
- Scalable rule handling system
- Secure data processing
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
import logging

logger = logging.getLogger(__name__)


class CycleType(Enum):
    """HOS Cycle Types"""
    SEVENTY_EIGHT = "70_8"  # 70-hour/8-day cycle
    SIXTY_SEVEN = "60_7"    # 60-hour/7-day cycle
    THIRTY_FOUR_HOUR = "34_hour"  # 34-hour restart


class DutyStatus(Enum):
    """Duty Status Types"""
    OFF_DUTY = "off_duty"
    SLEEPER_BERTH = "sleeper_berth"
    DRIVING = "driving"
    ON_DUTY_NOT_DRIVING = "on_duty_not_driving"


class ViolationSeverity(Enum):
    """Violation Severity Levels"""
    MINOR = "minor"
    MAJOR = "major"
    CRITICAL = "critical"


class ViolationStatus(Enum):
    """Violation Resolution Status"""
    PENDING = "pending"
    IN_REVIEW = "in_review"
    RESOLVED = "resolved"
    DISPUTED = "disputed"
    ESCALATED = "escalated"


class TeamDrivingRole(Enum):
    """Team Driving Roles"""
    DRIVER_1 = "driver_1"
    DRIVER_2 = "driver_2"
    RELIEF_DRIVER = "relief_driver"


@dataclass
class HOSLimits:
    """HOS Limits for different cycle types"""
    max_driving_hours: Decimal
    max_on_duty_hours: Decimal
    min_off_duty_hours: Decimal
    min_30_min_break: bool
    min_sleeper_berth_hours: Decimal
    cycle_hours: Decimal
    cycle_days: int
    max_consecutive_driving_hours: Decimal = Decimal('11.00')
    min_34_hour_restart_hours: Decimal = Decimal('34.00')


@dataclass
class SleeperBerthPeriod:
    """Sleeper berth period tracking"""
    start_time: datetime
    end_time: Optional[datetime]
    duration_hours: Decimal
    is_valid_for_restart: bool = False
    consecutive_hours: Decimal = Decimal('0.00')
    split_berth_period: bool = False


@dataclass
class Violation:
    """Enhanced HOS Violation with workflow support"""
    violation_type: str
    description: str
    severity: ViolationSeverity
    occurred_at: datetime
    duration_over: Optional[timedelta] = None
    status: ViolationStatus = ViolationStatus.PENDING
    resolution_notes: str = ""
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    escalation_level: int = 0
    requires_immediate_action: bool = False
    compliance_impact: str = ""


@dataclass
class TeamDrivingInfo:
    """Team driving coordination information"""
    team_id: str
    driver_1_id: str
    driver_2_id: str
    current_driver: TeamDrivingRole
    handoff_time: Optional[datetime] = None
    handoff_location: str = ""
    coordination_notes: str = ""


@dataclass
class ComplianceAnalytics:
    """Compliance analytics and metrics"""
    total_violations: int = 0
    violations_by_type: Dict[str, int] = field(default_factory=dict)
    violations_by_severity: Dict[str, int] = field(default_factory=dict)
    compliance_score: Decimal = Decimal('100.00')
    cycle_efficiency: Decimal = Decimal('0.00')
    restart_frequency: Decimal = Decimal('0.00')
    average_daily_hours: Decimal = Decimal('0.00')
    risk_factors: List[str] = field(default_factory=list)


@dataclass
class HOSStatus:
    """Enhanced HOS Status with advanced features"""
    can_drive: bool
    can_be_on_duty: bool
    needs_rest: bool
    hours_used_this_cycle: Decimal
    hours_available: Decimal
    consecutive_off_duty_hours: Decimal
    last_30_min_break: Optional[datetime]
    violations: List[Violation]
    cycle_type: CycleType
    cycle_start_date: datetime
    sleeper_berth_periods: List[SleeperBerthPeriod] = field(default_factory=list)
    team_driving_info: Optional[TeamDrivingInfo] = None
    compliance_analytics: Optional[ComplianceAnalytics] = None
    restart_recommendations: Dict[str, Any] = field(default_factory=dict)


class HOSRuleEngine:
    """Scalable rule handling system for HOS compliance"""
    
    def __init__(self):
        self.rules = {}
        self._load_default_rules()
    
    def _load_default_rules(self):
        """Load default FMCSA rules"""
        self.rules = {
            'driving_limit_11_hours': {
                'name': '11-Hour Driving Limit',
                'description': 'Maximum 11 hours of driving after 10 consecutive hours off duty',
                'severity': ViolationSeverity.MAJOR,
                'enabled': True,
                'parameters': {'max_hours': 11.0}
            },
            'on_duty_limit_14_hours': {
                'name': '14-Hour On-Duty Limit',
                'description': 'Maximum 14 hours on duty after 10 consecutive hours off duty',
                'severity': ViolationSeverity.MAJOR,
                'enabled': True,
                'parameters': {'max_hours': 14.0}
            },
            '30_min_break_requirement': {
                'name': '30-Minute Break Requirement',
                'description': 'Must take 30-minute break after 8 hours of driving',
                'severity': ViolationSeverity.MAJOR,
                'enabled': True,
                'parameters': {'break_threshold': 8.0, 'min_break': 0.5}
            },
            'cycle_hours_limit': {
                'name': 'Cycle Hours Limit',
                'description': 'Maximum hours in 70/8 or 60/7 cycle',
                'severity': ViolationSeverity.CRITICAL,
                'enabled': True,
                'parameters': {'cycle_hours': 70.0, 'cycle_days': 8}
            },
            '34_hour_restart': {
                'name': '34-Hour Restart',
                'description': 'Minimum 34 consecutive hours off duty to restart cycle',
                'severity': ViolationSeverity.CRITICAL,
                'enabled': True,
                'parameters': {'min_hours': 34.0}
            },
            'sleeper_berth_split': {
                'name': 'Sleeper Berth Split',
                'description': 'Sleeper berth time can be split into two periods',
                'severity': ViolationSeverity.MINOR,
                'enabled': True,
                'parameters': {'min_first_period': 2.0, 'min_second_period': 2.0}
            }
        }
    
    def add_custom_rule(self, rule_id: str, rule_config: Dict[str, Any]) -> bool:
        """Add a custom rule to the engine"""
        try:
            self.rules[rule_id] = rule_config
            logger.info(f"Added custom rule: {rule_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to add custom rule {rule_id}: {e}")
            return False
    
    def update_rule(self, rule_id: str, updates: Dict[str, Any]) -> bool:
        """Update an existing rule"""
        if rule_id not in self.rules:
            return False
        
        try:
            self.rules[rule_id].update(updates)
            logger.info(f"Updated rule: {rule_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to update rule {rule_id}: {e}")
            return False
    
    def get_rule(self, rule_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific rule configuration"""
        return self.rules.get(rule_id)
    
    def get_all_rules(self) -> Dict[str, Dict[str, Any]]:
        """Get all rules"""
        return self.rules.copy()


class AdvancedHOSComplianceEngine:
    """Advanced HOS Compliance Engine with comprehensive features"""
    
    # FMCSA HOS Limits
    HOS_LIMITS = {
        CycleType.SEVENTY_EIGHT: HOSLimits(
            max_driving_hours=Decimal('11.00'),
            max_on_duty_hours=Decimal('14.00'),
            min_off_duty_hours=Decimal('10.00'),
            min_30_min_break=True,
            min_sleeper_berth_hours=Decimal('8.00'),
            cycle_hours=Decimal('70.00'),
            cycle_days=8
        ),
        CycleType.SIXTY_SEVEN: HOSLimits(
            max_driving_hours=Decimal('11.00'),
            max_on_duty_hours=Decimal('14.00'),
            min_off_duty_hours=Decimal('10.00'),
            min_30_min_break=True,
            min_sleeper_berth_hours=Decimal('8.00'),
            cycle_hours=Decimal('60.00'),
            cycle_days=7
        ),
        CycleType.THIRTY_FOUR_HOUR: HOSLimits(
            max_driving_hours=Decimal('11.00'),
            max_on_duty_hours=Decimal('14.00'),
            min_off_duty_hours=Decimal('34.00'),
            min_30_min_break=True,
            min_sleeper_berth_hours=Decimal('8.00'),
            cycle_hours=Decimal('70.00'),
            cycle_days=8
        )
    }
    
    def __init__(self, cycle_type: CycleType = CycleType.SEVENTY_EIGHT):
        self.cycle_type = cycle_type
        self.limits = self.HOS_LIMITS[cycle_type]
        self.rule_engine = HOSRuleEngine()
    
    def calculate_advanced_hos_status(
        self, 
        log_entries: List[Dict], 
        current_time: datetime = None,
        team_driving_info: Optional[TeamDrivingInfo] = None
    ) -> HOSStatus:
        """
        Calculate advanced HOS status with comprehensive compliance checking
        
        Args:
            log_entries: List of log entry dictionaries
            current_time: Current time (defaults to now)
            team_driving_info: Team driving coordination info
        
        Returns:
            Enhanced HOSStatus object
        """
        if current_time is None:
            current_time = timezone.now()
        
        # Sort log entries by start time
        sorted_entries = sorted(log_entries, key=lambda x: x['start_time'])
        
        # Calculate cycle start with 34-hour restart logic
        cycle_start = self._calculate_advanced_cycle_start(sorted_entries, current_time)
        
        # Calculate sleeper berth periods
        sleeper_berth_periods = self._calculate_sleeper_berth_periods(sorted_entries, current_time)
        
        # Calculate hours used in current cycle
        cycle_entries = [entry for entry in sorted_entries 
                        if entry['start_time'] >= cycle_start]
        
        hours_used = self._calculate_cycle_hours(cycle_entries)
        hours_available = self.limits.cycle_hours - hours_used
        
        # Check for violations using rule engine
        violations = self._check_advanced_violations(cycle_entries, current_time, sleeper_berth_periods)
        
        # Calculate consecutive off-duty hours
        consecutive_off_duty = self._calculate_consecutive_off_duty_hours(sorted_entries, current_time)
        
        # Check if 30-minute break is needed
        last_30_min_break = self._get_last_30_min_break(sorted_entries, current_time)
        
        # Determine if driver can drive or be on duty
        can_drive = self._can_drive_advanced(cycle_entries, current_time, violations, team_driving_info)
        can_be_on_duty = self._can_be_on_duty_advanced(cycle_entries, current_time, violations, team_driving_info)
        needs_rest = self._needs_rest_advanced(cycle_entries, current_time, violations)
        
        # Calculate compliance analytics
        compliance_analytics = self._calculate_compliance_analytics(sorted_entries, violations, current_time)
        
        # Get restart recommendations
        restart_recommendations = self._get_advanced_restart_recommendations(
            sorted_entries, current_time, sleeper_berth_periods
        )
        
        return HOSStatus(
            can_drive=can_drive,
            can_be_on_duty=can_be_on_duty,
            needs_rest=needs_rest,
            hours_used_this_cycle=hours_used,
            hours_available=hours_available,
            consecutive_off_duty_hours=consecutive_off_duty,
            last_30_min_break=last_30_min_break,
            violations=violations,
            cycle_type=self.cycle_type,
            cycle_start_date=cycle_start,
            sleeper_berth_periods=sleeper_berth_periods,
            team_driving_info=team_driving_info,
            compliance_analytics=compliance_analytics,
            restart_recommendations=restart_recommendations
        )
    
    def _calculate_advanced_cycle_start(self, log_entries: List[Dict], current_time: datetime) -> datetime:
        """Calculate cycle start with enhanced 34-hour restart detection"""
        if not log_entries:
            return current_time - timedelta(days=self.limits.cycle_days)
        
        # Find the most recent valid 34-hour restart
        cycle_start = current_time - timedelta(days=self.limits.cycle_days)
        
        # Check for 34-hour restarts in the last cycle period
        for entry in reversed(log_entries):
            if (entry['duty_status'] == DutyStatus.OFF_DUTY.value and 
                entry['end_time'] and 
                self._is_valid_34_hour_restart(entry, log_entries)):
                # Found a valid 34-hour restart, cycle starts after this break
                cycle_start = entry['end_time']
                break
        
        # Ensure cycle start is not more than cycle_days ago
        max_cycle_start = current_time - timedelta(days=self.limits.cycle_days)
        if cycle_start < max_cycle_start:
            cycle_start = max_cycle_start
        
        return cycle_start
    
    def _is_valid_34_hour_restart(self, off_duty_entry: Dict, all_entries: List[Dict]) -> bool:
        """Enhanced 34-hour restart validation with sleeper berth support"""
        if not off_duty_entry['end_time']:
            return False
        
        duration = off_duty_entry['end_time'] - off_duty_entry['start_time']
        
        # Must be at least 34 hours off duty
        if duration < timedelta(hours=34):
            return False
        
        # Check if this was consecutive off-duty time (no on-duty periods during the break)
        start_time = off_duty_entry['start_time']
        end_time = off_duty_entry['end_time']
        
        # Allow sleeper berth time during 34-hour restart
        for entry in all_entries:
            if (entry['start_time'] > start_time and 
                entry['end_time'] < end_time and
                entry['duty_status'] in [DutyStatus.DRIVING.value, DutyStatus.ON_DUTY_NOT_DRIVING.value]):
                # Found on-duty time during the break, not a valid 34-hour restart
                return False
        
        return True
    
    def _calculate_sleeper_berth_periods(self, log_entries: List[Dict], current_time: datetime) -> List[SleeperBerthPeriod]:
        """Calculate sleeper berth periods with split berth support"""
        sleeper_periods = []
        
        for entry in log_entries:
            if entry['duty_status'] == DutyStatus.SLEEPER_BERTH.value:
                duration = entry['end_time'] - entry['start_time'] if entry['end_time'] else current_time - entry['start_time']
                hours = Decimal(str(duration.total_seconds() / 3600))
                
                period = SleeperBerthPeriod(
                    start_time=entry['start_time'],
                    end_time=entry['end_time'],
                    duration_hours=hours,
                    is_valid_for_restart=hours >= self.limits.min_34_hour_restart_hours,
                    consecutive_hours=hours,
                    split_berth_period=False
                )
                
                sleeper_periods.append(period)
        
        # Check for split sleeper berth periods
        sleeper_periods = self._validate_split_sleeper_berth(sleeper_periods)
        
        return sleeper_periods
    
    def _validate_split_sleeper_berth(self, sleeper_periods: List[SleeperBerthPeriod]) -> List[SleeperBerthPeriod]:
        """Validate split sleeper berth periods according to FMCSA rules"""
        if len(sleeper_periods) < 2:
            return sleeper_periods
        
        # Sort by start time
        sorted_periods = sorted(sleeper_periods, key=lambda x: x.start_time)
        
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
        
        return sleeper_periods
    
    def _check_advanced_violations(
        self, 
        cycle_entries: List[Dict], 
        current_time: datetime,
        sleeper_berth_periods: List[SleeperBerthPeriod]
    ) -> List[Violation]:
        """Check for violations using the rule engine"""
        violations = []
        
        # Check each rule
        for rule_id, rule_config in self.rule_engine.get_all_rules().items():
            if not rule_config.get('enabled', True):
                continue
            
            rule_violations = self._check_rule_violation(rule_id, rule_config, cycle_entries, current_time, sleeper_berth_periods)
            violations.extend(rule_violations)
        
        return violations
    
    def _check_rule_violation(
        self, 
        rule_id: str, 
        rule_config: Dict[str, Any], 
        cycle_entries: List[Dict], 
        current_time: datetime,
        sleeper_berth_periods: List[SleeperBerthPeriod]
    ) -> List[Violation]:
        """Check a specific rule for violations"""
        violations = []
        
        if rule_id == 'driving_limit_11_hours':
            violations.extend(self._check_driving_limit_rule(rule_config, cycle_entries))
        elif rule_id == 'on_duty_limit_14_hours':
            violations.extend(self._check_on_duty_limit_rule(rule_config, cycle_entries))
        elif rule_id == '30_min_break_requirement':
            violations.extend(self._check_30_min_break_rule(rule_config, cycle_entries, current_time))
        elif rule_id == 'cycle_hours_limit':
            violations.extend(self._check_cycle_hours_rule(rule_config, cycle_entries))
        elif rule_id == '34_hour_restart':
            violations.extend(self._check_34_hour_restart_rule(rule_config, cycle_entries, sleeper_berth_periods))
        elif rule_id == 'sleeper_berth_split':
            violations.extend(self._check_sleeper_berth_split_rule(rule_config, sleeper_berth_periods))
        
        return violations
    
    def _check_driving_limit_rule(self, rule_config: Dict[str, Any], cycle_entries: List[Dict]) -> List[Violation]:
        """Check 11-hour driving limit rule"""
        violations = []
        max_hours = rule_config['parameters']['max_hours']
        
        for entry in cycle_entries:
            if entry['duty_status'] == DutyStatus.DRIVING.value:
                duration = entry['end_time'] - entry['start_time']
                hours = Decimal(str(duration.total_seconds() / 3600))
                
                if hours > max_hours:
                    violations.append(Violation(
                        violation_type='driving_over_11',
                        description=f'Drove for {hours:.1f} hours without 10-hour break (limit: {max_hours}h)',
                        severity=rule_config['severity'],
                        occurred_at=entry['start_time'],
                        duration_over=timedelta(hours=float(hours - max_hours)),
                        requires_immediate_action=True,
                        compliance_impact='Driver must take 10-hour break before driving again'
                    ))
        
        return violations
    
    def _check_on_duty_limit_rule(self, rule_config: Dict[str, Any], cycle_entries: List[Dict]) -> List[Violation]:
        """Check 14-hour on-duty limit rule"""
        violations = []
        max_hours = rule_config['parameters']['max_hours']
        
        for entry in cycle_entries:
            if entry['duty_status'] in [DutyStatus.DRIVING.value, DutyStatus.ON_DUTY_NOT_DRIVING.value]:
                duration = entry['end_time'] - entry['start_time']
                hours = Decimal(str(duration.total_seconds() / 3600))
                
                if hours > max_hours:
                    violations.append(Violation(
                        violation_type='on_duty_over_14',
                        description=f'On duty for {hours:.1f} hours without 10-hour break (limit: {max_hours}h)',
                        severity=rule_config['severity'],
                        occurred_at=entry['start_time'],
                        duration_over=timedelta(hours=float(hours - max_hours)),
                        requires_immediate_action=True,
                        compliance_impact='Driver must take 10-hour break before any duty'
                    ))
        
        return violations
    
    def _check_30_min_break_rule(self, rule_config: Dict[str, Any], cycle_entries: List[Dict], current_time: datetime) -> List[Violation]:
        """Check 30-minute break requirement rule"""
        violations = []
        break_threshold = rule_config['parameters']['break_threshold']
        min_break = rule_config['parameters']['min_break']
        
        driving_hours = self._calculate_driving_hours_since_break(cycle_entries, current_time)
        if driving_hours > break_threshold:
            violations.append(Violation(
                violation_type='no_30_min_break',
                description=f'No {min_break*60:.0f}-minute break after {driving_hours:.1f} hours of driving (threshold: {break_threshold}h)',
                severity=rule_config['severity'],
                occurred_at=current_time,
                requires_immediate_action=True,
                compliance_impact='Driver must take 30-minute break before continuing to drive'
            ))
        
        return violations
    
    def _check_cycle_hours_rule(self, rule_config: Dict[str, Any], cycle_entries: List[Dict]) -> List[Violation]:
        """Check cycle hours limit rule"""
        violations = []
        cycle_hours = rule_config['parameters']['cycle_hours']
        
        total_hours = self._calculate_cycle_hours(cycle_entries)
        
        if total_hours > cycle_hours:
            violations.append(Violation(
                violation_type='cycle_hours_exceeded',
                description=f'Exceeded {cycle_hours}-hour cycle limit by {total_hours - cycle_hours:.1f} hours',
                severity=rule_config['severity'],
                occurred_at=cycle_entries[-1]['end_time'] if cycle_entries else datetime.now(),
                requires_immediate_action=True,
                compliance_impact='Driver must take 34-hour restart or wait for cycle reset'
            ))
        
        return violations
    
    def _check_34_hour_restart_rule(self, rule_config: Dict[str, Any], cycle_entries: List[Dict], sleeper_berth_periods: List[SleeperBerthPeriod]) -> List[Violation]:
        """Check 34-hour restart rule"""
        violations = []
        min_hours = rule_config['parameters']['min_hours']
        
        # Check if there's a valid 34-hour restart period
        valid_restart_found = False
        for period in sleeper_berth_periods:
            if period.is_valid_for_restart and period.duration_hours >= min_hours:
                valid_restart_found = True
                break
        
        # Check for invalid restart attempts
        for entry in cycle_entries:
            if (entry['duty_status'] == DutyStatus.OFF_DUTY.value and 
                entry['end_time'] and 
                entry['end_time'] - entry['start_time'] < timedelta(hours=min_hours)):
                
                violations.append(Violation(
                    violation_type='invalid_34_hour_restart',
                    description=f'Attempted 34-hour restart with only {(entry["end_time"] - entry["start_time"]).total_seconds()/3600:.1f} hours off duty (minimum: {min_hours}h)',
                    severity=rule_config['severity'],
                    occurred_at=entry['start_time'],
                    compliance_impact='Restart attempt invalid, cycle continues'
                ))
        
        return violations
    
    def _check_sleeper_berth_split_rule(self, rule_config: Dict[str, Any], sleeper_berth_periods: List[SleeperBerthPeriod]) -> List[Violation]:
        """Check sleeper berth split rule"""
        violations = []
        min_first_period = rule_config['parameters']['min_first_period']
        min_second_period = rule_config['parameters']['min_second_period']
        
        # Check for invalid split berth periods
        split_periods = [p for p in sleeper_berth_periods if p.split_berth_period]
        
        if len(split_periods) >= 2:
            first_period = split_periods[0]
            second_period = split_periods[1]
            
            if first_period.duration_hours < min_first_period:
                violations.append(Violation(
                    violation_type='invalid_split_berth_first',
                    description=f'First sleeper berth period only {first_period.duration_hours:.1f} hours (minimum: {min_first_period}h)',
                    severity=rule_config['severity'],
                    occurred_at=first_period.start_time,
                    compliance_impact='Split berth period invalid'
                ))
            
            if second_period.duration_hours < min_second_period:
                violations.append(Violation(
                    violation_type='invalid_split_berth_second',
                    description=f'Second sleeper berth period only {second_period.duration_hours:.1f} hours (minimum: {min_second_period}h)',
                    severity=rule_config['severity'],
                    occurred_at=second_period.start_time,
                    compliance_impact='Split berth period invalid'
                ))
        
        return violations
    
    def _calculate_compliance_analytics(
        self, 
        log_entries: List[Dict], 
        violations: List[Violation], 
        current_time: datetime
    ) -> ComplianceAnalytics:
        """Calculate comprehensive compliance analytics"""
        analytics = ComplianceAnalytics()
        
        # Count violations
        analytics.total_violations = len(violations)
        
        # Group violations by type and severity
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
        
        # Calculate cycle efficiency
        if log_entries:
            total_hours = sum((entry['end_time'] - entry['start_time']).total_seconds() / 3600 
                            for entry in log_entries if entry['end_time'])
            driving_hours = sum((entry['end_time'] - entry['start_time']).total_seconds() / 3600 
                              for entry in log_entries if entry['duty_status'] == DutyStatus.DRIVING.value and entry['end_time'])
            
            if total_hours > 0:
                analytics.cycle_efficiency = Decimal(str(driving_hours / total_hours * 100))
        
        # Calculate restart frequency
        restart_count = sum(1 for entry in log_entries 
                          if entry['duty_status'] == DutyStatus.OFF_DUTY.value and 
                          entry['end_time'] and 
                          entry['end_time'] - entry['start_time'] >= timedelta(hours=34))
        
        if log_entries:
            days_span = (current_time - log_entries[0]['start_time']).days + 1
            analytics.restart_frequency = Decimal(str(restart_count / days_span * 7))  # Restarts per week
        
        # Calculate average daily hours
        if log_entries:
            daily_hours = {}
            for entry in log_entries:
                date = entry['start_time'].date()
                if date not in daily_hours:
                    daily_hours[date] = 0
                daily_hours[date] += (entry['end_time'] - entry['start_time']).total_seconds() / 3600
            
            if daily_hours:
                analytics.average_daily_hours = Decimal(str(sum(daily_hours.values()) / len(daily_hours)))
        
        # Identify risk factors
        if analytics.compliance_score < Decimal('80.00'):
            analytics.risk_factors.append('Low compliance score')
        if analytics.total_violations > 5:
            analytics.risk_factors.append('High violation count')
        if analytics.restart_frequency > Decimal('2.0'):
            analytics.risk_factors.append('Frequent restarts')
        if analytics.average_daily_hours > Decimal('12.0'):
            analytics.risk_factors.append('High daily hours')
        
        return analytics
    
    def _get_advanced_restart_recommendations(
        self, 
        log_entries: List[Dict], 
        current_time: datetime,
        sleeper_berth_periods: List[SleeperBerthPeriod]
    ) -> Dict[str, Any]:
        """Get advanced restart recommendations"""
        recommendations = {
            'last_restart': None,
            'time_since_restart_hours': None,
            'current_cycle_hours': 0.0,
            'cycle_limit': float(self.limits.cycle_hours),
            'cycle_progress_percent': 0.0,
            'recommendations': [],
            'optimal_restart_time': None,
            'sleeper_berth_options': []
        }
        
        # Find the last valid 34-hour restart
        last_restart = None
        for period in sleeper_berth_periods:
            if period.is_valid_for_restart:
                last_restart = period.end_time
                break
        
        if last_restart:
            recommendations['last_restart'] = last_restart.isoformat()
            recommendations['time_since_restart_hours'] = (current_time - last_restart).total_seconds() / 3600
        
        # Calculate current cycle hours
        cycle_start = self._calculate_advanced_cycle_start(log_entries, current_time)
        cycle_entries = [entry for entry in log_entries if entry['start_time'] >= cycle_start]
        cycle_hours = self._calculate_cycle_hours(cycle_entries)
        
        recommendations['current_cycle_hours'] = float(cycle_hours)
        recommendations['cycle_progress_percent'] = float(cycle_hours) / float(self.limits.cycle_hours) * 100
        
        # Generate recommendations
        if cycle_hours >= self.limits.cycle_hours * Decimal('0.9'):
            recommendations['recommendations'].append({
                'type': 'restart_immediate',
                'message': 'Cycle limit nearly reached - 34-hour restart required immediately',
                'priority': 'critical',
                'action_required': True
            })
        elif cycle_hours >= self.limits.cycle_hours * Decimal('0.8'):
            recommendations['recommendations'].append({
                'type': 'restart_soon',
                'message': 'Consider a 34-hour restart soon to reset your cycle',
                'priority': 'high',
                'action_required': False
            })
        
        # Calculate optimal restart time
        if cycle_hours >= self.limits.cycle_hours * Decimal('0.7'):
            optimal_time = current_time + timedelta(hours=1)  # Recommend restart in 1 hour
            recommendations['optimal_restart_time'] = optimal_time.isoformat()
        
        # Sleeper berth options
        recommendations['sleeper_berth_options'] = [
            {
                'type': 'single_period',
                'description': 'Single 8+ hour sleeper berth period',
                'minimum_hours': 8.0,
                'benefits': ['Simplest option', 'Full cycle reset']
            },
            {
                'type': 'split_period',
                'description': 'Split sleeper berth (2+2 hours)',
                'minimum_hours': 4.0,
                'benefits': ['More flexible', 'Can be split across days']
            }
        ]
        
        return recommendations
    
    def _can_drive_advanced(
        self, 
        cycle_entries: List[Dict], 
        current_time: datetime, 
        violations: List[Violation],
        team_driving_info: Optional[TeamDrivingInfo]
    ) -> bool:
        """Advanced driving eligibility check with team driving support"""
        # Check for critical violations
        critical_violations = [v for v in violations if v.severity == ViolationSeverity.CRITICAL]
        if critical_violations:
            return False
        
        # Check team driving coordination
        if team_driving_info:
            if team_driving_info.current_driver != TeamDrivingRole.DRIVER_1:
                return False  # Only current driver can drive
        
        # Check 11-hour driving limit
        driving_hours = self._calculate_driving_hours_since_break(cycle_entries, current_time)
        if driving_hours >= 11:
            return False
        
        # Check 14-hour on-duty limit
        on_duty_hours = self._calculate_on_duty_hours_since_break(cycle_entries, current_time)
        if on_duty_hours >= 14:
            return False
        
        return True
    
    def _can_be_on_duty_advanced(
        self, 
        cycle_entries: List[Dict], 
        current_time: datetime, 
        violations: List[Violation],
        team_driving_info: Optional[TeamDrivingInfo]
    ) -> bool:
        """Advanced on-duty eligibility check"""
        # Check for critical violations
        critical_violations = [v for v in violations if v.severity == ViolationSeverity.CRITICAL]
        if critical_violations:
            return False
        
        # Check 14-hour on-duty limit
        on_duty_hours = self._calculate_on_duty_hours_since_break(cycle_entries, current_time)
        if on_duty_hours >= 14:
            return False
        
        return True
    
    def _needs_rest_advanced(
        self, 
        cycle_entries: List[Dict], 
        current_time: datetime, 
        violations: List[Violation]
    ) -> bool:
        """Advanced rest requirement check"""
        # Check for violations that require rest
        major_violations = [v for v in violations if v.severity in [ViolationSeverity.MAJOR, ViolationSeverity.CRITICAL]]
        if major_violations:
            return True
        
        # Check if approaching limits
        driving_hours = self._calculate_driving_hours_since_break(cycle_entries, current_time)
        on_duty_hours = self._calculate_on_duty_hours_since_break(cycle_entries, current_time)
        
        if driving_hours >= 10 or on_duty_hours >= 13:
            return True
        
        return False
    
    # Helper methods (keeping existing implementations)
    def _calculate_cycle_hours(self, cycle_entries: List[Dict]) -> Decimal:
        """Calculate total hours used in current cycle"""
        total_hours = Decimal('0.00')
        
        for entry in cycle_entries:
            if entry['duty_status'] in [DutyStatus.DRIVING.value, DutyStatus.ON_DUTY_NOT_DRIVING.value]:
                duration = entry['end_time'] - entry['start_time']
                hours = Decimal(str(duration.total_seconds() / 3600))
                total_hours += hours
        
        return total_hours
    
    def _calculate_consecutive_off_duty_hours(self, log_entries: List[Dict], current_time: datetime) -> Decimal:
        """Calculate consecutive off-duty hours"""
        if not log_entries:
            return Decimal('0.00')
        
        # Find the last off-duty period
        last_off_duty = None
        for entry in reversed(log_entries):
            if entry['duty_status'] == DutyStatus.OFF_DUTY.value:
                last_off_duty = entry
                break
        
        if last_off_duty and last_off_duty['end_time']:
            duration = current_time - last_off_duty['end_time']
            return Decimal(str(duration.total_seconds() / 3600))
        
        return Decimal('0.00')
    
    def _get_last_30_min_break(self, log_entries: List[Dict], current_time: datetime) -> Optional[datetime]:
        """Get the last 30-minute break"""
        for entry in reversed(log_entries):
            if (entry['duty_status'] == DutyStatus.OFF_DUTY.value and 
                entry['end_time'] and 
                entry['end_time'] - entry['start_time'] >= timedelta(minutes=30)):
                return entry['end_time']
        
        return None
    
    def _calculate_driving_hours_since_break(self, log_entries: List[Dict], current_time: datetime) -> Decimal:
        """Calculate driving hours since last 30-minute break"""
        last_break = self._get_last_30_min_break(log_entries, current_time)
        
        if last_break is None:
            # If no break found, calculate all driving hours
            driving_hours = Decimal('0.00')
            for entry in log_entries:
                if entry['duty_status'] == DutyStatus.DRIVING.value:
                    duration = entry['end_time'] - entry['start_time']
                    hours = Decimal(str(duration.total_seconds() / 3600))
                    driving_hours += hours
            return driving_hours
        else:
            # Calculate driving hours since the last break
            cutoff_time = last_break
            driving_hours = Decimal('0.00')
            for entry in log_entries:
                if (entry['duty_status'] == DutyStatus.DRIVING.value and 
                    entry['start_time'] >= cutoff_time):
                    duration = entry['end_time'] - entry['start_time']
                    hours = Decimal(str(duration.total_seconds() / 3600))
                    driving_hours += hours
            return driving_hours
    
    def _calculate_on_duty_hours_since_break(self, cycle_entries: List[Dict], current_time: datetime) -> Decimal:
        """Calculate on-duty hours since last 10-hour break"""
        # Find last 10-hour off-duty period
        last_10_hour_break = None
        for entry in reversed(cycle_entries):
            if (entry['duty_status'] == DutyStatus.OFF_DUTY.value and 
                entry['end_time'] and 
                entry['end_time'] - entry['start_time'] >= timedelta(hours=10)):
                last_10_hour_break = entry['end_time']
                break
        
        if last_10_hour_break is None:
            # Look back 14 hours
            cutoff_time = current_time - timedelta(hours=14)
        else:
            cutoff_time = last_10_hour_break
        
        on_duty_hours = Decimal('0.00')
        for entry in cycle_entries:
            if (entry['duty_status'] in [DutyStatus.DRIVING.value, DutyStatus.ON_DUTY_NOT_DRIVING.value] and 
                entry['start_time'] >= cutoff_time):
                duration = entry['end_time'] - entry['start_time']
                hours = Decimal(str(duration.total_seconds() / 3600))
                on_duty_hours += hours
        
        return on_duty_hours


class ViolationResolutionWorkflow:
    """Violation resolution workflow management"""
    
    def __init__(self):
        self.workflow_steps = {
            ViolationStatus.PENDING: ['acknowledge', 'dispute', 'escalate'],
            ViolationStatus.IN_REVIEW: ['approve', 'reject', 'request_info'],
            ViolationStatus.DISPUTED: ['review', 'approve', 'reject'],
            ViolationStatus.ESCALATED: ['review', 'approve', 'reject'],
            ViolationStatus.RESOLVED: ['reopen']
        }
    
    def resolve_violation(
        self, 
        violation: Violation, 
        resolution_notes: str, 
        resolved_by: str,
        action: str = 'resolve'
    ) -> bool:
        """Resolve a violation with workflow validation"""
        try:
            if action not in self.workflow_steps.get(violation.status, []):
                raise ValidationError(f"Action '{action}' not allowed for status '{violation.status.value}'")
            
            violation.resolution_notes = resolution_notes
            violation.resolved_by = resolved_by
            violation.resolved_at = timezone.now()
            violation.status = ViolationStatus.RESOLVED
            
            logger.info(f"Violation {violation.violation_type} resolved by {resolved_by}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to resolve violation: {e}")
            return False
    
    def escalate_violation(self, violation: Violation, escalation_reason: str) -> bool:
        """Escalate a violation to higher authority"""
        try:
            violation.status = ViolationStatus.ESCALATED
            violation.escalation_level += 1
            violation.resolution_notes += f"\nEscalated: {escalation_reason}"
            
            logger.info(f"Violation {violation.violation_type} escalated to level {violation.escalation_level}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to escalate violation: {e}")
            return False


class TeamDrivingCoordinator:
    """Team driving coordination and management"""
    
    def __init__(self):
        self.active_teams = {}
    
    def create_team(self, team_id: str, driver_1_id: str, driver_2_id: str) -> bool:
        """Create a new team driving setup"""
        try:
            team_info = TeamDrivingInfo(
                team_id=team_id,
                driver_1_id=driver_1_id,
                driver_2_id=driver_2_id,
                current_driver=TeamDrivingRole.DRIVER_1
            )
            
            self.active_teams[team_id] = team_info
            logger.info(f"Created team {team_id} with drivers {driver_1_id} and {driver_2_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create team {team_id}: {e}")
            return False
    
    def handoff_driving(self, team_id: str, handoff_location: str, notes: str = "") -> bool:
        """Coordinate driving handoff between team members"""
        try:
            if team_id not in self.active_teams:
                raise ValidationError(f"Team {team_id} not found")
            
            team_info = self.active_teams[team_id]
            
            # Switch current driver
            if team_info.current_driver == TeamDrivingRole.DRIVER_1:
                team_info.current_driver = TeamDrivingRole.DRIVER_2
            else:
                team_info.current_driver = TeamDrivingRole.DRIVER_1
            
            team_info.handoff_time = timezone.now()
            team_info.handoff_location = handoff_location
            team_info.coordination_notes = notes
            
            logger.info(f"Team {team_id} handoff to {team_info.current_driver.value} at {handoff_location}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to handoff driving for team {team_id}: {e}")
            return False
    
    def get_team_status(self, team_id: str) -> Optional[TeamDrivingInfo]:
        """Get current team status"""
        return self.active_teams.get(team_id)


# Factory function for creating compliance engine instances
def create_compliance_engine(cycle_type: CycleType = CycleType.SEVENTY_EIGHT) -> AdvancedHOSComplianceEngine:
    """Create a new compliance engine instance"""
    return AdvancedHOSComplianceEngine(cycle_type)


# Utility functions for common operations
def validate_log_entry(entry: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate a single log entry"""
    errors = []
    
    # Check required fields
    required_fields = ['start_time', 'end_time', 'duty_status']
    for field in required_fields:
        if field not in entry or entry[field] is None:
            errors.append(f"Missing required field: {field}")
    
    # Check time validity
    if 'start_time' in entry and 'end_time' in entry and entry['start_time'] and entry['end_time']:
        if entry['start_time'] >= entry['end_time']:
            errors.append("Start time must be before end time")
    
    # Check duty status validity
    if 'duty_status' in entry:
        valid_statuses = [status.value for status in DutyStatus]
        if entry['duty_status'] not in valid_statuses:
            errors.append(f"Invalid duty status: {entry['duty_status']}")
    
    return len(errors) == 0, errors


def calculate_cycle_efficiency(log_entries: List[Dict]) -> Decimal:
    """Calculate cycle efficiency percentage"""
    if not log_entries:
        return Decimal('0.00')
    
    total_hours = sum((entry['end_time'] - entry['start_time']).total_seconds() / 3600 
                     for entry in log_entries if entry['end_time'])
    driving_hours = sum((entry['end_time'] - entry['start_time']).total_seconds() / 3600 
                       for entry in log_entries 
                       if entry['duty_status'] == DutyStatus.DRIVING.value and entry['end_time'])
    
    if total_hours == 0:
        return Decimal('0.00')
    
    return Decimal(str(driving_hours / total_hours * 100))


def get_compliance_summary(hos_status: HOSStatus) -> Dict[str, Any]:
    """Get a summary of compliance status"""
    return {
        'can_drive': hos_status.can_drive,
        'can_be_on_duty': hos_status.can_be_on_duty,
        'needs_rest': hos_status.needs_rest,
        'compliance_score': float(hos_status.compliance_analytics.compliance_score) if hos_status.compliance_analytics else 0.0,
        'total_violations': hos_status.compliance_analytics.total_violations if hos_status.compliance_analytics else 0,
        'cycle_progress': float(hos_status.hours_used_this_cycle) / float(hos_status.hours_available + hos_status.hours_used_this_cycle) * 100,
        'risk_level': 'high' if hos_status.compliance_analytics and hos_status.compliance_analytics.compliance_score < 80 else 'low',
        'recommendations': hos_status.restart_recommendations.get('recommendations', [])
    }