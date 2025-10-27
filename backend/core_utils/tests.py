"""
Tests for core_utils app
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import datetime, timedelta

from .hos_compliance import HOSComplianceEngine, CycleType, DutyStatus, HOSStatus

User = get_user_model()


class HOSComplianceEngineTests(TestCase):
    """Test HOS compliance engine functionality"""
    
    def setUp(self):
        self.engine = HOSComplianceEngine(CycleType.SEVENTY_EIGHT)
        self.user = User.objects.create_user(
            username='testdriver',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Driver'
        )
    
    def test_calculate_hos_status_empty_logs(self):
        """Test HOS status calculation with empty logs"""
        status = self.engine.calculate_hos_status([])
        
        self.assertIsInstance(status, HOSStatus)
        self.assertTrue(status.can_drive)
        self.assertTrue(status.can_be_on_duty)
        self.assertFalse(status.needs_rest)
        self.assertEqual(status.hours_used_this_cycle, Decimal('0.00'))
        self.assertEqual(status.hours_available, Decimal('70.00'))
        self.assertEqual(len(status.violations), 0)
    
    def test_calculate_hos_status_with_driving_logs(self):
        """Test HOS status with driving logs"""
        now = datetime.now()
        log_entries = [
            {
                'start_time': now - timedelta(hours=2),
                'end_time': now - timedelta(hours=1),
                'duty_status': DutyStatus.DRIVING.value,
            }
        ]
        
        status = self.engine.calculate_hos_status(log_entries, now)
        
        self.assertEqual(status.hours_used_this_cycle, Decimal('1.00'))
        self.assertEqual(status.hours_available, Decimal('69.00'))
        self.assertTrue(status.can_drive)
    
    def test_driving_limit_violation(self):
        """Test 11-hour driving limit violation"""
        now = datetime.now()
        log_entries = [
            {
                'start_time': now - timedelta(hours=12),
                'end_time': now,
                'duty_status': DutyStatus.DRIVING.value,
            }
        ]
        
        status = self.engine.calculate_hos_status(log_entries, now)
        
        self.assertFalse(status.can_drive)
        self.assertTrue(len(status.violations) > 0)
        
        driving_violations = [v for v in status.violations if v.violation_type == 'driving_over_11']
        self.assertTrue(len(driving_violations) > 0)
    
    def test_on_duty_limit_violation(self):
        """Test 14-hour on-duty limit violation"""
        now = datetime.now()
        log_entries = [
            {
                'start_time': now - timedelta(hours=15),
                'end_time': now,
                'duty_status': DutyStatus.ON_DUTY_NOT_DRIVING.value,
            }
        ]
        
        status = self.engine.calculate_hos_status(log_entries, now)
        
        self.assertFalse(status.can_be_on_duty)
        self.assertTrue(len(status.violations) > 0)
        
        on_duty_violations = [v for v in status.violations if v.violation_type == 'on_duty_over_14']
        self.assertTrue(len(on_duty_violations) > 0)
    
    def test_30_min_break_requirement(self):
        """Test 30-minute break requirement"""
        now = datetime.now()
        log_entries = [
            {
                'start_time': now - timedelta(hours=9),
                'end_time': now,
                'duty_status': DutyStatus.DRIVING.value,
            }
        ]
        
        status = self.engine.calculate_hos_status(log_entries, now)
        
        self.assertTrue(len(status.violations) > 0)
        
        break_violations = [v for v in status.violations if v.violation_type == 'no_30_min_break']
        self.assertTrue(len(break_violations) > 0)
    
    def test_cycle_hours_exceeded(self):
        """Test cycle hours exceeded violation"""
        now = datetime.now()
        # Create logs that exceed 70 hours
        log_entries = []
        for i in range(72):  # 72 hours of driving
            log_entries.append({
                'start_time': now - timedelta(hours=72-i),
                'end_time': now - timedelta(hours=71-i),
                'duty_status': DutyStatus.DRIVING.value,
            })
        
        status = self.engine.calculate_hos_status(log_entries, now)
        
        self.assertTrue(len(status.violations) > 0)
        
        cycle_violations = [v for v in status.violations if v.violation_type == 'cycle_hours_exceeded']
        self.assertTrue(len(cycle_violations) > 0)
    
    def test_34_hour_restart(self):
        """Test 34-hour restart functionality"""
        now = datetime.now()
        log_entries = [
            {
                'start_time': now - timedelta(hours=36),
                'end_time': now - timedelta(hours=2),
                'duty_status': DutyStatus.OFF_DUTY.value,
            }
        ]
        
        status = self.engine.calculate_hos_status(log_entries, now)
        
        # Should reset cycle after 34-hour restart
        self.assertEqual(status.hours_used_this_cycle, Decimal('0.00'))
        self.assertEqual(status.hours_available, Decimal('70.00'))


class SystemSettingsTests(TestCase):
    """Test system settings functionality"""
    
    def test_system_settings_creation(self):
        """Test system settings can be created"""
        from .models import SystemSettings
        
        setting = SystemSettings.objects.create(
            key='test_setting',
            value='test_value',
            setting_type='string',
            description='Test setting',
            is_public=True
        )
        
        self.assertEqual(setting.key, 'test_setting')
        self.assertEqual(setting.value, 'test_value')
        self.assertEqual(setting.setting_type, 'string')
        self.assertTrue(setting.is_public)
    
    def test_system_settings_typed_value(self):
        """Test system settings typed value conversion"""
        from .models import SystemSettings
        
        # Test string value
        string_setting = SystemSettings.objects.create(
            key='string_setting',
            value='test',
            setting_type='string'
        )
        self.assertEqual(string_setting.get_typed_value(), 'test')
        
        # Test integer value
        int_setting = SystemSettings.objects.create(
            key='int_setting',
            value='42',
            setting_type='integer'
        )
        self.assertEqual(int_setting.get_typed_value(), 42)
        
        # Test boolean value
        bool_setting = SystemSettings.objects.create(
            key='bool_setting',
            value='true',
            setting_type='boolean'
        )
        self.assertTrue(bool_setting.get_typed_value())


class AuditLogTests(TestCase):
    """Test audit logging functionality"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
    
    def test_audit_log_creation(self):
        """Test audit log can be created"""
        from .models import AuditLog
        
        log = AuditLog.objects.create(
            user=self.user,
            action='create',
            model_name='TestModel',
            object_id='123',
            description='Test action',
            ip_address='127.0.0.1'
        )
        
        self.assertEqual(log.user, self.user)
        self.assertEqual(log.action, 'create')
        self.assertEqual(log.model_name, 'TestModel')
        self.assertEqual(log.object_id, '123')
        self.assertEqual(log.description, 'Test action')
        self.assertEqual(log.ip_address, '127.0.0.1')