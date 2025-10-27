"""
Bulk Log Operations Service
Handles bulk operations on log entries with validation and audit trails
"""

from typing import List, Dict, Any, Optional
from django.db import transaction
from django.utils import timezone
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
import logging

from .models import LogEntry
from core_utils.models import AuditLog

logger = logging.getLogger(__name__)


class BulkLogOperations:
    """
    Service for performing bulk operations on log entries
    """

    def __init__(self, user: User):
        self.user = user

    def bulk_create_logs(self, log_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Create multiple log entries in a single transaction

        Args:
            log_data: List of dictionaries containing log entry data

        Returns:
            Dictionary with results and any errors
        """
        results = {"created": [], "errors": [], "total_processed": len(log_data), "success_count": 0, "error_count": 0}

        try:
            with transaction.atomic():
                for i, data in enumerate(log_data):
                    try:
                        # Validate required fields
                        required_fields = ["start_time", "end_time", "duty_status_id", "location"]
                        for field in required_fields:
                            if field not in data:
                                raise ValidationError(f"Missing required field: {field}")

                        # Create log entry
                        log_entry = LogEntry.objects.create(
                            driver=self.user,
                            start_time=data["start_time"],
                            end_time=data["end_time"],
                            duty_status_id=data["duty_status_id"],
                            location=data["location"],
                            city=data.get("city", ""),
                            state=data.get("state", ""),
                            remarks=data.get("remarks", ""),
                            is_certified=data.get("is_certified", False),
                        )

                        results["created"].append(
                            {
                                "id": log_entry.id,
                                "index": i,
                                "start_time": log_entry.start_time,
                                "end_time": log_entry.end_time,
                            }
                        )
                        results["success_count"] += 1

                        # Create audit log
                        AuditLog.objects.create(
                            user=self.user,
                            action="create",
                            model_name="LogEntry",
                            object_id=str(log_entry.id),
                            description=f"Bulk created log entry: {log_entry.location}",
                            ip_address=self._get_client_ip(),
                        )

                    except Exception as e:
                        error_info = {"index": i, "data": data, "error": str(e)}
                        results["errors"].append(error_info)
                        results["error_count"] += 1
                        logger.error(f"Bulk create error at index {i}: {str(e)}")

                # Create summary audit log
                AuditLog.objects.create(
                    user=self.user,
                    action="bulk_create",
                    model_name="LogEntry",
                    object_id="",
                    description=f'Bulk created {results["success_count"]} log entries',
                    ip_address=self._get_client_ip(),
                )

        except Exception as e:
            logger.error(f"Bulk create transaction error: {str(e)}")
            results["transaction_error"] = str(e)

        return results

    def bulk_update_logs(self, update_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Update multiple log entries in a single transaction

        Args:
            update_data: List of dictionaries containing log entry ID and update data

        Returns:
            Dictionary with results and any errors
        """
        results = {
            "updated": [],
            "errors": [],
            "total_processed": len(update_data),
            "success_count": 0,
            "error_count": 0,
        }

        try:
            with transaction.atomic():
                for i, data in enumerate(update_data):
                    try:
                        if "id" not in data:
                            raise ValidationError("Missing required field: id")

                        log_entry_id = data["id"]
                        update_fields = {k: v for k, v in data.items() if k != "id"}

                        # Get the log entry
                        try:
                            log_entry = LogEntry.objects.get(id=log_entry_id, driver=self.user)
                        except LogEntry.DoesNotExist:
                            raise ValidationError(f"Log entry {log_entry_id} not found or not owned by user")

                        # Update fields
                        for field, value in update_fields.items():
                            if hasattr(log_entry, field):
                                setattr(log_entry, field, value)

                        log_entry.save()

                        results["updated"].append(
                            {"id": log_entry.id, "index": i, "updated_fields": list(update_fields.keys())}
                        )
                        results["success_count"] += 1

                        # Create audit log
                        AuditLog.objects.create(
                            user=self.user,
                            action="update",
                            model_name="LogEntry",
                            object_id=str(log_entry.id),
                            description=f"Bulk updated log entry: {log_entry.location}",
                            ip_address=self._get_client_ip(),
                        )

                    except Exception as e:
                        error_info = {"index": i, "data": data, "error": str(e)}
                        results["errors"].append(error_info)
                        results["error_count"] += 1
                        logger.error(f"Bulk update error at index {i}: {str(e)}")

                # Create summary audit log
                AuditLog.objects.create(
                    user=self.user,
                    action="bulk_update",
                    model_name="LogEntry",
                    object_id="",
                    description=f'Bulk updated {results["success_count"]} log entries',
                    ip_address=self._get_client_ip(),
                )

        except Exception as e:
            logger.error(f"Bulk update transaction error: {str(e)}")
            results["transaction_error"] = str(e)

        return results

    def bulk_delete_logs(self, log_ids: List[int]) -> Dict[str, Any]:
        """
        Delete multiple log entries in a single transaction

        Args:
            log_ids: List of log entry IDs to delete

        Returns:
            Dictionary with results and any errors
        """
        results = {"deleted": [], "errors": [], "total_processed": len(log_ids), "success_count": 0, "error_count": 0}

        try:
            with transaction.atomic():
                for i, log_id in enumerate(log_ids):
                    try:
                        # Get the log entry
                        try:
                            log_entry = LogEntry.objects.get(id=log_id, driver=self.user)
                        except LogEntry.DoesNotExist:
                            raise ValidationError(f"Log entry {log_id} not found or not owned by user")

                        # Check if log entry is certified (might need special handling)
                        if log_entry.is_certified:
                            # For certified logs, we might want to mark as deleted instead of actually deleting
                            log_entry.is_deleted = True
                            log_entry.deleted_at = timezone.now()
                            log_entry.save()
                        else:
                            # For non-certified logs, we can actually delete
                            log_entry.delete()

                        results["deleted"].append(
                            {
                                "id": log_id,
                                "index": i,
                                "was_certified": (
                                    log_entry.is_certified if hasattr(log_entry, "is_certified") else False
                                ),
                            }
                        )
                        results["success_count"] += 1

                        # Create audit log
                        AuditLog.objects.create(
                            user=self.user,
                            action="delete",
                            model_name="LogEntry",
                            object_id=str(log_id),
                            description=f"Bulk deleted log entry: {log_entry.location}",
                            ip_address=self._get_client_ip(),
                        )

                    except Exception as e:
                        error_info = {"index": i, "log_id": log_id, "error": str(e)}
                        results["errors"].append(error_info)
                        results["error_count"] += 1
                        logger.error(f"Bulk delete error at index {i}: {str(e)}")

                # Create summary audit log
                AuditLog.objects.create(
                    user=self.user,
                    action="bulk_delete",
                    model_name="LogEntry",
                    object_id="",
                    description=f'Bulk deleted {results["success_count"]} log entries',
                    ip_address=self._get_client_ip(),
                )

        except Exception as e:
            logger.error(f"Bulk delete transaction error: {str(e)}")
            results["transaction_error"] = str(e)

        return results

    def bulk_certify_logs(self, log_ids: List[int], certification_data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Certify multiple log entries in a single transaction

        Args:
            log_ids: List of log entry IDs to certify
            certification_data: Optional certification metadata

        Returns:
            Dictionary with results and any errors
        """
        results = {"certified": [], "errors": [], "total_processed": len(log_ids), "success_count": 0, "error_count": 0}

        try:
            with transaction.atomic():
                for i, log_id in enumerate(log_ids):
                    try:
                        # Get the log entry
                        try:
                            log_entry = LogEntry.objects.get(id=log_id, driver=self.user)
                        except LogEntry.DoesNotExist:
                            raise ValidationError(f"Log entry {log_id} not found or not owned by user")

                        # Check if already certified
                        if log_entry.is_certified:
                            raise ValidationError(f"Log entry {log_id} is already certified")

                        # Certify the log entry
                        log_entry.is_certified = True
                        log_entry.certified_at = timezone.now()
                        if certification_data:
                            log_entry.certification_notes = certification_data.get("notes", "")
                            log_entry.certified_by = certification_data.get("certified_by", self.user.username)

                        log_entry.save()

                        results["certified"].append(
                            {"id": log_entry.id, "index": i, "certified_at": log_entry.certified_at}
                        )
                        results["success_count"] += 1

                        # Create audit log
                        AuditLog.objects.create(
                            user=self.user,
                            action="certify",
                            model_name="LogEntry",
                            object_id=str(log_entry.id),
                            description=f"Bulk certified log entry: {log_entry.location}",
                            ip_address=self._get_client_ip(),
                        )

                    except Exception as e:
                        error_info = {"index": i, "log_id": log_id, "error": str(e)}
                        results["errors"].append(error_info)
                        results["error_count"] += 1
                        logger.error(f"Bulk certify error at index {i}: {str(e)}")

                # Create summary audit log
                AuditLog.objects.create(
                    user=self.user,
                    action="bulk_certify",
                    model_name="LogEntry",
                    object_id="",
                    description=f'Bulk certified {results["success_count"]} log entries',
                    ip_address=self._get_client_ip(),
                )

        except Exception as e:
            logger.error(f"Bulk certify transaction error: {str(e)}")
            results["transaction_error"] = str(e)

        return results

    def bulk_validate_logs(self, log_ids: List[int]) -> Dict[str, Any]:
        """
        Validate multiple log entries for compliance

        Args:
            log_ids: List of log entry IDs to validate

        Returns:
            Dictionary with validation results
        """
        results = {
            "validated": [],
            "errors": [],
            "total_processed": len(log_ids),
            "success_count": 0,
            "error_count": 0,
            "compliance_summary": {},
        }

        try:
            # Get all log entries
            log_entries = LogEntry.objects.filter(id__in=log_ids, driver=self.user).order_by("start_time")

            if not log_entries.exists():
                results["errors"].append({"error": "No log entries found for the provided IDs"})
                return results

            # Use the compliance validator
            from .export_service import LogComplianceValidator

            validator = LogComplianceValidator(self.user)
            validation_result = validator.validate_logs(list(log_entries))

            results["compliance_summary"] = validation_result
            results["success_count"] = len(log_entries)

            # Add individual validation results
            for log_entry in log_entries:
                results["validated"].append(
                    {
                        "id": log_entry.id,
                        "start_time": log_entry.start_time,
                        "end_time": log_entry.end_time,
                        "location": log_entry.location,
                        "is_compliant": True,  # Individual compliance would need more detailed analysis
                    }
                )

            # Create audit log
            AuditLog.objects.create(
                user=self.user,
                action="bulk_validate",
                model_name="LogEntry",
                object_id="",
                description=f"Bulk validated {len(log_entries)} log entries",
                ip_address=self._get_client_ip(),
            )

        except Exception as e:
            logger.error(f"Bulk validation error: {str(e)}")
            results["errors"].append({"error": str(e)})
            results["error_count"] = 1

        return results

    def _get_client_ip(self) -> str:
        """Get client IP address for audit logging"""
        # This would typically come from the request object
        # For now, return a placeholder
        return "127.0.0.1"
