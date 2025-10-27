"""
Violation Detection Service
Detects HOS violations and generates alerts
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
from dataclasses import dataclass
from enum import Enum

class ViolationSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class ViolationAlert:
    violation_type: str
    description: str
    severity: ViolationSeverity
    occurred_at: datetime
    duration_over: timedelta = None
    driver_id: int = None
    log_entry_id: int = None
    requires_immediate_action: bool = False

class ViolationDetector:
    """Detects HOS violations and generates alerts"""
    
    def __init__(self):
        self.violation_types = {
            'driving_limit_exceeded': {
                'description': 'Exceeded 11-hour driving limit',
                'severity': ViolationSeverity.CRITICAL,
                'requires_immediate_action': True
            },
            'on_duty_limit_exceeded': {
                'description': 'Exceeded 14-hour on-duty limit',
                'severity': ViolationSeverity.CRITICAL,
                'requires_immediate_action': True
            },
            'cycle_hours_exceeded': {
                'description': 'Exceeded 70-hour cycle limit',
                'severity': ViolationSeverity.CRITICAL,
                'requires_immediate_action': True
            },
            'missing_30_min_break': {
                'description': 'Missing required 30-minute break',
                'severity': ViolationSeverity.HIGH,
                'requires_immediate_action': False
            },
            'insufficient_rest': {
                'description': 'Insufficient rest period',
                'severity': ViolationSeverity.MEDIUM,
                'requires_immediate_action': False
            },
            'consecutive_driving_hours': {
                'description': 'Driving for too many consecutive hours',
                'severity': ViolationSeverity.MEDIUM,
                'requires_immediate_action': False
            }
        }
    
    def detect_violations(self, log_entries: List[Dict], driver_id: int = None) -> List[ViolationAlert]:
        """Detect violations from log entries"""
        violations = []
        
        if not log_entries:
            return violations
        
        # Sort entries by start time
        sorted_entries = sorted(log_entries, key=lambda x: x['start_time'])
        
        # Check for various violation types
        violations.extend(self._check_driving_limits(sorted_entries, driver_id))
        violations.extend(self._check_on_duty_limits(sorted_entries, driver_id))
        violations.extend(self._check_cycle_limits(sorted_entries, driver_id))
        violations.extend(self._check_break_requirements(sorted_entries, driver_id))
        violations.extend(self._check_rest_requirements(sorted_entries, driver_id))
        violations.extend(self._check_consecutive_driving(sorted_entries, driver_id))
        
        return violations
    
    def _check_driving_limits(self, entries: List[Dict], driver_id: int) -> List[ViolationAlert]:
        """Check for 11-hour driving limit violations"""
        violations = []
        
        # Group entries by day
        daily_entries = {}
        for entry in entries:
            date = entry['start_time'].date()
            if date not in daily_entries:
                daily_entries[date] = []
            daily_entries[date].append(entry)
        
        for date, day_entries in daily_entries.items():
            driving_hours = 0.0
            driving_entries = [e for e in day_entries if e['duty_status'] == 'driving']
            
            for entry in driving_entries:
                duration = (entry['end_time'] - entry['start_time']).total_seconds() / 3600
                driving_hours += duration
                
                if driving_hours > 11.0:
                    violations.append(ViolationAlert(
                        violation_type='driving_limit_exceeded',
                        description=f'Exceeded 11-hour driving limit by {driving_hours - 11.0:.1f} hours',
                        severity=ViolationSeverity.CRITICAL,
                        occurred_at=entry['end_time'],
                        duration_over=timedelta(hours=driving_hours - 11.0),
                        driver_id=driver_id,
                        log_entry_id=entry.get('id'),
                        requires_immediate_action=True
                    ))
                    break
        
        return violations
    
    def _check_on_duty_limits(self, entries: List[Dict], driver_id: int) -> List[ViolationAlert]:
        """Check for 14-hour on-duty limit violations"""
        violations = []
        
        # Group entries by day
        daily_entries = {}
        for entry in entries:
            date = entry['start_time'].date()
            if date not in daily_entries:
                daily_entries[date] = []
            daily_entries[date].append(entry)
        
        for date, day_entries in daily_entries.items():
            on_duty_hours = 0.0
            on_duty_entries = [e for e in day_entries if e['duty_status'] in ['driving', 'on_duty_not_driving']]
            
            for entry in on_duty_entries:
                duration = (entry['end_time'] - entry['start_time']).total_seconds() / 3600
                on_duty_hours += duration
                
                if on_duty_hours > 14.0:
                    violations.append(ViolationAlert(
                        violation_type='on_duty_limit_exceeded',
                        description=f'Exceeded 14-hour on-duty limit by {on_duty_hours - 14.0:.1f} hours',
                        severity=ViolationSeverity.CRITICAL,
                        occurred_at=entry['end_time'],
                        duration_over=timedelta(hours=on_duty_hours - 14.0),
                        driver_id=driver_id,
                        log_entry_id=entry.get('id'),
                        requires_immediate_action=True
                    ))
                    break
        
        return violations
    
    def _check_cycle_limits(self, entries: List[Dict], driver_id: int) -> List[ViolationAlert]:
        """Check for 70-hour cycle limit violations"""
        violations = []
        
        # Calculate 8-day rolling window
        if len(entries) < 2:
            return violations
        
        start_date = entries[0]['start_time'].date()
        end_date = entries[-1]['start_time'].date()
        
        current_date = start_date
        while current_date <= end_date:
            cycle_start = current_date - timedelta(days=7)
            cycle_entries = [
                e for e in entries 
                if cycle_start <= e['start_time'].date() <= current_date
            ]
            
            total_hours = 0.0
            for entry in cycle_entries:
                if entry['duty_status'] in ['driving', 'on_duty_not_driving']:
                    duration = (entry['end_time'] - entry['start_time']).total_seconds() / 3600
                    total_hours += duration
            
            if total_hours > 70.0:
                violations.append(ViolationAlert(
                    violation_type='cycle_hours_exceeded',
                    description=f'Exceeded 70-hour cycle limit by {total_hours - 70.0:.1f} hours',
                    severity=ViolationSeverity.CRITICAL,
                    occurred_at=current_date,
                    duration_over=timedelta(hours=total_hours - 70.0),
                    driver_id=driver_id,
                    requires_immediate_action=True
                ))
                break
            
            current_date += timedelta(days=1)
        
        return violations
    
    def _check_break_requirements(self, entries: List[Dict], driver_id: int) -> List[ViolationAlert]:
        """Check for 30-minute break requirements"""
        violations = []
        
        # Group entries by day
        daily_entries = {}
        for entry in entries:
            date = entry['start_time'].date()
            if date not in daily_entries:
                daily_entries[date] = []
            daily_entries[date].append(entry)
        
        for date, day_entries in daily_entries.items():
            # Check if driver has had 30 minutes of consecutive off-duty time
            has_break = False
            off_duty_entries = [e for e in day_entries if e['duty_status'] == 'off_duty']
            
            for entry in off_duty_entries:
                duration = (entry['end_time'] - entry['start_time']).total_seconds() / 3600
                if duration >= 0.5:  # 30 minutes
                    has_break = True
                    break
            
            if not has_break and any(e['duty_status'] == 'driving' for e in day_entries):
                violations.append(ViolationAlert(
                    violation_type='missing_30_min_break',
                    description='Missing required 30-minute break',
                    severity=ViolationSeverity.HIGH,
                    occurred_at=date,
                    driver_id=driver_id,
                    requires_immediate_action=False
                ))
        
        return violations
    
    def _check_rest_requirements(self, entries: List[Dict], driver_id: int) -> List[ViolationAlert]:
        """Check for sufficient rest requirements"""
        violations = []
        
        # Check for 10-hour rest requirement
        for i in range(len(entries) - 1):
            current_entry = entries[i]
            next_entry = entries[i + 1]
            
            if (current_entry['duty_status'] in ['driving', 'on_duty_not_driving'] and
                next_entry['duty_status'] in ['driving', 'on_duty_not_driving']):
                
                rest_duration = (next_entry['start_time'] - current_entry['end_time']).total_seconds() / 3600
                
                if rest_duration < 10.0:
                    violations.append(ViolationAlert(
                        violation_type='insufficient_rest',
                        description=f'Insufficient rest period: {rest_duration:.1f} hours (minimum 10 hours required)',
                        severity=ViolationSeverity.MEDIUM,
                        occurred_at=next_entry['start_time'],
                        driver_id=driver_id,
                        log_entry_id=next_entry.get('id'),
                        requires_immediate_action=False
                    ))
        
        return violations
    
    def _check_consecutive_driving(self, entries: List[Dict], driver_id: int) -> List[ViolationAlert]:
        """Check for consecutive driving hour limits"""
        violations = []
        
        consecutive_driving_hours = 0.0
        driving_start_time = None
        
        for entry in entries:
            if entry['duty_status'] == 'driving':
                if driving_start_time is None:
                    driving_start_time = entry['start_time']
                
                duration = (entry['end_time'] - entry['start_time']).total_seconds() / 3600
                consecutive_driving_hours += duration
                
                # Check if consecutive driving exceeds 8 hours
                if consecutive_driving_hours > 8.0:
                    violations.append(ViolationAlert(
                        violation_type='consecutive_driving_hours',
                        description=f'Driving for {consecutive_driving_hours:.1f} consecutive hours (maximum 8 hours)',
                        severity=ViolationSeverity.MEDIUM,
                        occurred_at=entry['end_time'],
                        driver_id=driver_id,
                        log_entry_id=entry.get('id'),
                        requires_immediate_action=False
                    ))
            else:
                # Reset consecutive driving counter
                consecutive_driving_hours = 0.0
                driving_start_time = None
        
        return violations
    
    def get_violation_summary(self, violations: List[ViolationAlert]) -> Dict[str, Any]:
        """Get summary of violations"""
        summary = {
            'total_violations': len(violations),
            'critical_violations': len([v for v in violations if v.severity == ViolationSeverity.CRITICAL]),
            'high_violations': len([v for v in violations if v.severity == ViolationSeverity.HIGH]),
            'medium_violations': len([v for v in violations if v.severity == ViolationSeverity.MEDIUM]),
            'low_violations': len([v for v in violations if v.severity == ViolationSeverity.LOW]),
            'requires_immediate_action': len([v for v in violations if v.requires_immediate_action]),
            'violation_types': {}
        }
        
        # Count violations by type
        for violation in violations:
            if violation.violation_type not in summary['violation_types']:
                summary['violation_types'][violation.violation_type] = 0
            summary['violation_types'][violation.violation_type] += 1
        
        return summary


