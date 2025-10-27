from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'log-entries', views.LogEntryViewSet)
router.register(r'daily-logs', views.DailyLogViewSet)
router.register(r'violations', views.ViolationViewSet)
router.register(r'cycle-status', views.CycleStatusViewSet)
router.register(r'duty-statuses', views.DutyStatusViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('generate-log-sheet/', views.GenerateLogSheetView.as_view(), name='generate_log_sheet'),
    path('export-logs/', views.ExportLogsView.as_view(), name='export_logs'),
    path('export-logs-enhanced/', views.EnhancedExportLogsView.as_view(), name='export_logs_enhanced'),
    path('bulk-operations/', views.BulkLogOperationsView.as_view(), name='bulk_operations'),
    path('compliance-validation/', views.LogComplianceValidationView.as_view(), name='compliance_validation'),
    path('certification-workflow/', views.CertificationWorkflowView.as_view(), name='certification_workflow'),
    path('check-compliance/', views.CheckComplianceView.as_view(), name='check_compliance'),
    path('hos-status/', views.HOSStatusView.as_view(), name='hos_status'),
    path('violations/<int:violation_id>/resolve/', views.ViolationResolveView.as_view(), name='resolve_violation'),
]

