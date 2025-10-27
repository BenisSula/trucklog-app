"""
URL patterns for Advanced HOS Compliance API
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .hos_views import (
    AdvancedHOSComplianceView,
    ViolationResolutionViewSet,
    TeamDrivingViewSet,
    ComplianceAnalyticsViewSet,
    ComplianceAlertViewSet,
    HOSRuleConfigurationViewSet,
    HOSAuditLogViewSet,
    SleeperBerthPeriodViewSet,
    HOSComplianceSummaryView
)

# Create router for viewset-based endpoints
router = DefaultRouter()
router.register(r'violation-workflows', ViolationResolutionViewSet, basename='violation-workflow')
router.register(r'team-driving', TeamDrivingViewSet, basename='team-driving')
router.register(r'compliance-analytics', ComplianceAnalyticsViewSet, basename='compliance-analytics')
router.register(r'compliance-alerts', ComplianceAlertViewSet, basename='compliance-alert')
router.register(r'hos-rules', HOSRuleConfigurationViewSet, basename='hos-rule')
router.register(r'hos-audit-logs', HOSAuditLogViewSet, basename='hos-audit-log')
router.register(r'sleeper-berth-periods', SleeperBerthPeriodViewSet, basename='sleeper-berth-period')

# URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Advanced HOS compliance calculation
    path('compliance/calculate/', AdvancedHOSComplianceView.as_view(), name='hos-compliance-calculate'),
    
    # Compliance summary
    path('compliance/summary/', HOSComplianceSummaryView.as_view(), name='hos-compliance-summary'),
]
